// Karte: zwei Saisonstände. Der Sim-Start (2025/26) ist die gebaute Karte, "Aktuell"
// zeigt, wo die Vereine heute wirklich spielen.
//
// Warum überhaupt ein Umbau: team.regions ändert sich im Spielverlauf NIE – es ist der
// Eingang, über den ein Verein seiner Heimatliga zugeordnet wird, und wird beim Speichern
// gar nicht erst mitgeschrieben (game_engine.js, saveGame: nur dynamische Felder). Was
// sich sehr wohl ändert, ist die Liga, in der ein Verein tatsächlich antritt: die
// Geo-Balancierung schiebt Grenzvereine dauerhaft in die Nachbarstaffel. Gemessen über
// zehn Saisons sitzen ~95 von ~590 Staffelvereinen woanders als das Excel sagt, und das
// pendelt sich nach der ersten Saison ein statt weiter zu wachsen.
//
// Die Flächen der Staffeln haben keine reale Grenze; sie folgen der Vereinsverteilung.
// Sie im Browser neu zu rechnen (Marching Squares) kostete gemessen 2,1 s allein für den
// billigen Teil – auf dem Handy ein Vielfaches – und bräuchte Polygon-Booleans, die es in
// JS nicht gibt. Stattdessen liegt in MAP_WABEN die Zerlegung eine Ebene TIEFER: eine
// Fläche je Verein. Eine Staffel ist die Vereinigung der Waben ihrer Vereine, und die
// kostet nur das Zusammenzählen von Kanten.
Object.assign(App, {

  // 'start' = Sim-Start-Saison (Zuordnung aus game_data), 'aktuell' = laufende Saison
  _mapSaison: 'start',

  _mapSetSaison: function(modus) {
    if (this._mapSaison === modus) return;
    this._mapSaison = modus;
    this._mapWabenCache = {};
    for (const id of ['map-saison-start', 'map-saison-aktuell']) {
      const b = document.getElementById(id);
      if (!b) continue;
      const an = id.endsWith(modus);
      b.style.background = an ? 'var(--c-link,#4fc3f7)' : 'transparent';
      b.style.color      = an ? '#111' : '#aaa';
      b.style.fontWeight = an ? 'bold' : 'normal';
    }
    this._mapApplySaisonToMarkers();
    // Punktfarbe und -größe hängen an der Liga, die sich zwischen den Ständen ändert.
    // Ohne diesen Aufruf blieben beide Ansichten optisch identisch.
    this._mapRefreshLevels();
    this._mapDrawAll();
  },

  // Steht die Karte auf einem Stand, den es zu zeigen lohnt? Ohne laufendes Spiel
  // (oder vor dem ersten Saisonwechsel) sind beide Stände identisch.
  _mapSaisonVerfuegbar: function() {
    return typeof MAP_WABEN !== 'undefined' && typeof Engine !== 'undefined' && !!Engine.teams;
  },

  // ── Staffel eines Vereins im gewählten Stand ──────────────────────────────
  // Sim-Start: die Kette aus team.regions, so wie sie gebaut wurde.
  // Aktuell:   die Staffel der Liga, in der der Verein gerade spielt. Wer über den
  //            Staffelebenen steht (Regionalliga aufwärts), behält seine Heimatstaffel –
  //            er ist ja weiterhin dort ansässig, nur eine Etage höher.
  _mapStaffelKette: function(teamName, teamId) {
    // Basis ist team.regions aus game_data – NICHT MAP_TEAM_REGIONS. Beide Quellen tragen
    // dieselben Labels, ordnen aber einzelne Vereine verschiedenen Staffeln zu (das Excel
    // ist der ältere Stand). Gebaut wurde die Karte aus game_data; nimmt man hier das Excel,
    // trifft der Sim-Start-Stand die gebaute Fläche nicht mehr – gemessen bis 45 % daneben
    // (Staffel Hansa), mit game_data unter 0,1 %.
    const gd = (typeof GAME_DATA !== 'undefined' && teamId && GAME_DATA.teams[teamId]);
    const statisch = (gd && gd.regions)
      || (typeof MAP_TEAM_REGIONS !== 'undefined' && MAP_TEAM_REGIONS[teamName]) || [];
    if (this._mapSaison === 'start') return statisch;
    if (!this._l2r) {
      this._l2r = {};
      const m = (typeof Engine !== 'undefined' && Engine.REGION_TO_LEAGUE_ID) || {};
      for (const reg in m) this._l2r[m[reg]] = reg;
    }
    const t = typeof Engine !== 'undefined' && Engine.teams && Engine.teams[teamId];
    const jetzt = t && this._l2r[t.leagueId];
    if (!jetzt) return statisch;
    const id = this._mapIdOf(jetzt);
    if (!id) return statisch;
    // Die statische Kette STUFENWEISE ersetzen statt sie neu zu bauen: aus der Abstammung
    // der aktuellen Staffel je Stufe das passende Label nehmen, alles andere so lassen.
    // Neu bauen ging schief, weil einzelne Regionen mehrere Eltern haben (Sachsen-Anhalt
    // hängt unter Nordost-Nord UND Nordost-Süd) – dann standen beide in der Kette und 81
    // Vereine sahen im frischen Spiel verändert aus, obwohl sich nichts bewegt hatte.
    const ahnen = [id].concat(this._mapGetParents(id))
      .map(i => this._polyIndex[i]).filter(Boolean);
    let getroffen = false;
    const neu = statisch.map(lb => {
      const p = this._polyIndex[this._mapIdOf(lb)];
      if (!p) return lb;
      const kand = ahnen.filter(x => x.stufe === p.stufe).map(x => x.label);
      if (!kand.length || kand.indexOf(lb) >= 0) return lb;   // unverändert
      getroffen = true;
      return kand[0];
    });
    // Spielt der Verein tiefer, als seine statische Kette reicht, die Staffel anhängen
    if (!getroffen && neu.indexOf(jetzt) < 0) neu.push(jetzt);
    return neu;
  },

  _mapIdOf: function(label) {
    if (!this._labelId) {
      this._labelId = {};
      for (const p of MAP_REGIONS) if (!(p.label in this._labelId)) this._labelId[p.label] = p.id;
    }
    return this._labelId[label];
  },

  // ── Vereinigung von Waben ohne Polygon-Booleans ───────────────────────────
  // Jede Kante wird vorzeichenbehaftet gezählt: a→b zählt +1, b→a zählt −1. Zwei Waben
  // derselben Staffel durchlaufen ihre gemeinsame Grenze gegenläufig, ihr Saldo ist null –
  // übrig bleibt genau der Außenrand der Staffel. Verketten liefert daraus die Ringe.
  // Warum gezählt und nicht paarweise gelöscht: beim Ausdünnen der Grenzen fallen
  // gelegentlich zwei verschiedene Bögen auf dieselbe Strecke zusammen. Beim Löschen
  // verschwände so eine Kante ersatzlos und der Staffel fehlte Fläche (in Hamburg waren
  // das 44 %); die Zählung hält die Summe dagegen exakt.
  _wabenUnion: function(pool, ringe) {
    const netto = new Map();
    for (const r of ringe) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      if (a === b) continue;
      const vor = a < b, k = vor ? a + ',' + b : b + ',' + a;
      netto.set(k, (netto.get(k) || 0) + (vor ? 1 : -1));
    }
    const raus = new Map();
    let offen = 0;
    for (const [k, s] of netto) {
      if (!s) continue;
      const t = k.split(','), x = +t[0], y = +t[1];
      const a = s > 0 ? x : y, b = s > 0 ? y : x;
      if (!raus.has(a)) raus.set(a, []);
      for (let i = Math.abs(s); i > 0; i--) { raus.get(a).push(b); offen++; }
    }
    const winkel = (a, b) => Math.atan2(pool[b][0] - pool[a][0], pool[b][1] - pool[a][1]);
    const out = [];
    let schutz = 0;
    while (offen > 0 && schutz++ < 100000) {
      let a = null;
      for (const [k, v] of raus) if (v.length) { a = k; break; }
      if (a === null) break;
      const start = a, ring = [a];
      let b = raus.get(a).pop(); offen--;
      let s2 = 0;
      while (b !== start && s2++ < 500000) {
        ring.push(b);
        const kand = raus.get(b);
        if (!kand || !kand.length) break;
        let pick = 0;
        if (kand.length > 1) {
          // An Knoten die schärfste Kurve nehmen, damit sich Ringe nicht kreuzen
          const ein = winkel(b, a);
          let best = -Infinity;
          for (let i = 0; i < kand.length; i++) {
            let d = ein - winkel(b, kand[i]);
            while (d <= 0) d += 2 * Math.PI;
            while (d > 2 * Math.PI) d -= 2 * Math.PI;
            if (d > best) { best = d; pick = i; }
          }
        }
        const next = kand.splice(pick, 1)[0]; offen--;
        a = b; b = next;
      }
      // Mini-Polygone verwerfen. Drei Punkte reichen als Bedingung NICHT: die Kantenzählung
      // liefert regelmäßig Ringe, die hin und zurück laufen oder nur wenige Meter breit sind –
      // sie decken nichts ab, zeichnen aber einen Haarstrich mitten in die Staffelfläche
      // (im Raum Pinneberg/Halstenbek als "Narben" sichtbar). Maß ist die BREITE, nicht die
      // Fläche: ein langer dünner Splitter überlebt jede Flächenschwelle. Mittlere Breite eines
      // schlanken Bandes = 2·Fläche/Umfang; MINDESTBREITE entspricht der Vereinfachungs-
      // toleranz aus tools/gen_regions.py (SIMPLIFY = 0.0015° ≈ 166 m), unterhalb derer die
      // Form ohnehin nur noch Ausdünnungsfehler ist. Dort werden dieselben Splitter schon aus
      // den statischen Flächen geworfen – hier fallen die an, die erst beim Vereinigen entstehen.
      if (ring.length >= 3 && this._ringBreiteM(pool, ring) >= this.MINI_BREITE_M) out.push(ring);
    }
    return out;
  },

  // Schmalste Breite, die eine Staffelfläche haben darf, in METERN. Muss mit MINI_BREITE_M in
  // tools/gen_regions.py übereinstimmen – sonst wirft der Generator Splitter weg, die die
  // Laufzeit-Vereinigung gleich wieder erzeugt.
  MINI_BREITE_M: 166,

  // Mittlere Breite eines Rings in Metern: 2·Fläche/Umfang, metrisch gerechnet. Metrisch ist
  // Pflicht – ein Grad Länge ist auf 53° Breite nur 0,6 Grad Breite wert, in Grad gemessen
  // hinge die Schwelle also von der Ausrichtung des Splitters ab.
  _ringBreiteM: function(pool, ring) {
    let lat = 0;
    for (const i of ring) lat += pool[i][0];
    const kx = Math.cos(lat / ring.length * Math.PI / 180) * 111320, ky = 110570;
    let a = 0, u = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = pool[ring[i]], q = pool[ring[(i + 1) % ring.length]];
      const px = p[1] * kx, py = p[0] * ky, qx = q[1] * kx, qy = q[0] * ky;
      a += px * qy - qx * py;
      u += Math.hypot(qx - px, qy - py);
    }
    return u > 0 ? Math.abs(a) / u : 0;   // = 2·(|a|/2)/u
  },

  // Vorzeichenbehaftete Fläche eines Rings (Punkt-Indizes) – Vorzeichen = Umlaufrichtung
  _ringFlaeche: function(pool, ring) {
    let s = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = pool[ring[i]], q = pool[ring[(i + 1) % ring.length]];
      s += p[1] * q[0] - q[1] * p[0];
    }
    return s / 2;
  },

  _punktInRing: function(ring, pkt) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
      if ((yi > pkt[0]) !== (yj > pkt[0]) &&
          pkt[1] < (xj - xi) * (pkt[0] - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  },

  // Fläche einer Region im gewählten Stand als [[lat,lon],…]-Ringe, oder null wenn die
  // Region nicht dynamisch geteilt ist (dann gilt die gebaute Geometrie aus MAP_REGIONS).
  _mapRegionGeo: function(poly) {
    if (typeof MAP_WABEN === 'undefined') return null;
    const teile = (poly.split || []).filter(v => MAP_WABEN[v]);
    if (!teile.length) return null;
    if (!this._wabenStaffelCache) this._mapBuildStaffelCache();
    this._mapWabenCache = this._mapWabenCache || {};
    const ck = this._mapSaison + '|' + poly.id;
    if (this._mapWabenCache[ck]) return this._mapWabenCache[ck];

    const geo = [];
    for (const v of teile) {
      const W = MAP_WABEN[v], ringe = [];
      for (const name in W.cells) {
        const kette = this._wabenStaffelCache[v] && this._wabenStaffelCache[v][name];
        if (kette && kette.indexOf(poly.label) >= 0) for (const r of W.cells[name]) ringe.push(r);
      }
      if (!ringe.length) continue;
      // Die Vereinigung liefert Außenringe UND Löcher gleichrangig. Ein Loch entsteht,
      // wo eine Staffel eine fremde Enklave umschließt (TSV Klausdorf liegt so mitten in
      // Holstein). Ohne Zuordnung würde Leaflet die Enklave als eigene Fläche füllen –
      // beide Staffeln lägen übereinander. Unterschieden wird am Vorzeichen der Fläche,
      // die Richtung des größten Rings gilt als "außen".
      const mitF = this._wabenUnion(W.pts, ringe)
        .map(r => ({ pkt: r.map(i => W.pts[i]), f: this._ringFlaeche(W.pts, r) }));
      if (!mitF.length) continue;
      const groesster = mitF.reduce((a, b) => (Math.abs(b.f) > Math.abs(a.f) ? b : a));
      const aussenVZ = groesster.f >= 0 ? 1 : -1;
      const aussen = mitF.filter(x => (x.f >= 0 ? 1 : -1) === aussenVZ)
                         .map(x => ({ ringe: [x.pkt], flaeche: Math.abs(x.f) }));
      for (const loch of mitF.filter(x => (x.f >= 0 ? 1 : -1) !== aussenVZ)) {
        // dem kleinsten umschließenden Außenring zuschlagen
        let ziel = null;
        for (const a of aussen)
          if (this._punktInRing(a.ringe[0], loch.pkt[0]) && (!ziel || a.flaeche < ziel.flaeche)) ziel = a;
        (ziel ? ziel.ringe : (aussen[0] || {ringe: []}).ringe).push(loch.pkt);
      }
      for (const a of aussen) geo.push(a.ringe);
    }
    // Ganze Verbände, die zusätzlich zu dieser Region gehören, aus der gebauten
    // Geometrie übernehmen – die ändern sich nicht.
    if ((poly.whole || []).length && poly.geo) {
      const eigen = new Set(teile);
      for (const v of poly.whole) {
        const p = this._polyIndex[this._mapIdOf(v)];
        if (p && p.geo && !eigen.has(v)) for (const rings of p.geo) geo.push(rings);
      }
    }
    this._mapWabenCache[ck] = geo.length ? geo : null;
    return this._mapWabenCache[ck];
  },

  // Zuordnung Verein → Staffelkette für alle Waben-Vereine einmal je Stand vorbauen.
  // Ohne das würde _mapRegionGeo die Kette für jeden Verein pro Region neu bestimmen.
  _mapBuildStaffelCache: function() {
    this._wabenStaffelCache = {};
    if (typeof MAP_WABEN === 'undefined') return;
    const idByName = {};
    if (typeof GAME_DATA !== 'undefined')
      for (const id in GAME_DATA.teams) idByName[GAME_DATA.teams[id].name] = id;
    for (const v in MAP_WABEN) {
      const m = {};
      for (const name in MAP_WABEN[v].cells) m[name] = this._mapStaffelKette(name, idByName[name]);
      this._wabenStaffelCache[v] = m;
    }
  },

  // Die Vereinspunkte tragen ihre Regionen für den Regionsfilter mit; im Stand "Aktuell"
  // muss der Filter dieselbe Zuordnung benutzen wie die Flächen, sonst zeigt ein Klick auf
  // eine Staffel andere Vereine als die Fläche umschließt.
  _mapApplySaisonToMarkers: function() {
    this._mapBuildStaffelCache();
    if (!this._mapMarkers) return;
    const namen = {};
    if (typeof GAME_DATA !== 'undefined')
      for (const id in GAME_DATA.teams) namen[id] = GAME_DATA.teams[id].name;
    for (const m of this._mapMarkers)
      m._regions = this._mapStaffelKette(namen[m._teamId] || m._labelText, m._teamId);
  },

  // Wie viele Vereine sitzen im aktuellen Stand in einer anderen Staffel als am Sim-Start?
  _mapSaisonDelta: function() {
    if (typeof MAP_WABEN === 'undefined' || typeof Engine === 'undefined' || !Engine.teams) return 0;
    const merk = this._mapSaison;
    let n = 0;
    try {
      const idByName = {};
      if (typeof GAME_DATA !== 'undefined')
        for (const id in GAME_DATA.teams) idByName[GAME_DATA.teams[id].name] = id;
      for (const v in MAP_WABEN) for (const name in MAP_WABEN[v].cells) {
        this._mapSaison = 'start';
        const a = this._mapStaffelKette(name, idByName[name]).join('|');
        this._mapSaison = 'aktuell';
        const b = this._mapStaffelKette(name, idByName[name]).join('|');
        if (a !== b) n++;
      }
    } finally { this._mapSaison = merk; }
    return n;
  }
});
