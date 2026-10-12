/* Gibt es DYNASTIEN wie in echt? Titelkonzentration der Bundesliga, Engine gegen HISTORY_SEED.
 *
 *   node tools/dynastie_check.cjs [saisons] [KEY=VALUE ...]      z. B.  node tools/dynastie_check.cjs 186 STR_GED_TITEL=0.5
 *
 * Echte Vergleichsgroesse: die 62 Bundesliga-Saisons 1963/64-2024/25 (HISTORY_SEED). Die Engine wird in Fenstern zu je
 * 62 Saisons gemessen (186 Saisons = 3 Fenster), damit beide Seiten gleich lang sind:
 *   - Titel des erfolgreichsten Vereins im Fenster   (echt: Bayern 33)
 *   - verschiedene Meister im Fenster                (echt 12)
 *   - laengste Titelserie                            (echt 11)
 *   - Anteil der Titel, die an die drei Erfolgreichsten gehen
 * Dazu Meisterpunkte und - fuer den Start - wie oft Bayern in den ersten 20 Saisons Meister wird (echt die letzten
 * 20 Saisons: 16). Ein Lauf streut stark - je Einstellung mehrere Laeufe.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..') + path.sep;
const _ls = {};
global.localStorage = { getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global; global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s }; global.indexedDB = undefined;
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const N = parseInt(process.argv[2] || '186', 10), FEN = 62;
process.argv.slice(3).forEach(arg => {
    const m = arg.match(/^([A-Z0-9_]+)=(-?[\d.]+)$/);
    if (!m || !(m[1] in Engine)) { console.error('Unbrauchbar: ' + arg); process.exit(1); }
    Engine[m[1]] = +m[2];
});

function kennzahlen(folge) {                       // folge: Meister-IDs chronologisch
    const c = {}; folge.forEach(id => c[id] = (c[id] || 0) + 1);
    const t = Object.values(c).sort((a, b) => b - a);
    let best = 0, cur = 0; folge.forEach((id, i) => { cur = i && folge[i - 1] === id ? cur + 1 : 1; best = Math.max(best, cur); });
    return { top: t[0], versch: t.length, serie: best, top3: (t[0] + (t[1] || 0) + (t[2] || 0)) / folge.length };
}
const echt = HISTORY_SEED.seasons.filter(s => s.lid === '1').sort((a, b) => parseInt(a.y) - parseInt(b.y))
    .map(s => (s.table.find(r => r.rank === 1) || {}).id);
const E = kennzahlen(echt);

Engine._groesse = null; Engine._ortCache = null;
Engine.init(); Engine.fastMode = true;
const folge = [], pkt = [];
const t0 = Date.now();
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason(); Engine.sortTables();
    const l1 = Object.values(Engine.teams).filter(t => t.leagueId === '1').sort((a, b) => (a.rank || 99) - (b.rank || 99));
    folge.push(l1[0].id); pkt.push(l1[0].stats.pts);
    Engine.processSeasonTransition();
}
const nm = id => (GAME_DATA.teams[id] || {}).name || id;
const knoepfe = Object.keys(Engine).filter(k => /^STR_(GED|AERA)/.test(k)).map(k => k + '=' + Engine[k]).join(' ');
console.log(`\n${N} Saisons (${((Date.now() - t0) / 1000).toFixed(0)} s)  ${knoepfe}`);
console.log(`echt 1963-2025 (${echt.length}):  Top ${E.top}  verschiedene ${E.versch}  Serie ${E.serie}  Top-3-Anteil ${(100 * E.top3).toFixed(0)} %`);
const fen = [];
for (let i = 0; i + FEN <= folge.length; i += FEN) {
    const f = folge.slice(i, i + FEN), k = kennzahlen(f); fen.push(k);
    const c = {}; f.forEach(id => c[id] = (c[id] || 0) + 1);
    const wer = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${nm(id)} ${n}`).join(', ');
    console.log(`Fenster ${i + 1}-${i + FEN}:  Top ${k.top}  verschiedene ${k.versch}  Serie ${k.serie}  Top-3-Anteil ${(100 * k.top3).toFixed(0)} %   (${wer})`);
}
const m = k => (fen.reduce((a, f) => a + f[k], 0) / fen.length);
console.log(`Mittel:  Top ${m('top').toFixed(1)}  verschiedene ${m('versch').toFixed(1)}  Serie ${m('serie').toFixed(1)}  Top-3-Anteil ${(100 * m('top3')).toFixed(0)} %`);
console.log(`Meister Ø ${(pkt.reduce((a, b) => a + b, 0) / pkt.length).toFixed(1)} Punkte (echt ~72)   Bayern-Titel in den ersten 20: ${folge.slice(0, 20).filter(id => id === 'fcbayernmuenchen_0').length} (echt letzte 20: 16)`);
