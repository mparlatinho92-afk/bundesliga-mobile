// Vereinsnamen der f-archiv-Tabellen (Ebene 2-3) -> Vereins-IDs aus game_data.js / HISTORIC_CLUBS.
//
//   node tools/farchiv_vereine.mjs [csv]      # vorher: node tools/farchiv_ebenen.mjs
//
// Stufen:  A sicher (Anker-Namensform, exakter Name, gleicher Namenskern)
//          B wahrscheinlich (Kern-Teilmenge oder Ort + Jahreszahl, einziger Kandidat in der Region)
//          C unsicher (nur Ort, mehrere Kandidaten, Konflikt in derselben Saison) -> Pruefliste
//          H historisch (kein Kandidat; Verein bekommt nur seinen Namen)
// Korrekturen des Nutzers in tools/farchiv_vereine_korrektur.json haben IMMER Vorrang: { "f-archiv-Name": "id" | null }.
//
// GEGENPROBE: derselbe Abgleich OHNE Anker-Woerterbuch ueber Bundesliga, 2. BL und DDR-Oberliga, deren IDs der Seed
// kennt -> Trefferquote je Stufe. Eine Stufe, die dort Fehler macht, darf nicht still uebernommen werden.
//
// Ausgabe: tools/farchiv_vereine.json + docs/farchiv_zuordnung_pruefliste.csv (Excel: Semikolon, UTF-8 mit BOM)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const CSV = process.argv[2] || path.join(os.homedir(), 'Downloads/farchiv_output/alle_tabellen_final.csv');
globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js');
const GD = globalThis.GAME_DATA, HS = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS || {};
const EB = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_ebene23.json'), 'utf8'));
const KORR_F = path.join(DIR, 'farchiv_vereine_korrektur.json');
const KORR = fs.existsSync(KORR_F) ? JSON.parse(fs.readFileSync(KORR_F, 'utf8')) : {};
// Korrekturen aus der Pruefliste (letzte Spalte) uebernehmen, BEVOR sie neu geschrieben wird – sonst loeschte jeder Lauf
// die Arbeit des Nutzers. "-" = bewusst keine ID. Dauerhaft gesichert in farchiv_vereine_korrektur.json.
const PRUEF_F = path.join(ROOT, 'docs/farchiv_zuordnung_pruefliste.csv');
function csvSemikolon(s) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
        else if (c === '"') q = true;
        else if (c === ';') { row.push(f); f = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
        else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
}
if (fs.existsSync(PRUEF_F)) {
    const rows = csvSemikolon(fs.readFileSync(PRUEF_F, 'utf8').replace(/^﻿/, ''));
    const head = rows.shift() || [];
    const iName = head.indexOf('f-archiv-Name'), iK = head.findIndex(h => h.startsWith('Korrektur-ID'));
    let neu = 0;
    if (iName >= 0 && iK >= 0) rows.forEach(r => {
        const v = (r[iK] || '').trim(); if (!v || !r[iName]) return;
        const id = v === '-' ? null : v;
        if (KORR[r[iName]] !== id) { KORR[r[iName]] = id; neu++; }
    });
    if (neu) { fs.writeFileSync(KORR_F, JSON.stringify(KORR, null, 1)); console.log(`Korrekturen aus der Pruefliste uebernommen: ${neu} -> tools/farchiv_vereine_korrektur.json`); }
}

// ---------- Normalisierung ----------
const norm = n => (n || '').toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss').replace(/[éè]/g, 'e')
    .replace(/\bst\.\s*/g, 'st ').replace(/(\d)\.(?=[a-z])/g, '$1 ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// Vereinsform-Kuerzel und Allerweltswoerter: tragen nichts zur Identitaet bei
const STOP = new Set(('1 fc sv sc tsv tus vfb vfl vfr fsv tsg spvgg sf sg djk fv bsc bv ssv asv msv osc rw svg tv tb fsg sus rsv ' +
    'fk sk ev e v bsg asg hsg isg esv psv atsv atus sportfreunde sportverein spielvereinigung verein turnverein fussball ' +
    'und von der de 1 i ii iii a am amateure res reserve b u23 u21 2 club klub').split(' '));
// DDR-Traegerbegriffe: im Tabellennamen haeufig, im heutigen Vereinsnamen oft verschwunden -> nicht als Identitaet werten
const DDR_WORT = new Set(('motor chemie aktivist stahl empor traktor lok lokomotive dynamo vorwaerts einheit turbine fortschritt aufbau ' +
    'post wismut energie hydraulik glueckauf kali rotation medizin veritas robotron kraftverkehr landbau pneumant mikroelektronik ' +
    'elektronik bau verkehr handwerk konsum luftfahrt nord sued ost west mitte').split(' '));
const istJahr = t => /^(18|19|20)\d\d$/.test(t) || /^\d{2}$/.test(t);
// Farben und Vereinswoerter: Teil der Identitaet (bleiben im Kern), aber nie ein Ort
// ("Alemannia Mariadorf" ist nicht Alemannia Aachen, "Aktivist Schwarze Pumpe" nicht Schwarz-Weiß Neukölln)
const NICHT_ORT = new Set(('schwarz schwarze weiss blau gruen rot rote gelb union eintracht borussia fortuna viktoria victoria germania ' +
    'alemannia olympia concordia preussen arminia kickers hertha tasmania wacker westfalia rapid rapide teutonia sparta hansa ' +
    'phoenix normannia sportfreunde sportclub turnerschaft spielvereinigung wormatia bavaria saxonia').split(' '));
// NICHT hier hinein: Orts-Adjektive wie "stuttgarter" – sonst gilt "Stuttgarter SC" nicht mehr als reiner Ortsname und wird VfB Stuttgart
// "Würzburger" ~ "Würzburg", "Göppinger" ~ "Göppingen", "Berliner" ~ "Berlin": gleicher STAMM nach Abschneiden EINER
// Endung, Stamm mind. 5 Zeichen. Ein blosser Wortanfang war zu grob ("Oberhausen" ~ "Oberhaid", "Weimar" ~ "Weiß").
const staemme = w => { const s = new Set([w]); const m = w.replace(/(er|en|e|s|n|r)$/, ''); if (m !== w && m.length >= 5) s.add(m); return s; };
const aehnlich = (a, b) => { if (a === b) return true; if (a.length < 5 || b.length < 5) return false; const sa = staemme(a); for (const x of staemme(b)) if (sa.has(x)) return true; return false; };
const enthaelt = (menge, x) => { for (const y of menge) if (aehnlich(x, y)) return true; return false; };
const RESERVE = /(?:\s+(?:III|II|2|A|Am\.?|Amat\.?|Amateure|Res\.?|Reserve|b|U ?2[13]))$/i; // III: "FC Carl Zeiß Jena III" in der Bezirksliga
function zerlege(name) {
    const reserve = RESERVE.test(name.trim());
    const basis = name.trim().replace(RESERVE, '').trim();
    const t = norm(basis).split(' ').filter(Boolean);
    const kern = t.filter(x => !STOP.has(x));
    const ort = kern.filter(x => x.length >= 4 && !DDR_WORT.has(x) && !NICHT_ORT.has(x) && !istJahr(x) && !/^\d+$/.test(x));
    const zahl = t.filter(x => /^\d+$/.test(x) && x !== '1' && x !== '2');
    return { reserve, basis, n: norm(basis), kern, kernSet: new Set(kern), ort, zahl };
}

// ---------- Kandidaten ----------
const KAND = [];
Object.values(GD.teams).forEach(t => {
    const z = zerlege(t.isReserve ? t.name : t.name);
    const orte = new Set(z.ort);
    (t.venues || []).forEach(v => norm((v.ort || '').split(/[-,(]/)[0]).split(' ').filter(x => x.length >= 4).forEach(x => orte.add(x)));
    KAND.push({ id: t.id, name: t.name, reserve: !!t.isReserve, parentId: t.parentId || null, regionen: new Set(t.regions || []), z, orte });
});
Object.entries(HC).forEach(([id, name]) => { const z = zerlege(name); KAND.push({ id, name, reserve: false, parentId: null, regionen: null, z, orte: new Set(z.ort), historisch: true }); });
const KBYID = new Map(KAND.map(k => [k.id, k]));
// Ortsteile/Orte aus allen Stadion-Orten ("Hamburg-Wandsbek" -> hamburg, wandsbek): harmlose Zusatzwoerter in Stufe B
const ORTE_GLOBAL = new Set();
Object.values(GD.teams).forEach(t => (t.venues || []).forEach(v => norm(v.ort || '').split(' ').filter(x => x.length >= 4 && !NICHT_ORT.has(x)).forEach(x => ORTE_GLOBAL.add(x))));

// ---------- Anker: Seed-IDs <-> f-archiv-Namen ueber das Torverhaeltnis (s. Anker-Pruefung) ----------
function parse(s) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
        else if (c === '"') q = true;
        else if (c === ',') { row.push(f); f = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
        else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
}
const yr = s => { const m = String(s).match(/(\d{4})/); return m ? +m[1] : null; };
const sauber = v => { let s = v, alt; do { alt = s; s = s.replace(/\s*\*+\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim(); } while (s !== alt); return s.replace(/\s+/g, ' '); };
const LID = l => /Frauen|Junior|Jugend|Amateur|Aufstieg/.test(l) ? null : /^Bundesliga$/.test(l) ? '1' : /^2\. ?Bundesliga|^Zweite Bundesliga/.test(l) ? '2' : /^DDR-Oberliga$|^Oberliga Nordost$/.test(l) ? 'ddr1' : null;
const pool = {};
// Bereinigter Vereinsname -> Saisons ueber ALLE Ebenen der Quellen (f-archiv bis 2020/21 + Wikipedia-Ergaenzung) – Grundlage
// des Nachfolge-/Koexistenz-Tests fuer unsichere Zuordnungen
const ALLE_JAHRE = {};
for (const datei of [CSV, path.join(DIR, 'wiki_ergaenzung.csv')].filter(f => fs.existsSync(f))) {
    const all = parse(fs.readFileSync(datei, 'utf8')); const head = all.shift().map(h => h.trim());
    for (const r of all) {
        if (r.length < 2) continue;
        const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]));
        const vy = yr(o.season), vn = sauber(o.verein || '');
        if (vy && vn) (ALLE_JAHRE[vn] = ALLE_JAHRE[vn] || new Set()).add(vy);
        if (datei !== CSV) continue;
        const lid = LID(o.league.replace(/\s+/g, ' ').trim()); if (!lid) continue;
        const k = lid + '|' + yr(o.season), e = { verein: sauber(o.verein), tore: o.tore.replace(/\s/g, ''), spiele: +o.spiele || null, platz: +o.platz };
        const p = pool[k] = pool[k] || []; if (!p.some(x => x.verein === e.verein && x.tore === e.tore)) p.push(e);
    }
}
const ankerZaehl = {}; // name -> {id: saisons}
// Belegjahre je (Name, ID): eine Namensform gilt nur in ihrer Zeit – "Turbine Halle" war um 1950 der Vorgaenger des
// Halleschen FC, die Bezirksliga-"Turbine Halle" 1965-83 ein anderer Verein. Anwenden muss das der Verbraucher je Saison.
const ankerJahre = {}, ANKER_J = {};
HS.seasons.forEach(s => {
    const p = pool[s.lid + '|' + yr(s.y)]; if (!p) return;
    s.table.forEach(r => {
        let c = p.filter(x => x.tore === r.gf + ':' + r.ga);
        if (c.length > 1) c = c.filter(x => x.spiele === r.s + r.u + r.n && x.platz === r.rank);
        if (c.length !== 1) return;
        const a = ankerZaehl[c[0].verein] = ankerZaehl[c[0].verein] || {}; a[r.id] = (a[r.id] || 0) + 1;
        const jk = c[0].verein + '|' + r.id, jy = yr(s.y), jj = ankerJahre[jk] = ankerJahre[jk] || [jy, jy];
        jj[0] = Math.min(jj[0], jy); jj[1] = Math.max(jj[1], jy);
    });
});
// Name -> ID: die ID mit den meisten gemeinsamen Saisons; Ausreisser (gleiches Torverhaeltnis, andere Sortierung) fallen weg
const ANKER = {};
for (const [name, ids] of Object.entries(ankerZaehl)) {
    const [best, n] = Object.entries(ids).sort((a, b) => b[1] - a[1])[0];
    const rest = Object.values(ids).reduce((a, b) => a + b, 0) - n;
    if (n >= 2 * rest || rest === 0) { ANKER[norm(name)] = best; ANKER_J[norm(name)] = ankerJahre[name + '|' + best]; }
}
const ANKER_ID_NAMEN = {}; Object.entries(ANKER).forEach(([n, id]) => (ANKER_ID_NAMEN[id] = ANKER_ID_NAMEN[id] || []).push(n));

// ---------- Abgleich eines Namens im Kontext (Regionen) ----------
function abgleich(name, regionen, mitAnker) {
    const z = zerlege(name);
    const passtRegion = k => !regionen || !regionen.size || !k.regionen || [...k.regionen].some(r => regionen.has(r));
    const zielReserve = k => {
        // "Werder Bremen A" -> Reserve-ID, falls es sie gibt; sonst kein Treffer
        if (!z.reserve) return k.reserve ? null : k;
        if (k.reserve) return k;
        const r = KAND.find(x => x.reserve && x.parentId === k.id);
        return r || null;
    };
    const ergebnis = (k, stufe, grund, kandidaten) => { const ziel = k && zielReserve(k); return ziel ? { id: ziel.id, stufe, grund: grund + (z.reserve ? ' +Reserve' : ''), kandidaten } : { id: null, stufe: 'H', grund: z.reserve && k ? 'Reserve ohne eigene ID (' + k.name + ')' : grund, kandidaten }; };

    if (mitAnker && ANKER[z.n]) {
        const e = ergebnis(KBYID.get(ANKER[z.n]), 'A', 'Anker-Namensform');
        if (ANKER_J[z.n]) { e.ankerVon = ANKER_J[z.n][0]; e.ankerBis = ANKER_J[z.n][1]; }
        return e;
    }
    // Gesucht wird immer der STAMMverein; zielReserve haengt ein "II" danach wieder an. Sonst findet
    // "Eintracht Frankfurt" zwei exakte Kandidaten (mit und ohne II) und gilt als mehrdeutig.
    const imGebiet = KAND.filter(k => passtRegion(k) && !k.reserve);
    const exakt = imGebiet.filter(k => k.z.n === z.n);
    if (exakt.length === 1) return ergebnis(exakt[0], 'A', 'Name exakt');
    const kernGleich = imGebiet.filter(k => z.kern.length && k.z.kern.length === z.kern.length && z.kern.every(x => enthaelt(k.z.kernSet, x)));
    // Ein Kern, der nur aus dem Ortsnamen besteht, ist keine Identitaet: "FV Weinheim" != "TSG Weinheim", "FC Berlin" != "Berliner SC"
    const nurOrt = z.kern.length === 1 && z.ort.length === 1;
    if (kernGleich.length === 1) return nurOrt ? ergebnis(kernGleich[0], 'C', 'nur Ortsname gleich', [kernGleich[0].name]) : ergebnis(kernGleich[0], 'A', 'Namenskern gleich');
    // B: mindestens zwei Namensteile, ALLE im Spielnamen – der Stadion-Ort zaehlt hier nicht ("VfR Neuß" != "Holzheimer SG").
    // Zusatzwoerter im Spielnamen duerfen nur Kuerzel (ETB, TSR), Zahlen oder Ortsteile sein: "SC Karl-Marx-Stadt" ist nicht
    // "BSG CHEMIE Karl-Marx-Stadt" – ein weiteres kennzeichnendes Wort heisst meist: anderer Verein.
    const nurHarmloseZusaetze = k => [...k.z.kernSet].every(x => z.kern.some(y => aehnlich(x, y)) || x.length <= 3 || /^\d+$/.test(x) || enthaelt(ORTE_GLOBAL, x));
    const teil = z.kern.length >= 2 ? imGebiet.filter(k => z.kern.every(x => enthaelt(k.z.kernSet, x)) && nurHarmloseZusaetze(k)) : [];
    if (teil.length === 1) return ergebnis(teil[0], 'B', 'alle Namensteile im Spielnamen');
    // Ort + Jahreszahl: JEDER Namensteil (ausser Zahlen) muss im Spielnamen oder Stadion-Ort stehen, mindestens einer im Namen –
    // sonst wird "Nordstern 07 Berlin" zu "Berliner AK 07". "Meteor 06 Berlin" -> "BFC Meteor 06" bleibt.
    const woerter = z.kern.filter(x => !/^\d+$/.test(x));
    const ortZahl = z.zahl.length ? imGebiet.filter(k => z.zahl.some(x => k.z.zahl.includes(x))
        && woerter.every(x => enthaelt(k.z.kernSet, x) || enthaelt(k.orte, x)) && woerter.some(x => enthaelt(k.z.kernSet, x))) : [];
    if (ortZahl.length === 1) return ergebnis(ortZahl[0], 'B', 'Ort + Jahreszahl im Spielnamen');
    // C: nur der Ort passt (hier darf auch der Stadion-Ort zaehlen). Historische Vereine (HISTORIC_CLUBS) haben keine
    // Region und fielen so durch jede Regionsgrenze ("Rapide Wedding" -> "SK Rapid Wien") – fuer sie gilt nur Namensgleichheit.
    const ortHaupt = imGebiet.filter(k => !k.historisch && z.ort.some(o => enthaelt(k.orte, o)));
    if (ortHaupt.length === 1) return ergebnis(ortHaupt[0], 'C', 'nur Ort gleich', [ortHaupt[0].name]);
    // Mehrere am Ort: traegt genau einer alle kennzeichnenden Woerter ("Concordia Hamburg"), wird er der Vorschlag
    const mitKennung = ortHaupt.filter(k => woerter.filter(x => !enthaelt(k.orte, x)).every(x => enthaelt(k.z.kernSet, x)) && woerter.some(x => !enthaelt(k.orte, x)));
    if (ortHaupt.length > 1 && mitKennung.length === 1) return ergebnis(mitKennung[0], 'C', 'Ort + Namensteil gleich, Name weicht ab', ortHaupt.slice(0, 6).map(k => k.id + ' ' + k.name));
    if (ortHaupt.length > 1) return { id: null, stufe: 'C', grund: 'mehrere Vereine am Ort', kandidaten: ortHaupt.slice(0, 6).map(k => k.id + ' ' + k.name) };
    return { id: null, stufe: 'H', grund: 'kein Kandidat', kandidaten: [] };
}

// ---------- Nachfolge-/Koexistenz-Test fuer unsichere Zuordnungen (C) ----------
// Belegt statt geraten: stehen der unsichere Name und der Spielverein (unter seinem heutigen Namenskern) in DERSELBEN Saison
// irgendwo in den Tabellen, sind es zwei Vereine ("Motor Hennigsdorf" neben "Stahl Hennigsdorf"). Endet der alte Name und
// taucht der Spielverein hoechstens 3 Saisons spaeter auf, ist es eine Nachfolge (BSG-Name bis 1990, heutiger Name ab 1991).
// Reserven sind ausgenommen: Erste und Zweite spielen natuerlich gleichzeitig.
const stammForm = w => { let m = w; for (const s of staemme(w)) if (s.length < m.length) m = s; return m; };
const kernKey = name => { const z = zerlege(name); if (z.reserve) return null; const k = z.kern.filter(x => !/^\d+$/.test(x)).map(stammForm).sort().join(' '); return k || null; };
// Strenger Schluessel MIT Vereinsform ("fc neubrandenburg"): noetig, wenn der Kern nur der Ort ist – "1. FC Neubrandenburg 04"
// hat den Kern "neubrandenburg", den sich ALLE Vereine des Orts teilen (SC, TSG, Post ...); Koexistenz/Nachfolge kaemen sonst
// von einem ganz anderen Verein.
const strengKey = name => { const z = zerlege(name); if (z.reserve) return null; const k = z.n.split(' ').filter(x => x && !/^\d+$/.test(x)).map(stammForm).sort().join(' '); return k || null; };
const KERN_JAHRE = new Map(), STRENG_JAHRE = new Map(); // Schluessel -> Map(name -> Set(Jahre))
for (const [n, ys] of Object.entries(ALLE_JAHRE)) {
    const k = kernKey(n); if (k) (KERN_JAHRE.get(k) || KERN_JAHRE.set(k, new Map()).get(k)).set(n, ys);
    const s = strengKey(n); if (s) (STRENG_JAHRE.get(s) || STRENG_JAHRE.set(s, new Map()).get(s)).set(n, ys);
}
function folgeTest(cName, id) {
    const k = KBYID.get(id); if (!k || k.historisch || k.reserve) return null;
    if (zerlege(cName).reserve) return null;
    const jc = ALLE_JAHRE[cName]; if (!jc || !jc.size) return null;
    const kern = kernKey(k.name); if (!kern) return null;
    const nurOrt = !kern.includes(' '); // ein einziges Kernwort = meist nur der Ortsname -> strenger Schluessel mit Vereinsform
    const gk = nurOrt ? strengKey(k.name) : kern, index = nurOrt ? STRENG_JAHRE : KERN_JAHRE;
    const cKey = nurOrt ? strengKey(cName) : kernKey(cName);
    const jg = new Set();
    for (const [n, ys] of (index.get(gk) || new Map())) { if (n === cName || (cKey && cKey === gk)) continue; ys.forEach(y => jg.add(y)); }
    if (!jg.size) return { art: 'offen' };
    const gemeinsam = [...jc].filter(y => jg.has(y));
    if (gemeinsam.length) return { art: 'koexistenz', jahr: Math.min(...gemeinsam) };
    const cMin = Math.min(...jc), cMax = Math.max(...jc), gMin = Math.min(...jg), gMax = Math.max(...jg);
    if (cMax < gMin && gMin - cMax <= 3) return { art: 'nachfolge', text: `"${cName}" bis ${cMax}, "${k.name}" ab ${gMin}` };
    if (gMax < cMin && cMin - gMax <= 3) return { art: 'nachfolge', text: `"${k.name}" bis ${gMax}, "${cName}" ab ${cMin}` };
    return { art: 'getrennt' };
}
const FOLGE = { koexistenz: 0, nachfolge: 0, eingegrenzt: 0, offen: 0 };
function folgePruefung(name, e, zaehlen) {
    if (e.stufe !== 'C' || /^Konflikt/.test(e.grund || '')) return e;
    const ids = e.id ? [e.id] : (e.kandidaten || []).map(k => String(k).split(' ')[0]).filter(id => KBYID.has(id));
    if (!ids.length) return e;
    const tests = ids.map(id => ({ id, t: folgeTest(name, id) }));
    if (tests.some(x => !x.t)) { if (zaehlen) FOLGE.offen++; return e; }
    const bleiben = tests.filter(x => x.t.art !== 'koexistenz');
    const nachfolge = bleiben.filter(x => x.t.art === 'nachfolge');
    if (!bleiben.length) { if (zaehlen) FOLGE.koexistenz++; return { id: null, stufe: 'H', grund: 'koexistiert mit ' + tests.map(x => KBYID.get(x.id).name + ' (' + x.t.jahr + ')').join(', '), kandidaten: e.kandidaten }; }
    if (nachfolge.length === 1 && bleiben.length === 1) {
        // Einzelkandidat: zeitliche Abfolge allein reicht nur, wenn es am Ort genau EINEN Spielverein gibt – in Berlin folgt immer
        // irgendein Verein auf einen anderen ("FC Berlin" bis 1997, "Berliner SC" ab 1998 – richtig waere BFC Dynamo).
        // Bei mehreren Kandidaten ist die Abfolge belegt, weil die uebrigen nachweislich gleichzeitig spielten.
        const cz = zerlege(name);
        const amOrt = KAND.filter(x => !x.reserve && !x.historisch && cz.ort.some(o => enthaelt(x.orte, o))).length;
        if (ids.length === 1 && amOrt > 1) { if (zaehlen) FOLGE.offen++; return Object.assign({}, e, { grund: e.grund + ` (Nachfolge zeitlich moeglich, aber ${amOrt} Spielvereine am Ort)` }); }
        if (zaehlen) FOLGE.nachfolge++;
        return Object.assign({}, e, { id: nachfolge[0].id, stufe: 'B', grund: 'Nachfolge: ' + nachfolge[0].t.text });
    }
    // Nicht zu koexistieren ist KEIN Identitaetsbeleg ("Hertha BSC Berlin" -> BFC Dynamo). Eingegrenzt wird nur, wenn der
    // verbleibende Kandidat auch ein kennzeichnendes Namenswort (kein Ort) teilt; sonst bleibt C mit verkleinerter Liste.
    if (bleiben.length === 1 && ids.length > 1) {
        const cz = zerlege(name), kz = KBYID.get(bleiben[0].id).z;
        const kennung = cz.kern.filter(x => !/^\d+$/.test(x) && !cz.ort.includes(x) || NICHT_ORT.has(x));
        if (kennung.some(x => enthaelt(kz.kernSet, x))) { if (zaehlen) FOLGE.eingegrenzt++; return Object.assign({}, e, { id: bleiben[0].id, grund: 'einziger nicht koexistierender Verein am Ort mit gleichem Namenswort' }); }
    }
    if (bleiben.length < ids.length && e.id == null) {
        if (zaehlen) FOLGE.offen++;
        return Object.assign({}, e, { kandidaten: bleiben.map(x => x.id + ' ' + KBYID.get(x.id).name), grund: e.grund + ' (koexistierende gestrichen)' });
    }
    if (zaehlen) FOLGE.offen++;
    return e;
}

// ---------- Wikipedia-Belege fuer DDR-Vorgaenger (tools/wiki_ddr_vorgaenger.mjs) ----------
// Rangfolge: sichere Zuordnungen (A/B/K) aendert Wikipedia nicht, Widersprueche werden nur gezaehlt (meist "historische ID im
// Seed vs. heutiger Nachfolger"). Nachgewiesene Koexistenz schlaegt Wikipedia (Jugendabteilung, zweite Mannschaft).
// Nur C und H ohne Koexistenz werden mit eindeutigem Beleg zu B.
const WIKI_DDR_F = path.join(DIR, 'wiki_ddr_vorgaenger.json');
const WIKI_DDR = fs.existsSync(WIKI_DDR_F) ? JSON.parse(fs.readFileSync(WIKI_DDR_F, 'utf8')).vorgaenger : {};
const WIKI_STAT = { bestaetigt: 0, neu: 0, gegenSicher: 0, gegenKoexistenz: 0 };
const WIKI_WIDERSPRUCH = [];
function wikiPruefung(name, e) {
    const w = WIKI_DDR[name];
    if (!w || w.ids.length !== 1 || !KBYID.has(w.ids[0])) return e;
    const id = w.ids[0], beleg = w.belege[0];
    if (['A', 'B', 'K'].includes(e.stufe)) {
        if (e.id && e.id !== id) { WIKI_STAT.gegenSicher++; WIKI_WIDERSPRUCH.push(`${name}: ${e.stufe} ${KBYID.get(e.id)?.name || e.id}, Wikipedia ${KBYID.get(id).name}`); }
        return e;
    }
    if (/^koexistiert/.test(e.grund || '')) { WIKI_STAT.gegenKoexistenz++; WIKI_WIDERSPRUCH.push(`${name}: koexistiert laut Tabellen, Wikipedia ${KBYID.get(id).name}`); return e; }
    if (e.id === id) WIKI_STAT.bestaetigt++; else WIKI_STAT.neu++;
    return { id, stufe: 'B', grund: `Wikipedia: Vorgaenger laut Artikel "${beleg.titel}"`, kandidaten: e.kandidaten };
}

// ---------- GEGENPROBE: ohne Anker ueber die Tabellen mit bekannter ID ----------
// richtig = bekannte ID getroffen, falsch = ANDERE ID (gefaehrlich), offen = keine ID (harmlos, landet in Pruefliste/Historie)
const probe = {}, fehlerBsp = [];
for (const name of Object.keys(ankerZaehl)) {
    const wahr = ANKER[norm(name)]; if (!wahr) continue;
    const e = folgePruefung(name, abgleich(name, null, false), false); // Bundesliga = bundesweit -> keine Regionsgrenze
    const p = probe[e.stufe] = probe[e.stufe] || { richtig: 0, falsch: 0, offen: 0 };
    if (e.id === wahr) p.richtig++;
    else if (e.id) { p.falsch++; if (fehlerBsp.length < 25) fehlerBsp.push(`${e.stufe} "${name}" -> ${e.id} ${KBYID.get(e.id)?.name || ''} (${e.grund}), richtig ${wahr} ${KBYID.get(wahr)?.name || ''}`); }
    else p.offen++;
}
console.log('GEGENPROBE ohne Anker (Bundesliga, 2. BL, DDR-Oberliga; Name -> bekannte ID):');
for (const s of ['A', 'B', 'C', 'H']) { const p = probe[s]; if (p) console.log(`  ${s}: richtig ${p.richtig}, FALSCH ${p.falsch}, offen ${p.offen}${p.richtig + p.falsch ? ' | Genauigkeit ' + (100 * p.richtig / (p.richtig + p.falsch)).toFixed(0) + ' %' : ''}`); }
if (fehlerBsp.length) console.log('  Falsche Zuordnungen:\n    ' + fehlerBsp.join('\n    '));

// ---------- Ebene 2-3 zuordnen ----------
const namen = {}; // name -> {saisons, regionen:Set, jahre:Set, ligen:Set, belege:[{y, key}]}
EB.tabellen.forEach((t, ti) => t.zeilen.forEach((zl, zi) => {
    const e = namen[zl.verein] = namen[zl.verein] || { saisons: 0, regionen: new Set(), jahre: new Set(), ligen: new Set(), belege: [] };
    e.saisons++; (t.regionen || []).forEach(r => e.regionen.add(r)); e.jahre.add(t.y); e.ligen.add(t.liga); e.belege.push({ y: t.y, ti });
}));
const zu = {};
for (const [name, e] of Object.entries(namen)) {
    if (Object.prototype.hasOwnProperty.call(KORR, name)) { zu[name] = { id: KORR[name], stufe: 'K', grund: 'Korrektur des Nutzers', kandidaten: [] }; continue; }
    zu[name] = wikiPruefung(name, folgePruefung(name, abgleich(name, e.regionen, true), true));
}
// Mehrere Namen als NACHFOLGE derselben ID ("Post Neubrandenburg" UND "Bau Neubrandenburg" -> 1. FC Neubrandenburg 04):
// der Test belegt dann nur, DASS ein Vorgaenger dabei ist, nicht WELCHER -> alle zurueck auf C, Liste im Grund.
{
    const nachId = {};
    for (const [n, z] of Object.entries(zu)) if (z.stufe === 'B' && /^Nachfolge/.test(z.grund || '')) (nachId[z.id] = nachId[z.id] || []).push(n);
    // Schreibvarianten desselben Namens ("Wismut Pima-Copitz" / "Wismut Pirna-Copitz", "ESDA Thalheim" / "Esda Thalheim") sind
    // EIN Vorgaenger: nach der Normalisierung hoechstens 2 Zeichen Unterschied
    const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
        for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return d[a.length][b.length]; };
    const einVorgaenger = ns => ns.every(n => lev(norm(n), norm(ns[0])) <= 2);
    for (const [id, ns] of Object.entries(nachId)) {
        if (ns.length < 2 || einVorgaenger(ns)) continue;
        ns.forEach(n => { zu[n] = Object.assign({}, zu[n], { stufe: 'C', grund: `mehrere moegliche Vorgaenger von ${KBYID.get(id).name}: ${ns.join(', ')}` }); });
        FOLGE.nachfolge -= ns.length; FOLGE.mehrereVorgaenger = (FOLGE.mehrereVorgaenger || 0) + ns.length;
    }
}
// Schutz: zwei Namen in DERSELBEN Saison auf dieselbe ID -> der schwaechere verliert (C + Hinweis)
const RANG = { K: 0, A: 1, B: 2, C: 3 };
const proSaison = {};
for (const [name, e] of Object.entries(namen)) {
    const z = zu[name]; if (!z.id) continue;
    e.jahre.forEach(y => (proSaison[y + '|' + z.id] = proSaison[y + '|' + z.id] || new Set()).add(name));
}
let konflikte = 0; const konfliktBsp = {};
for (const [k, set] of Object.entries(proSaison)) {
    if (set.size < 2) continue;
    const liste = [...set].sort((a, b) => RANG[zu[a].stufe] - RANG[zu[b].stufe] || namen[b].saisons - namen[a].saisons);
    liste.slice(1).forEach(n => {
        if (zu[n].stufe === 'K' || zu[n].stufe === 'H') return;
        const artKey = zu[liste[0]].stufe + '>' + zu[n].stufe;
        (konfliktBsp[artKey] = konfliktBsp[artKey] || []).push(`${k.split('|')[0]} ${KBYID.get(zu[n].id)?.name}: "${liste[0]}" (${zu[liste[0]].stufe}) vs "${n}" (${zu[n].stufe})`);
        konflikte++; zu[n] = { id: null, stufe: 'C', grund: `Konflikt: ID schon bei "${liste[0]}"`, kandidaten: [zu[n].id] };
    });
}
console.log('Saison-Konflikte nach Art (Gewinner>Verlierer):', Object.entries(konfliktBsp).map(([a, l]) => a + ' ' + l.length).join(' | '));
Object.entries(konfliktBsp).forEach(([a, l]) => console.log('  ' + a + ': ' + [...new Set(l)].slice(0, 6).join(' || ')));

// ---------- Auswertung + Ausgabe ----------
const st = {}; for (const [name, z] of Object.entries(zu)) { const s = st[z.stufe] = st[z.stufe] || { namen: 0, saisons: 0 }; s.namen++; s.saisons += namen[name].saisons; }
const gesamt = Object.values(namen).reduce((a, e) => a + e.saisons, 0);
console.log(`\nNachfolge-/Koexistenz-Test auf unsichere Namen: koexistiert (-> H) ${FOLGE.koexistenz} | Nachfolge (-> B) ${FOLGE.nachfolge} | mehrere moegliche Vorgaenger (-> C) ${FOLGE.mehrereVorgaenger || 0} | auf einen Kandidaten eingegrenzt ${FOLGE.eingegrenzt} | nicht entscheidbar ${FOLGE.offen}`);
console.log(`Wikipedia-Belege DDR (${Object.keys(WIKI_DDR).length} Namen): C-Vorschlag bestaetigt -> B ${WIKI_STAT.bestaetigt} | neu zugeordnet -> B ${WIKI_STAT.neu} | widerspricht sicherer Zuordnung (unveraendert) ${WIKI_STAT.gegenSicher} | widerspricht Koexistenz (unveraendert) ${WIKI_STAT.gegenKoexistenz}`);
WIKI_WIDERSPRUCH.forEach(w => console.log('  ' + w));
console.log(`\nEbene 2-3: ${Object.keys(namen).length} Namen, ${gesamt} Vereinssaisons | Anker-Namensformen: ${Object.keys(ANKER).length} | Korrekturen: ${Object.keys(KORR).length} | Saison-Konflikte: ${konflikte}`);
for (const s of ['K', 'A', 'B', 'C', 'H']) if (st[s]) console.log(`  ${s}: ${st[s].namen} Namen, ${st[s].saisons} Vereinssaisons (${(100 * st[s].saisons / gesamt).toFixed(1)} %)`);
const ids = new Set(Object.values(zu).map(z => z.id).filter(Boolean));
console.log(`Verschiedene IDs mit Ebene-2-3-Historie: ${ids.size} (von ${Object.keys(GD.teams).length} Spielvereinen + ${Object.keys(HC).length} historischen)`);
const bsp = s => Object.entries(zu).filter(([, z]) => z.stufe === s).sort((a, b) => namen[b[0]].saisons - namen[a[0]].saisons).slice(0, 15)
    .map(([n, z]) => `${n} -> ${z.id ? (KBYID.get(z.id)?.name || z.id) : '-'} [${z.grund}${z.kandidaten && z.kandidaten.length && !z.id ? ': ' + z.kandidaten.slice(0, 3).join(', ') : ''}]`);
for (const s of ['B', 'C', 'H']) console.log(`\nBeispiele ${s}:\n  ` + bsp(s).join('\n  '));

fs.writeFileSync(path.join(DIR, 'farchiv_vereine.json'), JSON.stringify({
    stand: new Date().toISOString().slice(0, 10), gegenprobe: probe,
    zuordnung: Object.fromEntries(Object.entries(zu).map(([n, z]) => [n, Object.assign({}, z, { saisons: namen[n].saisons, von: Math.min(...namen[n].jahre), bis: Math.max(...namen[n].jahre) })])),
}, null, 1));
const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const saisonStr = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
// Korrigierte Zeilen (K) stehen OBEN und behalten ihren Eintrag, damit sie beim naechsten Lauf nicht verschwinden
const ORDNUNG = { K: -1, C: 0, B: 1, H: 2 };
const unbekannt = Object.entries(KORR).filter(([, id]) => id && !KBYID.has(id));
if (unbekannt.length) console.log('WARNUNG Korrektur-IDs, die es nicht gibt: ' + unbekannt.map(([n, id]) => `"${n}" -> ${id}`).join(' | '));
const zeilen = Object.entries(zu).filter(([, z]) => z.stufe !== 'A')
    .sort((a, b) => ORDNUNG[a[1].stufe] - ORDNUNG[b[1].stufe] || namen[b[0]].saisons - namen[a[0]].saisons)
    .map(([n, z]) => [z.stufe, n, namen[n].saisons, saisonStr(Math.min(...namen[n].jahre)) + '–' + saisonStr(Math.max(...namen[n].jahre)), [...namen[n].ligen].slice(0, 3).join(' / '),
        z.id || '', z.id ? (KBYID.get(z.id)?.name || '') : '', (z.kandidaten || []).join(' | '), z.grund, z.stufe === 'K' ? (z.id || '-') : ''].map(q).join(';'));
const kopf = ['Stufe', 'f-archiv-Name', 'Vereinssaisons', 'Zeitraum', 'Ligen', 'Vorschlag-ID', 'Vorschlag-Name', 'Alternativen', 'Grund', 'Korrektur-ID (leer = Vorschlag, - = keiner)'].map(q).join(';');
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/farchiv_zuordnung_pruefliste.csv'), '﻿' + [kopf, ...zeilen].join('\r\n'));
console.log(`\n-> tools/farchiv_vereine.json | docs/farchiv_zuordnung_pruefliste.csv (${zeilen.length} Zeilen: Stufen C, B, H)`);
