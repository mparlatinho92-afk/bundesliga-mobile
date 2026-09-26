// ── LIGAPYRAMIDE ─────────────────────────────────────────────────────────────
// Alle Ligen EINER Saison als Karte, aufgebaut wie die Tabelle „Fußball-Ligasystem in Deutschland“ (Wikipedia):
// jede Ebene eine Zeile, jede Liga so breit wie die Ligen, aus denen man in sie aufsteigt. Bauplan und
// Nutzerentscheidungen: docs/LIGAPYRAMIDE_BAUPLAN.md, Konzeptbilder docs/pyramide-konzept/.
//
// NICHTS WIRD GESPEICHERT. Die Karte entsteht beim Öffnen aus Daten, die das Spiel ohnehin hat:
//   Tabellen      IDBStore.getSeasonAll(y) (mischt HistExt dazu) + Engine._idbPending (noch nicht gespült)
//   laufend       Engine.teams + Engine.calcZones()
//   Eltern        Engine.UP_MAP (Spiel) bzw. _archUpOf(lid, jahr) (Historie); Staffel aus den Vereinswechseln
//   Auf/Ab        Vergleich mit der Folgesaison – derselbe Weg wie die Zonenfarben im Archiv
// Im Speicher liegt immer nur die gerade sichtbare Pyramide (DOM), nicht im Spielstand.
//
// Pseudo-Nachbarn (gleiche Ebene, gemeinsame Liga erst weit oben) trennen ZWEI Mittel: ein Graben, der unter der
// gemeinsamen Liga beginnt und umso breiter ist, je höher sie steht – und ein Farbton je Geschwisterfamilie.
Object.assign(App, {

PYR_FARBEN: ['#FFD700', '#FF8C00', '#FF4500', '#CC2255', '#9922AA', '#5544DD', '#2277FF', '#00AACC'],
PYR_TOENE: [[0, 17], [-20, 22], [20, 13]],    // [Farbton-Versatz, Helligkeit %] – wechselt an jeder Familiengrenze
pyrRegel: 'eng',                                // Platzhalter: 'eng' = gab es davor/danach, 'epoche' = ganze Epoche
// Lage der DDR-Bezirksligen = Bezirksstadt [Breite, Länge]. Nur für die Staffel-Schätzung, wenn kein Vereinswechsel
// sie belegt – die Bezirksligen bestehen großteils aus historischen Vereinen ohne Koordinaten (Suhl: keiner).
PYR_BEZIRKSSTADT: { berlin: [52.52, 13.40], cottbus: [51.76, 14.33], dresden: [51.05, 13.74], erfurt: [50.98, 11.03],
    frankfurtoder: [52.35, 14.55], gera: [50.88, 12.08], halle: [51.48, 11.97], karlmarxstadt: [50.83, 12.92], leipzig: [51.34, 12.37],
    magdeburg: [52.13, 11.63], neubrandenburg: [53.56, 13.26], potsdam: [52.40, 13.06], rostock: [54.09, 12.10], schwerin: [53.63, 11.41], suhl: [50.61, 10.69] },

// ---------- Einstieg ----------
showPyramide: function(y) {
    this.activeLeague = '__pyramide__';
    this.viewArchivedSeason = null;
    this.viewHistoryOffset = null;
    try { localStorage.setItem('ba_lastLeague', '__pyramide__'); } catch (e) {}
    if (y) this.pyrJahr = y;
    if (this.pyrZoom == null) { let z = null; try { z = parseFloat(localStorage.getItem('ba_pyr_zoom')); } catch (e) {} this.pyrZoom = z > 0 ? z : (this._pyrTouch() ? 0.75 : 1); }
    this.renderSidebar();
    const t = document.getElementById('league-title');
    if (t) t.innerHTML = '<span class="lt-name">🔺 Ligapyramide</span>';
    const el = document.getElementById('content');
    if (!el) return;
    el.innerHTML = `<div class="pyr" data-no-ptr="1">
        <div class="pyr-bar">
            <div class="pyr-jahr"><button class="btn" onclick="App._pyrSchritt(-1)" title="Vorherige Saison">◀</button><select id="pyr-sel" onchange="App._pyrGeheZu(this.value)"></select><button class="btn" onclick="App._pyrSchritt(1)" title="Nächste Saison">▶</button></div>
            <input type="range" id="pyr-tl" min="0" max="0" value="0" oninput="App._pyrTl(this.value)" onchange="App._pyrTl(this.value, true)">
            <div class="pyr-leg"><span class="c-up">▲</span> Auf <span class="c-rel">⇄</span> Relegation <span class="c-down">▼</span> Ab <span class="pyr-leg-geist"></span> gab es nicht</div>
            <div class="pyr-zoom"><button class="btn" onclick="App._pyrZoomStufe(-1)">−</button><span id="pyr-zl"></span><button class="btn" onclick="App._pyrZoomStufe(1)">+</button><button class="btn" onclick="App._pyrEinpassen()" title="Ganze Pyramide">⤢</button></div>
        </div>
        <div class="pyr-view" id="pyr-view"><div id="pyr-wrap"><div id="pyr-canvas"></div></div></div>
        <div class="pyr-mini" id="pyr-mini" title="Übersicht – antippen springt dorthin"></div>
        <div class="pyr-rail pyr-rv" id="pyr-rv"><i></i></div><div class="pyr-rail pyr-rh" id="pyr-rh"><i></i></div>
    </div>`;
    this._pyrBedienung();
    this._pyrJahre().then(list => {
        this._pyrListe = list;
        const live = this._pyrLiveJahr();
        if (!this.pyrJahr || !list.includes(this.pyrJahr)) this.pyrJahr = live && list.includes(live) ? live : list[list.length - 1];
        const sel = document.getElementById('pyr-sel');
        if (sel) sel.innerHTML = list.slice().reverse().map(j => `<option value="${j}">${j}${j === live ? ' ●' : ''}</option>`).join('');
        const tl = document.getElementById('pyr-tl'); if (tl) tl.max = list.length - 1;
        this._pyrZeige(true);
    });
},

_pyrTouch: function() { return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches; },
_pyrLiveJahr: function() { return Engine.getFormattedSeason ? Engine.getFormattedSeason() : null; },

// Alle Saisons mit Tabellen: Seed (1./2. BL, DDR-Oberliga) ∪ HistExt ∪ gespielte Saisons – alt → neu
_pyrJahre: function() {
    const s = new Set();
    if (typeof HISTORY_SEED !== 'undefined') (HISTORY_SEED.seasons || []).forEach(x => s.add(x.y));
    for (let o = 0; o <= (Engine.currentSeasonOffset || 0); o++) s.add(this._seasonStrOf((Engine.startYear || 2025) + o));
    const fertig = () => [...s].sort((a, b) => (parseInt(a) - parseInt(b)) || (a.includes('/') - b.includes('/')));
    if (typeof HistExt === 'undefined') return Promise.resolve(fertig());
    return HistExt.load().then(idx => { if (idx) Object.keys(idx.bySeason).forEach(y => s.add(y)); return fertig(); }, () => fertig());
},

_pyrSchritt: function(d) {
    const L = this._pyrListe || [], i = L.indexOf(this.pyrJahr), j = i + d;
    if (j >= 0 && j < L.length) this._pyrGeheZu(L[j]);
},
_pyrGeheZu: function(y) { if (!y || y === this.pyrJahr) return; this.pyrJahr = y; this._pyrZeige(false); },
// Zeitleiste: beim Ziehen nur die Beschriftung, beim Loslassen die Karte (sonst 70 Tabellen je Pixel)
_pyrTl: function(i, los) {
    const y = (this._pyrListe || [])[+i]; if (!y) return;
    const sel = document.getElementById('pyr-sel'); if (sel) sel.value = y;
    if (los) this._pyrGeheZu(y);
},

// ---------- Daten ----------
// Tabellen einer Saison {lid: {rows:[{id,rank,g?}], vr?}} – laufend aus der Engine, sonst Datenbank + Puffer
_pyrTabellen: function(y) {
    if (!y) return Promise.resolve({});
    if (y === this._pyrLiveJahr()) {
        const out = {};
        Object.values(Engine.teams).forEach(t => { if (t.leagueId) (out[t.leagueId] = out[t.leagueId] || { rows: [] }).rows.push({ id: t.id, rank: t.rank }); });
        return Promise.resolve(out);
    }
    const pend = ((Engine._idbPending && Engine._idbPending.tables) || []).filter(t => t.y === y);
    const idb = typeof IDBStore !== 'undefined' ? IDBStore.getSeasonAll(y).catch(() => ({})) : Promise.resolve({});
    return idb.then(all => { all = all || {}; pend.forEach(t => { if (!all[t.lid]) all[t.lid] = t; }); return all; });
},

_pyrZeige: function(erstesMal) {
    const y = this.pyrJahr, L = this._pyrListe || [];
    const sel = document.getElementById('pyr-sel'); if (sel) sel.value = y;
    const tl = document.getElementById('pyr-tl'); if (tl) tl.value = Math.max(0, L.indexOf(y));
    const view = document.getElementById('pyr-view');
    const alt = view && !erstesMal && this._pyrLayout ? { fx: (view.scrollLeft + view.clientWidth / 2) / (this._pyrLayout.W * this.pyrZoom), top: view.scrollTop } : null;
    Promise.all([this._pyrTabellen(y), this._pyrTabellen(this._nextSeasonStr(y)), this._pyrTabellen(this._prevSeasonStr(y))]).then(([cur, nxt, prv]) => {
        if (this.activeLeague !== '__pyramide__' || this.pyrJahr !== y) return;   // inzwischen weitergeblättert
        this._pyrDaten = this._pyrBaue(y, cur, nxt, prv, this.pyrRegel);
        this._pyrRender();
        const v = document.getElementById('pyr-view'); if (!v || !this._pyrLayout) return;
        const LY = this._pyrLayout, Z = this.pyrZoom;
        if (alt) { v.scrollLeft = alt.fx * LY.W * Z - v.clientWidth / 2; v.scrollTop = alt.top; }
        else { const r = LY.roots[0]; v.scrollLeft = r ? (r.x + r.w / 2) * Z - v.clientWidth / 2 : 0; v.scrollTop = 0; }
        this._pyrNachScroll();
    });
},

// Reine Funktion: Tabellen dreier Saisons → Knoten der Pyramide. Headless prüfbar (tools/pyramide_check.cjs).
// Knoten: {key, lid, g, level, gebiet, name, kurz, size, up, rel, down, reld, teams[{id,z}], parent, ghost?, fill?, unsicher?}
_pyrBaue: function(y, cur, nxt, prv, regel) {
    cur = Object.assign({}, cur); nxt = Object.assign({}, nxt); prv = prv || {};
    // Doppelsaison (Bayern 2019–21): die Tabelle steht unter dem ERSTEN Jahr, gilt aber für beide. Im zweiten Jahr
    // dieselbe Liga zeigen (Klick öffnet das erste Jahr); im ersten Jahr gab es zur Halbzeit keinen Wechsel.
    Object.keys(prv).forEach(l => { if (prv[l] && prv[l].doppel && !cur[l]) cur[l] = Object.assign({}, prv[l], { tabJahr: this._prevSeasonStr(y) }); });
    Object.keys(cur).forEach(l => { if (cur[l] && cur[l].doppel && !cur[l].tabJahr && !nxt[l]) nxt[l] = cur[l]; });
    const sy = parseInt(String(y)) || 0, sim = sy >= (Engine.startYear || 2025), live = y === this._pyrLiveJahr();
    const lvl = l => this._archLevelOf(l), geb = l => this._histGebiet(l), hl = l => this._histLeague(l);
    const rowsOf = rec => (rec && rec.rows) || [];
    const hatG = rec => !!rec && !rec.vr && rowsOf(rec).some(r => r.g);
    const key = (l, g) => g ? l + '#' + g : l;
    // Wo spielte ein Verein in der Nachbarsaison? {id: {lid, g}}
    const wo = all => { const m = {}; Object.keys(all).forEach(l => rowsOf(all[l]).forEach(r => { if (!m[r.id]) m[r.id] = { lid: l, g: all[l].vr ? null : (r.g || null) }; })); return m; };
    const woN = wo(nxt), woP = wo(prv);
    const hatNext = Object.keys(nxt).some(l => rowsOf(nxt[l]).length);
    const zonen = live && Engine.calcZones ? Engine.calcZones() : null;
    const staffelName = g => /^[A-Z0-9]$/.test(g) ? ' Staffel ' + g : ' ' + g;
    const staffelKurz = g => ' ' + g;
    const K = {};
    Object.keys(cur).forEach(l => {
        const rec = cur[l], rows = rowsOf(rec); if (!rows.length) return;
        const gs = hatG(rec) ? [...new Set(rows.map(r => r.g).filter(Boolean))].sort() : [null];
        const name0 = this._archLeagueName(l, sy), kurz0 = hl(l) ? this._histKurzName(l) : this._ligaShort(l);
        gs.forEach(g => {
            let rr = g ? rows.filter(r => r.g === g) : rows.slice();
            if (rec.vr) { const seen = new Set(); rr = rr.sort((a, b) => (a.rank || 999) - (b.rank || 999)).filter(r => !seen.has(r.id) && seen.add(r.id)); }
            rr.sort((a, b) => (a.rank || 999) - (b.rank || 999));
            const lv = lvl(l), n = rr.length;
            const k = { key: key(l, g), lid: l, g, level: lv, gebiet: geb(l), name: name0 + (g ? staffelName(g) : '') + (rec.doppel ? ` (Doppelsaison ${rec.doppel})` : ''), kurz: kurz0 + (g ? staffelKurz(g) : ''), tabJahr: rec.tabJahr || null,
                size: n, up: 0, rel: 0, down: 0, reld: 0, bekannt: live || hatNext, teams: [] };
            const z = zonen && zonen[l];
            rr.forEach((r, i) => {
                let zo = '';
                if (z) {
                    zo = i < z.fixUp ? 'up' : i < z.fixUp + z.varUp ? 'rel' : i >= n - z.fixDown ? 'down' : i >= n - z.fixDown - z.varDown ? 'reld' : '';
                } else if (hatNext) {
                    const w = woN[r.id];
                    zo = !w ? 'down' : lvl(w.lid) < lv ? 'up' : lvl(w.lid) > lv ? 'down' : '';
                }
                if (zo) k[zo === 'reld' ? 'reld' : zo]++;
                k.teams.push({ id: r.id, z: zo });
            });
            K[k.key] = k;
        });
    });
    // Eltern: Spielzeit UP_MAP, Historie _archUpOf; gibt es die Liga in dieser Saison nicht, die Liga derselben Region eine Ebene höher
    const upOf = l => sim ? (Engine.UP_MAP[l] || (l === '2' ? '1' : l === '3' ? '2' : null)) : this._archUpOf(l, sy);
    const kandidaten = (lv, gebiet) => Object.keys(cur).filter(c => rowsOf(cur[c]).length && lvl(c) === lv && geb(c) === gebiet);
    const nachRegion = (l, cands) => { const r = (hl(l) || {}).region; if (!r) return null; const t = cands.filter(c => (hl(c) || {}).region === r); return t.length === 1 ? t[0] : null; };
    const gruppen = p => [...new Set(rowsOf(cur[p]).map(r => r.g).filter(Boolean))].sort();
    // Lage einer Liga: DDR-Bezirksliga = Bezirksstadt, sonst Schwerpunkt der Vereinskoordinaten
    const mitte = ids => { const k = [...ids].map(id => (Engine.teams && Engine.teams[id]) || GAME_DATA.teams[id]).filter(t => t && t.lat != null);
        return k.length ? [k.reduce((s, t) => s + t.lat, 0) / k.length, k.reduce((s, t) => s + t.lon, 0) / k.length] : null; };
    const lage = kn => { const bz = /^h3d-(.+)-bezirksliga/.exec(kn.lid || ''); return (bz && this.PYR_BEZIRKSSTADT[bz[1]]) || mitte((kn.teams || []).map(t => t.id)); };
    const abstand = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.63);
    // Liga darüber (ohne Staffel); gibt es sie in dieser Saison nicht: dieselbe Region eine Ebene höher
    const oben = kn => {
        let p = upOf(kn.lid);
        if (!p || !rowsOf(cur[p]).length || lvl(p) !== kn.level - 1) {
            const cands = kandidaten(kn.level - 1, kn.gebiet);
            p = cands.length === 1 ? cands[0] : nachRegion(kn.lid, cands);
            if (!p && cands.length) { p = cands[0]; kn.unsicher = true; }
        }
        return p || null;
    };
    // Staffel der Liga darüber – ANSICHTS-ÖKONOMIE (Nutzerentscheidung 26.09.2026): bei geografisch geteilten Ligen greift
    // die Pyramide streng durch wie bei Bayern- oder NOFV-Oberliga Nord/Süd. Die Unterligen werden nach Entfernung auf die
    // Staffeln verteilt, jede Staffel höchstens gleich viele („DDR-Liga Staffel B hat nie mit der Bezirksliga Rostock zu
    // tun“). Vereinswechsel entscheiden NICHT – einzelne Auf-/Absteiger über Staffelgrenzen hinweg machten die Reihen
    // lang und unübersichtlich. Keine Datenänderung. 2. Bundesliga Nord/Süd bleibt bei der Region (historische Regel).
    const verteile = (p, kinder, ohneDeckel) => {
        const gs = gruppen(p), gm = {}, belegt = {};
        gs.forEach(g => { gm[g] = mitte(rowsOf(cur[p]).filter(r => r.g === g).map(r => r.id)); belegt[g] = 0; });
        const nordSued = gs.length === 2 && gs.includes('Nord') && gs.includes('Süd');
        // Einheit = eine Liga (lid): hat ein Bezirk selbst zwei Staffeln (Suhl 1/2, Halle Nord/Süd 1963/64), bleiben sie
        // zusammen und zählen EINMAL – sonst läuft der Süden über und eine Suhler Staffel landet bei Rostock.
        const einheiten = new Map(); kinder.forEach(kn => { if (!einheiten.has(kn.lid)) einheiten.set(kn.lid, []); einheiten.get(kn.lid).push(kn); });
        const deckel = ohneDeckel ? Infinity : Math.ceil(einheiten.size / gs.length), wahl = new Map(), offen = [];
        einheiten.forEach((kns, l) => { const kn = kns[0], reg = (hl(l) || {}).region || '';
            if (nordSued && reg && kn.gebiet === 'BRD') wahl.set(l, /Süd/.test(reg) ? 'Süd' : 'Nord'); else offen.push(l); });   // DDR-Region heißt nur „Bezirke“
        const paare = [];
        offen.forEach(l => { const lg = lage({ lid: l, teams: einheiten.get(l).flatMap(k => k.teams || []) });
            if (lg) gs.forEach(g => { if (gm[g]) paare.push([abstand(lg, gm[g]), l, g]); }); });
        paare.sort((x, y) => x[0] - y[0]).forEach(([, l, g]) => { if (wahl.has(l) || belegt[g] >= deckel) return; wahl.set(l, g); belegt[g]++; });
        offen.filter(l => !wahl.has(l)).forEach(l => {   // ohne Ortsangabe: in die kleinste Staffel, markiert
            const g = gs.slice().sort((x, y) => belegt[x] - belegt[y])[0]; wahl.set(l, g); belegt[g]++; einheiten.get(l).forEach(kn => { kn.unsicher = true; }); });
        kinder.forEach(kn => { kn.parent = key(p, wahl.get(kn.lid)); });
    };
    const zuordnen = (knoten, ohneDeckel) => {
        const jeEltern = {};
        knoten.forEach(k => { if (k.level <= 1) { k.parent = null; return; }
            const p = oben(k); if (!p) { k.parent = null; return; }
            if (hatG(cur[p])) (jeEltern[p] = jeEltern[p] || []).push(k); else k.parent = p; });
        Object.entries(jeEltern).forEach(([p, ks]) => verteile(p, ks, ohneDeckel));
    };
    zuordnen(Object.values(K), false);
    // Platzhalter (ohne Namen): eng = gab es in der Saison davor oder danach; epoche = alle Ligen derselben Epoche
    const da = new Set(Object.keys(cur).filter(l => rowsOf(cur[l]).length));
    const geister = new Set([...Object.keys(prv), ...Object.keys(nxt)].filter(l => !da.has(l) && (rowsOf(prv[l]).length || rowsOf(nxt[l]).length)));
    if (regel === 'epoche' && typeof HIST_ARCHIVE_LEAGUES !== 'undefined') {
        const ep = new Set([...da].map(l => (hl(l) || {}).epoche).filter(Boolean));
        Object.keys(HIST_ARCHIVE_LEAGUES).forEach(l => { if (!da.has(l) && ep.has(HIST_ARCHIVE_LEAGUES[l].epoche)) geister.add(l); });
    }
    const geistKnoten = [...geister].map(l => ({ key: '~' + l, lid: l, level: lvl(l), gebiet: geb(l), ghost: true, teams: [] }));
    zuordnen(geistKnoten, true);   // Platzhalter belegen keinen Staffelplatz
    geistKnoten.forEach(g => { K[g.key] = g; });
    // Spielzeit: unter Verbänden ohne tiefere Ebene je Ebene ein Platzhalter bis ganz unten
    if (sim) {
        const tief = Math.max(...Object.values(K).filter(k => !k.ghost).map(k => k.level));
        const hatKind = new Set(Object.values(K).map(k => k.parent));
        let n = 0;
        Object.values(K).filter(k => !k.ghost && !hatKind.has(k.key) && k.level < tief).forEach(k => {
            let p = k.key;
            for (let lv = k.level + 1; lv <= tief; lv++) { const g = { key: '~f' + (n++), level: lv, gebiet: k.gebiet, ghost: true, fill: true, parent: p, teams: [] }; K[g.key] = g; p = g.key; }
        });
    }
    return { y, live, hatNext, knoten: Object.values(K) };
},

// ---------- Anordnung ----------
// Breiten von unten nach oben; Graben zwischen Geschwistern umso breiter, je höher ihre gemeinsame Liga.
_pyrAnordnen: function(D, Z) {
    const LOW = Z < 0.45, mob = this._pyrTouch();
    const N = {}; D.knoten.forEach(k => { N[k.key] = Object.assign({ kids: [] }, k); });
    Object.values(N).forEach(n => { if (n.parent && N[n.parent]) N[n.parent].kids.push(n); else n.parent = null; });
    const ord = n => { const h = n.lid && this._histLeague(n.lid); if (h) return h.ord || 0;
        const p = n.parent && N[n.parent], dm = p && p.lid && Engine.DOWN_MAP && Engine.DOWN_MAP[p.lid];
        return dm && n.lid ? dm.indexOf(n.lid) : 0; };
    Object.values(N).forEach(n => n.kids.sort((a, b) => (!!a.fill - !!b.fill) || ord(a) - ord(b) || String(a.g || '').localeCompare(String(b.g || '')) || String(a.lid || '').localeCompare(String(b.lid || ''))));
    const roots = Object.values(N).filter(n => !n.parent).sort((a, b) => (a.gebiet === 'DDR') - (b.gebiet === 'DDR') || a.level - b.level || (!!a.ghost - !!b.ghost));
    const GAP = L => [0, 44, 30, 20, 12, 6, 4, 3, 3][L] || 3, LEAF = 196, GW = 30, ROOTGAP = 160;
    const breite = n => { n.kids.forEach(breite); const kw = n.kids.reduce((s, k) => s + k.w, 0) + Math.max(0, n.kids.length - 1) * GAP(n.level);
        n.w = Math.max(n.fill ? 0 : n.ghost ? GW : LEAF, kw); };
    roots.forEach(breite);
    const lege = (n, x) => { n.x = x; let kx = x + (n.w - (n.kids.reduce((s, k) => s + k.w, 0) + Math.max(0, n.kids.length - 1) * GAP(n.level))) / 2;
        n.kids.forEach(k => { if (k.fill) k.w = n.w; lege(k, kx); kx += k.w + GAP(n.level); }); };
    const RW = mob ? 30 : 58, LEFT = RW / Z + 16, zwei = roots.some(r => r.gebiet === 'DDR');
    const TOP = zwei ? 44 / (LOW ? Z : 1) : 16;
    let x = LEFT, vorher = null;
    roots.forEach(r => { if (vorher) x += vorher.gebiet !== r.gebiet ? ROOTGAP : GAP(1); lege(r, x); x += r.w; vorher = r; });
    const tief = Math.max(1, ...Object.values(N).map(n => n.level));
    const RH = LOW ? Math.round(64 / Z) : 118, RG = LOW ? Math.round(10 / Z) : 14;
    const rowTop = L => TOP + (L - 1) * (RH + RG);
    // Farbton je Familie: Geschwister teilen ihn, an jeder Familiengrenze einer Ebene wechselt er
    for (let L = 1; L <= tief; L++) { let fam, i = -1;
        Object.values(N).filter(n => n.level === L && !n.ghost).sort((a, b) => a.x - b.x)
            .forEach(n => { const f = n.parent || ('root-' + n.gebiet); if (f !== fam) { fam = f; i = (i + 1) % this.PYR_TOENE.length; } n.ton = i; }); }
    const ohneBRD = zwei && !roots.some(r => r.gebiet === 'BRD' && !r.ghost);   // Platz für den Hinweis „Tabellen erst ab 1963/64“
    return { N, roots, W: x + 40 + (ohneBRD ? 520 / (LOW ? Z : 1) : 0), H: rowTop(tief) + RH + 30, tief, RH, RG, rowTop, GAP, ROOTGAP, LOW, RW, TOP, zwei };
},

// ---------- Darstellung ----------
_pyrHue: function(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round(h * 60 + 360) % 360;
},

_pyrRender: function() {
    const cv = document.getElementById('pyr-canvas'), wrap = document.getElementById('pyr-wrap');
    if (!cv || !this._pyrDaten) return;
    const D = this._pyrDaten, Z = this.pyrZoom;
    const zl = document.getElementById('pyr-zl'); if (zl) zl.textContent = Math.round(Z * 100) + ' %';
    if (!D.knoten.some(k => !k.ghost)) { this._pyrLayout = null; wrap.style.cssText = ''; cv.style.cssText = ''; cv.innerHTML = '<div style="padding:30px;opacity:.6">Für diese Saison liegen keine Tabellen vor.</div>'; return; }
    const LY = this._pyrLayout = this._pyrAnordnen(D, Z);
    const { N, roots, W, H, tief, RH, RG, rowTop, GAP, LOW } = LY, F = this.PYR_FARBEN;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    let h = '';
    for (let L = 1; L <= tief; L++) h += `<div class="pyr-band" style="top:${rowTop(L) - RG / 2}px;height:${RH + RG}px;width:${W}px;background:${F[L - 1]}10;border-top:1px solid ${F[L - 1]}30"></div>`;
    const graeben = n => {
        for (let i = 1; i < n.kids.length; i++) { const a = n.kids[i - 1], g = GAP(n.level), ty = rowTop(n.level) + RH + RG / 2;
            h += `<div class="pyr-graben" style="left:${a.x + a.w}px;width:${g}px;top:${ty}px;height:${H - ty}px;--lc:${F[n.level - 1]}66;--lw:${Math.max(1, 4 - n.level * 0.7)}px"></div>`; }
        n.kids.forEach(graeben);
    };
    roots.forEach(graeben);
    roots.forEach((r, i) => { const nx = roots[i + 1]; if (nx && nx.gebiet !== r.gebiet)
        h += `<div class="pyr-graben" style="left:${r.x + r.w}px;width:${LY.ROOTGAP}px;top:0;height:${H}px;--lc:#666;--lw:2px"></div>`; });
    if (LY.zwei) {
        const gebiete = [...new Set(roots.map(r => r.gebiet))];
        gebiete.forEach(gb => { const r = roots.find(x => x.gebiet === gb);
            h += `<div class="pyr-gebiet" style="left:${r.x}px;top:${LY.TOP - 34 / (LOW ? Z : 1)}px;${LOW ? `transform:scale(${1 / Z});transform-origin:0 0` : ''}">${gb === 'DDR' ? 'DDR' : 'BUNDESREPUBLIK'}</div>`; });
        if (!gebiete.includes('BRD')) h += `<div class="pyr-gebiet" style="left:${Math.max(...roots.filter(r => !r.ghost).map(r => r.x + r.w)) + 60}px;top:${LY.TOP - 34 / (LOW ? Z : 1)}px;opacity:.6;${LOW ? `transform:scale(${1 / Z});transform-origin:0 0` : ''}">BUNDESREPUBLIK – Tabellen erst ab 1963/64</div>`;
    }
    const mini = [];
    const kante = n => { const hu = this._pyrHue(F[n.level - 1]), [o, l] = this.PYR_TOENE[n.ton || 0]; return `background:hsl(${hu + o},34%,${l}%);border-color:hsl(${hu + o},34%,${l + 9}%)`; };
    const thumb = id => ((Engine.teams && Engine.teams[id]) || GAME_DATA.teams[id] || {}).thumb;
    const clubName = id => (this._histClubName && this._histClubName(id, D.y)) || ((Engine.teams && Engine.teams[id]) || GAME_DATA.teams[id] || {}).name
        || (typeof HISTORIC_CLUBS !== 'undefined' && (typeof HISTORIC_CLUBS[id] === 'string' ? HISTORIC_CLUBS[id] : (HISTORIC_CLUBS[id] || {}).name)) || id;
    Object.values(N).forEach(n => {
        const y0 = rowTop(n.level), c = F[n.level - 1];
        if (n.ghost) {
            const s = Math.min(24, n.w - 6, RH * 0.3);
            if (s > 4) h += `<div class="pyr-geist" style="left:${n.x + n.w / 2 - s / 2}px;top:${y0 + RH / 2 - s / 2}px;width:${s}px;height:${s}px;border-color:${c}"></div>`;
            mini.push({ x: n.x + n.w / 2 - 3, y: y0 + RH / 2 - 3, w: 6, h: 6, c, g: 1 });
            return;
        }
        const breit = n.w > 236, nm = breit ? n.name : (n.kurz || n.name);
        const sfs = LOW ? Math.min(18 / Z, RH * 0.2, n.w * 0.12) : 16, sideW = sfs * 2.4;
        const fs = Math.max(10, LOW ? Math.min(20 / Z, RH * 0.32, (n.w - sideW - 16) / (nm.length * 0.6)) : Math.min(breit ? 17 : 13, (n.w - 56) / (nm.length * 0.55)));
        const cr = LOW ? 0 : (breit ? 26 : 20);
        const perRow = cr ? Math.max(1, Math.floor((Math.min(n.w, 900) - sideW - 18) / (cr + 3))) : 0;
        const innerW = breit ? Math.min(n.w - 2, Math.max(nm.length * fs * 0.6, cr ? Math.min(n.teams.length, perRow) * (cr + 3) : 0) + sideW + 22) : n.w - 2;
        const mos = cr ? '<div class="pyr-mos">' + n.teams.map(t => { const th = thumb(t.id);
            return `<span class="pyr-w ${t.z}" style="width:${cr}px;height:${cr}px" title="${esc(clubName(t.id))}">${th ? `<img src="${th}" loading="lazy" style="width:${cr - 5}px;height:${cr - 5}px">` : '<i></i>'}</span>`; }).join('') + '</div>' : '';
        const m = (v, cl, sy) => `<b class="${cl}${v ? '' : ' z'}" style="font-size:${sfs * 0.7}px">${sy}${n.bekannt ? v : '–'}</b>`;
        const side = `<div class="pyr-side" style="width:${sideW}px;flex-basis:${sideW}px"><b style="font-size:${sfs}px">${n.size}</b>${m(n.up, 'c-up', '▲')}${n.rel ? m(n.rel, 'c-rel', '⇄') : ''}${m(n.down, 'c-down', '▼')}${n.reld ? m(n.reld, 'c-reld', '⇄') : ''}</div>`;
        h += `<div class="pyr-karte${n.unsicher ? ' unsicher' : ''}" onclick="App._pyrOeffne('${n.lid}'${n.tabJahr ? `,'${n.tabJahr}'` : ''})" title="${esc(n.name)}${n.unsicher ? ' – Zuordnung zur Liga darüber unsicher' : ''}" style="left:${n.x}px;top:${y0}px;width:${n.w}px;height:${RH}px;${kante(n)};border-top-color:${c}">`
            + `<div class="pyr-in" data-w="${innerW}" style="width:${innerW}px;left:${(n.w - 2 - innerW) / 2}px"><div class="pyr-txt"><div class="pyr-nm" style="font-size:${fs}px">${esc(nm)}</div>${mos}</div>${side}</div></div>`;
        mini.push({ x: n.x, y: y0, w: n.w, h: RH, c });
    });
    // Ebenen-Lineal: bleibt beim Seitwärtsschieben links stehen (Position in _pyrNachScroll)
    let lin = '';
    for (let L = 1; L <= tief; L++) lin += `<div class="pyr-lin" style="top:${rowTop(L) - RG / 2}px;height:${RH + RG}px;width:${LY.RW / Z}px;border-right-width:${3 / Z}px;border-color:${F[L - 1]};color:${F[L - 1]}"><b style="font-size:${(LY.RW < 40 ? 15 : 20) / Z}px">${L}</b><small style="font-size:${9 / Z}px">EBENE</small></div>`;
    h += `<div id="pyr-lineal">${lin}</div>`;
    cv.style.cssText = `width:${W}px;height:${H}px;transform:scale(${Z})`;
    wrap.style.cssText = `width:${W * Z}px;height:${H * Z}px`;
    cv.innerHTML = h;
    this._pyrMiniDaten = mini;
    this._pyrMini();
},

// Nach jedem Scrollen: Lineal mitschieben, Inhalt breiter Karten in den sichtbaren Teil, Übersicht + Leisten nachführen
_pyrNachScroll: function() {
    const v = document.getElementById('pyr-view'), LY = this._pyrLayout; if (!v || !LY) return;
    const Z = this.pyrZoom, lin = document.getElementById('pyr-lineal');
    if (lin) lin.style.left = (v.scrollLeft / Z) + 'px';
    const vl = v.scrollLeft / Z + (LY.RW + 4) / Z, vr = (v.scrollLeft + v.clientWidth) / Z - 16;
    document.querySelectorAll('#pyr-canvas .pyr-karte').forEach(el => {
        const inn = el.firstElementChild, iw = +inn.dataset.w, cl = el.offsetLeft, cw = el.offsetWidth - 2;
        if (iw >= cw) return; const a = Math.max(cl, vl), b = Math.min(cl + cw, vr); if (b <= a) return;
        let left = iw > b - a ? a : (a + b) / 2 - iw / 2; left = Math.max(cl, Math.min(left, cl + cw - iw)); inn.style.left = (left - cl) + 'px';
    });
    this._pyrMiniRahmen();
    this._pyrLeisten();
},

_pyrMini: function() {
    const box = document.getElementById('pyr-mini'), LY = this._pyrLayout; if (!box || !LY) return;
    const mw = this._pyrTouch() ? 120 : 220, s = mw / LY.W, F = this.PYR_FARBEN;
    let h = `<div class="pyr-mini-in" style="width:${mw}px;height:${LY.H * s}px">`;
    for (let L = 1; L <= LY.tief; L++) h += `<div style="left:0;right:0;top:${LY.rowTop(L) * s}px;height:${LY.RH * s}px;background:${F[L - 1]}14"></div>`;
    (this._pyrMiniDaten || []).forEach(p => h += `<div style="left:${p.x * s}px;top:${p.y * s}px;width:${Math.max(1.5, p.w * s - 1)}px;height:${Math.max(1.5, p.h * s)}px;${p.g ? `outline:1px dashed ${p.c};opacity:.5` : `background:${p.c};opacity:.85`}"></div>`);
    box.innerHTML = h + '<div class="pyr-mini-vp" id="pyr-mini-vp"></div></div>';
    box.onclick = e => { const r = box.firstElementChild.getBoundingClientRect(), v = document.getElementById('pyr-view');
        v.scrollLeft = (e.clientX - r.left) / s * this.pyrZoom - v.clientWidth / 2; v.scrollTop = (e.clientY - r.top) / s * this.pyrZoom - v.clientHeight / 2; };
},
_pyrMiniRahmen: function() {
    const vp = document.getElementById('pyr-mini-vp'), v = document.getElementById('pyr-view'), LY = this._pyrLayout; if (!vp || !v || !LY) return;
    const s = (this._pyrTouch() ? 120 : 220) / LY.W, Z = this.pyrZoom;
    vp.style.cssText = `left:${v.scrollLeft / Z * s}px;top:${v.scrollTop / Z * s}px;width:${Math.min(LY.W * s, v.clientWidth / Z * s)}px;height:${Math.min(LY.H * s, v.clientHeight / Z * s)}px`;
},
// Eigene Schiebeleisten (Touch): Android blendet die Scrollbalken aus
_pyrLeisten: function() {
    const v = document.getElementById('pyr-view'), rv = document.getElementById('pyr-rv'), rh = document.getElementById('pyr-rh'); if (!v || !rv || !rh) return;
    const f = (vis, all) => Math.min(1, vis / Math.max(1, all));
    const th = rh.firstElementChild, tv = rv.firstElementChild;
    const bw = rh.clientWidth, bh = rv.clientHeight;
    const wH = Math.max(28, bw * f(v.clientWidth, v.scrollWidth)), wV = Math.max(28, bh * f(v.clientHeight, v.scrollHeight));
    th.style.width = wH + 'px'; th.style.left = ((bw - wH) * (v.scrollLeft / Math.max(1, v.scrollWidth - v.clientWidth))) + 'px';
    tv.style.height = wV + 'px'; tv.style.top = ((bh - wV) * (v.scrollTop / Math.max(1, v.scrollHeight - v.clientHeight))) + 'px';
    rh.style.display = v.scrollWidth > v.clientWidth + 1 ? '' : 'none';
    rv.style.display = v.scrollHeight > v.clientHeight + 1 ? '' : 'none';
},

// ---------- Zoom ----------
_pyrZoomSetzen: function(z, cx, cy) {
    const v = document.getElementById('pyr-view'), LY = this._pyrLayout;
    z = Math.max(this._pyrMinZoom(), Math.min(1.5, z));
    if (!v || !LY) { this.pyrZoom = z; return; }
    if (cx == null) { cx = v.clientWidth / 2; cy = v.clientHeight / 2; }
    const fx = (v.scrollLeft + cx) / (LY.W * this.pyrZoom), fy = (v.scrollTop + cy) / (LY.H * this.pyrZoom);
    this.pyrZoom = z;
    try { localStorage.setItem('ba_pyr_zoom', String(z)); } catch (e) {}
    this._pyrRender();
    const L2 = this._pyrLayout; if (!L2) return;
    v.scrollLeft = fx * L2.W * z - cx; v.scrollTop = fy * L2.H * z - cy;
    this._pyrNachScroll();
},
_pyrMinZoom: function() { const v = document.getElementById('pyr-view'), LY = this._pyrLayout;
    return v && LY ? Math.max(0.04, Math.min(0.5, (v.clientWidth - 8) / LY.W)) : 0.1; },
_pyrZoomStufe: function(d) { const S = [0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.75, 1, 1.25, 1.5], z = this.pyrZoom;
    const n = d > 0 ? S.find(s => s > z + 0.001) : S.slice().reverse().find(s => s < z - 0.001);
    this._pyrZoomSetzen(n != null ? n : z); },
_pyrEinpassen: function() { const v = document.getElementById('pyr-view'); if (!v || !this._pyrLayout) return;
    this._pyrZoomSetzen((v.clientWidth - 8) / this._pyrLayout.W); v.scrollLeft = 0; v.scrollTop = 0; this._pyrNachScroll(); },

// Scrollen, Strg+Mausrad, Zwei-Finger-Zoom, Leisten ziehen
_pyrBedienung: function() {
    const v = document.getElementById('pyr-view'); if (!v) return;
    let raf = 0;
    v.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; this._pyrNachScroll(); }); }, { passive: true });
    v.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); const r = v.getBoundingClientRect();
        this._pyrZoomSetzen(this.pyrZoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    let pinch = null;
    const abst = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    v.addEventListener('touchstart', e => { if (e.touches.length === 2) { const r = v.getBoundingClientRect();
        pinch = { d: abst(e.touches), f: 1, cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top }; } }, { passive: true });
    v.addEventListener('touchmove', e => { if (!pinch || e.touches.length !== 2) return; e.preventDefault();
        pinch.f = abst(e.touches) / pinch.d; const cv = document.getElementById('pyr-canvas');
        if (cv) { cv.style.transformOrigin = `${(v.scrollLeft + pinch.cx) / this.pyrZoom}px ${(v.scrollTop + pinch.cy) / this.pyrZoom}px`; cv.style.transform = `scale(${this.pyrZoom * pinch.f})`; } }, { passive: false });
    v.addEventListener('touchend', e => { if (!pinch || e.touches.length) return; const p = pinch; pinch = null;
        const cv = document.getElementById('pyr-canvas'); if (cv) cv.style.transformOrigin = '0 0';
        this._pyrZoomSetzen(this.pyrZoom * p.f, p.cx, p.cy); });
    const zieh = (rail, achse) => { const el = document.getElementById(rail); if (!el) return;
        el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId);
            const r = el.getBoundingClientRect(), bewege = ev => { const f = achse === 'x' ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
                if (achse === 'x') v.scrollLeft = f * v.scrollWidth - v.clientWidth / 2; else v.scrollTop = f * v.scrollHeight - v.clientHeight / 2; };
            bewege(e); el.onpointermove = bewege; el.onpointerup = () => { el.onpointermove = null; el.onpointerup = null; }; }); };
    zieh('pyr-rh', 'x'); zieh('pyr-rv', 'y');
    if (!this._pyrResize) { this._pyrResize = true; window.addEventListener('resize', () => { if (this.activeLeague === '__pyramide__') this._pyrNachScroll(); }); }
},

// Direkte Aufstiegskonkurrenten (Nutzerentscheidung 26.09.2026): spielten die Meister unter EINER Liga in getrennten
// Aufstiegsrunden (AUFSTIEG_SEED, Gruppen `gr`), sind nur die Ligen derselben Runde Schwestern – 1985/86 unter der
// 2. Bundesliga z. B. Nord/Nordrhein/Westfalen/Berlin gegen Baden-Württemberg/Südwest/Hessen/Bayern. Ligen ohne
// Teilnehmer (Direktaufsteiger) bilden ihre eigene Gruppe. Schickt eine Liga Teams in mehrere Runden, zählen alle diese
// Runden. Relegations-Duelle (`du`) zählen nicht – das sind wechselnde Paarungen. null = keine Runde, Geschwister bleiben.
_pyrRundenSchwestern: function(lid, y, parent, geschwister, pyr) {
    if (typeof AUFSTIEG_SEED === 'undefined' || !pyr || !geschwister) return null;
    const sy = parseInt(String(y)) || 0, p = String(parent || '').split('#')[0];
    const r = (AUFSTIEG_SEED.runden || []).find(q => q.y === sy && q.ziel === p && q.gr && q.gr.length >= 2);
    if (!r) return null;
    const ligaVon = {};
    pyr.knoten.forEach(k => { if (!k.ghost) (k.teams || []).forEach(t => { ligaVon[t.id] = k.lid; }); });
    const alle = new Set(geschwister.concat([lid]));
    const runden = r.gr.map(g => new Set(g.map(t => ligaVon[t.i]).filter(l => alle.has(l))));
    const mitMir = runden.filter(s => s.has(lid));
    let erg;
    if (mitMir.length) { erg = new Set(); mitMir.forEach(s => s.forEach(l => erg.add(l))); }
    else { const drin = new Set(); runden.forEach(s => s.forEach(l => drin.add(l))); erg = new Set([...alle].filter(l => !drin.has(l))); }
    return geschwister.filter(l => erg.has(l) && l !== lid);
},

// Einstieg aus der Liga-Navigation (Live und Archiv): öffnet die Pyramide mit der gerade angezeigten Saison
_pyrNavBtn: function(y) {
    return `<button onclick="App.showPyramide(${y ? `'${y}'` : ''})" class="btn" title="Alle Ligen dieser Saison als Pyramide" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:1px 6px;border-radius:3px;">🔺 Pyramide</button>`;
},

// Klick auf eine Liga: ihre Abschlusstabelle dieser Saison (laufend → Live-Tabelle)
_pyrOeffne: function(lid, tabJahr) {
    const y = tabJahr || this.pyrJahr;
    if (this.tableView === 'ewige' || this.tableView === 'sieger') this.tableView = 'gesamt';
    const i = (Engine.history || []).findIndex(h => h.year === y);
    if (y === this._pyrLiveJahr()) this._gotoSeason(y, 'live', null, lid);
    else if (i >= 0) this._gotoSeason(y, 'hist', i, lid);
    else this._gotoSeason(y, 'arch', null, lid);
},

});
