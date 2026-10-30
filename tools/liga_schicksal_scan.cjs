// Wo „erzählt“ die Archivtabelle Falsches über das Schicksal der Vereine? (Nutzer 30.10.2026: letzte Saison der Oberliga als
// dritte Liga zeigt „Rückzug“/„Abstieg“, obwohl die Mannschaft in derselben Liga blieb – die Liga selbst rutschte eine Ebene.)
// Je Liga-Saison: wohin geht die MEHRHEIT der Vereine (= Fortsetzung der Liga)? Liegt diese Fortsetzung auf einer anderen
// Ebene als die Liga (statische Ebene, wie _archLevelOf), bewertet die Anzeige alle Verbliebenen als Ab-/Aufsteiger.
//   node tools/liga_schicksal_scan.cjs            Liste nach tools/_dryrun/liga_schicksal.txt
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const ctx = {}; vm.createContext(ctx);
['game_data.js', 'app/history_ext.js'].forEach(f => vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), ctx));
const GD = ctx.GAME_DATA, HX = ctx.HIST_EXT;
const T = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')));
const lvlOf = l => (GD.leagues[l] && GD.leagues[l].level) || (HX.ligen[l] && HX.ligen[l].level) || (l === '1' ? 1 : l === '2' ? 2 : 99);
const nameOf = l => (GD.leagues[l] && GD.leagues[l].name) || (HX.ligen[l] && HX.ligen[l].name) || l;
const sy = y => parseInt(String(y));
// Seed (Ebene 1–2) mit dazu, damit Ebene-3-Vereine ihr Ziel nach oben finden
const seed = ctx.HISTORY_SEED || null;
const byYear = {};
T.forEach(t => (byYear[sy(t.y)] = byYear[sy(t.y)] || []).push(t));
const ligaIn = {};   // year -> id -> lid
for (const [y, ts] of Object.entries(byYear)) { const m = (ligaIn[y] = {}); ts.forEach(t => t.rows.forEach(r => { if (m[r.id] == null || lvlOf(t.lid) < lvlOf(m[r.id])) m[r.id] = t.lid; })); }
const out = [], zaehl = {}, fremd = [];
// Dieselbe Liga unter neuer Ebene? Gleicher Schlüssel ohne Ebenen-Präfix, gemeinsamer/direkter Nachfolger, gleicher Name,
// oder eine Liga, die genau jetzt endet, und eine gleichartige (Gebiet, Region, Kürzel), die genau jetzt beginnt
const NF = HX.ligaNachfolger || {}, HL = HX.ligen || {};
const kern = l => String(l).replace(/^h\d+d?-/, '');
const gleich = (a, b, y) => kern(a) === kern(b) || NF[a] === b || (NF[a] && NF[a] === NF[b]) || nameOf(a) === nameOf(b)
    || (HL[a] && HL[b] && HL[a].lastYear === y && HL[b].firstYear === y + 1 && HL[a].gebiet === HL[b].gebiet && HL[a].region === HL[b].region && HL[a].kurz === HL[b].kurz);
for (const t of T) {
    const y = sy(t.y), nx = ligaIn[y + 1]; if (!nx) continue;
    const ziel = {}; let n = 0;
    t.rows.forEach(r => { const z = nx[r.id]; if (z != null) { ziel[z] = (ziel[z] || 0) + 1; n++; } });
    const [fort, k] = Object.entries(ziel).sort((a, b) => b[1] - a[1])[0] || [];
    if (!fort || k < t.rows.length / 2) continue;   // keine Mehrheit = Liga aufgelöst/aufgeteilt
    const d = lvlOf(fort) - lvlOf(t.lid);
    if (!d) continue;
    if (!gleich(t.lid, fort, y)) { fremd.push(`${t.y}  ${t.lid} -> ${k}/${t.rows.length} in ${fort} ${nameOf(fort)}`); continue; }
    const key = `${d > 0 ? '+' : ''}${d}`; zaehl[key] = (zaehl[key] || 0) + 1;
    out.push(`${t.y}  ${t.lid} ${nameOf(t.lid)} (E${lvlOf(t.lid)}) -> ${k}/${t.rows.length} in ${fort} ${nameOf(fort)} (E${lvlOf(fort)})${t.fe ? '  fe' : ''}`);
}
out.sort();
fs.writeFileSync(ROOT + 'tools/_dryrun/liga_schicksal.txt', out.join('\n') + '\n\nANDERE Liga auf anderer Ebene (Anzeige bleibt Auf-/Abstieg):\n' + fremd.sort().join('\n'));
console.log('andere Liga (bleibt Auf-/Abstieg):', fremd.length);
console.log(`${out.length} Liga-Saisons, deren Fortsetzung auf anderer Ebene steht:`, JSON.stringify(zaehl));
const proJahr = {}; out.forEach(l => { const j = l.slice(0, 7); proJahr[j] = (proJahr[j] || 0) + 1; });
console.log(Object.entries(proJahr).map(([j, c]) => j + ':' + c).join('  '));
