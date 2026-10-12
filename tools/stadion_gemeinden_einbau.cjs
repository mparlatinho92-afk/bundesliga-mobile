// Schreibt die Gemeinde-Zuordnung aus tools/stadion_gemeinden.json in game_data.js:
// je Spielstaette  gem (Gemeindename), ags (Amtlicher Gemeindeschluessel), ew (Einwohner).
// Erzeugt von  python tools/stadion_gemeinden.py  (Quelle BKG VG250-EW).
// Nach einer Koordinaten-Korrektur beide Schritte wiederholen.
//
//   node tools/stadion_gemeinden_einbau.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GD = path.join(ROOT, 'game_data.js'), PRE = 'const GAME_DATA = ';

const src = fs.readFileSync(GD, 'utf8');
if (!src.startsWith(PRE)) throw new Error('game_data.js beginnt nicht mit "' + PRE + '"');
const data = JSON.parse(src.slice(PRE.length, src.lastIndexOf(';')));
if (PRE + JSON.stringify(data) + src.slice(src.lastIndexOf(';')) !== src)
    throw new Error('game_data.js ist kein reines JSON - Rundreise wuerde etwas veraendern');

const zu = JSON.parse(fs.readFileSync(path.join(__dirname, 'stadion_gemeinden.json'), 'utf8')).venues;
let gesetzt = 0, ohne = 0, geaendert = 0;
for (const [tid, t] of Object.entries(data.teams)) {
    (t.venues || []).forEach((v, i) => {
        const e = zu[tid] && zu[tid][i];
        if (!e || e.stadName !== v.stadName) {               // Stadion verschoben/umbenannt -> alte Werte weg
            if (v.gem) { delete v.gem; delete v.ags; delete v.ew; geaendert++; }
            ohne++; return;
        }
        if (v.gem !== e.gem || v.ags !== e.ags || v.ew !== e.ew) geaendert++;
        v.gem = e.gem; v.ags = e.ags; v.ew = e.ew; gesetzt++;
    });
}
fs.writeFileSync(GD, PRE + JSON.stringify(data) + src.slice(src.lastIndexOf(';')));
console.log(`${gesetzt} Spielstaetten mit Gemeinde, ${ohne} ohne, ${geaendert} geaendert -> game_data.js`);
