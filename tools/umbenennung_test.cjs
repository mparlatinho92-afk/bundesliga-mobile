// Namenswechsel mit Termin (game_data team.umbenannt, Engine._umbenennungen): SGV Freiberg → SGV Heilbronn-Freiberg ab 2026/27.
//   node tools/umbenennung_test.cjs              Start 2025/26 alter Name, nach dem Saisonwechsel neuer, alter als damaliger Name,
//                                                Speichern/Laden, neues Spiel im selben Tab wieder mit Startname
//   node tools/umbenennung_test.cjs --selbsttest  Saisonwechsel ohne _umbenennungen – muss durchfallen
// Engine.history liegt nicht im Hauptspielstand (Node hat keine IndexedDB): die Snapshot-Namen nach dem Laden prüft
// .claude/skills/run/umbenennung_check.mjs im Browser.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
let eng = fs.readFileSync(ROOT + 'game_engine.js', 'utf8');
if (SELBST) {
    const a = /this\.currentSeasonOffset\+\+;(\r?\n\s*)this\._umbenennungen\(\);/;   // game_engine.js hat CRLF
    if (!a.test(eng)) { console.log('SELBSTTEST: Anker fehlt'); process.exit(1); }
    eng = eng.replace(a, 'this.currentSeasonOffset++;$1');
}
['game_data.js', 'app/history_data.js'].forEach(f => eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
eval.call(global, eng.replace(/^const /gm, 'var '));
const ID = 'sgvfreiberg_910', ALT = 'SGV Freiberg', NEU = 'SGV Heilbronn-Freiberg';
const W_ALT = 'Wappen/Regionalliga Südwest/sgvfreiberg_910.png', W_NEU = 'Wappen/Regionalliga Südwest/sgvfreiberg_910_ab2026.png';
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const hn = y => { for (const e of HISTORIC_NAMES[ID] || []) { const sy = parseInt(y), f = e.from ? parseInt(e.from) : -Infinity, t = e.to ? parseInt(e.to) : Infinity; if (sy >= f && sy <= t) return e.name; } return null; };

Engine.init();
soll(Engine.getFormattedSeason() === '2025/26', `Start nicht 2025/26 (${Engine.getFormattedSeason()})`);
soll(Engine.teams[ID].name === ALT, `2025/26 heißt ${Engine.teams[ID].name}, erwartet ${ALT}`);
soll(GAME_DATA.teams[ID].name === ALT, `GAME_DATA 2025/26: ${GAME_DATA.teams[ID].name}`);
soll(Engine.teams[ID].thumb === W_ALT && GAME_DATA.teams[ID].thumb === W_ALT, `Wappen 2025/26: ${Engine.teams[ID].thumb}`);
soll(!hn('2024/25'), `2025/26: schon ein damaliger Name für 2024/25 (${hn('2024/25')})`);
Engine.simulateFullSeason(); Engine.processSeasonTransition();
soll(Engine.getFormattedSeason() === '2026/27', `nach Wechsel ${Engine.getFormattedSeason()}`);
soll(Engine.teams[ID].name === NEU, `2026/27 heißt ${Engine.teams[ID].name}, erwartet ${NEU}`);
soll(GAME_DATA.teams[ID].name === NEU, `GAME_DATA 2026/27: ${GAME_DATA.teams[ID].name}`);
soll(Engine.teams[ID].thumb === W_NEU && GAME_DATA.teams[ID].thumb === W_NEU, `Wappen 2026/27: ${Engine.teams[ID].thumb}`);
soll(hn('2025/26') === ALT && hn('1990/91') === ALT && hn('2026/27') === null, `damaliger Name falsch: 2025/26=${hn('2025/26')} 1990/91=${hn('1990/91')} 2026/27=${hn('2026/27')}`);
const snap = Engine.history[Engine.history.length - 1];
soll(snap.year === '2025/26' && snap.teams[ID] && snap.teams[ID].name === ALT && snap.teams[ID].thumb === W_ALT, `Saison-Snapshot 2025/26 trägt ${snap.teams[ID] && snap.teams[ID].name} / ${snap.teams[ID] && snap.teams[ID].thumb}`);
// Speichern + Laden in einem frischen Tab (GAME_DATA wieder im Auslieferungszustand)
Engine.saveGame();
GAME_DATA.teams[ID].name = ALT; delete GAME_DATA.teams[ID].name0; GAME_DATA.teams[ID].thumb = W_ALT; delete GAME_DATA.teams[ID].thumb0; HISTORIC_NAMES[ID] = (HISTORIC_NAMES[ID] || []).filter(e => !e.sim);
Engine.loadGame();
soll(Engine.getFormattedSeason() === '2026/27', `nach Laden ${Engine.getFormattedSeason()}`);
soll(Engine.teams[ID].name === NEU && Engine.teams[ID].thumb === W_NEU, `nach Laden 2026/27: ${Engine.teams[ID].name} / ${Engine.teams[ID].thumb}`);
soll(GAME_DATA.teams[ID].name === NEU && hn('2025/26') === ALT, `nach Laden GAME_DATA ${GAME_DATA.teams[ID].name}, damals ${hn('2025/26')}`);
// neues Spiel im selben Tab: wieder Startname, kein damaliger Name aus dem alten Stand (Speicher leer, sonst lädt init den Stand)
for (const k of Object.keys(store)) delete store[k];
Engine.init();
soll(Engine.getFormattedSeason() === '2025/26', `neues Spiel startet ${Engine.getFormattedSeason()}`);
soll(Engine.teams[ID].name === ALT && GAME_DATA.teams[ID].name === ALT && GAME_DATA.teams[ID].thumb === W_ALT && !hn('2024/25'), `neues Spiel: ${Engine.teams[ID].name} / ${GAME_DATA.teams[ID].name} / damals ${hn('2024/25')}`);

if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: ohne den Aufruf im Saisonwechsel ${befund.length} Befund(e).` : 'SELBSTTEST DURCHGEFALLEN'); befund.forEach(b => console.log('  ' + b)); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
