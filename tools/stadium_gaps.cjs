/**
 * Warum hat ein Verein KEIN Stadion bekommen - und welcher europlan-Eintrag waere es?
 *
 *   node tools/stadium_gaps.cjs           Bericht
 *   node tools/stadium_gaps.cjs --json    zusaetzlich tools/stadium_gaps.json
 *
 * Die Vorschlaege sind nach Verlaesslichkeit gestaffelt. Zwei Sicherungen gegen die
 * "gleiche Stadt ist nicht derselbe Klub"-Falle:
 *  - der europlan-Eintrag darf nicht schon einem anderen unserer Teams zugeordnet sein
 *  - ein Vorschlag zaehlt nur, wenn er im Umkreis EINDEUTIG ist (kein zweiter Kandidat
 *    mit aehnlich gutem Namen), sonst landet er in "mehrdeutig"
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JSONOUT = process.argv.includes('--json');
const WRITESG = process.argv.includes('--write-sg');
// --write-a: die vom Nutzer durchgesehene A-Liste eintragen. tools/stadium_reject.json
// haelt die Vereinsnamen, die dabei NICHT geschrieben werden sollen (gleicher Ortsname,
// anderer Verein - Altona 93 vs. SC Union 03 Altona).
// tools/stadium_approve.json ist die Gegenrichtung: Vereine, die der Nutzer EINZELN
// freigegeben hat, obwohl die Automatik sie nur als "mehrdeutig"/B/C einstuft. Ohne diese
// Liste bliebe jede Einzelentscheidung nur im Chat stehen und der naechste Lauf vergisst sie.
const WRITEA  = process.argv.includes('--write-a');
let REJECT = [], APPROVE = [];
try { REJECT = JSON.parse(fs.readFileSync(path.join(__dirname, 'stadium_reject.json'), 'utf8')); } catch {}
try { APPROVE = JSON.parse(fs.readFileSync(path.join(__dirname, 'stadium_approve.json'), 'utf8')); } catch {}

const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'europlan_stadiums.json'), 'utf8'));
const src   = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

const NOISE = new Set(['ev','e','v','fussball','fussballclub','fussballverein','sportverein','sv','fc','sc','tsv','vfl','vfb','tus','sg','sv','spvgg','djk','fsv','ssv','vfr','bsc','sf','rw','bv','tsg','msv','asv','atsv','fcv','1','sgm']);
const fold = s => (s||'').toLowerCase()
  .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const rankOf = n => /\b(iii|3)\b\s*$/.test(n) ? 3 : /\b(ii|2|u ?23|amateure)\b\s*$/.test(n) ? 2 : 1;
const stripRank  = n => n.replace(/\b(iii|ii|u ?23|amateure|2|3)\b\s*$/,'').trim();
const stripYears = n => n.split(' ').filter(w => !/^\d+$/.test(w)).join(' ');
function keyOf(name) {
  const f = fold(name), base = stripYears(stripRank(f));
  return { rank: rankOf(f), base, tokens: new Set(base.split(' ').filter(w => w.length >= 4 && !NOISE.has(w))) };
}
function km(a,b,c,d) {
  const R=6371, r=Math.PI/180, dLa=(c-a)*r, dLo=(d-b)*r;
  const h=Math.sin(dLa/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function jacc(a,b) {
  if (!a.size || !b.size) return 0;
  let s=0; for (const x of a) if (b.has(x)) s++;
  return s / (a.size + b.size - s);
}
// Deckt eine Seite die andere ganz ab? Faengt "SG A/B/C" vs "SG A/B/C/D" und Umsortierungen.
function deckung(a,b) {
  if (!a.size || !b.size) return 0;
  let s=0; for (const x of a) if (b.has(x)) s++;
  return s / Math.min(a.size, b.size);
}

const epTeams = [];
for (const arr of Object.values(cache.ligaTeams))
  for (const t of arr) epTeams.push({ ...t, ...keyOf(t.teamName) });

// wie in match_stadiums.cjs: EP-Eintrag -> venues[]
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

// Welche europlan-Eintraege sind bereits vergeben? (Stadion-URL eines gematchten Teams)
const vergeben = new Set();
for (const t of Object.values(GAME_DATA.teams))
  for (const v of (t.venues || [])) if (v.lat != null) vergeben.add(v.lat.toFixed(4) + ',' + v.lon.toFixed(4));

const luecken = [];
for (const t of Object.values(GAME_DATA.teams)) {
  if (t.venues && t.venues.length) continue;
  const k = keyOf(t.name);
  const liga = (t.leagueId && GAME_DATA.leagues[t.leagueId]) ? GAME_DATA.leagues[t.leagueId].name : null;

  const kand = [];
  for (const ep of epTeams) {
    if (ep.rank !== k.rank) continue;
    if (ep.lat == null || t.lat == null) continue;
    const d = km(t.lat, t.lon, ep.lat, ep.lon);
    if (d > 25) continue;
    const j = jacc(k.tokens, ep.tokens), dk = deckung(k.tokens, ep.tokens);
    if (j <= 0 && !dk) continue;
    const belegt = vergeben.has(ep.lat.toFixed(4) + ',' + ep.lon.toFixed(4));
    kand.push({ ep, d, j, dk, belegt });
  }
  kand.sort((a,b) => (b.dk - a.dk) || (b.j - a.j) || (a.d - b.d));
  const frei = kand.filter(c => !c.belegt);
  const best = frei[0] || null;
  const zweiter = frei[1] || null;

  let stufe;
  if (!kand.length)                       stufe = 'kein Kandidat';
  else if (!best)                         stufe = 'Kandidat schon vergeben';
  else if (zweiter && zweiter.dk >= best.dk && zweiter.j >= best.j - 0.05) stufe = 'mehrdeutig';
  else if (best.dk === 1 && best.d <= 5)  stufe = 'A sicher';
  else if (best.dk >= 0.5 && best.d <= 3) stufe = 'B wahrscheinlich';
  else                                    stufe = 'C unsicher';

  // Spielgemeinschaften lassen sich nicht sauber aufteilen: europlan fuehrt "Ground A" und
  // "Ground B" derselben SG als getrennte Eintraege, und ein Dorfverein, der in einer SG
  // spielt, nutzt deren Plaetze mit. Deshalb ALLE freien Kandidaten sammeln statt einen zu
  // waehlen - genau das machte die Faelle vorher "mehrdeutig".
  // ABER nur, wenn alle Kandidaten DERSELBE europlan-Verein sind. Europlan haengt an eine
  // SG mit mehreren Plaetzen ein "(Ground A/B/…)" an - das strippen wir und pruefen, ob eine
  // einzige Vereinsidentitaet uebrig bleibt. Ohne diese Klammer sammelt die Regel in Staedten
  // die Plaetze FREMDER Vereine ein (SC Duesseldorf-West bekam 8 Anlagen von acht Klubs,
  // Sportfreunde Hamborn 07 sogar die Nebenanlage des MSV Duisburg).
  // Die Klammer dagegen: europlan markiert einen Verein mit mehreren Plaetzen SELBST als
  // "(Ground A)", "(Ground B)". Nur diese Eintraege sammeln wir zusammen - und zwar die
  // Grounds EINER Identitaet, nicht alles, was in der Naehe aehnlich heisst. Sonst bekaeme
  // SC Duesseldorf-West acht Anlagen von acht fremden Klubs und Sportfreunde Hamborn 07
  // die Nebenanlage des MSV Duisburg.
  const sgVenues = [];
  const ident = c => fold(c.ep.teamName.replace(/\(ground[^)]*\)/ig, ''));
  const taugt = frei.filter(c => c.dk >= 0.5);
  const beste = taugt[0] ? ident(taugt[0]) : null;
  const grounds = taugt.filter(c => ident(c) === beste);
  const istSG = grounds.length > 1 && grounds.some(c => /\(ground/i.test(c.ep.teamName));
  if (istSG) {
    const seen = new Set();
    for (const c of grounds)
      for (const v of venueOf(c.ep)) if (!seen.has(v.url)) { seen.add(v.url); sgVenues.push(v); }
  }

  luecken.push({ team: t.name, teamId: t.id, rang: k.rank, liga: liga || '(ligalos)', ligalos: !liga, stufe,
                 sgVenues,
                 kandidat: best ? best.ep.teamName : (kand[0] ? kand[0].ep.teamName : ''),
                 kandidatLiga: best ? best.ep.ligaName : '',
                 stadion: best ? (best.ep.stadiums||[]).map(s=>s.name).join(' / ') : '',
                 urls: best ? (best.ep.stadiums||[]).map(s=>s.url).filter(Boolean) : [],
                 bestVenues: best ? venueOf(best.ep) : [],
                 km: best ? Math.round(best.d*10)/10 : null,
                 jacc: best ? Math.round(best.j*100)/100 : 0,
                 deckung: best ? Math.round(best.dk*100)/100 : 0 });
}

const ORD = ['A sicher','B wahrscheinlich','mehrdeutig','C unsicher','Kandidat schon vergeben','kein Kandidat'];
const proStufe = {};
for (const l of luecken) (proStufe[l.stufe] = proStufe[l.stufe] || []).push(l);
console.log('=== Vereine ohne Spielstaette: ' + luecken.length + ' ===');
console.log('    davon ligalos: ' + luecken.filter(l => l.ligalos).length + '\n');
for (const s of ORD) {
  const arr = proStufe[s]; if (!arr) continue;
  console.log('--- ' + s + ': ' + arr.length + ' ---');
  for (const l of arr) {
    const links = (l.team + (l.ligalos ? ' *' : '')).padEnd(36).slice(0,36);
    if (!l.kandidat) { console.log('   ' + links + '(nichts im Umkreis)'); continue; }
    console.log('   ' + links + l.kandidat.padEnd(34).slice(0,34) +
      ' ' + String(l.km).padStart(5) + ' km  deck ' + l.deckung.toFixed(2) +
      '  ' + (l.stadion || '?').slice(0,34));
  }
  console.log();
}
console.log('* = ligalos (spielt in keiner Liga)');
if (JSONOUT) {
  fs.writeFileSync(path.join(__dirname, 'stadium_gaps.json'), JSON.stringify(luecken, null, 1));
  console.log('\nDatei: tools/stadium_gaps.json');
}

// ── durchgesehene A-Liste schreiben ──────────────────────────────────────────
if (WRITEA) {
  const abgelehnt  = new Set(REJECT);
  const freigegeben = new Set(APPROVE);
  const nehmen = luecken.filter(l => (l.stufe === 'A sicher' || freigegeben.has(l.team)) &&
                                     l.bestVenues.length && !abgelehnt.has(l.team));
  console.log('\n=== A-Liste schreiben: ' + nehmen.length + ' Vereine (' + freigegeben.size +
              ' einzeln freigegeben, ' + abgelehnt.size + ' abgelehnt) ===');
  let plaetze = 0;
  for (const l of nehmen) {
    const team = GAME_DATA.teams[l.teamId];
    if (!team) { console.log('   ⚠ Team nicht gefunden: ' + l.team); continue; }
    team.venues = l.bestVenues.map(v => ({
      stadName: v.stadName,
      ort: v.ort || '',
      kapazitaet: v.kapazitaet || null,
      lat: v.lat != null ? +v.lat.toFixed(5) : null,
      lon: v.lon != null ? +v.lon.toFixed(5) : null
    }));
    plaetze += team.venues.length;
    console.log('   ' + l.team.padEnd(34).slice(0,34) + team.venues.map(v => v.stadName + (v.kapazitaet ? ' (' + v.kapazitaet + ')' : '')).join(' | ').slice(0,64));
  }
  for (const t of abgelehnt) console.log('   abgelehnt: ' + t);
  fs.writeFileSync(path.join(ROOT, 'game_data.js'), 'const GAME_DATA = ' + JSON.stringify(GAME_DATA) + ';', 'utf8');
  console.log('\ngame_data.js: ' + nehmen.length + ' Vereine, ' + plaetze + ' Spielstaetten geschrieben');
}

// ── SG-Faelle schreiben ──────────────────────────────────────────────────────
if (WRITESG) {
  const sg = luecken.filter(l => l.sgVenues && l.sgVenues.length);
  console.log('\n=== SG-Faelle schreiben: ' + sg.length + ' Vereine ===');
  let plaetze = 0;
  for (const l of sg) {
    const team = GAME_DATA.teams[l.teamId];
    if (!team) { console.log('   ⚠ Team nicht gefunden: ' + l.team); continue; }
    team.venues = l.sgVenues.map(v => ({
      stadName: v.stadName,
      ort: v.ort || '',
      kapazitaet: v.kapazitaet || null,
      lat: v.lat != null ? +v.lat.toFixed(5) : null,
      lon: v.lon != null ? +v.lon.toFixed(5) : null
    }));
    plaetze += team.venues.length;
    console.log('   ' + l.team.padEnd(36).slice(0,36) + team.venues.length + ' Platz/Plaetze: ' +
                team.venues.map(v => v.stadName).join(' | ').slice(0,70));
  }
  fs.writeFileSync(path.join(ROOT, 'game_data.js'), 'const GAME_DATA = ' + JSON.stringify(GAME_DATA) + ';', 'utf8');
  console.log('\ngame_data.js: ' + sg.length + ' Vereine, ' + plaetze + ' Spielstaetten geschrieben');
}
