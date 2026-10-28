// Fehlende Vereine der laufenden Saisons in den Ligen ÜBER den Bodenligen (FIXES_OFFEN „Vereinsbestand“, Nutzer 28.10.2026:
// „Röchling Völklingen, Solingen-Wald + andere aktuelle (2026/27) fehlenden Mannschaften überhalb der Bodenligen. Zielliga vorerst:
// Amateurpokal. Bonus: 2025/2026. Mannschaften könnten schon als historische Mannschaften im Spiel sein. Es geht um die Teilnahme in der Sim.“)
//
//   node tools/kader_aktuell.mjs         -> tools/_dryrun/kader_aktuell.txt + tools/kader_aktuell.json
//
// Quelle: de.wikipedia, Saisonartikel 2026/27 und 2025/26 je Liga (Cache %TEMP%/kader_wiki_cache). Vereine aus {{Fußballtabelle/Zeile}}
// (Verein=) oder – vor dem ersten Spieltag – aus der Teilnehmerliste. Abgleich gegen game_data (heutiger Spielbestand); was dort fehlt,
// wird gegen HISTORIC_CLUBS/HIST_EXT (historische IDs) und die gepflegten Zuordnungen gesucht.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const CACHE = path.join(process.env.TEMP || os.tmpdir(), 'kader_wiki_cache');
fs.mkdirSync(CACHE, { recursive: true });
const UA = 'BundesligaSim-Research/1.0 (private hobby project)';
const warte = ms => new Promise(r => setTimeout(r, ms));

// Liga-ID (game_data) -> Artikelstamm; abschnitt = Staffel im gemeinsamen Artikel
export const LIGEN = [
    ['1', 'Fußball-Bundesliga'], ['2', '2. Fußball-Bundesliga'], ['3', '3. Fußball-Liga'],
    ['4-1', 'Fußball-Regionalliga Südwest'], ['4-2', 'Fußball-Regionalliga Nord'], ['4-3', 'Fußball-Regionalliga Nordost'],
    ['4-4', 'Fußball-Regionalliga West'], ['4-5', 'Fußball-Regionalliga Bayern'],
    ['5-1', 'Fußball-Oberliga Rheinland-Pfalz/Saar'], ['5-2', 'Fußball-Oberliga Baden-Württemberg'], ['5-3', 'Fußball-Hessenliga'],
    ['5-4', 'Fußball-Oberliga Schleswig-Holstein'], ['5-5', 'Fußball-Oberliga Hamburg'], ['5-6', 'Fußball-Oberliga Niedersachsen'],
    ['5-7', 'Fußball-Bremen-Liga'], ['5-8', 'Fußball-Oberliga Nordost', 'Nord'], ['5-9', 'Fußball-Oberliga Nordost', 'Süd'],
    ['5-10', 'Fußball-Oberliga Westfalen'], ['5-11', 'Fußball-Oberliga Niederrhein'], ['5-12', 'Fußball-Mittelrheinliga'],
    ['5-13', 'Fußball-Bayernliga', 'Nord'], ['5-14', 'Fußball-Bayernliga', 'Süd'],
    ['6-1', 'Fußball-Verbandsliga Südwest'], ['6-2', 'Fußball-Rheinlandliga'], ['6-3', 'Fußball-Saarlandliga'], ['6-21', 'Berlin-Liga'],
    // Landesliga Südwest Ost/West (7-1, 7-2): kein Saisonartikel auf de.wikipedia (Suche 28.10.2026) – Lücke, im Bericht genannt
];
export const OHNE_QUELLE = ['7-1', '7-2'];
export const SAISONS = ['2026/27', '2025/26'];

export async function holen(titel) {
    const f = path.join(CACHE, titel.replace(/[\/ :]/g, '_') + '.txt');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8') || null;
    const url = 'https://de.wikipedia.org/w/index.php?title=' + encodeURIComponent(titel.replace(/ /g, '_')) + '&action=raw';
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    let t = r.ok ? await r.text() : '';
    const wl = t.match(/^#(WEITERLEITUNG|REDIRECT)\s*\[\[([^\]#]+)/i);
    if (wl) { await warte(500); return holen(wl[2]); }
    fs.writeFileSync(f, t);
    await warte(700);
    return t || null;
}

// Abschnitt "Staffel Nord" / "Nord" bis zur nächsten Überschrift gleicher oder höherer Ebene
function abschnitt(t, wort) {
    const re = /^(={2,4})\s*(.+?)\s*\1\s*$/gm; let m, start = -1, ebene = 0;
    while ((m = re.exec(t))) {
        if (start < 0 && new RegExp('\\b' + wort + '\\b').test(m[2]) && !/Aufstieg|Relegation|Torsch/.test(m[2])) { start = m.index; ebene = m[1].length; continue; }
        if (start >= 0 && m[1].length <= ebene) return t.slice(start, m.index);
    }
    return start >= 0 ? t.slice(start) : '';
}
const ohneRef = s => String(s || '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/\{\{FN[^}]*\}\}/g, '').replace(/&nbsp;/g, ' ');
function verein(feld) {
    const s = ohneRef(feld);
    const m = s.match(/\[\[(?!\s*(?:Datei|File|Bild):)([^\]|]+)(?:\|([^\]]+))?\]\]/);
    let link = null, name;
    if (m) { link = m[1].trim(); name = (m[2] || m[1]).trim(); } else name = s.replace(/'''?/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]+>/g, '').trim();
    // Zusatz hinter dem Link ("[[Werder Bremen]] II")
    const rest = m ? s.slice(s.indexOf(m[0]) + m[0].length).replace(/\{\{[^}]*\}\}|<[^>]+>|\(.*?\)/g, '').trim() : '';
    if (/^(II|III|U ?2[123])\b/.test(rest)) name += ' ' + rest.split(/\s/)[0];
    return { name: name.replace(/'''?/g, '').replace(/\s+/g, ' ').trim(), link };
}
// Vereine eines Artikels: erste Tabelle {{Fußballtabelle/Zeile|…Verein=…}}; ohne Tabelle Teilnehmerliste (Zeilen mit Vereinslink)
export function vereineAus(t) {
    // Vorlage bis zur passenden "}}" (verschachtelte Vorlagen wie {{FN|…}} im Vereinsfeld), dann Feld Verein= bis zum nächsten "|" außerhalb [[…]]
    const zeilen = [];
    for (const m of t.matchAll(/\{\{\s*Fußballtabelle\/Zeile/g)) {
        let d = 0, k = m.index;
        for (; k < t.length - 1; k++) { if (t[k] === '{' && t[k + 1] === '{') { d++; k++; } else if (t[k] === '}' && t[k + 1] === '}') { d--; k++; if (!d) break; } }
        const inhalt = t.slice(m.index, k), i = inhalt.search(/\|\s*Verein\s*=/);
        if (i < 0) continue;
        let s = inhalt.slice(i).replace(/^\|\s*Verein\s*=\s*/, ''), out = '', l = 0, v = 0;
        for (let j = 0; j < s.length; j++) { const c = s[j], n = s[j + 1];
            if (c === '[' && n === '[') l++; if (c === ']' && n === ']') l--; if (c === '{' && n === '{') v++; if (c === '}' && n === '}') v--;
            if (c === '|' && !l && !v) break; out += c; }
        zeilen.push(out.trim());
    }
    // Ohne Tabelle (Rheinlandliga/Verbandsliga Südwest 2026/27): Aufzählung im Abschnitt "Mitglieder"/"Teilnehmer" – "** Verein" oder
    // "* der Meister der Bezirksliga Ost 2025/26: SG Malberg"; Kategoriezeilen enden mit ":"
    if (!zeilen.length) {
        const ab = (t.match(/==\s*(?:Mitglieder|Teilnehm|Vereine|Mannschaften)[^=]*==([\s\S]*?)(\n==[^=]|$)/) || [])[1] || '';
        ab.split('\n').filter(z => /^\*/.test(z)).forEach(z => {
            let s = ohneRef(z).replace(/^\*+\s*/, '').replace(/''\(.*?\)''/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
            if (/:\s*$/.test(s)) return;
            if (/:/.test(s.replace(/\[\[[^\]]*\]\]/g, ''))) s = s.slice(s.lastIndexOf(':') + 1).trim();
            if (s) zeilen.push(s);
        });
    }
    const aus = [], gesehen = new Set();
    for (const z of zeilen) { const v = verein(z);
        v.name = v.name.replace(/\}+$/, '').replace(/\s*\((N|A|M|Ab|Auf)\)\s*$/, '').trim();   // "(N)" = Neuling, "}" = Vorlagenrest
        if (/^die |^der |Sieger der|Aufsteiger/.test(v.name)) continue;
        if (v.name && !gesehen.has(v.name)) { gesehen.add(v.name); aus.push(v); } }
    return aus;
}

// ---------- Abgleich ----------
globalThis.window = globalThis;
const lade = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
const lies = f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return {}; } };
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i');
const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'asv', 'bsc', 'bfc', 'fsv', 'kfc', 'sus', 'svg', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv',
    'e', 'v', '1', 'tv', 'tg', 'mtv', 'sportfreunde', 'sf', 'spfr', 'club', 'verein', 'und', 'fussball', 'sportverein', 'tura', 'sportclub', 'spielvereinigung']);
const RES = n => /\s(II|III|U ?2[123])$/.test(String(n).trim()) ? (/III$/.test(n) ? 'III' : 'II') : '';
const kern = n => norm(n).replace(/\s(ii|iii|u ?2[123])$/, '').split(/[^a-z0-9]+/).filter(w => w && !FORM.has(w) && !/^\d+$/.test(w)).sort().join(' ');
const sim = (a, b) => { const A = kern(a).split(' '), B = kern(b).split(' '); const t = A.filter(w => B.includes(w)).length; return t / (A.length + B.length - t || 1); };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    if (process.argv.includes('--titel')) {
        for (const s of SAISONS) for (const [id, stamm] of LIGEN) { const t = await holen(`${stamm} ${s}`); console.log(s, id.padEnd(5), t ? `${String(t.length).padStart(6)}  ${stamm}` : '   FEHLT  ' + stamm); }
        process.exit(0);
    }
    ['game_data.js', 'app/history_data.js', 'app/history_ext.js'].forEach(lade);
    const GD = globalThis.GAME_DATA, HC = globalThis.HISTORIC_CLUBS || {}, HXV = (globalThis.HIST_EXT || {}).vereine || {};
    const GEPFLEGT = { ...lies('hist_schreibweise.json'), ...lies('hist_alias.json'), ...lies('kader_aktuell_korrektur.json') };
    const gdIdx = {}; Object.values(GD.teams).forEach(t => (gdIdx[kern(t.name) + '|' + RES(t.name)] = gdIdx[kern(t.name) + '|' + RES(t.name)] || []).push(t.id));
    const histAlle = { ...HC, ...HXV };
    const voll = n => norm(n).replace(/[^a-z0-9]/g, '');
    const gdVoll = {}; Object.values(GD.teams).forEach(t => { gdVoll[voll(t.name)] = t.id; });
    const zielId = z => typeof z !== 'string' ? null : (GD.teams[z] || histAlle[z]) ? z : (Object.values(GD.teams).find(t => t.name === z) || {}).id || null;
    const zeilen = [], fehlend = {}, quellen = [];
    for (const s of SAISONS) for (const [lid, stamm, abs] of LIGEN) {
        let t = await holen(`${stamm} ${s}`);
        if (!t) { quellen.push(`${s} ${lid} ${GD.leagues[lid].name}: kein Artikel`); continue; }
        if (abs) t = abschnitt(t, abs);
        const V = vereineAus(t);
        quellen.push(`${s} ${lid.padEnd(5)} ${GD.leagues[lid].name.padEnd(34)} ${V.length} Vereine`);
        for (const v of V) {
            // Reihenfolge: Korrektur/gepflegt -> gleicher Name (ohne Satzzeichen) -> Linkziel = Name -> Kern eindeutig -> Kern + gleiche Vereinsform
            const k = kern(v.name) + '|' + RES(v.name);
            const formen = n => new Set(norm(n).split(/[^a-z0-9]+/).filter(w => FORM.has(w) && w.length > 1));
            const passtForm = (a, b) => { const A = formen(a), B = formen(b); return !A.size || !B.size || [...A].some(w => B.has(w)); };
            const kandK = (gdIdx[k] || []).filter(i => passtForm(v.name, GD.teams[i].name) || (v.link && passtForm(v.link, GD.teams[i].name)));
            let id = zielId(GEPFLEGT[v.name]) || gdVoll[voll(v.name)]
                || (v.link && (RES(v.name) ? gdVoll[voll(v.link + ' ' + RES(v.name))] : gdVoll[voll(v.link)] || zielId(GEPFLEGT[v.link])))
                || ((gdIdx[k] || []).length === 1 ? gdIdx[k][0] : null) || (kandK.length === 1 ? kandK[0] : null);
            if (!id && v.link && !RES(v.name)) { const k2 = kern(v.link) + '|'; if ((gdIdx[k2] || []).length === 1) id = gdIdx[k2][0]; }
            if (id && GD.teams[id]) continue;
            const key = id || v.name;
            const f = fehlend[key] = fehlend[key] || { name: v.name, link: v.link, histId: id && histAlle[id] ? id : null, ligen: [] };
            f.ligen.push(`${s} ${GD.leagues[lid].name}`);
            if (!f.histId) {   // Kandidaten: historische IDs und game_data mit ähnlichem Kern
                f.kand = [...Object.entries(histAlle), ...Object.values(GD.teams).map(x => [x.id, x.name])]
                    .filter(([i, n]) => RES(n) === RES(v.name)).map(([i, n]) => ({ i, n, a: Math.max(sim(v.name, n), v.link ? sim(v.link, n) : 0) }))
                    .filter(x => x.a >= 0.5).sort((a, b) => b.a - a.a).slice(0, 3);
            }
        }
    }
    const L = Object.values(fehlend).sort((a, b) => a.ligen[0].localeCompare(b.ligen[0]));
    zeilen.push('=== QUELLEN ===', ...quellen, '', `Ohne Quelle: ${OHNE_QUELLE.map(l => GD.leagues[l].name).join(', ')}`, '',
        `=== FEHLEN IN game_data: ${L.length} (davon ${L.filter(f => f.histId).length} mit historischer ID) ===`);
    L.forEach(f => zeilen.push(`${f.name.padEnd(34)} ${(f.link || '–').padEnd(36)} ${f.histId ? 'HIST ' + f.histId : (f.kand || []).map(c => `? ${c.n} [${c.i}] ${c.a.toFixed(2)}`).join(' / ')}\n      ${f.ligen.join(' · ')}`));
    fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
    fs.writeFileSync(path.join(DIR, '_dryrun', 'kader_aktuell.txt'), zeilen.join('\n') + '\n');
    fs.writeFileSync(path.join(DIR, 'kader_aktuell.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), fehlend: L }, null, 1));
    console.log(quellen.filter(q => !/ \d+ Vereine$/.test(q) || / 0 Vereine$/.test(q)).join('\n'));
    console.log(`Fehlen in game_data: ${L.length} (mit historischer ID ${L.filter(f => f.histId).length}) -> tools/_dryrun/kader_aktuell.txt`);
}
