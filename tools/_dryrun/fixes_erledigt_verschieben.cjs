// FIXES_OFFEN.md aufräumen (01.11.2026, Nutzer „ja 1 und 2“): Punkte mit ✅ am Anfang, die noch im Abschnitt „❌ Offen“ stehen, in die
// Erledigt-Tabelle verschieben (im Sheet stehen sie schon als ✅ – das Spiegelskript liest das Zeichen als Status). „noch nicht gebaut
// (nach v0.8.228.5x)“ wird durch die Version ersetzt, mit der der Punkt laut CHANGELOG.md ausgeliefert wurde. Unterpunkte (eingerückt,
// „- ✅ …“) gehen in dieselbe Tabellenzeile. Zeichen „|“ im Text werden zu „/“ (Tabellentrenner).
//   node tools/_dryrun/fixes_erledigt_verschieben.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../FIXES_OFFEN.md');
const t = fs.readFileSync(P, 'utf8'), nl = t.includes('\r\n') ? '\r\n' : '\n', L = t.split(nl);
const GEBAUT = [[/^DDR-Liga 1990\/91 ohne Folgesaison/, 'v0.8.228.53'], [/^Letzte Saison der Oberliga als Dritte Liga/, 'v0.8.228.52'],
    [/^NRW-Liga ist in ihrer Pyramide eingesperrt/, 'v0.8.228.51']];
const oStart = L.findIndex(l => l.startsWith('## ❌ Offen')), oEnde = L.findIndex((l, i) => i > oStart && l.startsWith('## '));
const eKopf = L.findIndex(l => l.startsWith('## ✅ Erledigt')), eTab = L.findIndex((l, i) => i > eKopf && /^\|---/.test(l));
if (oStart < 0 || oEnde < 0 || eKopf < 0 || eTab < 0) throw new Error('Abschnitte nicht gefunden');
const raus = new Set(), zeilen = [];
for (let i = oStart; i < oEnde; i++) {
    if (!L[i].startsWith('- ✅ ')) continue;
    let text = L[i].slice(4).trim(); raus.add(i);
    const unter = [];
    for (let j = i + 1; j < oEnde && /^\s+- /.test(L[j]); j++) { unter.push(L[j].replace(/^\s+- ✅?\s*/, '')); raus.add(j); }
    const k = text.indexOf(' – ');
    let punkt = k > 0 ? text.slice(0, k) : text, beleg = k > 0 ? text.slice(k + 3) : '';
    for (const [re, v] of GEBAUT) if (re.test(punkt)) beleg = beleg.replace(/noch nicht gebaut \(nach v[\d.]+\)/, v).replace(new RegExp('^(?!' + v.replace(/\./g, '\\.') + ')'), v + ' – ');
    if (unter.length) punkt += ' · dazu: ' + unter.join(' · ');
    zeilen.push(`| ${punkt.replace(/\|/g, '/')} | ${beleg.replace(/\|/g, '/')} |`);
}
console.log(zeilen.length, "Punkte:"); zeilen.forEach(z => console.log("  " + (process.argv.includes("--voll") ? z : z.slice(0, 150))));
if (process.argv.includes('--schreiben')) {
    const neu = L.filter((l, i) => !raus.has(i)); const e = neu.findIndex((l, i) => i > neu.findIndex(x => x.startsWith('## ✅ Erledigt')) && /^\|---/.test(l));
    neu.splice(e + 1, 0, ...zeilen); fs.writeFileSync(P, neu.join(nl)); console.log('geschrieben');
}
