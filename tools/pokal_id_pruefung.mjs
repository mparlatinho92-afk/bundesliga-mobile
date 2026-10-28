// Sind die NEUEN Pokal-Vereine (hist_pk_*, app/pokal_hist_data.js) wirklich neu? Nutzer 28.10.2026: „sind alle vereine sauber über
// ID zuzuordnen?“ – geprüft wird jede hist_pk-ID gegen
//   (1) die anderen hist_pk-IDs (zwei Schreibungen desselben Vereins im Pokal: „Barmbecker SG“ / „Barmbeker SG“) und
//   (2) alle bekannten Vereine (game_data, HISTORIC_CLUBS, HIST_EXT.vereine) samt damaligen Namen (HIST_EXT.namen).
// Namensregeln wie tools/hist_dubletten.mjs: gleicher Kern (Vereinsform/Jahreszahl weg), unscharf (tools/hist_unscharf.mjs:
// Abkürzung, ein Buchstabe, Bindestrich), Zusatzwort. Beleg je Paar: Pokaljahre und Ligajahre des Kandidaten (Abstand in Jahren),
// bei (1) ob beide im SELBEN Pokaljahr spielten (dann zwei Vereine).
//   node tools/pokal_id_pruefung.mjs   -> tools/_dryrun/pokal_id_pruefung.txt
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { vergleich, zusatz } from './hist_unscharf.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const ctx = { window: {}, localStorage: { getItem: () => null } };
vm.createContext(ctx);
for (const f of ['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/pokal_hist_data.js'])
    vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), ctx, { filename: f });
const { GAME_DATA: GD, HISTORY_SEED: SEED, HISTORIC_CLUBS: HC, HIST_EXT: HX, POKAL_HIST: P } = ctx;
const tab = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')).toString());

// Ligajahre je ID
const liga = {};
const merke = (id, y) => (liga[id] = liga[id] || new Set()).add(parseInt(y));
for (const t of Object.values(tab)) { t.rows.forEach(r => merke(r.id, t.y)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y))); }
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y)));
// Pokaljahre je ID
const pokal = {};
P.saisons.forEach(s => s.r.forEach(r => r.s.forEach(m => [m[0], m[1]].forEach(i => (pokal[P.ids[i]] = pokal[P.ids[i]] || new Set()).add(parseInt(s.y))))));

// alle bekannten Namen (heute + damals)
const namenVon = {};
const add = (id, n) => { if (n) (namenVon[id] = namenVon[id] || new Set()).add(n); };
Object.values(GD.teams).forEach(t => add(t.id, t.name));
Object.entries(HC || {}).forEach(([id, n]) => add(id, n));
Object.entries(HX.vereine).forEach(([id, n]) => add(id, n));
Object.entries(HX.namen || {}).forEach(([id, L]) => L.forEach(e => add(id, e.name)));
const pkName = id => (P.namen || {})[id] || id;

const FORM = new Set(['sf', 'ts', 'tus', 'tsv', 'sb', 'sv', 'sg', 'bv', 'bsv', 'fv', 'fc', 'sc', 'spvgg', 'spvg', 'spv', 'vfb', 'vfl', 'vfr', 'vfv', 'vfvb', 'mtv', 'tv',
    'tg', 'ssv', 'fsv', 'tsg', 'djk', 'esv', 'psv', 'ksv', 'asv', 'bsg', 'bc', 'fk', 'sk', 'wkg', 'ksg', 'lsv', 'msv', 'hsv', 'nstg', 'tura', 'e', 'v', '1', 'i', 'ii',
    'am', 'amateure', 'club', 'verein', 'und', 'von', 'der', 'die', 'sportfreunde', 'sportverein', 'spielvereinigung', 'sportvgg', 'reichsbahn']);
const norm = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/ş/g, 's').split(/[^a-z0-9]+/).filter(Boolean);
const kern = n => norm(n).filter(w => !FORM.has(w) && !/^\d+$/.test(w)).sort().join(' ');
const reserve = n => /(\s(III|II|2|U ?2[123]|Amateure|Am\.?|A))$|\(A\)/i.test(n.trim());
const grund = (a, b) => {
    if (reserve(a) !== reserve(b)) return null;
    if (kern(a) && kern(a) === kern(b)) return 'gleicher Kern';
    return vergleich(a, b) || zusatz(a, b) || null;
};
const nah = (ja, jb) => { let d = 99; for (const x of ja) for (const y of jb) d = Math.min(d, Math.abs(x - y)); return d; };
const sp = s => { const j = [...(s || [])].sort((a, b) => a - b); if (!j.length) return '–'; const t = []; let a = j[0], b = j[0];
    for (const x of j.slice(1).concat(null)) { if (x === b + 1) { b = x; continue; } t.push(a === b ? `${a}` : `${a}–${b}`); a = b = x; } return t.join(', '); };

const pk = P.ids.filter(id => /^hist_pk_/.test(id));
const intern = [], extern = [];
// (1) innerhalb der Pokal-IDs
for (let i = 0; i < pk.length; i++) for (let j = i + 1; j < pk.length; j++) {
    const a = pk[i], b = pk[j], g = grund(pkName(a), pkName(b));
    if (!g) continue;
    const zugleich = [...pokal[a]].filter(y => pokal[b].has(y));
    intern.push({ a, b, g, zugleich });
}
// (2) gegen alle bekannten Vereine
for (const a of pk) for (const [id, ns] of Object.entries(namenVon)) {
    if (id === a || /^hist_pk_/.test(id)) continue;
    for (const n of ns) { const g = grund(pkName(a), n); if (!g) continue;
        extern.push({ a, id, n, heute: [...ns][0], g, abstand: liga[id] ? nah(pokal[a], liga[id]) : 99, liga: sp(liga[id]) }); break; }
}
extern.sort((x, y) => x.abstand - y.abstand || pkName(x.a).localeCompare(pkName(y.a), 'de'));
const aus = [`Pokal-IDs (hist_pk_*) im Pokal: ${pk.length}`,
    `(1) gleiche Vereine unter zwei Pokal-IDs? ${intern.length} Paare (davon ${intern.filter(p => !p.zugleich.length).length} nie im selben Pokaljahr)`,
    ...intern.map(p => `  ${pkName(p.a)} [${sp(pokal[p.a])}]  <->  ${pkName(p.b)} [${sp(pokal[p.b])}]   ${p.g}${p.zugleich.length ? '   ZUGLEICH ' + p.zugleich.join(',') + ' -> zwei Vereine' : ''}`),
    '', `(2) Pokal-ID gegen bekannten Verein: ${extern.length} Treffer (sortiert nach Abstand Pokaljahr <-> Ligajahr)`,
    ...extern.map(p => `  ${pkName(p.a)} [Pokal ${sp(pokal[p.a])}]  <->  ${p.n}${p.n !== p.heute ? ' (heute ' + p.heute + ')' : ''} [${p.id}] Liga ${p.liga}   ${p.g}, Abstand ${p.abstand === 99 ? '–' : p.abstand + ' J.'}`)];
fs.writeFileSync(ROOT + 'tools/_dryrun/pokal_id_pruefung.txt', aus.join('\n') + '\n');
console.log(aus[0]); console.log(aus[1]); console.log(`(2) Treffer gegen bekannte Vereine: ${extern.length}, davon Abstand <= 5 J.: ${extern.filter(p => p.abstand <= 5).length}`);
console.log('Bericht: tools/_dryrun/pokal_id_pruefung.txt');
