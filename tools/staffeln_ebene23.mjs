// Staffeln und Vereine der Ebenen 2 und 3 seit 1963/64 aus Wikipedia (nur lesend), BRD und DDR.
// Grundlage fuer tools/historie_groesse.cjs --staffeln (Datenwachstum bei erweiterter Historie).
//
//   node tools/staffeln_ebene23.mjs            # holt alles (~2-4 min, ca. 150 Anfragen), schreibt tools/staffeln_ebene23.json
//
// Quelle je Saison: Kategorie:Fußballsaison YYYY/YY -> Titel exakt uebernehmen (nicht raten: "1. Amateurliga Bayern").
// Gezaehlt werden Zeilen der Vorlage {{Fußballtabelle/Zeile}} in ABSCHLUSStabellen; Aufstiegs-, Entscheidungs-,
// Heim-/Auswaerts- und Kreuztabellen zaehlen nicht. Jede Tabelle = eine Staffel.
// LUECKEN: Fehlt eine Liga in einer Saison, taucht aber in derselben Epoche sonst auf, wird sie mit dem Median
// ihrer bekannten Groessen geschaetzt und als "geschaetzt" ausgewiesen. Die DDR-Bezirke sind fest (15).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Staffelzaehlung Ebene 2-3)';
const API = 'https://de.wikipedia.org/w/api.php';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;

// Zwischenspeicher im System-Temp (nicht in tools/): ein abgebrochener Lauf holt beim Neustart nichts doppelt.
import os from 'node:os';
import crypto from 'node:crypto';
const CACHE = path.join(os.tmpdir(), 'staffeln_ebene23_cache');
fs.mkdirSync(CACHE, { recursive: true });
async function api(params) {
    const url = API + '?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2', maxlag: '5' }, params));
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (fs.existsSync(datei)) return JSON.parse(fs.readFileSync(datei, 'utf8'));
    for (let i = 0; i < 7; i++) {
        let r;
        try { r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }); } catch (e) { r = { ok: false, status: 'Netz: ' + e.message, headers: new Map() }; }
        if (r.ok) {
            const j = await r.json();
            if (!j.error) { fs.writeFileSync(datei, JSON.stringify(j)); await sleep(500); return j; }
            r = { status: 'API ' + j.error.code, headers: new Map() };
        }
        const retry = +(r.headers.get && r.headers.get('retry-after')) || 0;
        const warte = Math.max(retry * 1000, 5000 * 2 ** i);
        console.log(`\n  [${r.status}] warte ${Math.round(warte / 1000)} s (Versuch ${i + 1}/7)`);
        await sleep(warte);
    }
    throw new Error('API-Fehler ' + url);
}

async function kategorie(y) {
    const out = []; let cont = {};
    do {
        const j = await api(Object.assign({ action: 'query', list: 'categorymembers', cmtitle: 'Kategorie:Fußballsaison ' + saison(y), cmlimit: '500', cmnamespace: '0' }, cont));
        (j.query?.categorymembers || []).forEach(m => out.push(m.title));
        cont = j.continue || null;
    } while (cont);
    return out;
}

const BEZIRKE = 'Berlin|Cottbus|Dresden|Erfurt|Frankfurt/Oder|Gera|Halle|Karl-Marx-Stadt|Leipzig|Magdeburg|Neubrandenburg|Potsdam|Rostock|Schwerin|Suhl';
// -> [Gebiet, Ebene, Epoche] oder null. Epoche = Zeitraum mit gleicher Ligastruktur (fuer das Lueckenfuellen).
function klasse(titel, y) {
    if (/Frauen|Jugend|Junior|Pokal|Halle[n ]|Schüler|Reserve/.test(titel.replace(/Bezirksliga Halle/, ''))) return null;
    const s = titel.replace(/ \d{4}\/\d{2,4}.*$/, '').trim();
    if (y <= 1990) {
        if (s === 'DDR-Fußball-Liga') return ['DDR', 2, '1963-1990'];
        if (new RegExp('^Fußball-Bezirksliga (' + BEZIRKE + ')$').test(s)) return ['DDR', 3, '1963-1990'];
    }
    if (y <= 1973) {
        if (s === 'Fußball-Regionalliga') return ['BRD', 2, '1963-1973'];
        if (/^(1\. )?(Fußball-)?Amateurliga |^(Fußball-)?Hessenliga$|^Fußball-Verbandsliga (Westfalen|Mittelrhein|Niederrhein)$|^(Fußball-)?Landesliga (Hamburg|Niedersachsen)$/.test(s)) return ['BRD', 3, '1963-1973'];
    } else if (y <= 1977) {
        if (/^Fußball-Oberliga (Nord|Berlin)$/.test(s)) return ['BRD', 3, '1974-1977'];
        if (/^(1\. )?(Fußball-)?Amateurliga (Bayern|Nordbaden|Nordwürttemberg|Schwarzwald-Bodensee|Südbaden|Südwest|Rheinland|Saarland|Württemberg)$|^(Fußball-)?Hessenliga$|^Fußball-Verbandsliga (Westfalen|Mittelrhein|Niederrhein)$/.test(s)) return ['BRD', 3, '1974-1977'];
    } else if (y <= 1993) {
        const ep = y <= 1990 ? '1978-1990' : '1991-1993';
        if (/^Fußball-Oberliga (Nord|Berlin|Nordrhein|Westfalen|Hessen|Baden-Württemberg|Südwest|Nordost)$|^Fußball-Bayernliga$|^(Amateur|NOFV)-Oberliga/.test(s)) return ['BRD', 3, ep];
    } else if (y <= 2007) {
        if (s === 'Fußball-Regionalliga') return ['BRD', 3, y <= 1999 ? '1994-1999' : '2000-2007'];
    } else {
        if (s === '3. Fußball-Liga') return ['BRD', 3, '2008-2024'];
    }
    return null;
}

const AUSSCHLUSS = /Aufstieg|Abstieg|Relegation|Entscheidung|Qualifikation|Endrunde|Meisterschaft|Heim|Auswärts|Hinrunde|Rückrunde|Kreuz|Torschütz|Zuschauer|Halle|Vorrunde|Finalrunde|Pokal|Ewige/i;
// Tabellen im Wikitext: je {{Fußballtabelle/Kopf}} oder neuer Ueberschrift beginnt eine neue Tabelle.
function tabellen(txt) {
    const lines = txt.split('\n');
    const pfad = []; const tabs = []; let cur = null;
    const neu = () => { cur = { pfad: pfad.filter(Boolean).join(' > '), n: 0 }; tabs.push(cur); };
    for (const l of lines) {
        const h = l.match(/^(=+)\s*(.*?)\s*=+\s*$/);
        if (h) { pfad.length = h[1].length; pfad[h[1].length - 1] = h[2]; cur = null; continue; }
        if (/^\{\{\s*Fußballtabelle\/Kopf/.test(l)) { neu(); continue; }
        if (/^\{\{\s*Fußballtabelle\/Zeile/.test(l)) { if (!cur) neu(); cur.n++; }
    }
    return tabs.filter(t => t.n >= 6 && !AUSSCHLUSS.test(t.pfad));
}
const infoboxVereine = txt => { const m = txt.match(/\|\s*Mannschaften\s*=\s*(\d+)/); return m ? +m[1] : null; };

async function inhalte(titel) {
    const out = {};
    for (let i = 0; i < titel.length; i += 50) {
        const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titel.slice(i, i + 50).join('|') });
        (j.query?.pages || []).forEach(p => { out[p.title] = p.revisions ? p.revisions[0].slots.main.content : ''; });
    }
    return out;
}

const JAHRE = []; for (let y = 1963; y <= 2024; y++) JAHRE.push(y);
const funde = []; // {y, gebiet, ebene, epoche, liga, titel, staffeln:[n], infobox}
const t0 = Date.now();
for (const y of JAHRE) {
    const kat = await kategorie(y);
    const treffer = kat.map(t => [t, klasse(t, y)]).filter(([, k]) => k);
    const txt = await inhalte(treffer.map(([t]) => t));
    treffer.forEach(([t, [gebiet, ebene, epoche]]) => {
        const tabs = tabellen(txt[t] || '');
        funde.push({ y, gebiet, ebene, epoche, liga: t.replace(/ \d{4}\/\d{2,4}.*$/, '').trim(), titel: t, staffeln: tabs.map(x => x.n), pfade: tabs.map(x => x.pfad), infobox: infoboxVereine(txt[t] || '') });
    });
    process.stdout.write(`${saison(y)}: ${treffer.length} Artikel  `);
    if (y % 5 === 2) process.stdout.write('\n');
}
console.log(`\nAbruf fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${funde.length} Ligaartikel.`);

// ---------- Auswertung mit Lueckenfuellung ----------
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
// Dieselbe Liga heisst in verschiedenen Saisons verschieden ("1. Amateurliga Hessen" 1963/64, "Hessenliga" 1965/66).
// Ohne Zusammenfuehrung ueber den Verband zaehlt die eine und die andere wird als "fehlend" dazugeschaetzt.
const ligaKey = name => {
    const s = name.replace(/^1\. /, '').replace(/^Fußball-/, '');
    if (/^(Hessen|Bayern)liga$/.test(s)) return s.replace('liga', '');
    const m = s.match(/^(Amateurliga|Landesliga|Verbandsliga|Oberliga|Bezirksliga) (.+)$/);
    return m ? m[2] : s;
};
funde.forEach(f => { f.key = ligaKey(f.liga); });
const zeilen = []; // je (Gebiet, Ebene, Saison): gezaehlt + Infobox + geschaetzt
const gruppen = {};
funde.forEach(f => { (gruppen[f.gebiet + '|' + f.ebene + '|' + f.epoche] = gruppen[f.gebiet + '|' + f.ebene + '|' + f.epoche] || []).push(f); });
const unklar = [];
for (const key in gruppen) {
    const [gebiet, ebene, epoche] = key.split('|');
    const [von, bis] = epoche.split('-').map(Number);
    const fs_ = gruppen[key];
    const ligen = [...new Set(fs_.map(f => f.key))];
    // je Liga (Verband): typische Staffelzahl und Staffelgroesse aus den Saisons MIT Tabelle
    const typ = {};
    ligen.forEach(l => {
        const mit = fs_.filter(f => f.key === l && f.staffeln.length);
        typ[l] = { staffeln: median(mit.map(f => f.staffeln.length)), groesse: median(mit.flatMap(f => f.staffeln)) };
    });
    const epGroesse = median(fs_.flatMap(f => f.staffeln));
    for (let y = von; y <= Math.min(bis, 2024); y++) {
        const z = { y, gebiet, ebene: +ebene, tabellen: 0, vereine: 0, tabGeschaetzt: 0, vereineGeschaetzt: 0, vereineInfobox: 0, ligen: [], keys: [] };
        ligen.forEach(l => {
            z.keys.push(l);
            const alle = fs_.filter(x => x.key === l && x.y === y);
            const f = alle.find(x => x.staffeln.length) || alle[0];
            if (f && f.staffeln.length) { z.tabellen += f.staffeln.length; z.vereine += f.staffeln.reduce((a, b) => a + b, 0); z.ligen.push(f.liga + ' ' + f.staffeln.join('/')); return; }
            const t = typ[l].staffeln || 1;
            // Artikel da, Tabelle nicht als Vorlage erkennbar: Vereinszahl aus der Infobox ist ein echter Wert
            if (f && f.infobox) {
                unklar.push(`${saison(y)} ${f.liga}: keine Tabelle erkannt, Infobox ${f.infobox}`);
                z.tabellen += t; z.vereine += f.infobox; z.vereineInfobox += f.infobox; z.ligen.push(f.liga + ' =' + f.infobox + ' (Infobox)');
                return;
            }
            const v = t * (typ[l].groesse || epGroesse || 16);
            z.tabellen += t; z.vereine += v; z.tabGeschaetzt += t; z.vereineGeschaetzt += v;
            z.ligen.push((f ? f.liga : l) + ' ~' + v + (f ? ' (ohne Tabelle/Infobox)' : ' (fehlt)'));
        });
        zeilen.push(z);
    }
}
// DDR-Bezirksligen: 15 Bezirke fest. Nie gesehene Bezirke einer Saison ergaenzen (Kategorie ist lueckenhaft).
zeilen.filter(z => z.gebiet === 'DDR' && z.ebene === 3).forEach(z => {
    const gesehen = new Set(z.keys); // Verbands-Schluessel, nicht aus dem Anzeigetext lesen ("Rostock ~24 (fehlt)")
    const fehlen = BEZIRKE.split('|').filter(b => !gesehen.has(b));
    const g = median(funde.filter(f => f.gebiet === 'DDR' && f.ebene === 3).flatMap(f => f.staffeln)) || 14;
    fehlen.forEach(b => { z.tabellen++; z.vereine += g; z.tabGeschaetzt++; z.vereineGeschaetzt += g; z.ligen.push('Fußball-Bezirksliga ' + b + ' ~' + g + ' (nie gesehen)'); });
});
zeilen.sort((a, b) => a.gebiet.localeCompare(b.gebiet) || a.ebene - b.ebene || a.y - b.y);

// Plausibilitaet: Infobox-Summe gegen gezaehlte Zeilen
const abweichung = funde.filter(f => f.infobox && f.staffeln.length && Math.abs(f.infobox - f.staffeln.reduce((a, b) => a + b, 0)) > 1)
    .map(f => `${f.titel}: gezaehlt ${f.staffeln.join('/')}, Infobox ${f.infobox}`);

const summe = (gebiet, ebene) => zeilen.filter(z => z.gebiet === gebiet && z.ebene === ebene).reduce((s, z) => ({
    saisons: s.saisons + 1, tabellen: s.tabellen + z.tabellen, vereine: s.vereine + z.vereine,
    tabGeschaetzt: s.tabGeschaetzt + z.tabGeschaetzt, vereineGeschaetzt: s.vereineGeschaetzt + z.vereineGeschaetzt, vereineInfobox: s.vereineInfobox + z.vereineInfobox }),
    { saisons: 0, tabellen: 0, vereine: 0, tabGeschaetzt: 0, vereineGeschaetzt: 0, vereineInfobox: 0 });
const S = { 'BRD 2': summe('BRD', 2), 'BRD 3': summe('BRD', 3), 'DDR 2': summe('DDR', 2), 'DDR 3': summe('DDR', 3) };
console.log('\nGebiet Ebene | Saisons | Staffeln (davon geschaetzt) | Vereinssaisons: gesamt = Tabelle + Infobox + geschaetzt');
for (const k in S) { const s = S[k]; console.log(`${k.padEnd(6)} | ${s.saisons} | ${s.tabellen} (${s.tabGeschaetzt}) | ${s.vereine} = ${s.vereine - s.vereineInfobox - s.vereineGeschaetzt} + ${s.vereineInfobox} + ${s.vereineGeschaetzt}`); }
console.log('\nStaffeln je Saison (Stichproben):');
for (const k of ['BRD|2', 'BRD|3', 'DDR|2', 'DDR|3']) {
    const [g, e] = k.split('|');
    const rs = zeilen.filter(z => z.gebiet === g && z.ebene === +e);
    console.log(`${g} ${e}: ` + rs.filter((z, i) => i % 5 === 0 || i === rs.length - 1).map(z => `${saison(z.y)} ${z.tabellen}/${z.vereine}${z.tabGeschaetzt ? '*' : ''}`).join('  '));
}
if (abweichung.length) console.log('\nInfobox weicht von Zaehlung ab (' + abweichung.length + '):\n  ' + abweichung.slice(0, 15).join('\n  '));
if (unklar.length) console.log('\nOhne erkennbare Tabelle (' + unklar.length + '):\n  ' + unklar.slice(0, 15).join('\n  '));
fs.writeFileSync(path.join(DIR, 'staffeln_ebene23.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), summe: S, saisons: zeilen, funde, abweichung, unklar }, null, 1));
console.log('\n-> tools/staffeln_ebene23.json');
