// EINBAU: tools/wiki_europa.json -> app/europa_data.js (erzeugt, nie von Hand ändern)
//
//   node tools/wiki_europa.mjs && node tools/europa_einbau.mjs
//
// Die Europapokal-Startplätze der Bundesliga je Saison. WARUM als Daten und nicht als Regel: die Zahl der
// Plätze und die Wettbewerbe wechselten ständig. 1963/64 und 1968/69 vergab die Liga NUR den Meisterplatz,
// 2021/22 brachte Platz 11 die Champions League (Frankfurt als Europa-League-Sieger), 2023/24 gab es fünf
// CL-Plätze. Die heutige Regel (1–4 CL, 5 EL, 6 ECL) auf alte Saisons anzuwenden wäre in jedem dieser
// Fälle falsch – deshalb steht hier, was tatsächlich galt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_europa.json'), 'utf8'));

// Kurzform -> {Anzeigename, CSS-Klasse der Live-Tabelle}. Qualifikation teilt sich die Farbe mit dem Wettbewerb.
const W = {
    CL:   ['Champions League', 'cl'],
    CLQ:  ['Champions-League-Qualifikation', 'cl'],
    LM:   ['Landesmeister-Pokal', 'cl'],
    EL:   ['Europa League', 'el'],
    ELQ:  ['Europa-League-Qualifikation', 'el'],
    UC:   ['UEFA-Pokal', 'el'],
    UCQ:  ['UEFA-Pokal-Qualifikation', 'el'],
    MP:   ['Messestädte-Pokal', 'el'],
    PS:   ['Pokalsieger-Wettbewerb', 'ecl'],
    ECL:  ['Conference League', 'ecl'],
    ECLQ: ['Conference-League-Qualifikation', 'ecl'],
    IT:   ['Intertoto-Cup', 'ecl'],
};

const saisons = {};
let plaetze = 0, ueberPokal = 0;
const unbekannt = new Set();
for (const [y, p] of Object.entries(D.saisons || {})) {
    const o = {};
    for (const [rang, v] of Object.entries(p)) {
        if (!W[v.w]) { unbekannt.add(v.w); continue; }
        o[rang] = v.pokal ? [v.w, 1] : [v.w];
        plaetze++; if (v.pokal) ueberPokal++;
    }
    if (Object.keys(o).length) saisons[y] = o;
}
if (unbekannt.size) throw new Error('Unbekannte Wettbewerbskuerzel: ' + [...unbekannt].join(', '));

const json = JSON.stringify(saisons);
const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
const jahre = Object.keys(saisons).sort();

const kopf = `// ERZEUGT von tools/europa_einbau.mjs – nicht von Hand ändern.
// Europapokal-Startplätze der Bundesliga je Saison, ${jahre[0]}–${jahre[jahre.length - 1]} (Quelle: Wikipedia,
// die Abschlusstabellen der Saisonartikel). ${jahre.length} Saisons, ${plaetze} Plätze, davon ${ueberPokal} NICHT über die Liga
// erspielt (Pokalsieger/-finalist; im zweiten Feld mit 1 markiert und in der Anzeige entsprechend vermerkt).
//
// KEINE feste Regel: 1963/64 und 1968/69 vergab die Liga nur den Meisterplatz, 2021/22 brachte Platz 11 die
// Champions League (Europa-League-Sieger), 2023/24 gab es fünf CL-Plätze. Die heutige Staffelung wäre für
// jede dieser Saisons falsch.
// Aufbau: saisons["2013/14"] = { "1": ["CL"], "5": ["EL", 1] }   // Rang -> [Wettbewerb, überPokal?]
`;
const out = kopf + 'var EUROPA_SEED = {\n'
    + `    version: ${JSON.stringify(version)},\n`
    + `    wett: ${JSON.stringify(W)},\n`
    + `    saisons: {\n${jahre.map(y => '        ' + JSON.stringify(y) + ': ' + JSON.stringify(saisons[y])).join(',\n')}\n    }\n};\n`;
fs.writeFileSync(path.join(ROOT, 'app/europa_data.js'), out);
console.log(`Saisons ${jahre.length} (${jahre[0]}–${jahre[jahre.length - 1]}) | Plätze ${plaetze} | über den Pokal ${ueberPokal}`);
console.log(`app/europa_data.js ${(out.length / 1024).toFixed(1)} KB, version ${version}`);
