#!/usr/bin/env node
/*
 * sim_headless.cjs – Engine ohne Browser laufen lassen.
 *
 * Die Engine ist DOM-frei bis auf ein paar localStorage-/document-Zugriffe; die werden hier
 * geshimmt. Damit läuft eine Saison in ~0,5 s statt über Playwright – für Mehr-Saison-Analysen
 * (Ligagrößen, Auf-/Abstiegsbilanzen) ist das der schnelle Weg. Für alles, was DOM/Rendering
 * braucht (App.*, Layout, Mobilansicht), weiterhin die run-Skill mit Playwright benutzen.
 *
 *   node tools/sim_headless.cjs drift  [saisons] [laeufe]
 *   node tools/sim_headless.cjs trend  [saisons] [laeufe] <ligaId> [ligaId ...]
 *   node tools/sim_headless.cjs bands  [saisons] [laeufe] <ligaId> [ligaId ...]
 *
 *   drift  – alle Ligen: wer liegt wie oft ausserhalb seines min/max-Bandes
 *   trend  – waechst eine Liga ueber die Saisons oder pendelt sie? (Bucket-Mittel)
 *   bands  – Groessenverteilung + Anteil ausserhalb je Band-Variante
 *
 * WICHTIG vor jeder Band-Aenderung in game_data.js: erst "trend" ueber >=100 Saisons laufen
 * lassen. Eine breite Verteilung kann die Einlaufphase sein (Liga springt einmalig vom
 * Startwert auf ihr Niveau) – dann waere ein breiteres Band nur eine Vertagung. Erst wenn
 * "stabil, pendelt" herauskommt, ist die Verteilung aus "bands" die richtige Grundlage.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..') + path.sep;

// --- Browser-Shims: nur das, was die Engine wirklich anfasst ------------------
const _ls = {};
global.localStorage = {
    getItem: k => (k in _ls ? _ls[k] : null),
    setItem: (k, v) => { _ls[k] = String(v); },
    removeItem: k => { delete _ls[k]; }
};
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global;
global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };  // Save wird nicht ausgewertet
global.indexedDB = undefined;                                                // -> Chronik-Flush ist no-op

// Die Engine braucht GENAU diese drei Dateien (data_live.js/data_logic.js gibt es nicht mehr).
// const -> var, weil eval im globalen Scope sonst keine globalen Bindings erzeugt.
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

function freshRun() {
    Object.keys(_ls).forEach(k => delete _ls[k]);
    Engine.teams = {}; Engine.leagues = {}; Engine.amateurpokal = null;
    Engine.history = []; Engine.archive = null; Engine.currentSeasonOffset = 0;
    if (!Engine.init()) throw new Error('Engine.init() fehlgeschlagen');
}
const season = () => { Engine.simulateFullSeason(); Engine.processSeasonTransition(); };
const sizeOf = id => Object.values(Engine.teams).filter(t => t.leagueId === id).length;
const isBoden = id => !(Engine.DOWN_MAP[id] && Engine.DOWN_MAP[id].length) && Engine.leagues[id].level >= 5;

// --- drift: alle Ligen gegen ihr Band ----------------------------------------
function cmdDrift(N, RUNS) {
    const agg = {}, tails = [];
    for (let r = 0; r < RUNS; r++) {
        freshRun();
        const traj = [];
        for (let s = 0; s < N; s++) {
            season();
            let out = 0;
            for (const id in Engine.leagues) {
                const L = Engine.leagues[id], n = sizeOf(id);
                const a = agg[id] || (agg[id] = { name: L.name, level: L.level, min: L.min, max: L.max, target: L.target, boden: isBoden(id), sizes: [] });
                a.sizes.push(n);
                if ((L.min != null && n < L.min) || (L.max != null && n > L.max)) out++;
            }
            traj.push(out);
        }
        tails.push(traj.slice(-10).reduce((a, b) => a + b, 0) / 10);
        process.stderr.write(`Lauf ${r + 1}/${RUNS} fertig\n`);
    }
    const rows = Object.entries(agg).map(([id, a]) => {
        const n = a.sizes.length, avg = a.sizes.reduce((x, y) => x + y, 0) / n;
        const out = a.sizes.filter(v => v < a.min || v > a.max).length / n;
        const over = a.sizes.filter(v => v > a.max).length / n;
        return { id, ...a, avg, out, over };
    }).filter(r => r.out > 0.05).sort((x, y) => y.out - x.out);

    console.log(`\n${RUNS} Läufe à ${N} Saisons – Ligen mit >5 % Zeit ausserhalb ihres Bandes:\n`);
    console.log('Lvl Liga                                   Band    Ø      ausserhalb  Richtung');
    console.log('-'.repeat(82));
    rows.forEach(r => console.log(
        String(r.level).padStart(3) + ' ' + (r.name + (r.boden ? ' [Boden]' : '')).padEnd(38) + ' ' +
        `${r.min}-${r.max}`.padEnd(7) + r.avg.toFixed(1).padStart(5) + '  ' +
        (Math.round(r.out * 100) + '%').padStart(9) + '   ' +
        (r.over > r.out / 2 ? 'zu gross' : 'zu klein')));
    console.log('\nLigen ausserhalb, Ø letzte 10 Saisons je Lauf: ' + tails.map(t => t.toFixed(1)).join(', '));
    console.log('Hinweis: die Gesamtzahl schwankt stark zwischen Laeufen (Zufallsseed) – fuer');
    console.log('Vorher/Nachher-Vergleiche die Einzelliga-Werte nehmen, nicht die Summe.');
}

// --- trend: waechst sie oder pendelt sie? ------------------------------------
function cmdTrend(N, RUNS, ids) {
    const series = {}; ids.forEach(id => series[id] = []);
    for (let r = 0; r < RUNS; r++) {
        freshRun();
        const run = {}; ids.forEach(id => run[id] = []);
        for (let s = 0; s < N; s++) { season(); ids.forEach(id => run[id].push(sizeOf(id))); }
        ids.forEach(id => series[id].push(run[id]));
    }
    const B = Math.max(5, Math.round(N / 10));
    ids.forEach(id => {
        const L = Engine.leagues[id];
        console.log(`\n=== ${L.name}  Band ${L.min}-${L.max}, target ${L.target} ===`);
        console.log('Startgröße laut game_data: ' + Object.values(GAME_DATA.teams).filter(t => t.leagueId === id).length);
        const buckets = [];
        for (let b = 0; b * B < N; b++) {
            const v = []; series[id].forEach(run => v.push(...run.slice(b * B, (b + 1) * B)));
            buckets.push({ a: b * B + 1, b: Math.min((b + 1) * B, N), avg: v.reduce((x, y) => x + y, 0) / v.length });
        }
        buckets.forEach(x => console.log(`  S${String(x.a).padStart(3)}-${String(x.b).padStart(3)}: Ø ${x.avg.toFixed(1)}  ${'▪'.repeat(Math.round(x.avg))}`));
        const d = buckets[buckets.length - 1].avg - buckets[0].avg;
        console.log('  Trend: ' + (d > 1.5 ? 'WÄCHST WEITER – Band verbreitern vertagt nur!' : d < -1.5 ? 'SCHRUMPFT' : 'stabil, pendelt'));
        const tail = []; series[id].forEach(run => tail.push(...run.slice(Math.floor(N / 2))));
        const ts = [...tail].sort((a, b) => a - b);
        console.log(`  Eingeschwungen (2. Hälfte): Ø ${(tail.reduce((a, c) => a + c, 0) / tail.length).toFixed(1)}  Spanne ${ts[0]}-${ts[ts.length - 1]}`);
    });
}

// --- bands: Verteilung + Kandidaten-Bänder -----------------------------------
function cmdBands(N, RUNS, ids) {
    const sizes = {}; ids.forEach(id => sizes[id] = []);
    for (let r = 0; r < RUNS; r++) {
        freshRun();
        for (let s = 0; s < N; s++) { season(); ids.forEach(id => sizes[id].push(sizeOf(id))); }
    }
    ids.forEach(id => {
        const L = Engine.leagues[id], s = sizes[id], n = s.length;
        console.log(`\n=== ${L.name} (${id}, Level ${L.level}${isBoden(id) ? ', BODENLIGA' : ''}) ===`);
        console.log(`Ist-Band ${L.min}-${L.max}, target ${L.target}`);
        const hist = {}; s.forEach(v => hist[v] = (hist[v] || 0) + 1);
        const keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
        keys.forEach(k => console.log(`  ${String(k).padStart(2)}: ${String(hist[k]).padStart(4)}  ${'█'.repeat(Math.round(hist[k] / n * 60))}`));
        const sorted = [...s].sort((a, b) => a - b);
        const mode = keys.reduce((a, b) => hist[b] > hist[a] ? b : a);
        console.log(`Ø ${(s.reduce((a, b) => a + b, 0) / n).toFixed(1)}  Modus ${mode}  Spanne ${sorted[0]}-${sorted[n - 1]}`);
        console.log('Anteil ausserhalb je Band-Variante:');
        const seen = new Set(), cands = [[L.min, L.max]];
        for (let mn = Math.max(4, sorted[0] - 2); mn <= sorted[0] + 1; mn++)
            for (let mx = sorted[n - 1] - 2; mx <= sorted[n - 1] + 1; mx++) if (mx > mn) cands.push([mn, mx]);
        cands.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]) || a[0] - b[0]).forEach(([mn, mx]) => {
            const k = mn + '-' + mx; if (seen.has(k)) return; seen.add(k);
            const out = s.filter(v => v < mn || v > mx).length / n;
            console.log(`  ${String(mn).padStart(2)}-${String(mx).padStart(2)}: ${(out * 100).toFixed(1)}%${mn === L.min && mx === L.max ? '   <- Ist' : ''}`);
        });
    });
}

// --- CLI ---------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
const N = parseInt(rest[0] || '60', 10), RUNS = parseInt(rest[1] || '4', 10);
// Gegen GAME_DATA pruefen, nicht gegen Engine.leagues – das ist vor Engine.init() noch leer.
const ids = rest.slice(2).filter(id => {
    if (GAME_DATA.leagues[id]) return true;
    console.error('Unbekannte Liga-ID: ' + id); return false;
});
if (cmd === 'drift') cmdDrift(N, RUNS);
else if (cmd === 'trend' && ids.length) cmdTrend(N, RUNS, ids);
else if (cmd === 'bands' && ids.length) cmdBands(N, RUNS, ids);
else {
    console.log('node tools/sim_headless.cjs drift [saisons] [laeufe]');
    console.log('node tools/sim_headless.cjs trend [saisons] [laeufe] <ligaId> ...');
    console.log('node tools/sim_headless.cjs bands [saisons] [laeufe] <ligaId> ...');
    process.exit(1);
}
