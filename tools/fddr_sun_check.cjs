// S/U/N der DDR-Bezirksligen aus fussball-ddr.de (01.11.2026, historie_dryrun.mjs: letzte Quelle, Platz+Tore+Punkte exakt).
// Prüft app/history_ext.js: (1) höchstens 110 geschätzte Zeilen in den DDR-Bezirksligen (vorher 426),
// (2) keine echte Zeile der 2-Punkte-Ära, deren S/U/N nicht die Punkte ergibt, die es in git HEAD nicht schon gab.
//   node tools/fddr_sun_check.cjs [--selbsttest]   (Selbsttest: prüft den Stand von v0.8.228.63 – muss durchfallen)
const fs = require('fs'), zlib = require('zlib'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const lade = src => { const g = {}; new Function('g', src + ';g.H = HIST_EXT;')(g); return JSON.parse(zlib.gunzipSync(Buffer.from(g.H.gz, 'base64'))); };
const git = rev => execSync(`git show ${rev}:app/history_ext.js`, { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
const T = lade(process.argv.includes('--selbsttest') ? git('abc9abc') : fs.readFileSync(path.join(ROOT, 'app/history_ext.js'), 'utf8'));
const H = lade(git('HEAD'));
const pf = tabs => new Set(tabs.flatMap(t => t.rows.filter(r => !r.e && r.p2 && r.s != null && parseInt(t.y) < 1995 && 2 * r.s + r.u !== r.p2[0]).map(r => t.y + '|' + t.lid + '|' + r.id)));
const est = T.filter(t => /^h3d-.*-bezirksliga$/.test(t.lid)).reduce((a, t) => a + t.rows.filter(r => r.e).length, 0);
const neuFehler = [...pf(T)].filter(k => !pf(H).has(k));
const bef = [];
if (est > 110) bef.push(`DDR-Bezirksligen: ${est} geschätzte Zeilen (Soll ≤ 110, vor fussball-ddr.de 426)`);
if (neuFehler.length) bef.push(`${neuFehler.length} echte Zeilen mit S/U/N ≠ Punkte: ${neuFehler.slice(0, 5).join(', ')}`);
console.log(`DDR-Bezirksligen geschätzt: ${est}`);
console.log(bef.length ? 'BEFUND\n  ' + bef.join('\n  ') : 'Alles gruen');
process.exit(bef.length ? 1 : 0);
