// PRUEFUNG (Exit 1 bei Befund): Abschlusstabellen Ebene 5-8 aus fussball.de (tools/fbde_ebene58.mjs -> app/history_ext.js)
// in Engine, Ewiger Tabelle und Rekorden, samt Schalter "fruehere Ebenen dazuzaehlen" (Saisons mit fe).
//
//   node tools/fbde_einbau_test.cjs              alle Pruefungen
//   node tools/fbde_einbau_test.cjs --selbsttest Nachlauf der Rekorde und fe-Anteil der Ewigen Tabelle stillgelegt – MUSS durchfallen
//
// Headless wie tools/historie_einbau_test.cjs (IndexedDB fehlt in Node, IDBStore liefert nur die Erweiterung).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');

global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
global.App = {};
(0, eval)(fs.readFileSync(ROOT + 'app/records.js', 'utf8'));

const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const id = name => Object.keys(GAME_DATA.teams).find(k => GAME_DATA.teams[k].name === name);
const warte = ms => new Promise(r => setTimeout(r, ms));

if (SELBST) {
    Engine._recordHistExtNachlauf = () => {};
    const orig = Engine._foldHistExt;
    Engine._foldHistExt = function (A, x) { orig.call(this, A, x); A.histExtFe = {}; };
}

(async () => {
    Engine.init();
    await Engine._seedHistoryExt();
    const x = HistExt.loaded(), A = Engine.archive;
    pruefe(!!x, 'Erweiterung entpackt');
    if (!x) return ende();

    // 1. Daten: fussball.de-Saisons unter den heutigen Liga-IDs, mit Kennungen
    const bei = (y, lid) => x.byKey[y + '|' + lid];
    const s05 = bei('2005/06', '6-24'), s15 = bei('2015/16', '6-24'), s20 = bei('2020/21', '6-24');
    pruefe(!!s05 && !!s15, 'Sachsenliga 2005/06 und 2015/16 vorhanden');
    pruefe(s05 && s05.fe === true, 'Sachsenliga 2005/06 = fruehere Ebene (damals Ebene 5)');
    pruefe(s15 && !s15.fe, 'Sachsenliga 2015/16 ohne fe (heutige Ebene)');
    pruefe(s20 && s20.an === true, 'Saison 2020/21 als annulliert gekennzeichnet');
    const lids58 = new Set(Object.values(x.byKey).filter(r => GAME_DATA.leagues[r.lid] && GAME_DATA.leagues[r.lid].level >= 6).map(r => r.lid));
    pruefe(lids58.size >= 40, `Spiel-Ligen der Ebenen 6-8 mit Saisons vor dem Sim-Start: ${lids58.size} (vorher 0)`);
    const zwick = id('FSV Zwickau');
    pruefe(s05 && s05.rows[0].id === zwick && s05.rows[0].rank === 1, 'Meister Sachsenliga 2005/06 = FSV Zwickau (Spielverein)');
    const ueberall = Object.values(x.byKey).flatMap(r => r.rows.concat((r.vr || []).flatMap(v => v.rows)));
    const ohneName = new Set(ueberall.filter(r => !GAME_DATA.teams[r.id] && !HISTORIC_CLUBS[r.id]).map(r => r.id));
    pruefe(!ohneName.size, `jede ID hat einen Namen (${ohneName.size} ohne)`);

    // 2. Ewige Tabelle: fe-Anteil getrennt gemerkt, Schalter rechnet ihn heraus
    const fe = A.histExtFe && A.histExtFe['6-24'];
    pruefe(!!fe && fe[zwick] && fe[zwick].years >= 1 && fe[zwick].titles >= 1, `fe-Anteil Sachsenliga: Zwickau ${fe && fe[zwick] ? fe[zwick].years + ' Saisons, ' + fe[zwick].titles + ' Titel' : 'fehlt'}`);
    const ew = A.ewige['6-24'] || {}, feIds = Object.keys(fe || {});
    const beide = feIds.filter(k => ew[k] && ew[k].years > fe[k].years).length, zuViel = feIds.filter(k => !ew[k] || ew[k].years < fe[k].years);
    pruefe(feIds.length && beide > 0 && !zuViel.length, `Ewige Tabelle enthaelt beide Anteile (${beide} Vereine mit Saisons vor und nach 2008, ${zuViel.length} mit fe-Anteil groesser als Summe)`);
    const w10 = A.histExtFe && A.histExtFe['5-10'] && Object.keys(A.histExtFe['5-10']).length;
    pruefe(w10 > 0, `Vorgaenger auf anderer Ebene zaehlen als fruehere Ebene (Oberliga Westfalen bis 2008 unter 5-10: ${w10 || 0} Vereine)`);

    // 3. Rekorde: Nachlauf trennt fe-Saisons in records.fe
    const R = Engine._recStore();
    for (let i = 0; i < 300 && !(R && R.bfH === HIST_EXT.version); i++) await warte(50);
    pruefe(R && R.bfH === HIST_EXT.version, 'Rekord-Nachlauf gelaufen (Guard bfH = Datenversion)');
    const rk = R && R.fe && R.fe.t[zwick] && R.fe.t[zwick].L && R.fe.t[zwick].L['6-24'] && R.fe.t[zwick].L['6-24'].rk;
    pruefe(rk && rk[0] === 1, `fruehere Ebene: Zwickau Meister der Sachsenliga in records.fe (${JSON.stringify(rk)})`);
    const haupt = R && R.t[zwick] && R.t[zwick].L && R.t[zwick].L['6-24'];
    pruefe(!haupt || !haupt.rk || parseInt(haupt.rk[1]) >= 2008, `Hauptspeicher ohne fe-Saisons (Zwickau Sachsenliga rk ${JSON.stringify(haupt && haupt.rk)})`);
    pruefe(!!(R && R.l['6-24'] && R.l['6-24'].cPts), 'Liga-Rekorde Sachsenliga aus den Saisons ab 2008 vorhanden');
    // keine fe-Saison darf im Hauptspeicher einen Liga-Rekord stellen
    const feJahre = new Set(Object.values(x.byKey).filter(r => r.fe).map(r => r.y + '|' + r.lid));
    const leck = [];
    for (const lid in (R ? R.l : {})) for (const k of ['cPts', 'cPtsL', 'lead', 'gfS']) { const c = R.l[lid][k]; if (c && feJahre.has(c[1] + '|' + lid)) leck.push(lid + ' ' + k + ' ' + c[1]); }
    pruefe(!leck.length, `kein Liga-Rekord aus frueherer Ebene im Hauptspeicher (${leck.slice(0, 4).join(', ') || '-'})`);

    // 3b. Unvollstaendige Saisons (abgebrochen/annulliert/Doppelsaison) stellen keinen Zaehlrekord, nur die Alternative je Spiel
    const uv = new Set(Object.values(x.byKey).filter(r => r.abbruch || r.an || r.doppel).map(r => r.y + '|' + r.lid));
    const mini = [];
    for (const lid in (R ? R.l : {})) for (const k of ['cPts', 'cPtsL', 'lead', 'gfS']) { const c = R.l[lid][k]; if (c && uv.has(c[1] + '|' + lid)) mini.push(lid + ' ' + k + ' ' + c[1]); }
    for (const tid in (R ? R.t : {})) { const o = R.t[tid];
        for (const k of ['pts', 'ptsL', 'ppg', 'w', 'gf', 'ga', 'dif']) { const c = o[k]; if (c && uv.has(c[1] + '|' + c[2])) mini.push(tid + ' ' + k + ' ' + c[1]); }
        for (const lid in (o.L || {})) for (const k of ['pts', 'ppg', 'w', 'gf', 'ga']) { const c = o.L[lid][k]; if (c && uv.has(c[1] + '|' + lid)) mini.push(tid + ' L' + lid + ' ' + k + ' ' + c[1]); } }
    pruefe(uv.size > 50 && !mini.length, `kein Zaehlrekord aus ${uv.size} unvollstaendigen Saisons (${mini.length}: ${mini.slice(0, 3).join(', ') || '-'})`);
    const sq = R && R.l['6-24'] && R.l['6-24'].q && R.l['6-24'].q.cPtsL, sl = R && R.l['6-24'] && R.l['6-24'].cPtsL;
    pruefe(sl && !uv.has(sl[1] + '|6-24') && sq && uv.has(sq[1] + '|6-24') && /^[and]$/.test(sq[sq.length - 1]),`Sachsenliga: wenigste Meisterpunkte ${JSON.stringify(sl)}, Alternative je Spiel ${JSON.stringify(sq)}`);
    const zeigt = App._recQ([30, '2015/16', 'x', 30], 3, [0.5, '2020/21', 'x', 7, 'n'], -1, 'Pkt', ''), still = App._recQ([30, '2015/16', 'x', 30], 3, [2.7, '2020/21', 'x', 7, 'n'], -1, 'Pkt', '');
    pruefe(/annullierte Saison 2020\/21: 0,50 Pkt je Spiel \(7 Spiele\)/.test(zeigt) && still === '', `Alternative nur, wenn sie je Spiel besser ist ("${zeigt}" / "${still}")`);

    // 4. Anzeige-Mischung: Schalter an = besserer Wert gewinnt, aus = nur Hauptspeicher
    store.ba_fe_zaehlen = '1';
    const an = App._recFeMisch({ pts: [50, '2015/16', 30] }, { pts: [70, '2005/06', 30] }, App._REC_DIR_L);
    store.ba_fe_zaehlen = '0';
    const aus = App._recFeMisch({ pts: [50, '2015/16', 30] }, { pts: [70, '2005/06', 30] }, App._REC_DIR_L);
    pruefe(an.pts[0] === 70 && an._fe.pts && aus.pts[0] === 50, 'Schalter: an mischt fruehere Ebene ein (70), aus nicht (50)');
    delete store.ba_fe_zaehlen;
    pruefe(App._feZaehlen() === true, 'Standard: fruehere Ebenen werden dazugezaehlt');
    ende();
})();

function ende() {
    if (befunde.length) { console.log(`\nBEFUND (${befunde.length})`); process.exit(1); }
    console.log('\nOK');
    process.exit(0);
}
