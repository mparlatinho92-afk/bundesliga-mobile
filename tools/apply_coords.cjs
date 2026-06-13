/**
 * Trägt europlan-Koordinaten in game_data.js ein.
 * Setzt lat/lon auf den Mittelpunkt; speichert alle Spielstätten in team.venues[].
 *
 * Aufruf: node tools/apply_coords.cjs [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const MATCH_F   = path.join(__dirname, 'europlan_matched.json');
const GAME_F    = path.join(ROOT, 'game_data.js');

const dryRun = process.argv.includes('--dry-run');

function round5(n) { return Math.round(n * 100000) / 100000; }

function midpoint(coords) {
  return {
    lat: round5(coords.reduce((s,c) => s + c.lat, 0) / coords.length),
    lon: round5(coords.reduce((s,c) => s + c.lon, 0) / coords.length)
  };
}

async function main() {
  if (!fs.existsSync(MATCH_F)) {
    console.error('Keine europlan_matched.json. Erst europlan_scraper.cjs ausführen.');
    process.exit(1);
  }

  const { matched, unmatched } = JSON.parse(fs.readFileSync(MATCH_F, 'utf8'));
  console.log(`Einzutragen: ${matched.length}  |  Nicht gefunden: ${unmatched.length}`);

  // game_data.js laden und parsen
  const raw = fs.readFileSync(GAME_F, 'utf8');
  eval(raw.replace('const GAME_DATA', 'var GAME_DATA'));

  let applied = 0, skipped = 0, multi = 0;

  for (const m of matched) {
    const { teamId, teamName, coords } = m;
    const team = GAME_DATA.teams[teamId];

    if (!team) { console.warn(`  SKIP (nicht in game_data): ${teamId}`); skipped++; continue; }
    if (!coords || coords.length === 0) { skipped++; continue; }

    const pt = coords.length === 1
      ? { lat: round5(coords[0].lat), lon: round5(coords[0].lon) }
      : midpoint(coords);

    if (coords.length > 1) {
      multi++;
      console.log(`  SG: ${teamName} → ${coords.length} Stätten → Mittelpunkt ${pt.lat}, ${pt.lon}`);
    }

    team.lat = pt.lat;
    team.lon = pt.lon;

    // Alle Spielstätten für Spielgemeinschaften/Recherche
    team.venues = coords.map(c => ({
      stadName: c.stadName,
      lat: round5(c.lat),
      lon: round5(c.lon),
      address: c.address || ''
    }));

    applied++;
  }

  if (!dryRun) {
    // Zurückschreiben – gleiche Struktur wie Original
    const jsonStr = JSON.stringify(GAME_DATA);
    fs.writeFileSync(GAME_F, `const GAME_DATA = ${jsonStr};`, 'utf8');
    console.log(`\n✓ game_data.js aktualisiert`);
  } else {
    console.log(`\n[DRY-RUN] Würde ${applied} Teams patchen`);
  }

  console.log(`  Eingetragen:               ${applied}`);
  console.log(`  Spielgemeinschaften (SG):  ${multi}`);
  console.log(`  Übersprungen:              ${skipped}`);

  if (unmatched.length > 0) {
    console.log(`\nNicht gefunden (${unmatched.length}):`);
    for (const u of unmatched) console.log(`  - ${u.teamName}`);
  }
}

main().catch(e => { console.error('FEHLER:', e); process.exit(1); });
