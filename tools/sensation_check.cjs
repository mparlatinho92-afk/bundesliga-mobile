/* PRUEFUNG: Der Aussenseiter muss IMMER gewinnen koennen. Nie 0 %.
 *
 *   node tools/sensation_check.cjs [ziehungen] [GOAL_X=wert ...]
 *   node tools/sensation_check.cjs --selbsttest      # Gegenprobe: kann die Pruefung durchfallen?
 *
 * Exit 1 = Befund (irgendeine Paarung ohne einen einzigen Sieg des Aussenseiters).
 *
 * WARUM ALS PRUEFUNG UND NICHT NUR ALS BERICHT: sobald ein Ergebnis strukturell unmoeglich ist,
 * ist der Wettbewerb an dieser Stelle entschieden, bevor er gespielt wird. Derselbe Fehler eine
 * Ebene tiefer war der frueher gesetzte Cap 9 im Pokal - jedes hoehere Ergebnis wurde auf exakt
 * 9 gestaucht, und nach 500 Saisons stand in jedem Spielstand dasselbe 9:0.
 *
 * ABGRENZUNG ZU tools/pokal_effekt.cjs: dort stehen hinter "0,0 % Sensationen" oft nur 20-30
 * gespielte Partien - das ist eine STICHPROBEN-Null. Hier wird simulateKnockoutMatch direkt
 * hunderttausendfach gezogen, damit sich beides unterscheiden laesst.
 *
 * Staerke je Ebene = 109 - 10*level (calculateStrengths). NOISE je Runde: [16,16,12,12,9,9] -
 * die erste Runde hat den meisten Zufall, und dort trifft der Klassenunterschied auch zu.
 * Heimrecht hat bis zum Achtelfinale der Unterklassige (s. game_engine.js Zeile ~494).
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..') + path.sep;
const _ls = {};
global.localStorage = { getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global;
global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.indexedDB = undefined;
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const args = process.argv.slice(2);
const selbsttest = args.includes('--selbsttest');
const N = parseInt(args.find(a => /^\d+$/.test(a)) || (selbsttest ? '20000' : '200000'), 10);
args.filter(a => a.startsWith('GOAL_')).forEach(arg => {
    const m = arg.match(/^(GOAL_[A-Z_]+)=(-?[\d.]+)$/);
    if (!m) { console.error('Unbrauchbares Argument: ' + arg); process.exit(1); }
    if (!(m[1] in Engine)) { console.error('Unbekannte Konstante: ' + m[1]); process.exit(1); }
    Engine[m[1]] = +m[2];
});
Engine.init();

// Gegenprobe: ein Sampler, bei dem der Aussenseiter NIE gewinnt. Die Pruefung MUSS hier anschlagen -
// sonst misst sie etwas anderes als gedacht.
if (selbsttest) {
    Engine.simulateKnockoutMatch = function(h, a) {
        return { score1: 3, score2: 0, decided: 'reg', winner: 'h' };   // immer das Heimteam
    };
}

const staerke = lvl => 109 - 10 * lvl;
const zieh = (lvlFav, lvlAus, noise, ausHeim) => {
    const fav = { strength: staerke(lvlFav) }, aus = { strength: staerke(lvlAus) };
    let siege = 0, maxAus = 0, ausTore = 0;
    for (let i = 0; i < N; i++) {
        // Im Selbsttest ist 'h' immer Sieger -> Aussenseiter mit Heimrecht wuerde gewinnen.
        // Deshalb hier bewusst der Favorit daheim, damit die Gegenprobe eine echte Null erzeugt.
        const r = (ausHeim && !selbsttest) ? Engine.simulateKnockoutMatch(aus, fav, noise)
                                           : Engine.simulateKnockoutMatch(fav, aus, noise);
        const heimIstAus = ausHeim && !selbsttest;
        if (heimIstAus ? r.winner === 'h' : r.winner === 'a') siege++;
        const gAus = heimIstAus ? r.score1 : r.score2;
        ausTore += gAus; if (gAus > maxAus) maxAus = gAus;
    }
    return { p: siege / N * 100, n: siege, maxAus, oeAus: ausTore / N };
};

const befunde = [];
const zeile = (fav, aus, noise, ausHeim, label) => {
    const r = zieh(fav, aus, noise, ausHeim);
    if (r.n === 0) befunde.push(`Ebene ${fav} gegen Ebene ${aus} (${label}): 0 Siege in ${N} Ziehungen`);
    console.log(`${('Ebene ' + fav).padStart(7)} | ${('Ebene ' + aus).padStart(12)} | ${String(aus - fav).padStart(7)} | `
        + `${r.p.toFixed(3).padStart(8)} % | ${String(r.n).padStart(9)} |            ${r.oeAus.toFixed(2)} | ${r.maxAus}`);
};

console.log(`\n${N.toLocaleString('de-DE')} Ziehungen je Paarung${selbsttest ? '  [SELBSTTEST: Sampler bewusst kaputt]' : ''}\n`);
console.log('--- 1. Runde (noise 16), Aussenseiter mit Heimrecht ---');
console.log('Favorit | Aussenseiter | Abstand | Sensationen |  Siege    | Ø Tore Aussens. | max');
for (let fav = 1; fav <= 4; fav++)
    for (let aus = fav + 1; aus <= 8; aus++) zeile(fav, aus, 16, true, '1. Runde');

console.log('\n--- Spaete Runde (noise 9), Favorit mit Heimrecht ---');
console.log('Favorit | Aussenseiter | Abstand | Sensationen |  Siege    | Ø Tore Aussens. | max');
[[1, 4], [1, 5], [1, 6], [1, 8], [2, 6], [3, 8]].forEach(([f, a]) => zeile(f, a, 9, false, 'spaete Runde'));

console.log('');
if (befunde.length) {
    console.log('BEFUND - strukturell unmoegliche Sensation:');
    befunde.forEach(b => console.log('  ' + b));
    process.exit(1);
}
console.log(`OK - in jeder Paarung gewinnt der Aussenseiter mindestens einmal. Nie 0 %.`);
if (!selbsttest) console.log('Gegenprobe: node tools/sensation_check.cjs --selbsttest  (muss Exit 1 melden)');
