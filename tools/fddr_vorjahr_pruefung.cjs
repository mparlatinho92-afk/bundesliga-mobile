// node tools/fddr_vorjahr_pruefung.cjs [--faelschen]   (Exit 1 bei Abweichungen; --faelschen = Gegenprobe, MUSS mehr Befunde liefern)
// Wende-Pruefung 1989/90 -> 1990/91: fussball-ddr.de nennt hinter jedem Verein der Tabelle 1990/91 den Vorjahresplatz "( k )".
// Platz k 1989/90 derselben Liga (unsere ID) muss dieselbe ID sein wie unsere Zeile 1990/91 (Zuordnung ueber S/U/N/Tore).
// Ausgabe: je Abweichung beide IDs + Namen. Gegenprobe: --faelschen vertauscht zwei IDs, dann MUSS es Befunde geben.
const fs = require('fs'), zlib = require('zlib');
const R = require('path').join(__dirname, '..') + '/';
const load = f => (0, eval)(fs.readFileSync(R + f, 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const HX = HIST_EXT;
const tabs = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')));
const by = {}; for (const t of tabs) by[t.y + '|' + t.lid] = t;
const HC = Object.assign({}, globalThis.HISTORIC_CLUBS || {}, HX.vereine || {});
const nm = (id, y) => { const L = (HX.namen || {})[id] || []; const s = parseInt(y);
  const e = L.find(x => (!x.from || parseInt(x.from) <= s) && (!x.to || parseInt(x.to) >= s));
  return e ? e.name : (GAME_DATA.teams[id] || {}).name || (typeof HC[id] === "string" ? HC[id] : (HC[id] || {}).name) || id; };
const FD = JSON.parse(fs.readFileSync(R + 'tools/_dryrun/fddr_saisons.json', 'utf8'));
const FALSCH = process.argv.includes('--faelschen');
// Erklaerte Abweichungen (03.11.2026), Schluessel = unsere ID 1990/91. Alles andere zaehlt als Befund.
const ERKLAERT = {
  hist_fa_svberlinervb49: 'Fusion 1990 Autotrans + BSG Berliner VB 49 (hist_fusion.json) – eigene IDs gewollt',
  hist_dresdnersc: 'Dresdner SC 1898: Fusion/Ausgruendung schon entschieden (hist_fusion.json, hist_ausgruendung.json)',
  hist_fa_magdeburgersv: 'Motor Mitte -> Magdeburger SV 1990: Grossstadt, nur Vorjahresplatz, kein Vermerk – bewusst offen',
  hist_fa_turbinevetschau: 'Messrauschen: fddr-Vorjahresplatz passt nicht zur eigenen Tabelle 1989/90, Vetschau-ID durchgehend richtig',
  hist_fa_tsgmeissenii: 'Messrauschen: Plaetze 3/11 bei fddr ueber Kreuz, beide IDs stehen in beiden Saisons',
  hist_fa_fortschrittbischofswerdaii2: 'Messrauschen: Plaetze 3/11 bei fddr ueber Kreuz, beide IDs stehen in beiden Saisons',
  hist_fa_grosswechsungen: 'Messrauschen: Zahlen weichen ab (Abstand 5), TSG Ruhla steht 1990/91 unter eigener ID',
};
let erklaert = 0;
let gepr = 0, befund = 0, unklar = 0; const out = [];
for (const f of FD.filter(x => x.y === '1990/91')) {
  const neu = by['1990/91|' + f.lid], alt = by['1989/90|' + f.lid];
  if (!neu || !alt) { out.push('-- fehlt bei uns: ' + f.lid + (neu ? '' : ' 1990/91') + (alt ? '' : ' 1989/90')); continue; }
  const rows = neu.rows.map(r => Object.assign({}, r));
  if (FALSCH && rows.length > 3) { const t = rows[1].id; rows[1].id = rows[2].id; rows[2].id = t; }
  const frei = new Set(rows);
  for (const tb of f.tabellen || []) for (const z of tb.rows) {
    const m = String(z[0]).match(/^(.*?)\s*\(\s*([^)]*?)\s*\)\s*$/); if (!m) continue;
    const name = m[1].trim(), vor = m[2];
    const [sp, s, u, n, gf, ga] = z.slice(1).map(Number);
    let best = null, bd = 1e9;
    for (const r of frei) { const d = 10 * (Math.abs(r.s - s) + Math.abs(r.u - u) + Math.abs(r.n - n)) + Math.abs(r.gf - gf) + Math.abs(r.ga - ga); if (d < bd) { bd = d; best = r; } }
    if (!best || bd > 12) { unklar++; out.push(`?  ${f.lid}  ${name} (${vor})  keine eindeutige Zeile bei uns (Abstand ${bd})`); continue; }
    frei.delete(best);
    if (!/^\d+$/.test(vor)) continue;   // N = neu (Aufsteiger), A = Absteiger: kein Platz derselben Liga
    // Vorjahresplatz = Platz in der fddr-Tabelle 1989/90 (Hauptrunde, je Staffel), von dort ueber die Zahlen an unsere Zeile 1989/90
    const fv = FD.find(x => x.y === '1989/90' && x.lid === f.lid);
    const kand = [];
    for (const tv of (fv && fv.tabellen) || []) {
      if (/Aufstiegsrunde/i.test(tv.titel) || tv.rows.length < 8) continue;
      const zv = tv.rows[+vor - 1]; if (!zv) continue;
      const [, s2, u2, n2, gf2, ga2] = zv.slice(1).map(Number);
      let b2 = null, d2 = 1e9;
      for (const r of alt.rows) { const d = 10 * (Math.abs(r.s - s2) + Math.abs(r.u - u2) + Math.abs(r.n - n2)) + Math.abs(r.gf - gf2) + Math.abs(r.ga - ga2); if (d < d2) { d2 = d; b2 = r; } }
      if (b2 && d2 <= 12) kand.push({ r: b2, fname: String(zv[0]).replace(/\s*\(.*$/, '') });
    }
    if (!kand.length) { unklar++; out.push(`?  ${f.lid}  ${name} (${vor})  Vorjahreszeile nicht zuzuordnen`); continue; }
    gepr++;
    if (!kand.some(k => k.r.id === best.id)) {
      if (!FALSCH && ERKLAERT[best.id]) { erklaert++; out.push(`ok ${f.lid}  ${best.id}: ${ERKLAERT[best.id]}`); continue; }
      befund++;
      out.push(`!! ${f.lid}  fddr „${name}“ (Platz ${vor} 1989/90)\n` + kand.map(k => `     1989/90 fddr „${k.fname}“ = bei uns ${k.r.id} „${nm(k.r.id, '1989')}“`).join('\n') +
        `\n     1990/91 bei uns: ${best.id} „${nm(best.id, '1990')}“ (Zahlenabstand ${bd})`); }
  }
}
console.log(out.join('\n'));
console.log(`\ngeprueft ${gepr} Vorjahres-Verweise, Abweichungen ${befund} (dazu ${erklaert} erklaert), unklar ${unklar}${FALSCH ? '  [GEGENPROBE gefaelscht]' : ''}`);
process.exitCode = befund ? 1 : 0;
