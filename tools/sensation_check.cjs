/* PRUEFUNG: Nichts darf strukturell unmoeglich sein. Zwei Fragen, ein Exit-Code.
 *
 *   node tools/sensation_check.cjs [ziehungen] [GOAL_X=wert ...]
 *   node tools/sensation_check.cjs --selbsttest      # Gegenprobe: kann die Pruefung durchfallen?
 *
 * Exit 1 = Befund.
 *
 *   (A) SENSATION - der Aussenseiter muss in JEDER Paarung gewinnen koennen. Nie 0 %.
 *   (B) WAND      - kein Torwert darf gedeckelt sein. Ein Cap staucht alles Hoehere auf EINE
 *                   Zahl, die dadurch haeufiger wird als die darunter. Genau das war bis
 *                   v0.8.127 der Pokal-Cap 9: nach 500 Saisons stand in ZWEI unabhaengigen
 *                   Spielstaenden dasselbe 9:0 als Rekord. Ein Deckel ist von einem seltenen
 *                   Ergebnis nicht am Hoechstwert zu unterscheiden, sondern nur an der FORM des
 *                   Schwanzes - deshalb wird auf Monotonie geprueft, nicht auf ein Maximum.
 *
 * Beide Fragen zusammen, weil es dieselbe ist: sobald ein Ergebnis nicht mehr vorkommen KANN,
 * ist der Wettbewerb an dieser Stelle entschieden, bevor er gespielt wird.
 *
 * ABGRENZUNG ZU tools/pokal_effekt.cjs: dort stehen hinter "0,0 % Sensationen" oft nur 20-30
 * gespielte Partien - eine STICHPROBEN-Null. Hier wird direkt hunderttausendfach gezogen.
 *
 * Staerke je Ebene = 109 - 10*level. NOISE je Runde: [16,16,12,12,9,9] - die erste Runde hat den
 * meisten Zufall. Heimrecht hat bis zum Achtelfinale der Unterklassige (game_engine.js ~Z. 494).
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

// GEGENPROBE: ein Sampler, der beide Fehler gleichzeitig hat - der Aussenseiter gewinnt nie und
// die Torzahl ist bei 9 gedeckelt (der historische Cap). Die Pruefung MUSS hier anschlagen,
// sonst misst sie etwas anderes als gedacht.
if (selbsttest) {
    const echt = Engine.simulateKnockoutMatch.bind(Engine);
    Engine.simulateKnockoutMatch = function (h, a, noise) {
        const r = echt(h, a, noise);
        return { score1: Math.min(9, Math.max(r.score1, r.score2)), score2: 0, decided: 'reg', winner: 'h' };
    };
}

const staerke = lvl => 109 - 10 * lvl;
const befunde = [];

// ---------------------------------------------------------------- (A) Sensation
const zieh = (lvlFav, lvlAus, noise, ausHeim) => {
    const fav = { strength: staerke(lvlFav) }, aus = { strength: staerke(lvlAus) };
    let siege = 0, maxAus = 0, ausTore = 0;
    // Im Selbsttest gewinnt immer 'h' - deshalb dort bewusst der Favorit daheim, damit die
    // Gegenprobe eine echte Null erzeugt statt einer Eins.
    const heimIstAus = ausHeim && !selbsttest;
    for (let i = 0; i < N; i++) {
        const r = heimIstAus ? Engine.simulateKnockoutMatch(aus, fav, noise)
                             : Engine.simulateKnockoutMatch(fav, aus, noise);
        if (heimIstAus ? r.winner === 'h' : r.winner === 'a') siege++;
        const gAus = heimIstAus ? r.score1 : r.score2;
        ausTore += gAus; if (gAus > maxAus) maxAus = gAus;
    }
    return { p: siege / N * 100, n: siege, maxAus, oeAus: ausTore / N };
};
const zeile = (fav, aus, noise, ausHeim, label) => {
    const r = zieh(fav, aus, noise, ausHeim);
    if (r.n === 0) befunde.push(`(A) Ebene ${fav} gegen Ebene ${aus} (${label}): 0 Siege des Aussenseiters in ${N} Ziehungen`);
    console.log(`${('Ebene ' + fav).padStart(7)} | ${('Ebene ' + aus).padStart(12)} | ${String(aus - fav).padStart(7)} | `
        + `${r.p.toFixed(3).padStart(8)} % | ${String(r.n).padStart(9)} |            ${r.oeAus.toFixed(2)} | ${r.maxAus}`);
};

console.log(`\n${N.toLocaleString('de-DE')} Ziehungen je Paarung${selbsttest ? '   [SELBSTTEST: Sampler bewusst kaputt]' : ''}`);
console.log('\n=== (A) Kann der Aussenseiter gewinnen? ===');
console.log('--- 1. Runde (noise 16), Aussenseiter mit Heimrecht ---');
console.log('Favorit | Aussenseiter | Abstand | Sensationen |  Siege    | Ø Tore Aussens. | max');
for (let fav = 1; fav <= 4; fav++)
    for (let aus = fav + 1; aus <= 8; aus++) zeile(fav, aus, 16, true, '1. Runde');
console.log('--- Spaete Runde (noise 9), Favorit mit Heimrecht ---');
[[1, 4], [1, 5], [1, 6], [1, 8], [2, 6], [3, 8]].forEach(([f, a]) => zeile(f, a, 9, false, 'spaete Runde'));

// ---------------------------------------------------------------- (B) Wand
console.log('\n=== (B) Ist die Torzahl irgendwo gedeckelt? ===');
console.log('Paarung          |  max | Schwanz ab 8 Toren                     | Form');
[[1, 8], [1, 6], [2, 8], [1, 4]].forEach(([f, a]) => {
    const fav = { strength: staerke(f) }, aus = { strength: staerke(a) };
    const hist = {}; let max = 0;
    for (let i = 0; i < N; i++) {
        const r = Engine.simulateKnockoutMatch(fav, aus, 9);
        const g = Math.max(r.score1, r.score2);
        hist[g] = (hist[g] || 0) + 1; if (g > max) max = g;
    }
    // Eine Wand erkennt man daran, dass eine Stufe im Schwanz HAEUFIGER ist als die darunter.
    // ABER: ganz aussen im Schwanz stehen Zaehlungen wie 1 gegen 0 - dort ist jeder Anstieg
    // Rauschen. Ein erster Versuch meldete deshalb "27 Tore haeufiger als 26" und damit einen
    // Deckel, wo keiner war. Geprueft wird nur, wo die Stufe DARUNTER >= MIN_N Faelle hat, und
    // der Anstieg muss 3 Sigma ueberschreiten (Poisson: Sigma = Wurzel der Anzahl). Ein echter
    // Cap staucht die gesamte hoehere Wahrscheinlichkeitsmasse auf EINE Zahl - das liegt weit
    // darueber (im Selbsttest 1133 gegen 1003 bei Sigma 32, also gut 4 Sigma).
    const MIN_N = 30;
    let wand = null;
    for (let k = 8; k <= max; k++) {
        const unten = hist[k - 1] || 0;
        if (unten < MIN_N) continue;
        if ((hist[k] || 0) > unten + 3 * Math.sqrt(unten)) wand = k;
    }
    const schwanz = [];
    for (let k = 8; k <= Math.min(max, 15); k++) schwanz.push(`${k}:${hist[k] || 0}`);
    if (wand) befunde.push(`(B) Ebene ${f} gegen Ebene ${a}: ${wand} Tore (${hist[wand]}x) kommen haeufiger vor als ${wand - 1} (${hist[wand - 1]}x) - Deckel`);
    console.log(`Ebene ${f} vs Ebene ${a}  | ${String(max).padStart(4)} | ${schwanz.join(' ').padEnd(38)} | ${wand ? 'WAND bei ' + wand : 'faellt monoton'}`);
});

console.log('');
if (befunde.length) {
    console.log('BEFUND:');
    befunde.forEach(b => console.log('  ' + b));
    process.exit(1);
}
console.log('OK (A) - in jeder Paarung gewinnt der Aussenseiter mindestens einmal. Nie 0 %.');
console.log('OK (B) - kein Deckel, der Schwanz faellt ueberall monoton.');
if (!selbsttest) console.log('\nGegenprobe: node tools/sensation_check.cjs --selbsttest  (muss Exit 1 melden)');
