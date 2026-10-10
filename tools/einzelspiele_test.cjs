// PRUEFUNG (Exit 1 bei Befund): Spielrekorde aus historischen Einzelspielen (app/einzelspiele_data.js) in der Engine.
//
//   node tools/einzelspiele_test.cjs              alle Pruefungen
//   node tools/einzelspiele_test.cjs --selbsttest Engine._recordEinzelspiele stillgelegt – MUSS durchfallen
//
// Headless wie tools/historie_einbau_test.cjs. Prueft drei bekannte echte Rekorde, die Form JEDES Slots und das
// Mischverhalten: ein hoeherer gespielter Rekord bleibt, bei Gleichstand gewinnt das fruehere Spiel.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/einzelspiele_data.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
if (SELBST) Engine._recordEinzelspiele = () => false;

const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const id = name => Object.keys(GAME_DATA.teams).find(k => GAME_DATA.teams[k].name === name);
const hat = x => !!(GAME_DATA.teams[x] || HISTORIC_CLUBS[x]);

Engine.init();
const R = Engine._recStore(), E = EINZELSPIELE_SEED;   // ohne Einmischung legt ein frisches Spiel records erst spaeter an
pruefe(R.ezs === E.v, `Guard R.ezs = Datenversion ${E.v}`);

// 1. bekannte echte Rekorde
const gla = id('Borussia Mönchengladbach'), bvb = id('Borussia Dortmund'), fcb = id('FC Bayern München'), dsc = id('DSC Arminia Bielefeld');
const l1 = R.l['1'] && R.l['1'].hs, l2 = R.l['2'] && R.l['2'].hs;
pruefe(l1 && l1[1] === 12 && l1[2] === 0 && l1[3] === '1977/78' && l1[4] === gla && l1[5] === bvb, `Bundesliga: Gladbach 12:0 Dortmund 1977/78 (ist ${JSON.stringify(l1)})`);
pruefe(l2 && l2[1] === 11 && l2[2] === 0 && l2[3] === '1979/80' && l2[4] === dsc, `2. Bundesliga: Bielefeld 11:0 1979/80 (ist ${JSON.stringify(l2)})`);
const bh = R.t[fcb] && R.t[fcb].hs;
pruefe(bh && bh[1] === 11 && bh[2] === 1 && bh[3] === '1971/72' && bh[4] === bvb, `Bayern: 11:1 gegen Dortmund 1971/72 (ist ${JSON.stringify(bh)})`);

// 2. Form jedes Slots
let falsch = [];
for (const v in E.t) {
    const o = E.t[v];
    if (!hat(v)) falsch.push(v + ' ohne Namen');
    if (o.hs && !(o.hs[0] === o.hs[1] - o.hs[2] && o.hs[0] > 0 && hat(o.hs[4]))) falsch.push(v + ' hs ' + o.hs);
    if (o.hn && !(o.hn[0] === o.hn[1] - o.hn[2] && o.hn[0] > 0 && hat(o.hn[4]))) falsch.push(v + ' hn ' + o.hn);
    if (o.mg && !(o.mg[0] === o.mg[1] + o.mg[2] && hat(o.mg[4]))) falsch.push(v + ' mg ' + o.mg);
    [o.hs, o.hn, o.mg].forEach(s => { if (s && !(s[3] < '2025/26')) falsch.push(v + ' Jahr ' + s[3]); });
}
pruefe(!falsch.length, `alle ${Object.keys(E.t).length} Vereins-Slots stimmig (${falsch.length} falsch${falsch.length ? ': ' + falsch.slice(0, 3).join(' | ') : ''})`);
pruefe(Object.keys(E.l).every(l => GAME_DATA.leagues[l]), 'Liga-Rekorde nur fuer Spiel-Ligen');
pruefe(E.cov['1'] && E.cov['1'].v.some(([a, b]) => a <= 1963 && b >= 2002) && !E.cov['1'].v.some(([a, b]) => a <= 2005 && b >= 2005),
    'Abdeckung Bundesliga: 1963–2002 drin, 2005 (Quellenluecke 2003–2009) nicht');

// 3. Mischverhalten
const o = R.t[fcb] || (R.t[fcb] = {});
R.l['1'] = R.l['1'] || {};
o.hs = [20, 20, 0, '2031/32', bvb];                         // hoeher gespielt -> bleibt
R.l['1'].hs = [12, 12, 0, '2040/41', bvb, gla];            // Gleichstand, spaeter -> das historische Spiel gewinnt
R.ezs = null;
Engine._recordEinzelspiele();
pruefe(o.hs[0] === 20 && o.hs[3] === '2031/32', 'hoeherer gespielter Rekord bleibt stehen');
pruefe(R.l['1'].hs[3] === '1977/78', 'Gleichstand: das fruehere Spiel gewinnt');
pruefe(Engine._recordEinzelspiele() === false, 'zweiter Aufruf mit gleicher Version tut nichts');

if (befunde.length) { console.log(`\nBEFUND (${befunde.length})`); process.exit(1); }
console.log('\nOK');
