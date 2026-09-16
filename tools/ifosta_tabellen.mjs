// ifosta.de als S/U/N-Quelle fuer die Gruppe-2-Saisons (Ebene 2-3 ohne S/U/N, s. docs/HISTORIE_SUN_PROTOKOLL.md)
//
//   node tools/ifosta_tabellen.mjs            holt (mit Zwischenspeicher) und liest aus
//   node tools/ifosta_tabellen.mjs --nur="Hessen;1969"   nur passende Liga-Saisons
//   node tools/ifosta_tabellen.mjs --alle     auch Gruppe-1-Saisons derselben Ligen (fuer die Gegenprobe gegen bekannte S/U/N)
//
// Die ifosta-Seiten sind Excel-Web-Exporte: <Seite>.html ist ein Frameset, die Blaetter liegen in <Seite>-Dateien/sheet00N.html
// (windows-1252). Die Abschlusstabelle steht im Blatt, dessen Kopfzeile "Mannschaft | ... | Sp. | g. | u. | v. | Tore" hat.
// Ist sie ohne g/u/v (Landesliga Nordbaden 1945/46), rechnen wir S/U/N aus der Kreuztabelle (Heim x Auswaerts) nach.
//
// Ausgabe: <tmp>/ifosta_cache/_tabellen.json  (Liga-Saison -> Zeilen {platz, verein, sp, s, u, n, gf, ga, pkt, quelle})
// Nur lesend, 1 Abruf je Sekunde, jede Datei wird nur einmal geholt.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(os.tmpdir(), 'ifosta_cache');
fs.mkdirSync(CACHE, { recursive: true });
const ALLE = process.argv.includes('--alle');
const BASE = 'https://ifosta.de/Sport/Fussball/Maenner/32-DeutscheMeisterschaften/';
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; einmalige Abfrage je Seite)';
const dec = new TextDecoder('windows-1252');
let abrufe = 0;
const pause = ms => new Promise(r => setTimeout(r, ms));

async function hole(url) {
    const f = path.join(CACHE, url.replace(/^https:\/\/ifosta\.de\//, '').replace(/[^A-Za-z0-9.+-]+/g, '_'));
    if (fs.existsSync(f)) { const b = fs.readFileSync(f); return b.length ? dec.decode(b) : null; }
    await pause(1000); abrufe++;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) { fs.writeFileSync(f, ''); return null; }
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(f, b);
    return dec.decode(b);
}

// Liga (f-archiv-Name) -> ifosta-Ordner + Dateikuerzel; mehrere Kuerzel = mehrere Staffeln
const KARTE = [
    [/^Amateurliga Berlin$/, y => y >= 1974 ? ['AmateurOberliga', ['AOL-Berlin']] : ['Amateurliga', ['AL-Berlin']]],
    [/^Oberliga Berlin$/, () => ['AmateurOberliga', ['AOL-Berlin']]],
    [/^Amateurliga Bayern$/, () => ['Amateurliga', ['AL-Bayern']]],
    [/^Amateurliga Hessen$/, () => ['Amateurliga', ['AL-Hessen']]],
    [/^Amateurliga Niedersachsen$/, () => ['Amateurliga', ['AL-Niedersachsen']]],
    [/^Amateuroberliga Niedersachsen$/, () => ['Amateurliga', ['AL-Niedersachsen-Ost', 'AL-Niedersachsen-West']]],
    [/^Amateurliga Nordbaden$/, () => ['Amateurliga', ['AL-Nordbaden']]],
    [/^Amateurliga Nordwürttemberg$/, () => ['Amateurliga', ['AL-Nordwuerttemberg']]],
    [/^Amateurliga Rheinland$/, () => ['Amateurliga', ['AL-Rheinland']]],
    [/^Amateurliga Saarland$/, () => ['Amateurliga', ['AL-Saarland']]],
    [/^(Amateurliga|Landesliga) Schleswig-Holstein$/, () => ['Amateurliga', ['AL-Schleswig-Holstein']]],
    [/^Amateurliga Schwarzwald-Bodensee$/, () => ['Amateurliga', ['AL-Schwarzwald+Bodensee']]],
    [/^(Amateurliga|Verbandsliga) Südbaden$/, () => ['Amateurliga', ['AL-Suedbaden']]],
    [/^Amateurliga Südwest$/, () => ['Amateurliga', ['AL-Suedwest']]],
    [/^Verbandsliga Mittelrhein$/, () => ['Amateurliga', ['AL-Mittelrhein']]],
    [/^Verbandsliga Niederrhein$/, () => ['Amateurliga', ['AL-Niederrhein']]],
    [/^Verbandsliga Westfalen$/, () => ['Amateurliga', ['AL-Westfalen1', 'AL-Westfalen2']]],
    [/^Oberliga Baden-Württemberg$/, () => ['AmateurOberliga', ['AOL-Baden-Wuerttemberg']]],
    [/^Oberliga Bayern$/, () => ['AmateurOberliga', ['AOL-Bayern']]],
    [/^Oberliga Hessen$/, () => ['AmateurOberliga', ['AOL-Hessen']]],
    [/^Oberliga Nord$/, () => ['AmateurOberliga', ['AOL-Nord']]],
    [/^Oberliga Nordost$/, () => ['AmateurOberliga', ['AOL-Nordost-Nord', 'AOL-Nordost-Mitte', 'AOL-Nordost-Sued']]],
    [/^Oberliga Südwest$/, () => ['AmateurOberliga', ['AOL-Suedwest']]],
    [/^Regionalliga Süd$/, y => [y >= 2000 ? 'Regionalliga(3)' : 'Regionalliga(2)', ['RL-Sued']]],
    [/^DDR-Liga$/, y => ['DDRLiga', y >= 1984 ? ['Liga-DDR-SA', 'Liga-DDR-SB'] : y >= 1971 ? ['Liga-DDR-SA', 'Liga-DDR-SB', 'Liga-DDR-SC', 'Liga-DDR-SD', 'Liga-DDR-SE'] : ['Liga-DDR-Nord', 'Liga-DDR-Sued']]],
];

const zelle = c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const zeilenVon = h => [...h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => zelle(c[1])));
const zahl = s => /^[+-]?\d+$/.test(s) ? +s : null;

// Abschlusstabelle: Kopfzeile mit "Mannschaft" und "Sp.", danach Zeilen "N." | Name | ... | sp g u v gf ":" ga diff pkt ["-" pktMinus]
function abschluss(rows) {
    const hi = rows.findIndex(r => r.includes('Mannschaft') && r.some(c => /^Sp\.?$/.test(c)));
    if (hi < 0) return null;
    const mitGuv = rows[hi].some(c => /^g\.?$/.test(c)) && rows[hi].some(c => /^u\.?$/.test(c));
    const out = [];
    for (const r of rows.slice(hi + 1)) {
        const platz = (r[0] || '').match(/^(\d+)\.$/); if (!platz) { if (out.length) break; continue; }
        const c = r.filter(x => x !== '');
        const i = c.indexOf(':'); if (i < 0) continue;
        const verein = c[1];
        const gf = zahl(c[i - 1]), ga = zahl(c[i + 1]);
        let pkt = zahl(c[i + 3]), pktMinus = c[i + 4] === '-' ? zahl(c[i + 5]) : null;
        let sp = null, s = null, u = null, n = null;
        const vor = c.slice(2, i - 1).map(zahl).filter(v => v != null); // Zahlen zwischen Name und Toren (Marker wie (N) sind keine Zahlen)
        if (mitGuv && vor.length >= 4) { [sp, s, u, n] = vor.slice(-4); if (s + u + n !== sp) s = u = n = null; }
        else if (vor.length) sp = vor[vor.length - 1];
        out.push({ platz: +platz[1], verein, sp, s, u, n, gf, ga, pkt, pktMinus, quelle: s != null ? 'tabelle' : null });
    }
    return out.length ? out : null;
}

// Kreuztabelle: Kopfzeile "Heimmannschaft vs. Auswaertsmannschaft", jede Zeile Heimverein + Ergebnisse "a : b" in Spaltenpaaren
function kreuz(rows) {
    const hi = rows.findIndex(r => /Heimmannschaft/.test(r[0] || ''));
    if (hi < 0) return null;
    const namen = rows[hi].slice(1).filter(Boolean);
    const bil = {}; namen.forEach(v => bil[v] = { s: 0, u: 0, n: 0, gf: 0, ga: 0 });
    let spiele = 0;
    for (const r of rows.slice(hi + 1, hi + 1 + namen.length)) {
        const heim = r[0]; if (!bil[heim]) return null;
        // Ergebnisse als Tripel Zahl ":" Zahl in Zellenfolge; "-" = Diagonale
        const c = r.slice(1);
        for (let k = 0; k + 2 < c.length; k++) {
            if (c[k + 1] !== ':' || zahl(c[k]) == null || zahl(c[k + 2]) == null) continue;
            // Gegner = Spalte aus der Position: jede Mannschaft belegt drei Zellen
            const gi = Math.floor(k / 3); const gast = namen[gi]; if (!gast || gast === heim) continue;
            const a = +c[k], b = +c[k + 2]; spiele++;
            const H = bil[heim], G = bil[gast];
            H.gf += a; H.ga += b; G.gf += b; G.ga += a;
            if (a > b) { H.s++; G.n++; } else if (a < b) { H.n++; G.s++; } else { H.u++; G.u++; }
            k += 2;
        }
    }
    return spiele ? bil : null;
}

const saison = y => `${y}/${String(y + 1).slice(-2)}`;
const PROT = fs.readFileSync(path.join(ROOT, 'tools/_dryrun/sun_protokoll.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map(l => l.split(';'));
const GI = PROT.shift().indexOf('gruppe'); // Spalte nach Namen: der Dry-Run hat die Spalten schon einmal erweitert
const NUR = (process.argv.find(a => a.startsWith('--nur=')) || '').slice(6); // z. B. --nur="Hessen;1969"
const ziele = PROT.filter(c => (ALLE || c[GI] === '2') && KARTE.some(([re]) => re.test(c[2])) && (!NUR || NUR.split(';').every(w => c.join(' ').includes(w))));
// frueher geholte Liga-Saisons behalten: der Dry-Run verkleinert Gruppe 2 danach, ein neuer Lauf saehe sie sonst nicht mehr
const AUSGABE = path.join(CACHE, '_tabellen.json');
const ergebnis = fs.existsSync(AUSGABE) ? JSON.parse(fs.readFileSync(AUSGABE, 'utf8')) : {}, bericht = { seiten: 0, ohneSeite: [], mitSun: 0, ausKreuz: 0, ohneSun: 0 };
for (const c of ziele) {
    const [gebiet, ebene, liga, sais] = c, y = +sais.slice(0, 4);
    const [ordner, kuerzel] = KARTE.find(([re]) => re.test(liga))[1](y);
    for (const k of kuerzel) {
        const datei = `${k}-Fussball-${y}${y + 1}`;
        const url = BASE + ordner + '/' + encodeURIComponent(datei).replace(/%2B/g, '+') + '.html';
        const haupt = await hole(url);
        if (!haupt) { bericht.ohneSeite.push(`${liga} ${sais} (${k})`); continue; }
        bericht.seiten++;
        const blaetter = [...haupt.matchAll(/id="shLink"\s+href="([^"]+)"/g)].map(m => new URL(m[1], url).href);
        let tab = null, kt = null;
        // Blattnamen stehen im Frameset (c_rgszSh[i]); Seiten mit Spieltagsblaettern (DDR-Liga) haben die Tabelle erst hinten
        const namen = []; for (const m of haupt.matchAll(/c_rgszSh\[(\d+)\]\s*=\s*"([^"]*)"/g)) namen[+m[1]] = m[2];
        const gesucht = blaetter.filter((b, i) => /^(Tabellenstand|Abschlusstabelle|Kreuztabelle)$/.test(namen[i] || ''));
        for (const b of gesucht.length ? gesucht : blaetter.slice(0, 4)) {
            const h = await hole(b); if (!h) continue;
            const rows = zeilenVon(h);
            tab = tab || abschluss(rows);
            kt = kt || kreuz(rows);
            if (tab && kt) break;
        }
        if (!tab) { bericht.ohneSeite.push(`${liga} ${sais} (${k}: keine Abschlusstabelle)`); continue; }
        for (const z of tab) {
            const b = kt && kt[z.verein];
            if (z.s == null && b && b.s + b.u + b.n === z.sp && b.gf === z.gf && b.ga === z.ga) { z.s = b.s; z.u = b.u; z.n = b.n; z.quelle = 'kreuztabelle'; }
            // Gegenprobe Tabelle <-> Kreuztabelle, wo beides da ist
            if (z.quelle === 'tabelle' && b) { z.kreuzGleich = b.s === z.s && b.u === z.u && b.n === z.n; }
            if (z.quelle === 'tabelle') bericht.mitSun++; else if (z.quelle === 'kreuztabelle') bericht.ausKreuz++; else bericht.ohneSun++;
        }
        const ek = `${gebiet}|${ebene}|${liga}|${y}`;
        ergebnis[ek] = (ergebnis[ek] || []).filter(t => t.datei !== datei).concat([{ datei, zeilen: tab }]);
    }
}
fs.writeFileSync(AUSGABE, JSON.stringify(ergebnis));
const kg = ziele.flatMap(c => ergebnis[`${c[0]}|${c[1]}|${c[2]}|${+c[3].slice(0, 4)}`] || []).flatMap(t => t.zeilen).filter(z => z.kreuzGleich != null);
console.log(`Liga-Saisons ${ziele.length} | Seiten ${bericht.seiten} | neue Abrufe ${abrufe}`);
console.log(`Zeilen: S/U/N aus Abschlusstabelle ${bericht.mitSun} | aus Kreuztabelle ${bericht.ausKreuz} | ohne ${bericht.ohneSun}`);
console.log(`Gegenprobe Tabelle = Kreuztabelle: ${kg.filter(z => z.kreuzGleich).length} von ${kg.length}`);
console.log(`Ohne Seite/Tabelle (${bericht.ohneSeite.length}): ${bericht.ohneSeite.slice(0, 30).join('; ')}`);
console.log(`-> ${path.join(CACHE, '_tabellen.json')}`);
