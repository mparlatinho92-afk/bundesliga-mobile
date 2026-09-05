#!/usr/bin/env node
/*
 * inseln.cjs - zaehlt Vereine, deren Wabe KEINEN Nachbarn in derselben Staffel hat.
 *
 * Warum die Wabe und nicht der Abstand: die Karte faerbt Waben nach der aktuellen Liga und
 * verschmilzt gleichfarbige Nachbarzellen. Genau dann, wenn keine Nachbarzelle dieselbe Farbe
 * hat, sieht man eine Insel. Abstand taugt als Ersatz nicht - zwei Vereine koennen 8 km
 * auseinanderliegen und trotzdem keine gemeinsame Wabenkante haben.
 *
 * Nachbarschaft kommt aus MAP_WABEN (app/map_regions.js): Ringe sind Punkt-INDIZES in einen
 * gemeinsamen Pool, zwei Zellen mit mindestens zwei gemeinsamen Indizes teilen eine Kante.
 *
 * GRENZE: Waben gibt es nur fuer die 11 dynamisch geteilten Verbaende (705 Vereine). Fuer die
 * uebrigen zeichnet die Karte statische Regionsflaechen, dort ist der Begriff Insel nicht
 * definiert.
 *
 * Aufruf:  node tools/inseln.cjs [saisons]      (default 0 = nur Sim-Start)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };

const lade = f => eval.call(global, fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(lade);

// MAP_WABEN aus app/map_regions.js herausschneiden (die Datei ist 2,6 MB, davon interessiert
// nur diese eine Konstante)
const src = fs.readFileSync(path.join(ROOT, 'app', 'map_regions.js'), 'utf8');
const start = src.indexOf('const MAP_WABEN = ') + 'const MAP_WABEN = '.length;
let tiefe = 0, ende = start;
for (; ende < src.length; ende++) {
    if (src[ende] === '{') tiefe++;
    else if (src[ende] === '}' && --tiefe === 0) { ende++; break; }
}
const WABEN = JSON.parse(src.slice(start, ende));

// Nachbarschaft: zwei Zellen mit >= 2 gemeinsamen Punkt-Indizes teilen eine Kante
const nachbarn = new Map();          // Vereinsname -> Set(Vereinsname)
for (const verband of Object.keys(WABEN)) {
    const zellen = WABEN[verband].cells;
    const namen = Object.keys(zellen);
    const idx = new Map();           // Punktindex -> [Vereinsnamen]
    for (const n of namen) {
        const punkte = new Set();
        for (const ring of zellen[n]) for (const k of ring) punkte.add(k);
        for (const k of punkte) { if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n); }
    }
    const zaehler = new Map();       // "a|b" -> gemeinsame Punkte
    for (const liste of idx.values()) {
        for (let i = 0; i < liste.length; i++)
            for (let j = i + 1; j < liste.length; j++) {
                const s = liste[i] < liste[j] ? liste[i] + '|' + liste[j] : liste[j] + '|' + liste[i];
                zaehler.set(s, (zaehler.get(s) || 0) + 1);
            }
    }
    for (const [s, n] of zaehler) {
        if (n < 2) continue;
        const [a, b] = s.split('|');
        if (!nachbarn.has(a)) nachbarn.set(a, new Set());
        if (!nachbarn.has(b)) nachbarn.set(b, new Set());
        nachbarn.get(a).add(b); nachbarn.get(b).add(a);
    }
}

// So faerbt die Karte: nicht nach der rohen leagueId, sondern nach der STAFFEL. Wer ueber den
// Staffelebenen spielt (Regionalliga aufwaerts) oder ligalos ist, behaelt seine Heimatstaffel aus
// game_data - sonst waere jeder Bundesligist trivial eine Insel (app/map_saison.js:53).
const L2R = {};
for (const reg in (Engine.REGION_TO_LEAGUE_ID || {})) L2R[Engine.REGION_TO_LEAGUE_ID[reg]] = reg;
function heimatVon(t) {
    const gd = GAME_DATA.teams[t.id];
    const ket = (gd && gd.regions) || [];
    return ket[ket.length - 1] || null;
}
// Stufe je Regionslabel aus MAP_REGIONS - noetig, um zu erkennen, ob die aktuelle Liga auf der
// STAFFEL-Ebene liegt oder darueber.
const STUFE = {};
{
    const s2 = src.indexOf('const MAP_REGIONS = ');
    const arr = JSON.parse(src.slice(s2 + 'const MAP_REGIONS = '.length, src.indexOf('];', s2) + 1));
    for (const r of arr) if (!(r.label in STUFE)) STUFE[r.label] = r.stufe;
}

// So faerbt die Karte wirklich (App._mapStaffelKette, app/map_saison.js:53): die statische Kette
// aus game_data wird nur auf der EBENE der aktuellen Liga ersetzt, tiefere Glieder bleiben stehen.
// Ein Verein der Rheinlandliga (Verbandsebene) behaelt also seine Staffel Rheinland West - er ist
// dort weiter ansaessig und faellt NICHT aus der Staffelflaeche heraus. Nur wer innerhalb der
// Staffelebene verschoben wird (Geo-Ausgleich 7-3 -> 7-4), wechselt die Farbe.
// modus 'struktur' = nur die statische Kette, also der Sim-Start-Zustand.
let MODUS = 'karte';
function staffelVon(t) {
    const heim = heimatVon(t);
    if (MODUS === 'struktur') return heim;
    const jetzt = L2R[t.leagueId];
    if (jetzt && STUFE[jetzt] >= (STUFE[heim] || 0)) return jetzt;
    return heim;
}

function messen() {
    const teams = Object.values(Engine.teams).filter(t => nachbarn.has(t.name));
    const nach = {};
    teams.forEach(t => nach[t.name] = t);
    const inseln = [];
    for (const t of teams) {
        const eigen = staffelVon(t);
        if (!eigen) continue;
        const nb = [...nachbarn.get(t.name)].map(n => nach[n]).filter(Boolean);
        if (!nb.length) continue;
        if (!nb.some(x => staffelVon(x) === eigen)) inseln.push(t);
    }
    return { teams: teams.length, inseln };
}

const saisons = parseInt(process.argv[2] || '0', 10);
Engine.init();

function bericht(titel) {
    const heim = Object.values(Engine.teams).filter(t => t.homeStaffel).length;
    console.log(titel.padEnd(22) + 'Waben-Vereine 704 · homeStaffel gesetzt bei ' + heim);
    let karte = null;
    for (const m of ['karte', 'struktur']) {
        MODUS = m;
        const a = messen();
        if (m === 'karte') karte = a;
        console.log('   ' + m.padEnd(9) + String(a.inseln.length).padStart(3)
            + ' Inseln (' + (100 * a.inseln.length / a.teams).toFixed(1) + ' %)  '
            + a.inseln.slice(0, 6).map(t => t.name + ' [' + staffelVon(t) + ']').join(', '));
    }
    MODUS = 'karte';
    return karte;
}

const anfang = bericht('Sim-Start:');
if (saisons > 0) {
    for (let i = 0; i < saisons; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    console.log('');
    const spaet = bericht('nach ' + saisons + ' Saisons:');
    const neu = spaet.inseln.filter(t => !anfang.inseln.some(x => x.id === t.id));
    console.log('   davon NEU gegenueber dem Sim-Start: ' + neu.length);
}
