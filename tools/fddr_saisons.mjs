// fussball-ddr.de: Saisonseiten DDR-Oberliga, DDR-Liga und Bezirksligen 1963/64–1990/91 holen und zerlegen.
// Je Seite: Abschlusstabellen (Name, Sp, S, U, N, Tore) + die Vermerke unter der Tabelle (Umbenennungen, Fusionen,
// Neugruendungen). Zuordnung zu unseren IDs macht tools/fddr_umbenennungen.mjs.
//   node tools/fddr_saisons.mjs        -> tools/_dryrun/fddr_saisons.json   (Cache: %TEMP%/fddr_cache)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(os.tmpdir(), 'fddr_cache', 'seiten');
fs.mkdirSync(CACHE, { recursive: true });
const BASIS = 'https://www.fussball-ddr.de';
const UA = 'Mozilla/5.0 (BundesligaSim-Recherche; lokales Analyse-Skript)';
const warte = ms => new Promise(r => setTimeout(r, ms));

async function hole(url) {
    const datei = path.join(CACHE, url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^a-z0-9]+/gi, '_') + '.html');
    if (fs.existsSync(datei)) return fs.readFileSync(datei, 'utf8');
    await warte(400);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const t = r.ok ? await r.text() : '';
    if (!r.ok || /<title>Page Not Found/.test(t)) { console.log(`  fehlt: ${url} (${r.status})`); return ''; }
    fs.writeFileSync(datei, t);
    return t;
}

const JAHRE = []; for (let y = 1963; y <= 1990; y++) JAHRE.push(y);
const sj = y => `${y}/${String(y + 1).slice(2)}`;
const seiten = [];
for (const y of JAHRE) seiten.push({ lid: 'ddr1', y: sj(y), url: `${BASIS}/oberliga/oberliga-${y}-${y + 1}/` });
for (const y of JAHRE) seiten.push({ lid: 'h2d-ddrliga-ddrliga', y: sj(y), url: y === 1990 ? `${BASIS}/ddr-liga/ddr-liga-nordost-liga-1990-1991/` : `${BASIS}/ddr-liga/ddr-liga-${y}-${y + 1}/` });
const BEZIRKE = { berlin: 'bezirk-berlin/', cottbus: 'bezirksliga-cottbus/', dresden: 'bezirksliga-dresden/', erfurt: 'bezirksliga-erfurt/',
    frankfurtoder: 'bezirksliga-frankfurt-oder/', gera: 'bezirksliga-gera/', halle: 'bezirksliga-halle/', karlmarxstadt: 'bezirksliga-karl-marx-stadt/',
    leipzig: 'bezirksliga-leipzig/', magdeburg: 'bezirksliga-magdeburg/', neubrandenburg: 'bezirksliga-neubrandenburg/', potsdam: 'bezirksliga-potsdam/',
    rostock: 'bezirksliga-rostock/', schwerin: 'bezirksliga-schwerin/', suhl: 'bezirksliga-suhl/' };
for (const [bz, idxUrl] of Object.entries(BEZIRKE)) {
    const h = await hole(BASIS + '/' + idxUrl);
    const gefunden = {};
    // Berlin: Stadtliga bis 1968/69, Landesliga 1990/91 ("1990-91")
    for (const m of h.matchAll(/href="((?:https:\/\/www\.fussball-ddr\.de)?\/[^"]*(?:bezirksliga|stadtliga|landesliga)-[a-z-]+-(\d{4})-(\d{2}|\d{4})\/)"/g)) {
        const y = +m[2]; if (y < 1963 || y > 1990 || +m[3] % 100 !== (y + 1) % 100) continue;
        gefunden[y] = m[1].startsWith('http') ? m[1] : BASIS + m[1];
    }
    const fehl = JAHRE.filter(y => !gefunden[y]);
    if (fehl.length) console.log(`  ${bz}: keine Saisonseite fuer ${fehl.join(',')}`);
    for (const [y, url] of Object.entries(gefunden)) seiten.push({ lid: `h3d-${bz}-bezirksliga`, y: sj(+y), url });
}
console.log(`${seiten.length} Saisonseiten`);

const ent = s => s.replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&#8220;|&#8222;|&#8221;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#0?38;/g, '&').replace(/&quot;/g, '"');
const text = s => ent(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const STICH = /umbenenn|umbenannt|fusion|neugr[uü]nd|gr[uü]ndet|zusammenschlu|zusammengeschlossen|anschlu[sß]|[uü]bernahme|[uü]bernimmt|aufl[oö]s|tr[aä]gerbetrieb|namens[aä]nderung|r[uü]ckbenenn|ausgegliedert|delegiert|wechsel/i;

const aus = [];
let i = 0;
for (const s of seiten) {
    const h = await hole(s.url);
    if (++i % 50 === 0) console.log(`  ${i}/${seiten.length}`);
    if (!h) continue;
    const tabellen = [];
    for (const tm of h.matchAll(/<table[^>]*class="dalt-table"[\s\S]*?<\/table>/g)) {
        const t = tm[0];
        const kopf = [...(t.match(/<thead>[\s\S]*?<\/thead>/) || [''])[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => text(m[1]));
        const iSp = kopf.indexOf('Sp'), iS = kopf.indexOf('S'), iU = kopf.indexOf('U'), iN = kopf.indexOf('N'), iT = kopf.indexOf('Tore');
        if (iSp < 0 || iS < 0 || iT < 0) continue;
        const rows = [];
        for (const rm of t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
            const z = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => text(m[1]));
            if (z.length < kopf.length - 1) continue;
            const tore = (z[iT] || '').match(/^(\d+)\s*:\s*(\d+)$/);
            if (!tore || !/^\d+$/.test(z[iSp])) continue;
            rows.push([z[iSp - 1] || z[2], +z[iSp], +z[iS], +z[iU], +z[iN], +tore[1], +tore[2]]);
        }
        // Vermerke: letzte Zelle mit <br>-Zeilen unter der Tabelle
        const notiz = [];
        for (const cm of t.matchAll(/<td[^>]*colspan[^>]*>([\s\S]*?)<\/td>/g)) {
            // nach der Ueberschrift "Umbenennungen" zaehlt jede Zeile (auch "X in Y" ohne Stichwort), bis zur naechsten Ueberschrift
            let kopfU = false;
            for (const zeile of cm[1].split(/<br\s*\/?>/)) {
                const z = text(zeile).replace(/^[-–•*]+\s*/, '');
                if (/<strong>\s*[A-ZÄÖÜa-zäöü][^<:]*:?\s*<\/strong>/.test(zeile) && !/^\d/.test(z)) kopfU = /umbenennung/i.test(z);
                if (/^Umbenennungen/i.test(z)) { kopfU = true; continue; }
                if (z && (STICH.test(z) || kopfU)) notiz.push(z);
            }
        }
        if (rows.length || notiz.length) tabellen.push({ titel: kopf[2] || '', rows, notiz });
    }
    // Vermerke ausserhalb der Tabellen (Fliesstext der Seite)
    const frei = [];
    const inhalt = (h.match(/<div class="entry-content[\s\S]*?(?=<footer|<\/article>)/) || [''])[0].replace(/<table[\s\S]*?<\/table>/g, '');
    for (const zeile of inhalt.split(/<br\s*\/?>|<\/p>|<\/li>/)) { const z = text(zeile).replace(/^[-–•]\s*/, ''); if (z && z.length < 400 && STICH.test(z)) frei.push(z); }
    aus.push({ ...s, tabellen, frei });
}
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
fs.writeFileSync(path.join(DIR, '_dryrun/fddr_saisons.json'), JSON.stringify(aus));
const nT = aus.reduce((a, s) => a + s.tabellen.length, 0), nZ = aus.reduce((a, s) => a + s.tabellen.reduce((b, t) => b + t.rows.length, 0), 0);
const nV = aus.reduce((a, s) => a + s.frei.length + s.tabellen.reduce((b, t) => b + t.notiz.length, 0), 0);
console.log(`${aus.length} Seiten, ${nT} Tabellen, ${nZ} Zeilen, ${nV} Vermerke -> tools/_dryrun/fddr_saisons.json`);
