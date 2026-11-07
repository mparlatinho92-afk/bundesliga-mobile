// Ligazugehörigkeit im Steckbrief: Summe der Saisons je Verein gegen die Zahl VERSCHIEDENER Saisons in den Daten.
// _foldHistExt zählt eine Saison einer historischen Liga zusätzlich bei der heutigen Nachfolgerin (ligaNachfolger) –
// wer über alle Ewigen Tabellen summiert, zählt sie doppelt. Geprüft wird die echte App._ewigeEigen aus app/modal.js.
// Aufruf: node tools/ligazugehoerigkeit_check.cjs [--roh]   (--roh = Gegenprobe: rohe Summe, muss durchfallen)
const fs = require('fs');
const ROOT = __dirname + '/../';
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null, querySelector: () => null, addEventListener: () => {} };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
global.App = {};
(0, eval)(fs.readFileSync(ROOT + 'app/modal.js', 'utf8').replace(/^const /gm, 'var '));
const ROH = process.argv.includes('--roh');
(async () => {
    Engine.init();
    await Engine._seedHistoryExt();
    const ew = Engine.archive.ewige, x = HistExt.loaded();
    const RM = HistExt.remap ? HistExt.remap() : {};
    // verschiedene Saisons je Verein: historische Ligen (byLid) + Seed, auch Zeilen ohne Spiele (zählen seit v0.8.228.75 als Jahr)
    const saisons = {};
    const add = (id, y) => { (saisons[id] = saisons[id] || new Set()).add(parseInt(y)); };
    for (const lid in x.byLid) for (const rec of x.byLid[lid]) for (const r of rec.rows) add(r.id, rec.y);
    // Zeilen ohne Spiele (Rückzug/Lizenzentzug, z. B. RWE 1993/94) zählen seit v0.8.228.75 als Jahr – hier genauso
    (HISTORY_SEED.seasons || []).forEach(s => (s.table || s.rows || []).forEach(r => add(RM[r.id] || r.id, s.y)));
    const ids = new Set(); for (const l in ew) for (const id in ew[l]) ids.add(id);
    let weniger = 0, falsch = 0, gesamt = 0, titelDoppelt = 0; const bsp = [];
    for (const id of ids) {
        const e = ROH ? Object.fromEntries(Object.keys(ew).filter(l => ew[l][id]).map(l => [l, ew[l][id]])) : App._ewigeEigen(ew, id);
        const jahre = Object.values(e).reduce((a, v) => a + (v.years || 0), 0);
        const soll = saisons[id] ? saisons[id].size : null;
        if (soll === null) continue;
        gesamt++;
        if (jahre < soll) weniger++;
        if (jahre > soll) { falsch++; if (bsp.length < 8) bsp.push(`${id} ${jahre} statt ${soll}`); }
    }
    const pr = id => { const e = ROH ? Object.fromEntries(Object.keys(ew).filter(l => ew[l][id]).map(l => [l, ew[l][id]])) : App._ewigeEigen(ew, id);
        return Object.entries(e).map(([l, v]) => l + ':' + v.years + (v.titles ? '/T' + v.titles : '')).join(' '); };
    console.log('Rapid Chemnitz     ', pr('rapidchemnitz_886'));
    console.log('Altchemnitzer BSC  ', pr('hist_fa_altchemnitzerbsc'));
    console.log(`${ROH ? 'ROH (Gegenprobe)' : 'App._ewigeEigen'}: ${gesamt} Vereine geprüft, ${falsch} mit mehr Saisons als in den Daten, ${weniger} mit weniger`);
    bsp.forEach(b => console.log('   ', b));
    process.exit(falsch ? 1 : 0);
})();
