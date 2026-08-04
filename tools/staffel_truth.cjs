/**
 * Staffelzuordnung gegen europlan pruefen - Beleg statt Plausibilitaet.
 *
 *   node tools/staffel_truth.cjs           Bericht
 *   node tools/staffel_truth.cjs --json    zusaetzlich tools/staffel_truth.json
 *
 * tools/staffel_outlier.cjs fragt die NACHBARN eines Vereins ("7 von 8 spielen woanders").
 * Das ist Plausibilitaet und lag schon zweimal daneben - an echten Kreisgrenzen hat ein
 * Grenzverein zwangslaeufig fremde Nachbarn, und bei TSG 1846 Bretzenheim war in Wahrheit
 * die Koordinate falsch. Hier steht die Staffel dagegen AUSGESCHRIEBEN im europlan-Liganamen:
 * "Landesliga Schleswig-Holstein Schleswig", "Bezirksliga Suedwest Rheinhessen". Wer in der
 * Mitgliederliste einer solchen Liga steht, dessen Staffel ist belegt.
 *
 * Zwei Sicherungen gegen die "gleicher Name, anderer Verein"-Falle:
 *  - Rang muss passen (I/II/III), sonst zaehlt die Reserve fuer den Erstverein
 *  - Koordinatenabstand <= MAXKM, sonst ist es ein Namensvetter in einer anderen Stadt
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JSONOUT = process.argv.includes('--json');
const MAXKM   = +(process.env.MAXKM || 15);

const src = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
eval(src.replace('const GAME_DATA', 'var GAME_DATA'));
const EP = JSON.parse(fs.readFileSync(path.join(__dirname, 'europlan_stadiums.json'), 'utf8'));

// Unsere Staffel-Labels: genau die, die eine eigene Liga haben (REGION_TO_LEAGUE_ID im Engine).
// Hier aus game_data abgeleitet, damit das Skript ohne game_engine.js auskommt.
const STAFFELN = new Set();
const stufeVon = {};   // Label -> Stufe (Position in team.regions, wie in gen_regions.py)
for (const t of Object.values(GAME_DATA.teams)) (t.regions || []).forEach((r, i) => {
  STAFFELN.add(r);
  stufeVon[r] = Math.min(stufeVon[r] == null ? 99 : stufeVon[r], i + 1);
});

const fold = s => (s || '').toLowerCase()
  .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const km = (a, b, c, d) => {
  const R = 6371, p = Math.PI / 180;
  const dl = (c - a) * p, dn = (d - b) * p;
  const x = Math.sin(dl/2)**2 + Math.cos(a*p) * Math.cos(c*p) * Math.sin(dn/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// ── 1) europlan-Liga -> unser Staffel-Label ─────────────────────────────────
// Automatisch ueber die Endung, plus die Faelle, in denen europlan anders schreibt.
const ALIAS = {
  'Fußballverband Rheinland': 'rheinlandliga',
  'Saarland':                 'saarlandliga',
  'Südwestdeutscher Fußballverband': 'verbandsliga suedwest',
  'Sachsen':                  'sachsenliga',
  'Thüringen':                'thueringenliga',
  'Berlin':                   'berlin liga',
  'Brandenburg':              'brandenburg liga'
};
function ligaLabel(ligaName) {
  const n = fold(ligaName).replace(/ \d+$/, '');          // die " (6)"-Ebene faellt schon in fold
  const nOhneLiga = n.replace(/liga\b/g, '').replace(/\s+/g, ' ').trim();
  let best = null;
  for (const lb of STAFFELN) {
    if (ALIAS[lb] && (n === ALIAS[lb] || n.startsWith(ALIAS[lb]))) return lb;
    const key = fold(lb.replace(/\(.*?\)/g, ''));          // "Mittelrhein 1 (Ost)" -> "mittelrhein 1"
    if (!key) continue;
    const treffer = n === key || n.endsWith(' ' + key) || nOhneLiga === key || nOhneLiga.endsWith(' ' + key);
    if (treffer && (!best || key.length > fold(best.replace(/\(.*?\)/g, '')).length)) best = lb;
  }
  return best;
}

const ligaVon = {};        // ligaId -> unser Label
const labelHat = {};       // Label -> ligaName (fuer den Bericht)
for (const l of EP.leagues) {
  if (l.level < 5 || l.level > 8) continue;
  const lb = ligaLabel(l.name);
  if (!lb) continue;
  ligaVon[l.id] = lb;
  (labelHat[lb] = labelHat[lb] || []).push(l.name);
}

// ── 1b) Durchgezaehlte Staffeln: Zuordnung nach Nummer, ungeprueft ──────────
// "Landesliga Niederrhein 1/2" sagt nicht, welche Haelfte gemeint ist. Hier wird schlicht
// Nummer auf Nummer abgebildet. Ob das stimmt, ist NICHT verifiziert: gemessen liegt
// europlans Niederrhein 1 im Norden (51,48), unsere "Niederrhein 1 (Süd)" im Sueden
// (51,23) - bei Mittelrhein und Westfalen passen die Nummern dagegen. Ich hatte erst
// nach Schwerpunkt umsortiert; das ist aber eine Annahme ueber die Wirklichkeit und
// gehoert nicht ins Skript. Solange die Zuordnung ungeklaert ist, sind die Befunde in
// durchgezaehlten Staffeln mit Vorsicht zu lesen - Vermerk in staffel_realitaet.json.

// ── 1c) Welche unserer Staffeln sind ueberhaupt an der Wirklichkeit messbar? ─
// NICHT raten - nachschlagen. tools/staffel_realitaet.json haelt den IST-ZUSTAND fest:
// welche Labels reale Staffeln abbilden und welche nur grobe geografische Hilfsgroessen
// sind, an denen sich die dynamische Zuordnung ausrichtet. Fuer letztere ist europlan
// kein Massstab, und eine Abweichung dort ist kein Befund.
//
// Diese Datei ersetzt drei Heuristiken, die ich vorher gebaut hatte und die alle falsch
// lagen: "(grob)" im region-Feld von game_data (bedeutet nur, dass die GEBIETSANGABE
// ungefaehr ist, nicht dass die Staffel erfunden waere), Aufzaehlungen im region-Feld,
// und "durchgezaehlte Staffeln sind nicht zuordenbar". Das war Rumdoktern an einer Frage,
// die man nicht messen, sondern nachlesen muss - der Nutzer weiss, was er gebaut hat.
const REALITAET = JSON.parse(fs.readFileSync(path.join(__dirname, 'staffel_realitaet.json'), 'utf8'));
const GROB = new Set(Object.keys(REALITAET.konstrukt || {}).filter(k => k[0] !== '_'));
const BEWERTET = {};
for (const b of (REALITAET.bewertet || [])) BEWERTET[b.verein] = b;

// Ausdrueckliche Liga-Zuordnungen aus derselben Datei anwenden. Sie ueberschreiben, was der
// Namensabgleich oben nach Nummer geraten hat - bei Niederrhein sind unsere Nummern gegenueber
// europlan vertauscht, und das ist nachgeschlagen, nicht gemessen.
const ZUORDNUNG = REALITAET.liga_zuordnung || {};
const ZUORD_KEYS = Object.keys(ZUORDNUNG).filter(k => k[0] !== '_');
const ZUORD_LABELS = new Set(ZUORD_KEYS.map(k => ZUORDNUNG[k]));
for (const l of EP.leagues) {
  const treffer = ZUORD_KEYS.find(k => l.name.startsWith(k));
  if (treffer) { ligaVon[l.id] = ZUORDNUNG[treffer]; continue; }
  // Fuer ausdruecklich zugeordnete Labels gilt NUR die Liste - was der Namensabgleich sonst
  // noch eingesammelt hat, faellt weg (europlans sechs Bezirksligen am Niederrhein).
  if (ligaVon[l.id] && ZUORD_LABELS.has(ligaVon[l.id])) delete ligaVon[l.id];
}
{ // labelHat neu aufbauen, damit der Bericht die tatsaechliche Zuordnung zeigt
  const neu = {};
  for (const [id, lb] of Object.entries(ligaVon)) {
    const l = EP.leagues.find(x => x.id === id);
    if (l) (neu[lb] = neu[lb] || []).push(l.name);
  }
  for (const k of Object.keys(labelHat)) delete labelHat[k];
  Object.assign(labelHat, neu);
}

// ── 2) europlan-Vereine der belegten Ligen indizieren ───────────────────────
const NOISE = new Set(['ev','e','v','fussball','fussballclub','fussballverein','sportverein','sv','fc','sc','tsv','vfl','vfb','tus','sg','spvgg','djk','fsv','ssv','vfr','bsc','sf','rw','bv','tsg','msv','asv','atsv','fcv','1','sgm']);
const rangVon = n => /\b(iii|3)\b\s*$/.test(n) ? 3 : /\b(ii|2|u ?23|amateure)\b\s*$/.test(n) ? 2 : 1;
const ohneRang = n => n.replace(/\b(iii|ii|u ?23|amateure|2|3)\b\s*$/, '').trim();
const ohneJahr = n => n.split(' ').filter(w => !/^\d+$/.test(w)).join(' ');
function schluessel(name) {
  const f = fold(name), basis = ohneJahr(ohneRang(f));
  return { rang: rangVon(f), basis, token: new Set(basis.split(' ').filter(w => w.length >= 4 && !NOISE.has(w))) };
}
const epTeams = [];
for (const [ligaId, teams] of Object.entries(EP.ligaTeams)) {
  const lb = ligaVon[ligaId];
  if (!lb) continue;
  for (const t of teams) {
    if (t.lat == null) continue;
    epTeams.push({ label: lb, liga: t.ligaName, name: t.teamName, lat: t.lat, lon: t.lon, k: schluessel(t.teamName) });
  }
}

// ── 3) unsere Vereine dagegenhalten ─────────────────────────────────────────
const belegt = [], einig = [], uneinig = [], ohneBeleg = [];
for (const t of Object.values(GAME_DATA.teams)) {
  const unsere = (t.regions || []).filter(r => labelHat[r]);
  if (!t.lat) { ohneBeleg.push({ team: t.name, grund: 'keine Koordinate' }); continue; }
  const k = schluessel(t.name);
  const kand = epTeams.filter(e => {
    if (e.k.rang !== k.rang) return false;
    const d = km(t.lat, t.lon, e.lat, e.lon);
    if (d > MAXKM) return false;
    if (e.k.basis === k.basis) return true;
    const gemeinsam = [...k.token].filter(w => e.k.token.has(w)).length;
    return gemeinsam > 0 && gemeinsam >= Math.min(k.token.size, e.k.token.size);
  });
  if (!kand.length) { ohneBeleg.push({ team: t.name, grund: 'kein europlan-Eintrag in einer Staffelliga' }); continue; }
  const labels = [...new Set(kand.map(e => e.label))];
  if (labels.length > 1) { ohneBeleg.push({ team: t.name, grund: 'mehrdeutig: ' + labels.join(' / ') }); continue; }
  const beleg = labels[0], naechst = kand.sort((a, b) => km(t.lat,t.lon,a.lat,a.lon) - km(t.lat,t.lon,b.lat,b.lon))[0];
  const eintrag = { team: t.name, teamId: t.id, unsere: unsere.join(' / ') || '(keine)', beleg,
                    epName: naechst.name, epLiga: naechst.liga, km: +km(t.lat,t.lon,naechst.lat,naechst.lon).toFixed(1) };
  // Nur die STUFE bewerten, um die es geht. Ein Verein haengt in einer Kette
  // ("Rheinland-Pfalz/Saar / Südwest / Südwest Ost / Vorderpfalz"); dass ein oberes Glied
  // eine Hilfsgroesse ist, sagt nichts ueber den Bezirk darunter. Wer die ganze Kette
  // abwertet, verliert genau die Befunde, wegen derer man das Werkzeug gebaut hat.
  const unserGleich = unsere.find(r => stufeVon[r] === stufeVon[beleg]);
  eintrag.grob = GROB.has(beleg) || (unserGleich ? GROB.has(unserGleich) : true);
  if (unserGleich) eintrag.unsere = unserGleich;
  belegt.push(eintrag);
  (unsere.includes(beleg) ? einig : uneinig).push(eintrag);
}
const nurGrob   = uneinig.filter(u => u.grob);
const bewertet  = uneinig.filter(u => !u.grob && BEWERTET[u.team]);
const belastbar = uneinig.filter(u => !u.grob && !BEWERTET[u.team]);

// ── 4) Bericht ──────────────────────────────────────────────────────────────
const fehlend = [...STAFFELN].filter(lb => !labelHat[lb]).sort();
console.log('Staffeln mit europlan-Liga: %d von %d', Object.keys(labelHat).length, STAFFELN.size);
if (fehlend.length) console.log('  ohne Entsprechung: ' + fehlend.join(', '));
console.log('europlan-Vereine in diesen Ligen: %d', epTeams.length);
console.log('\nUnsere 1264 Vereine:');
console.log('  belegt   : %d  (davon einig %d, UNEINIG %d)', belegt.length, einig.length, uneinig.length);
console.log('  ohne Beleg: %d', ohneBeleg.length);

console.log('  davon in "groben" Staffeln (kein Massstab): %d', nurGrob.length);
console.log('\n%d unserer Staffeln sind grobe Hilfsgroessen: %s',
            GROB.size, [...GROB].sort().join(', '));

const tabelle = (titel, liste) => {
  if (!liste.length) return;
  console.log('\n=== %s (%d) ===', titel, liste.length);
  console.log('unser Verein                   unsere Staffel                 europlan sagt          Entf.');
  for (const u of liste.sort((a, b) => a.unsere.localeCompare(b.unsere) || a.team.localeCompare(b.team)))
    console.log('%s %s %s %s', u.team.padEnd(30).slice(0,30),
                u.unsere.replace(/^[^/]+ \/ /, '').padEnd(30).slice(0,30),
                u.beleg.padEnd(22).slice(0,22), (u.km + ' km').padStart(7));
};
tabelle('NEU: echte Staffel, europlan widerspricht, noch nicht bewertet', belastbar);
if (bewertet.length) {
  console.log('\n=== Schon bewertet in staffel_realitaet.json (%d) ===', bewertet.length);
  for (const u of bewertet)
    console.log('%s %s -> %s   [%s] %s', u.team.padEnd(26).slice(0,26), u.unsere.padEnd(16).slice(0,16),
                u.beleg.padEnd(16).slice(0,16), BEWERTET[u.team].urteil, BEWERTET[u.team].grund.slice(0,60));
}
tabelle('Grobe Hilfsgroesse - kein Massstab, nur zur Ansicht', nurGrob);
const grund = {};
for (const o of ohneBeleg) grund[o.grund.split(':')[0]] = (grund[o.grund.split(':')[0]] || 0) + 1;
console.log('\nOhne Beleg nach Grund:');
for (const [g, n] of Object.entries(grund).sort((a, b) => b[1] - a[1])) console.log('  %s: %d', g, n);

if (JSONOUT) {
  fs.writeFileSync(path.join(__dirname, 'staffel_truth.json'),
    JSON.stringify({ belastbar, bewertet, nurGrob, ohneBeleg, grobeStaffeln: [...GROB].sort(), fehlendeStaffeln: fehlend }, null, 1));
  console.log('\nDatei: tools/staffel_truth.json');
}
