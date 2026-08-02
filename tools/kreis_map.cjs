/**
 * Fussballkreis -> Staffel ableiten.
 *
 * Hintergrund: europlans Liganamen tragen die Staffel nur oberhalb der Kreisebene
 * ("Bezirksliga Suedwest Rheinhessen"). Darunter steht der FUSSBALLKREIS im Namen
 * ("A-Klasse Rhein-Pfalz"), und der ist nicht der amtliche Kreis: Eisenberg liegt amtlich
 * im Donnersbergkreis, spielt aber im Fussballkreis Rhein-Pfalz.
 *
 * Verknuepfung ueber Vereine mit mehreren Mannschaften: spielt die Erste eines Vereins in
 * einer Liga MIT Staffel im Namen und die Zweite in einer Kreisliga, ist der Kreis dieser
 * Staffel zugeordnet. Mehrheit entscheidet, Gleichstand wird gemeldet statt geraten.
 *
 *   node tools/kreis_map.cjs                Bericht ueber alle Verbaende
 *   node tools/kreis_map.cjs Suedwest       nur ein Verband (Argument = Schluessel unten)
 *   node tools/kreis_map.cjs --json         schreibt tools/kreis_map.json
 */
const fs   = require('fs');
const path = require('path');
const JSONOUT = process.argv.includes('--json');

const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'europlan_stadiums.json'), 'utf8'));

// Staffelvokabular je Verband, so wie es in game_data.js steht. Bewusst von Hand: es sind
// wenige Zeilen, und eine falsche Automatik hier verschiebt spaeter Polygongrenzen.
const STAFFELN = {
  'Suedwest':          ['Nahe', 'Rheinhessen', 'Vorderpfalz', 'Westpfalz'],
  'Rheinland':         ['Rheinland Mitte', 'Rheinland Ost', 'Rheinland West'],
  'Saarland':          ['Saarland Nord-Ost', 'Saarland Süd-West'],
  'Hessen':            ['Hessen Nord', 'Hessen Mitte', 'Hessen Süd'],
  'Bayern':            ['Bayern Nordwest', 'Bayern Nordost', 'Bayern Mitte', 'Bayern Südwest', 'Bayern Südost'],
  'Niedersachsen':     ['Braunschweig', 'Hannover', 'Lüneburg', 'Weser-Ems'],
  'Schleswig-Holstein':['Schleswig', 'Holstein'],
  'Hamburg':           ['Hammonia', 'Hansa'],
  // NICHT verwendbar: Westfalen, Mittelrhein und Niederrhein. Unsere Labels tragen eine
  // Nummer, die WIR vergeben haben ("Westfalen 1 (Münsterland/OWL)"), europlan nummeriert
  // aber seine Ligagruppen genauso - es gibt "Bezirksliga Westfalen 1" bis "… 12". Der
  // Namensvergleich hielt beides fuer dasselbe und ordnete Bielefeld nach Suedwestfalen und
  // Bochum ins Muensterland. Fuer diese drei braeuchte es eine Zuordnung von Hand.
};

// Von Hand entschieden, wo die Mehrheit nicht traegt. Jede Zeile braucht einen Grund.
const MANUELL = {
  // Gleichstand Rheinhessen 2 : Vorderpfalz 2 bei nur 4 Belegen. Der Kreis Rhein-Pfalz ist
  // Ludwigshafen/Speyer und damit eindeutig Vorderpfalz; die zwei Rheinhessen-Belege sind
  // Vereine am Rhein, deren zweite Mannschaft drueben spielt. Deckt sich mit der Beobachtung
  // des Nutzers, dass Eisenberg (Fussballkreis Rhein-Pfalz) nach Vorderpfalz gehoert.
  'Rhein-Pfalz': { verband: 'Suedwest', staffel: 'Vorderpfalz' },
};

const MIN_BELEGE = 3;   // schwaechere Mehrheiten sind nicht belastbar
const KREIS_RE = /^(?:A|B|C|D)-Klasse |^Kreisliga (?:[A-D]\d*|[A-D]) |^Kreisoberliga |^Kreisklasse /;
const kreisOf = n => n.replace(/\s*\(\d+\)\s*$/, '')
                      .replace(KREIS_RE, '')
                      .replace(/\s+(Nord|Süd|Sued|Ost|West|Nordost|Nordwest|Südost|Südwest|[IVX]+|\d+)$/, '')
                      .trim();
const basisName = n => n.replace(/\(ground[^)]*\)/ig, '').replace(/\s+(II|III|IV)\s*$/, '').trim();
// Staffel im Liganamen finden. Klammerzusaetze der Labels ignorieren: unser
// "Westfalen 1 (Münsterland/OWL)" heisst bei europlan schlicht "Westfalen 1".
const kern = s => s.replace(/\s*\([^)]*\)\s*/g, '').trim();

const eps = [];
for (const arr of Object.values(cache.ligaTeams)) for (const t of arr) eps.push(t);

const proVerein = new Map();
for (const e of eps) {
  const b = basisName(e.teamName);
  if (!proVerein.has(b)) proVerein.set(b, new Set());
  proVerein.get(b).add(e.ligaName);
}

const nurVerband = process.argv.find(a => !a.startsWith('-') && STAFFELN[a]);
const ergebnis = {};
for (const [verband, labels] of Object.entries(STAFFELN)) {
  if (nurVerband && verband !== nurVerband) continue;
  const treffer = {};
  for (const ligen of proVerein.values()) {
    const ls = [...ligen];
    const kreise = [...new Set(ls.filter(l => KREIS_RE.test(l)).map(kreisOf))];
    if (!kreise.length) continue;
    const staffeln = [];
    for (const l of ls) {
      if (KREIS_RE.test(l)) continue;
      for (const lb of labels) if (l.includes(kern(lb))) staffeln.push(lb);
    }
    for (const k of kreise) for (const s of new Set(staffeln))
      (treffer[k] = treffer[k] || {})[s] = (treffer[k][s] || 0) + 1;
  }
  ergebnis[verband] = treffer;
}

let sicher = 0, strittig = 0;
for (const [verband, treffer] of Object.entries(ergebnis)) {
  const zeilen = Object.entries(treffer).sort();
  if (!zeilen.length) continue;
  console.log('=== ' + verband + ' (' + zeilen.length + ' Kreise) ===');
  for (const [k, v] of zeilen) {
    const s = Object.entries(v).sort((a, b) => b[1] - a[1]);
    // Mindestens MIN_BELEGE Vereine muessen den Kreis stuetzen. Bei zwei Belegen kippte
    // "Rees-Bocholt" nach Niederrhein 1 (Sued), obwohl beide Orte im Norden liegen.
    const ok = s[0][1] >= MIN_BELEGE && (s.length === 1 || s[0][1] >= 2 * s[1][1]);
    if (ok) sicher++; else strittig++;
    console.log('   ' + (ok ? '  ' : '? ') + k.padEnd(32).slice(0, 32) +
                s.map(([l, n]) => l + ' ' + n).join('  |  '));
  }
  console.log();
}
console.log('eindeutig: ' + sicher + ' | strittig: ' + strittig);
if (JSONOUT) {
  const flach = {};
  for (const [verband, treffer] of Object.entries(ergebnis))
    for (const [k, v] of Object.entries(treffer)) {
      const s = Object.entries(v).sort((a, b) => b[1] - a[1]);
      if (s[0][1] >= MIN_BELEGE && (s.length === 1 || s[0][1] >= 2 * s[1][1])) flach[k] = { verband, staffel: s[0][0], belege: s[0][1] };
    }
  for (const [k, v] of Object.entries(MANUELL))
    if (!nurVerband || v.verband === nurVerband) flach[k] = { ...v, belege: 'manuell' };
  fs.writeFileSync(path.join(__dirname, 'kreis_map.json'), JSON.stringify(flach, null, 1));
  console.log('Datei: tools/kreis_map.json (' + Object.keys(flach).length + ' eindeutige Kreise)');
}
