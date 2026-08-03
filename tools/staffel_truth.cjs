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

// ── 1b) Durchgezaehlte Staffeln: bewusst KEINE Paarungslogik ────────────────
// "Landesliga Niederrhein 1/2" sagt nicht, welche Haelfte gemeint ist, und europlan zaehlt
// teils anders herum als wir. Ich hatte erst nach Nummer gepaart (14 Scheinwiderspruece),
// dann nach geografischem Schwerpunkt - und dabei uebersehen, dass die Frage fuer diese
// Staffeln gar nicht gestellt werden darf: unser Niederrhein ist nicht nord/sued geteilt,
// sondern "Grenzland, Duesseldorf, Berg" gegen "Kleveland + Ruhrpott". Eine erfundene
// Einteilung kann europlan weder bestaetigen noch widerlegen. Statt die Paarung zu
// verfeinern, fallen diese Staffeln unten aus der Bewertung heraus (siehe 1c).

// ── 1c) Welche unserer Staffeln sind ueberhaupt an der Wirklichkeit messbar? ─
// Ein Teil unserer Staffeln bildet KEINE reale Einteilung ab, sondern ist eine grobe
// geografische Hilfsgroesse fuer die dynamische Zuordnung. game_data sagt das selbst:
// im region-Feld der Liga steht dann "(grob)" bzw. "per Auslosung" (Berlin). Fuer diese
// Labels ist europlan kein Massstab - "Landesliga Schleswig-Holstein Schleswig" ist ein
// echter Ligenname, unser "Schleswig" dagegen nur die Nordhaelfte des Verbands.
// Wer das vermischt, meldet Dutzende Scheinfehler und "korrigiert" gute Daten kaputt.
// Zwei Kennzeichen im region-Feld, beide aus den Daten selbst:
//  1. "(grob)" / "per Auslosung" - ausdruecklich erfunden
//  2. eine AUFZAEHLUNG mehrerer Gebiete ("Grenzland, Duesseldorf, Berg") - von Hand aus
//     Teilen zusammengesetzt, also ebenso wenig an einer realen Staffel messbar.
// Uebrig bleiben die Staffeln, die genau EINE Verwaltungseinheit nennen: die vier
// niedersaechsischen Regierungsbezirke und die vier SWFV-Bezirke. Nur dort ist ein
// Widerspruch zu europlan ueberhaupt ein Befund.
const GROB = new Set();
// Durchgezaehlte Staffeln ("Niederrhein 1/2") tragen keinen Namen, der sagt WELCHE Haelfte
// gemeint ist - eine Zuordnung zu europlans Gruppe 1/2 waere geraten. Bei Niederrhein zeigt
// die Messung ausserdem, dass es gar nicht dieselbe Teilung ist: 14 von ~36 abgedeckten
// Vereinen widersprechen, je zur Haelfte in beide Richtungen. Bei bloss vertauschten Nummern
// muessten es fast alle sein, bei Grenzfaellen eine Handvoll. Also: nicht pruefbar.
for (const lb of STAFFELN) if (/\d/.test(lb)) GROB.add(lb);
for (const l of Object.values(GAME_DATA.leagues)) {
  const r = l.region || '';
  if (!/\(grob|per Auslosung/i.test(r) && !/[,/]/.test(r)) continue;
  // "Westfalenliga Staffel 1" und "Landesliga Mittelrhein Staffel 1" tragen ihr (grob)
  // genauso - die Fuellwoerter muessen raus, sonst rutschen vier Staffeln durch und ihre
  // Abweichungen erscheinen als echte Befunde.
  const n = fold(l.name).replace(/\b(landesliga|verbandsliga|bezirksliga|liga|staffel|gruppe)\b/g, '')
                        .replace(/\s+/g, ' ').trim();
  const lb = [...STAFFELN].filter(r => {
    const k = fold(r.replace(/\(.*?\)/g, ''));
    return k && (n === k || n.endsWith(' ' + k));
  }).sort((a, b) => b.length - a.length)[0];
  if (lb) GROB.add(lb);
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
const belastbar = uneinig.filter(u => !u.grob);
const nurGrob   = uneinig.filter(u => u.grob);

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
tabelle('BELASTBAR: echte Staffel, europlan widerspricht', belastbar);
tabelle('Nur grobe Orientierung - kein Befund, nur zur Ansicht', nurGrob);
const grund = {};
for (const o of ohneBeleg) grund[o.grund.split(':')[0]] = (grund[o.grund.split(':')[0]] || 0) + 1;
console.log('\nOhne Beleg nach Grund:');
for (const [g, n] of Object.entries(grund).sort((a, b) => b[1] - a[1])) console.log('  %s: %d', g, n);

if (JSONOUT) {
  fs.writeFileSync(path.join(__dirname, 'staffel_truth.json'),
    JSON.stringify({ belastbar, nurGrob, ohneBeleg, grobeStaffeln: [...GROB].sort(), fehlendeStaffeln: fehlend }, null, 1));
  console.log('\nDatei: tools/staffel_truth.json');
}
