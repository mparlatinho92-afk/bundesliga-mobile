// ID-Anker nachziehen (25.10.2026, s. tools/historie_einbau.mjs Abschnitt 0): vergleicht die fertige app/history_ext.js mit git HEAD
// und ergaenzt tools/hist_id_anker.json um Faelle, die der Eingangsvergleich nicht sieht:
//   (a) eine GANZ NEUE ID (gab es in HEAD nicht) uebernimmt Zeilen genau einer alten ID -> neu -> alt
//       (die Zusammenlegung 1d zieht sonst eine alte hist_fb_-ID zur neuen hist_fa_-ID: BC Adlershof)
//   (b) Eingangs-Konflikte (tools/_dryrun/anker_konflikte.txt) ohne „bleibt“: mehrere alte IDs, die HEAD schon zu EINER
//       zusammengelegt hatte -> neu -> diese eine (Romonta Amsdorf, Babelsberg II)
// Alles andere bleibt stehen und gehoert auf die Pruefliste. Danach historie_einbau.mjs erneut laufen lassen, bis nichts dazukommt.
//   node tools/hist_anker_nachziehen.cjs
const fs = require('fs'), path = require('path'), zlib = require('zlib'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const lade = src => { const g = {}; new Function('g', src + ';g.HIST_EXT = HIST_EXT;')(g); const H = g.HIST_EXT;
    return JSON.parse(zlib.gunzipSync(Buffer.from(H.gz, 'base64')).toString()); };
const alt = lade(execSync('git show HEAD:app/history_ext.js', { cwd: ROOT, maxBuffer: 64 << 20 }).toString());
const neu = lade(fs.readFileSync(path.join(ROOT, 'app/history_ext.js'), 'utf8'));
const key = (t, r, i) => `${t.y}|${t.lid}|${r.g || ''}|${r.rank}|${i}`;
const A = {}; alt.forEach(t => t.rows.forEach((r, i) => { A[key(t, r, i)] = r.id; }));
const altIds = new Set(Object.values(A));
const paare = {};   // neue ID -> {alte ID: n}
const selbst = {};
neu.forEach(t => t.rows.forEach((r, i) => { const a = A[key(t, r, i)]; if (!a) return;
    if (a === r.id) selbst[r.id] = (selbst[r.id] || 0) + 1; else { const p = paare[r.id] = paare[r.id] || {}; p[a] = (p[a] || 0) + 1; } }));
const DATEI = path.join(__dirname, 'hist_id_anker.json');
const anker = JSON.parse(fs.readFileSync(DATEI, 'utf8')); anker._namen = anker._namen || {};
const BASIS = JSON.parse(fs.readFileSync(path.join(__dirname, '_dryrun/anker_basis.json'), 'utf8')).vereine;
const setze = (n, a) => { anker[n] = a; if (BASIS[a]) anker._namen[a] = BASIS[a]; };
let dazu = 0; const rest = [];
for (const [n, p] of Object.entries(paare)) {
    const ziele = Object.keys(p);
    if (ziele.length === 1 && !altIds.has(n) && !selbst[n] && !anker[n]) { setze(n, ziele[0]); dazu++; }
    else rest.push(`${n} <- ${ziele.map(z => z + ' x' + p[z]).join(', ')}${altIds.has(n) ? ' (ID gab es schon)' : ''}${selbst[n] ? ' bleibt x' + selbst[n] : ''}`);
}
// (b) Eingangs-Konflikte: "neu (Name) war: a xN, b xM" ohne "bleibt" -> HEAD-Ergebnis dieser Zeilen, wenn eindeutig
const KONF = path.join(__dirname, '_dryrun/anker_konflikte.txt');
if (fs.existsSync(KONF)) for (const z of fs.readFileSync(KONF, 'utf8').split('\n').filter(Boolean)) {
    const m = z.match(/^(\S+) .* war: (.*)$/); if (!m || /bleibt/.test(m[2]) || anker[m[1]]) continue;
    const p = paare[m[1]]; if (p && Object.keys(p).length === 1 && !selbst[m[1]]) { setze(m[1], Object.keys(p)[0]); dazu++; }
}
fs.writeFileSync(DATEI, JSON.stringify(anker, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(__dirname, '_dryrun/anker_rest.txt'), rest.join('\n') + '\n', 'utf8');
console.log(`Anker: +${dazu} (jetzt ${Object.keys(anker).length - 2}), uebrig ${rest.length} -> tools/_dryrun/anker_rest.txt`);
