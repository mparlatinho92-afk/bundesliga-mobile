// Dubletten und Umbenennungen unter den historischen Vereinen finden (app/history_ext.js + HISTORIC_CLUBS + Spielvereine).
//
//   node tools/hist_dubletten.mjs            Bericht nach tools/_dryrun/hist_dubletten.txt
//   node tools/hist_dubletten.mjs --offen    nur Paare, die noch nicht in tools/hist_alias.json oder _getrennt stehen
//
// Zwei Namen sind ein Verdacht, wenn ihr Namenskern gleich ist (Vereinsform, Jahreszahlen, Füllwörter weg, Ortsadjektiv =
// Ort) ODER eine gängige Abkürzung aufgelöst dasselbe ergibt ("Leher TS" = "Leher Turnerschaft"). Entscheidend ist dann die
// KOEXISTENZ: spielen beide in derselben Saison, sind es zwei Vereine; sonst ist es meist eine Umbenennung/Schreibweise.
// Gepflegt wird das Ergebnis von Hand in tools/hist_alias.json ("Name" -> Ziel-ID) und tools/hist_alias_getrennt.json
// (bewusst getrennt gelassene Paare, damit der Bericht sie nicht wieder meldet).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HX = globalThis.HIST_EXT;
const OFFEN = process.argv.includes('--offen');
const lies = f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return {}; } };
const ALIAS = lies('hist_alias.json'), GETRENNT = lies('hist_alias_getrennt.json');

// ---------- Namen und Auftritte ----------
// Tabellen entpacken (Node hat DecompressionStream seit 18)
const bin = Buffer.from(HX.gz, 'base64');
const tab = JSON.parse((await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text()));
const auftritt = {};   // id -> {jahre:Set, ligen:Set}
const merke = (id, y, lid) => { const a = auftritt[id] = auftritt[id] || { jahre: new Set(), ligen: new Set() }; a.jahre.add(parseInt(y)); a.ligen.add(lid); };
tab.forEach(t => { t.rows.forEach(r => merke(r.id, t.y, t.lid)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y, t.lid))); });
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y, s.lid)));

const namen = {};      // id -> Anzeigename
Object.entries(HX.vereine).forEach(([id, n]) => namen[id] = n);   // erst app/hist_ext.js mischt sie in HISTORIC_CLUBS
Object.entries(HC).forEach(([id, n]) => namen[id] = n);
Object.values(GD.teams).forEach(t => namen[t.id] = t.name);

// ---------- Namenskern ----------
const AB = { ts: 'turnerschaft', tus: 'turnundsportverein', tsv: 'turnundsportverein', sb: 'sportbund', sv: 'sportverein', sg: 'sportgemeinschaft',
    bv: 'ballspielverein', bsv: 'ballspielverein', fv: 'fussballverein', fc: 'fussballclub', sc: 'sportclub', spvgg: 'spielvereinigung', spvg: 'spielvereinigung',
    vfb: 'vereinfuerbewegungsspiele', vfl: 'vereinfuerleibesuebungen', vfr: 'vereinfuerrasenspiele', mtv: 'maennerturnverein', tv: 'turnverein', tg: 'turngemeinde' };
const FORM = new Set(Object.keys(AB).concat(['e', 'v', '1', 'i', 'ii', 'u21', 'u23', 'am', 'amateure', 'fussball', 'club', 'verein', 'und', 'von', 'der', 'die', 'im', 'in', 'a', 'turn', 'sport']));
const norm = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss')
    .replace(/gruen[\s-]*wei(ss|s)/g, 'gruenweiss').split(/[^a-z0-9]+/).filter(Boolean);
const reserve = n => /(\s(III|II|2|U ?2[123]|Amateure|Am\.?|A))$/i.test(n.trim());
const stamm = w => w.length >= 4 ? w.replace(/er$/, '').replace(/e$/, '') : w;
const kern = n => norm(n).filter(w => !FORM.has(w) && !/^\d+$/.test(w)).map(stamm).sort();
// Abkuerzungen aufgeloest: "Leher TS" -> leher + turnerschaft; damit trifft "Leher Turnerschaft"
const langKern = n => norm(n).map(w => AB[w] || w).filter(w => !/^\d+$/.test(w) && !['e', 'v', '1'].includes(w)).map(stamm).sort();

const ids = Object.keys(auftritt).filter(id => namen[id]);
const gruppen = {};
for (const id of ids) {
    const n = namen[id], r = reserve(n) ? '|R' : '';
    [kern(n).join(' ') + r, 'L:' + langKern(n).join(' ') + r].forEach(k => { if (k.replace(/^L:/, '').trim()) (gruppen[k] = gruppen[k] || new Set()).add(id); });
}

const spiel = id => !!GD.teams[id];
const zeile = id => `${namen[id]} [${id}]${spiel(id) ? ' (Spielverein)' : ''} ${[...auftritt[id].jahre].sort((a, b) => a - b).map(y => y).slice(0, 3).join(',')}${auftritt[id].jahre.size > 3 ? '…' : ''} ${[...auftritt[id].ligen].slice(0, 3).join(',')}`;
const paare = new Map();
for (const [k, set] of Object.entries(gruppen)) {
    const arr = [...set]; if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j], key = [a, b].sort().join('|');
        if (paare.has(key)) continue;
        const ja = auftritt[a].jahre, jb = auftritt[b].jahre;
        const zugleich = [...ja].filter(y => jb.has(y));
        paare.set(key, { a, b, lang: k.startsWith('L:'), zugleich });
    }
}
const bekannt = ([a, b]) => (GETRENNT[a] || []).includes(b) || (GETRENNT[b] || []).includes(a)
    || Object.entries(ALIAS).some(([nm, ziel]) => (ziel === a || ziel === b) && [namen[a], namen[b]].includes(nm));
const liste = [...paare.values()].filter(p => !(OFFEN && bekannt([p.a, p.b])))
    .sort((p, q) => p.zugleich.length - q.zugleich.length || (spiel(p.a) || spiel(p.b) ? -1 : 0) - (spiel(q.a) || spiel(q.b) ? -1 : 0));
const aus = [];
aus.push(`Verdachtsfaelle: ${liste.length} (ohne Koexistenz ${liste.filter(p => !p.zugleich.length).length}, mit ${liste.filter(p => p.zugleich.length).length})`);
aus.push('', '== Ohne gemeinsame Saison (meist Umbenennung/Schreibweise) ==');
liste.filter(p => !p.zugleich.length).forEach(p => aus.push(`  ${zeile(p.a)}\n  ${zeile(p.b)}${p.lang ? '   [Abkuerzung aufgeloest]' : ''}\n`));
aus.push('== Mit gemeinsamer Saison (zwei verschiedene Vereine) ==');
liste.filter(p => p.zugleich.length).forEach(p => aus.push(`  ${namen[p.a]} [${p.a}] <-> ${namen[p.b]} [${p.b}] – zusammen in ${p.zugleich.sort().slice(0, 4).join(',')}`));
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
fs.writeFileSync(path.join(DIR, '_dryrun/hist_dubletten.txt'), aus.join('\n'));
console.log(aus.slice(0, 1).join('\n'));
console.log(`-> tools/_dryrun/hist_dubletten.txt (${ids.length} Vereine geprueft)`);
