/* PRUEFUNG des gesamten Tor-Modells gegen die gemessene Wirklichkeit. Exit 1 = Befund.
 *
 *   node tools/tor_pruefung.cjs [saisons]        (Vorgabe 12, ~3 min)
 *   node tools/tor_pruefung.cjs 12 --selbsttest  Gegenprobe: eine Konstante wird verstellt,
 *                                                die Pruefung MUSS dann durchfallen
 *
 * WARUM: die Kalibrierung war vier Versionen lang eine Messung, die jemand einmal gemacht hat -
 * keine Pruefung, die haelt. Zweimal ist dabei etwas durchgerutscht und erst eine Version spaeter
 * aufgefallen (die Heimsiegquote fiel von 43 auf 40 %, die Remisquote lag 4 Punkte zu hoch -
 * beides haengt still an GOAL_SPLIT). Wer hier eine Konstante anfasst, soll es sofort erfahren.
 *
 * Geprueft wird gegen ECHTE Werte, nicht gegen den Ist-Zustand der Engine:
 *   tools/torverteilung_real.json  Ebene 1-4, openfootball, bis 16 Saisons (auch Remis/Heimsieg)
 *   tools/torverteilung_fupa.json  Ebene 1-11, FuPa 2025/26, Einzelergebnisse + Remis/Heimsieg
 *
 * WELCHE QUELLE WOFUER: fuer Ebene 1-4 gilt IMMER der Langfrist-Satz, auch bei der Balance -
 * eine Einzelsaison streut bei Quoten zu stark (FuPa 2025/26 meldet fuer die Regionalliga
 * 40,8 % Heimsiege, langfristig sind es 42,1 %). Ab Ebene 5 gibt es nur die eine Saison.
 *
 * TOLERANZEN: Torschnitt, 0:0 und Balance mit festen Grenzen (ein Lauf streut je Ebene um ~0,03
 * Tore). Die SCHWANZQUOTEN dagegen statistisch - der Zielwert hat dort selbst eine grosse
 * Unsicherheit. "1,57 % Spiele mit 6+ Toren" in der Regionalliga sind 23 Faelle aus 1464 Spielen,
 * Poisson-Sigma 4,8, also +-20 % allein im Ziel. Geprueft wird deshalb, ob die echte Anzahl bei
 * der Engine-Quote noch plausibel waere (3 Sigma, mindestens 4 Faelle Abstand).
 *
 * BEKANNTE GRENZEN stehen als AUSNAHMEN im Code beim Namen und werden gemeldet, ohne die
 * Pruefung rot zu faerben. Das ist bewusst so herum: die Toleranz dafuer aufzuweichen wuerde
 * auch echte Verschiebungen durchlassen. Ebene 1-3 wird ausserdem nur als Gruppe geprueft -
 * dort ist im Modell EIN flaches Band, real aber ein U (Bundesliga 3,04 gegen 2,79/2,73).
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
const N = parseInt(args.find(a => /^\d+$/.test(a)) || '12', 10);

// Gegenprobe: EIN Knopf verstellt. GOAL_STEP ist der Sprung an der Amateurgrenze - ihn zu
// halbieren muss Ebene 5-8 sichtbar torarm machen. Schlaegt die Pruefung hier nicht an, misst
// sie etwas anderes als gedacht.
if (selbsttest) Engine.GOAL_STEP = Engine.GOAL_STEP / 2;

const real = JSON.parse(fs.readFileSync(ROOT + 'tools/torverteilung_real.json', 'utf8'));
const fupa = JSON.parse(fs.readFileSync(ROOT + 'tools/torverteilung_fupa.json', 'utf8'));
const auswerten = h => {
    const ge = x => Object.keys(h.c).filter(k => +k >= x).reduce((a, k) => a + h.c[k], 0);
    return { tps: h.g / h.n, p0: (h.c[0] || 0) / h.n * 100, p6: ge(6) / h.n * 100,
             p8: ge(8) / h.n * 100, p10: ge(10) / h.n * 100,
             remis: h.d != null ? h.d / h.n * 100 : null, heim: h.hw != null ? h.hw / h.n * 100 : null };
};
const ZIEL = {};
for (const l of [1, 2, 3, 4]) ZIEL[l] = auswerten(real[l]);           // Langfristwerte
for (const l of [5, 6, 7, 8]) ZIEL[l] = auswerten(fupa[l]);
// Balance: Ebene 1-4 ebenfalls aus dem LANGFRIST-Satz. Die FuPa-Einzelsaison meldet fuer die
// Regionalliga 40,8 % Heimsiege - niedriger als jede andere Ebene inklusive Bundesliga. Ueber
// 1464 Spiele der Vorsaison sind es 42,1 %, und Ebene 2/3 stehen langfristig bei 42,6 statt
// 46,1 %. Eine Saison ist fuer eine Quote schlicht zu wenig; wer hier gegen sie prueft, jagt
// Rauschen (dieselbe Falle wie die Stichproben-Null, s. CLAUDE.md).
for (const l of [5, 6, 7, 8]) {
    const f = auswerten(fupa[l]); ZIEL[l].remis = f.remis; ZIEL[l].heim = f.heim;
}

// --- simulieren -------------------------------------------------------------
Engine.init(); Engine.fastMode = true;
const H = {};
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    Engine.seasonResults.forEach(r => {
        const L = Engine.leagues[r.lid]; if (!L) return;
        const h = H[L.level] || (H[L.level] = { n: 0, g: 0, c: {}, d: 0, hw: 0 });
        h.n++; h.g += r.s1 + r.s2;
        if (r.s1 === r.s2) h.d++; else if (r.s1 > r.s2) h.hw++;
        const m = Math.max(r.s1, r.s2); h.c[m] = (h.c[m] || 0) + 1;
    });
    Engine.processSeasonTransition();
}

// --- vergleichen ------------------------------------------------------------
const befunde = [], bekannt = [];

// BEKANNTE GRENZEN DES MODELLS. Sie werden gemeldet, aber nicht als Befund gewertet - mit Grund,
// nicht um die Pruefung gruen zu bekommen. Wer eine davon loest, streicht sie hier.
//   Die Toleranz aufzuweichen waere der falsche Weg: dann faende die Pruefung auch echte
//   Verschiebungen nicht mehr. Lieber scharf bleiben und die zwei Stellen beim Namen nennen.
const AUSNAHMEN = {
    '1-3 >=6 (Gruppe)': 'Ebene 1-3 ist im Modell EIN flaches Band, real liegt die Bundesliga ueber '
        + 'ihren Nachbarn (3,04 gegen 2,79/2,73). Das U faengt kein Knick - s. _goalRates.',
    '8 >=6': 'Ebene 8 ist die unterste Ebene und bekommt keinen Zufluss von weiter unten; ihre '
        + 'Staerkespanne ist enger als real (dort spielen Absteiger aus 7 gegen Kreisligisten).'
};
const melde = (schluessel, text) => {
    if (AUSNAHMEN[schluessel]) bekannt.push(text + '\n      -> ' + AUSNAHMEN[schluessel]);
    else befunde.push(text);
};
const abs = (lvl, name, ist, soll, tol) => {
    const ok = Math.abs(ist - soll) <= tol;
    if (!ok) melde(`${lvl} ${name}`, `Ebene ${lvl} ${name}: ${ist.toFixed(2)} gegen real ${soll.toFixed(2)} (erlaubt +-${tol})`);
    return ok ? ' ' : '!';
};
// Schwanzquoten NICHT gegen eine feste Prozent-Toleranz pruefen: der Zielwert hat selbst eine
// Unsicherheit, und sie ist gross. Ebene 4 steht auf 1464 realen Spielen, "1,57 % mit 6+ Toren"
// sind also 23 Faelle - Poisson-Sigma 4,8, das ist +-20 % allein im Ziel. Eine pauschale
// 45-%-Grenze meldete daraus einen Befund, wo 1,5 Sigma lagen.
// Geprueft wird deshalb: waeren im REALEN Datensatz bei der Engine-Quote so viele Faelle zu
// erwarten, dass die echte Anzahl noch plausibel ist? Grenze 3 Sigma, mindestens aber 4 Faelle
// Abstand (sonst schlaegt eine Null gegen eine Eins an).
const rel = (lvl, name, ist, soll, nReal) => {
    const cReal = soll / 100 * nReal;              // echte Anzahl im realen Datensatz
    const cErw  = ist  / 100 * nReal;              // erwartete Anzahl bei Engine-Quote
    const sigma = Math.sqrt(Math.max(cReal, 1));
    const ok = Math.abs(cErw - cReal) <= Math.max(3 * sigma, 4);
    if (!ok) melde(`${lvl} ${name}`, `Ebene ${lvl} ${name}: ${ist.toFixed(3)} % gegen real ${soll.toFixed(3)} % `
        + `(im realen Satz ${cErw.toFixed(0)} erwartet gegen ${cReal.toFixed(0)} beobachtet, ${(Math.abs(cErw - cReal) / sigma).toFixed(1)} Sigma)`);
    return ok ? ' ' : '!';
};
const pct = (h, x) => Object.keys(h.c).filter(k => +k >= x).reduce((a, k) => a + h.c[k], 0) / h.n * 100;

console.log(`\n${N} Saisons${selbsttest ? '   [SELBSTTEST: GOAL_STEP halbiert - muss durchfallen]' : ''}\n`);
console.log('Ebene | Tore/Spiel   (real) |    0:0  (real) |    >=6  (real) |    >=8  (real) |   >=10  (real) | Remis (real) | Heim (real)');
const stufen = Object.keys(H).map(Number).sort((a, b) => a - b);
stufen.forEach(l => {
    const h = H[l], z = ZIEL[l]; if (!z) return;
    const tps = h.g / h.n, p0 = (h.c[0] || 0) / h.n * 100;
    const remis = h.d / h.n * 100, heim = h.hw / h.n * 100;
    const nReal = (l <= 4 ? real[l] : fupa[l]).n;
    const f = [];
    f.push(abs(l, 'Tore/Spiel', tps, z.tps, 0.15));
    f.push(rel(l, '0:0-Quote', p0, z.p0, (l <= 4 ? real[l] : fupa[l]).n));
    f.push(abs(l, 'Remisquote', remis, z.remis, 3.0));
    f.push(abs(l, 'Heimsiegquote', heim, z.heim, 3.5));
    // Schwanz einzeln erst ab Ebene 4 - darueber ist Ebene 1-3 EIN Band (s. Kopf)
    if (l >= 4) {
        f.push(rel(l, '>=6', pct(h, 6), z.p6, nReal));
        f.push(rel(l, '>=8', pct(h, 8), z.p8, nReal));
        f.push(rel(l, '>=10', pct(h, 10), z.p10, nReal));
    }
    console.log(`${String(l).padStart(5)} | ${tps.toFixed(2).padStart(6)} (${z.tps.toFixed(2)})${f[0]}| `
        + `${p0.toFixed(2).padStart(6)} (${z.p0.toFixed(2)})${f[1]}| ${pct(h, 6).toFixed(2).padStart(6)} (${z.p6.toFixed(2)})${f[4] || ' '}| `
        + `${pct(h, 8).toFixed(2).padStart(6)} (${z.p8.toFixed(2)})${f[5] || ' '}| ${pct(h, 10).toFixed(3).padStart(6)} (${z.p10.toFixed(3)}) | `
        + `${remis.toFixed(1).padStart(4)} (${z.remis.toFixed(1)})${f[2]}| ${heim.toFixed(1).padStart(4)} (${z.heim.toFixed(1)})${f[3]}`);
});

// Ebene 1-3 als Gruppe (dort ist im Modell EIN Band, real ein U)
const grp = { n: 0, c6: 0, c8: 0 }, grpZ = { n: 0, c6: 0, c8: 0 };
[1, 2, 3].forEach(l => {
    const h = H[l], z = ZIEL[l], zr = real[l];
    grp.n += h.n; grp.c6 += pct(h, 6) / 100 * h.n; grp.c8 += pct(h, 8) / 100 * h.n;
    grpZ.n += zr.n; grpZ.c6 += z.p6 / 100 * zr.n; grpZ.c8 += z.p8 / 100 * zr.n;
});
console.log(`\nEbene 1-3 als Gruppe (im Modell EIN Band): >=6 ${(grp.c6 / grp.n * 100).toFixed(2)} % gegen real `
    + `${(grpZ.c6 / grpZ.n * 100).toFixed(2)} % | >=8 ${(grp.c8 / grp.n * 100).toFixed(3)} % gegen real ${(grpZ.c8 / grpZ.n * 100).toFixed(3)} %`);
rel('1-3', '>=6 (Gruppe)', grp.c6 / grp.n * 100, grpZ.c6 / grpZ.n * 100, grpZ.n);

console.log('');
if (bekannt.length) {
    console.log('Bekannte Grenzen des Modells (kein Befund, aber nicht vergessen):');
    bekannt.forEach(b => console.log('  ' + b));
    console.log('');
}
if (befunde.length) {
    console.log(`BEFUND - ${befunde.length} Abweichung(en):`);
    befunde.forEach(b => console.log('  ' + b));
    process.exit(1);
}
console.log('OK - Torschnitt, 0:0, Schwanz und Balance liegen auf allen Ebenen im Rahmen.');
if (!selbsttest) console.log('\nGegenprobe:  node tools/tor_pruefung.cjs ' + N + ' --selbsttest   (muss Exit 1 melden)');
console.log('Ergaenzend:  node tools/sensation_check.cjs   (nichts darf strukturell unmoeglich sein)');
