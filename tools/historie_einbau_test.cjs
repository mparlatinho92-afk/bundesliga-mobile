// PRUEFUNG (Exit 1 bei Befund): historische Ligen Ebene 2-3 (app/history_ext.js + app/hist_ext.js) in Engine und Speicher.
//
//   node tools/historie_einbau_test.cjs              alle Pruefungen
//   node tools/historie_einbau_test.cjs --selbsttest dieselben Pruefungen gegen eine absichtlich kaputte Neufaltung
//                                                    (Abzug des alten Anteils fehlt) – MUSS durchfallen
//
// Headless wie tools/sim_headless.cjs; IndexedDB gibt es in Node nicht, also liefert IDBStore nur die Erweiterung –
// genau der Pfad, den die Mischung in app/idb_store.js abdecken muss.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');

global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const kopie = o => JSON.parse(JSON.stringify(o));

if (SELBST) {
    // Sabotage: alter Anteil der geteilten Ligen wird nicht abgezogen -> Neufaltung zaehlt doppelt
    const orig = Engine._foldHistExt;
    Engine._foldHistExt = function (A, x) { A.histExtSum = {}; return orig.call(this, A, x); };
}

(async () => {
    Engine.init();
    const A = Engine.archive;
    pruefe(A.histRemap === Object.keys(HIST_EXT.remap).sort().join(','), 'Umhaenge-Guard gesetzt');
    const lief = await Engine._seedHistoryExt();
    const x = HistExt.loaded();
    pruefe(!!x, 'Erweiterung entpackt');
    if (!x) return ende();

    // 1. Daten
    const recs = Object.values(x.byKey);
    const zeilen = recs.reduce((a, r) => a + r.rows.length, 0);
    pruefe(recs.length === 928 && zeilen === 16996, `928 Liga-Saisons / 16996 Zeilen (ist ${recs.length} / ${zeilen})`);
    const ohneName = new Set();
    recs.forEach(r => r.rows.forEach(z => { if (!GAME_DATA.teams[z.id] && !HISTORIC_CLUBS[z.id]) ohneName.add(z.id); }));
    pruefe(!ohneName.size, `jede ID hat einen Namen (${ohneName.size} ohne)`);
    const kaputt = recs.flatMap(r => r.rows).filter(z => ![z.s, z.u, z.n, z.gf, z.ga].every(Number.isFinite));
    pruefe(!kaputt.length, `S/U/N/Tore ueberall Zahlen (${kaputt.length} nicht)`);
    const falscheP2 = recs.flatMap(r => r.rows.filter(z => z.e && z.p2 && 2 * z.s + z.u !== z.p2[0]));
    pruefe(!falscheP2.length, `geschaetzte Zeilen treffen die amtlichen 2-Punkte-Werte (${falscheP2.length} daneben)`);

    // 2. Faltung
    pruefe(lief === true && A.histExtSeeded === HIST_EXT.version, 'Faltung gelaufen, Guard = Datenversion');
    const soll = {}; // lid -> Summe Spiele
    recs.forEach(r => r.rows.forEach(z => { soll[r.lid] = (soll[r.lid] || 0) + z.s + z.u + z.n; }));
    const ist = lid => Object.values(A.ewige[lid] || {}).reduce((a, e) => a + e.p, 0);
    const extLids = Object.keys(HIST_EXT.ligen);
    pruefe(extLids.every(l => ist(l) === soll[l]), 'Ewige Tabelle je historischer Liga = Summe der Tabellen');
    pruefe(ist('3') === soll['3'], `3. Liga: Vor-Sim-Start-Saisons in der Ewigen Tabelle (${ist('3')} / ${soll['3']} Spiele)`);
    const nan = Object.values(A.ewige).flatMap(E => Object.values(E)).filter(e => !['p', 'w', 'd', 'l', 'gf', 'ga', 'pts'].every(f => Number.isFinite(e[f])));
    pruefe(!nan.length, `keine NaN-Eintraege (${nan.length})`);
    pruefe(Object.values(A.ewige).every(E => !Object.keys(E).some(id => HIST_EXT.remap[id])), 'keine alte DDR-ID mehr in den Ewigen Tabellen');

    // 3. Neufaltung bei neuer Datenversion: gleiches Ergebnis, gespielte Saisons der geteilten Liga bleiben
    const vorher = kopie(A.ewige);
    A.ewige['3'].__gespielt = { name: 'X', years: 3, p: 114, w: 50, d: 30, l: 34, gf: 150, ga: 120, pts: 180, titles: 1, promotions: 0 };
    const ver = HIST_EXT.version; HIST_EXT.version = ver + '-neu';
    await Engine._seedHistoryExt();
    HIST_EXT.version = ver;
    const g = A.ewige['3'].__gespielt; delete A.ewige['3'].__gespielt;
    pruefe(g && g.p === 114 && g.years === 3, 'gespielte Saison der 3. Liga ueberlebt die Neufaltung');
    pruefe(JSON.stringify(A.ewige) === JSON.stringify(vorher), 'Neufaltung = erste Faltung (nichts doppelt, nichts verloren)');

    // 4. Umhaengen alter Spielstaende
    const alt = Object.keys(HIST_EXT.remap)[0], neu = HIST_EXT.remap[alt];
    const B = { ewige: { ddr1: { [alt]: { name: 'alt', years: 2, p: 60, w: 20, d: 20, l: 20, gf: 70, ga: 70, pts: 80, titles: 0, promotions: 0 } } }, champions: { ddr1: [{ y: '1950/51', id: alt }] }, relStats: {} };
    Engine._remapArchiveIds(B, HIST_EXT.remap);
    pruefe(!B.ewige.ddr1[alt] && B.ewige.ddr1[neu] && B.ewige.ddr1[neu].p === 60 && B.champions.ddr1[0].id === neu, `Altstand: ${alt} -> ${neu}`);

    // 5. Speicher-Lesefunktionen mischen die Erweiterung ein (ohne IndexedDB)
    const t = await IDBStore.getSeasonTable('1971/72', 'h3-mittelrhein-verbandsliga');
    pruefe(t && t.rows.length > 10, 'getSeasonTable liefert historische Tabelle');
    const all = await IDBStore.getSeasonAll('1985/86');
    pruefe(all['h3-hessen-oberliga'] && all['h2d-ddrliga-ddrliga'], 'getSeasonAll liefert alle Ligen einer Saison');
    const keys3 = await IDBStore.listSeasonKeys('3');
    pruefe(keys3.includes('2008/09') && keys3.includes('2024/25'), `3. Liga: Saisons 2008/09-2024/25 waehlbar (${keys3.length})`);
    const ch = await IDBStore.getChampions('h2d-ddrliga-ddrliga');
    const ch7172 = ch.filter(c => c.y === '1971/72').length;
    pruefe(ch7172 === 5, `DDR-Liga 1971/72: fuenf Staffelsieger (${ch7172})`);
    const sa = await IDBStore.getTeamSeasons('scherford_1261', ['h3-westfalen-verbandsliga', 'h3-westfalen-oberliga']);
    pruefe(sa.length >= 5, `SC Herford: Saisons in Westfalen gefunden (${sa.length})`);
    const vl = await IDBStore.getTeamVerlauf('scherford_1261', ['h3-westfalen-verbandsliga']);
    const staffel = vl.sizes['h3-westfalen-verbandsliga'] && vl.sizes['h3-westfalen-verbandsliga']['1975/76'];
    pruefe(staffel >= 16 && staffel <= 18, `Ligaverlauf zaehlt die eigene Staffel, nicht beide (1975/76: ${staffel})`);
    ende();
})().catch(e => { console.error(e); process.exit(2); });

function ende() {
    if (SELBST) {
        console.log(befunde.length ? `\nSelbsttest bestanden: die Sabotage wurde erkannt (${befunde.length} Befund(e)).` : '\nSELBSTTEST FEHLGESCHLAGEN: die Sabotage blieb unbemerkt.');
        process.exit(befunde.length ? 0 : 1);
    }
    console.log(befunde.length ? `\n${befunde.length} Befund(e).` : '\nAlles gruen.');
    process.exit(befunde.length ? 1 : 0);
}
