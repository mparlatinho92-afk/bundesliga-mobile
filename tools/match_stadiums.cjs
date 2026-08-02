/**
 * Stadien aus europlan_stadiums.json an unsere Teams (game_data.js) matchen.
 *
 * Ausgabe: tools/stadium_match.json  { matched:[…], unmatched:[…], stats:{} }
 * Dry-Run:  node tools/match_stadiums.cjs
 * Schreiben: node tools/match_stadiums.cjs --write   (setzt team.venues[] in game_data.js)
 *
 * Sicherung (precision > recall):
 *  1. Mannschafts-Rang muss übereinstimmen (I / II / III) – "FC X" matcht nie "FC X II"
 *  2. Namens-Gleichheit: normalisierte Gleichheit ODER Token-Set-Gleichheit der signifikanten Tokens
 *  3. Distanz-Veto: EP-Stadion max. MAXKM vom bisherigen Team-Punkt entfernt
 *  4. Koordinaten-Anker: wenn die bestehende venues[]-Koordinate exakt auf ein EP-Stadion zeigt,
 *     gilt dieses als gesetzt (stärkstes Signal, unabhängig vom Namen)
 */

const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const WRITE  = process.argv.includes('--write');
const MAXKM  = 25;

const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'europlan_stadiums.json'), 'utf8'));
const src   = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

// ── Normalisierung ───────────────────────────────────────────────────────────

const NOISE = new Set(['ev','e','v','fussball','fussballclub','fussballverein','sportverein','sv','fc','sc','tsv','vfl','vfb','tus','sg','sv','spvgg','djk','fsv','ssv','vfr','bsc','sf','rw','bv','tsg','msv','asv','atsv','fcv','1','sgm']);

function fold(s) {
  return (s || '').toLowerCase()
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

// Mannschafts-Rang: 1 = Erste, 2 = Reserve, 3 = Dritte
// Zweitplaetze einer Anlage. Europlan schreibt sie als Zusatz hinter den Anlagennamen:
// "… B-Platz", "… Nebenplatz 1", "… Platz 3", "… Ostplatz", "Sportplatz Etelsen B".
const NEBENPLATZ = /(\b(b|neben|ost|west|nord|süd|sued)-?platz\b|\bplatz\s*\d+\b|\s+b$)/i;

function rankOf(nameFolded) {
  if (/\b(iii|3)\b\s*$/.test(nameFolded)) return 3;
  if (/\b(ii|2|u ?23|amateure)\b\s*$/.test(nameFolded)) return 2;
  return 1;
}
function stripRank(n) { return n.replace(/\b(iii|ii|u ?23|amateure|2|3)\b\s*$/,'').trim(); }
function stripYears(n) { return n.split(' ').filter(w => !/^\d+$/.test(w)).join(' '); }

function keyOf(name) {
  const f = fold(name);
  const base = stripYears(stripRank(f));
  return { rank: rankOf(f), base, tokens: new Set(base.split(' ').filter(w => w.length >= 4 && !NOISE.has(w))) };
}
function setEq(a, b) { if (a.size !== b.size || !a.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }

function km(a, b, c, d) {
  const R = 6371, r = Math.PI/180;
  const dLa = (c-a)*r, dLo = (d-b)*r;
  const h = Math.sin(dLa/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

// ── EP-Einträge aufbereiten ──────────────────────────────────────────────────

const epTeams = [];
for (const arr of Object.values(cache.ligaTeams)) {
  for (const t of arr) {
    const k = keyOf(t.teamName);
    epTeams.push({ ...t, ...k });
  }
}
// Stadion-Details-Index (URL → Detailseite)
const detail = cache.stadien || {};

function venueOf(ep) {
  return ep.stadiums.map(s => {
    const d = detail[s.url] || {};
    return {
      stadName: d.name || s.name || '',
      ort: d.ort || d.ortsteil || '',
      kapazitaet: d.kapazitaet != null ? d.kapazitaet : ep.kapazitaet,
      lat: d.lat != null ? d.lat : ep.lat,
      lon: d.lon != null ? d.lon : ep.lon,
      url: s.url
    };
  }).filter(v => v.stadName);
}

// Koordinaten-Index (5 Nachkommastellen) → EP-Einträge
const coordIdx = new Map();
for (const ep of epTeams) {
  if (ep.lat == null) continue;
  const k = ep.lat.toFixed(5) + ',' + ep.lon.toFixed(5);
  if (!coordIdx.has(k)) coordIdx.set(k, []);
  coordIdx.get(k).push(ep);
}

// ── Matching ─────────────────────────────────────────────────────────────────

const teams = Object.values(GAME_DATA.teams);
const matched = [], unmatched = [], conflicts = [];
const stats = { anchor: 0, exact: 0, tokens: 0, none: 0, agree: 0, disagree: 0, multi: 0, ankerVorrang: 0 };

for (const t of teams) {
  const k = keyOf(t.name);
  const ourLevel = GAME_DATA.leagues[t.leagueId]?.level || null;
  const cands = [];
  for (const ep of epTeams) {
    if (ep.rank !== k.rank) continue;
    let how = null;
    if (ep.base === k.base) how = 'exact';
    else if (setEq(ep.tokens, k.tokens)) how = 'tokens';
    if (!how) continue;
    const d = (ep.lat != null) ? km(t.lat, t.lon, ep.lat, ep.lon) : 999;
    if (d > MAXKM) continue;
    // Liganähe entscheidet, welcher Platz der Hauptplatz ist: derselbe Verein taucht in
    // mehreren Ligen auf (1./2./3. Mannschaft) – jede mit eigenem Ground (B-Platz etc.)
    cands.push({ ep, how, d, lvlDiff: ourLevel && ep.level ? Math.abs(ep.level - ourLevel) : 9 });
  }
  cands.sort((a, b) => a.lvlDiff - b.lvlDiff || a.d - b.d);

  // Koordinaten-Anker aus bestehendem venues[]
  let anchorEp = null;
  const v0 = (t.venues && t.venues[0]) || null;
  if (v0 && v0.lat != null) {
    const hit = coordIdx.get(v0.lat.toFixed(5) + ',' + v0.lon.toFixed(5));
    if (hit) anchorEp = hit[0];
  }

  let venues = [], method = null, epNames = [];
  if (cands.length) {
    // alle plausiblen Treffer sammeln (verschiedene Ligen/Grounds desselben Vereins)
    const byUrl = new Map();
    for (const c of cands) {
      for (const v of venueOf(c.ep)) if (!byUrl.has(v.url)) byUrl.set(v.url, v);
      epNames.push(`${c.ep.teamName} [${c.ep.ligaName}]`);
    }
    venues = [...byUrl.values()];
    method = cands[0].how;
    if (venues.length > 1) stats.multi++;
    stats[method]++;
    if (anchorEp) {
      const anchorUrls = new Set(anchorEp.stadiums.map(s => s.url));
      if (venues.some(v => anchorUrls.has(v.url))) stats.agree++;
      else {
        stats.disagree++;
        const nameNamen = venues.map(v => v.stadName);
        // Widerspruch zwischen Namenstreffer und Koordinaten-Anker. Bei ERSTEN Mannschaften
        // gewinnt der Anker: der Namenstreffer erwischt dort regelmaessig einen Nebenplatz
        // desselben Vereins (Hannover 96 -> "In der Steintormasch B-Platz" statt
        // Heinz-von-Heiden-Arena, MSV Duisburg -> "Warbruckstrasse II" statt Arena), waehrend
        // die Anker-Koordinate aus venues[0] am Verein haengt und aufs Hauptstadion zeigt.
        // Bei Reserven ist es umgekehrt richtig - eine zweite Mannschaft SPIELT auf dem
        // Nebenplatz, dort bleibt der Namenstreffer stehen.
        // Nur ein blosses "Anker gewinnt" reicht nicht: bei rund einem Drittel der Faelle
        // zeigt der ANKER auf den Nebenplatz derselben Anlage (VfB Luebeck -> "Lohmuehle
        // Nebenplatz 4" statt "Stadion an der Lohmuehle"). Entscheidend ist deshalb, welche
        // Seite ueberhaupt einen Hauptplatz anbietet; nur bei Gleichstand zaehlt die
        // Koordinate, weil sie am Verein haengt und nicht am Namen.
        const ankerVenues = venueOf(anchorEp);
        const hauptName  = venues.some(v => !NEBENPLATZ.test(v.stadName));
        const hauptAnker = ankerVenues.some(v => !NEBENPLATZ.test(v.stadName));
        const ankerGewinnt = k.rank === 1 && !(hauptName && !hauptAnker);
        if (ankerGewinnt) {
          venues = ankerVenues;
          method = 'anker-vorrang';
          stats.ankerVorrang++;
        }
        conflicts.push({ team: t.name, rang: k.rank, gewaehlt: ankerGewinnt ? 'anker' : 'name',
                         name: nameNamen, anchor: venueOf(anchorEp).map(v => v.stadName) });
      }
    }
  } else if (anchorEp) {
    venues = venueOf(anchorEp);
    method = 'anchor';
    stats.anchor++;
    epNames.push(`${anchorEp.teamName} [${anchorEp.ligaName}]`);
  }

  if (venues.length) matched.push({ teamId: t.id, teamName: t.name, method, epNames, venues });
  else { unmatched.push({ teamId: t.id, teamName: t.name, hasVenue: !!v0, oldVenue: v0?.stadName || '' }); stats.none++; }
}

const out = { stats, matched, unmatched, conflicts };
fs.writeFileSync(path.join(__dirname, 'stadium_match.json'), JSON.stringify(out, null, 1));

console.log('=== Stadion-Matching ===');
console.log(`Teams gesamt:      ${teams.length}`);
console.log(`Gematcht:          ${matched.length}`);
console.log(`  Namens-exakt:    ${stats.exact}`);
console.log(`  Token-Set:       ${stats.tokens}`);
console.log(`  nur Koord-Anker: ${stats.anchor}`);
console.log(`  mehrere Grounds: ${stats.multi}`);
console.log(`Ohne Treffer:      ${stats.none}`);
console.log(`\nKontrolle gegen Koord-Anker: ${stats.agree} übereinstimmend, ${stats.disagree} abweichend`);
console.log(`  davon Anker-Vorrang (1. Mannschaft): ${stats.ankerVorrang} | Namenstreffer behalten (Reserve): ${stats.disagree - stats.ankerVorrang}`);
const withKapa = matched.filter(m => m.venues.some(v => v.kapazitaet));
const withOrt  = matched.filter(m => m.venues.some(v => v.ort));
console.log(`Mit Kapazität: ${withKapa.length} | Mit Ort: ${withOrt.length}`);
console.log(`\nDatei: tools/stadium_match.json`);

// ── Schreiben ────────────────────────────────────────────────────────────────

if (WRITE) {
  let changed = 0;
  for (const m of matched) {
    const team = GAME_DATA.teams[m.teamId];
    if (!team) continue;
    team.venues = m.venues.map(v => ({
      stadName: v.stadName,
      ort: v.ort || '',
      kapazitaet: v.kapazitaet || null,
      lat: v.lat != null ? +v.lat.toFixed(5) : null,
      lon: v.lon != null ? +v.lon.toFixed(5) : null
    }));
    changed++;
  }
  // game_data.js ist eine einzige JSON-Zeile → komplett neu serialisieren
  fs.writeFileSync(path.join(ROOT, 'game_data.js'), 'const GAME_DATA = ' + JSON.stringify(GAME_DATA) + ';', 'utf8');
  console.log(`\ngame_data.js: ${changed} Teams aktualisiert`);
}
