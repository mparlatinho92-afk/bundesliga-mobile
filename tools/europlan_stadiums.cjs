/**
 * Europlan-Online Stadion-Scraper (Name, Ort, Kapazität) – Deutsche Ligen Level 1-8
 *
 * Zwei Phasen:
 *  [1] Ligaseiten (247)  → pro Team-in-Liga: Stadionname, Kapazität, Koordinaten, Stadion-URL
 *  [2] Stadionseiten     → Ort (Anschrift), Kapazität (autoritativ), Untergrund, Eröffnung
 *
 * Ausgabe/Cache: tools/europlan_stadiums.json   (Resume: einfach erneut starten)
 * Aufruf: node tools/europlan_stadiums.cjs
 */

const fs   = require('fs');
const path = require('path');

const BASE    = 'https://www.europlan-online.de';
const DELAY   = 900;          // ms zwischen Requests – der Server sperrt bei zu schnellem Zugriff
const WORKERS = 1;
const CACHE_F = path.join(__dirname, 'europlan_stadiums.json');
const NEED_F  = path.join(__dirname, 'stadium_needed.json');    // optionale URL-Whitelist für Phase 2

const UA = 'Mozilla/5.0 (stadionbot; contact: mparlatinho92@gmail.com)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Bei Verbindungsfehlern lange warten: der Server blockt die IP zeitweise komplett.
async function getHtml(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
      if (res.status === 404) return '';
      process.stdout.write(`[HTTP ${res.status}]`);
    } catch (e) { process.stdout.write('[conn]'); }
    await sleep(i === 0 ? 5000 : 60000);
  }
  return '';
}

const ENT = { amp:'&', auml:'ä', ouml:'ö', uuml:'ü', Auml:'Ä', Ouml:'Ö', Uuml:'Ü', szlig:'ß', quot:'"', apos:"'", nbsp:' ', raquo:'»', ndash:'–' };
function dec(s) {
  return (s || '').replace(/&([a-zA-Z]+);/g, (m, e) => ENT[e] !== undefined ? ENT[e] : m)
                  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
                  .replace(/\s+/g, ' ').trim();
}
function strip(s) { return dec((s || '').replace(/<[^>]+>/g, ' ')); }

function parseKapa(txt) {
  const t = (txt || '').replace(/\./g, '').replace(/&nbsp;/g, ' ').trim();
  const m = t.match(/(\d{2,7})/);
  return m ? parseInt(m[1], 10) : null;
}
function absUrl(u) { return u.startsWith('http') ? u : `${BASE}/${u.replace(/^\//, '')}`; }

// ── Phase 1: Ligaseite ───────────────────────────────────────────────────────

function parseLeaguePage(html, liga) {
  const out = [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const nameM = row.match(/<span translate="no">([^<]+)<\/span>/i);
    if (!nameM) continue;
    const teamName = dec(nameM[1]);

    // Alle Stadion-Links der Zeile (Spielgemeinschaften können mehrere haben)
    const links = [...row.matchAll(/<a\s[^>]*href="([^"]*stadion-\d+\.html)"[^>]*>/gi)];
    const seen = new Map();
    for (const m of links) {
      const url = absUrl(m[1]);
      const tM = m[0].match(/title="([^"]*)"/i);
      if (!seen.has(url) || (!seen.get(url) && tM)) seen.set(url, dec(tM ? tM[1] : ''));
    }
    if (!seen.size) continue;

    const kapaM = row.match(/<td class="kapazitaet">([\s\S]*?)<\/td>/i);
    const coordM = row.match(/fromLonLat\(\[\s*([\d.\-]+)\s*,\s*([\d.\-]+)\s*\]\)/);

    out.push({
      teamName,
      ligaId: liga.id, ligaName: liga.name, level: liga.level,
      kapazitaet: kapaM ? parseKapa(strip(kapaM[1])) : null,
      lat: coordM ? parseFloat(coordM[2]) : null,
      lon: coordM ? parseFloat(coordM[1]) : null,
      stadiums: [...seen.entries()].map(([url, name]) => ({ url, name }))
    });
  }
  return out;
}

// ── Phase 2: Stadionseite ────────────────────────────────────────────────────

function parseStadiumPage(html, url) {
  const o = { url, name: '', ortsteil: '', strasse: '', plz: '', ort: '', kapazitaet: null,
              untergrund: '', eroeffnung: null, lat: null, lon: null, land: '', kreis: '' };

  const h1 = html.match(/<div id="stadion-header">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const full = strip(h1[1]);
    const nm = h1[1].match(/<span translate="no">([^<]*)<\/span>\s*(?:-\s*(.*))?/i);
    if (nm) { o.name = dec(nm[1]); o.ortsteil = dec((nm[2] || '').replace(/<[^>]+>/g, '')); }
    else o.name = full;
  }

  // Anschrift: <strong>NAME</strong><br/> STRASSE<br/> PLZ ORT<br/>
  const adr = html.match(/class="stadion-infobox-anschrift"[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  if (adr) {
    const lines = adr[1].split(/<br\s*\/?>/i).map(strip).filter(Boolean);
    // erste Zeile = Stadionname (im <strong>)
    const rest = lines.slice(1);
    for (const l of rest) {
      const m = l.match(/^(\d{5})\s+(.+)$/);
      if (m) { o.plz = m[1]; o.ort = m[2]; }
      else if (!o.strasse) o.strasse = l;
    }
  }

  const daten = html.match(/class="stadion-infobox-daten"[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  if (daten) {
    const t = strip(daten[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '));
    const k = t.match(/Kapazität:\s*([\d.]+)/i);        if (k) o.kapazitaet = parseKapa(k[1]);
    const u = t.match(/Untergrund:\s*([^\n]+?)(?:\s+(?:Laufbahn|Flutlicht|Eröffnung|zur Website)|$)/i); if (u) o.untergrund = u[1].trim();
    const e = t.match(/Er(?:ö|oe)ffnung:\s*(\d{4})/i);   if (e) o.eroeffnung = parseInt(e[1], 10);
  }

  const c = html.match(/maps\?q=\((\-?[\d.]+),\s*(\-?[\d.]+)\)/) || html.match(/[?&]lat=([0-9\-.]+)&(?:amp;)?lon=([0-9\-.]+)/i);
  if (c) { o.lat = parseFloat(c[1]); o.lon = parseFloat(c[2]); }

  const bc = [...html.matchAll(/href="index\.php\?s=gebiet&(?:amp;)?(bl|lk)=([^"]+)"[^>]*>([^<]+)</gi)];
  for (const m of bc) { if (m[1] === 'bl') o.land = dec(m[3]); else o.kreis = dec(m[3]); }

  return o;
}

// ── Worker-Pool ──────────────────────────────────────────────────────────────

async function pool(items, worker, label) {
  let i = 0, done = 0;
  const total = items.length;
  const run = async () => {
    while (i < total) {
      const idx = i++;
      await worker(items[idx]);
      done++;
      if (done % 50 === 0 || done === total) process.stdout.write(`\r  ${label}: ${done}/${total}   `);
      await sleep(DELAY);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, run));
  process.stdout.write('\n');
}

// ── Haupt ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Europlan Stadion-Scraper (Name / Ort / Kapazität) ===');

  let cache = { leagues: [], ligaTeams: {}, stadien: {} };
  if (fs.existsSync(CACHE_F)) {
    cache = JSON.parse(fs.readFileSync(CACHE_F, 'utf8'));
    cache.ligaTeams = cache.ligaTeams || {};
    cache.stadien   = cache.stadien   || {};
  }
  const save = () => fs.writeFileSync(CACHE_F, JSON.stringify(cache, null, 1));

  // Liga-Index: ALLE deutschen Ligen Level 1-8 von der Länderseite (ganze Seite, nicht nur
  // die ersten 200k Zeichen – der alte Scrape hatte dadurch u.a. ganz Bayern verloren)
  if (!process.argv.includes('--no-index')) {
    const html = await getHtml(`${BASE}/index.php?s=land&id=1`);
    if (html) {
      const known = new Map((cache.leagues || []).map(l => [l.id, l]));
      const re = /href="index\.php\?s=liga&(?:amp;)?id=(\d+)"[^>]*>([^<]+)</g;
      let m, added = 0;
      while ((m = re.exec(html)) !== null) {
        const name = dec(m[2]);
        const lvlM = name.match(/\((\d+)\)\s*$/);
        const level = lvlM ? parseInt(lvlM[1]) : 99;
        if (level > 8) continue;
        if (!known.has(m[1])) { known.set(m[1], { id: m[1], name, level }); added++; }
      }
      cache.leagues = [...known.values()];
      console.log(`\n[0] Liga-Index: ${cache.leagues.length} Ligen (${added} neu)`);
      save();
    } else {
      console.log('\n[0] Liga-Index nicht erreichbar – nutze Cache');
    }
  }
  console.log(`\n[1] ${cache.leagues.length} Ligaseiten (Cache: ${Object.keys(cache.ligaTeams).length})`);

  const todoL = cache.leagues.filter(l => !cache.ligaTeams[l.id]);
  let sinceSave = 0;
  await pool(todoL, async (liga) => {
    const html = await getHtml(`${BASE}/index.php?s=liga&id=${liga.id}`);
    cache.ligaTeams[liga.id] = html ? parseLeaguePage(html, liga) : [];
    if (++sinceSave % 25 === 0) save();
  }, 'Ligen');
  save();

  if (process.argv.includes('--skip-details')) {
    const n = Object.values(cache.ligaTeams).reduce((a, b) => a + b.length, 0);
    console.log(`\nPhase 1 fertig: ${Object.keys(cache.ligaTeams).length} Ligen, ${n} Team-Einträge`);
    return;
  }

  // Alle eindeutigen Stadion-URLs sammeln – wenn stadium_needed.json existiert, nur die
  // tatsächlich gebrauchten (Treffer unserer Teams) laden statt aller ~4000 Stadien
  let urls = new Set();
  for (const arr of Object.values(cache.ligaTeams)) for (const t of arr) for (const s of t.stadiums) urls.add(s.url);
  if (fs.existsSync(NEED_F)) {
    const need = new Set(JSON.parse(fs.readFileSync(NEED_F, 'utf8')));
    urls = new Set([...urls].filter(u => need.has(u)));
    console.log(`  (Whitelist stadium_needed.json: ${need.size} URLs)`);
  }
  const todoS = [...urls].filter(u => !cache.stadien[u] || cache.stadien[u]._fail);   // Fehlschläge erneut versuchen
  console.log(`\n[2] ${urls.size} Stadien gesamt, ${todoS.length} noch zu laden`);

  sinceSave = 0;
  await pool(todoS, async (url) => {
    const html = await getHtml(url);
    cache.stadien[url] = html ? parseStadiumPage(html, url) : { url, name: '', ort: '', kapazitaet: null, _fail: true };
    if (++sinceSave % 25 === 0) save();
  }, 'Stadien');
  save();

  // Statistik
  const st = Object.values(cache.stadien);
  const nTeams = Object.values(cache.ligaTeams).reduce((a, b) => a + b.length, 0);
  console.log(`\nFertig: ${nTeams} Team-Einträge, ${st.length} Stadien`);
  console.log(`  mit Ort:       ${st.filter(s => s.ort).length}`);
  console.log(`  mit Kapazität: ${st.filter(s => s.kapazitaet).length}`);
  console.log(`  Fehlschläge:   ${st.filter(s => s._fail).length}`);
  console.log(`\nDatei: ${CACHE_F}`);
}

main().catch(e => { console.error('\nFEHLER:', e); process.exit(1); });
