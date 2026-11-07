// Zeilen ohne Spiele zählen als Jahr (v0.8.228.75) – Prüfung gegen Wikipedia und gegen den Spielstand-Nachlauf.
//   RWE 2. Bundesliga: 16 Jahre, 562 Spiele · Türkgücü München 3. Liga: 2 Jahre, 38 Spiele (Ewige Tabellen, abgerufen 07.11.2026)
//   Titel: Zeilen ohne Spiele bekommen keinen Titel (Summe aller Titel = Zahl der Meisterzeilen MIT Spielen)
//   Alter Spielstand (seedNullJahr fehlt, Saison schon gefaltet): RWE bekommt das Jahr genau einmal nach, ein zweiter Lauf ändert nichts
// Aufruf: node tools/nulljahr_check.cjs   (Exit 1 = Befund). Gegenprobe: gegen den Stand vor v0.8.228.75 fallen RWE + Türkgücü durch.
const fs = require('fs');
const ROOT = __dirname + '/../';
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const befund = [];
const soll = (was, ist, s) => { const ok = ist === s; console.log(`${ok ? '✓' : '✗'} ${was}: ${ist}${ok ? '' : ' statt ' + s}`); if (!ok) befund.push(was); };
(async () => {
    Engine.init();
    await Engine._seedHistoryExt();
    const A = Engine.archive, ew = A.ewige;
    const rwe = ew['2'].rotweissessen_1127, tg = ew['3'].tuerkguecuemuenchen_20;
    soll('RWE 2. Bundesliga Jahre', rwe.years, 16); soll('RWE 2. Bundesliga Spiele', rwe.p, 562);
    soll('Türkgücü 3. Liga Jahre', tg.years, 2); soll('Türkgücü 3. Liga Spiele', tg.p, 38);
    // Titel: Meisterzeilen mit Spielen (Seed + Erweiterung, Erweiterung auch bei der Nachfolgerin)
    const x = HistExt.loaded(), NF = HIST_EXT.ligaNachfolger || {};
    let meisterZeilen = 0, nullMeister = 0;
    HISTORY_SEED.seasons.forEach(s => s.table.forEach(r => { if (r.rank === 1) { if (r.s + r.u + r.n) meisterZeilen++; else nullMeister++; } }));
    for (const lid in x.byLid) for (const rec of x.byLid[lid]) for (const r of rec.rows) if (r.rank === 1) {
        const vr = (rec.vr || []).flatMap(v => v.rows).find(q => q.id === r.id), sp = r.s + r.u + r.n + (vr && !rec.kumS ? vr.s + vr.u + vr.n : 0);
        if (sp) meisterZeilen += NF[lid] ? 2 : 1; else nullMeister++;
    }
    let titel = 0; for (const l in ew) for (const id in ew[l]) titel += ew[l][id].titles || 0;
    soll(`Titel gesamt (= Meisterzeilen mit Spielen; ${nullMeister} Platz-1-Zeilen ohne Spiele)`, titel, meisterZeilen);
    // alter Spielstand: Jahr fehlt, Guard fehlt -> genau einmal nachholen
    rwe.years--; delete A.seedNullJahr;
    Engine._seedHistory();
    soll('Nachlauf alter Spielstand: RWE Jahre', ew['2'].rotweissessen_1127.years, 16);
    Engine._seedHistory();
    soll('zweiter Lauf ändert nichts: RWE Jahre', ew['2'].rotweissessen_1127.years, 16);
    soll('Nachlauf ändert keine Spiele: RWE Spiele', ew['2'].rotweissessen_1127.p, 562);
    console.log(befund.length ? `\n${befund.length} Befund(e)` : '\nalles grün');
    process.exit(befund.length ? 1 : 0);
})();
