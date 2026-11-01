// „ZURÜCK“-Fälle des Rückzug-Scans (31.10.2026): Verein steht als „↘ Rückzug“, spielt aber in der übernächsten Saison wieder auf
// derselben Ebene. Warum fehlt er in der Folgesaison? Je Fall:
//   LIGA_FEHLT    – die Liga hat in der Folgesaison gar keine Tabelle (Datenlücke, alle ihre Vereine wären „Rückzug“)
//   TABELLE_KURZ  – Tabelle da, aber deutlich weniger Zeilen als in Vor- und Nachsaison (unvollständige Quelle)
//   STAFFEL       – Liga da und vollständig, Verein steht in der Folgesaison in KEINER Tabelle, die Ebene hat dort aber
//                   weniger Ligen als sonst (Nachbarstaffel fehlt)
//   VEREIN_FEHLT  – alles vollständig, nur der Verein fehlt (echter Abstieg in eine Liga außerhalb der Daten / Rückzug)
//   node tools/_dryrun/zurueck_analyse.cjs   → tools/_dryrun/zurueck_analyse.txt
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const ROOT = path.join(__dirname, '../../');
const c = {}; vm.createContext(c);
['game_data.js', 'app/history_ext.js'].forEach(f => vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), c));
const T = JSON.parse(zlib.gunzipSync(Buffer.from(c.HIST_EXT.gz, 'base64')));
const B = JSON.parse(fs.readFileSync(path.join(__dirname, 'rueckzug_scan.json'), 'utf8'));
const nx = y => { const a = parseInt(y) + 1; return a + '/' + (a === 1999 ? '2000' : String((a + 1) % 100).padStart(2, '0')); };
const key = {}, ligenJeEbene = {};
T.forEach(t => { key[t.y + '|' + t.lid] = t; });
const lvl = lid => { const m = lid.match(/^h?(\d)/); return m ? +m[1] : 9; };
T.forEach(t => { const k = t.y + '|' + lvl(t.lid) + '|' + (t.lid.startsWith('h') && /^h\dd-/.test(t.lid) ? 'ddr' : 'brd'); ligenJeEbene[k] = (ligenJeEbene[k] || 0) + 1; });
const zeilen = t => t ? t.rows.length : 0;
const imJahr = {}; T.forEach(t => t.rows.forEach(r => { (imJahr[t.y] = imJahr[t.y] || new Set()).add(r.id); }));
const Z = B.filter(b => b.zurueck), out = {};
for (const b of Z) {
    const s1 = nx(b.y), s2 = nx(s1), t0 = key[b.y + '|' + b.lid], t1 = key[s1 + '|' + b.lid], t2 = key[s2 + '|' + b.lid];
    const ost = /^h\dd-/.test(b.lid) ? 'ddr' : 'brd', L = lvl(b.lid);
    const n0 = ligenJeEbene[b.y + '|' + L + '|' + ost] || 0, n1 = ligenJeEbene[s1 + '|' + L + '|' + ost] || 0, n2 = ligenJeEbene[s2 + '|' + L + '|' + ost] || 0;
    let k;
    if (!t1) k = 'LIGA_FEHLT';
    else if (zeilen(t1) < 0.8 * Math.min(zeilen(t0), zeilen(t2) || zeilen(t0))) k = 'TABELLE_KURZ';
    else if (n1 < Math.min(n0, n2)) k = 'STAFFEL';
    else k = 'VEREIN_FEHLT';
    const r0 = t0.rows.find(r => r.id === b.id) || {};
    (out[k] = out[k] || []).push(`${b.y} ${b.lid}  ${b.name}  Platz ${r0.rank}/${zeilen(t0)}  Tabellen ${zeilen(t0)}/${zeilen(t1)}/${zeilen(t2)}  Ligen Ebene ${n0}/${n1}/${n2}  übernächste ${b.n2}`);
}
const txt = Object.entries(out).map(([k, v]) => `== ${k}: ${v.length}\n` + v.join('\n')).join('\n\n');
fs.writeFileSync(path.join(__dirname, 'zurueck_analyse.txt'), `${Z.length} ZURÜCK-Fälle\n\n` + txt + '\n');
console.log(Z.length, 'Fälle:', Object.entries(out).map(([k, v]) => k + ' ' + v.length).join(', '));
