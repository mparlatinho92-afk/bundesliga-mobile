// Gleichheitsprobe für Tempo-Umbauten an der Engine (28.10.2026, Mega-Sim 534 -> 92 ms/Saison bei gleichem Ergebnis):
// fester Zufall (mulberry32) + feste Uhr, N Saisons im fastMode, Fingerabdruck aus Ligen/Rängen/Archiv/Rekorden.
//   git show HEAD:game_engine.js > %TEMP%/engine_vorher.js
//   node tools/tempo_gleichheit.cjs %TEMP%/engine_vorher.js 30   und   node tools/tempo_gleichheit.cjs game_engine.js 30
// Beide Fingerabdrücke müssen gleich sein. Gegenprobe: eine Sortierung im Saisonwechsel umdrehen -> anderer Abdruck.
// Achtung: Zweige, die in N Saisons nie laufen (z. B. letzter findTarget-Rückfall), deckt die Probe nicht ab.
const fs = require('fs'), crypto = require('crypto'), ROOT = require('path').join(__dirname, '..') + '/';
let s = 12345;
Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: x => x, decompressFromUTF16: x => x };
const eng = process.argv[2] || ROOT + 'game_engine.js', N = +process.argv[3] || 8;
['game_data.js', 'app/history_data.js'].forEach(f => require('vm').runInThisContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), { filename: f }));
require('vm').runInThisContext(fs.readFileSync(eng, 'utf8').replace(/^const /gm, 'var '), { filename: 'game_engine.js' });
const realNow = Date.now; Date.now = () => 1700000000000;   // Zeitstempel in IDs gleich halten
Engine.init();
Engine.fastMode = true;
const t0 = realNow();
for (let i = 0; i < N; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
const ms = Math.round((realNow() - t0) / N);
const teams = Object.values(Engine.teams).map(t => [t.id, t.leagueId, t.rank, t.berlinHome || '', t.homeStaffel || '']).sort();
const fp = crypto.createHash('sha1').update(JSON.stringify([teams, Engine.archive.champions, Engine.archive.ewige, Engine.archive.records, Engine.history.map(h => h.year)])).digest('hex');
console.log(`${fp} | ${N} Saisons | ${ms} ms/Saison`);
