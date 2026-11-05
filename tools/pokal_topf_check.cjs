// DFB-Pokal: Teilnehmer und Lostöpfe gegen die echte Regel (Qualifizierungs-Saison = Vorsaison) prüfen.
// Echte Regel: 18 BL + 18 2.BL + Top 4 3. Liga der VORSAISON; Topf 1 = 18 BL + 14 bestplatzierte 2.BL der Vorsaison.
//   node tools/pokal_topf_check.cjs [saisons]
const fs = require('fs'), ROOT = __dirname + '/../';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f => eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
Engine.init(); Engine.fastMode = true;
const N = +(process.argv[2] || 3);
for (let i = 0; i < N; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
// seit v0.8.228.70 lost der Saisonwechsel selbst aus – NICHT nachhelfen, sonst misst die Prüfung den Zeitpunkt nicht mit
console.log("Auslosung aus Saison", Engine.pokal && Engine.pokal.y, Engine.pokal && Engine.pokal.y === Engine.getFormattedSeason() ? "OK" : "FEHL: veraltet");
const P = Engine.pokal, H = Engine.history[Engine.history.length - 1].teams;
const feld = new Set(); P.rounds[0].matches.forEach(m => { feld.add(m.hId); feld.add(m.aId); });
const nm = id => (Engine.teams[id] || {}).name || id;
const vor = id => H[id] ? `${H[id].leagueId}/${H[id].rank}` : '–';
const prev = lid => Object.keys(H).filter(id => H[id].leagueId === lid && !(Engine.teams[id] || {}).isReserve).sort((a, b) => H[a].rank - H[b].rank);
const soll = new Set([...prev('1'), ...prev('2'), ...prev('3').slice(0, 4)]);
const sollT1 = new Set([...prev('1'), ...prev('2').slice(0, 14)]);
console.log('Saison', Engine.getFormattedSeason ? Engine.getFormattedSeason() : '', '| Feld', feld.size);
console.log('Profis laut Regel, aber NICHT im Feld:', [...soll].filter(id => !feld.has(id)).map(id => `${nm(id)} (Vorsaison ${vor(id)}, jetzt ${Engine.teams[id]?.leagueId})`).join('; ') || '—');
console.log('Im Feld als Profi, laut Regel nicht:', [...feld].filter(id => ['BL', '2BL', '3L'].includes((P.entrants[id] || {}).type) && !soll.has(id)).map(id => `${nm(id)} (${P.entrants[id].type}, Vorsaison ${vor(id)})`).join('; ') || '—');
const t1 = [...feld].filter(id => (P.entrants[id] || {}).topf === 1);
console.log('Topf 1 laut Regel, aber in Topf 2:', [...sollT1].filter(id => feld.has(id) && !t1.includes(id)).map(id => `${nm(id)} (Vorsaison ${vor(id)})`).join('; ') || '—');
console.log('In Topf 1, laut Regel nicht:', t1.filter(id => !sollT1.has(id)).map(id => `${nm(id)} (Vorsaison ${vor(id)})`).join('; ') || '—');
