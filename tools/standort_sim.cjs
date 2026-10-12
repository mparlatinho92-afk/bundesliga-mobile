/* Wirkt der STANDORT (Engine._standort, STR_ORT) in der Simulation so wie in echt?
 *
 *   node tools/standort_sim.cjs [saisons] [KEY=VALUE ...]      z. B.  node tools/standort_sim.cjs 214 STR_ORT=6
 *
 * Kalibrierziel ist der Querschnitt der echten Liga 2025/26 (= Startaufstellung, Saison 0): wie viele Ebenen hoeher
 * spielt ein Verein je Zehnerpotenz "Einwohner je Verein der Gemeinde"? Gemessen an ersten Mannschaften auf Ebene
 * 1-6 (7-8 sind nur in RLP/Saar und Berlin modelliert). Die Engine soll diesen Zusammenhang nach langer Zeit von
 * selbst HALTEN - ohne Standort zerfliesst er, weil unterhalb der 2. Liga nichts Dauerhaftes wirkt.
 * Daneben: Gruppen (Berlin, Hamburg, Ruhrgebiet, Doerfer, Grossstaedte), Hertha, Meister, Durchlaessigkeit.
 * Ein Lauf streut - je Einstellung mehrere Laeufe vergleichen.
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

const N = parseInt(process.argv[2] || '100', 10);
process.argv.slice(3).forEach(arg => {
    const m = arg.match(/^([A-Z0-9_]+)=(-?[\d.]+)$/);
    if (!m || !(m[1] in Engine)) { console.error('Unbrauchbar: ' + arg); process.exit(1); }
    Engine[m[1]] = +m[2];
});
Engine._groesse = null; Engine._ortCache = null;
Engine.init(); Engine.fastMode = true;

const RUHR = new Set(['Dortmund', 'Bochum', 'Essen', 'Gelsenkirchen', 'Duisburg', 'Oberhausen', 'Mülheim an der Ruhr', 'Herne', 'Bottrop', 'Hagen',
    'Recklinghausen', 'Castrop-Rauxel', 'Herten', 'Marl', 'Gladbeck', 'Dorsten', 'Witten', 'Hattingen', 'Unna', 'Lünen', 'Kamen', 'Bergkamen', 'Moers',
    'Dinslaken', 'Waltrop', 'Datteln', 'Schwerte', 'Holzwickede']);
const ORT = Engine._standort();
const info = {};
Object.values(GAME_DATA.teams).forEach(t => {
    if (t.isReserve || ORT[t.id] == null) return;
    const v = (t.venues || []).filter(v => v.ew > 0).sort((a, b) => (b.kapazitaet || 0) - (a.kapazitaet || 0))[0];
    info[t.id] = { ort: ORT[t.id], ew: Math.log10(v.ew), gem: v.gem, ewRoh: v.ew };
});
const GRUPPEN = {
    'Berlin': i => i.gem === 'Berlin', 'Hamburg': i => i.gem === 'Hamburg', 'Ruhrgebiet': i => RUHR.has(i.gem),
    'Doerfer <3 Tsd': i => i.ewRoh < 3000, 'Grossstaedte >100 Tsd*': i => i.ewRoh >= 1e5 && i.gem !== 'Berlin' && i.gem !== 'Hamburg' && !RUHR.has(i.gem),
};

function steigung(xs, ys) {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    return sxy / sxx;
}
// Querschnitt: Steigung "Ebenen hoeher je Zehnerpotenz" + mittlere Ebene je Gruppe, nur Ebene 1-6
function querschnitt(levelOf) {
    const ids = Object.keys(info).filter(id => { const l = levelOf(id); return l != null && l <= 6; });
    const y = ids.map(id => -levelOf(id));
    const r = { n: ids.length, ort: steigung(ids.map(id => info[id].ort), y), ew: steigung(ids.map(id => info[id].ew), y), g: {} };
    for (const g in GRUPPEN) {
        const s = ids.filter(id => GRUPPEN[g](info[id]));
        r.g[g] = s.length ? s.reduce((a, id) => a + levelOf(id), 0) / s.length : NaN;
    }
    return r;
}
const startLvl = {}, bestLvl = {};
Object.values(GAME_DATA.teams).forEach(t => { const L = GAME_DATA.leagues[t.leagueId]; if (L) { startLvl[t.id] = L.level; bestLvl[t.id] = L.level; } });
const real = querschnitt(id => startLvl[id] ?? null);

const meister = {}, l1 = {}, proben = [];
const t0 = Date.now();
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason(); Engine.sortTables();
    const liga1 = Object.values(Engine.teams).filter(t => t.leagueId === '1').sort((a, b) => (a.rank || 99) - (b.rank || 99));
    if (liga1.length) meister[liga1[0].id] = (meister[liga1[0].id] || 0) + 1;
    Object.values(Engine.teams).forEach(t => {
        const L = Engine.leagues[t.leagueId]; if (!L) return;
        if (L.level === 1) l1[t.id] = (l1[t.id] || 0) + 1;
        if (bestLvl[t.id] != null && L.level < bestLvl[t.id]) bestLvl[t.id] = L.level;
    });
    Engine.processSeasonTransition();
    if (s + 1 >= N / 2 && (s + 1) % 10 === 0) proben.push(querschnitt(id => { const t = Engine.teams[id], L = t && Engine.leagues[t.leagueId]; return L ? L.level : null; }));
}
const mittel = k => proben.reduce((a, p) => a + p[k], 0) / proben.length;
const gm = g => proben.reduce((a, p) => a + p.g[g], 0) / proben.length;
const knoepfe = Object.keys(Engine).filter(k => /^STR_(ORT|IDENT$|GED_ANTEIL)/.test(k)).map(k => k + '=' + Engine[k]).join(' ');
console.log(`\n${N} Saisons (${((Date.now() - t0) / 1000).toFixed(0)} s)  ${knoepfe}   Proben ab Saison ${N / 2}: ${proben.length}`);
console.log('\nEbenen hoeher je Zehnerpotenz        echt   Sim');
console.log(`  Einwohner je Verein der Gemeinde   ${real.ort.toFixed(2)}   ${mittel('ort').toFixed(2)}`);
console.log(`  Einwohner der Gemeinde             ${real.ew.toFixed(2)}   ${mittel('ew').toFixed(2)}`);
console.log('\nmittlere Ebene (1-6)                 echt   Sim');
for (const g in GRUPPEN) console.log(`  ${g.padEnd(32)}  ${real.g[g].toFixed(2)}   ${gm(g).toFixed(2)}`);

const name = id => (Engine.teams[id] || GAME_DATA.teams[id] || {}).name || id;
const top = Object.entries(meister).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('\nMeister: ' + top.map(([id, n]) => `${name(id)} ${n}`).join(', ') + `  (${Object.keys(meister).length} verschiedene)`);
const bl = Object.entries(l1).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('Saisons in Liga 1: ' + bl.map(([id, n]) => `${name(id)} ${n}`).join(', '));
console.log(`Hertha BSC: ${meister.herthabsc_695 || 0} Titel, ${l1.herthabsc_695 || 0}/${N} Saisons in Liga 1, Ort ${ORT.herthabsc_695.toFixed(2)}`);

console.log('\nDurchlaessigkeit (Start -> je erreicht):  Ebene1  <=2  <=3');
[3, 4, 5, 6, 7, 8].forEach(sl => {
    const ids = Object.keys(startLvl).filter(id => startLvl[id] === sl);
    const bis = k => ids.filter(id => bestLvl[id] <= k).length;
    console.log(`  Start ${sl} (${String(ids.length).padStart(3)})                    ${String(bis(1)).padStart(5)} ${String(bis(2)).padStart(4)} ${String(bis(3)).padStart(4)}`);
});
