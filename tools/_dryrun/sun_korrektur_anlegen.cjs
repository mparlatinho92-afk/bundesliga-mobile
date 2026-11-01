// Legt tools/hist_sun_korrektur.json an (01.11.2026, Nutzer „ja“ zur Liste aus abweichung_bewerten.cjs): 15 Zeilen, in denen die
// abweichende Quelle Spiele + Punkte laut f-archiv ergibt, der gewählte Wert nicht (und die Tabellensumme nicht dagegen spricht).
//   node tools/_dryrun/sun_korrektur_anlegen.cjs
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const A = JSON.parse(fs.readFileSync(path.join(T, 'hist_quellen_abweichung.json'), 'utf8')).zeilen;
const WAHL = [   // saison, Verein, neu, Quelle, Beleg
    ['1970/71', 'ISG Lippendorf', '12-10-8', 'fussball-ddr.de', '30 Spiele, 34:26 Punkte (Wikipedia 12-10-9 = 31 Spiele)'],
    ['1972/73', 'Fortschritt Groitzsch', '10-6-14', 'fussball-ddr.de', '30 Spiele, 26:34 Punkte'],
    ['1974/75', 'Dynamo Frankfurt/O II', '8-6-12', 'fussball-ddr.de', '26 Spiele, 22:30 Punkte'],
    ['1979/80', 'Blumenthaler SV', '4-6-24', 'ifosta', '34 Spiele, 14:54 Punkte, Tabellensumme ausgeglichen'],
    ['1987/88', 'Meiendorfer SV', '17-10-3', 'Wikipedia', '30 Spiele, 44:16 Punkte, Tabellensumme ausgeglichen'],
    ['1988/89', 'ASV Bergedorf 85', '10-11-9', 'Wikipedia', '30 Spiele, 31:29 Punkte, Tabellensumme ausgeglichen'],
    ['1991/92', 'Buxtehuder SV', '8-5-17', 'Wikipedia', '30 Spiele, 21:39 Punkte'],
    ['1992/93', 'VfB Lübeck', '25-3-2', 'Wikipedia', 'f-archiv-Zeile kaputt („8923-537-2“, Punkte = Spiele), Wikipedia ergibt 30 Spiele'],
    ['1998/99', 'SG Hoechst', '18-7-3', 'Wikipedia + ifosta', '28 Spiele, 61 Punkte, Tabellensumme ausgeglichen'],
    ['1999/2000', '1.SC Norderstedt', '10-6-18', 'Wikipedia', '34 Spiele, 36 Punkte; mit Osnabrück + Lübeck zusammen Tabellensumme ausgeglichen'],
    ['1999/2000', 'VfL Osnabrück', '22-8-4', 'Wikipedia', '34 Spiele, 74 Punkte'],
    ['1999/2000', 'VfB Lübeck', '21-7-6', 'Wikipedia', '34 Spiele, 70 Punkte'],
    ['2003/04', 'SV Lurup', '12-10-12', 'Wikipedia', '34 Spiele, 46 Punkte (gewählt 35 Spiele)'],
    ['2006/07', 'ASV Bergedorf 85', '12-6-16', 'ifosta', '34 Spiele, 42 Punkte, Tabellensumme ausgeglichen'],
    ['2006/07', 'Germania Halberstadt', '10-7-13', 'ifosta', '30 Spiele, 37 Punkte, Tabellensumme ausgeglichen'],
];
const out = { _hinweis: 'S/U/N-Korrekturen mit Beleg (tools/_dryrun/abweichung_bewerten.cjs). historie_dryrun.mjs setzt sie zuletzt; der ersetzte Wert '
    + 'bleibt in tools/hist_quellen_abweichung.json. Schlüssel: Saison|Liga-ID|Platz|Verein laut Quelle.' };
for (const [saison, verein, neu, quelle, beleg] of WAHL) {
    const e = A.filter(e => e.saison === saison && e.verein === verein);
    if (e.length !== 1) throw new Error(`${saison} ${verein}: ${e.length} Einträge`);
    const [s, u, n] = neu.split('-').map(Number), a = e[0].abweichend.find(a => a.s === s && a.u === u && a.n === n);
    if (!a) throw new Error(`${saison} ${verein}: ${neu} steht nicht unter den Abweichungen`);
    out[`${e[0].saison}|${e[0].lid}|${e[0].platz}|${e[0].verein}`] = { s, u, n, vorher: `${e[0].gewaehlt.s}-${e[0].gewaehlt.u}-${e[0].gewaehlt.n}`, quelle, beleg };
}
fs.writeFileSync(path.join(T, 'hist_sun_korrektur.json'), JSON.stringify(out, null, 1) + '\n');
console.log('tools/hist_sun_korrektur.json:', Object.keys(out).length - 1, 'Zeilen');
