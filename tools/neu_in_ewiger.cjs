// Übersicht (Sheet, Nutzer): Spielvereine, die 2025/26 in der ersten Sim-Saison NEU in der Ewigen Tabelle ihrer Liga auftauchen –
// „vielleicht einfach falscher Name?“
// Je Spielverein: Liga zum Sim-Start; Ewige Tabelle = alle historischen Tabellen dieser Liga + ihrer Vorgänger (ligaNachfolger).
// Kategorien:
//   A  stand 2024/25 in einer ANDEREN Liga (Auf-/Absteiger) – normal
//   B  hat Historie, aber nicht 2024/25 (Lücke) – meist normal (Rückkehrer aus nicht erfasster Liga)
//   C  KEINE einzige historische Zeile – verdächtig; dazu Kandidaten: Vereine, die 2024/25 in derselben Liga standen und 2025/26
//      nicht im Spiel sind (hist_-ID), mit Ähnlichkeit der Namen (gemeinsame Wörter)
// node tools/neu_in_ewiger.cjs   -> docs/neu-in-ewiger/liste.txt
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const R = path.join(__dirname, '..') + '/';
const ld = f => eval.call(global, fs.readFileSync(R + f, 'utf8').replace(/^const /gm, 'var '));
ld('game_data.js'); ld('app/history_data.js'); ld('app/history_ext.js');
const ext = JSON.parse(zlib.gunzipSync(Buffer.from(HIST_EXT.gz, 'base64')).toString());
const RM = HIST_EXT.remap || {}, NF = HIST_EXT.ligaNachfolger || {};
const VN = Object.assign({}, typeof HISTORIC_CLUBS !== 'undefined' ? HISTORIC_CLUBS : {}, HIST_EXT.vereine || {});
const name = id => (GAME_DATA.teams[id] || {}).name || VN[id] || id;
const START = 2025;
const tabs = HISTORY_SEED.seasons.map(s => ({ y: parseInt(s.y), lid: s.lid, ids: s.table.map(r => RM[r.id] || r.id) }))
    .concat(ext.map(t => ({ y: parseInt(t.y), lid: t.lid, ids: t.rows.map(r => r.id) })))
    .filter(t => t.y < START);
const ziel = lid => NF[lid] || lid;
const inLiga = {}, irgendwo = {}, letzte = {};   // inLiga[lid] = Set(id); irgendwo[id] = Anzahl; letzte[id] = Liga 2024/25
for (const t of tabs) {
    const z = ziel(t.lid);
    (inLiga[z] = inLiga[z] || new Set());
    for (const id of t.ids) { inLiga[z].add(id); irgendwo[id] = (irgendwo[id] || 0) + 1; if (t.y === START - 1) letzte[id] = z; }
}
const woerter = s => (s || '').toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/^(verein|sport|fussball|fußball|spvgg|turn|1\d{3}|20\d\d)$/.test(w));
const ligaName = lid => (GAME_DATA.leagues[lid] || {}).name || lid;
const proLiga = {};
for (const [id, t] of Object.entries(GAME_DATA.teams)) {
    const lid = t.leagueId; if (!lid || !inLiga[lid]) continue;   // Liga ohne Historie: keine Ewige Tabelle vor dem Start
    if (inLiga[lid].has(id)) continue;
    const kat = letzte[id] ? 'A' : irgendwo[id] ? 'B' : 'C';
    (proLiga[lid] = proLiga[lid] || []).push({ id, kat });
}
const out = [], zahl = { A: 0, B: 0, C: 0 };
const ligen = Object.keys(proLiga).sort((a, b) => (GAME_DATA.leagues[a].level - GAME_DATA.leagues[b].level) || a.localeCompare(b, 'de', { numeric: true }));
for (const lid of ligen) {
    // verschwundene Vereine dieser Liga: 2024/25 dabei, im Spiel nicht vorhanden
    const weg = [...inLiga[lid]].filter(id => letzte[id] === lid && !GAME_DATA.teams[id]);
    out.push(`\n== ${lid} ${ligaName(lid)} (Ebene ${GAME_DATA.leagues[lid].level})`);
    for (const { id, kat } of proLiga[lid].sort((a, b) => a.kat.localeCompare(b.kat))) {
        zahl[kat]++;
        let z = `  ${kat}  ${name(id)} [${id}]`;
        if (kat === 'A') z += `  ← 2024/25 ${ligaName(letzte[id]) || letzte[id]}`;
        if (kat === 'C') {
            const w = woerter(name(id));
            const kand = weg.map(k => ({ k, n: woerter(name(k)).filter(x => w.some(y => y.startsWith(x.slice(0, 5)) || x.startsWith(y.slice(0, 5)))).length })).filter(o => o.n).sort((a, b) => b.n - a.n);
            z += kand.length ? `  ?? Kandidat: ${kand.slice(0, 3).map(o => `${name(o.k)} [${o.k}]`).join(', ')}` : '  (kein Kandidat in der Liga 2024/25)';
        }
        out.push(z);
    }
}
const kopf = `Neu in der Ewigen Tabelle zum Sim-Start ${START}/${String(START + 1).slice(-2)} – erzeugt ${new Date().toISOString().slice(0, 10)} von tools/neu_in_ewiger.cjs\n` +
    `A = 2024/25 in anderer Liga (Auf-/Absteiger, normal): ${zahl.A}\nB = Historie vorhanden, aber nicht 2024/25: ${zahl.B}\nC = keine einzige historische Zeile (verdächtig): ${zahl.C}`;
fs.mkdirSync(R + 'docs/neu-in-ewiger', { recursive: true });
fs.writeFileSync(R + 'docs/neu-in-ewiger/liste.txt', kopf + '\n' + out.join('\n') + '\n', 'utf8');
console.log(kopf);
