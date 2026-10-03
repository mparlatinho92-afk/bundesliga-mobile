/* Saisonkalender in der laufenden Simulation (headless, ohne Browser).
 *   node tools/kalender_sim_test.cjs [saisons=3]      Exit 1 bei Befund
 *   node tools/kalender_sim_test.cjs 3 --selbsttest   verdoppelt absichtlich einen Spieltag -> MUSS durchfallen
 *
 * Je Saison: jede Liga spielt jeden Spieltag genau einmal und in aufsteigender Reihenfolge, keine Liga
 * zweimal am selben Termin, alle Spiele der Saison stehen in seasonResults, DFB- und Amateurpokal
 * komplett gespielt, Winter-Testspiele erzeugt, Kalenderdaten stimmen mit schedule ueberein.
 * Dazu der Altstand: eine Saison mit kalV = 0 laeuft im Gleichschritt wie bisher.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/kalender_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +(process.argv[2] || 3), SELBST = process.argv.includes('--selbsttest');
Engine.init();
Engine.fastMode = true;
let befund = 0;
const fehl = m => { befund++; if (befund <= 12) console.log('  ✗ ' + m); };

function pruefeSaison() {
    const K = Engine.kalender, y = Engine.startYear + Engine.currentSeasonOffset;
    if (!K) { fehl(`${y}: kein Kalender`); return; }
    if (SELBST) {   // absichtlich kaputt: ein Spieltag doppelt
        const lid = Object.keys(K.liga)[0], t = K.liga[lid][3];
        Engine.schedule[t].push(...Engine.schedule[K.liga[lid][4]].filter(m => m.lid === lid));
    }
    // Plan-Struktur
    const proLiga = {};
    Object.entries(Engine.schedule).forEach(([t, ms]) => ms.forEach(m => {
        const L = (proLiga[m.lid] ||= {});
        (L[t] ||= new Set()).add(m.md);
    }));
    let ligen = 0;
    Object.entries(proLiga).forEach(([lid, byT]) => {
        ligen++;
        const n = Engine.leagues[lid].seasonLength, seen = [];
        Object.entries(byT).forEach(([t, mds]) => { if (mds.size !== 1) fehl(`${y} ${lid}: Termin ${t} mit ${mds.size} Spieltagen`); seen.push([+t, [...mds][0]]); });
        seen.sort((a, b) => a[0] - b[0]);
        if (seen.length !== n) fehl(`${y} ${lid}: ${seen.length} Termine fuer ${n} Spieltage`);
        seen.forEach(([t, md], i) => { if (md !== i + 1) fehl(`${y} ${lid}: Termin ${t} traegt Spieltag ${md}, erwartet ${i + 1}`); });
        if (JSON.stringify(seen.map(x => x[0])) !== JSON.stringify(K.liga[lid])) fehl(`${y} ${lid}: kalender.liga weicht von schedule ab`);
    });
    const erwartet = Object.values(Engine.schedule).reduce((s, ms) => s + ms.length, 0);
    const vorher = Engine.seasonResults.length;
    // spielen
    while (Engine.currentMatchday < Engine.totalMatchdays) Engine.playNextMatchday();
    const gespielt = Engine.seasonResults.length - vorher;
    if (gespielt !== erwartet) fehl(`${y}: ${gespielt} Ergebnisse, ${erwartet} Spiele im Plan`);
    const pk = Engine.pokal ? Engine.pokal.rounds.filter(r => r.played).length : 0;
    if (pk !== 6) fehl(`${y}: DFB-Pokal ${pk}/6 Runden gespielt`);
    const ap = Engine.amateurpokal ? Engine.amateurpokal.rounds.filter(r => r.played).length : 0;
    if (Engine.amateurpokal && ap !== Engine.amateurpokal.rounds.length) fehl(`${y}: Amateurpokal ${ap}/${Engine.amateurpokal.rounds.length}`);
    if (!Engine.friendliesGenerated('winter', Engine.getFormattedSeason())) fehl(`${y}: keine Winter-Testspiele`);
    const mw = K.slots.filter(a => new Date(a + 'T12:00').getDay() === 3).length;
    console.log(`${y}/${String(y + 1).slice(2)}: ${K.slots.length} Termine (${mw} Mi), ${ligen} Ligen, ${gespielt} Spiele, ` +
        `Pokal ${pk}/6, Amateurpokal ${ap}, ${K.slots[0]} bis ${K.slots[K.slots.length - 1]}`);
}

for (let i = 0; i < N; i++) { pruefeSaison(); Engine.processSeasonTransition(); }

// Altstand: Kalender aus, Saison im Gleichschritt
Engine.kalV = 0; Engine.seasonSeed = 12345; Engine.currentMatchday = 0; Engine.generateSchedule();
const alt = Engine.kalender === null && Engine.totalMatchdays === Math.max(...Object.values(Engine.leagues).map(l => l.seasonLength || 0));
if (!alt) fehl('Altstand: kein Gleichschritt nach kalV = 0');
else console.log(`Altstand: Gleichschritt mit ${Engine.totalMatchdays} Runden`);

console.log(befund ? `\nBEFUND: ${befund}` : '\nalles gruen');
if (SELBST) console.log(befund ? '(Selbsttest: korrekt durchgefallen)' : '(Selbsttest: NICHT durchgefallen – Pruefung misst nichts!)');
process.exit(SELBST ? (befund ? 0 : 1) : (befund ? 1 : 0));
