// Neue ligalose Vereine (Amateurpokal) aus tools/kader_neu.json in game_data.js – Herkunft tools/kader_aktuell.mjs
// (Vereine der laufenden Saisons über den Bodenligen, die im Spiel fehlen). Bestehende IDs werden übersprungen (wiederholbar).
// Danach Gemeinde/Einwohner: python tools/stadion_gemeinden.py && node tools/stadion_gemeinden_einbau.cjs && node tools/stadion_gemeinden_test.cjs
//
//   node tools/kader_neu_einbau.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GD = path.join(ROOT, 'game_data.js'), PRE = 'const GAME_DATA = ';

const src = fs.readFileSync(GD, 'utf8');
if (!src.startsWith(PRE)) throw new Error('game_data.js beginnt nicht mit "' + PRE + '"');
const data = JSON.parse(src.slice(PRE.length, src.lastIndexOf(';')));
if (PRE + JSON.stringify(data) + src.slice(src.lastIndexOf(';')) !== src)
    throw new Error('game_data.js ist kein reines JSON - Rundreise wuerde etwas veraendern');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'kader_neu.json'), 'utf8')).vereine;
const T = data.teams, neu = [], weg = [];
for (const v of spec) {
    if (T[v.id]) { weg.push(v.id); continue; }
    const vorbild = T[v.parentId || v.regionsVon];
    if (!vorbild) throw new Error(`${v.id}: Vorbild ${v.parentId || v.regionsVon} fehlt in game_data`);
    if (Object.values(T).some(t => t.name === v.name)) throw new Error(`${v.id}: Name "${v.name}" gibt es schon`);
    const venues = v.venue ? [{ ...v.venue }] : (vorbild.venues || []).map(x => ({ stadName: x.stadName, ort: x.ort, ...(x.kapazitaet ? { kapazitaet: x.kapazitaet } : {}), lat: x.lat, lon: x.lon }));
    const ort = venues[0] || vorbild;
    T[v.id] = { id: v.id, name: v.name, leagueId: null, regions: [...vorbild.regions], lat: ort.lat, lon: ort.lon,
        isReserve: !!v.parentId, parentId: v.parentId || null, venues };
    neu.push(`${v.id} ${v.name} (${v.quelle})`);
}
fs.writeFileSync(GD, PRE + JSON.stringify(data) + src.slice(src.lastIndexOf(';')));
console.log(`${neu.length} neu, ${weg.length} schon da`);
neu.forEach(n => console.log('  + ' + n));
