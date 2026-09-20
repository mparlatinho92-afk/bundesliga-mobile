// Europapokal-Startplätze der Bundesliga aus Wikipedia (nur lesend) -> tools/wiki_europa.json
//
//   node tools/wiki_europa.mjs          # holt/liest die Saisonartikel, schreibt die JSON
//   node tools/wiki_europa.mjs --roh    # nur Befund je Saison, schreibt nichts
//
// WARUM RECHERCHE UND KEINE FESTE REGEL: die Startplätze schwankten über die Jahrzehnte. 1968/69 vergab die
// Liga NUR den Meisterplatz (der zweite deutsche Starter kam über den Pokal), heute sind es sechs bis sieben
// Plätze, und die Conference League gibt es erst seit 2021/22. Die heutige Regel (1–4 CL, 5 EL, 6 ECL) auf
// alte Saisons anzuwenden wäre erfunden.
//
// Quelle: die Abschlusstabelle im Saisonartikel. Jede Zeile trägt eine Farbe, die {{Farblegende|…}} darunter
// erklärt sie ("#ccccff = Teilnahme an der UEFA Champions League 2014/15: …"). Beides zusammen ergibt je Platz
// den Wettbewerb. Die Legende nennt auch, wenn ein Platz NICHT über die Liga kam ("stellvertretend für den
// Sieger des DFB-Pokals", "als unterlegener Pokalfinalist") – das wird als `pokal` vermerkt statt als Ligaplatz.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROH = process.argv.includes('--roh');
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Europapokal-Startplaetze)';
const CACHE = path.join(os.tmpdir(), 'wiki_europa_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;

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
    const pg = j?.query?.pages?.[0];
    const t = pg && pg.revisions ? pg.revisions[0].slots.main.content : '';
    fs.writeFileSync(datei, t);
    return t;
}

// Legendentext -> Kurzform. Reihenfolge zählt: "Qualifikation zur Champions League" vor "Champions League".
const WETT = [
    [/(Qualifikation|Play-?offs?|Qualifikationsrunde) .*Champions League/i, 'CLQ', 'Champions-League-Qualifikation'],
    [/Champions League/i, 'CL', 'Champions League'],
    [/Europapokal der Landesmeister/i, 'LM', 'Landesmeister-Pokal'],
    [/Europapokal der Pokalsieger|Pokalsiegerwettbewerb/i, 'PS', 'Pokalsieger-Wettbewerb'],
    [/Qualifikation .*Conference League/i, 'ECLQ', 'Conference-League-Qualifikation'],
    [/Conference League/i, 'ECL', 'Conference League'],
    [/(Qualifikation|Play-?offs?|Qualifikationsrunde) .*Europa League/i, 'ELQ', 'Europa-League-Qualifikation'],
    [/Europa League/i, 'EL', 'Europa League'],
    [/Qualifikation .*UEFA-Pokal/i, 'UCQ', 'UEFA-Pokal-Qualifikation'],
    [/UEFA-Pokal/i, 'UC', 'UEFA-Pokal'],
    [/Messe(städte)?-?Pokal/i, 'MP', 'Messestädte-Pokal'],
    [/Intertoto/i, 'IT', 'Intertoto-Cup'],
];
// Diese Farben meinen keinen Europapokal
const IGNORE = /Abstieg|Relegation|Aufstieg|Meister der|zurückgezogen|Lizenz/i;
// Der Platz kam nicht über die Liga, sondern über den Pokal
const UEBER_POKAL = /stellvertretend|Pokalfinalist|Pokalsieger(?!-)|über den DFB-Pokal|als Pokalsieger/i;

// ZWEITER WEG (neuere Artikel, ab ca. 2012): statt einer Farblegende traegt jede Tabellenzeile eine
// ANMERKUNGSSPALTE hinter der Vorlage: "|| M/CL", "|| rowspan=\"4\" | CL", "|| (ECL)".
// Klammern bedeuten "nicht direkt" – Qualifikation oder ueber den Pokal. rowspan gilt fuer die Folgezeilen.
// Wo es diese Spalte gibt, ist sie genauer als die Farbe: 2014/15 fuehrte die Legende drei Plaetze
// faelschlich als Champions League, weil ihr Text den Wettbewerb nur erwaehnte.
const ANM = { CL: 'CL', EL: 'EL', ECL: 'ECL', UC: 'UC', LM: 'LM', PS: 'PS', IT: 'IT', MP: 'MP' };
const ANM_NAME = { CL: 'Champions League', CLQ: 'Champions-League-Qualifikation', EL: 'Europa League',
    ELQ: 'Europa-League-Qualifikation', ECL: 'Conference League', ECLQ: 'Conference-League-Qualifikation',
    UC: 'UEFA-Pokal', UCQ: 'UEFA-Pokal-Qualifikation', LM: 'Landesmeister-Pokal', PS: 'Pokalsieger-Wettbewerb',
    IT: 'Intertoto-Cup', MP: 'Messestädte-Pokal' };
function lesenAnmerkung(txt) {
    const zeilen = txt.split('\n').filter(l => /\{\{Fußballtabelle\/Zeile/.test(l));
    if (!zeilen.length) return null;
    const plaetze = {};
    let offen = 0, offenWert = null;
    let gefunden = false;
    for (const l of zeilen) {
        const rang = (l.match(/\|\s*Rang\s*=\s*(\d+)/) || [])[1];
        if (!rang) continue;
        // Anmerkung steht hinter dem schliessenden }} der Vorlage
        const nach = (l.split('}}').slice(1).join('}}') || '').trim();
        let wert = null;
        if (nach.startsWith('||')) {
            gefunden = true;
            let rest = nach.slice(2).trim();
            const rs = rest.match(/^rowspan\s*=\s*\"?(\d+)\"?\s*\|?\s*/i);
            if (rs) { offen = parseInt(rs[1]); rest = rest.slice(rs[0].length).trim(); }
            else offen = 1;
            offenWert = rest;
            wert = rest;
            offen--;
        } else if (offen > 0) { wert = offenWert; offen--; }
        if (!wert) continue;
        const klammer = /^\(.*\)$/.test(wert.trim());
        const kern = wert.replace(/[()]/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/&nbsp;/g, ' ').trim();
        // "M / CL" oder "M/CL": der Meistervermerk interessiert hier nicht
        const teile = kern.split('/').map(x => x.trim()).filter(x => x && x !== 'M' && x !== 'P' && x !== 'N' && x !== 'R');
        const w = teile.map(x => ANM[x.toUpperCase()]).filter(Boolean)[0];
        if (!w) continue;
        const code = klammer ? (ANM[w] && ['CL', 'EL', 'ECL', 'UC'].includes(w) ? w + 'Q' : w) : w;
        plaetze[rang] = { w: code, name: ANM_NAME[code] || code };
    }
    return gefunden && Object.keys(plaetze).length ? plaetze : null;
}

function lesen(txt) {
    // 1) Farblegende: Farbe -> Text
    const legende = {};
    [...txt.matchAll(/\{\{Farblegende\|\s*#?([0-9a-fA-F]{3,6})\s*\|([^}]+)\}\}/g)].forEach(m => {
        legende[m[1].toLowerCase()] = m[2].replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    });
    // 2) Tabellenzeilen: Rang + Farbe. Nur der ERSTE Tabellenblock (die Abschlusstabelle).
    const rangFarbe = {};
    [...txt.matchAll(/\{\{Fußballtabelle\/Zeile([^}]*)\}\}/g)].forEach(m => {
        const p = m[1];
        const rang = (p.match(/\|\s*Rang\s*=\s*(\d+)/) || [])[1];
        const farbe = (p.match(/\|\s*Farbe\s*=\s*#?([0-9a-fA-F]{3,6})/) || [])[1];
        if (rang && farbe && rangFarbe[rang] === undefined) rangFarbe[rang] = farbe.toLowerCase();
    });
    // 3) zusammenführen
    const hauptsatz = t => String(t || '').split(':')[0].split('(')[0].split(/,\s*(?:da|weil|sofern|wenn|falls)\b/)[0];
    const plaetze = {};
    for (const [rang, farbe] of Object.entries(rangFarbe)) {
        const voll = legende[farbe];
        const txtL = hauptsatz(voll);
        if (!txtL || (IGNORE.test(txtL) && !WETT.some(([re]) => re.test(txtL)))) continue;
        const tr = WETT.find(([re]) => re.test(txtL));
        if (!tr) continue;
        plaetze[rang] = { w: tr[1], name: tr[2] };
        if (UEBER_POKAL.test(voll)) plaetze[rang].pokal = 1;   // nicht über die Liga erspielt (steht in der Begründung)
    }
    return { plaetze, legende: Object.values(legende) };
}

const AB = 1963, BIS = 2024;
const out = {};
const bericht = [];
for (let y = AB; y <= BIS; y++) {
    const t = await wikitext('Fußball-Bundesliga ' + saison(y));
    if (!t) { bericht.push([saison(y), 'ARTIKEL FEHLT']); continue; }
    const ausAnm = lesenAnmerkung(t);
    const { plaetze: ausFarbe, legende } = lesen(t);
    const plaetze = ausAnm || ausFarbe;
    if (Object.keys(plaetze).length) out[saison(y)] = plaetze;
    bericht.push([saison(y), Object.entries(plaetze).sort((a, b) => a[0] - b[0])
        .map(([r, v]) => r + ':' + v.w + (v.pokal ? '*' : '')).join(' ') || '(nichts erkannt)', (ausAnm ? 'Anm.' : legende.length + ' Leg.')]);
}

console.log('Saison      Startplätze je Rang (* = über den Pokal, nicht über die Liga)   Legenden');
bericht.forEach(([s, p, n]) => console.log(s.padEnd(12) + String(p).padEnd(58) + (n === undefined ? '' : n)));
const ohne = bericht.filter(b => /nichts erkannt|FEHLT/.test(b[1]));
console.log('\nSaisons mit Startplätzen: ' + Object.keys(out).length + ' | ohne Befund: ' + ohne.length
    + (ohne.length ? ' -> ' + ohne.map(b => b[0]).join(', ') : ''));

if (!ROH) {
    fs.writeFileSync(path.join(DIR, 'wiki_europa.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), saisons: out }, null, 1));
    console.log('-> tools/wiki_europa.json');
}
