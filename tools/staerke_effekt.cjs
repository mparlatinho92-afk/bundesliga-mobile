/* Wie stark schlagen die STAERKEWERTE auf die Tore durch?
 *
 *   node tools/staerke_effekt.cjs [saisons] [GOAL_X=wert ...]
 *
 * Zwei Fragen, die tor_kalib.cjs nicht beantwortet, weil es nur je Ebene mittelt:
 *
 *  (1) Macht der Klassenunterschied INNERHALB einer Liga einen erkennbaren Unterschied?
 *      Buckets nach |sH - sA| (echte Staerken, ohne Tagesform).
 *  (2) Macht ein Verein, der nicht ins Niveau seiner Liga passt, einen Unterschied?
 *      Also der Absteiger von oben und der Aufsteiger von unten - in dieser Engine tragen
 *      sie ihre alte Staerke noch mit (calculateStrengths: 0.7*alt + 0.3*(109-10*level)).
 *      Gemessen als Abweichung der eigenen Staerke vom Median der eigenen Liga.
 *
 * Randbedingung des Nutzers: die Staerkewerte sollen "leichte, aber schon erkennbare
 * Abweichungen von der Basis" erzeugen und "in der Regel nicht den Schnitt der Liga verzerren".
 * Deshalb steht unter jeder Ebene, wie weit der Ligaschnitt dabei wandert.
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

const N = parseInt(process.argv[2] || '10', 10);
process.argv.slice(3).forEach(arg => {
    const m = arg.match(/^(GOAL_[A-Z_]+)=(-?[\d.]+)$/);
    if (!m) { console.error('Unbrauchbares Argument: ' + arg); process.exit(1); }
    if (!(m[1] in Engine)) { console.error('Unbekannte Konstante: ' + m[1]); process.exit(1); }
    Engine[m[1]] = +m[2];
});

Engine.init();
Engine.fastMode = true;

// dif  = Buckets nach echtem Staerkeunterschied der Paarung
// abw  = Buckets nach Abweichung EINES Vereins vom Median seiner Liga
const dif = {}, abw = {}, lvl = {};
const bucketDif = d => d < 3 ? '0-2' : d < 6 ? '3-5' : d < 10 ? '6-9' : d < 15 ? '10-14' : '15+';
const bucketAbw = a => a <= -8 ? '<= -8' : a <= -3 ? '-7..-3' : a < 3 ? '-2..+2' : a < 8 ? '+3..+7' : '>= +8';

for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();

    // Median der Staerken je Liga (Stand DIESER Saison)
    const perLiga = {};
    Object.values(Engine.teams).forEach(t => {
        if (!t.leagueId) return;
        (perLiga[t.leagueId] = perLiga[t.leagueId] || []).push(t.strength || 50);
    });
    const median = {};
    for (const lid in perLiga) {
        const v = perLiga[lid].slice().sort((a, b) => a - b);
        median[lid] = v[Math.floor(v.length / 2)];
    }

    Engine.seasonResults.forEach(r => {
        const L = Engine.leagues[r.lid]; if (!L) return;
        const h = Engine.teams[r.hId], a = Engine.teams[r.aId]; if (!h || !a) return;
        const sH = h.strength || 50, sA = a.strength || 50, tore = r.s1 + r.s2;

        const li = lvl[L.level] || (lvl[L.level] = { n: 0, g: 0, smin: 99, smax: 0 });
        li.n++; li.g += tore;
        li.smin = Math.min(li.smin, sH, sA); li.smax = Math.max(li.smax, sH, sA);

        const kd = bucketDif(Math.abs(sH - sA));
        const d = (dif[L.level] = dif[L.level] || {});
        const db = d[kd] || (d[kd] = { n: 0, g: 0, fav: 0, aus: 0 });
        db.n++; db.g += tore;
        db.fav += sH >= sA ? r.s1 : r.s2;          // Tore des staerkeren Teams
        db.aus += sH >= sA ? r.s2 : r.s1;

        // je Verein: Abweichung vom Ligamedian
        const m = median[r.lid];
        [[sH, r.s1, r.s2], [sA, r.s2, r.s1]].forEach(([st, gf, ga]) => {
            const ka = bucketAbw(st - m);
            const A = (abw[L.level] = abw[L.level] || {});
            const ab = A[ka] || (A[ka] = { n: 0, gf: 0, ga: 0 });
            ab.n++; ab.gf += gf; ab.ga += ga;
        });
    });
    Engine.processSeasonTransition();
}

const p2 = x => x.toFixed(2).padStart(5);
console.log(`\n${N} Saisons\n`);
console.log('=== (1) Klassenunterschied INNERHALB der Paarung (echte Staerken) ===');
console.log('Ebene | Staerken | Ligaschnitt |   |dS|  Spiele  Tore/Spiel  Favorit  Aussenseiter');
Object.keys(lvl).map(Number).sort((a, b) => a - b).forEach(l => {
    const li = lvl[l];
    console.log(`${String(l).padStart(5)} | ${String(li.smin).padStart(3)}-${String(li.smax).padEnd(3)}  | ${p2(li.g / li.n)}       |`);
    ['0-2', '3-5', '6-9', '10-14', '15+'].forEach(k => {
        const b = dif[l] && dif[l][k]; if (!b || !b.n) return;
        console.log(`      |          |             | ${k.padStart(6)} ${String(b.n).padStart(7)}      ${p2(b.g / b.n)}    ${p2(b.fav / b.n)}         ${p2(b.aus / b.n)}`);
    });
});
console.log('\n=== (2) Verein passt nicht ins Ligniveau (Abweichung vom Ligamedian) ===');
console.log('Ebene |  Abweichung |  Spiele | eigene Tore | Gegentore');
Object.keys(abw).map(Number).sort((a, b) => a - b).forEach(l => {
    ['<= -8', '-7..-3', '-2..+2', '+3..+7', '>= +8'].forEach(k => {
        const b = abw[l][k]; if (!b || !b.n) return;
        console.log(`${String(l).padStart(5)} | ${k.padStart(11)} | ${String(b.n).padStart(7)} |       ${p2(b.gf / b.n)} |     ${p2(b.ga / b.n)}`);
    });
});
