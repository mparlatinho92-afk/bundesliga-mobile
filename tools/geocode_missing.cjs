/**
 * Geocodet fehlende Vereins-Koordinaten via Nominatim (OpenStreetMap).
 * Liest game_data.js, findet Teams mit lat===0 && lon===0,
 * fragt Nominatim nach Ortsname aus Teamname, schreibt Treffer in game_data.js.
 *
 * Nutzung:
 *   node tools/geocode_missing.cjs --dry-run   # nur anzeigen
 *   node tools/geocode_missing.cjs             # direkt in game_data.js schreiben
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 1200; // Nominatim: max 1 req/s

// ── Bekannte Koordinaten (Level 4–5 + Nominatim-Fehlkorrekturen) ─────────────
const KNOWN = {
  // Level 4–5
  'tsgpfeddersheim_305':       { lat: 49.6317,  lon:  8.2389 }, // Pfeddersheim
  'herthabscii_698':           { lat: 52.5135,  lon: 13.4019 }, // Jahnsportpark Berlin
  'vfcplauen_837':             { lat: 50.4882,  lon: 12.1361 }, // Plauen, Vogtland
  'sgsonnenhofgrossaspach_916':{ lat: 48.9657,  lon:  9.3938 }, // Großaspach b. Backnang
  'tusmechtersheim_300':       { lat: 49.3870,  lon:  8.4060 }, // Mechtersheim, Pfalz
  'tus1904hohenecken_318':     { lat: 49.4560,  lon:  7.7110 }, // Hohenecken b. Kaiserslautern
  'hassiabingen_319':          { lat: 49.9660,  lon:  7.8960 }, // Bingen am Rhein
  'bfcdynamo_701':             { lat: 52.5430,  lon: 13.4040 }, // Friedrich-Ludwig-Jahn-Sportpark
  'cfchertha06_713':           { lat: 52.5060,  lon: 13.3490 }, // Berlin-Charlottenburg

  // Nominatim-Fehlkorrekturen (falscher Ort erkannt)
  'ludwigshafenersc_374':      { lat: 49.4772,  lon:  8.4340 }, // Ludwigshafen am Rhein (nicht München)
  'svbuechelberg_327':         { lat: 49.0290,  lon:  8.2120 }, // Büchelberg b. Wörth/Rhein (nicht Bayern)
  'fsvoffenbach_325':          { lat: 49.1820,  lon:  8.0100 }, // Offenbach an der Queich (nicht Offenbach/Main)
  'sgweinsheim_398':           { lat: 49.8380,  lon:  7.8410 }, // Weinsheim b. Bad Kreuznach (nicht Eifel)
  'tus1890schoenenberg_418':   { lat: 49.5270,  lon:  7.4620 }, // Schönenberg-Kübelberg b. Kusel (nicht BW)
  'bollenbachersv_406':        { lat: 49.7290,  lon:  7.3580 }, // Bollenbach b. Herrstein, Landkreis Birkenfeld
  'sv1930rotweissseebach_381': { lat: 49.3940,  lon:  8.4490 }, // Seebach b. Speyer (Vorderpfalz)

  // Nicht gefunden von Nominatim
  'fcbasaramainz_313':         { lat: 49.9990,  lon:  8.2740 }, // Mainz
  'fcaksudiyarmainz_364':      { lat: 49.9990,  lon:  8.2740 }, // Mainz
  'tusbedesbachpatersbach_412':{ lat: 49.5300,  lon:  7.3700 }, // Bedesbach b. Altenglan, Westpfalz
  '1fckportugiese_415':        { lat: 49.4440,  lon:  7.7620 }, // Kaiserslautern
  'svpalatia1920contwig_421':  { lat: 49.2490,  lon:  7.4400 }, // Contwig b. Zweibrücken
  'fctuerkguecuehelmstedt_633':{ lat: 52.2270,  lon: 11.0100 }, // Helmstedt, Niedersachsen
};

// ── Ortsnamen-Extraktion aus Teamnamen ────────────────────────────────────────
// Versucht den Ortsanteil aus dem Vereinsnamen zu extrahieren.
// Beispiele: "SV Morlautern" → "Morlautern", "TuS Rüssingen" → "Rüssingen"
// "SG Hüffelsheim/Niederhausen" → "Hüffelsheim"
function extractCity(name) {
  // Trenne bei "/" → ersten Teil nehmen
  name = name.split('/')[0].split('\\u200b')[0].trim();

  // Entferne gängige Präfixe (Vereinstypen)
  const prefixes = [
    'SG','SV','FC','SC','TSV','TSG','TuS','TuS ','FV','VfR','VfB','VfL','VfK','VB',
    'SpVgg','FSV','SSV','BSC','ASV','RSV','GSV','HSV','MSV','DSV','ESV','WSV','PSV',
    'Sportfreunde','SF','SF ','SF.','RWO','RW','BFC','CFC','FG','VTG','VTG ','FV',
    '1\\.','1\\.\\s*FC','1\\.\\s*FSV','1\\.\\s*FFC','1\\.\\s*SC',
    'FC\\s+\\d{2}','TSC','SSC','TFC',
    'SV 1921','SV 1930','SV 1930','TSV 1903','TSV \\d+',
    'Eintracht','Borussia','Fortuna','Viktoria','Germania','Alemannia','Helvetia',
    'Hassia','Hessen','Phönix','Olympia','Bavaria','Arminia','Preußen','Aurich',
    'SVGO','Oppenheim', // Sonderfall: nur Ortsname
  ];

  // Entferne Jahreszahlen und kurze Abkürzungen am Anfang
  let s = name.trim()
    .replace(/^\d{1,2}\.\s*(FC|FSV|SC|FFC|FCK|BCR)?\s*/i, '')
    .replace(/^(SG|SV|FC|SC|TuS|TSV|TSG|FV|VfR|VfB|VfL|SpVgg|FSV|SSV|BSC|ASV|VTG|RWO|FG|BFC|CFC|VB|TFC|TSC|SSC|SF|SF\.|SVGO|Bollenbacher|MSV)\s+/i, '')
    .replace(/^(Sportfreunde|Eintracht|Borussia|Fortuna|Viktoria|Germania|Alemannia|Helvetia|Hassia|Phönix|Olympia|Bavaria|Arminia|Preußen)\s+/i, '')
    .replace(/^(1\.|2\.|3\.)?\s*\d{2,4}\s*/i, '')
    .trim();

  // Sonderfälle: "Rot-Weiss X" → "X"
  s = s.replace(/^Rot-?Weiss?\s+/i, '').trim();
  s = s.replace(/^Blau-?Weiss?\s+/i, '').trim();
  s = s.replace(/^Schwarz-?Weiss?\s+/i, '').trim();

  // Nur ersten Ortsteil nehmen (vor Bindestrich wenn lang)
  // "Hüffelsheim/Niederhausen" → "Hüffelsheim"
  // "Bedesbach-Patersbach" → "Bedesbach" – aber NUR wenn Komponente >6 Zeichen
  const parts = s.split('-');
  if (parts.length > 1 && parts[0].length > 4) {
    // Behalte zusammengesetzten Ortsnamen wenn üblich
    // Zweibrücken → behalten, Waldalgesheim → behalten
  }

  // Wenn nichts übrig → ganzen bereinigten Namen zurückgeben
  return s || name;
}

// ── Nominatim-Abfrage ─────────────────────────────────────────────────────────
function nominatim(query) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(query + ', Deutschland');
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=de`;
    const options = {
      hostname: 'nominatim.openstreetmap.org',
      path: `/search?q=${q}&format=json&limit=1&countrycodes=de`,
      headers: { 'User-Agent': 'BundesligaSimulation/geocoder (mparlatinho92@gmail.com)' }
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data[0]) {
            resolve({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name });
          } else {
            resolve(null);
          }
        } catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Hauptprogramm ─────────────────────────────────────────────────────────────
async function main() {
  const gdPath = path.join(__dirname, '..', 'game_data.js');
  const src = fs.readFileSync(gdPath, 'utf8');
  eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

  const missing = Object.values(GAME_DATA.teams)
    .filter(t => t.lat === 0 && t.lon === 0);

  console.log(`Fehlende Koordinaten: ${missing.length}`);
  if (DRY_RUN) console.log('── DRY RUN (kein Schreiben) ──');

  const results = [];
  let found = 0, notFound = 0;

  for (const team of missing) {
    // 1. Bekannte Koordinaten
    if (KNOWN[team.id]) {
      const { lat, lon } = KNOWN[team.id];
      console.log(`✓ [bekannt]  ${team.name}: ${lat}, ${lon}`);
      results.push({ id: team.id, lat, lon, source: 'known' });
      found++;
      continue;
    }

    // 2. Nominatim
    const city = extractCity(team.name);
    await sleep(DELAY_MS);
    const coord = await nominatim(city);
    if (coord) {
      // Plausibilitätscheck: Deutschland-Bounding-Box (grob)
      if (coord.lat > 47.0 && coord.lat < 55.5 && coord.lon > 5.5 && coord.lon < 15.5) {
        console.log(`✓ [nominatim] ${team.name} → "${city}": ${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}  (${coord.display.split(',').slice(0,2).join(',')})`);
        results.push({ id: team.id, lat: coord.lat, lon: coord.lon, source: 'nominatim', city, display: coord.display });
        found++;
      } else {
        console.log(`✗ [außerhalb] ${team.name} → "${city}": ${coord.lat}, ${coord.lon}`);
        notFound++;
      }
    } else {
      console.log(`✗ [kein Hit]  ${team.name} → "${city}"`);
      notFound++;
    }
  }

  console.log(`\nErgebnis: ${found} gefunden, ${notFound} nicht gefunden`);

  if (DRY_RUN || results.length === 0) {
    console.log('\nDRY RUN – Ergebnisse nicht gespeichert.');
    return;
  }

  // ── In game_data.js schreiben (via eval + JSON.stringify wie apply_coords) ─
  let patched = 0;
  for (const r of results) {
    const team = GAME_DATA.teams[r.id];
    if (!team) { console.warn(`  ⚠ Team-ID nicht gefunden: ${r.id}`); continue; }
    team.lat = parseFloat(r.lat.toFixed(5));
    team.lon = parseFloat(r.lon.toFixed(5));
    patched++;
  }

  fs.writeFileSync(gdPath, `const GAME_DATA = ${JSON.stringify(GAME_DATA)};`, 'utf8');
  console.log(`\n✅ ${patched}/${results.length} Teams in game_data.js gepatcht.`);
}

main().catch(console.error);
