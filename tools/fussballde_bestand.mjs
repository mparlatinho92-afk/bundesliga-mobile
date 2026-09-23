// Bestandsliste fuer den fussball.de-Scraper (Colab "cookie cutter"): welche Tabellen haben wir schon?
// Quellen: Spiel (HISTORY_SEED + HIST_EXT), f-archiv-CSV, tools/wiki_ergaenzung.csv, bereits gescrapte fussball.de-CSVs.
// fussball.de-Tabellen tragen eine staffel_id (exakter Abgleich). Alle anderen nur Saison + Liganame – dafuer
// stehen normalisierte Namens-Tokens in der JSON, abgeglichen wird im Notebook (Regel dort, s. Ausgabe am Ende).
//
//   node tools/fussballde_bestand.mjs [farchiv.csv] [fussballde.csv ...]
//   -> tools/fussballde_bestand.json
import fs from 'fs';
import zlib from 'zlib';
import os from 'os';
import path from 'path';

const AB_JAHR = 2000;   // fussball.de fuehrt Tabellen erst ab ca. 2004/05
const args = process.argv.slice(2);
const FARCHIV = args.find(a => /alle_tabellen/.test(a)) || path.join(os.homedir(), 'Downloads/farchiv_output/alle_tabellen_final.csv');
const FBDE = args.filter(a => a !== FARCHIV);
if (!FBDE.length) FBDE.push(path.join(os.homedir(), 'Downloads/hamburg_tabellen_bereinigt.csv'));

// --- Tokens: MUSS identisch zu toks() im Notebook bleiben ---
const LAUT = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
function toks(s) {
    s = s.toLowerCase().replace(/[äöüß]/g, c => LAUT[c]);
    s = s.replace(/-(staffel|gruppe)\b/g, ' ');                   // "Hansa-Staffel" = "Hansa"
    s = s.replace(/([a-z])[-/]([a-z])/g, '$1$2');           // Donau-Iller = Donau/Iller = donauiller
    return [...new Set(s.split(/[^a-z0-9]+/).filter(Boolean)
        .map(t => /^\d+$/.test(t) ? String(+t) : t)
        .filter(t => !FUELL.has(t)))];
}
const FUELL = new Set(['herren', 'staffel', 'gruppe', 'st', 'der', 'die', 'und']);

const saison = y => y.slice(2, 4) + '/' + y.slice(5, 7);   // "2004/05" -> "04/05"

function csvZeilen(datei, trenner) {
    const txt = fs.readFileSync(datei, 'utf8').replace(/^﻿/, '');
    const zeilen = []; let feld = '', zeile = [], q = false;
    for (let i = 0; i < txt.length; i++) {
        const c = txt[i];
        if (q) { if (c === '"') { if (txt[i + 1] === '"') { feld += '"'; i++; } else q = false; } else feld += c; }
        else if (c === '"') q = true;
        else if (c === trenner) { zeile.push(feld); feld = ''; }
        else if (c === '\n') { zeile.push(feld.replace(/\r$/, '')); zeilen.push(zeile); zeile = []; feld = ''; }
        else feld += c;
    }
    if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    const kopf = zeilen.shift();
    return zeilen.filter(z => z.length === kopf.length).map(z => Object.fromEntries(kopf.map((k, i) => [k, z[i]])));
}

const tabellen = new Map();   // saison|tokens -> Eintrag
function neu(y, name, teams, quelle) {
    if (+y.slice(0, 4) < AB_JAHR) return;
    const t = toks(name).sort(), k = saison(y) + '|' + t.join(' ');
    const e = tabellen.get(k);
    if (e) { if (!e.q.includes(quelle)) e.q.push(quelle); return; }
    tabellen.set(k, { s: saison(y), n: name, t, v: teams, q: [quelle] });
}

// 1) Spiel
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['game_data.js', 'app/history_data.js', 'app/history_ext.js'])
    (0, eval)(fs.readFileSync(f, 'utf8').replace(/^const /gm, 'var '));
const gl = {};
Object.entries(GAME_DATA.leagues).forEach(([k, l]) => gl[l.id || k] = l);
const lname = lid => (HIST_EXT.ligen[lid] || gl[lid] || {}).name || ({ 1: 'Bundesliga', 2: '2. Bundesliga' })[lid] || lid;
JSON.parse(zlib.gunzipSync(Buffer.from(HIST_EXT.gz, 'base64')).toString())
    .forEach(e => neu(e.y, lname(e.lid), e.rows.length, 'spiel'));
HISTORY_SEED.seasons.forEach(e => neu(e.y, lname(e.lid), e.table.length, 'spiel'));

// 2) f-archiv + Wikipedia-Ergaenzung (gleiches Format). Mehrere Staffeln in EINER Tabelle: Neustart bei Platz 1
for (const [datei, quelle] of [[FARCHIV, 'farchiv'], ['tools/wiki_ergaenzung.csv', 'wikipedia']]) {
    if (!fs.existsSync(datei)) { console.log('fehlt:', datei); continue; }
    const je = new Map();
    for (const z of csvZeilen(datei, ',')) {
        if (!/^\d{4}\/\d{2}$/.test(z.season)) continue;
        const k = z.season + '|' + z.league;
        (je.get(k) || je.set(k, []).get(k)).push(+z.platz);
    }
    for (const [k, plaetze] of je) {
        const [y, liga] = k.split('|');
        const teams = plaetze.filter(p => p === 1).length > 1 ? null : plaetze.length;   // null = zusammengeworfen
        neu(y, liga, teams, quelle);
    }
}

// 3) schon gescrapte fussball.de-Staffeln (exakt ueber die ID)
const ids = { tabellen: new Set(), kreuz: new Set() };
for (const datei of FBDE) {
    if (!fs.existsSync(datei)) { console.log('fehlt:', datei); continue; }
    const z = csvZeilen(datei, ';');
    if (!z.length || !('staffel_id' in z[0])) continue;
    const ziel = 'heim' in z[0] ? ids.kreuz : ids.tabellen;
    z.forEach(r => r.staffel_id && ziel.add(r.staffel_id));
}

const nachSaison = {};
[...tabellen.values()].sort((a, b) => a.s.localeCompare(b.s) || a.n.localeCompare(b.n))
    .forEach(e => (nachSaison[e.s] = nachSaison[e.s] || []).push({ n: e.n, t: e.t, v: e.v, q: e.q.join('+') }));
const aus = {
    stand: new Date().toISOString().slice(0, 10),
    hinweis: 'Erzeugt von tools/fussballde_bestand.mjs. staffel_ids = exakt; tabellen = Abgleich ueber Namens-Tokens (Regel im Notebook).',
    staffel_ids: { tabellen: [...ids.tabellen].sort(), kreuz: [...ids.kreuz].sort() },
    tabellen: nachSaison,
};
fs.writeFileSync('tools/fussballde_bestand.json', JSON.stringify(aus, null, 1));
fs.writeFileSync('tools/fussballde_bestand.json.gz', zlib.gzipSync(JSON.stringify(aus), { level: 9 }));   // fuer Drive/Colab
const n = Object.values(nachSaison).reduce((a, l) => a + l.length, 0);
console.log(`tools/fussballde_bestand.json: ${n} Liga-Saisons ab ${AB_JAHR}/${String(AB_JAHR + 1).slice(2)} ` +
    `(${Object.keys(nachSaison).length} Saisons), staffel_ids: ${ids.tabellen.size} Tabellen, ${ids.kreuz.size} Kreuztabellen`);
const proQ = {}; tabellen.forEach(e => e.q.forEach(q => proQ[q] = (proQ[q] || 0) + 1));
console.log('je Quelle:', proQ);
