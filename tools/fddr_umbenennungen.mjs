// fussball-ddr.de: Vermerke unter den Saisontabellen (Umbenennung, Rueckbenennung, Ausgruendung, Fusion, Anschluss)
// -> Vorschlag fuer hist_alias.json / hist_fusion.json. Eingabe: tools/_dryrun/fddr_saisons.json (tools/fddr_saisons.mjs).
//   node tools/fddr_umbenennungen.mjs   -> tools/_dryrun/fddr_umbenennungen.txt + fddr_umbenennungen_export.json
// Zuordnung: jede fussball-ddr-Zeile ueber S/U/N/Tore an unsere Zeile derselben Liga-Saison (ID); der Name im Vermerk
// wird gegen die Namen der Saison davor/danach gesucht (fussball-ddr-Name UND unser Name), nur eindeutige Treffer.
// Gesperrt wie in wiki_ddr_ewig.mjs: gemeinsame Saison, Fusions-Vorgaenger, getrennt-Liste, Name an mehreren IDs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HX = globalThis.HIST_EXT;
const lies = f => { try { const o = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); delete o._hinweis; return o; } catch (e) { return {}; } };
const ALIAS = lies('hist_alias.json'), SCHREIB = lies('hist_schreibweise.json'), FUSION = lies('hist_fusion.json'), GETRENNT = lies('hist_alias_getrennt.json');
const FD = JSON.parse(fs.readFileSync(path.join(DIR, '_dryrun/fddr_saisons.json'), 'utf8'));

// ---------- unsere Tabellen ----------
const tab = JSON.parse(await new Response(new Blob([Buffer.from(HX.gz, 'base64')]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
const istDDR = l => l === 'ddr1' || /^h[23]d-/.test(l);
const unsre = {};      // "lid|y" -> rows
const auftritt = {};
const merke = (id, y) => (auftritt[id] = auftritt[id] || new Set()).add(parseInt(y));
tab.forEach(t => { t.rows.forEach(r => merke(r.id, t.y)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y))); });
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y)));
tab.filter(t => istDDR(t.lid)).forEach(t => (unsre[t.lid + '|' + t.y] = unsre[t.lid + '|' + t.y] || []).push(...t.rows));
SEED.seasons.filter(s => s.lid === 'ddr1').forEach(s => (unsre['ddr1|' + s.y] = unsre['ddr1|' + s.y] || []).push(...s.table.map(r => ({ id: r.id, s: r.w ?? r.s, u: r.d ?? r.u, n: r.l ?? r.n, gf: r.gf, ga: r.ga }))));
const namen = {};
Object.entries(HX.vereine).forEach(([id, n]) => namen[id] = n);
Object.entries(HC).forEach(([id, n]) => namen[id] = n);
Object.values(GD.teams).forEach(t => namen[t.id] = t.name);
const spiel = id => !!GD.teams[id];
const zugleich = (a, b) => auftritt[a] && auftritt[b] ? [...auftritt[a]].filter(y => auftritt[b].has(y)) : [];
const nameIds = {};
Object.entries(namen).forEach(([id, n]) => { if (auftritt[id]) (nameIds[n] = nameIds[n] || []).push(id); });
const damals = {};     // id -> damalige Namen (HX.namen)
for (const [id, l] of Object.entries(HX.namen || {})) damals[id] = l.map(e => e.name);

// ---------- fussball-ddr-Zeilen -> unsere IDs (ueber die Zahlen) ----------
const sjVon = y => parseInt(y);
const sjZu = j => `${j}/${String(j + 1).slice(2)}`;
const fdName = {};     // "y" -> [{name, id, lid}]
let zuOk = 0, zuNein = 0;
for (const s of FD) {
    const pool = unsre[s.lid + '|' + s.y] || [];
    for (const t of s.tabellen) for (const [name, sp, S, U, N, gf, ga] of t.rows) {
        if (sp === 0) continue;
        const r = pool.filter(r => r.s === S && r.u === U && r.n === N && r.gf === gf && r.ga === ga);
        const id = r.length === 1 ? r[0].id : null;
        id ? zuOk++ : zuNein++;
        (fdName[s.y] = fdName[s.y] || []).push({ name, id, lid: s.lid });
    }
}

// ---------- Namen vergleichen ----------
const PRAEFIX = new Set(['bsg', 'sg', 'sc', 'asg', 'ask', 'tsg', 'hsg', 'zsg', 'ksg', 'isg', 'sv', 'spvgg', 'fsv', 'fc', 'spg', 'bfsg', 'esv', 'tsv', 'vfl', 'psv', 'bsv', 'ssv', 'fv', 'der', 'die', 'des', 'betriebssportgemeinschaft', 'sportgemeinschaft']);
const LANG = { lok: 'lokomotive', kkw: 'kernkraftwerk', mot: 'motor', chem: 'chemie', uni: 'universitaet', iw: 'industriewerke', ihb: 'industrie', mk: 'mansfeldkombinat', ek: 'elektrokeramik', mr: 'maschinelles' };
function woerter(n) {
    let s = n.replace(/\(.*?\)/g, ' ').replace(/&gt;|=+>/g, ' ').trim();
    // Reserve: "II"/"III"/"2", "/A", "/A.", "Amateure" (unsere Namen) – nie mit der ersten Mannschaft verwechseln
    const rm = s.match(/\s(II|III|2|3)\.?$|\/A\.?$|\sAmateure$/);
    const res = rm ? (rm[1] === 'III' || rm[1] === '3' ? 'III' : 'II') : '';
    s = s.replace(/\s(II|III|2|3)\.?$|\/A\.?$|\sAmateure$/, '');
    const w = s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/é/g, 'e')
        .replace(/frankfurt\s*\/\s*o\.?/g, 'frankfurt').replace(/halle\s*\/\s*s\.?/g, 'halle').replace(/karl-marx-stadt/g, 'karlmarxstadt')
        .split(/[^a-z0-9]+/).filter(Boolean).map(x => LANG[x] || x).filter(x => !PRAEFIX.has(x) && !/^\d+$/.test(x));
    return { w: new Set(w), res };
}
const teil = (a, b) => [...a].every(x => b.has(x));
// passt der Text (Vermerk) zum Namen (Tabelle)? Text ganz im Namen ODER Name ganz im Text (mind. 2 Woerter)
// 2 = gleiche Woerter, 1 = enthalten, 0 = nein. Ein einzelnes Wort ("FC Karl-Marx-Stadt") nur bei Gleichheit.
function passt(text, name) {
    const a = woerter(text), b = woerter(name);
    if (a.res !== b.res || !a.w.size || !b.w.size) return 0;
    if (a.w.size === b.w.size && teil(a.w, b.w)) return 2;
    if (a.w.size === 1) return 0;
    return teil(a.w, b.w) || (b.w.size >= 2 && teil(b.w, a.w)) ? 1 : 0;
}
// Kandidaten-IDs zu einem Vermerk-Namen in den Saisons js (Liga egal, aber DDR)
function finde(text, js, ort) {
    const ids = new Map();     // id -> {g: bester Grad, n: [Namen]}
    const nimm = (id, n, g) => { if (!g) return; const e = ids.get(id) || { g: 0, n: [] }; e.g = Math.max(e.g, g); e.n.push(n); ids.set(id, e); };
    for (const j of js) {
        const y = sjZu(j);
        for (const r of fdName[y] || []) if (r.id) nimm(r.id, r.name, passt(text, r.name));
        for (const k of Object.keys(unsre)) if (k.endsWith('|' + y)) for (const r of unsre[k])
            for (const n of [namen[r.id], ...(damals[r.id] || [])].filter(Boolean)) nimm(r.id, n, passt(text, n));
    }
    let l = [...ids.keys()];
    // Vermerk ohne Ort ("BSG Motor" -> "SV Motor Eberswalde"): der Ort kommt aus dem anderen Namen
    if (l.length > 1 && ort && ort.size) l = l.filter(id => ids.get(id).n.concat(namen[id] || []).some(n => [...woerter(n).w].some(x => ort.has(x))));
    // gleiche Woerter schlagen "enthalten" ("Robur Zittau" vs "Motor ROBUR Zittau")
    if (l.length > 1 && l.some(id => ids.get(id).g === 2)) l = l.filter(id => ids.get(id).g === 2);
    return l;
}

// Ort = letztes Wort ohne Zahl ("SV Motor Eberswalde" -> Eberswalde, "1.SC Heiligenstadt 1911" -> Heiligenstadt)
const ortVon = n => (n.replace(/\(.*?\)/g, ' ').replace(/[-–.,;:]+\s*$/, '').trim().split(/\s+/).filter(w => !/\d/.test(w)).pop() || '');
// Vermerk ohne Ort ("BSG Motor" -> "SV Motor Weimar"): erst wie geschrieben, sonst mit dem Ort des anderen Namens
function findeMitOrt(text, js, ort, anderer) {
    let l = finde(text, js, ort);
    const o = ortVon(anderer);
    if (!l.length && o && !woerter(text).w.has([...woerter(o).w][0])) l = finde(text + ' ' + o, js, ort);
    return l;
}

// ---------- Vermerke zerlegen ----------
const D = String.raw`(?:\d{1,2}\.\d{1,2}\.\d{2,4}|\d{2}\/\d{4}|\d{4})\s*:?\s*`;
const MUSTER = [
    ['U', new RegExp(`^(?:${D})?(?:\\*+\\s*)?(?:Nach Rückbenennung der Stadt, )?(?:Rückbenennung der Stadt \\w+ und )?(?:Umbenennung|Rückbenennung)(?: \\(Fusion\\))? (?:der |von |des )?(.+?) (?:in|zu) (?:in )?(.+?)(?:[.;]|,| aus der | - |$)`, 'i')],
    ['U', new RegExp(`^(?:${D})?aus (?:der |dem )?(.+?) wird (.+?)\\.?$`, 'i')],
    ['U', new RegExp(`^(?:${D})?(.+?) ==?&?g?t?;?>? (.+)$`)],
    ['U', /^(.+?) ab (?:\d{2}\.\d{2}\.)?\d{4}(?:\/\d{2,4})? als (.+?)(?: durch .*)?$/],
    ['UR', /^(.+?) bis (?:Januar |\d{2}\.\d{2}\.)?\d{4}(?:\/\d{2,4})? als (.+?)(?: dann .*)?$/],
    ['U', new RegExp(`^(?:${D})?Aus der (?:Sektion Fußball der |Fußball-Abteilung (?:der |des )?)?(.+?) gründet sich (?:der |die |das )?(.+?)\\.?$`, 'i')],
    ['U', /^Durch Wechsel des Trägerbetriebs wurde am .*? aus der (.+?) die (.+?)\.$/],
    ['F', new RegExp(`^(?:${D})?(?:\\*+\\s*)?Fusion (?:der |von |des )?(?:Sektion Fußball der )?(.+?) (?:mit|und) (?:der |dem )?(.+?) (?:zur?m?|zu) (.+?)(?:\\.|$| Aus der )`, 'i')],
    ['A', new RegExp(`^(?:${D})?Anschlu(?:ss|ß) (?:der )?(?:Sektion Fußball |Fußballabteilung |FA )?(?:der |von |des )?(.+?) an (?:die |den |das )?(.+?)\\.?$`, 'i')],
    ['A', new RegExp(`^(?:${D})?(?:Die |Der )?(?:Sektion Fußball der )?(.+?) schlo(?:ss|ß) sich (?:der |dem |die )?(.+?) an\\.?`, 'i')],
    ['A', /^(.+?) Fußballabteilung schließt sich am [\d.]+ (.+?) an$/],
];
const vermerke = [];
const gesehen = new Set();
for (const s of FD) for (const z of [...s.tabellen.flatMap(t => t.notiz), ...s.frei]) {
    const k = s.y + '|' + z; if (gesehen.has(k)) continue; gesehen.add(k);
    if (/Staffelwechsel|Torschützen|wechselt (in|zur?) |Wechsel (aus|in|zur)|Verbandswechsel|Kommandierung|kommandiert|delegiert|Pluspunkte|Bezirksliga Suhl spielt|übernimmt den (Bezirksliga|Oberliga)|Übernahme des Bezirksliga|zweiten Mannschaften|Neugründung des (?!SC Karl|SC Leipzig)|Auflösung der ASG Vorwärts (Neubrandenburg|Drögeheide|Potsdam)|Mit der Auflösung/.test(z)) continue;
    let erk = null;
    for (const [typ, re] of MUSTER) { const m = z.match(re); if (m) { erk = { typ, m }; break; } }
    if (erk && erk.typ === 'U' && /durch Eingliederung/.test(z)) erk.typ = 'A';
    vermerke.push({ lid: s.lid, y: s.y, text: z, erk });
}

// ---------- auswerten ----------
const vater = {};
const fi = x => { while (vater[x] && vater[x] !== x) x = vater[x]; return x; };
const verein = (a, b) => { vater[a] = vater[a] || a; vater[b] = vater[b] || b; const ra = fi(a), rb = fi(b); if (ra !== rb) vater[rb] = ra; };
const beleg = {};
const istVorg = id => Object.values(FUSION).some(f => f.vorgaenger.includes(id));
const getrennt = (a, b) => (GETRENNT[a] || []).includes(b) || (GETRENNT[b] || []).includes(a);
const offen = [], schonEins = [], fusionen = [], vorsorge = [];
// "BSG VEM Zörbig VEM - Verband …": Erklaerung und doppeltes Schlusswort weg
const clean = n => n.replace(/^(?:die |der )/i, '').replace(/\s+\(.*?\)\s*$/, '').replace(/\s+\S+ - .*$/, '').replace(/\s+(\S+)$/, (m, w) => n.split(/\s+/).indexOf(w) < n.split(/\s+/).lastIndexOf(w) ? '' : m).trim();
for (const v of vermerke) {
    if (!v.erk && /^Umbenennungen\W*$/.test(v.text)) continue;
    if (!v.erk) { offen.push(`${v.lid} ${v.y}: nicht erkannt – ${v.text}`); continue; }
    const j = sjVon(v.y), m = v.erk.m;
    if (v.erk.typ === 'F') {
        const a = clean(m[1]), b = clean(m[2]), y = clean(m[3]);
        const wy = woerter(y).w, wa = woerter(a).w, wb = woerter(b).w;
        const ohne = (x, z) => new Set([...x].filter(q => !z.has(q)));
        const ia = findeMitOrt(a, [j - 1, j], ohne(wy, wa), y), ib = findeMitOrt(b, [j - 1, j], ohne(wy, wb), y), iy = finde(y, [j, j + 1], ohne(new Set([...wa, ...wb]), wy));
        if (iy.length !== 1 || ia.length !== 1 || ib.length !== 1) { offen.push(`${v.lid} ${v.y}: Fusion nicht eindeutig (${a}:${ia.length} ${b}:${ib.length} ${y}:${iy.length}) – ${v.text}`); continue; }
        fusionen.push({ ziel: iy[0], vorg: [ia[0], ib[0]].filter(x => x !== iy[0]), jahr: j + (/^\d{2}\.0?[1-6]\./.test(v.text) ? 0 : 0), text: `${v.lid} ${v.y}: ${v.text}` });
        continue;
    }
    let alt = clean(m[1]), neu = clean(m[2]);
    if (v.erk.typ === 'UR') [alt, neu] = [neu, alt];
    // "Umbenennung der BSG Wismut in Stadt SV Gera, deren Fussball-Abteilung gruendet den FSV Wismut Gera": die Mannschaft heisst wie die Abteilung
    const abt = v.text.match(/(?:Fußball-Abteilung|Sektion Fußball)[^,;]*? gründet (?:sich )?(?:den |der |die |das )([^,;]+?)\.?$/);
    if (abt && v.erk.typ === 'U' && !/^Aus der/i.test(v.text)) neu = clean(abt[1]);
    const wNeu = woerter(neu).w, wAlt = woerter(alt).w;
    const ohne = (a, b) => new Set([...a].filter(x => !b.has(x)));
    let ib = finde(neu, [j, j + 1], ohne(wAlt, wNeu));
    const ia = findeMitOrt(alt, [j - 1, j], ohne(wNeu, wAlt), neu);
    if (!ib.length) ib = finde(neu, [j + 2, j + 3], ohne(wAlt, wNeu));
    // neuer Name kommt (noch) nicht vor: vorsorglich an der ID speichern (Nutzer 14.10.2026: "egal, ob der verein spaeter unter
    // anderem namen im spiel auftaucht. die umbenennung ist schonmal in der ID gespeichert, falls doch")
    if (/^Fußball-Abteilung|^Sektion Fußball/i.test(alt)) { offen.push(`${v.lid} ${v.y}: alter Name fehlt – ${v.text}`); continue; }
    if (ib.length === 1 && !ia.length && v.erk.typ !== 'A') {
        let na = alt.replace(/[-–.,;:]+$/, '').trim();
        if (woerter(na).w.size < 2 || ![...woerter(ortVon(neu)).w].every(x => woerter(na).w.has(x))) na = na + ' ' + ortVon(neu);
        if (woerter(na).w.size >= 2 && !nameIds[na]) vorsorge.push({ name: na, id: ib[0], text: `${v.lid} ${v.y}: ${v.text}` });
        else offen.push(`${v.lid} ${v.y}: ${alt} -> ${neu}: alter Name zu kurz/vergeben – ${v.text}`);
        continue;
    }
    if (ia.length === 1 && !ib.length && v.erk.typ !== 'A') {
        const nn = neu.replace(/[-–.,;:]+$/, '').trim();
        if (woerter(nn).w.size >= 2 && !nameIds[nn]) vorsorge.push({ name: nn, id: ia[0], text: `${v.lid} ${v.y}: ${v.text}` });
        else offen.push(`${v.lid} ${v.y}: ${alt} -> ${neu}: neuer Name zu kurz/vergeben – ${v.text}`);
        continue;
    }
    if (ib.length === 1 && ia.includes(ib[0])) { schonEins.push(`${namen[ib[0]]} [${ib[0]}] – ${v.text}`); continue; }
    if (ia.length !== 1 || ib.length !== 1) { offen.push(`${v.lid} ${v.y}: ${alt} -> ${neu}: ${ia.length}/${ib.length} Treffer ${ia.length > 1 ? '[' + ia.map(i => namen[i]).join(' | ') + ']' : ''}${ib.length > 1 ? '[' + ib.map(i => namen[i]).join(' | ') + ']' : ''} – ${v.text}`); continue; }
    if (ia[0] === ib[0]) { schonEins.push(`${namen[ia[0]]} [${ia[0]}] – ${v.text}`); continue; }
    if (v.erk.typ === 'A') { fusionen.push({ ziel: ib[0], vorg: [ia[0]], jahr: j, text: `${v.lid} ${v.y}: ${v.text}` }); continue; }
    verein('id:' + ib[0], 'id:' + ia[0]);
    for (const id of [ia[0], ib[0]]) (beleg[id] = beleg[id] || []).push(`fussball-ddr.de ${v.lid.replace(/^h3d-|-bezirksliga$/g, '')} ${v.y}: ${v.text}`);
}

const gruppen = {};
for (const x of Object.keys(vater)) (gruppen[fi(x)] = gruppen[fi(x)] || []).push(x.slice(3));
const exp = { alias: {}, fusion: {} };
const bericht = [], konflikte = [];
for (const ids of Object.values(gruppen)) {
    if (ids.length < 2) continue;
    const sp = ids.filter(spiel);
    if (sp.length > 1) { konflikte.push(`mehrere Spielvereine in einer Linie: ${ids.map(i => namen[i] + ' [' + i + ']').join(', ')}\n      ${(beleg[ids[0]] || []).join(' | ')}`); continue; }
    const ziel = sp[0] || ids.slice().sort((a, b) => Math.max(...auftritt[b]) - Math.max(...auftritt[a]) || auftritt[b].size - auftritt[a].size)[0];
    const zb = [`${namen[ziel]} [${ziel}]${spiel(ziel) ? ' (Spielverein)' : ''}`];
    const drin = [ziel];
    for (const id of ids) {
        if (id === ziel) continue;
        const n = namen[id];
        const neben = drin.find(d => zugleich(id, d).length);
        const grund = neben ? `gemeinsame Saison ${zugleich(id, neben).sort().slice(0, 3).join(',')} mit ${namen[neben]}` : istVorg(id) ? 'Fusions-Vorgaenger (hist_fusion.json)'
            : getrennt(id, ziel) ? 'getrennt (hist_alias_getrennt.json)' : /_nv$/.test(id) ? '_nv-ID'
            : (nameIds[n] || []).filter(x => x.replace(/_\d+$/, '') !== id.replace(/_\d+$/, '')).length ? `Name an ${nameIds[n].length} IDs (${nameIds[n].join(', ')})` : null;
        const alt = ALIAS[n] ?? SCHREIB[n];
        if (grund) { konflikte.push(`${n} [${id}] -> ${namen[ziel]} [${ziel}]: ${grund}\n      Beleg: ${(beleg[id] || [])[0] || '-'}`); zb.push(`   ✖ ${n} [${id}] – ${grund}`); continue; }
        if (alt !== undefined) { konflikte.push(`${n} [${id}]: hist_alias sagt ${alt}, fussball-ddr sagt ${namen[ziel]} [${ziel}]`); zb.push(`   ✖ ${n} – hist_alias sagt ${alt}`); continue; }
        exp.alias[n] = ziel; drin.push(id);
        zb.push(`   + ${n} [${id}]  ${[...auftritt[id]].sort().join(',').slice(0, 60)}\n       ${(beleg[id] || []).join(' | ')}`);
    }
    if (zb.length > 1) bericht.push(zb.join('\n'));
}
// vorsorglich: Name -> ID (eigene Datei tools/hist_alias_vorsorge.json, keine WARNUNG, wenn der Name nirgends vorkommt)
exp.vorsorge = {};
const vb = [];
for (const v of vorsorge) {
    v.name = v.name.replace(/^(?:Betriebs-SV|Ballspielverein|Ball-Spiel-Verein|Bergbau SV|Industrie SG) \(([A-Z]+)\)/, '$1').replace(/\s+\([A-Z]+\)/g, '').replace(/\s+/g, ' ').trim();
    const ziel = Object.prototype.hasOwnProperty.call(exp.alias, namen[v.id]) ? exp.alias[namen[v.id]] : v.id;
    if (ALIAS[v.name] !== undefined || SCHREIB[v.name] !== undefined) { vb.push(`  = ${v.name} – steht schon in hist_alias/schreibweise`); continue; }
    exp.vorsorge[v.name] = ziel;
    vb.push(`  V ${v.name} -> ${namen[ziel]} [${ziel}]  (${v.text})`);
}
const fb = [];
const nachAlias = id => Object.prototype.hasOwnProperty.call(exp.alias, namen[id]) ? exp.alias[namen[id]] : id;
for (const f of fusionen) {
    f.ziel = nachAlias(f.ziel);
    const schon = (FUSION[f.ziel] || { vorgaenger: [] }).vorgaenger;
    const vorg = f.vorg.filter(v => !schon.includes(v) && !(namen[v] in exp.alias) && !Object.values(exp.alias).includes(v));
    const sp = vorg.filter(v => spiel(v));
    const zeile = `${namen[f.ziel]} [${f.ziel}] <- ${f.vorg.map(v => namen[v] + ' [' + v + ']').join(' + ')}  (${f.text})`;
    if (!vorg.length) { fb.push('  = ' + zeile + '  – schon eingetragen/verbunden'); continue; }
    if (sp.length) { fb.push('  ✖ ' + zeile + '  – Vorgaenger ist Spielverein'); continue; }
    const e = exp.fusion[f.ziel] = exp.fusion[f.ziel] || { jahr: f.jahr, vorgaenger: [] };
    vorg.forEach(v => { if (!e.vorgaenger.includes(v)) e.vorgaenger.push(v); });
    fb.push('  F ' + zeile);
}
const aus = [
    `fussball-ddr.de: Umbenennungen/Fusionen aus den Saisonseiten (${new Date().toISOString().slice(0, 10)})`,
    `${FD.length} Seiten, Zeilen ueber die Zahlen zugeordnet: ${zuOk} von ${zuOk + zuNein}; ${vermerke.length} Vermerke, ${vermerke.filter(v => v.erk).length} erkannt`,
    `Vorschlag: ${Object.keys(exp.alias).length} Umbenennungen, ${Object.keys(exp.fusion).length} Fusionen, ${Object.keys(exp.vorsorge).length} vorsorglich; ${schonEins.length} schon eine ID; ${konflikte.length} gesperrt; ${offen.length} nicht aufgeloest`,
    '', '== Umbenennungen (Ziel, + = neu) ==', ...bericht,
    '', '== Fusionen / Anschluesse ==', ...fb,
    '', '== Vorsorglich (neuer Name kommt in unseren Tabellen nicht vor) ==', ...vb,
    '', '== Gesperrt (bleibt getrennt) ==', ...konflikte.map(k => '  ' + k),
    '', '== Nicht aufgeloest ==', ...offen.map(k => '  ' + k),
    '', '== Schon eine ID ==', ...schonEins.map(k => '  ' + k)];
fs.writeFileSync(path.join(DIR, '_dryrun/fddr_umbenennungen.txt'), aus.join('\n'));
exp._hinweis = 'Vorschlag von tools/fddr_umbenennungen.mjs (fussball-ddr.de Saisonseiten). Einarbeiten: node tools/hist_dubletten.mjs --uebernehmen <diese Datei>';
fs.writeFileSync(path.join(DIR, '_dryrun/fddr_umbenennungen_export.json'), JSON.stringify(exp, null, 1));
console.log(aus.slice(0, 3).join('\n'));
console.log('-> tools/_dryrun/fddr_umbenennungen.txt, tools/_dryrun/fddr_umbenennungen_export.json');
