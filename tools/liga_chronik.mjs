// Ligen-Chronik (Sheet 28.10.2026: „Liste der Ligen sortiert nach früheste Saison und recherchiere seit wann die Ligen
// tatsächlich existieren“): je Liga erste/letzte Saison in den Daten + Gründungsjahr laut de.wikipedia.
//   node tools/liga_chronik.mjs            -> tools/liga_chronik.json + app/liga_chronik_data.js (ERZEUGT) + Bericht
//   node tools/liga_chronik.mjs --neu      Wikipedia-Zwischenspeicher ignorieren
//   node tools/liga_chronik.mjs --nur-daten  ohne Wikipedia (nur Datenspanne)
//
// Daten: HISTORY_SEED (app/history_data.js) + HIST_EXT-Tabellen (app/history_ext.js, gzip) – Spiel-Ligen UND historische Ligen,
// jede mit IHREN eigenen Tabellen (Vorgänger über HIST_EXT.ligaNachfolger stehen als eigene Zeile, „vor“ nennt sie).
// Gründung: Artikel über die Wikipedia-Suche (Liganame ohne Staffelzusatz), Infobox-Felder „Gründung“/„gegründet“, sonst der
// erste Satz mit „wurde JJJJ gegründet/eingeführt/eingerichtet“ bzw. „seit (der Saison) JJJJ“. Jeder Treffer behält Artikel +
// Fundstelle. Was nicht eindeutig ist, bleibt leer – Korrekturen mit Beleg in tools/liga_chronik_korrektur.json
// ({lid: {seit: 1978, quelle: "URL", text: "…"}} oder {lid: {artikel: "Titel"}} für einen anderen Artikel).
// Zwischenspeicher %TEMP%/liga_wiki_cache (Windows leert %TEMP% gelegentlich still – dann wird neu abgerufen).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const NEU = process.argv.includes('--neu'), NUR_DATEN = process.argv.includes('--nur-daten');
const CACHE = path.join(process.env.TEMP || os.tmpdir(), 'liga_wiki_cache');
const UA = 'BundesligaSim-Research/1.0 (private hobby project)';
fs.mkdirSync(CACHE, { recursive: true });

// ---------- Daten laden ----------
const ctx = { window: {}, localStorage: { getItem: () => null } };
vm.createContext(ctx);
for (const f of ['game_data.js', 'app/history_data.js', 'app/history_ext.js'])
    vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), ctx, { filename: f });
const { GAME_DATA, HISTORY_SEED, HIST_EXT } = ctx;
const tabellen = JSON.parse(zlib.gunzipSync(Buffer.from(HIST_EXT.gz, 'base64')).toString());
const jahr = y => parseInt(String(y)) || 0;

const ligen = {};
for (const l of Object.values(GAME_DATA.leagues)) ligen[l.id] = { lid: l.id, name: l.name, ebene: l.level, art: 'spiel', jahre: new Set() };
for (const l of Object.values(HIST_EXT.ligen)) ligen[l.id] = ligen[l.id] || { lid: l.id, name: l.name, ebene: l.level, art: 'hist', gebiet: l.gebiet, jahre: new Set() };
const add = (lid, y) => { if (ligen[lid]) ligen[lid].jahre.add(jahr(y)); };
for (const s of HISTORY_SEED.seasons) add(s.lid, s.y);
for (const t of Object.values(tabellen)) add(t.lid, t.y);
const vorg = {};
for (const [h, n] of Object.entries(HIST_EXT.ligaNachfolger || {})) (vorg[n] = vorg[n] || []).push(h);

const zeilen = Object.values(ligen).filter(l => l.jahre.size).map(l => {
    const j = [...l.jahre].sort((a, b) => a - b);
    const luecken = []; for (let i = 1; i < j.length; i++) if (j[i] - j[i - 1] > 1) luecken.push([j[i - 1] + 1, j[i] - 1]);
    return { lid: l.lid, name: l.name, ebene: l.ebene, art: l.art, ab: j[0], bis: j[j.length - 1], n: j.length, luecken, vor: vorg[l.lid] || [] };
});
const ohne = Object.values(ligen).filter(l => !l.jahre.size).map(l => l.lid);

// ---------- Wikipedia ----------
const warte = ms => new Promise(r => setTimeout(r, ms));
async function api(params) {
    const key = Object.entries(params).map(([k, v]) => k + '=' + v).join('&');
    const f = path.join(CACHE, key.replace(/[^\wäöüß=&-]/gi, '_').slice(0, 180) + '.json');
    if (!NEU && fs.existsSync(f) && fs.statSync(f).size > 20) return JSON.parse(fs.readFileSync(f, 'utf8'));
    const url = 'https://de.wikipedia.org/w/api.php?format=json&' + Object.entries(params).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    // Wikipedia drosselt mit 429 – dann warten (Retry-After oder 5 s, verdoppelt) und bis zu sechsmal wiederholen
    for (let v = 0, pause = 5000; ; v++, pause *= 2) {
        const r = await fetch(url, { headers: { 'User-Agent': UA } });
        if (r.status === 429 && v < 6) { await warte((+r.headers.get('retry-after') || 0) * 1000 || pause); continue; }
        if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
        const j = await r.json();
        fs.writeFileSync(f, JSON.stringify(j));
        await warte(1000);
        return j;
    }
}
// Liganame -> Suchbegriff: Staffel-/Gruppenzusatz weg („Landesliga Mittelrhein Staffel 2“ -> „Landesliga Mittelrhein“)
const suchname = n => n.replace(/\s*(Staffel|St\.|Gruppe|Grp\.)\s*\S+$/i, '').replace(/\s*\((Nord|Süd|Ost|West|Mitte)[^)]*\)$/i, '').trim();
// Artikel zur Liga: erst der genaue Titel „Fußball-<Name>“, dann „<Name>“, sonst die Suche – dort nur ein Titel, der ohne
// „Fußball-“ und ohne Klammerzusatz GENAU der Name ist. Gemessen (28.10.2026): die lockere Suche traf „Eishockey-Landesliga Bayern“
// und für „Oberliga Nord“ die „Oberliga Nordost“. Andere Sportarten fallen immer raus.
const SPORT = /Eishockey|Handball|Basketball|Volleyball|Hockey|Futsal|Frauen|Rugby|American Football|Wasserball/i;
const kern = t => t.replace(/^Fußball-/, '').replace(/\s*\([^)]*\)$/, '').trim().toLowerCase();
// Titel, die anders heißen als die Liga im Spiel
// Begriffsklärungen umgehen („3. Liga“, „Berlin-Liga“, „Fußball-Regionalliga Nordost“): der Artikel zur Liga direkt.
// Ein Titel, den es nicht gibt, fällt still auf die normale Reihenfolge zurück.
const TITEL = { '1. Bundesliga': 'Fußball-Bundesliga', '2. Bundesliga': '2. Fußball-Bundesliga', '3. Liga': '3. Fußball-Liga' };   // Berlin-Liga und Regionalliga Nordost je Liga-ID in tools/liga_chronik_korrektur.json
// Eine Weiterleitung kann auf den Verband oder eine Liste führen („Fußball-Landesliga Berlin“ -> Berliner Fußball-Verband, seit 1897)
// Nur der VERBAND selbst („Berliner Fußball-Verband“, „…fußballverband“) – nicht „Verbandsliga“ (gemessen: das schloss alle
// „Fußball-Verbandsliga …“-Artikel aus, Südbaden/Baden/Württemberg/Südwest verloren ihr Gründungsjahr)
const KEINE_LIGA = t => !/liga|klasse/i.test(t) || /^Liste /.test(t) || /Fußball-?[Vv]erband\b|Fußballverband/.test(t);
async function artikel(name) {
    for (const t of [TITEL[name], 'Fußball-' + name, name].filter(Boolean)) {
        const q = await api({ action: 'query', titles: t, redirects: 1 });
        const seite = Object.values((q.query && q.query.pages) || {})[0];
        if (seite && !('missing' in seite) && !SPORT.test(seite.title) && !KEINE_LIGA(seite.title)) return seite.title;
    }
    const s = await api({ action: 'query', list: 'search', srsearch: 'Fußball ' + name, srlimit: 10, srnamespace: 0 });
    return ((s.query && s.query.search) || []).map(x => x.title).find(t => !SPORT.test(t) && !KEINE_LIGA(t) && !/\d{4}\/\d{2}/.test(t) && kern(t) === name.toLowerCase()) || null;
}
// Gleichnamige Titel mit Klammerzusatz („… (1963–1974)“, „… (1964 bis 1979)“) aus der Suche, ohne den schon geprüften
async function varianten(name, schon) {
    // intitle: – die freie Suche bringt „Fußball-Regionalliga Südwest (1963–1974)“ nicht unter die ersten zehn
    const s = await api({ action: 'query', list: 'search', srsearch: 'intitle:"' + name + '"', srlimit: 30, srnamespace: 0 });
    return ((s.query && s.query.search) || []).map(x => x.title)
        .filter(t => t !== schon && /\(/.test(t) && !SPORT.test(t) && !KEINE_LIGA(t) && kern(t) === name.toLowerCase());
}
async function wikitext(titel) {
    const j = await api({ action: 'parse', page: titel, prop: 'wikitext', redirects: 1 });
    return j.parse ? { titel: j.parse.title, text: j.parse.wikitext['*'] } : null;
}
function gruendung(text) {
    if (/\{\{\s*Begriffsklärung\s*\}\}/i.test(text)) return { bk: true };   // nicht „Begriffsklärungshinweis“
    const inf = text.match(/\|\s*(Gründung|gegründet|Gegründet|gründung|Erstaustragung|Gründungsjahr|Erste Saison)\s*=\s*([^\n|]*)/);
    if (inf) { const y = (inf[2].match(/\b(18|19|20)\d\d\b/) || [])[0]; if (y) return { seit: +y, fund: inf[0].trim().slice(0, 120), art: 'Infobox' }; }
    // erster Absatz als Klartext (ohne Vorlagen, Einzelnachweise, Tabellen), Links aufgelöst
    const klar = text.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/\{\|[\s\S]*?\|\}/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '')
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '');
    const abs = klar.split(/\n\s*\n|\n==/).map(x => x.trim()).find(x => x.length > 80) || '';
    // Regex-Literale statt zusammengesetzter Strings: ein doppelter Backslash überlebt die Bash-Zeile nicht (docs/PATCHSKRIPTE.md)
    const muster = [
        /\b(?:seit|ab)\s+(?:der\s+(?:Saison|Spielzeit)\s+|dem\s+Jahr\s+)?((?:18|19|20)\d\d)(?:\/\d{2,4})?/g,
        /\b(?:von|zwischen)\s+(?:der\s+(?:Saison|Spielzeit)\s+)?((?:18|19|20)\d\d)(?:\/\d{2,4})?\s+(?:bis|und)\s+(?:zur?\s+(?:Saison|Spielzeit)\s+)?((?:18|19|20)\d\d)?/g,
        /\b((?:18|19|20)\d\d)(?:\/\d{2,4})?[^.;]{0,60}?\b(?:gegründet|eingeführt|eingerichtet|gebildet|ins Leben gerufen|erstmals)/g,
        /\b(?:gegründet|eingeführt|eingerichtet|gebildet|erstmals ausgetragen)[^.;]{0,40}?\b((?:18|19|20)\d\d)/g,
    ];
    let best = null;
    for (const re of muster) for (const m of abs.matchAll(re)) {
        const y = +m[1];
        // ende: „von 1949 bis 1964“ – die Liga endete; Daten, die erst danach beginnen, gehören zu einer anderen Liga
        if (!best || y < best.seit) { const i = Math.max(0, m.index - 60); best = { seit: y, ende: m[2] ? +m[2] : 0, fund: abs.slice(i, m.index + m[0].length + 40).replace(/\s+/g, ' ').trim(), art: 'Text' }; }
    }
    return best;
}

const KORR = fs.existsSync(ROOT + 'tools/liga_chronik_korrektur.json') ? JSON.parse(fs.readFileSync(ROOT + 'tools/liga_chronik_korrektur.json', 'utf8')) : {};
if (!NUR_DATEN) {
    for (const z of zeilen) {
        const k = KORR[z.lid] || {};
        if (k.seit) { Object.assign(z, { seit: k.seit, quelle: k.quelle || '', fund: k.text || 'Korrektur', wie: 'Korrektur' }); continue; }
        try {
            const titel = k.artikel || await artikel(suchname(z.name));
            let w = titel && await wikitext(titel), g = w && gruendung(w.text);
            // Gründung NACH der ersten Datensaison: der Artikel beschreibt eine spätere, gleichnamige Liga (Landesliga
            // Niedersachsen 1974–78 vs. die heutige seit 2010) – die Daten beweisen, dass es die Liga früher schon gab.
            // Dann (und ohne Artikel) die gleichnamigen Titel MIT Klammerzusatz probieren, „Fußball-Regionalliga Südwest
            // (1963–1974)“: genommen wird der erste, dessen Gründung nicht nach der ersten Datensaison liegt.
            const passt = x => x && !x.bk && x.seit && x.seit <= z.ab && !(x.ende && z.ab >= x.ende);
            if (!k.artikel && !passt(g)) {
                for (const t of await varianten(suchname(z.name), titel)) {
                    // Zeitraum im Titel („(1964 bis 1979)“, „(1963–1974)“): die Daten müssen darin BEGINNEN – sonst bekam die
                    // Verbandsliga Niedersachsen ab 1979 und ab 1994 den Artikel der Liga, die 1979 endete
                    const zr = t.match(/\((\d{4})\s*(?:–|-|bis)\s*(\d{4})\)/);
                    if (zr && (z.ab < +zr[1] || z.ab >= +zr[2])) continue;
                    const w2 = await wikitext(t), g2 = w2 && gruendung(w2.text);
                    if (passt(g2)) { w = w2; g = g2; break; }
                }
            }
            if (!w) { z.wie = titel ? 'Artikel fehlt' : 'kein Artikel'; continue; }
            z.quelle = 'https://de.wikipedia.org/wiki/' + encodeURIComponent(w.titel.replace(/ /g, '_'));
            z.artikel = w.titel;
            if (g && g.bk) { z.wie = 'Begriffsklärung'; delete z.quelle; continue; }
            if (g && g.seit > z.ab) { z.wie = `Artikel jünger (${g.seit}) als die Daten`; z.fund = g.fund; }
            else if (g && g.ende && z.ab >= g.ende) { z.wie = `Artikel endet ${g.ende}, Daten erst ab ${z.ab}`; z.fund = g.fund; }
            else if (g) Object.assign(z, { seit: g.seit, fund: g.fund, wie: g.art }); else z.wie = 'kein Jahr im Artikel';
        } catch (e) { z.wie = 'Fehler ' + e.message.slice(0, 60); }
    }
}

// Eine Liga unter mehreren Namen (Amateurliga Bayern 1963 -> Oberliga Bayern 1978 -> Bayernliga 2008) hat mehrere Liga-IDs,
// aber EINEN Artikel. Der Vorlauf (Gründung bis Datenbeginn) zählt deshalb ab der frühesten Saison ALLER Ligen dieses Artikels
// (abA), sonst hätte die Bayernliga 2008–11 „63 Jahre“ Vorlauf, obwohl ihre Tabellen ab 1963 unter dem alten Namen da sind.
const abArt = {};
for (const z of zeilen) if (z.artikel && z.seit) abArt[z.artikel] = Math.min(abArt[z.artikel] || 9999, z.ab);
for (const z of zeilen) z.abA = z.artikel && abArt[z.artikel] ? abArt[z.artikel] : z.ab;
// Dazu die Vorgänger aus HIST_EXT.ligaNachfolger (Oberliga Niedersachsen <- Verbandsliga/Amateurliga Niedersachsen, eigene
// Artikel): deren frühestes Datum zählt mit, und über den Artikel wieder dessen Geschwister.
const nachLid = Object.fromEntries(zeilen.map(z => [z.lid, z]));
for (let runde = 0; runde < 3; runde++) for (const z of zeilen) {
    for (const v of z.vor) if (nachLid[v]) z.abA = Math.min(z.abA, nachLid[v].abA);
    if (z.artikel && abArt[z.artikel]) abArt[z.artikel] = Math.min(abArt[z.artikel], z.abA);
}
for (const z of zeilen) if (z.artikel && abArt[z.artikel]) z.abA = Math.min(z.abA, abArt[z.artikel]);
zeilen.sort((a, b) => a.ab - b.ab || a.ebene - b.ebene || a.name.localeCompare(b.name, 'de'));
fs.writeFileSync(ROOT + 'tools/liga_chronik.json', JSON.stringify({ stand: new Date().toISOString().slice(0, 10), ligen: zeilen, ohneDaten: ohne }, null, 1));
const app = zeilen.map(z => [z.lid, z.ab, z.bis, z.n, z.seit || 0, z.quelle || '', z.seit ? (z.fund || '').replace(/\s+/g, ' ').slice(0, 160) : '', z.luecken, z.abA]);
fs.writeFileSync(ROOT + 'app/liga_chronik_data.js',
    '// ERZEUGT von tools/liga_chronik.mjs – nie von Hand ändern. [lid, erste Saison, letzte Saison, Saisons, gegründet (0 = unbekannt), Quelle, Fundstelle, Lücken, erste Saison aller Ligen desselben Artikels]\n' +
    'const LIGA_CHRONIK = ' + JSON.stringify({ stand: new Date().toISOString().slice(0, 10), l: app }) + ';\n');

const mit = zeilen.filter(z => z.seit), vorDaten = mit.filter(z => z.seit < z.abA);
console.log(`${zeilen.length} Ligen mit Daten (${zeilen.filter(z => z.art === 'spiel').length} Spiel-Ligen, ${zeilen.filter(z => z.art === 'hist').length} historische), ${ohne.length} ohne Daten`);
console.log(`Gründungsjahr gefunden: ${mit.length} (Infobox ${mit.filter(z => z.wie === 'Infobox').length}, Text ${mit.filter(z => z.wie === 'Text').length}, Korrektur ${mit.filter(z => z.wie === 'Korrektur').length}), davon gegründet VOR Datenbeginn: ${vorDaten.length}`);
const wie = {}; zeilen.filter(z => !z.seit).forEach(z => wie[z.wie || 'ohne Suche'] = (wie[z.wie || 'ohne Suche'] || 0) + 1);
console.log('ohne Jahr:', JSON.stringify(wie));
const B = zeilen.map(z => `${String(z.ab).padEnd(5)} ${String(z.bis).padEnd(5)} ${String(z.n).padStart(3)}  E${z.ebene} ${z.art === 'hist' ? 'H' : 'S'} ${z.name.padEnd(46).slice(0, 46)} ${z.seit ? 'seit ' + z.seit + ' (' + z.wie + ')' : '– ' + (z.wie || '')}${z.artikel ? '  [' + z.artikel + ']' : ''}${z.fund ? '\n        „' + z.fund + '“' : ''}`);
fs.mkdirSync(ROOT + 'tools/_dryrun', { recursive: true });
fs.writeFileSync(ROOT + 'tools/_dryrun/liga_chronik.txt', B.join('\n') + '\n');
console.log('Bericht: tools/_dryrun/liga_chronik.txt');
