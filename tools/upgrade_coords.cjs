/**
 * upgrade_coords.cjs — Genauigkeits-Upgrade der Vereinskoordinaten.
 *
 * Hebt Teams, die noch auf (ungenauen) Nominatim-Ortskoordinaten sitzen
 * (= ohne team.venues[]), auf präzise europlan-Stadionkoordinaten.
 *
 * Sicherheits-Logik (precision > recall):
 *   1. Namensmatch nur bei Token-Set-Gleichheit der signifikanten Tokens
 *      (≥4 Zeichen, ohne Rechtsform/Allgemein-Wörter/Jahreszahlen).
 *      Bei Ein-Token-Sets (nur Ortsname) zusätzlich volle Namensgleichheit
 *      nach Jahres-Strip → Rechtsform muss matchen (SC≠SV).
 *   2. Distanz-Veto: europlan-Stadion muss ≤ MAXKM von der bestehenden
 *      (ungefähr richtigen) Ortskoordinate liegen. Weiter weg = Namensvetter
 *      → nicht anwenden, sondern in die Review-Datei.
 *   3. Regions-Guard: die neue Koordinate muss in der NIEDRIGSTEN Region des
 *      Vereins liegen (letztes regions[]-Element). Geprüft datengetrieben über
 *      die Nachbar-Vereine: trägt keiner der KNN-Nachbarn am neuen Punkt diese
 *      Region, ist es ein Ausweichstadion in fremder Region (z.B. Altglienicke
 *      → Spree-Arena Fürstenwalde/Brandenburg) → nicht anwenden, Review.
 *
 * Quelle:  tools/europlan_coords.json (bereits gescrapt, ~4243 Stadien)
 * Aufruf:  node tools/upgrade_coords.cjs           → Dry-Run + Report + Review-Datei
 *          node tools/upgrade_coords.cjs --write    → schreibt game_data.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const GAME_F   = path.join(ROOT, 'game_data.js');
const EP_F     = path.join(__dirname, 'europlan_coords.json');
const REVIEW_F = path.join(__dirname, 'coord_upgrade_review.json');

const write = process.argv.includes('--write');
const MAXKM = 12;
const KNN   = 5;   // Nachbarn für den Regions-Guard

const lowestRegion = t => (t.regions && t.regions.length) ? t.regions[t.regions.length - 1] : null;

const round5 = n => Math.round(n * 1e5) / 1e5;

function norm(n) {
  return (n || '').toLowerCase()
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
}

const STOP = new Set(('fc sv sc tsv tus vfb vfl vfr fsv tsg spvgg sf sg djk fv bsc bv ssv asv ' +
  'msv osc rw svg tv tb fsg sus rsv concordia borussia fortuna viktoria germania alemannia ' +
  'eintracht olympia preussen blau weiss schwarz rot gruen turn sport sportfreunde fussball ' +
  'sportverein spielvereinigung verein und ii iii').split(' '));

const isYear = t => /^(1[89]\d{2}|20[0-2]\d)$/.test(t);

function sig(s) {
  return norm(s).split(' ').filter(t => t.length >= 4 && !STOP.has(t) && !/^[0-9]+$/.test(t) && !isYear(t));
}
function noYear(s) {
  return norm(s).split(' ').filter(t => !isYear(t)).join(' ');
}
function eqSet(a, b) {
  if (a.length !== b.length || a.length === 0) return false;
  const B = new Set(b);
  return a.every(x => B.has(x));
}
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((la2-la1)*r/2)**2 +
            Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function midpoint(coords) {
  return {
    lat: round5(coords.reduce((s,c) => s + c.lat, 0) / coords.length),
    lon: round5(coords.reduce((s,c) => s + c.lon, 0) / coords.length)
  };
}

// Region am Punkt (lat,lon) = niedrigste Region des nächsten FREMDEN Vereins
// (ohne eigene SG-Familie). Mehrheits-Region der KNN-Nachbarn.
function regionAt(team, lat, lon, cloud) {
  const fam = c => c.id === team.id || c.id === team.parentId ||
                   c.parentId === team.id || (team.parentId && c.parentId === team.parentId);
  const near = cloud.filter(c => !fam(c))
    .map(c => ({ reg: c.reg, d: haversine(lat, lon, c.lat, c.lon) }))
    .sort((a, b) => a.d - b.d).slice(0, KNN);
  const cnt = {};
  for (const n of near) cnt[n.reg] = (cnt[n.reg] || 0) + 1;
  return { region: near[0] && near[0].reg, plurality: Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0],
           neighbors: [...new Set(near.map(n => n.reg))] };
}

// Guard: das neue Stadion darf den Verein nicht in eine ANDERE Region versetzen
// als die, in der er laut Label ODER bisheriger Koordinate sitzt.
function regionGuard(team, newLat, newLon, cloud) {
  const R = lowestRegion(team);
  if (!R) return { ok: true, neighbors: [] };               // ohne Regionstag nicht blockieren
  const here = regionAt(team, team.lat, team.lon, cloud).region;   // Region an bisheriger Koord
  const there = regionAt(team, newLat, newLon, cloud);             // Region am neuen Stadion
  const ok = there.region === R || there.region === here || there.plurality === R || there.plurality === here;
  return { ok, neighbors: there.neighbors, region: R, here, there: there.region };
}

function main() {
  // game_data.js laden
  const raw = fs.readFileSync(GAME_F, 'utf8');
  eval(raw.replace('const GAME_DATA', 'var GAME_DATA'));

  // europlan-Stadien flach + Mittelpunkt + Tokens vorbereiten
  const ep = JSON.parse(fs.readFileSync(EP_F, 'utf8'));
  const epFlat = [];
  for (const teams of Object.values(ep.ligaTeams)) {
    for (const t of teams) {
      if (!t.coords || !t.coords.length) continue;
      const mid = midpoint(t.coords);
      epFlat.push({ name: t.teamName, nn: noYear(t.teamName), sg: sig(t.teamName),
                    lat: mid.lat, lon: mid.lon, coords: t.coords });
    }
  }

  // Punktwolke aller Vereine (für den Regions-Guard)
  const cloud = Object.values(GAME_DATA.teams)
    .filter(t => lowestRegion(t))
    .map(t => ({ id: t.id, parentId: t.parentId, lat: t.lat, lon: t.lon, reg: lowestRegion(t) }));

  // Zielmenge: Teams ohne venues[] (sitzen auf Nominatim-Koordinaten)
  const targets = Object.values(GAME_DATA.teams)
    .filter(t => !(Array.isArray(t.venues) && t.venues.length));

  const auto = [], review = [], nomatch = [];

  for (const team of targets) {
    const ts = sig(team.name), tnn = noYear(team.name);
    if (!ts.length) { nomatch.push(team.name); continue; }

    let best = null, bestD = Infinity;
    for (const e of epFlat) {
      if (!eqSet(ts, e.sg)) continue;
      if (ts.length < 2 && tnn !== e.nn) continue;   // Ein-Token: volle Namensgleichheit verlangen
      const d = haversine(team.lat, team.lon, e.lat, e.lon);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) { nomatch.push(team.name); continue; }

    const pt = best.coords.length === 1
      ? { lat: best.coords[0].lat, lon: best.coords[0].lon } : midpoint(best.coords);
    const rec = { teamId: team.id, teamName: team.name, matchedEpName: best.name,
                  distKm: round5(bestD), coords: best.coords };

    if (bestD > MAXKM) { rec.reason = `>${MAXKM}km`; review.push(rec); continue; }

    const g = regionGuard(team, pt.lat, pt.lon, cloud);
    if (!g.ok) { rec.reason = `Region≠${g.region} (Nachbarn: ${g.neighbors.join(', ')})`; review.push(rec); continue; }

    auto.push(rec);
  }

  // Anwenden
  let applied = 0, multi = 0;
  for (const m of auto) {
    const team = GAME_DATA.teams[m.teamId];
    const pt = m.coords.length === 1
      ? { lat: round5(m.coords[0].lat), lon: round5(m.coords[0].lon) }
      : midpoint(m.coords);
    team.lat = pt.lat;
    team.lon = pt.lon;
    team.venues = m.coords.map(c => ({
      stadName: c.stadName, lat: round5(c.lat), lon: round5(c.lon), address: c.address || ''
    }));
    if (m.coords.length > 1) multi++;
    applied++;
  }

  // Review-Datei immer schreiben
  fs.writeFileSync(REVIEW_F, JSON.stringify({ review, generatedAt: new Date().toISOString() }, null, 2));

  // Report
  console.log(`Ziel-Teams (ohne venues[]): ${targets.length}`);
  console.log(`europlan-Stadien:           ${epFlat.length}`);
  console.log(`\nAUTO (SetEq + ≤${MAXKM}km + Region-OK): ${auto.length}  (davon ${multi} Spielgemeinschaften)`);
  console.log(`REVIEW (Distanz/Region):              ${review.length}  → ${path.basename(REVIEW_F)}`);
  console.log(`kein sicherer Match:                  ${nomatch.length}`);

  console.log(`\n-- AUTO-Upgrades --`);
  for (const m of auto) console.log(`  ${m.teamName}  →  ${m.matchedEpName}  (${m.distKm} km)`);
  if (review.length) {
    console.log(`\n-- REVIEW (nicht angewandt) --`);
    for (const m of review) console.log(`  ${m.teamName}  →  ${m.matchedEpName}  (${m.distKm} km)  [${m.reason}]`);
  }

  if (write) {
    fs.writeFileSync(GAME_F, `const GAME_DATA = ${JSON.stringify(GAME_DATA)};`, 'utf8');
    console.log(`\n✓ game_data.js aktualisiert: ${applied} Teams gepatcht.`);
  } else {
    console.log(`\n[DRY-RUN] Würde ${applied} Teams patchen. Mit --write anwenden.`);
  }
}

main();
