/**
 * apply_manual_coords.cjs — wendet eine HANDKURIERTE europlan-Treffer-Liste an
 * (tools/coord_manual_apply.json). Für Fälle, die die automatische Namens-Set-
 * Gleichheit nicht erfasst (z.B. "MSV Duisburg" = "Meidericher SV Duisburg"),
 * aber per Vereinswissen eindeutig derselbe Klub sind.
 *
 * Sicherheitsnetz: derselbe Regions-Guard wie upgrade_coords.cjs läuft mit;
 * ein Treffer, der den Verein in eine andere niedrigste Region versetzen würde,
 * wird NICHT geschrieben, sondern gemeldet.
 *
 * Aufruf: node tools/apply_manual_coords.cjs           → Dry-Run + Report
 *         node tools/apply_manual_coords.cjs --write    → schreibt game_data.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const GAME_F  = path.join(ROOT, 'game_data.js');
const EP_F    = path.join(__dirname, 'europlan_coords.json');
const LIST_F  = path.join(__dirname, 'coord_manual_apply.json');
const write   = process.argv.includes('--write');
const KNN     = 5;

const round5 = n => Math.round(n * 1e5) / 1e5;
const lowestRegion = t => (t.regions && t.regions.length) ? t.regions[t.regions.length - 1] : null;

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((la2-la1)*r/2)**2 + Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function midpoint(coords) {
  return { lat: round5(coords.reduce((s,c)=>s+c.lat,0)/coords.length),
           lon: round5(coords.reduce((s,c)=>s+c.lon,0)/coords.length) };
}
function regionAt(team, lat, lon, cloud) {
  const fam = c => c.id === team.id || c.id === team.parentId ||
                   c.parentId === team.id || (team.parentId && c.parentId === team.parentId);
  const near = cloud.filter(c => !fam(c))
    .map(c => ({ reg: c.reg, d: haversine(lat, lon, c.lat, c.lon) }))
    .sort((a,b) => a.d - b.d).slice(0, KNN);
  return near[0] && near[0].reg;
}
function regionOk(team, newLat, newLon, cloud) {
  const R = lowestRegion(team);
  if (!R) return true;
  const here  = regionAt(team, team.lat, team.lon, cloud);
  const there = regionAt(team, newLat, newLon, cloud);
  return there === R || there === here;
}

function main() {
  const raw = fs.readFileSync(GAME_F, 'utf8');
  eval(raw.replace('const GAME_DATA', 'var GAME_DATA'));

  const ep = JSON.parse(fs.readFileSync(EP_F, 'utf8'));
  const epByName = {};
  for (const teams of Object.values(ep.ligaTeams))
    for (const t of teams) if (t.coords && t.coords.length) epByName[t.teamName] = t.coords;

  const teamByName = {};
  for (const t of Object.values(GAME_DATA.teams)) teamByName[t.name] = t;

  const cloud = Object.values(GAME_DATA.teams).filter(lowestRegion)
    .map(t => ({ id: t.id, parentId: t.parentId, lat: t.lat, lon: t.lon, reg: lowestRegion(t) }));

  const { apply } = JSON.parse(fs.readFileSync(LIST_F, 'utf8'));
  const done = [], unresolved = [], regionFail = [];

  for (const m of apply) {
    const team = teamByName[m.team];
    const coords = epByName[m.ep];
    if (!team)   { unresolved.push(`${m.team} (Verein nicht in game_data)`); continue; }
    if (!coords) { unresolved.push(`${m.team} → "${m.ep}" (europlan-Name nicht gefunden)`); continue; }

    const pt = coords.length === 1
      ? { lat: round5(coords[0].lat), lon: round5(coords[0].lon) } : midpoint(coords);
    const dist = round5(haversine(team.lat, team.lon, pt.lat, pt.lon));

    if (!regionOk(team, pt.lat, pt.lon, cloud)) {
      regionFail.push(`${m.team} → ${m.ep} (${dist} km, Region-Guard)`); continue;
    }

    team.lat = pt.lat;
    team.lon = pt.lon;
    team.venues = coords.map(c => ({ stadName: c.stadName, lat: round5(c.lat), lon: round5(c.lon), address: c.address || '' }));
    done.push(`${m.team} → ${m.ep} (${dist} km)`);
  }

  console.log(`Freigabeliste: ${apply.length}\n`);
  console.log(`-- ${write ? 'GESCHRIEBEN' : 'WÜRDE SCHREIBEN'} (${done.length}) --`);
  done.forEach(s => console.log('  ' + s));
  if (regionFail.length) { console.log(`\n-- Region-Guard abgelehnt (${regionFail.length}) --`); regionFail.forEach(s => console.log('  ' + s)); }
  if (unresolved.length) { console.log(`\n-- Nicht auflösbar (${unresolved.length}) --`); unresolved.forEach(s => console.log('  ' + s)); }

  if (write) {
    fs.writeFileSync(GAME_F, `const GAME_DATA = ${JSON.stringify(GAME_DATA)};`, 'utf8');
    console.log(`\n✓ game_data.js aktualisiert: ${done.length} Teams.`);
  } else {
    console.log(`\n[DRY-RUN] Mit --write anwenden.`);
  }
}

main();
