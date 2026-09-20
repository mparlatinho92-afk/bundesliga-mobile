// Vereinszuordnung fuer tools/wiki_aufstiegsrunden.json -> tools/wiki_aufstiegsrunden_ids.json
//
//   node tools/wiki_aufstieg_zuordnung.mjs           # ordnet zu, schreibt die JSON + Bericht
//   node tools/wiki_aufstieg_zuordnung.mjs --offen   # nur die ungeloesten Namen (fuer die Korrekturdatei)
//
// DER BELEG, den die anderen Wiki-Werkzeuge nicht haben: wer in einer Aufstiegsrunde steht, hat in DERSELBEN
// Saison in seiner Liga gespielt – und diese Abschlusstabellen liegen schon vor (HISTORY_SEED + HIST_EXT).
// Darum wird zuerst gegen die Vereine DIESER Saison abgeglichen (Stufe S). Die uebrigen Stufen sind schwaecher
// und dienen nur den Faellen, die der Saisonkontext nicht traegt.
//
// Stufen: K Korrekturdatei | S Saisonkontext (stark) | E Era-Name der Saison | G game_data exakt
//         H historischer Verein | N neu (hist_ar_*, landet im Bericht zur Durchsicht)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const NUR_OFFEN = process.argv.includes('--offen');
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = { getElementById: () => null };
globalThis.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
const lade = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
['game_data.js', 'app/history_data.js', 'app/history_ext.js'].forEach(lade);
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HN = globalThis.HISTORIC_NAMES;
const EXT = JSON.parse(zlib.gunzipSync(Buffer.from(globalThis.HIST_EXT.gz, 'base64')).toString());
const DATEN = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_aufstiegsrunden.json'), 'utf8'));
const KORREKTUR = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_aufstieg_korrektur.json'), 'utf8')); } catch (e) { return {}; } })();

// ---------- Namenskern (wie tools/wiki_ebene45.mjs) ----------
const slug = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'spvg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'ssvg', 'asv', 'bsc', 'bfc', 'sportvg',
    'fsv', 'kfc', 'sus', 'svg', 'tsr', 'ev', 'rsv', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv', 'sf', 'spfr', 'e', 'v', '1', 'i', 'ii', 'u21', 'u23',
    'fussball', 'club', 'verein', 'sportverein', 'turn', 'und', 'von', 'tv', 'tg', 'mtv', 'tsc', 'ssc', 'jsg', 'teutonia']);
const ALIAS = { sf: 'sportfreunde', spfr: 'sportfreunde', rw: 'rotweiss', sw: 'schwarzweiss', bw: 'blauweiss' };
const STOP = new Set(['a', 'am', 'an', 'der', 'die', 'im', 'in', 'e', 'v']);
const RESERVE = /(\s(III|II|2|U ?2[123]|Amateure|Am\.?))$/i;
const istReserve = n => RESERVE.test(String(n).trim());
const kern = n => String(n).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/(\s(ii|2|u ?2[123]|amateure|am\.?))$/i, '').replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss')
    .split(/[^a-z0-9]+/).map(w => ALIAS[w] || w).filter(w => w && !FORM.has(w) && !STOP.has(w) && !/^\d+$/.test(w))
    .map(w => w.length >= 6 ? w.replace(/er$/, '') : w).sort();
const OHNE_FORM = new Set(['1', 'e', 'v', 'i', 'ii', 'u21', 'u23', 'fussball', 'club', 'verein', 'und', 'von', 'turn', 'sportverein']);
const formen = n => new Set(String(n).toLowerCase().split(/[^a-z0-9]+/).filter(w => FORM.has(w) && !OHNE_FORM.has(w)));
const formOk = (a, b) => { const A = formen(a), B = formen(b); return !A.size || !B.size || [...A].some(w => B.has(w)); };
const schl = n => kern(n).join(' ') + (istReserve(n) ? '|R' : '');
const aehnlich = (a, b) => { const A = kern(a), B = kern(b); if (!A.length || !B.length) return 0; const t = A.filter(w => B.includes(w)).length; return t / (A.length + B.length - t); };

// ---------- Namensauskunft je ID ----------
const nameVon = id => (GD.teams[id] || {}).name || HC[id] || (globalThis.HIST_EXT.vereine || {})[id] || id;

// ---------- Saisonkontext: wer stand in Saison y in welcher Tabelle? ----------
const proJahr = {};   // y -> Map(schluessel -> Set(ids))
const eintrag = (y, id) => {
    const m = proJahr[y] = proJahr[y] || new Map();
    const k = schl(nameVon(id));
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(id);
};
SEED.seasons.forEach(s => { const y = parseInt(s.y); s.table.forEach(r => eintrag(y, r.id)); });
EXT.forEach(t => { const y = parseInt(t.y); t.rows.forEach(r => eintrag(y, r.id)); });
// Era-Namen: "Motor Zwickau" 1968 -> heutige ID
const eraIdx = {};
Object.entries(HN || {}).forEach(([id, eras]) => eras.forEach(e => {
    const von = e.from ? parseInt(e.from) : 1900, bis = e.to ? parseInt(e.to) : 2100;
    (eraIdx[schl(e.name)] = eraIdx[schl(e.name)] || []).push({ id, von, bis });
}));
// game_data / historische Vereine
const gdIdx = {}, hcIdx = {};
Object.values(GD.teams).forEach(t => (gdIdx[schl(t.name)] = gdIdx[schl(t.name)] || []).push(t.id));
Object.entries(HC || {}).forEach(([id, n]) => (hcIdx[schl(n)] = hcIdx[schl(n)] || []).push(id));

// Eine Korrektur-ID, die es nicht gibt, faellt sonst nirgends auf – sie wuerde stillschweigend
// einen Verein erfinden (passiert: "borussiamoenchengladbach_1131" statt _1124, von Hand getippt).
{
    const falsch = Object.entries(KORREKTUR).filter(([k]) => !k.startsWith('_'))
        .filter(([, id]) => !GD.teams[id] && !HC[id] && !(globalThis.HIST_EXT.vereine || {})[id]);
    if (falsch.length) {
        console.error('FEHLER in tools/wiki_aufstieg_korrektur.json – diese IDs gibt es nicht:');
        falsch.forEach(([k, id]) => console.error('  ' + k + ' -> ' + id));
        process.exit(1);
    }
}

const stat = { K: 0, S: 0, E: 0, G: 0, H: 0, N: 0 };
const offen = {}, neuIds = {};
function idVon(name, y) {
    const k = schl(name);
    if (KORREKTUR[name] && typeof KORREKTUR[name] === 'string') { stat.K++; return { id: KORREKTUR[name], stufe: 'K' }; }
    // S: derselbe Verein spielte in DIESER Saison irgendwo – der staerkste Beleg
    for (const yy of [y, y - 1, y + 1]) {          // Aufstiegsrunde liegt am Saisonende, Quelle zaehlt mal so, mal so
        const tr = (proJahr[yy] || new Map()).get(k);
        if (tr && tr.size === 1) { const id = [...tr][0]; if (formOk(name, nameVon(id))) { stat.S++; return { id, stufe: 'S', beleg: yy }; } }
    }
    // E: damaliger Name eines heutigen Vereins
    const era = (eraIdx[k] || []).filter(e => y >= e.von - 1 && y <= e.bis + 1);
    if (era.length === 1) { stat.E++; return { id: era[0].id, stufe: 'E' }; }
    // G/H: Name ohne Saisonbeleg
    const g = (gdIdx[k] || []).filter(id => formOk(name, nameVon(id)));
    if (g.length === 1) { stat.G++; return { id: g[0], stufe: 'G' }; }
    const h = (hcIdx[k] || []).filter(id => formOk(name, nameVon(id)));
    if (h.length === 1) { stat.H++; return { id: h[0], stufe: 'H' }; }
    // N: nichts gefunden – eigene ID, Vorschlaege in den Bericht
    const id = 'hist_ar_' + slug(name);
    if (!neuIds[id]) {
        stat.N++;
        neuIds[id] = name;
        const kand = [...Object.values(GD.teams).map(t => ({ n: t.name, id: t.id })), ...Object.entries(HC || {}).map(([id2, n]) => ({ n, id: id2 }))]
            .map(x => ({ x, a: aehnlich(name, x.n) })).filter(x => x.a >= 0.45).sort((p, q) => q.a - p.a).slice(0, 3);
        offen[name] = { jahr: y, vorschlag: kand.map(c => `${c.x.n} [${c.x.id}] ${c.a.toFixed(2)}`) };
    }
    return { id, stufe: 'N' };
}

// ---------- durchlaufen ----------
for (const a of DATEN.abschnitte) {
    a.gruppen.forEach(g => g.rows.forEach(r => { const z = idVon(r.name, a.y); r.id = z.id; r.stufe = z.stufe; }));
    [...a.duelle, ...(a.gruppenspiele || [])].forEach(d => { const h = idVon(d.h, a.y), g = idVon(d.a, a.y); d.hId = h.id; d.aId = g.id; d.stufen = h.stufe + g.stufe; });
    a.spiele.forEach(s => { const h = idVon(s.h, a.y), g = idVon(s.a, a.y); s.hId = h.id; s.aId = g.id; s.stufen = h.stufe + g.stufe; });
    a.direktIds = a.direkt.map(n => { const z = idVon(n, a.y); return { name: n, id: z.id, stufe: z.stufe }; });
    // Fussnote einem Verein zuordnen. ZWEI gemessene Fallen:
    //  - "FC Bayern München" ist ein Teilstring von "FC Bayern München II" – bei "genau ein Treffer"
    //    verwarf die Zuordnung beide. Es gewinnt deshalb der LAENGSTE (spezifischste) Name.
    //  - "Die Amateure des VfB Stuttgart" nennt die Reserve, trifft aber nur den Profiverein.
    //    Steht "Amateure des"/"Amateure von" davor, wird auf die II-Mannschaft umgebogen.
    a.fnIds = (a.fn || []).map(txt => {
        // Der gemeinte Verein steht als SUBJEKT hinter seiner Rolle ("Der Meister X …", "Die Amateure des X …").
        // Nur den laengsten vorkommenden Namen zu nehmen griff daneben: in "Die Amateure des VfB Stuttgart waren
        // nicht aufstiegsberechtigt, dafuer stieg der 1. FC Schweinfurt 05 auf" gewann Schweinfurt.
        const ROLLE = /(?:Der|Die|Das)\s+(?:Meister|Vizemeister|erstplatzierte[rn]?|zweitplatzierte[rn]?|drittplatzierte[rn]?|Aufsteiger|Amateure\s+(?:des|von))\s+([^,.;]{4,60})/;
        const m = txt.match(ROLLE);
        const suchIn = (raum, roh) => {
            let best = null, bestLen = 0;
            (proJahr[a.y] ? [...proJahr[a.y].values()] : []).forEach(ids => ids.forEach(id => {
                const n = nameVon(id);
                if (!n || n.length <= 4 || raum.indexOf(n) === -1) return;
                if (n.length > bestLen) { bestLen = n.length; best = id; }
            }));
            // "Amateure des X" meint die II-Mannschaft, nicht den Profiverein
            if (best && /Amateure\s+(des|von)/.test(roh || '')) {
                const n = nameVon(best);
                if (!/\sII$/.test(n)) {
                    let res = null;
                    (proJahr[a.y] ? [...proJahr[a.y].values()] : []).forEach(ids => ids.forEach(id => {
                        if (nameVon(id) === n + ' II') res = id; }));
                    if (res) best = res;
                }
            }
            return best;
        };
        return { txt, id: (m && suchIn(m[1], m[0])) || suchIn(txt, txt) };
    });
}

const summe = Object.values(stat).reduce((a, b) => a + b, 0);
if (!NUR_OFFEN) {
    console.log('=== ZUORDNUNG (' + summe + ' Nennungen) ===');
    console.log('K Korrekturdatei      ' + String(stat.K).padStart(5));
    console.log('S Saisonkontext       ' + String(stat.S).padStart(5) + '   <- derselbe Verein steht in dieser Saison in einer Tabelle');
    console.log('E Era-Name            ' + String(stat.E).padStart(5));
    console.log('G game_data exakt     ' + String(stat.G).padStart(5));
    console.log('H historischer Verein ' + String(stat.H).padStart(5));
    console.log('N NEU angelegt        ' + String(stat.N).padStart(5) + '   (' + Object.keys(offen).length + ' verschiedene Namen)');
}
console.log('\n=== OFFEN: ' + Object.keys(offen).length + ' Namen ohne Zuordnung ===');
Object.entries(offen).sort((a, b) => a[1].jahr - b[1].jahr).forEach(([n, o]) =>
    console.log(String(o.jahr) + '  ' + n.padEnd(34) + (o.vorschlag.length ? '  ? ' + o.vorschlag.join(' / ') : '')));

if (!NUR_OFFEN) {
    fs.writeFileSync(path.join(DIR, 'wiki_aufstiegsrunden_ids.json'),
        JSON.stringify({ stand: DATEN.stand, stat, neu: neuIds, abschnitte: DATEN.abschnitte }, null, 1));
    console.log('\n-> tools/wiki_aufstiegsrunden_ids.json');
}
