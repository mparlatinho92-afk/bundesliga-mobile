// Schreibt die Daten des Liga-Kürzel-Editors (tools/liga-kuerzel-editor.html) neu:
//   CURRENT_SHORT  = aktueller Stand von App.LEAGUE_SHORT (app/league.js) – Spiel- UND historische Ligen
//   HIST_LEAGUES   = alle historischen Ligen (HIST_ARCHIVE_LEAGUES), gruppiert nach Gebiet + Zeitraum
//
//   node tools/kuerzel_editor_daten.cjs
//
// Die Spielligen (const LEAGUES) bleiben unverändert – ihre Blockgrößen stammen aus dem Live-Liga-Baum.
// Historische Ligen stehen in der ARCHIV-Navigation (_renderArchivedPyramidNav) mit allen Ligen derselben Ebene
// und desselben Gebiets in einer Reihe; `block` ist deshalb die größte Zahl gleichzeitig bestehender Ligen dieser
// Ebene im selben Gebiet (engster Fall). `auto` ist das Kürzel, das die App OHNE eigenen Eintrag zeigt
// (Ligatyp + Region, wie _histKurzName) – nur Abweichungen davon landen im Export.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const EDITOR = ROOT + 'tools/liga-kuerzel-editor.html';

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null, addEventListener: () => {} };
global.App = {};
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/league.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const H = HIST_ARCHIVE_LEAGUES;
const ids = Object.keys(H);
const autoKurz = h => { const rest = h.name.split(' ').slice(1).join(' '); return h.kurz && rest ? h.kurz + ' ' + rest : h.name; };

// Abschnitt = Gebiet + Epoche, beschriftet mit dem tatsächlichen Zeitraum der enthaltenen Ligen
const abschnitt = {};
ids.forEach(id => { const h = H[id], k = h.gebiet + '|' + h.epoche;
    const a = abschnitt[k] || (abschnitt[k] = { gebiet: h.gebiet, von: 9999, bis: 0 });
    a.von = Math.min(a.von, h.firstYear); a.bis = Math.max(a.bis, h.lastYear); });
const abschnitte = Object.entries(abschnitt).sort((a, b) => (a[1].gebiet === 'DDR') - (b[1].gebiet === 'DDR') || a[1].von - b[1].von);
const label = k => { const a = abschnitt[k]; return `Historisch · ${a.gebiet} ${a.von}–${a.bis}`; };
const ordnung = {}; abschnitte.forEach(([k], i) => ordnung[k] = 100 + i);

// Blockgröße: größte Zahl gleichzeitig bestehender Ligen derselben Ebene im selben Gebiet
const block = id => {
    const h = H[id]; let max = 1;
    for (let y = h.firstYear; y <= h.lastYear; y++)
        max = Math.max(max, ids.filter(o => H[o].gebiet === h.gebiet && H[o].level === h.level && H[o].firstYear <= y && H[o].lastYear >= y).length);
    return max;
};

const HIST = ids.map(id => { const h = H[id], k = h.gebiet + '|' + h.epoche;
    return { id, name: h.name, level: h.level, block: block(id), region: label(k), rorder: ordnung[k],
        gid: 'h:' + k + ':' + h.level, hist: 1, auto: autoKurz(h), jahre: h.firstYear + '–' + h.lastYear };
}).sort((a, b) => a.rorder - b.rorder || a.level - b.level || (H[a.id].ord || 0) - (H[b.id].ord || 0) || a.id.localeCompare(b.id));

let s = fs.readFileSync(EDITOR, 'utf8');
const ersetze = (re, neu, was) => { const n = (s.match(new RegExp(re.source, 'gm')) || []).length; if (n !== 1) throw new Error(was + ': ' + n + ' Treffer');
    s = s.replace(re, m => typeof neu === 'function' ? neu(m) : neu); };
ersetze(/^const CURRENT_SHORT = .*;$/m, 'const CURRENT_SHORT = ' + JSON.stringify(App.LEAGUE_SHORT) + ';', 'CURRENT_SHORT');
const histZeile = 'const HIST_LEAGUES = ' + JSON.stringify(HIST) + '; LEAGUES.push(...HIST_LEAGUES);';
if (/^const HIST_LEAGUES = .*$/m.test(s)) ersetze(/^const HIST_LEAGUES = .*$/m, histZeile, 'HIST_LEAGUES');
else ersetze(/^const LEAGUES = .*;$/m, m => m + '\n' + histZeile, 'LEAGUES');
fs.writeFileSync(EDITOR, s);
console.log(`Editor aktualisiert: ${HIST.length} historische Ligen in ${abschnitte.length} Abschnitten, ${Object.keys(App.LEAGUE_SHORT).length} Kürzel im App-Stand.`);
abschnitte.forEach(([k]) => console.log('  ' + label(k) + ': ' + HIST.filter(h => h.gid.startsWith('h:' + k)).length + ' Ligen'));
