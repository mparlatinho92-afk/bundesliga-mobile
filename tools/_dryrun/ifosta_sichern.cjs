// ifosta.de hat die Seiten der Amateurliga Schwarzwald-Bodensee 1963-78 entfernt (01.11.2026: 404, „AL-Schwarzwald+Bodensee“). Ihre S/U/N
// standen nur im Temp-Zwischenspeicher, den Windows leert – ein Neuaufbau hätte 156 echte Zeilen durch Schätzungen ersetzt.
// Sichert sie aus dem bisherigen Stand (Seed-Erweiterung vor der Lieferung 1990/91, gleiche Werte wie git HEAD app/history_ext.js) im
// ifosta-Format nach tools/ifosta_gesichert.json (versioniert). historie_dryrun.mjs liest die Datei für Liga-Saisons, die der
// Zwischenspeicher nicht (mehr) hat.
//   node tools/_dryrun/ifosta_sichern.cjs <seed_erweiterung-vorher.json>
const fs = require('fs'), path = require('path');
const SEED = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).seasons;
const out = {};
for (const s of SEED) {
    if (s.lid !== 'h3-schwarzwaldbodensee-amateurliga') continue;
    const z = s.table.filter(r => !r.est && r.s != null);
    if (z.length !== s.table.length) { console.log(s.y, 'nur', z.length, 'von', s.table.length, 'echt – übersprungen'); continue; }
    out[`BRD|3|Amateurliga Schwarzwald-Bodensee|${parseInt(s.y)}`] = [{ datei: `AL-Schwarzwald+Bodensee-Fussball-${parseInt(s.y)}${parseInt(s.y) + 1} (gesichert)`,
        zeilen: s.table.map(r => ({ platz: r.rank, verein: r.nm, sp: r.sp, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga, pkt: r.p2[0], pktMinus: r.p2[1], quelle: 'tabelle' })) }];
}
fs.writeFileSync(path.join(__dirname, '..', 'ifosta_gesichert.json'), JSON.stringify(out, null, 1));
console.log('tools/ifosta_gesichert.json:', Object.keys(out).length, 'Liga-Saisons,', Object.values(out).reduce((a, v) => a + v[0].zeilen.length, 0), 'Zeilen');
