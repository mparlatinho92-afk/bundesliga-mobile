// Pruefung der Gemeinde-Zuordnung je Spielstaette (gem/ags/ew in game_data.js). Exit 1 bei Befund.
//   node tools/stadion_gemeinden_test.cjs              -> muss gruen sein
//   node tools/stadion_gemeinden_test.cjs --selbsttest -> verfaelscht zwei Zuordnungen, MUSS durchfallen
//
// 1. Vollstaendig: jede Spielstaette mit Koordinate hat gem, achtstelligen AGS und ew > 0.
// 2. Stichproben mit bekanntem Ergebnis (darunter eine Ortsnamen-Korrektur an der Grenze).
// 3. Unabhaengige Gegenprobe: die Landesziffer des AGS gegen den Landesverband des Vereins. Grenzgaenger
//    (Hamburger Umland im HFV, Alzenau in Hessen, Weiler im wuerttembergischen Allgaeu ...) stehen als
//    bekannte Ausnahme drin; jeder NEUE Fall ist ein Befund - meist ein falsch zugeordnetes Stadion.
const fs = require('fs'), path = require('path');
const SELBST = process.argv.includes('--selbsttest');
const src = fs.readFileSync(path.join(__dirname, '..', 'game_data.js'), 'utf8');
const D = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));

if (SELBST) {
    D.teams.borussiadortmund_1195.venues[0].gem = 'Lünen';
    D.teams.svzeltingenrachtig_198.venues[0].ags = '07231009';      // Bernkastel-Kues statt Zeltingen-Rachtig
    D.teams.scbirkenfeld_405.venues[0].ags = '08236004';            // alter Fehler: Birkenfeld/Enzkreis -> Landes-Gegenprobe
}

const fehler = [];
let n = 0;
for (const [id, t] of Object.entries(D.teams)) (t.venues || []).forEach(v => {
    if (v.lat == null) return;
    n++;
    if (!v.gem || !/^\d{8}$/.test(v.ags || '') || !(v.ew > 0)) fehler.push(`unvollstaendig: ${t.name} / ${v.stadName}`);
});

const STICH = [
    ['borussiadortmund_1195', 0, 'Dortmund', '05913000'],
    ['hamburgersv_475', 0, 'Hamburg', '02000000'],
    ['svwerderbremen_440', 0, 'Bremen', '04011000'],
    ['msv1919neuruppin_740', 0, 'Neuruppin', '12068320'],
    ['wuerzburgerkickers_11', 0, 'Würzburg', '09663000'],
    ['svzeltingenrachtig_198', 0, 'Zeltingen-Rachtig', '07231136'],
    // waren europlan-Namensvettern in anderem Land (Trebur, Enzkreis, Waldbronn) - korrigiert 12.10.2026
    ['sv1920geinsheim_339', 0, 'Neustadt an der Weinstraße', '07316000'],
    ['scbirkenfeld_405', 0, 'Birkenfeld', '07134010'],
    ['vfbreichenbach_411', 0, 'Reichenbach-Steegen', '07335501'],
];
for (const [id, i, gem, ags] of STICH) {
    const v = D.teams[id] && D.teams[id].venues[i];
    if (!v || v.gem !== gem || v.ags !== ags) fehler.push(`Stichprobe ${id}: erwartet ${gem} ${ags}, ist ${v && v.gem} ${v && v.ags}`);
}

const LAND = { 'Bayern': ['09'], 'Rheinland-Pfalz/Saar': ['07', '10'], 'Baden-Württemberg': ['08'], 'Hessen': ['06'],
    'Bremen': ['04'], 'Hamburg': ['02'], 'Niedersachsen': ['03'], 'Schleswig-Holstein': ['01'],
    'Mittelrhein': ['05'], 'Niederrhein': ['05'], 'Westfalen': ['05'],
    'Nordost-Nord': ['11', '12', '13', '15'], 'Nordost-Süd': ['12', '14', '15', '16'] };
// Grenzgaenger: Verein spielt im Verband eines anderen Landes (bzw. das Stadion steht dort). Stand 12.10.2026.
const BEKANNT = new Set(['FV Rot-Weiß Weiler', 'FC Bayern Alzenau', 'Brinkumer SV', 'SC Weyhe', 'TSV Buchholz 08']);
let hfvSH = 0;
for (const t of Object.values(D.teams)) (t.venues || []).forEach(v => {
    const reg = (t.regions || []).find(r => LAND[r]) || (t.regions || [])[0];
    const soll = LAND[reg];
    if (!soll || !v.ags) return;
    const l = v.ags.slice(0, 2);
    if (reg === 'Hamburg' && l === '01') { hfvSH++; return; }        // Hamburger Umland spielt im HFV
    if (!soll.includes(l) && !BEKANNT.has(t.name)) fehler.push(`Land ${l} passt nicht zu ${reg}: ${t.name} / ${v.stadName} -> ${v.gem}`);
});

// Stadion weit weg vom Vereinspunkt = Namensvetter. Echte Ausweichstadien liegen bis 24 km (VfB Stuttgart II in Aspach).
const MAX_KM = 40;
const km = (a, b, c, d) => Math.hypot((a - c) * 111.2, (b - d) * 111.2 * Math.cos(a * Math.PI / 180));
for (const t of Object.values(D.teams)) (t.venues || []).forEach(v => {
    if (v.lat == null || t.lat == null) return;
    const d = km(t.lat, t.lon, v.lat, v.lon);
    if (d > MAX_KM) fehler.push(`Stadion ${Math.round(d)} km vom Verein: ${t.name} / ${v.stadName} (${v.ort})`);
});

console.log(`${n} Spielstaetten geprueft, ${STICH.length} Stichproben, ${hfvSH} HFV-Plaetze in Schleswig-Holstein`);
if (fehler.length) { fehler.forEach(f => console.log('  ✗ ' + f)); console.log(`${fehler.length} Befund(e)`); process.exit(1); }
console.log('✓ alles zugeordnet, Stichproben und Landes-Gegenprobe stimmen');
