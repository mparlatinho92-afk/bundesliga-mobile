// Siegquoten der Relegation gegen die Zielwerte (Engine.RELE_KLASSE, Nutzer 15.11.2026: „Mischung aus Statistik und Plausibilität“):
// bl Erstligist bleibt ~72 %, zl Zweitligist bleibt ~37 %, rl (gleichklassig) ~50 %. Gemessen in echten Saisons (Duell in der Saison
// gespielt), Toleranz = 2,5 Standardfehler der Stichprobe (mindestens 5 Punkte).
//   node tools/relegation_quote_check.cjs [saisons=120]
//   node tools/relegation_quote_check.cjs 120 --kaputt    Gegenprobe: ohne Zuschlag → bl muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 120, KAPUTT = process.argv.includes('--kaputt');
Engine.init();
if (KAPUTT) Object.values(Engine.RELE_KLASSE).forEach(k => { k.plus = 0; });
const ZIEL = { bl: 0.72, zl: 0.37, rl: 0.5 }, st = {};
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const R = Engine.relegation;
    if (R && R.d) Object.entries(R.d).forEach(([k, d]) => { if (!d.winnerId) return; const a = st[k] = st[k] || [0, 0]; a[0]++; if (d.winnerId === d.hoch) a[1]++; });
    Engine.processSeasonTransition();
}
console.log = _log;
const fehler = [];
Object.entries(ZIEL).forEach(([k, z]) => {
    const [n, h] = st[k] || [0, 0], q = n ? h / n : 0, tol = Math.max(0.05, 2.5 * Math.sqrt(z * (1 - z) / Math.max(1, n)));
    const ok = n >= 30 && Math.abs(q - z) <= tol;
    console.log(`${ok ? '✓' : '✗'} ${k}: Höherer bleibt ${(100 * q).toFixed(1)} % (${h}/${n}), Ziel ${100 * z} % ± ${(100 * tol).toFixed(1)}`);
    if (!ok) fehler.push(k);
});
console.log((KAPUTT ? '[GEGENPROBE ohne Zuschlag] ' : '') + (fehler.length ? `BEFUND: ${fehler.join(', ')}` : 'Bestanden'));
process.exit(fehler.length ? 1 : 0);
