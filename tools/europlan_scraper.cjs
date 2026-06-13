/**
 * Europlan-Online Scraper v2 – Deutsche Ligen Level 1-8
 *
 * Optimiert: Koordinaten kommen direkt aus dem fromLonLat([lon,lat])-Aufruf
 * auf den Liga-Seiten. Nur bei Spielgemeinschaften (mehrere Stadion-Links)
 * werden die einzelnen Stadionseiten nachgeladen.
 *
 * Ausgabe: tools/europlan_coords.json  +  tools/europlan_matched.json
 * Aufruf:  node tools/europlan_scraper.cjs
 * Resume:  einfach erneut starten
 */

const fs   = require('fs');
const path = require('path');

const BASE     = 'https://www.europlan-online.de';
const DELAY_MS = 350;
const CACHE_F  = path.join(__dirname, 'europlan_coords.json');
const OUT_F    = path.join(__dirname, 'europlan_matched.json');
const ROOT     = path.join(__dirname, '..');

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (coordsbot; contact: mparlatinho92@gmail.com)' }
    });
    if (!res.ok) { process.stdout.write(`[HTTP ${res.status}] `); return ''; }
    return await res.text();
  } catch (e) {
    process.stdout.write(`[ERR: ${e.message.slice(0,40)}] `);
    return '';
  }
}

function normName(n) {
  return (n || '').toLowerCase()
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 6) return 99;
  const m = a.length, n = b.length;
  const d = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => j===0?i:0));
  for (let j=1;j<=n;j++) d[0][j]=j;
  for (let i=1;i<=m;i++)
    for (let j=1;j<=n;j++)
      d[i][j] = a[i-1]===b[j-1] ? d[i-1][j-1] : 1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[m][n];
}

// ── Koordinaten direkt aus Liga-Zeile ────────────────────────────────────────

function extractRowCoord(rowHtml) {
  // fromLonLat([ LON, LAT ]) – Achtung: Reihenfolge ist LON zuerst!
  const m = rowHtml.match(/fromLonLat\(\[\s*([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]\)/);
  if (m) return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
  return null;
}

// ── Koordinaten aus Stadionseite (Fallback für Spielgemeinschaften) ───────────

function extractPageCoords(html) {
  let m = html.match(/[?&]lat=([0-9\-.]+)&(?:amp;)?lon=([0-9\-.]+)/i);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = html.match(/fromLonLat\(\[\s*([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]\)/);
  if (m) return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
  return null;
}

// ── Stadionname aus Stadionseite ─────────────────────────────────────────────

async function fetchStadion(url) {
  const html = await getHtml(url);
  await sleep(DELAY_MS);
  if (!html) return { stadName: '', lat: null, lon: null, address: '', url };
  const nameM = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const stadName = nameM ? nameM[1].replace(/<[^>]+>/g,'').trim() : '';
  const adrM = html.match(/(?:Adresse|Anschrift)[^<]*<[^>]+>([^<]{5,100})/i);
  const address = adrM ? adrM[1].trim() : '';
  const coords = extractPageCoords(html);
  return { stadName, url, address, lat: coords?.lat ?? null, lon: coords?.lon ?? null };
}

// ── Schritt 1: Deutsche Liga-IDs Level 1-8 ───────────────────────────────────

async function fetchGermanLeagueIds() {
  console.log('\n[1] Lade deutsche Liga-IDs (Level 1-8)...');
  const html = await getHtml(`${BASE}/index.php?s=land&id=1`);
  await sleep(DELAY_MS);
  const mainIdx = html.indexOf('<div id="main">');
  const mainHtml = mainIdx > -1 ? html.slice(mainIdx, mainIdx+200000) : html;
  const re = /href="index\.php\?s=liga&(?:amp;)?id=(\d+)"[^>]*>([^<]+)</g;
  const leagues = []; let m;
  while ((m = re.exec(mainHtml)) !== null) {
    const lvlM = m[2].match(/\((\d+)\)/);
    const level = lvlM ? parseInt(lvlM[1]) : 99;
    if (level <= 8) leagues.push({ id: m[1], name: m[2].trim(), level });
  }
  console.log(`  → ${leagues.length} Ligen`);
  return leagues;
}

// ── Schritt 2: Teams + Koordinaten pro Liga ───────────────────────────────────

async function fetchTeamsForLeague(ligaId, ligaName) {
  const html = await getHtml(`${BASE}/index.php?s=liga&id=${ligaId}`);
  await sleep(DELAY_MS);
  if (!html) return [];

  const teams = [];
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let row;

  while ((row = rowRe.exec(html)) !== null) {
    const rowHtml = row[0];

    // Stadion-Links
    const stadLinks = [...rowHtml.matchAll(/href="([^"]*stadion-\d+\.html)"/gi)]
      .map(m => m[1].startsWith('http') ? m[1] : `${BASE}/${m[1].replace(/^\//,'')}`)
      .filter((v,i,a) => a.indexOf(v) === i);

    if (!stadLinks.length) continue;

    // Teamname aus <span translate="no">
    const nameM = rowHtml.match(/<span translate="no">([^<]+)<\/span>/i);
    const teamName = nameM ? nameM[1].trim() : '';
    if (!teamName) continue;

    // Koordinaten direkt aus der Zeile
    const coord = extractRowCoord(rowHtml);

    // Stadionname aus dem Link-Title
    const stadTitleM = rowHtml.match(/title="([^"]+)"\s+class="loading"/i);
    const stadName = stadTitleM ? stadTitleM[1] : '';

    const entry = {
      teamName,
      norm: normName(teamName),
      ligaId,
      ligaName,
      stadionUrls: stadLinks,
      coords: coord
        ? [{ stadName, lat: coord.lat, lon: coord.lon, address: '', url: stadLinks[0] }]
        : []
    };

    // Spielgemeinschaft: mehrere verschiedene Stadion-URLs → extra Seiten laden
    entry._needsExtraFetch = stadLinks.length > 1 && !coord;

    teams.push(entry);
  }
  return teams;
}

// ── Schritt 3: Spielgemeinschaften – alle Stadionseiten laden ─────────────────

async function enrichSpielergemeinschaften(cache) {
  const sgTeams = [];
  for (const teams of Object.values(cache.ligaTeams)) {
    for (const t of teams) {
      if (t._needsExtraFetch && t.stadionUrls.length > 1) sgTeams.push(t);
    }
  }
  if (!sgTeams.length) { console.log('\n[3] Keine Spielgemeinschaften mit fehlenden Extra-Seiten.'); return; }

  console.log(`\n[3] Lade ${sgTeams.length} Spielgemeinschaft-Stadionseiten...`);
  for (const t of sgTeams) {
    t.coords = [];
    for (const url of t.stadionUrls) {
      if (cache.stadien[url]) {
        t.coords.push(cache.stadien[url]);
        continue;
      }
      process.stdout.write(`  ${t.teamName}: ${url.split('/').pop()}... `);
      const s = await fetchStadion(url);
      cache.stadien[url] = s;
      if (s.lat) {
        t.coords.push(s);
        console.log(`${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`);
      } else {
        console.log('keine Koordinaten');
      }
    }
    t._needsExtraFetch = false;
  }
}

// ── Matching ────────────────────────────────────────────────────────────────

function matchTeam(ourNorm, epTeams) {
  let hit = epTeams.find(e => e.norm === ourNorm);
  if (hit) return { team: hit, score: 'exact' };
  if (ourNorm.length >= 6) {
    hit = epTeams.find(e => e.norm.length >= 6 && (e.norm.includes(ourNorm) || ourNorm.includes(e.norm)));
    if (hit) return { team: hit, score: 'contains' };
  }
  let best = null, bestD = 4;
  for (const e of epTeams) {
    const d = lev(ourNorm, e.norm);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) return { team: best, score: `lev${bestD}` };
  return null;
}

// ── Haupt-Routine ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Europlan-Online Scraper v2 (Level 1-8, Deutschland) ===');

  let cache = {};
  if (fs.existsSync(CACHE_F)) {
    cache = JSON.parse(fs.readFileSync(CACHE_F, 'utf8'));
    const nLiga = Object.keys(cache.ligaTeams||{}).length;
    const nStad = Object.keys(cache.stadien||{}).length;
    console.log(`\nCache: ${nLiga} Ligen, ${nStad} Stadien → Resume`);
  }
  cache.stadien   = cache.stadien   || {};
  cache.ligaTeams = cache.ligaTeams || {};

  // 1) Liga-IDs
  let leagues = cache.leagues;
  if (!leagues) {
    leagues = await fetchGermanLeagueIds();
    cache.leagues = leagues;
    fs.writeFileSync(CACHE_F, JSON.stringify(cache, null, 2));
  } else {
    console.log(`\n[1] Liga-IDs aus Cache: ${leagues.length}`);
  }

  // 2) Teams pro Liga
  console.log(`\n[2] Scrape ${leagues.length} Ligaseiten...`);
  let li = 0;
  for (const liga of leagues) {
    li++;
    if (cache.ligaTeams[liga.id] !== undefined) continue;
    process.stdout.write(`  [${li}/${leagues.length}] ${liga.name}... `);
    const teams = await fetchTeamsForLeague(liga.id, liga.name);
    cache.ligaTeams[liga.id] = teams;
    const withCoord = teams.filter(t => t.coords.length > 0).length;
    console.log(`${teams.length} Teams (${withCoord} mit Koord)`);
    if (li % 25 === 0) fs.writeFileSync(CACHE_F, JSON.stringify(cache, null, 2));
  }
  fs.writeFileSync(CACHE_F, JSON.stringify(cache, null, 2));

  // 3) Spielgemeinschaften
  await enrichSpielergemeinschaften(cache);
  fs.writeFileSync(CACHE_F, JSON.stringify(cache, null, 2));

  // 4) Matching
  console.log('\n[4] Matching gegen game_data.js...');
  const src = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
  eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

  const epFlat = [];
  for (const teams of Object.values(cache.ligaTeams)) {
    for (const t of teams) {
      if (t.coords && t.coords.length > 0) epFlat.push(t);
    }
  }
  console.log(`  Europlan-Teams mit Koordinaten: ${epFlat.length}`);

  const missing = Object.values(GAME_DATA.teams).filter(t => t.lat === 0 && t.lon === 0);
  console.log(`  Unsere Teams ohne Koordinaten:  ${missing.length}`);

  const matched = [], unmatched = [];
  for (const team of missing) {
    const norm = normName(team.name);
    const res = matchTeam(norm, epFlat);
    if (res) {
      matched.push({
        teamId: team.id,
        teamName: team.name,
        matchedEpName: res.team.teamName,
        matchScore: res.score,
        ligaName: res.team.ligaName,
        coords: res.team.coords
      });
    } else {
      unmatched.push({ teamId: team.id, teamName: team.name });
    }
  }

  fs.writeFileSync(OUT_F, JSON.stringify({ matched, unmatched }, null, 2));

  console.log(`\n  ✓ Gematcht:       ${matched.length}`);
  console.log(`  ✗ Nicht gefunden: ${unmatched.length}`);
  const byScore = {};
  for (const m of matched) byScore[m.matchScore] = (byScore[m.matchScore]||0)+1;
  console.log('  Match-Qualität:', byScore);
  console.log(`\nRohdaten: ${CACHE_F}\nErgebnis: ${OUT_F}`);
  console.log('Nächster Schritt: node tools/apply_coords.cjs --dry-run');
}

main().catch(e => { console.error('\nFEHLER:', e); process.exit(1); });
