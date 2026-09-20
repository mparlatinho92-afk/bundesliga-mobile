// Aufstiegsrunden und Relegation aus Wikipedia (nur lesend) -> tools/wiki_aufstiegsrunden.json
//
//   node tools/wiki_aufstiegsrunden.mjs            # parst die drei Sammelartikel, schreibt die JSON
//   node tools/wiki_aufstiegsrunden.mjs --roh      # nur Befund je Saison, schreibt nichts
//
// DREI Sammelartikel decken alles ab (Sondierung 20.09.2026) – Jahresartikel gibt es nicht:
//   "Aufstieg zur Fußball-Bundesliga"      1964/65 – heute
//   "Aufstieg zur 2. Fußball-Bundesliga"   1974/75 – heute
//   "Aufstieg zur 3. Fußball-Liga"         2008/09 – heute
//
// Drei Formate, alle als Vorlage im Wikitext:
//   Gruppenphase  {{Fußballtabelle/Kopf}} + {{Fußballtabelle/Zeile|Rang=|Verein=|S=|U=|N=|ET=|GT=}} + {{Fußballtabelle/Ende}}
//   Duell         {{TwoLegStart}} + {{TwoLegResult|Sieger||Gesamt|Gegner||Hin|Rueck}}
//   Einzelspiel   {{OneLegStart}} + {{OneLegResult|Heim||Ergebnis|Gast}}
// Die Kreuztabelle darunter (reine Wikitabelle) enthaelt die Einzelergebnisse der Gruppenphase.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROH = process.argv.includes('--roh');
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Aufstiegsrunden)';
const CACHE = path.join(os.tmpdir(), 'wiki_aufstieg_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ARTIKEL = [
    { titel: 'Aufstieg zur Fußball-Bundesliga', ziel: '1', name: 'Aufstieg zur Bundesliga' },
    { titel: 'Aufstieg zur 2. Fußball-Bundesliga', ziel: '2', name: 'Aufstieg zur 2. Bundesliga' },
    { titel: 'Aufstieg zur 3. Fußball-Liga', ziel: '3', name: 'Aufstieg zur 3. Liga' },
];

async function wikitext(titel) {
    const datei = path.join(CACHE, titel.replace(/[^A-Za-z0-9]+/g, '_') + '.txt');
    if (fs.existsSync(datei)) return fs.readFileSync(datei, 'utf8');
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', prop: 'revisions',
        rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2', redirects: '1', titles: titel });
    let j;
    for (let i = 0; i < 5 && !j; i++) {
        const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch(e => ({ ok: false, status: e.message }));
        if (r.ok) { j = await r.json(); await sleep(500); }
        else { console.log(`  [${r.status}] warte ${5 * 2 ** i} s`); await sleep(5000 * 2 ** i); }
    }
    const p = j?.query?.pages?.[0];
    const t = p && p.revisions ? p.revisions[0].slots.main.content : '';
    fs.writeFileSync(datei, t);
    return t;
}

// An | trennen, aber nicht innerhalb von [[...]] oder {{...}} (wie tools/wiki_tabellen.mjs)
const splitTop = (s, sep = '|') => {
    const out = []; let d = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
        const two = s.slice(i, i + 2);
        if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; }
        if ((two === '}}' || two === ']]') && d > 0) { d--; cur += two; i++; continue; }
        if (d === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; continue; }
        cur += s[i];
    }
    out.push(cur); return out;
};
// Vorlagenaufrufe {{Name|...}} eines Abschnitts einsammeln (mit Verschachtelung)
function vorlagen(txt, name) {
    const out = [], marke = '{{' + name;
    let i = 0;
    while ((i = txt.indexOf(marke, i)) !== -1) {
        const nach = txt[i + marke.length];
        if (nach !== '|' && nach !== '}' && nach !== ' ') { i += marke.length; continue; }
        let d = 0, j = i;
        for (; j < txt.length; j++) {
            if (txt.startsWith('{{', j)) { d++; j++; continue; }
            if (txt.startsWith('}}', j)) { d--; j++; if (!d) break; continue; }
        }
        out.push(txt.slice(i + 2, j - 1));
        i = j;
    }
    return out;
}
const params = roh => {
    const teile = splitTop(roh), named = {}, pos = [];
    teile.slice(1).forEach(t => {
        const m = t.match(/^\s*([A-Za-z0-9]+)\s*=([\s\S]*)$/);
        if (m) named[m[1]] = m[2].trim(); else pos.push(t.trim());
    });
    return { named, pos };
};
// [[Link|Anzeige]] / [[Link]] / '''fett''' / Fussnoten weg
const klar = s => String(s || '').replace(/\{\{FNZ?\|[^}]*\}\}/g, '').replace(/\{\{[A-Za-z]*$/, '').replace(/<ref[\s\S]*?(\/>|<\/ref>)/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '').replace(/\{\{0\|([^}]*)\}\}/g, '$1').replace(/\{\{0\}\}/g, '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<\/?small>/gi, '').replace(/&nbsp;/g, ' ')
    .replace(/\(a\)/g, '').replace(/\s+/g, ' ').trim();   // (a) = Auswaertstorregel, keine Ergebnisangabe
const zahl = s => { const n = parseInt(String(s).replace(/[^\d-]/g, '')); return Number.isFinite(n) ? n : null; };
// In der Vorlage bleibt ein Feld mit dem Wert 0 oft leer – als null gelesen stuende spaeter "4-null-2" in der Tabelle
const zahl0 = s => { const n = zahl(s); return n === null ? 0 : n; };

// ---------- ein Saison-Abschnitt ----------
function abschnittLesen(txt, ziel) {
    const block = { gruppen: [], duelle: [], gruppenspiele: [], spiele: [], direkt: [], fn: [] };
    // Gruppentabellen: jede Kopf..Ende-Folge ist eine Gruppe
    const stuecke = txt.split(/\{\{\s*Fußballtabelle\/Kopf/);
    stuecke.slice(1).forEach(st => {
        const ende = st.indexOf('{{Fußballtabelle/Ende');
        const teil = ende === -1 ? st : st.slice(0, ende);
        const rows = vorlagen('{{Fußballtabelle/Zeile' + teil.split('{{Fußballtabelle/Zeile').slice(1).map(x => x).join('{{Fußballtabelle/Zeile'), 'Fußballtabelle/Zeile')
            .map(r => params(r).named)
            .filter(p => p.Verein)
            .map(p => ({ rank: zahl(p.Rang), name: klar(p.Verein), s: zahl0(p.S), u: zahl0(p.U), n: zahl0(p.N),
                gf: zahl0(p.ET), ga: zahl0(p.GT), auf: /ccffcc/i.test(p.Farbe || '') }));
        if (rows.length) block.gruppen.push({ rows });
    });
    // Duelle (Hin/Rueck)
    vorlagen(txt, 'TwoLegResult').forEach(r => {
        const { pos } = params(r);
        const [h, , ges, a, , hin, rueck] = pos;
        if (!h || !a) return;
        const e = { h: klar(h), a: klar(a), ges: klar(ges), hin: klar(hin), rueck: klar(rueck), siegerIstHeim: /'''/.test(h) };
        // Ein Gesamtergebnis hat nur das K.-o.-Duell. In einer Gruppenphase steht dort nichts – dann sind es die
        // Spiele der Gruppe, und die sind KEIN Duell mit Sieger (sonst zaehlt die Bilanz sechs "Relegationen").
        (e.ges && /\d/.test(e.ges) ? block.duelle : block.gruppenspiele).push(e);
    });
    // Einzelspiele
    vorlagen(txt, 'OneLegResult').forEach(r => {
        const { pos } = params(r);
        const [h, , erg, a] = pos;
        if (!h || !a) return;
        block.spiele.push({ h: klar(h), a: klar(a), erg: klar(erg), siegerIstHeim: /'''/.test(h) });
    });
    // Direkte Aufsteiger stehen in ZWEI Formen in denselben Artikeln:
    //  (a) Zelle gruen hinterlegt ("style=background-color:#CCFFCC")
    //  (b) schlichte Wikitabelle, Verein fett, daneben die Herkunft ("Meister Regionalliga Nord")
    //      – so die 3. Liga 2009-2012, die sonst voellig leer blieb
    const direkt = new Map();
    [...txt.matchAll(/\|\s*style="background-color:#CCFFCC"\s*\|\s*([^|\n]+)/gi)].forEach(m => {
        const n = klar(m[1]); if (n) direkt.set(n, direkt.get(n) || '');
    });
    [...txt.matchAll(/^\|\s*(?:\[\[Datei:[^\]]*\]\])?\s*(?:&nbsp;)?\s*'''\s*(\[\[[^\]]+\]\]|[^'\n|]+?)\s*'''\s*\|\|\s*([^\n]*)$/gm)].forEach(m => {
        const n = klar(m[1]); if (n) direkt.set(n, klar(m[2]));
    });
    block.direkt = [...direkt.keys()];
    block.direktHer = Object.fromEntries(direkt);
    // Fussnoten {{FNZ|n|gruppe=..|TEXT}} tragen die BEGRUENDUNG, wenn ein Meister nicht aufstieg
    // ("hatte keine Lizenz beantragt", "als zweite Mannschaft nicht aufstiegsberechtigt").
    // Ohne sie steht in der Siegerliste nur eine Luecke, wo eine Erklaerung hingehoert.
    block.fn = vorlagen(txt, 'FNZ').map(r => {
        const teile = splitTop(r);
        const letzte = teile[teile.length - 1] || '';
        return klar(letzte.replace(/<ref[\s\S]*$/, ''));
    }).filter(t => t && t.length > 12);
    return block;
}

// ---------- Hauptlauf ----------
const alles = [];
for (const art of ARTIKEL) {
    const txt = await wikitext(art.titel);
    if (!txt) { console.log('LEER: ' + art.titel); continue; }
    // Saison-Abschnitte. DREI Fallen, alle gemessen:
    //  - nur Ebene 3/4 (===): die ==-Kapitel ("Aufstiegsrunden zur Bundesliga (Regionalliga 1963/64–1973/74)")
    //    tragen selbst eine Jahreszahl und waeren sonst 22 leere Schein-Saisons
    //  - {{Anker|...}} steht VOR dem Text ("Aufstieg zur 2. Bundesliga 2010/11") und verdeckte diese eine Saison
    //  - der Artikel zur 3. Liga ueberschreibt nur mit dem Aufstiegsjahr ("2013")
    const alleH = [...txt.matchAll(/^(={3,4})\s*(.+?)\s*\1\s*$/gm)];
    const marken = [];
    alleH.forEach(m => {
        const titel = m[2].replace(/\{\{\s*Anker\s*\|[^}]*\}\}/gi, '').trim();
        let y = null;
        const mj = titel.match(/(\d{4})\/(\d{2,4})/);
        if (mj) y = parseInt(mj[1]) - 1;                    // "Aufstieg zur Bundesliga 1967/68" = Ergebnis der Saison 1966/67
        else if (/^\d{4}$/.test(titel)) y = parseInt(titel) - 1;   // "2013" = Aufstiegsjahr -> Saison 2012/13
        if (y !== null) marken.push({ index: m.index, laenge: m[0].length, titel, y });
    });
    for (let i = 0; i < marken.length; i++) {
        const m = marken[i];
        const bis = i + 1 < marken.length ? marken[i + 1].index : txt.length;
        const b = abschnittLesen(txt.slice(m.index + m.laenge, bis), art.ziel);
        alles.push(Object.assign({ artikel: art.titel, ziel: art.ziel, ueberschrift: m.titel, y: m.y }, b));
    }
}

console.log('=== BEFUND JE SAISON-ABSCHNITT ===');
console.log('Ziel  Saison   Gruppen(Vereine)     Duelle  GrSpiel Einzelspiele  Direkt  Ueberschrift');
for (const a of alles) {
    const g = a.gruppen.map(x => x.rows.length).join('+') || '-';
    console.log(a.ziel.padEnd(6) + String(a.y).padEnd(9) + g.padEnd(21)
        + String(a.duelle.length).padEnd(8) + String(a.gruppenspiele.length).padEnd(8)
        + String(a.spiele.length).padEnd(14) + String(a.direkt.length).padEnd(8) + a.ueberschrift);
}
const leer = alles.filter(a => !a.gruppen.length && !a.duelle.length && !a.gruppenspiele.length && !a.spiele.length && !a.direkt.length);
console.log('Fussnoten (Begruendungen): ' + alles.reduce((a, x) => a + (x.fn || []).length, 0));
console.log('\nAbschnitte: ' + alles.length + ' | ohne jeden Inhalt: ' + leer.length
    + (leer.length ? ' -> ' + leer.map(a => a.ziel + ' ' + a.y).join(', ') : ''));
const namen = new Set();
alles.forEach(a => { a.gruppen.forEach(g => g.rows.forEach(r => namen.add(r.name)));
    [...a.duelle, ...a.gruppenspiele].forEach(d => { namen.add(d.h); namen.add(d.a); });
    a.spiele.forEach(s => { namen.add(s.h); namen.add(s.a); });
    a.direkt.forEach(n => namen.add(n)); });
console.log('verschiedene Vereinsnamen: ' + namen.size);

if (!ROH) {
    fs.writeFileSync(path.join(DIR, 'wiki_aufstiegsrunden.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), abschnitte: alles }, null, 1));
    console.log('\n-> tools/wiki_aufstiegsrunden.json');
}
