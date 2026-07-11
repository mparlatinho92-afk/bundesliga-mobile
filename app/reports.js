// app/reports.js – Spieltags-Schlagzeilen + "Spiel des Tages"-Auswahl.
// Textbausteine: data_reports.js (window.REPORTS). Läuft rein clientseitig, kein Modell zur Laufzeit.
// Aufgerufen aus app/league.js (dayResults-Render).
Object.assign(App, {

    // ------------------------------------------------------------------------
    // A) Schlagzeile pro Spiel
    // ------------------------------------------------------------------------

    // Ergebnis-Record {home,away,score1,score2} + byName(Name→Team) → Schlagzeilen-Kategorie.
    // Priorität: ueberraschung > spitzenspiel/kellerduell > kanter > deutlich > knapp > remis_*
    _reportCategory: function(r, byName) {
        const h = byName[r.home], a = byName[r.away];
        const s1 = r.score1, s2 = r.score2, diff = Math.abs(s1 - s2), draw = s1 === s2;
        const size = Object.keys(byName).length || 18;
        const hR = h && h.rank, aR = a && a.rank;
        const hS = (h && h.strength) || 0, aS = (a && a.strength) || 0;
        // Überraschung: klarer Favorit verliert (nur bei Sieger + bekannten Stärken)
        if (!draw && hS && aS) {
            const winS = s1 > s2 ? hS : aS, loseS = s1 > s2 ? aS : hS;
            if (loseS - winS >= 10) return 'ueberraschung';
        }
        // Tabellen-Kontext nur bei gesetzten Rängen (nach sortTables)
        if (typeof hR === 'number' && typeof aR === 'number') {
            if (hR <= 3 && aR <= 3) return 'spitzenspiel';
            if (hR >= size - 2 && aR >= size - 2) return 'kellerduell';
        }
        if (draw) return s1 === 0 ? 'remis_torlos' : 'remis_torreich';
        if (diff >= 4) return 'kantersieg';
        if (diff >= 2) return 'deutlich';
        return 'knapp';
    },

    // Deterministischer Seed pro Spiel → Reload zeigt dieselbe Schlagzeile.
    _reportSeed: function(r) {
        const s = r.home + '|' + r.away + '|' + r.score1 + '|' + r.score2;
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        return Math.abs(h);
    },

    // Ergebnis-Record → fertige Schlagzeile ('' wenn kein Corpus / keine passende Zeile).
    // reasonKey (optional, nur Spiel des Tages): bevorzugt die anlassbezogene Kontext-Bank
    // (Paket 2, window.REPORTS_CONTEXT[key].win|draw); leere Bank → Score-Schlagzeile (Paket 1).
    // Slot-Vertrag siehe data_reports.js: {score} bei Sieg aus Siegersicht, bei Remis Heimsicht.
    _matchHeadline: function(r, byName, reasonKey) {
        const draw = r.score1 === r.score2;
        // Paket 2: Kontext-Schlagzeile bevorzugen, wenn Bank für diesen Anlass gefüllt ist
        if (reasonKey && window.REPORTS_CONTEXT && window.REPORTS_CONTEXT[reasonKey]) {
            const cpool = window.REPORTS_CONTEXT[reasonKey][draw ? 'draw' : 'win'] || [];
            if (cpool.length) return this._fillSlots(cpool[this._reportSeed(r) % cpool.length], r);
        }
        // Paket 1: score-basierte Schlagzeile
        if (!window.REPORTS) return '';
        const cat = this._reportCategory(r, byName);
        const winnerSlot = /\{sieger\}|\{verlierer\}/;
        let lines = window.REPORTS[cat] || [];
        // Remis/Spitzen-/Kellerduell mischen Sieger- und Remis-Zeilen → passend filtern:
        if (draw) lines = lines.filter(l => !winnerSlot.test(l));           // Remis: keine Sieger-Zeilen
        else if (cat === 'spitzenspiel' || cat === 'kellerduell')
            lines = lines.filter(l => winnerSlot.test(l));                  // Sieg: nur Sieger-Zeilen
        if (!lines.length) return '';
        return this._fillSlots(lines[this._reportSeed(r) % lines.length], r);
    },

    // ------------------------------------------------------------------------
    // B) Spiel des Tages: interessantestes Spiel eines Spieltags (pro Liga)
    //    Gewichteter Score aus 6 Signalen; höchster gewinnt. Gewichte zentral justierbar.
    // ------------------------------------------------------------------------
    _REPORT_W: {
        derbyTop: 38, derbyMid: 30, derbyLow: 22,   // liga-relativ skaliert (Level-abhängig gedeckelt)
        tradBoth: 42, tradOne: 14,                  // Traditionsduell (ewige Tabelle) – Gigantenduell soll oben stehen
        topBoth: 30, botBoth: 28, euBoth: 18,       // Einsatz-Zonen (Titel/Aufstieg · Abstieg · Europa/Verfolger)
        adjacent: 12, nearby: 6,                    // direktes Rangduell (10.↔11.)
        formHot: 8, formHotBoth: 6, formCold: 7,    // Form der letzten 5
        surpriseBig: 12, surpriseMid: 6             // Über-/Unterperformer vs. Vorsaison (startRank)
    },

    // Median-Paarabstand aller Vereine der Liga (km) → Maßstab fürs liga-relative Derby.
    // In dichten Amateurligen ist der Median klein → nur echte Ortsderbys stechen heraus.
    _leagueGeoMedian: function(teams) {
        const pts = teams.filter(t => t.lat != null && t.lon != null && !(t.lat === 0 && t.lon === 0));
        const ds = [];
        for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++) {
                const d = Engine._distKm(pts[i], pts[j]);
                if (isFinite(d)) ds.push(d);
            }
        if (!ds.length) return 0;
        ds.sort((a, b) => a - b);
        return ds[Math.floor(ds.length / 2)] || 0;
    },

    // Form (letzte 5, aktueller Spieltag ausgeklammert) je Team aus seasonResults der Liga.
    _reportFormMap: function(lid, teams) {
        const acc = {}; teams.forEach(t => acc[t.id] = []);
        const res = (gf, ga) => gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        (Engine.seasonResults || []).forEach(r => {
            if (r.lid !== lid) return;
            if (acc[r.hId]) acc[r.hId].push(res(r.s1, r.s2));
            if (acc[r.aId]) acc[r.aId].push(res(r.s2, r.s1));
        });
        const m = {}; teams.forEach(t => m[t.id] = acc[t.id].slice(0, -1).slice(-5));
        return m;
    },

    // Scoring-Kontext einer Liga (einmal bauen, für alle Spiele des Spieltags).
    _sdtCtx: function(teams, lid) {
        const ewige = (Engine.archive && Engine.archive.ewige && Engine.archive.ewige[lid]) || {};
        return {
            size: teams.length,
            level: (Engine.leagues[lid] || {}).level || 99,
            zones: (this.zonesCache || (this.zonesCache = Engine.calcZones()))[lid] || {},
            geoMed: this._leagueGeoMedian(teams),
            tradTop: new Set(Object.entries(ewige).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0)).slice(0, 5).map(e => e[0])),
            form: this._reportFormMap(lid, teams)
        };
    },

    // Interessantheit zweier Teams → {score, reason}. reason = stärkstes Einzelsignal (offenbart die Auswahl).
    // Nutzt nur Vor-Spiel-Daten (Rang/Stärke/Koord/Form/Tradition) → funktioniert auch für die Vorschau.
    _matchInterest: function(h, a, ctx) {
        if (!h || !a) return { score: 0, reason: '' };
        const W = this._REPORT_W, z = ctx.zones || {}, size = ctx.size, lvl = ctx.level;
        const rH = h.rank, rA = a.rank;
        const parts = []; // {pts, label, key} – key = stabile Bank-ID (Paket 2/3), label = Anzeige
        // 1. Derby (liga-relativ): nur ungewöhnlich nah für DIESE Liga zählt
        if (ctx.geoMed > 0) {
            const d = Engine._distKm(h, a);
            if (isFinite(d)) {
                const closeness = Math.max(0, 1 - (d / ctx.geoMed) / 0.5); // 0 ab halbem Median
                const wMax = lvl >= 6 ? W.derbyLow : lvl >= 4 ? W.derbyMid : W.derbyTop;
                const pts = closeness * wMax;
                if (pts > 0.5) parts.push({ pts, key: 'derby', label: d < 15 ? 'Stadtderby' : d < 40 ? 'Derby' : 'Regionalduell' });
            }
        }
        // 2. Traditionsduell (ewige Tabelle)
        const tH = ctx.tradTop.has(h.id), tA = ctx.tradTop.has(a.id);
        if (tH && tA) parts.push({ pts: W.tradBoth, key: 'tradition', label: 'Traditionsduell' });
        else if (tH || tA) parts.push({ pts: W.tradOne, key: 'tradition', label: 'Traditionsklub' });
        // 3. Einsatz-Duell (Zonen + Rangnähe)
        if (typeof rH === 'number' && typeof rA === 'number') {
            const revH = size - rH + 1, revA = size - rA + 1;
            let topH, topA, euH, euA;
            if (lvl === 1) {
                topH = rH <= 4; topA = rA <= 4;                        // CL-Ränge (Titelrennen)
                euH = rH >= 4 && rH <= 7; euA = rA >= 4 && rA <= 7;    // Kampf um Europa (Plätze 4–6/7)
            } else {
                const up = Math.max((z.fixUp || 0) + (z.varUp || 0), 2);
                topH = rH <= up; topA = rA <= up;                      // Aufstiegs-/Titelrennen
                euH = rH > up && rH <= up + 3; euA = rA > up && rA <= up + 3; // Aufstiegsverfolger
            }
            const down = Math.max((z.fixDown || 0) + (z.varDown || 0), 2);
            const botH = revH <= down, botA = revA <= down;
            if (topH && topA) parts.push({ pts: W.topBoth, key: 'topduell', label: lvl === 1 ? 'Spitzenspiel' : 'Aufstiegsduell' });
            else if (botH && botA) parts.push({ pts: W.botBoth, key: 'abstiegskrimi', label: 'Abstiegskrimi' });
            else if (euH && euA) parts.push({ pts: W.euBoth, key: 'europa', label: lvl === 1 ? 'Kampf um Europa' : 'Aufstiegsrennen' });
            const gap = Math.abs(rH - rA);
            if (gap <= 1) parts.push({ pts: W.adjacent, key: 'rangduell', label: `Duell um Platz ${Math.min(rH, rA)}` });
            else if (gap <= 3) parts.push({ pts: W.nearby, key: 'rangduell', label: 'Tabellennachbarn' });
        }
        // 4. Form (letzte 5)
        const fH = ctx.form[h.id] || [], fA = ctx.form[a.id] || [];
        const cnt = (f, x) => f.reduce((n, v) => n + (v === x), 0);
        const hotH = cnt(fH, 'W') >= 4, hotA = cnt(fA, 'W') >= 4;
        if (hotH && hotA) parts.push({ pts: W.formHot * 2 + W.formHotBoth, key: 'formstark', label: 'Topform-Duell' });
        else if (hotH || hotA) parts.push({ pts: W.formHot, key: 'formstark', label: 'Team in Topform' });
        if (cnt(fH, 'L') >= 4 || cnt(fA, 'L') >= 4) parts.push({ pts: W.formCold, key: 'formkrise', label: 'Team in der Krise' });
        // 5. Vorsaison-Überraschung (Rang vs. startRank; deckt Auf-/Absteiger mit ab)
        const surp = t => {
            if (t.startRank == null || t.rank == null) return 0;
            const d = Math.abs(t.startRank - t.rank);
            return d >= 6 ? W.surpriseBig : d >= 4 ? W.surpriseMid : 0;
        };
        const spH = surp(h), spA = surp(a);
        if (spH) parts.push({ pts: spH, key: 'ueberraschung', label: 'Überraschungsteam' });
        if (spA) parts.push({ pts: spA, key: 'ueberraschung', label: 'Überraschungsteam' });

        const score = parts.reduce((s, p) => s + p.pts, 0);
        const top = parts.length ? parts.slice().sort((x, y) => y.pts - x.pts)[0] : null;
        return { score, reason: top ? top.label : 'Topspiel', reasonKey: top ? top.key : '' };
    },

    // Aus Paaren [{key,h,a}] das interessanteste wählen → {key, reason, reasonKey}. Tiebreak: Gesamtstärke.
    _sdtPick: function(pairs, ctx) {
        let best = null, bestStr = -1;
        pairs.forEach(p => {
            if (!p.h || !p.a) return;
            const r = this._matchInterest(p.h, p.a, ctx);
            const str = (p.h.strength || 0) + (p.a.strength || 0);
            if (!best || r.score > best.score || (r.score === best.score && str > bestStr)) { best = { key: p.key, reason: r.reason, reasonKey: r.reasonKey, score: r.score }; bestStr = str; }
        });
        return best ? { key: best.key, reason: best.reason, reasonKey: best.reasonKey }
                    : { key: (pairs[0] && pairs[0].key) || '', reason: '', reasonKey: '' };
    },

    // Spiel des Tages der gespielten Ergebnisse → {key:'home|away', reason, reasonKey}.
    _spielDesTages: function(dayResults, byName, lid) {
        if (!dayResults || !dayResults.length) return { key: '', reason: '', reasonKey: '' };
        const ctx = this._sdtCtx(Object.values(byName), lid);
        return this._sdtPick(dayResults.map(r => ({ key: r.home + '|' + r.away, h: byName[r.home], a: byName[r.away] })), ctx);
    },

    // Spiel des Tages der Vorschau (noch nicht gespielt) → {key:'hId|aId', reason, reasonKey}. Teams via byId, Matches mit hId/aId.
    _spielDesTagesPrev: function(matches, byId, lid) {
        if (!matches || !matches.length) return { key: '', reason: '', reasonKey: '' };
        const ctx = this._sdtCtx(Object.values(byId), lid);
        return this._sdtPick(matches.map(m => ({ key: m.hId + '|' + m.aId, h: byId[m.hId], a: byId[m.aId] })), ctx);
    },

    // ------------------------------------------------------------------------
    // C) Kontext-Schlagzeilen (Paket 2) + Vorschau-Anrisse (Paket 3)
    //    Beide über reasonKey; leere Bank → Fallback (Score-Schlagzeile bzw. reason-Label).
    // ------------------------------------------------------------------------

    // Slots {heim}{gast}{sieger}{verlierer}{score} füllen ({score}/Sieger aus Siegersicht).
    _fillSlots: function(line, r) {
        const homeWin = r.score1 > r.score2;
        const sieger = homeWin ? r.home : r.away;
        const verlierer = homeWin ? r.away : r.home;
        const score = homeWin ? (r.score1 + ':' + r.score2) : (r.score2 + ':' + r.score1);
        return line.replace(/\{heim\}/g, r.home).replace(/\{gast\}/g, r.away)
                   .replace(/\{sieger\}/g, sieger).replace(/\{verlierer\}/g, verlierer)
                   .replace(/\{score\}/g, score);
    },

    // Vorschau-Anriss (Paket 3): ein Fable-Satz zum Anlass. Nur {heim}/{gast} (kein Ergebnis).
    // seedStr stabilisiert die Wahl vor dem Spiel. '' → Aufrufer zeigt Fallback ("Spiel des Tages · {reason}").
    _previewTeaser: function(reasonKey, heim, gast, seedStr) {
        const pool = (window.REPORTS_PREVIEW && window.REPORTS_PREVIEW[reasonKey]) || [];
        if (!pool.length) return '';
        let s = seedStr || (heim + '|' + gast), hash = 0;
        for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
        return pool[Math.abs(hash) % pool.length].replace(/\{heim\}/g, heim).replace(/\{gast\}/g, gast);
    },

    // ------------------------------------------------------------------------
    // D) Saison-Rückblick (Paket 5): 1–2 Sätze über der Abschlusstabelle einer
    //    vergangenen Saison (History-Fenster + IDB-Archiv). Bank: data_reports.js
    //    (window.REPORTS_SEASON, Ära-Register e63/e71/e83/e95/e10 – Grundregel 3).
    // ------------------------------------------------------------------------

    // Saisonjahr → Ära-Register. Jahre vor 1963 (DDR-Track 1949+) fallen auf e63.
    _seasonEra: function(y) {
        const sy = parseInt(y) || 9999;
        return sy < 1971 ? 'e63' : sy < 1983 ? 'e71' : sy < 1995 ? 'e83' : sy < 2010 ? 'e95' : 'e10';
    },

    // Punktabstand als fertige Dativ-Phrase ("einem Punkt"/"drei Punkten") – nur nach "mit/vor" (Grundregel 5).
    _vspPhrase: function(n) {
        if (n === 1) return 'einem Punkt';
        const w = ['null', '', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
        return (w[n] || n) + ' Punkten';
    },

    // ctx {y,lid,liga,meister,vize,punkte,vsp,absteiger[]} → Rückblick-Text ('' wenn Bank leer).
    // Meister-Kategorie: dominanz (Vorsprung ≥8; 2-Punkte-Ära vor 1995 ≥5) / fotofinish (≤2 bzw. ≤1)
    // / standard. Kategorie-Pool leer → standard derselben Ära (NIE Ära wechseln). Vorsprung 0
    // (Tordifferenz entscheidet) → {vspPhrase}-Zeilen ausgefiltert. Seed aus y|lid → deterministisch.
    _seasonReview: function(ctx) {
        const B = window.REPORTS_SEASON;
        if (!B || !ctx || !ctx.meister) return '';
        const era = this._seasonEra(ctx.y);
        const twoPt = (parseInt(ctx.y) || 9999) < 1995;
        const cat = ctx.vsp >= (twoPt ? 5 : 8) ? 'dominanz' : ctx.vsp <= (twoPt ? 1 : 2) ? 'fotofinish' : 'standard';
        let s = ctx.y + '|' + ctx.lid, h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        const seed = Math.abs(h);
        const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1] : (a[0] || '');
        const fill = l => l.replace(/\{meister\}/g, ctx.meister).replace(/\{vize\}/g, ctx.vize || '')
            .replace(/\{liga\}/g, ctx.liga || 'Liga').replace(/\{saison\}/g, ctx.y)
            .replace(/\{punkte\}/g, ctx.punkte).replace(/\{vspPhrase\}/g, this._vspPhrase(ctx.vsp))
            .replace(/\{absteiger\}/g, list(ctx.absteiger || []));
        const usable = p => (p || []).filter(l => (ctx.vsp !== 0 || !l.includes('{vspPhrase}')) && (ctx.vize || !l.includes('{vize}')));
        let mp = usable(((B.meister && B.meister[cat]) || {})[era]);
        if (!mp.length) mp = usable(((B.meister && B.meister.standard) || {})[era]);
        const parts = [];
        if (mp.length) parts.push(fill(mp[seed % mp.length]));
        const ap = (ctx.absteiger && ctx.absteiger.length) ? ((B.abstieg || {})[era] || []) : [];
        if (ap.length) parts.push(fill(ap[(seed + 7) % ap.length]));
        return parts.join(' ');
    },

    // ------------------------------------------------------------------------
    // E) Pressestimmen (Paket 4): zwei Trainer-Zitate unter dem Spiel des Tages.
    //    Bank: data_reports.js (window.REPORTS_PRESS). Kein Ära-Register (nur Live-Spieltage).
    // ------------------------------------------------------------------------

    // Ergebnis-Record → [{speaker, text}] (0–2 Zitate; leere Pools entfallen ersatzlos).
    // Kategorie score-basiert (Tabellen-Kategorien spitzenspiel/kellerduell → Tordifferenz
    // zurückgemappt). Zitate in Ich-Form, Slot {gegner}; Sieger-/Verlierer-Zitat versetzt
    // geseedet, Remis: Heim+Gast aus 'beide' mit garantiert verschiedenen Zeilen.
    _pressVoices: function(r, byName) {
        const B = window.REPORTS_PRESS;
        if (!B) return [];
        const draw = r.score1 === r.score2, diff = Math.abs(r.score1 - r.score2);
        let cat = this._reportCategory(r, byName);
        if (cat === 'spitzenspiel' || cat === 'kellerduell')
            cat = draw ? (r.score1 === 0 ? 'remis_torlos' : 'remis_torreich')
                       : diff >= 4 ? 'kantersieg' : diff >= 2 ? 'deutlich' : 'knapp';
        const P = B[cat] || {};
        const seed = this._reportSeed(r), out = [];
        const push = (pool, who, opp, idx) => {
            if (pool && pool.length) out.push({ speaker: who, text: pool[idx % pool.length].replace(/\{gegner\}/g, opp) });
        };
        if (draw) {
            const n = (P.beide || []).length;
            let i2 = seed + 13;
            if (n > 1 && (seed % n) === (i2 % n)) i2++;      // nie zweimal dieselbe Zeile (Pool-Länge 13)
            push(P.beide, r.home, r.away, seed);
            push(P.beide, r.away, r.home, i2);
        } else {
            const homeWin = r.score1 > r.score2;
            push(P.sieger, homeWin ? r.home : r.away, homeWin ? r.away : r.home, seed);
            push(P.verlierer, homeWin ? r.away : r.home, homeWin ? r.home : r.away, seed + 13);
        }
        return out;
    },

    // Rückblick als fertiger Panel-Block ('' wenn kein Text) – Einbau in league.js (History + Archiv).
    _seasonReviewBox: function(ctx) {
        const t = this._seasonReview(ctx);
        return t ? `<div style="padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;line-height:1.5;">📰 ${t}</div>` : '';
    },

    // ctx aus einem Engine.history-Snapshot (50er-Fenster): Meister/Vize/Punkte + Absteiger
    // (= Team liegt in der FOLGE-Saison – nächster Snapshot bzw. live – auf tieferem Level).
    _seasonReviewCtxHist: function(lid, off) {
        const snap = Engine.history[off];
        if (!snap) return null;
        const rows = Object.entries(snap.teams).map(([id, t]) => t.id ? t : { ...t, id })
            .filter(t => t.leagueId === lid).sort((a, b) => (a.rank || 99) - (b.rank || 99));
        if (rows.length < 2) return null;
        const nextT = (off + 1 < Engine.history.length) ? Engine.history[off + 1].teams : Engine.teams;
        const lvlOf = lg => (Engine.leagues[lg] || {}).level;
        const lvl = lvlOf(lid);
        const abst = rows.filter(t => { const n = nextT[t.id], nl = n && lvlOf(n.leagueId); return lvl != null && nl != null && nl > lvl; }).map(t => t.name);
        const pts = t => (t.stats && t.stats.pts) || 0;
        return { y: snap.year, lid, liga: (Engine.leagues[lid] || {}).name || '', meister: rows[0].name, vize: rows[1].name,
                 punkte: pts(rows[0]), vsp: Math.max(0, pts(rows[0]) - pts(rows[1])), absteiger: abst };
    }
});
