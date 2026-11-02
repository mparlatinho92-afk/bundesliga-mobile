// MESSUNG (Fix-Liste „II in derselben Liga wie die Erste“, zuletzt gemessen 21.10.2026): wie oft steht eine Reserve nach dem
// Saisonwechsel in derselben Liga wie ihre Erste (oder eine höhere Mannschaft desselben Vereins)? Headless, mehrere Läufe.
//   node tools/reserve_gleiche_liga_mess.cjs [saisons=30] [laeufe=3]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const [N, LAEUFE] = [parseInt(process.argv[2] || '30', 10), parseInt(process.argv[3] || '3', 10)];
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f => (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
Engine.log = () => {};
const faelle = {}; let saisons = 0, ereignisse = 0;
for (let l = 0; l < LAEUFE; l++) {
    Engine.init();
    for (let s = 0; s < N; s++) {
        Engine.simulateFullSeason(); Engine.processSeasonTransition(); saisons++;
        for (const t of Object.values(Engine.teams)) {
            if (!t || !t.isReserve || !t.parentId || !t.leagueId) continue;
            const p = Engine.teams[t.parentId];
            if (p && p.leagueId === t.leagueId) { ereignisse++; const k = `${t.name} (${Engine.leagues[t.leagueId].name})`; faelle[k] = (faelle[k] || 0) + 1; }
        }
    }
}
console.log(`${LAEUFE} Läufe × ${N} Saisons: ${ereignisse} Reserve-Saisons in der Liga der Ersten, ${Object.keys(faelle).length} Mannschaften`);
Object.entries(faelle).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
