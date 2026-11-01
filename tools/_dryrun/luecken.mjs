// Soll (Ligastruktur Ebene 2-3, 1963-2024) gegen Ist (farchiv_ebene23.json) + Staffelzahl gegen Wikipedia + S/U/N-Schaetzung
import fs from 'fs';
const EB = JSON.parse(fs.readFileSync('tools/farchiv_ebene23.json', 'utf8'));
const W = JSON.parse(fs.readFileSync('tools/staffeln_ebene23.json', 'utf8'));
const seed = JSON.parse(fs.readFileSync('tools/_dryrun/seed_erweiterung.json', 'utf8'));
const r = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const SOLL = []; // [gebiet, ebene, verband, jahre]
const add = (g, e, v, j) => SOLL.push([g, e, v, j]);
['Nord', 'Berlin', 'West', 'Südwest', 'Süd'].forEach(v => add('BRD', 2, v, r(1963, 1973)));
['Schleswig-Holstein', 'Hamburg', 'Bremen', 'Niedersachsen'].forEach(v => add('BRD', 3, v, r(1963, 1973)));
add('BRD', 3, 'Berlin', r(1963, 1993));
['Niederrhein', 'Mittelrhein'].forEach(v => add('BRD', 3, v, r(1963, 1977)));
add('BRD', 3, 'Westfalen', r(1963, 1993));
['Rheinland', 'Saarland', 'Nordbaden', 'Südbaden', 'Nordwürttemberg', 'Schwarzwald-Bodensee'].forEach(v => add('BRD', 3, v, r(1963, 1977)));
['Südwest', 'Hessen', 'Bayern'].forEach(v => add('BRD', 3, v, r(1963, 1993)));
add('BRD', 3, 'Nord', r(1974, 2007));
add('BRD', 3, 'Nordrhein', r(1978, 1993));
add('BRD', 3, 'Baden-Württemberg', r(1978, 1993));
add('BRD', 3, 'Nordost', r(1991, 1993));
add('BRD', 3, 'Nordost/RL', r(1994, 1999)); add('BRD', 3, 'West/Südwest', r(1994, 1999)); add('BRD', 3, 'Süd', r(1994, 2007));
add('BRD', 3, '3. Liga', r(2008, 2024));
add('DDR', 2, 'DDR-Liga', r(1963, 1990));
['Berlin', 'Cottbus', 'Dresden', 'Erfurt', 'Frankfurt/Oder', 'Gera', 'Halle', 'Karl-Marx-Stadt', 'Leipzig', 'Magdeburg', 'Neubrandenburg', 'Potsdam', 'Rostock', 'Schwerin', 'Suhl']
    .forEach(v => add('DDR', 3, v, r(1963, 1990)));

// Ist: je gebiet|ebene|verband|y -> Staffeln + Zeilen. Regionalliga Nordost 1994-99 heisst im Ist "Nordost" auf Ebene 3
const IST = {};
for (const t of EB.tabellen) {
    let v = t.verband; if (t.gebiet === 'BRD' && t.ebene === 3 && v === 'Nordost' && t.y >= 1994) v = 'Nordost/RL';
    const k = `${t.gebiet}|${t.ebene}|${v}|${t.y}`;
    const e = IST[k] = IST[k] || { st: 0, z: 0, ligen: new Set() }; e.st++; e.z += t.zeilen.length; e.ligen.add(t.liga);
}
// Wikipedia-Staffelzahl je Liga-Saison (nur wo erkannt)
const WS = {};
for (const f of W.funde) { if (!f.staffeln?.length) continue; const v = f.gebiet === 'DDR' && f.ebene === 2 ? 'DDR-Liga' : f.key; WS[`${f.gebiet}|${f.ebene}|${v}|${f.y}`] = f.staffeln.length; }
// geschaetzte Zeilen je Liga-Saison
const EST = {};
const HL = s => s.lid;
for (const s of seed.seasons || seed) for (const x of s.table) if (x.est) { const k = s.lid + '|' + parseInt(s.y); EST[k] = (EST[k] || 0) + 1; }

const fehlt = [], wenigerStaffeln = [];
for (const [g, e, v, jahre] of SOLL) {
    const leer = [];
    for (const y of jahre) {
        const k = `${g}|${e}|${v}|${y}`, ist = IST[k];
        if (!ist) { leer.push(y); continue; }
        if (WS[k] && ist.st < WS[k]) wenigerStaffeln.push(`${g} E${e} ${v} ${y}/${String(y + 1).slice(-2)}: ${ist.st} von ${WS[k]} Staffeln (${[...ist.ligen].join(', ')})`);
    }
    if (leer.length) fehlt.push(`${g} E${e} ${v}: ${leer.map(y => `${y}/${String(y + 1).slice(-2)}`).join(', ')}`);
}
const bekannt = new Set(SOLL.map(([g, e, v]) => `${g}|${e}|${v}`));
const extra = [...new Set(Object.keys(IST).map(k => k.split('|').slice(0, 3).join('|')))].filter(k => !bekannt.has(k));
console.log('KOMPLETT FEHLENDE Liga-Saisons:\n  ' + (fehlt.join('\n  ') || '-'));
console.log('\nWENIGER STAFFELN als laut Wikipedia:\n  ' + (wenigerStaffeln.join('\n  ') || '-'));
console.log('\nIst ohne Soll-Eintrag (pruefen): ' + extra.join(' | '));
// Geschaetzte S/U/N je Liga (lid) mit Saisons
const proLid = {};
for (const [k, n] of Object.entries(EST)) { const [lid, y] = k.split('|'); (proLid[lid] = proLid[lid] || []).push(`${y}/${String(+y + 1).slice(-2)}:${n}`); }
console.log('\nGESCHAETZTE S/U/N (Saison:Zeilen):');
Object.entries(proLid).sort((a, b) => a[0].localeCompare(b[0])).forEach(([l, v]) => console.log(`  ${l}  ${v.sort().join(' ')}`));
