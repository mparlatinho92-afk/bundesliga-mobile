// Rückzug-Scan, Ebenenwechsel (31.10.2026): „↘ Rückzug“, obwohl der Verein in der Folgesaison eine Ebene HÖHER spielt – nur unter
// fremder ID (Sportbund Rosenheim 1977/78 Meister → „SB DJK Rosenheim“ in der Bayernliga). Grundlage ist die Spalte „ähnlich neu“ des
// Scans (Anzeigenamen, gemeinsamer Namensteil, neue ID der Folgesaison auf derselben oder höherer Ebene). Hier nur: Kandidat eine
// Ebene höher, KEINE gemeinsame Saison mit unserer ID, und genau ein solcher Kandidat.
//   node tools/_dryrun/rueckzug_ebenenwechsel.cjs   → tools/_dryrun/rueckzug_ebenenwechsel.txt
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const ROOT = path.join(__dirname, '../../');
const c = {}; vm.createContext(c);
['game_data.js', 'app/history_ext.js'].forEach(f => vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), c));
const T = JSON.parse(zlib.gunzipSync(Buffer.from(c.HIST_EXT.gz, 'base64')));
const B = JSON.parse(fs.readFileSync(path.join(__dirname, 'rueckzug_scan.json'), 'utf8'));
const lvl = lid => { if (/^[123]$/.test(lid)) return +lid; const m = lid.match(/^h?(\d)/); return m ? +m[1] : 9; };
const S = {}, R = {};
T.forEach(t => t.rows.forEach(r => { (S[r.id] = S[r.id] || new Set()).add(parseInt(t.y)); R[t.y + '|' + t.lid + '|' + r.id] = r; }));
const kurz = s => { const a = [...(s || [])].sort((x, z) => x - z); return a.length > 6 ? `${a[0]}–${a[a.length - 1]} (${a.length})` : a.join(' '); };
const out = { hoeher_eindeutig: [], hoeher_mehrere: [], gleich_oder_andere: [] };
for (const b of B) {
    if (!b.neu.length) continue;
    const L = lvl(b.lid), mein = S[b.id] || new Set();
    const k = b.neu.map(s => { const m = s.match(/^(.*) \[([^\]]+)\] in (\S+)$/); return m && { name: m[1], id: m[2], lid: m[3] }; }).filter(Boolean)
        .filter(k => ![...(S[k.id] || [])].some(j => mein.has(j)));
    const hoeher = k.filter(k => lvl(k.lid) === L - 1);
    const r = R[b.y + '|' + b.lid + '|' + b.id] || {};
    const z = `${b.y} ${b.lid}  Platz ${r.rank}  ${b.name} [${b.id}] {${kurz(mein)}}  →  ` + (hoeher.length ? hoeher : k).map(k => `${k.name} [${k.id}] in ${k.lid} {${kurz(S[k.id])}}`).join(' ; ');
    if (hoeher.length === 1) out.hoeher_eindeutig.push(z); else if (hoeher.length > 1) out.hoeher_mehrere.push(z); else out.gleich_oder_andere.push(z);
}
fs.writeFileSync(path.join(__dirname, 'rueckzug_ebenenwechsel.txt'), Object.entries(out).map(([k, v]) => `== ${k}: ${v.length}\n` + v.join('\n')).join('\n\n') + '\n');
console.log(B.length, 'Rückzüge,', B.filter(b => b.neu.length).length, 'mit „ähnlich neu“:', Object.entries(out).map(([k, v]) => k + ' ' + v.length).join(', '));
