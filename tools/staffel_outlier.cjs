/**
 * Vereine, die in einer anderen Staffel spielen als ihre Nachbarn.
 *
 *   node tools/staffel_outlier.cjs            Bericht
 *   node tools/staffel_outlier.cjs --json     zusaetzlich tools/staffel_outlier.json
 *
 * Warum nicht MAP_MISFITS? Die Staffelflaechen entstehen per Marching Squares AUS der
 * Vereinsverteilung - ein falsch zugeordneter Verein zieht seine Flaeche mit und liegt
 * danach brav darin. Der Test muss also an den Vereinen selbst ansetzen, nicht an der Karte.
 *
 * Verfahren: fuer jeden Verein die K naechsten Vereine derselben Ebene im selben Verband.
 * Spielt kaum einer davon in derselben Staffel, ist der Verein ein Ausreisser. Zusaetzlich
 * der Abstandsvergleich: wie weit zum naechsten Vereinskameraden der eigenen Staffel,
 * verglichen mit dem naechsten Verein der Nachbarstaffel.
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JSONOUT = process.argv.includes('--json');
const K = 8;             // so viele Nachbarn werden befragt
const MIN_FREMD = +(process.env.FREMD||0.85);  // ab diesem Fremdanteil unter den Nachbarn wird gemeldet

const src = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

const VERBAENDE = new Set(['Baden','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen',
  'Mecklenburg-Vorpommern','Mittelrhein','Niederrhein','Niedersachsen','Rheinland','Saarland',
  'Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Südbaden','Südwest','Thüringen','Westfalen','Württemberg']);
const ALIAS = {'Fußballverband Rheinland':'Rheinland','Fußball-Verband Mittelrhein':'Mittelrhein',
  'Hamburger Fußball-Verband':'Hamburg','Bremer Fußball-Verband':'Bremen',
  'Saarländischer Fußballverband':'Saarland','Schleswig-Holsteinischer Fußballverband':'Schleswig-Holstein'};
const verbandOf = regs => {
  for (const r of regs || []) { if (VERBAENDE.has(r)) return r; if (ALIAS[r]) return ALIAS[r]; }
  return null;
};
function km(a,b,c,d) {
  const R=6371, r=Math.PI/180, dLa=(c-a)*r, dLo=(d-b)*r;
  const h=Math.sin(dLa/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

const teams = Object.values(GAME_DATA.teams).filter(t => t.lat != null && (t.regions||[]).length);
// Nach (Verband, Ebene) gruppieren - nur dort ist ein Staffelvergleich sinnvoll
const gruppen = new Map();
for (const t of teams) {
  const v = verbandOf(t.regions); if (!v) continue;
  (t.regions || []).forEach((lb, i) => {
    const ebene = i + 1;
    const key = v + '|' + ebene;
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push({ t, lb });
  });
}

const funde = [];
for (const [key, arr] of gruppen) {
  const [verband, ebene] = key.split('|');
  const staffeln = new Set(arr.map(x => x.lb));
  if (staffeln.size < 2) continue;                 // ohne Nachbarstaffel kein Vergleich
  for (const self of arr) {
    const andere = arr.filter(x => x.t.id !== self.t.id)
      .map(x => ({ ...x, d: km(self.t.lat, self.t.lon, x.t.lat, x.t.lon) }))
      .sort((a,b) => a.d - b.d);
    if (andere.length < K) continue;
    const nach = andere.slice(0, K);
    const fremd = nach.filter(x => x.lb !== self.lb).length / K;
    if (fremd < MIN_FREMD) continue;
    const eigen = andere.find(x => x.lb === self.lb);
    const nachbar = nach[0];
    // Mehrheit der Nachbarn: welche Staffel waere es stattdessen?
    const zaehl = {};
    for (const x of nach) zaehl[x.lb] = (zaehl[x.lb]||0) + 1;
    const vorschlag = Object.entries(zaehl).sort((a,b) => b[1]-a[1])[0];
    funde.push({
      team: self.t.name, verband, ebene: +ebene, staffel: self.lb,
      fremdAnteil: Math.round(fremd*100),
      vorschlag: vorschlag[0], vorschlagAnteil: Math.round(vorschlag[1]/K*100),
      kmZurEigenen: eigen ? Math.round(eigen.d*10)/10 : null,
      kmZumNachbarn: Math.round(nachbar.d*10)/10,
      liga: GAME_DATA.leagues[self.t.leagueId]?.name || '(ligalos)'
    });
  }
}
// Die haertesten zuerst: eigene Staffel weit weg, Nachbarstaffel direkt daneben
funde.sort((a,b) => (b.kmZurEigenen||0)/(b.kmZumNachbarn||1) - (a.kmZurEigenen||0)/(a.kmZumNachbarn||1));

console.log('=== Vereine, deren Nachbarn fast alle in einer anderen Staffel spielen ===');
console.log('K=' + K + ' Nachbarn, gemeldet ab ' + Math.round(MIN_FREMD*100) + '% fremd. Treffer: ' + funde.length + '\n');
const proVerband = {};
for (const f of funde) (proVerband[f.verband] = proVerband[f.verband] || []).push(f);
for (const [v, arr] of Object.entries(proVerband).sort((a,b) => b[1].length - a[1].length)) {
  console.log('--- ' + v + ': ' + arr.length + ' ---');
  for (const f of arr)
    console.log('   ' + f.team.padEnd(32).slice(0,32) + ' s' + f.ebene + ' ' +
      f.staffel.padEnd(20).slice(0,20) + ' -> ' + f.vorschlag.padEnd(20).slice(0,20) +
      ' (' + f.vorschlagAnteil + '%)  eigene ' + String(f.kmZurEigenen).padStart(6) +
      ' km / Nachbar ' + String(f.kmZumNachbarn).padStart(5) + ' km');
  console.log();
}
if (JSONOUT) {
  fs.writeFileSync(path.join(__dirname, 'staffel_outlier.json'), JSON.stringify(funde, null, 1));
  console.log('Datei: tools/staffel_outlier.json');
}
