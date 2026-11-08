// Messung (Fix-Liste, Nutzer): Rückzüge, Punktabzüge, Lizenzentzug/Zwangsabstieg (Fallhöhe) und Aufstiegsverzicht in echten Daten –
// Häufigkeit je Ebene und Region (Ost / Rheinland / übrige), als Grundlage für eine spätere Simulation. Ändert nichts am Spiel.
//
//   A  fussball.de-Rohtabellen 2001/02–2024/25 (G:\Meine Ablage\fussball.de\<verband>\tabellen.csv, nur Hauptrunde):
//      Rückzug während der Saison (Hinweis „zurückgezogen“ / „zg.“), annulliert (0 Spiele) oder gewertet; Punktabzug = Punkte < 3S+U
//      (nur Wertung „Punkte“). Ebene: Bundesliga…Oberliga über die Spielklasse, darunter über die Zuordnung der Staffel zu einer
//      Spiel-Liga (tools/fbde_ebene58.json, Namen der Vereine je Saison), Ebene DAMALS (fe = eine höher).
//   B  Vereinsfolgen in den historischen Tabellen (HIST_EXT + Seed) 1995/96–2024/25, Ebene DAMALS (zwischen zwei Saisons
//      ohne Reform stimmig): Sturz um ≥ 2 Ebenen (Lizenzentzug, Rückzug, Zwangsabstieg), Verschwinden (nur wo die Liga darunter
//      in den Daten ist) und Meister ohne Aufstieg, obwohl aus der Liga jemand aufstieg (Aufstiegsverzicht, ohne Reserven).
//      Übergänge mit Ligareform (2007/08→08/09, 2011/12→12/13) zählen nicht.
//
// Aufruf: node tools/rueckzug_messung.cjs   -> docs/rueckzug_messung/bericht.txt (+ beispiele.txt), Zusammenfassung im Terminal
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const G = process.env.FBDE_DIR || 'G:\\Meine Ablage\\fussball.de';
const OUT = ROOT + 'docs/rueckzug_messung/';
fs.mkdirSync(OUT, { recursive: true });
global.window = global; global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null }; global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const OST_V = new Set(['sachsen', 'sachsen_anhalt', 'thueringen', 'brandenburg', 'mecklenburg_vorpommern', 'berlin']);
const OST_RE = /Mecklenburg|Brandenburg|Berlin|Sachsen(?!-Anh)|Sachsen-Anhalt|Thüringen|Nordost|NOFV/;
const regionVonLiga = lid => {
    const g = GAME_DATA.leagues[lid], h = HIST_EXT.ligen[lid];
    const txt = (g ? g.region + ' ' + g.name : '') + ' ' + (h ? (h.region || '') + ' ' + h.name + ' ' + (h.gebiet || '') : '') + ' ' + lid;
    if (/DDR/.test(txt) || OST_RE.test(txt) && !/Niedersachsen/.test(txt.replace(/Niedersachsen/g, ''))) return 'Ost';
    if (/Rheinland(?!-Pfalz)|rheinland(?!pfalz)/.test(txt)) return 'Rheinland';
    return 'übrige';
};
const csv = p => {
    const L = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    const kopf = L[0].split(';');
    return L.slice(1).filter(Boolean).map(z => { const t = z.split(';'), o = {}; kopf.forEach((k, i) => o[k] = t[i]); return o; });
};
const pct = (a, b) => b ? (100 * a / b).toFixed(2) + ' %' : '–';
const neu = () => ({ teams: 0, zg: 0, zgAnn: 0, zgGew: 0, abz: 0, abzPkt: [], staffeln: 0 });
const A = {}; const bspA = [];
const zelle = (lv, reg) => { const k = lv + '|' + reg; return A[k] || (A[k] = neu()); };

// ---------- A: fussball.de ----------
// Staffel -> Spiel-Liga über die Vereinsnamen derselben Saison (fbde_ebene58.json: nm = Name wie in tabellen.csv)
const FB = JSON.parse(fs.readFileSync(ROOT + 'tools/fbde_ebene58.json', 'utf8'));
const nmIdx = {};   // "02/03|name" -> [{lid, fe}]
const kurzY = y => { const a = parseInt(y); return String(a % 100).padStart(2, '0') + '/' + String((a + 1) % 100).padStart(2, '0'); };
FB.seasons.forEach(s => s.table.forEach(r => { if (r.nm) (nmIdx[kurzY(s.y) + '|' + r.nm] = nmIdx[kurzY(s.y) + '|' + r.nm] || []).push({ lid: s.lid, fe: !!s.fe }); }));
const startJ = sa => { const a = parseInt(sa); return a > 50 ? 1900 + a : 2000 + a; };
const ebeneOben = (kl, j) => kl === 'Bundesliga' ? 1 : kl === '2.Bundesliga' ? 2 : kl === '3.Liga' ? 3 : kl === 'Regionalliga' ? (j >= 2008 ? 4 : 3) : kl === 'Oberliga' ? (j >= 2008 ? 5 : 4) : null;
let staffelnOhne = 0, staffelnMit = 0;
for (const v of fs.readdirSync(G)) {
    const p = path.join(G, v, 'tabellen.csv');
    if (v === 'wikipedia' || /_pokale$/.test(v) || !fs.existsSync(p)) continue;
    const st = {};
    for (const o of csv(p)) { if ((o.phase || 'Hauptrunde') !== 'Hauptrunde' || !o.mannschaft) continue; (st[o.staffel_id] = st[o.staffel_id] || []).push(o); }
    for (const sid in st) {
        const rows = st[sid], o0 = rows[0], j = startJ(o0.saison);
        if (j > 2024) continue;
        let lv = v === 'deutschland' ? ebeneOben(o0.spielklasse, j) : null, reg = v === 'deutschland' ? (/Nordost|NOFV/.test(o0.staffel + o0.gebiet) ? 'Ost' : 'übrige') : (OST_V.has(v) ? 'Ost' : v === 'rheinland' ? 'Rheinland' : 'übrige');
        if (lv == null) {
            const z = {};
            rows.forEach(r => (nmIdx[o0.saison + '|' + r.mannschaft] || []).forEach(m => { const k = m.lid + '|' + (m.fe ? 1 : 0); z[k] = (z[k] || 0) + 1; }));
            const best = Object.entries(z).sort((a, b) => b[1] - a[1])[0];
            if (!best || best[1] < rows.length / 2) { staffelnOhne++; continue; }
            const [lid, fe] = best[0].split('|');
            lv = GAME_DATA.leagues[lid].level - (+fe);
        }
        staffelnMit++;
        const c = zelle(lv, reg); c.staffeln++;
        for (const r of rows) {
            c.teams++;
            const zg = /zur.ckgezogen/i.test(r.hinweis || '') || / zg\.?$/.test(r.mannschaft);
            const sp = +r.spiele || 0;
            if (zg) { c.zg++; if (sp === 0) c.zgAnn++; else c.zgGew++; if (bspA.length < 400) bspA.push(`${r.saison} E${lv} ${reg} ${r.spielklasse} ${r.staffel}: ${r.mannschaft} (${sp} Sp.)`); continue; }
            if ((r.wertung || 'Punkte') !== 'Punkte' || !sp) continue;
            const soll = 3 * (+r.g || 0) + (+r.u || 0), ist = +r.punkte;
            if (!isNaN(ist) && ist < soll) { c.abz++; c.abzPkt.push(soll - ist); }
        }
    }
}

// ---------- B: Vereinsfolgen ----------
(async () => {
    Engine.init(); await Engine._seedHistoryExt();
    const x = HistExt.loaded();
    const heute = (lid, y) => { const g = GAME_DATA.leagues[lid]; if (g) return g.level; const h = HIST_EXT.ligen[lid]; if (!h) return lid === '1' ? 1 : lid === '2' ? 2 : null;
        return h.level + (y < 2008 ? 1 : 0) + (y < 1994 ? 1 : 0); };
    const damals = (lid, y, fe) => { const g = GAME_DATA.leagues[lid]; if (g) return g.level - (fe ? 1 : 0); const h = HIST_EXT.ligen[lid]; return h ? h.level : lid === '1' ? 1 : 2; };
    const jahr = {};   // y -> id -> {lid, lv, lvD, rank}
    const add = (y, lid, rows, fe, kaputt) => rows.forEach(r => { if (!(r.s + r.u + r.n)) return; const lv = heute(lid, y); if (lv == null) return;
        ((jahr[y] = jahr[y] || {})[r.id] = { lid, lv, lvD: damals(lid, y, fe), rank: r.rank, g: r.g || '', kaputt }); });
    HISTORY_SEED.seasons.forEach(s => add(parseInt(s.y), s.lid, s.table, false, false));
    Object.values(x.byKey).forEach(r => add(parseInt(r.y), r.lid, r.rows, r.fe, !!(r.abbruch || r.an || r.doppel)));
    const name = id => (GAME_DATA.teams[id] || {}).name || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || id;
    const reserve = id => /\b(II|III)\b|Amat|\bAm\.|U ?23|U ?21|\b2$/.test(String(name(id))) || /_ii$|amt$|amateure/.test(id);
    const REFORM = new Set([2007, 2011]);
    const B = {}, bspB = { sturz: [], weg: [], verzicht: [] };
    const zB = (lv, reg) => { const k = lv + '|' + reg; return B[k] || (B[k] = { teams: 0, sturz: 0, sturzD: [], weg: 0, wegBasis: 0, meister: 0, verzicht: 0 }); };
    for (let y = 1995; y < 2024; y++) {
        if (REFORM.has(y) || !jahr[y] || !jahr[y + 1]) continue;
        const nachher = jahr[y + 1];
        // aus welchen Ligen stieg in y jemand auf?
        const aufLiga = new Set(); for (const id in jahr[y]) { const a = jahr[y][id], b = nachher[id]; if (b && b.lvD < a.lvD) aufLiga.add(a.lid + '|' + a.g); }
        for (const id in jahr[y]) {
            const a = jahr[y][id]; if (a.kaputt) continue;
            const reg = regionVonLiga(a.lid), c = zB(a.lvD, reg); c.teams++;
            const b = nachher[id];
            if (b) {
                const d = b.lvD - a.lvD;   // damalige Ebene: zwischen zwei Saisons ohne Reform stimmig (2. BL 2000 -> Regionalliga = 1 Ebene)
                if (d >= 2) { c.sturz++; c.sturzD.push(d); if (bspB.sturz.length < 300) bspB.sturz.push(`${y}/${String((y + 1) % 100).padStart(2, '0')} ${name(id)}: E${a.lv} Pl.${a.rank} → E${b.lv} (${a.lid} → ${b.lid})`); }
            } else if (y >= 2001 && (Engine.DOWN_MAP[a.lid] || []).length && !reserve(id)) {
                c.wegBasis++;
                // weg: in keiner Tabelle der Folgesaison, obwohl die Liga darunter in den Daten ist
                c.weg++; if (bspB.weg.length < 300) bspB.weg.push(`${y}/${String((y + 1) % 100).padStart(2, '0')} ${name(id)}: E${a.lv} ${a.lid} Pl.${a.rank} → keine Tabelle`);
            }
            if (a.rank === 1 && a.lv > 1 && !reserve(id) && b && aufLiga.has(a.lid + '|' + a.g)) {
                c.meister++;
                if (b.lvD >= a.lvD) { c.verzicht++; if (bspB.verzicht.length < 300) bspB.verzicht.push(`${y}/${String((y + 1) % 100).padStart(2, '0')} ${name(id)}: Meister ${a.lid}${a.g ? ' ' + a.g : ''} (E${a.lv}) → bleibt E${b.lv} (${b.lid})`); }
            }
        }
    }

    // ---------- Bericht ----------
    const regs = ['Ost', 'Rheinland', 'übrige'];
    const L = [];
    L.push('# Rückzug, Punktabzug, Lizenzentzug, Aufstiegsverzicht – gemessen ' + new Date().toISOString().slice(0, 10) + ' (node tools/rueckzug_messung.cjs)');
    L.push('', `## A  fussball.de 2001/02–2024/25 (Ebene damals) – ${staffelnMit} Staffeln zugeordnet, ${staffelnOhne} ohne Zuordnung (Kreisligen u. a.) nicht gezählt`, '');
    L.push('Ebene Region     Staffeln  Teams   Rückzug (annull./gewertet)        Punktabzug   Ø Abzug  Median  max');
    const median = a => { if (!a.length) return '–'; const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
    for (let lv = 1; lv <= 8; lv++) for (const reg of regs) { const c = A[lv + '|' + reg]; if (!c || !c.teams) continue;
        L.push(`E${lv}    ${reg.padEnd(10)} ${String(c.staffeln).padStart(6)} ${String(c.teams).padStart(6)}   ${String(c.zg).padStart(4)} = ${pct(c.zg, c.teams).padStart(8)} (${c.zgAnn}/${c.zgGew})`.padEnd(70)
            + `${String(c.abz).padStart(4)} = ${pct(c.abz, c.teams).padStart(7)}  ${c.abz ? (c.abzPkt.reduce((s, q) => s + q, 0) / c.abz).toFixed(1).padStart(5) : '    –'}  ${String(median(c.abzPkt)).padStart(5)}  ${c.abz ? Math.max(...c.abzPkt) : '–'}`); }
    L.push('', '## B  Vereinsfolgen 1995/96–2024/25 (Ebene damals, Reformjahre 2007/08, 2011/12 ausgelassen)', '');
    L.push('Ebene Region     Team-Saisons  Sturz ≥2 Ebenen (Fallhöhe)            weg (Liga darunter in Daten)   Meister  ohne Aufstieg');
    for (let lv = 1; lv <= 8; lv++) for (const reg of regs) { const c = B[lv + '|' + reg]; if (!c || !c.teams) continue;
        const fh = {}; c.sturzD.forEach(d => fh[d] = (fh[d] || 0) + 1);
        L.push(`E${lv}    ${reg.padEnd(10)} ${String(c.teams).padStart(8)}     ${String(c.sturz).padStart(4)} = ${pct(c.sturz, c.teams).padStart(7)} ${JSON.stringify(fh).padEnd(18)}`
            + `${String(c.weg).padStart(5)} = ${pct(c.weg, c.teams).padStart(7)}          ${String(c.meister).padStart(5)}  ${String(c.verzicht).padStart(4)} = ${pct(c.verzicht, c.meister)}`); }
    L.push('', 'Lesehilfe: Zahlen unter ~3 Fällen sind keine Aussage (CLAUDE.md). „weg“ enthält auch Datenlücken und Fusionen; „Sturz“ auch Doppelabstiege bei',
        'Ligareformen außerhalb der ausgelassenen Jahre; „ohne Aufstieg“ auch Meister, die nicht aufsteigen DURFTEN (Relegation verloren, Platz an Reserve gesperrt).');
    fs.writeFileSync(OUT + 'bericht.txt', L.join('\n') + '\n');
    fs.writeFileSync(OUT + 'beispiele.txt', ['# A Rückzüge (fussball.de)', ...bspA, '', '# B Sturz ≥ 2 Ebenen', ...bspB.sturz, '', '# B weg', ...bspB.weg, '', '# B Meister ohne Aufstieg', ...bspB.verzicht].join('\n') + '\n');
    console.log(L.join('\n'));
})();
