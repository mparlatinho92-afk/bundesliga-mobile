// Schreibt die Daten des Liga-Kürzel-Editors (tools/liga-kuerzel-editor.html) neu:
//   CURRENT_SHORT  = aktueller Stand von App.LEAGUE_SHORT (app/league.js) – Spiel- UND historische Ligen
//   HIST_LEAGUES   = alle historischen Ligen (HIST_ARCHIVE_LEAGUES), gruppiert nach Gebiet + Zeitraum
//
//   node tools/kuerzel_editor_daten.cjs
//
// Die Spielligen (const LEAGUES) bleiben unverändert – ihre Blockgrößen stammen aus dem Live-Liga-Baum.
// Historische Ligen stehen in der ARCHIV-Navigation (_renderArchivedPyramidNav) mit ihren Geschwistern in einer Reihe –
// Geschwister nach der Zuordnung der Ligapyramide (_pyrBaue: eigene Liga darüber, bei Staffeln streng geografisch).
// `block` ist die größte Geschwisterzahl über alle Saisons der Liga (engster Fall). `auto` ist das Kürzel, das die App OHNE eigenen Eintrag zeigt
// (Ligatyp + Region, wie _histKurzName) – nur Abweichungen davon landen im Export.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const EDITOR = ROOT + 'tools/liga-kuerzel-editor.html';

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] };
global.App = {};
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/aufstieg_data.js', 'game_engine.js', 'app/league.js', 'app/pyramide.js'].forEach(f =>
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

(async () => {
Engine.init();
const idx = await HistExt.load();
// Blockgröße: größte Geschwisterzahl (gleiche Liga/Staffel darüber) über alle Saisons – aus der echten _pyrBaue
const tab = y => { const o = {}; if (!y) return o;
    HISTORY_SEED.seasons.filter(s => s.y === y).forEach(s => { o[s.lid] = { rows: s.table }; });
    Object.entries((idx && idx.bySeason[y]) || {}).forEach(([l, r]) => { if (!o[l]) o[l] = r; }); return o; };
const blockMax = {}, NAV = {};
// Vorschau „wie im Spiel“: die ECHTEN Reihen-Funktionen der App (_archNavTeile / _liveNavTeile), nicht nachgebaut.
// Historische Liga: die Saison mit der breitesten Reihe (engster Fall). Spielliga: die Live-Navigation.
const reiheBreite = t => Math.max(t.gleicheEbene.length + 1, t.upIds.length,
    t.downGruppen && t.downGruppen.length > 1 ? Math.max(...t.downGruppen.map(g => g.ids.length)) : t.downIds.length);
(await App._pyrJahre()).filter(y => parseInt(y) < (Engine.startYear || 2025)).forEach(y => {
    const cur = tab(y), D = App._pyrBaue(y, cur, tab(App._nextSeasonStr(y)), tab(App._prevSeasonStr(y)), 'eng');
    const echt = D.knoten.filter(k => !k.ghost), jeEltern = {};
    echt.forEach(k => { (jeEltern[k.parent || '-'] = jeEltern[k.parent || '-'] || new Set()).add(k.lid); });
    echt.forEach(k => { blockMax[k.lid] = Math.max(blockMax[k.lid] || 1, jeEltern[k.parent || '-'].size); });
    const avail = new Set(Object.keys(cur));
    [...new Set(echt.map(k => k.lid))].filter(l => H[l]).forEach(l => {
        const usable = new Set([...avail].filter(x => App._histGebiet(x) === App._histGebiet(l)));
        const t = App._archNavTeile(l, y, usable, D), b = reiheBreite(t);
        if (!NAV[l] || b > NAV[l].breite) NAV[l] = { art: 'archiv', jahr: y, breite: b, up: t.upIds, upName: t.upName, sib: t.gleicheEbene,
            down: t.downGruppen && t.downGruppen.length > 1 ? t.downGruppen : [{ g: null, ids: t.downIds }],
            unten: t.downIds.length ? null : App._tierName(t.curLvl + 1, t.sy, l) };
    });
});
Object.keys(Engine.leagues).forEach(l => { const t = App._liveNavTeile(l);
    NAV[l] = { art: 'live', up: t.parentId ? [t.parentId] : [], sib: t.siblings, down: [{ g: null, ids: t.children }], unten: t.children.length ? null : 'Amateurpokal' }; });
const block = id => blockMax[id] || 1;

const HIST = ids.map(id => { const h = H[id], k = h.gebiet + '|' + h.epoche;
    return { id, name: h.name, level: h.level, block: block(id), region: label(k), rorder: ordnung[k],
        gid: 'h:' + k + ':' + h.level, hist: 1, auto: autoKurz(h), jahre: h.firstYear + '–' + h.lastYear };
}).sort((a, b) => a.rorder - b.rorder || a.level - b.level || (H[a.id].ord || 0) - (H[b.id].ord || 0) || a.id.localeCompare(b.id));

let s = fs.readFileSync(EDITOR, 'utf8');
const ersetze = (re, neu, was) => { const n = (s.match(new RegExp(re.source, 'gm')) || []).length; if (n !== 1) throw new Error(was + ': ' + n + ' Treffer');
    s = s.replace(re, m => typeof neu === 'function' ? neu(m) : neu); };
ersetze(/^const CURRENT_SHORT = .*;$/m, 'const CURRENT_SHORT = ' + JSON.stringify(App.LEAGUE_SHORT) + ';', 'CURRENT_SHORT');
const histZeile = 'const HIST_LEAGUES = ' + JSON.stringify(HIST) + '; LEAGUES.push(...HIST_LEAGUES);';
const navZeile = 'const NAV = ' + JSON.stringify(NAV) + ';';
if (/^const NAV = .*$/m.test(s)) ersetze(/^const NAV = .*$/m, navZeile, 'NAV');
else ersetze(/^const CURRENT_SHORT = .*;$/m, m => m + '\n' + navZeile, 'NAV-Anker');
if (/^const HIST_LEAGUES = .*$/m.test(s)) ersetze(/^const HIST_LEAGUES = .*$/m, histZeile, 'HIST_LEAGUES');
else ersetze(/^const LEAGUES = .*;$/m, m => m + '\n' + histZeile, 'LEAGUES');
fs.writeFileSync(EDITOR, s);
console.log(`Editor aktualisiert: ${HIST.length} historische Ligen in ${abschnitte.length} Abschnitten, ${Object.keys(App.LEAGUE_SHORT).length} Kürzel im App-Stand.`);
abschnitte.forEach(([k]) => { const L = HIST.filter(h => h.gid.startsWith('h:' + k));
    console.log('  ' + label(k) + ': ' + L.length + ' Ligen, Reihen bis ' + Math.max(...L.map(h => h.block)) + ' nebeneinander'); });
})().catch(e => { console.error(e); process.exit(1); });
