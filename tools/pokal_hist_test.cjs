// Prüfung app/pokal_hist_data.js (historischer DFB-Pokal) + die Summen aus app/pokal_hist.js
//   node tools/pokal_hist_test.cjs              Sieger je Saison = POKAL_SEED, Spielzahl je Saison = Quelle, Summen gegen Einzelspiele
//   node tools/pokal_hist_test.cjs --selbsttest  ein Finale umgedreht + ein Spiel entfernt – muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.window = global;
['game_data.js', 'app/history_data.js', 'app/pokal_hist_data.js'].forEach(f => eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
global.Engine = { teams: {} }; global.App = {};
eval.call(global, fs.readFileSync(ROOT + 'app/pokal_hist.js', 'utf8').replace(/^Object\.assign\(App,/, 'Object.assign(global.App,'));
const SELBST = process.argv.includes('--selbsttest');
const P = POKAL_HIST, befund = [];
if (SELBST) {
    const f = P.saisons.find(s => s.y === '1985/86').r.find(r => r.n === 'Finale').s[0]; f[4] ^= 32;   // Sieger vertauscht
    P.saisons.find(s => s.y === '1974/75').r[0].s.pop();                                                // ein Spiel weg
}
// 1) Endspielsieger = vorhandene Siegerliste
P.saisons.forEach(s => {
    const fin = s.r.find(r => r.n === 'Finale');
    if (!fin) { befund.push(`${s.y}: kein Finale`); return; }
    const m = fin.s[fin.s.length - 1], sieger = P.ids[m[4] & 32 ? m[1] : m[0]], soll = POKAL_SEED[s.y];
    if (sieger !== soll && HISTORIC_CLUBS[sieger] !== soll) befund.push(`${s.y}: Finale ${sieger}, Siegerliste ${soll}`);
});
// 2) Spielzahl je Saison = Quelle (tools/wiki_pokal.json ohne ausgeschlossene Runden und ohne Spiele ohne Tore)
const W = JSON.parse(fs.readFileSync(ROOT + 'tools/wiki_pokal.json', 'utf8')), O = new Set(JSON.parse(fs.readFileSync(ROOT + 'tools/wiki_pokal_runden.json', 'utf8')).ohne);
P.saisons.forEach(s => {
    const q = W.saisons.find(x => x.y === s.y);
    const soll = q.runden.filter(r => !O.has(s.y + '|' + r.name)).reduce((a, r) => a + r.spiele.filter(x => x.hg != null && x.ag != null).length, 0);
    const ist = s.r.reduce((a, r) => a + r.s.length, 0);
    if (soll !== ist) befund.push(`${s.y}: ${ist} Spiele, Quelle ${soll}`);
});
// 3) Summen: Spiele = 2 × Partien, S = N, Titel = Saisons
const E = App._pokalHistSumme(null), sum = f => Object.values(E).reduce((a, e) => a + e[f], 0);
const partien = P.saisons.reduce((a, s) => a + s.r.reduce((b, r) => b + r.s.length, 0), 0);
if (sum('sp') !== 2 * partien) befund.push(`Summe Spiele ${sum('sp')} ≠ 2×${partien}`);
if (sum('w') !== sum('l')) befund.push(`Siege ${sum('w')} ≠ Niederlagen ${sum('l')}`);
if (sum('wins') !== P.saisons.length) befund.push(`Titel ${sum('wins')} ≠ Saisons ${P.saisons.length}`);
const bay = E.fcbayernmuenchen_0;
console.log(`${P.saisons.length} Saisons, ${partien} Spiele, ${Object.keys(E).length} Vereine | Bayern ${bay.wins} Titel, ${bay.sp} Sp. ${bay.w}-${bay.d}-${bay.l}`);
const st = App._pokalHistSumme('1985/86').fcbayernmuenchen_0;
console.log(`Stand nach 1985/86: Bayern ${st.wins} Titel`);
if (st.wins !== 8) befund.push(`Bayern nach 1985/86: ${st.wins} statt 8 Titel (1957, 66, 67, 69, 71, 82, 84, 86)`);
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
