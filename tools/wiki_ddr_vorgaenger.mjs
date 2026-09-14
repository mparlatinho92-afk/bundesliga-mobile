// DDR-Vorgaengernamen der Spielvereine aus Wikipedia (nur lesend) – Beleg fuer die Zuordnung der DDR-Tabellennamen.
//
//   node tools/wiki_ddr_vorgaenger.mjs          # vorher: farchiv_ebenen.mjs + farchiv_vereine.mjs
//
// Ein DDR-Name aus den Tabellen ("Motor Rathenow") gilt als Vorgaenger eines Spielvereins, wenn er im Artikel des Vereins
// hoechstens FENSTER Zeichen von einem Umbenennungswort steht UND den Ort des Vereins enthaelt. Blosse Nennung reicht nicht:
// der Artikel des SC 1903 Weimar nennt auch Gegner wie die BSG Chemie Leipzig.
// GEGENPROBE: DDR-Namen mit bekannter ID aus dem Seed-Anker muessen ihrem Verein zugeordnet werden.
// Ausgabe: tools/wiki_ddr_vorgaenger.json { name: { ids:[...], belege:[{id, titel, satz}] } }
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
(0, eval)(fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8').replace(/^const /gm, 'var '));
const GD = globalThis.GAME_DATA;
const EB = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_ebene23.json'), 'utf8'));
const VZ = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_vereine.json'), 'utf8')).zuordnung;
// Nur STARKE Umbenennungswoerter. Ein +-200-Zeichen-Fenster um schwache Woerter ("Traegerbetrieb", "den Namen") fing Rivalen
// ein: "stand im Schatten des SV Stahl Thale" wurde Vorgaenger des SV 1890 Westerhausen.
// "neu gegruendet" ist KEIN Umbenennungswort: "trat seinen Platz an die neu gegruendete BSG Chemie Jena ab" = anderer Verein
const UMBENENNUNG = /hervorgegangen|hervorging|ging\s+\S+\s+hervor|umbenannt|Umbenennung|nannte\s+sich|benannte\s+sich|trug\s+(?:den|seit)|hieß|hiess|Nachfolge|Vorgänger|firmierte|gegründet\s+als|wurde\s+zur|wurde\s+zum|Namensänderung|Zusammenschluss|fusionierte|Fusion/i;
// Saetze ueber Gegner zaehlen nicht, auch wenn ein Umbenennungswort darin steht
const GEGNER = /unterlag|gegen\s|Rivale|Konkurrent|Vormachtstellung|Derby|Lokalrivale|übernahm\s+fortan/i;
// Satzgrenze nur nach zwei Kleinbuchstaben + Satzzeichen: "1. FC", "e. V.", "4. April" trennen nicht
const saetze = text => text.replace(/\s+/g, ' ').split(/(?<=[a-zäöüß)\]"“]{2}[.!?])\s+(?=[A-ZÄÖÜ„"])/);
// Der Name muss in DDR-Form mit Praefix im Satz stehen – "SV Stahl Thale" im Rivalensatz zaehlt nicht
const DDR_PRAEFIX = ' (?:bsg|sg|asg|tsg|hsg|zsg|ksg|sc|betriebssportgemeinschaft|sportgemeinschaft) ';

const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; DDR-Vorgaenger)';
const CACHE = path.join(os.tmpdir(), 'wiki_ddr_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(params) {
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params));
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (fs.existsSync(datei)) return JSON.parse(fs.readFileSync(datei, 'utf8'));
    for (let i = 0; i < 6; i++) {
        const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch(e => ({ ok: false, status: e.message }));
        if (r.ok) { const j = await r.json(); fs.writeFileSync(datei, JSON.stringify(j)); await sleep(400); return j; }
        console.log(`  [${r.status}] warte ${5 * 2 ** i} s`); await sleep(5000 * 2 ** i);
    }
    throw new Error('API-Fehler');
}

const norm = s => (s || '').toLowerCase().replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const klartext = wt => wt
    // Ueberschriften und Aufzaehlungspunkte als Satzgrenze: sonst verschmolz "…die ASG Vorwärts Dessau. === Nach der Wende === 1989
    // benannte sich…" zu EINEM Satz, und der Rivale wurde Vorgaenger
    .replace(/^=+[^=\n]*=+\s*$/gm, '\nÜBERSCHRIFT. Neu ').replace(/^\*+/gm, '\nPunkt. Neu ')
    .replace(/<ref[^>]*\/>/g, ' ').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ')
    .replace(/\[\[(?:Datei|File|Bild|Image|Kategorie):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ').replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/^[{|!].*$/gm, ' ').replace(/[ \t]+/g, ' ');
const PRAEFIX = /^(?:bsg|sg|asg|tsg|hsg|sc|zsg|ksg|sv|spvgg|fsv|fc|1 fc|vfb|vfl|tus|sgv|isg|esg|psv|ssv|tsv) /;

// ---------- Spielvereine (NOFV, ohne Reserven) und ihre Orte ----------
const VEREINE = Object.values(GD.teams).filter(t => !t.isReserve && (t.regions || [])[0] === 'Nordostdeutscher Fußballverband');
const orteVon = t => {
    const o = new Set(norm(t.name).split(' ').filter(w => w.length >= 4));
    (t.venues || []).forEach(v => norm((v.ort || '').split(/[-,(]/)[0]).split(' ').filter(w => w.length >= 4).forEach(w => o.add(w)));
    return o;
};

// ---------- DDR-Namen aus den Tabellen ----------
const DDR_NAMEN = new Map(); // name -> {saisons, norm, ohnePraefix}
EB.tabellen.filter(t => t.gebiet === 'DDR').forEach(t => t.zeilen.forEach(z => {
    if (/\s(?:II|III|2|A)$/.test(z.verein)) return; // Reserven haben keine eigenen Artikel-Namen
    const e = DDR_NAMEN.get(z.verein) || { saisons: 0, norm: norm(z.verein) };
    e.saisons++; e.ohnePraefix = e.norm.replace(PRAEFIX, ''); DDR_NAMEN.set(z.verein, e);
}));

// ---------- Artikel holen ----------
async function artikel(titelListe) {
    const out = new Map();
    for (let i = 0; i < titelListe.length; i += 50) {
        const j = await api({ action: 'query', redirects: '1', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titelListe.slice(i, i + 50).join('|') });
        const um = new Map((j.query?.redirects || []).map(r => [r.from, r.to]));
        const norml = new Map((j.query?.normalized || []).map(r => [r.from, r.to]));
        const seiten = new Map((j.query?.pages || []).map(p => [p.title, p]));
        for (const t of titelListe.slice(i, i + 50)) {
            let x = norml.get(t) || t; x = um.get(x) || x;
            const p = seiten.get(x);
            if (p && p.revisions) out.set(t, { titel: p.title, text: p.revisions[0].slots.main.content });
        }
    }
    return out;
}
const t0 = Date.now();
const direkt = await artikel(VEREINE.map(v => v.name));
let perSuche = 0;
for (const v of VEREINE) {
    if (direkt.has(v.name)) continue;
    const s = await api({ action: 'opensearch', search: v.name, limit: '5', namespace: '0' });
    const orte = orteVon(v);
    const titel = (s[1] || []).find(x => norm(x).split(' ').some(w => orte.has(w)) && !/Saison|\d{4}\/\d{2}|Liste|Stadion/.test(x));
    if (!titel) continue;
    const a = await artikel([titel]);
    if (a.has(titel)) { direkt.set(v.name, a.get(titel)); perSuche++; }
}
console.log(`Artikel: ${direkt.size} von ${VEREINE.length} Spielvereinen gefunden (${perSuche} ueber die Suche) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ---------- Vorgaenger-Belege ----------
const belege = new Map(); // DDR-Name -> [{id, titel, satz}]
for (const v of VEREINE) {
    const a = direkt.get(v.name); if (!a) continue;
    const text = klartext(a.text);
    const orte = orteVon(v);
    // Saetze mit einem Umbenennungswort; Name und Wort muessen im SELBEN Satz stehen
    const fn = saetze(text).filter(s => UMBENENNUNG.test(s) && !GEGNER.test(s)).map(s => ({ roh: s.trim(), n: ' ' + norm(s) + ' ' }));
    if (!fn.length) continue;
    for (const [name, e] of DDR_NAMEN) {
        const woerter = e.ohnePraefix.split(' ');
        if (woerter.length < 2) continue;                              // "Einheit" allein ist kein Name
        if (!woerter.some(w => orte.has(w))) continue;                 // Ort des Vereins muss im Namen stecken
        const re = new RegExp(DDR_PRAEFIX + e.ohnePraefix + ' ');
        const hit = fn.find(f => re.test(f.n));
        if (!hit) continue;
        (belege.get(name) || belege.set(name, []).get(name)).push({ id: v.id, verein: v.name, titel: a.titel, satz: hit.roh.slice(0, 300) });
    }
}
const ergebnis = {};
for (const [name, l] of belege) {
    const ids = [...new Set(l.map(b => b.id))];
    ergebnis[name] = { ids, saisons: DDR_NAMEN.get(name).saisons, belege: l.slice(0, 3) };
}
const eindeutig = Object.entries(ergebnis).filter(([, e]) => e.ids.length === 1);
console.log(`DDR-Namen mit Vorgaenger-Beleg: ${Object.keys(ergebnis).length} (eindeutig ${eindeutig.length}, mehrdeutig ${Object.keys(ergebnis).length - eindeutig.length}) | Vereinssaisons eindeutig: ${eindeutig.reduce((s, [, e]) => s + e.saisons, 0)}`);

// ---------- GEGENPROBE: DDR-Namen mit bekannter ID ----------
const anker = [...DDR_NAMEN.keys()].filter(n => VZ[n] && VZ[n].grund === 'Anker-Namensform' && VZ[n].id && GD.teams[VZ[n].id]);
const probe = { richtig: 0, falsch: 0, mehrdeutig: 0, keiner: 0 }, falschBsp = [];
anker.forEach(n => {
    const e = ergebnis[n];
    if (!e) probe.keiner++;
    else if (e.ids.length > 1) probe.mehrdeutig++;
    else if (e.ids[0] === VZ[n].id) probe.richtig++;
    else { probe.falsch++; falschBsp.push(`${n}: Wikipedia -> ${GD.teams[e.ids[0]].name}, bekannt ${GD.teams[VZ[n].id].name}`); }
});
console.log(`GEGENPROBE (${anker.length} DDR-Namen mit bekannter ID): richtig ${probe.richtig} | FALSCH ${probe.falsch} | mehrdeutig ${probe.mehrdeutig} | kein Beleg ${probe.keiner}`);
falschBsp.forEach(b => console.log('  ' + b));

// ---------- Wirkung auf die bisherigen Stufen ----------
const wirkung = {};
eindeutig.forEach(([n, e]) => {
    const z = VZ[n] || {};
    const k = `${z.stufe || '?'}${z.id ? (z.id === e.ids[0] ? ' = gleicher Vorschlag' : ' ≠ anderer Vorschlag') : ' (ohne Vorschlag)'}`;
    (wirkung[k] = wirkung[k] || []).push(`${n} (${e.saisons}) -> ${GD.teams[e.ids[0]].name}`);
});
console.log('\nWirkung auf bisherige Stufen:');
Object.entries(wirkung).sort((a, b) => b[1].length - a[1].length).forEach(([k, l]) => console.log(`  ${k}: ${l.length} | ${l.slice(0, 6).join(' | ')}`));
console.log('\nBeleg-Beispiele:');
eindeutig.sort((a, b) => b[1].saisons - a[1].saisons).slice(0, 8).forEach(([n, e]) => console.log(`  ${n} -> ${GD.teams[e.ids[0]].name} [${e.belege[0].titel}]: …${e.belege[0].satz.slice(0, 180)}…`));

fs.writeFileSync(path.join(DIR, 'wiki_ddr_vorgaenger.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), gegenprobe: probe, vorgaenger: ergebnis }, null, 1));
console.log('\n-> tools/wiki_ddr_vorgaenger.json');
