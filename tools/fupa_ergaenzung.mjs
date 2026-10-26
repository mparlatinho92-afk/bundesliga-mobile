// Einzelne Staffeln, die in den Quellen fehlen, aus der FuPa-API (nur lesend) -> tools/fupa_ergaenzung.json
//
//   node tools/fupa_ergaenzung.mjs      danach die Kette ab tools/farchiv_ebenen.mjs (bzw. ab tools/fbde_ebene58.mjs)
//
// Zwei Ziele, je nachdem, welcher Weg die Liga in dieser Saison baut:
//   fbde    – Zeilen im Spaltenformat von <verband>/tabellen.csv, tools/fbde_ebene58.mjs haengt sie an die Datei des Verbands an
//   farchiv – Tabellen im Format der f-archiv-CSV, tools/farchiv_ebenen.mjs liest sie nach den CSV-Dateien (nur wenn f-archiv die Seite
//             nicht selbst hat)
// Beide laufen durch dieselbe Zuordnung wie die eigentliche Quelle. JSON statt CSV: *.csv ist von Git ausgeschlossen.
// Anlass (26.10.2026): Verbandsliga Saar Sued/West 2020/21 ist bei fussball.de nicht mehr im Menue (Saisonauswahl der Mannschaften
// reicht nur bis 2021/22); Landesliga Bayern Mitte 2002-04 (f-archiv endet 2001/02, fussball.de beginnt 2004/05); Landesliga
// Mittelrhein Staffel 2 1989/90, 1994/95, 1996/97 fehlen im f-archiv.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const UA = 'BundesligaSim/1.0 (research)';
const saisonKurz = s => s.slice(2, 4) + '/' + s.slice(5, 7);                       // 2020-21 -> 20/21
const saisonLang = s => s === '1999-00' ? '1999/2000' : s.slice(0, 4) + '/' + s.slice(5, 7);
const LUECKEN = [
    { ziel: 'fbde', verband: 'saarland', spielklasse: 'Verbandsliga', gebiet: 'Saarland', staffel: 'Verbandsliga Süd / West', fupa: 'verbandsliga-suedwest', seasons: ['2020-21'] },
    { ziel: 'fbde', verband: 'bayern', spielklasse: 'Landesliga', gebiet: 'Bayern', staffel: 'Landesliga Mitte', fupa: 'bayern-landesliga-mitte', seasons: ['2002-03', '2003-04'] },
    { ziel: 'farchiv', league: 'Landesliga Mittelrhein, Staffel 2', fupa: 'landesliga-mittelrhein-staffel-2', seasons: ['1989-90', '1994-95', '1996-97'] },
];
const aus = { _hinweis: 'ERZEUGT von tools/fupa_ergaenzung.mjs – Quelle api.fupa.net/v1/standings', staffeln: [], farchiv: [] };
for (const l of LUECKEN) for (const season of l.seasons) {
    const r = await fetch(`https://api.fupa.net/v1/standings?competition=${l.fupa}&season=${season}`, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`${l.fupa} ${season}: HTTP ${r.status}`);
    const d = await r.json();
    if (!Array.isArray(d.standings) || d.standings.length < 7) throw new Error(`${l.fupa} ${season}: keine Tabelle`);
    const quelle = `https://www.fupa.net/league/${l.fupa}/season/${season}`;
    if (l.ziel === 'fbde') {
        const saison = saisonKurz(season);
        const zeilen = d.standings.map(s => ({
            verband: l.verband[0].toUpperCase() + l.verband.slice(1), saison, spielklasse: l.spielklasse, gebiet: l.gebiet, staffel: l.staffel,
            phase: 'Hauptrunde', platz: s.rank, mannschaft: s.team.name.full, spiele: s.matches, g: s.wins, u: s.draws, v: s.defeats,
            tore: s.ownGoals, gegentore: s.againstGoals, diff: s.goalDifference, punkte: s.points, wertung: 'Punkte', hinweis: '',
            staffel_id: `fupa:${l.fupa}:${season}` }));
        aus.staffeln.push({ verband: l.verband, quelle, text: d.text || '', zeilen });
    } else {
        const saison = saisonLang(season);
        const zeilen = d.standings.map(s => ({ url: quelle, title: `${l.league}  ${saison}`, season: saison, league: l.league, platz: String(s.rank),
            verein: s.team.name.full, spiele: String(s.matches), siege: String(s.wins), unent: String(s.draws), nieder: String(s.defeats),
            tore: `${s.ownGoals}:${s.againstGoals}`, punkte: String(s.points), notes: '' }));
        aus.farchiv.push({ quelle, text: d.text || '', zeilen });
    }
    console.log(`${l.ziel} ${season} ${l.staffel || l.league}: ${d.standings.length} Vereine, Erster ${d.standings[0].team.name.full}${d.text ? ' – ' + d.text : ''}`);
}
fs.writeFileSync(path.join(DIR, 'fupa_ergaenzung.json'), JSON.stringify(aus, null, 1) + '\n');
console.log('-> tools/fupa_ergaenzung.json');
