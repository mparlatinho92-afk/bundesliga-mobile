// Nachfolger historischer Vereine (BRD + DDR-Seed), die in den Daten vor 2024/25 enden und keinen Anschluss haben
// (kein Spielverein, nicht in hist_nachfolger.json, kein Fusions-Vorgaenger, kein remap). Wikipedia, nur lesend, mit Zwischenspeicher.
//
//   node tools/wiki_brd_nachfolger.mjs [--ebene 2] [--gegenprobe]
//     -> tools/_dryrun/brd_nachfolger.txt + tools/_dryrun/brd_nachfolger.json
//
// Drei Gruppen (Nutzer 15.10.2026: "Generell Deutschlandweit, jede Aera pruefen. Nachfolger ... im Steckbrief erwaehnen"):
//   VERBINDUNG  Weiterleitung oder Satz nennt einen SPIELverein  -> gehoert nach hist_alias / hist_fusion, nicht in die Nachfolger-Datei
//   EXTERN      Weiterleitung auf einen anderen Artikel, oder Satz mit Fusion/Umbenennung/Aufloesung ohne Spielverein -> Kandidat fuer hist_nachfolger.json
//   BESTEHT     eigener Artikel ohne solchen Satz -> vermutlich unter die erfassten Ligen abgestiegen, kein Nachfolger
//   offen       kein Artikel gefunden
// Alles hier ist VORSCHLAG: Claude prueft jede Zeile am Artikel, bevor etwas in eine Datei kommt.
// --gegenprobe: dieselbe Funktion ueber die bekannten Faelle (Fusions-Vorgaenger -> ihr Nachfolger, hist_nachfolger.json -> ihr Name).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..') + '/';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const EBENE = +arg('--ebene', 2), GEGENPROBE = process.argv.includes('--gegenprobe');

globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = { getElementById: () => null };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const GD = globalThis.GAME_DATA, HE = globalThis.HIST_EXT, HC = globalThis.HISTORIC_CLUBS || {}, SEED = globalThis.HISTORY_SEED;

// ---------- Wikipedia ----------
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Nachfolger historischer Vereine)';
const CACHE = path.join(os.tmpdir(), 'wiki_nachfolger_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let abrufe = 0;
async function api(params) {
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params));
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (fs.existsSync(datei)) return JSON.parse(fs.readFileSync(datei, 'utf8'));
    for (let i = 0; i < 6; i++) {
        const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch(e => ({ ok: false, status: e.message }));
        if (r.ok) { const j = await r.json(); fs.writeFileSync(datei, JSON.stringify(j)); abrufe++; await sleep(400); return j; }
        console.log(`  [${r.status}] warte ${5 * 2 ** i} s`); await sleep(5000 * 2 ** i);
    }
    throw new Error('API-Fehler');
}
const norm = s => (s || '').toLowerCase().replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const klartext = wt => wt
    .replace(/^=+[^=\n]*=+\s*$/gm, '\nZwischentitel. Neu ').replace(/^\*+/gm, '\nPunkt. Neu ')
    .replace(/<ref[^>]*\/>/g, ' ').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ')
    .replace(/\[\[(?:Datei|File|Bild|Image|Kategorie):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ').replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/^[{|!].*$/gm, ' ').replace(/[ \t]+/g, ' ');
const saetze = text => text.replace(/\s+/g, ' ').split(/(?<=[a-zäöüß)\]"“]{2}[.!?])\s+(?=[A-ZÄÖÜ„"])/);
const UMBENENNUNG = /umbenannt|Umbenennung|nannte\s+sich|benannte\s+sich|Nachfolge|firmierte|Namensänderung|änderte\s+(?:seinen|den)\s+Namen|neuen\s+Namen|heißt\s+(?:heute|seit)/i;
const FUSION = /Fusion|fusionierte|Zusammenschluss|schloss(?:en)?\s+sich\s+\S*\s*(?:\S+\s+)?zusammen|vereinigte|Verschmelzung|ging\s+(?:\S+\s+){0,6}auf|aufgegangen|eingegliedert|Eingliederung|angeschlossen|Anschluss\s+an/i;
const AUFLOESUNG = /aufgelöst|Auflösung|Insolvenz|Konkurs|Spielbetrieb\s+(?:\S+\s+){0,3}eingestellt|zog\s+(?:\S+\s+){0,3}zurück|existiert\s+nicht\s+mehr|abgemeldet/i;
const PLAN = /schlug\s+vor|vorgeschlagen|geplant|scheiterte|gescheitert|Pläne|angedacht|Überlegungen/i;
const FORM = new Set('sv fc sc spvgg spvg tus tsv vfb vfl vfr sg fsv ssv bsv tv tsg mtv fv bv esv psv djk dsc sportfreunde sf e v ev und von der fk bc ac bsc asv'.split(' '));
const kernVon = n => norm(n).split(' ').filter(w => !FORM.has(w) && !/^\d+$/.test(w) && w !== 'ii');
const kernKey = n => kernVon(n).sort().join(' ');

const artikelCache = new Map();
async function artikel(titel) {
    if (artikelCache.has(titel)) return artikelCache.get(titel);
    const j = await api({ action: 'query', redirects: '1', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titel });
    const p = (j.query?.pages || [])[0];
    const umgeleitet = !!(j.query?.redirects || []).length;
    const a = p && p.revisions ? { titel: p.title, text: p.revisions[0].slots.main.content, umgeleitet } : null;
    artikelCache.set(titel, a);
    return a;
}
const BKL = /\{\{\s*Begriffsklärung/;
// Artikel eines historischen Vereins: Name direkt (auch Weiterleitung), sonst Suche mit allen Kernwoertern im Titel
async function vereinsArtikel(name) {
    const d = await artikel(name);
    if (d && !BKL.test(d.text)) return d;
    const s = await api({ action: 'opensearch', search: name, limit: '8', namespace: '0' });
    const kern = kernVon(name);
    const t = (s[1] || []).find(x => kern.every(w => norm(x).split(' ').includes(w)) && !/Saison|\d{4}\/\d{2}|Liste|Stadion|Sportpark|Begriffsklärung/.test(x));
    const a = t ? await artikel(t) : null;
    if (a && !BKL.test(a.text)) return { ...a, viaSuche: true };
    const nn = norm(name);
    const v = await api({ action: 'query', list: 'search', srsearch: name + ' Fußball', srlimit: '8', srnamespace: '0' });
    for (const h of v.query?.search || []) {
        if (/Saison|\d{4}\/\d{2}|Liste|Stadion|Sportpark|Begriffsklärung|Fußball-(?:Ober|Verbands|Landes|Regional|Amateur|Bezirks)liga/.test(h.title)) continue;
        if (!kern.some(w => norm(h.title).split(' ').includes(w))) continue;
        const b = await artikel(h.title);
        if (b && !BKL.test(b.text) && (' ' + norm(klartext(b.text).slice(0, 4000)) + ' ').includes(' ' + nn + ' ')) return { ...b, viaSuche: true };
    }
    return null;
}

// ---------- Spielvereine: Name + damalige Namen -> ID ----------
const spielNamen = [];   // [{n: norm-Name, key, id, name}]
for (const t of Object.values(GD.teams)) spielNamen.push({ n: norm(t.name), key: kernKey(t.name), id: t.id, name: t.name });
for (const [id, l] of Object.entries(HE.namen || {})) if (GD.teams[id]) l.forEach(e => spielNamen.push({ n: norm(e.name), key: kernKey(e.name), id, name: e.name }));
const spielInSatz = (satzNorm, eigen) => {
    const ids = new Map();
    for (const s of spielNamen) {
        if (s.n.length < 8 || !s.key || s.key === eigen) continue;
        if ((' ' + satzNorm + ' ').includes(' ' + s.n + ' ')) ids.set(s.id, s.name);
    }
    return [...ids].map(([id, name]) => ({ id, name: GD.teams[id].name, als: name }));
};
const spielZuTitel = titel => { const k = kernKey(titel.replace(/\s*\(.*\)$/, '')); return k ? [...new Map(spielNamen.filter(s => s.key === k).map(s => [s.id, GD.teams[s.id].name]))] : []; };

// ---------- eine Frage: was wurde aus Verein (id, name)? ----------
async function recherche(id, name) {
    const a = await vereinsArtikel(name);
    if (!a) return { gruppe: 'offen' };
    const eigen = kernKey(name);
    const r = { artikel: a.titel, viaSuche: !!a.viaSuche, umgeleitet: a.umgeleitet, saetze: [], spiel: [] };
    // Weiterleitung auf einen anderen Verein
    if (a.umgeleitet && kernKey(a.titel.replace(/\s*\(.*\)$/, '')) !== eigen) {
        const sp = spielZuTitel(a.titel);
        if (sp.length) return { ...r, gruppe: 'VERBINDUNG', art: 'WEITERLEITUNG', spiel: sp.map(([sid, n]) => ({ id: sid, name: n })) };
        r.weiterleitung = a.titel;
    }
    const kern = kernVon(name);
    for (const s of saetze(klartext(a.text))) {
        if (PLAN.test(s)) continue;
        const art = FUSION.test(s) ? 'FUSION' : UMBENENNUNG.test(s) ? 'UMBENENNUNG' : AUFLOESUNG.test(s) ? 'AUFLOESUNG' : null;
        if (!art) continue;
        const sn = norm(s);
        // im eigenen Artikel reicht der Satz; ueber eine Weiterleitung (Artikel des Nachfolgers) muss er den eigenen Ort nennen
        if (r.weiterleitung && !kern.some(w => sn.split(' ').includes(w))) continue;
        const sp = spielInSatz(sn, eigen);
        r.saetze.push({ art, satz: s.trim().slice(0, 360), spiel: sp });
        sp.forEach(x => { if (!r.spiel.some(y => y.id === x.id)) r.spiel.push(x); });
    }
    r.saetze = r.saetze.slice(0, 6);
    if (r.spiel.length) return { ...r, gruppe: 'VERBINDUNG', art: 'SATZ' };
    if (r.weiterleitung || r.saetze.length) return { ...r, gruppe: 'EXTERN' };
    return { ...r, gruppe: 'BESTEHT' };
}

// ---------- Kandidaten (wie die Messung vom 15.10.2026) ----------
const x = await HistExt.load();
const info = {};
const add = (id, y, lvl, geb) => {
    const i = info[id] || (info[id] = { first: 9999, last: 0, lvl: 99, gebiet: new Set() });
    i.first = Math.min(i.first, y); i.last = Math.max(i.last, y); if (+lvl) i.lvl = Math.min(i.lvl, +lvl); i.gebiet.add(geb);
};
let maxY = 0;
for (const r of Object.values(x.byKey)) {
    const L = HE.ligen[r.lid], GL = (GD.leagues || {})[r.lid], y = parseInt(r.y);
    maxY = Math.max(maxY, y);
    r.rows.forEach(z => add(z.id, y, L ? L.level : GL ? GL.level : 99, L ? (L.gebiet || '?') : 'heute'));
}
for (const t of SEED.seasons) { const ddr = /ddr/i.test(t.lid); (t.table || []).forEach(z => z && z.id && add(z.id, parseInt(t.y), ddr ? 1 : (+t.lid || 99), ddr ? 'DDR' : 'BRD')); }
const fusionNach = {}; Object.entries(HE.fusion || {}).forEach(([nach, f]) => f.vorgaenger.forEach(v => { fusionNach[v] = nach; }));
const ext = HE.nachfolgerExtern || {}, remap = HE.remap || {};
const nameVon = id => HE.vereine[id] || (typeof HC[id] === 'string' ? HC[id] : HC[id] && HC[id].name) || (GD.teams[id] && GD.teams[id].name) || id;

let liste;
if (GEGENPROBE) {
    liste = [
        ...Object.entries(fusionNach).map(([id, nach]) => ({ id, erwartet: { id: nach, name: nameVon(nach) } })),
        ...Object.entries(ext).map(([id, e]) => ({ id, erwartet: e.name ? { name: e.name } : { aufgeloest: true } })),
    ];
} else {
    liste = Object.entries(info).filter(([id, i]) => !GD.teams[id] && i.last < maxY - 1 && !ext[id] && !fusionNach[id] && !remap[id]
        // 'heute' = Saisons in den Spiel-Ligen (fussball.de 2001-2024, Ebene 5-8 vor dem Sim-Start) - ohne sie fehlten Ebene 5-8 fast ganz
        && i.lvl <= EBENE && (i.gebiet.has('BRD') || i.gebiet.has('heute') || (i.gebiet.has('DDR') && i.lvl === 1)))
        .map(([id]) => ({ id }));
}
console.log(`${GEGENPROBE ? 'Gegenprobe' : 'Ebene <= ' + EBENE}: ${liste.length} Vereine`);

const erg = [];
for (const [n, e] of liste.entries()) {
    const name = nameVon(e.id), i = info[e.id] || {};
    const r = await recherche(e.id, name);
    erg.push({ id: e.id, name, von: i.first, bis: i.last, ebene: i.lvl, ...r, erwartet: e.erwartet });
    if ((n + 1) % 20 === 0) console.log(`  ${n + 1}/${liste.length} (Abrufe ${abrufe})`);
}

const saison = y => y ? `${y}/${String(y + 1).slice(-2)}` : '?';
const zeilen = [];
const zaehl = {}; erg.forEach(e => { zaehl[e.gruppe] = (zaehl[e.gruppe] || 0) + 1; });
zeilen.push(`Stand ${new Date().toISOString().slice(0, 10)} | ${GEGENPROBE ? 'GEGENPROBE' : 'Ebene <= ' + EBENE} | ${erg.length} Vereine | ` + Object.entries(zaehl).map(([k, v]) => `${k} ${v}`).join(', '));
if (GEGENPROBE) {
    const treffer = e => e.erwartet.id ? (e.spiel || []).some(s => s.id === e.erwartet.id) || (e.saetze || []).some(s => kernVon(e.erwartet.name).every(w => norm(s.satz).split(' ').includes(w)))
        : e.erwartet.aufgeloest ? (e.saetze || []).some(s => s.art === 'AUFLOESUNG')
        : (e.weiterleitung && kernKey(e.weiterleitung) === kernKey(e.erwartet.name)) || (e.saetze || []).some(s => kernVon(e.erwartet.name).every(w => norm(s.satz).split(' ').includes(w)));
    const fu = erg.filter(e => e.erwartet.id), na = erg.filter(e => !e.erwartet.id);
    zeilen.push(`Fusions-Vorgaenger: ${fu.filter(treffer).length}/${fu.length} nennen den bekannten Nachfolger | hist_nachfolger.json: ${na.filter(treffer).length}/${na.length}`);
    zeilen.push(`ohne Artikel: ${erg.filter(e => e.gruppe === 'offen').length} | als BESTEHT eingestuft (waere falsch): ${erg.filter(e => e.gruppe === 'BESTEHT').length}`);
    erg.filter(e => !treffer(e)).forEach(e => zeilen.push(`  verfehlt: ${e.id} "${e.name}" -> erwartet "${e.erwartet.name}" | ${e.gruppe} ${e.artikel || ''}`));
} else {
    for (const g of ['VERBINDUNG', 'EXTERN', 'BESTEHT', 'offen']) {
        const l = erg.filter(e => e.gruppe === g);
        zeilen.push('', `===== ${g} (${l.length}) =====`);
        for (const e of l) {
            zeilen.push(`${e.id} "${e.name}" ${saison(e.von)}–${saison(e.bis)} Ebene ${e.ebene}` + (e.artikel ? ` | [[${e.artikel}]]${e.viaSuche ? ' (Suche)' : ''}${e.umgeleitet ? ' (Weiterleitung)' : ''}` : ''));
            if (e.spiel?.length) zeilen.push('    SPIELVEREIN: ' + e.spiel.map(s => `${s.name} (${s.id})`).join(', '));
            (e.saetze || []).forEach(s => zeilen.push(`    ${s.art}: ${s.satz}`));
        }
    }
}
const basis = path.join(DIR, '_dryrun', GEGENPROBE ? 'brd_nachfolger_gegenprobe' : 'brd_nachfolger');
fs.writeFileSync(basis + '.txt', zeilen.join('\n') + '\n');
fs.writeFileSync(basis + '.json', JSON.stringify(erg, null, 1));
console.log(zeilen.slice(0, GEGENPROBE ? 4 : 1).join('\n'));
console.log(`-> ${basis}.txt (Abrufe ${abrufe})`);
