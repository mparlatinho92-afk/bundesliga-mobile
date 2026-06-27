// Integriert tools/history_seasons.json (gecrawlt) + die bereits in history_data.js stehenden Saisons
// zu EINEM HISTORY_SEED.seasons-Block und schreibt app/history_data.js neu (HISTORIC_NAMES/CLUBS + Header
// bleiben unangetastet). Macht history_seasons.json zur Single Source (alle Saisons hineingemergt).
const fs = require('fs');
const HD = 'app/history_data.js';
const JSONP = 'tools/history_seasons.json';

let text = fs.readFileSync(HD, 'utf8');
const SEED = (new Function(text + '; return HISTORY_SEED;'))();
const crawled = JSON.parse(fs.readFileSync(JSONP, 'utf8'));

// Merge (dedup nach y|lid; bestehende handgetippte haben Vorrang)
const map = {};
for (const s of crawled) map[s.y + '|' + s.lid] = s;
for (const s of SEED.seasons) map[s.y + '|' + s.lid] = s;   // Vorrang: bereits im Spiel
const all = Object.values(map);
const yr = y => parseInt((y || '').split('/')[0]) || 0;
all.sort((a, b) => a.lid.localeCompare(b.lid) || yr(a.y) - yr(b.y));

// Validierung
let errs = [];
for (const s of all) {
  const games = (s.table.length - 1) * 2;
  const ranks = new Set();
  for (const r of s.table) {
    if (r.s + r.u + r.n !== games) errs.push(`${s.y}/${s.lid} ${r.id}: S+U+N!=${games}`);
    if (ranks.has(r.rank)) errs.push(`${s.y}/${s.lid}: Rang ${r.rank} doppelt`);
    ranks.add(r.rank);
  }
}
if (errs.length) { console.error('FEHLER:\n' + errs.join('\n')); process.exit(1); }

// history_seasons.json als Single Source aktualisieren
fs.writeFileSync(JSONP, JSON.stringify(all, null, 0));

// HISTORY_SEED-Block neu bauen (Rest der Datei = Prefix bleibt)
const body = all.map(s => {
  const rows = s.table.map(r =>
    `                { rank: ${r.rank}, id: "${r.id}", s: ${r.s}, u: ${r.u}, n: ${r.n}, gf: ${r.gf}, ga: ${r.ga} }`
  ).join(',\n');
  return `        {\n            y: "${s.y}", lid: "${s.lid}",\n            table: [\n${rows}\n            ]\n        }`;
}).join(',\n');
const ver = (SEED.version || 1) + 1;
const block = `var HISTORY_SEED = {\n    format: "ba-history-seed/1",\n    version: ${ver},\n    seasons: [\n${body}\n    ]\n};\n`;

const idx = text.indexOf('var HISTORY_SEED');
fs.writeFileSync(HD, text.slice(0, idx) + block);

const n1 = all.filter(s => s.lid === '1').length, n2 = all.filter(s => s.lid === '2').length;
console.log(`OK: ${all.length} Saisons (1.BL ${n1}, 2.BL ${n2}) -> ${HD} (version ${ver})`);
