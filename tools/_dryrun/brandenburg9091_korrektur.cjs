// Verbandsliga Brandenburg 1990/91 (01.11.2026): f-archiv hat die Namen gegen Punkte/Tore verschoben (Meister „Optik Rathenow“, Platz 6
// fehlt), RSSF ddr91 hat die richtigen Namen (Meister PCK Schwedt, auch laut Wikipedia Brandenburg-Liga), aber drei Tippfehler bei den Toren
// (Summe 471:455). Gleiche Punktefolge in beiden Quellen → Tore von f-archiv für Platz 1, 9, 10 → 473:473. Schreibt die Tabelle an
// tools/farchiv_korrektur.csv an (immer letzte Datei, ersetzt die gleiche Staffel gezielt).
//   node tools/_dryrun/brandenburg9091_korrektur.cjs
const fs = require('fs'), path = require('path');
const DATEI = path.join(__dirname, '..', 'farchiv_korrektur.csv');
const URL = 'https://rsssf.org/tablesd/ddr91.html#brandenburg-korrektur';
const T = [   // Platz, Verein 1990/91 (RSSF), Punkte (2-Punkte-Regel, Plus), Tore
    [1, 'FSV PCK Schwedt', 35, '51:29'], [2, 'FSV Velten 90', 34, '52:25'], [3, 'FSV Optik Rathenow', 33, '50:19'],
    [4, 'SG Falkensee/Finkenkrug', 30, '46:33'], [5, 'SV Empor Mühlberg', 29, '41:36'], [6, 'ESV Cottbus', 27, '43:29'],
    [7, 'TSV Premnitz/BSC Süd 05', 26, '38:23'], [8, 'SG Müncheberg', 23, '31:36'], [9, 'SV Stahl Finow', 20, '31:44'],
    [10, 'TSG Lübbenau 63', 18, '21:39'], [11, 'FC Elsterwerda', 16, '22:37'], [12, 'FC Preußen Frankfurt', 13, '26:61'],
    [13, 'TuS Neuruppin', 8, '21:62'],
];
const gf = T.reduce((a, r) => a + +r[3].split(':')[0], 0), ga = T.reduce((a, r) => a + +r[3].split(':')[1], 0);
if (gf !== ga) throw new Error(`Tore ${gf}:${ga}`);
if (T.reduce((a, r) => a + r[2], 0) !== 13 * 24) throw new Error('Punktsumme');
let t = fs.readFileSync(DATEI, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
if (t.includes(URL)) { console.log('schon drin'); process.exit(0); }
if (!t.endsWith(nl)) t += nl;
t += T.map(([p, v, pk, to]) => [URL, 'Verbandsliga Brandenburg 1990/91', '1990/91', 'Verbandsliga Brandenburg', p, v, 24, '', '', '', to, `${pk}:${48 - pk}`, 'RSSF ddr91 + Tore f-archiv'].join(',')).join(nl) + nl;
fs.writeFileSync(DATEI, t); console.log('Brandenburg 1990/91: 13 Zeilen an farchiv_korrektur.csv, Tore', gf + ':' + ga);
