/* Echte Spieltermine -> app/kalender_data.js (KALENDER_SEED). Nie von Hand aendern.
 *   node tools/kalender_real.mjs && node tools/kalender_einbau.mjs
 * Aufgenommen werden nur Saisons ab dem Sim-Start (Engine.startYear = 2025): fruehere braucht der
 * Kalender nicht, die Gegenprobe (tools/kalender_test.cjs) liest kalender_real.json direkt.
 * Liga-IDs: '1', '2', '3' wie in game_data.js; 'pokal' = DFB-Pokal-Runden in Reihenfolge.
 * Ein Ligaplan wird nur benutzt, wenn seine Laenge zur Spieltagzahl der Liga passt (Engine.kalenderPlan).
 */
import fs from 'fs';
const real = JSON.parse(fs.readFileSync(new URL('./kalender_real.json', import.meta.url), 'utf8'));
const START = 2025, seed = {};
for (const [saison, ligen] of Object.entries(real)) {
    const y = +saison.slice(0, 4);
    if (y < START) continue;
    for (const lid of ['1', '2', '3', 'pokal']) {
        if (!ligen[lid] || !ligen[lid].length) continue;
        (seed[y] ||= {})[lid] = ligen[lid].map(r => r.anker);
    }
}
const kopf = `// ERZEUGT von tools/kalender_einbau.mjs aus tools/kalender_real.json (openfootball) – nie von Hand aendern.\n` +
    `// Echte Spieltermine je Saison (Startjahr): Anker-Datum je Spieltag, Sa = Wochenende, Mi = englische Woche.\n`;
fs.writeFileSync(new URL('../app/kalender_data.js', import.meta.url), kopf + 'const KALENDER_SEED = ' + JSON.stringify(seed) + ';\n');
for (const [y, l] of Object.entries(seed)) console.log(y, Object.entries(l).map(([k, v]) => `${k}:${v.length}`).join(' '));
