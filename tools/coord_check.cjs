/**
 * Koordinaten gegen europlan pruefen. Findet Faelle wie TSG 1846 Bretzenheim, das auf
 * Bretzenheim an der Nahe stand statt auf Mainz-Bretzenheim - 28 km daneben.
 *
 *   node tools/coord_check.cjs           Bericht
 *   node tools/coord_check.cjs --json    zusaetzlich tools/coord_check.json
 *   node tools/coord_check.cjs --write   uebernimmt die Treffer ab MIN_KM in game_data.js
 *
 * Der Stadion-Matcher hat ein Distanz-Veto von 25 km, solche Vereine fallen dort also
 * stillschweigend durch. Hier ist die Distanz umgekehrt das GESUCHTE: gleicher Name,
 * gleicher Mannschaftsrang, aber weit auseinander. Damit der Name allein nicht reicht,
 * muss er eindeutig sein - gibt es mehrere gleichnamige EP-Vereine, wird nichts gemeldet.
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JSONOUT = process.argv.includes('--json');
const WRITE   = process.argv.includes('--write');
const MIN_KM  = 10;   // ab hier gilt der Punkt als verdaechtig

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
const setEq = (a,b) => { if (a.size !== b.size || !a.size) return false; for (const x of a) if (!b.has(x)) return false; return true; };
function km(a,b,c,d) {
  const R=6371, r=Math.PI/180, dLa=(c-a)*r, dLo=(d-b)*r;
  const h=Math.sin(dLa/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

const epTeams = [];
for (const arr of Object.values(cache.ligaTeams))
  for (const t of arr) if (t.lat != null) epTeams.push({ ...t, ...keyOf(t.teamName) });

const funde = [];
for (const t of Object.values(GAME_DATA.teams)) {
  if (t.lat == null) continue;
  const k = keyOf(t.name);
  // Nur Namensgleichheit zaehlt - Token-Set-Gleichheit ist hier zu lax, weil ohne
  // Distanzschranke gesucht wird und sonst gleichnamige Nachbarorte hereinrutschen.
  const treffer = epTeams.filter(e => e.rank === k.rank && (e.base === k.base || setEq(e.tokens, k.tokens)));
  if (!treffer.length) continue;
  // Standorte der Treffer buendeln: mehrere Eintraege desselben Vereins (I./II., mehrere
  // Ligen) liegen beieinander und zaehlen als EIN Ort.
  const orte = [];
  for (const e of treffer) {
    const nah = orte.find(o => km(o.lat, o.lon, e.lat, e.lon) < 5);
    if (nah) { nah.n++; continue; }
    orte.push({ lat: e.lat, lon: e.lon, name: e.teamName, liga: e.ligaName, n: 1 });
  }
  // Mehrere gleichnamige Vereine an verschiedenen Orten (Bretzenheim gibt es dreimal):
  // die STAFFEL entscheidet. Welcher der Orte liegt im Gebiet der Staffel, in der unser
  // Verein spielt? Gemessen am Abstand zu den naechsten Vereinskameraden dieser Staffel.
  // Ohne diesen Schritt fiel ausgerechnet der Anlassfall Bretzenheim durch die Sperre.
  let o;
  if (orte.length === 1) o = orte[0];
  else {
    const staffel = (t.regions || []).slice(-1)[0];
    const kameraden = Object.values(GAME_DATA.teams)
      .filter(x => x.id !== t.id && x.lat != null && (x.regions||[]).includes(staffel));
    if (!staffel || kameraden.length < 3) continue;
    const passung = ort => kameraden.map(x => km(ort.lat, ort.lon, x.lat, x.lon))
                                    .sort((a,b) => a-b).slice(0,3)
                                    .reduce((s,v) => s+v, 0) / 3;
    const bewertet = orte.map(x => ({ x, p: passung(x) })).sort((a,b) => a.p - b.p);
    // nur uebernehmen, wenn ein Ort DEUTLICH besser zur Staffel passt als die anderen
    if (bewertet.length > 1 && bewertet[1].p < bewertet[0].p * 2) continue;
    o = bewertet[0].x;
  }
  const d = km(t.lat, t.lon, o.lat, o.lon);
  if (d < MIN_KM) continue;
  funde.push({ team: t.name, teamId: t.id, km: Math.round(d*10)/10,
               unsLat: t.lat, unsLon: t.lon, epLat: +o.lat.toFixed(5), epLon: +o.lon.toFixed(5),
               epName: o.name, epLiga: o.liga,
               regionen: (t.regions||[]).slice(2),
               hatVenue: !!(t.venues && t.venues.length) });
}
funde.sort((a,b) => b.km - a.km);

console.log('=== Koordinaten, die weit von ihrem europlan-Namensvetter liegen ===');
console.log('Eindeutiger Namenstreffer, gleicher Rang, ab ' + MIN_KM + ' km. Treffer: ' + funde.length + '\n');
for (const f of funde)
  console.log('   ' + String(f.km).padStart(6) + ' km  ' + f.team.padEnd(32).slice(0,32) +
    ' unser ' + f.unsLat.toFixed(3) + ',' + f.unsLon.toFixed(3) +
    '  ep ' + f.epLat.toFixed(3) + ',' + f.epLon.toFixed(3) + '  [' + f.epLiga + ']');

if (JSONOUT) {
  fs.writeFileSync(path.join(__dirname, 'coord_check.json'), JSON.stringify(funde, null, 1));
  console.log('\nDatei: tools/coord_check.json');
}
if (WRITE) {
  // Namensgleichheit allein reicht nicht: es gibt Mariendorf in Berlin UND bei Hofgeismar,
  // Schwalbach an der Saar UND am Taunus, Preussen in Magdeburg UND in Vorpommern. Diese
  // Faelle stehen in coord_reject.json und werden nicht angefasst.
  let REJECT = [];
  try { REJECT = JSON.parse(fs.readFileSync(path.join(__dirname, 'coord_reject.json'), 'utf8')); } catch {}
  const abgelehnt = new Set(REJECT);
  let n = 0;
  for (const f of funde) {
    if (abgelehnt.has(f.team)) { console.log('   uebersprungen: ' + f.team); continue; }
    const team = GAME_DATA.teams[f.teamId];
    if (!team) continue;
    team.lat = f.epLat; team.lon = f.epLon;
    // venues[] haengt an der alten Position und ist damit ungueltig - der Stadion-Matcher
    // setzt sie im naechsten Lauf neu.
    if (team.venues) delete team.venues;
    n++;
  }
  fs.writeFileSync(path.join(ROOT, 'game_data.js'), 'const GAME_DATA = ' + JSON.stringify(GAME_DATA) + ';', 'utf8');
  console.log('\ngame_data.js: ' + n + ' Koordinaten korrigiert (venues[] dieser Vereine entfernt)');
}
