// Liga-Lücke 1990/91 (01.11.2026): Bezirksliga Cottbus und Dresden 1990/91 fehlen in f-archiv und Wikipedia, stehen aber auf
// fussball-ddr.de – schon geladen in tools/_dryrun/fddr_saisons.json (tools/fddr_saisons.mjs), MIT S/U/N.
// Schreibt sie im CSV-Format der f-archiv-Datei als weitere Lieferung für tools/farchiv_ebenen.mjs und hält den Vorjahresplatz
// fest, den fussball-ddr.de in Klammern nennt („Chemie Döbern ( 8 )“ = 1989/90 Achter, „( N )“ = Neuling): damit ist jeder Verein
// 1990/91 mit seiner Zeile 1989/90 verbunden, auch unter neuem Namen (tools/_dryrun/fddr_vorjahr.json, ausgewertet im Einbau-Abgleich).
//   node tools/fddr_ergaenzung.mjs   → tools/fddr_ergaenzung.csv (+ tools/_dryrun/fddr_vorjahr.json)
//   node tools/farchiv_ebenen.mjs ~/Downloads/farchiv_output/alle_tabellen_final.csv tools/wiki_ergaenzung.csv tools/fddr_ergaenzung.csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const SEITEN = [['h3d-cottbus-bezirksliga', '1990/91', 'Bezirksliga Cottbus'], ['h3d-dresden-bezirksliga', '1990/91', 'Bezirksliga Dresden']];
const FD = JSON.parse(fs.readFileSync(path.join(DIR, '_dryrun/fddr_saisons.json'), 'utf8'));
const q = s => /[",]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
const zeilen = ['url,title,season,league,platz,verein,spiele,siege,unent,nieder,tore,punkte,notes'], vorjahr = {};
for (const [lid, y, liga] of SEITEN) {
    const s = FD.find(x => x.lid === lid && x.y === y);
    if (!s || s.tabellen.length !== 1) throw new Error(`${lid} ${y}: ${s ? s.tabellen.length + ' Tabellen' : 'fehlt'}`);
    s.tabellen[0].rows.forEach(([roh, sp, si, un, ni, gf, ga], i) => {
        // Quellfehler: Cottbus 1990/91 hat 137 Siege, aber 138 Niederlagen – Großräschen 6-5-16 ergibt 27 statt 26 Spiele → 6-5-15
        if (lid === 'h3d-cottbus-bezirksliga' && /Großräschen/.test(roh) && si === 6 && un === 5 && ni === 16) ni = 15;
        const m = roh.match(/^(.*?)\s*\(\s*(N|\d+)\s*\)\s*\*?\s*$/);
        if (!m) throw new Error(`${lid}: Vorjahresplatz fehlt in „${roh}“`);
        const verein = m[1].replace(/\bIl\b/, 'II').trim();          // Texterkennung: „Stahl Riesa Il“
        if (si + un + ni !== sp) throw new Error(`${lid}: ${verein} S/U/N ${si}+${un}+${ni} ≠ ${sp}`);
        zeilen.push([s.url, liga + ' ' + y, y, liga, i + 1, verein, sp, si, un, ni, `${gf}:${ga}`, `${2 * si + un}:${2 * ni + un}`, 'fussball-ddr.de'].map(q).join(','));
        vorjahr[`${lid}|${y}|${verein}`] = m[2] === 'N' ? null : +m[2];
    });
    console.log(lid, y, s.tabellen[0].rows.length, 'Zeilen');
}
fs.writeFileSync(path.join(DIR, 'fddr_ergaenzung.csv'), zeilen.join('\n') + '\n');
fs.writeFileSync(path.join(DIR, '_dryrun/fddr_vorjahr.json'), JSON.stringify(vorjahr, null, 1));
console.log('tools/fddr_ergaenzung.csv:', zeilen.length - 1, 'Zeilen,', Object.values(vorjahr).filter(v => v != null).length, 'mit Vorjahresplatz');
