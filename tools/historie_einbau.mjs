// EINBAU: Dry-Run-Ergebnis (Ebene 2-3 vor dem Sim-Start) -> app/history_ext.js
//
//   node tools/historie_dryrun.mjs      (erzeugt tools/_dryrun/seed_erweiterung.json)
//   node tools/historie_einbau.mjs      (schreibt app/history_ext.js)
//
// Die Tabellen kommen gzip+base64 in die Datei und werden erst bei Bedarf entpackt (app/hist_ext.js).
// Ligen, Vereinsnamen und Era-Namen bleiben lesbar, weil Suche, Seitenleiste und Namensanzeige sie sofort brauchen.
// Nutzerentscheidungen 14.09.2026: geschaetzte S/U/N tragen e:1; DDR-Vereine stehen beim HEUTIGEN Nachfolger,
// der damalige Name kommt ueber HISTORIC_NAMES je Saison.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HN = globalThis.HISTORIC_NAMES;
const X = JSON.parse(fs.readFileSync(path.join(DIR, '_dryrun/seed_erweiterung.json'), 'utf8'));
const slug = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const sy = y => parseInt(y);
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const log = (...a) => console.log(...a);

// DDR-Vereine des bestehenden Seeds, deren heutiger Nachfolger laut Wikipedia ein Spielverein ist
// (tools/wiki_ddr_vorgaenger.mjs, docs/HISTORIE_DRYRUN.md "Offen 4a"). Die Engine stellt alte Spielstaende damit um.
const REMAP = {
    hist_lichtenberg47: 'svlichtenberg47_707',
    hist_fortschrittbischofswerda: 'bischofswerdaerfv08_836',
    hist_fortschrittweissenfels: 'sscweissenfels_850',
    hist_rotationbabelsberg: 'fortunababelsberg_754',
    hist_asgvorwaertsstralsund: 'tsv1860stralsund_739',
};
Object.entries(REMAP).forEach(([a, b]) => { if (!HC[a] || !GD.teams[b]) throw new Error('REMAP ungueltig: ' + a + ' -> ' + b); });
// Koexistenz schlaegt Wikipedia: spielen alter und neuer Verein in derselben Saison, ist der alte nicht der Vorgaenger
// (Vorwaerts Stralsund 1978/79 neben Motor Stralsund = TSV 1860). Dann bleibt die hist-ID.
for (const [a, b] of Object.entries(REMAP)) {
    const zugleich = [...X.seasons, ...SEED.seasons].find(s => { const ids = s.table.map(r => r.id); return ids.includes(a) && ids.includes(b); })
        || X.seasons.find(s => X.seasons.some(t => t !== s && t.y === s.y && t.table.some(r => r.id === a)) && s.table.some(r => r.id === b));
    if (zugleich) { console.log(`REMAP ${a} -> ${b} entfaellt: beide spielen ${zugleich.y}`); delete REMAP[a]; }
}

// Ebene 4-5 seit 2008 aus Wikipedia (tools/wiki_ebene45.mjs): Saisons unter den heutigen Liga-IDs 4-x/5-x,
// nicht mehr bestehende Ligen als historische IDs. Wikipedia-Namen sind schon zugeordnet.
const W45 = fs.existsSync(path.join(DIR, 'wiki_ebene45.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_ebene45.json'), 'utf8')) : null;
if (W45) {
    Object.assign(X.ligen, W45.ligen);
    for (const [id, nm] of Object.entries(W45.vereine)) X.vereine[id] = nm;
    const da = new Set(X.seasons.map(s => s.y + '|' + s.lid));
    W45.seasons.forEach(s => { if (!da.has(s.y + '|' + s.lid)) X.seasons.push({ y: s.y, lid: s.lid, table: s.table, vr: s.vr, kumS: s.kumS, kumT: s.kumT, abbruch: s.abbruch, doppel: s.doppel }); });
}
const LIGEN = X.ligen;
const gebietOf = lid => LIGEN[lid] ? LIGEN[lid].gebiet : 'BRD';
const stat = { eraId: 0, seedId: 0, remap: 0, leer: 0, geschaetztNachtrag: 0, staffel: 0 };

// ---- 1. Vereins-IDs nachschaerfen ----
// (a) Name der Quelle = Era-Name eines Spielvereins in genau dieser Saison (DJK Guetersloh 1968 -> FC Guetersloh)
const eraIdx = {};
for (const [id, eras] of Object.entries(HN)) for (const e of eras) {
    const von = e.from ? sy(e.from) : 1900, bis = e.to ? sy(e.to) : 2100;
    (eraIdx[slug(e.name)] = eraIdx[slug(e.name)] || []).push({ id, von, bis });
}
// (b) Name der Quelle = hist_-Verein des bestehenden Seeds (dieselbe Namensform, DDR-Oberligist in der DDR-Liga)
const seedHist = {};
for (const [id, nm] of Object.entries(HC)) if (!id.startsWith('hist_fa_')) (seedHist[slug(nm)] = seedHist[slug(nm)] || []).push(id);
for (const s of X.seasons) {
    const y = sy(s.y), belegt = new Set(s.table.map(r => r.id));
    for (const r of s.table) {
        if (!r.id.startsWith('hist_fa_') || !r.nm) continue;
        const k = slug(r.nm);
        const era = (eraIdx[k] || []).filter(e => y >= e.von && y <= e.bis);
        const cand = era.length === 1 ? era[0].id : (seedHist[k] || []).length === 1 ? seedHist[k][0] : null;
        if (!cand || belegt.has(cand) || belegt.has(REMAP[cand])) continue;
        if (era.length === 1) stat.eraId++; else stat.seedId++;
        belegt.add(cand); r.id = cand;
    }
    for (const r of s.table) if (REMAP[r.id]) { r.id = REMAP[r.id]; stat.remap++; }
}
// (c) BRD: Amateur-/Reserveteams ("VfL Bochum A", "VfB Stuttgart" neben dem Bundesligisten = hist_*_2) zur II-Mannschaft;
//     ab 1991 ein eindeutiges Namens-Praefix zum Spielverein ("SV Babelsberg" -> "SV Babelsberg 03").
const TEAMS = Object.values(GD.teams);
const zuordnungC = {};
for (const s of X.seasons) {
    if (gebietOf(s.lid) !== 'BRD') continue;
    const y = sy(s.y), belegt = new Set(X.seasons.filter(t => t.y === s.y).flatMap(t => t.table.map(r => r.id)));
    SEED.seasons.filter(t => t.y === s.y).forEach(t => t.table.forEach(r => belegt.add(r.id)));
    for (const r of s.table) {
        if (!r.id.startsWith('hist_fa_') || !r.nm) continue;
        const reserve = (/\s(A|Amateure|Amat\.?|Am\.?|II)$/.test(r.nm.trim()) && !/jeddeloh/i.test(r.nm)) || /_2$/.test(r.id);
        const basis = slug(r.nm.trim().replace(/\s(A|Amateure|Amat\.?|Am\.?|II)$/, ''));
        let cand = null;
        if (reserve) {
            let main = TEAMS.filter(t => !t.isReserve && slug(t.name) === basis);
            if (!main.length) main = TEAMS.filter(t => !t.isReserve && slug(t.name).startsWith(basis) && TEAMS.some(q => q.isReserve && q.parentId === t.id));
            const res = main.length === 1 ? TEAMS.filter(t => t.isReserve && t.parentId === main[0].id) : [];
            if (res.length === 1) cand = res[0].id;
        } else if (y >= 1991 && basis.length >= 6) {
            const c = TEAMS.filter(t => !t.isReserve && (slug(t.name).startsWith(basis) || basis.startsWith(slug(t.name))));
            if (c.length === 1) cand = c[0].id;
        }
        if (!cand || belegt.has(cand)) continue;
        belegt.add(cand); zuordnungC[r.nm + ' -> ' + GD.teams[cand].name] = (zuordnungC[r.nm + ' -> ' + GD.teams[cand].name] || 0) + 1;
        r.id = cand;
    }
}
log('Reserve/Praefix: ' + Object.entries(zuordnungC).map(([k, v]) => v + 'x ' + k).join(' | '));

// ---- 1d. Dubletten zusammenlegen ----
// Dieselbe Mannschaft steht je nach Quelle unter verschiedenen Schreibweisen ("1.FC Bamberg"/"1. FC Bamberg",
// "Rot-Weiß Erfurt II"/"FC Rot-Weiß Erfurt II") und bekam so zwei IDs. Automatisch zusammengelegt wird nur, wenn
//   (a) die Namen bis auf Vereinsform, Jahreszahl (1889 = 89) und Schreibweise gleich sind – einer steckt ganz im anderen – und
//   (b) beide NIE in derselben Saison spielen (sonst sind es zwei Vereine: "TuS Celle" neben "FC Celle").
// Echte Umbenennungen ohne gemeinsamen Namensteil ("SB Heidenheim" -> 1. FC Heidenheim 1846) stehen von Hand in
// tools/hist_alias.json (Name -> Ziel-ID); bewusst getrennt Gelassenes in tools/hist_alias_getrennt.json (nur Bericht).
// Schreibvarianten (tools/hist_schreibweise.json) wirken wie ein Alias, zeigen aber keinen damaligen Namen.
// Fusionen (tools/hist_fusion.json): Vorgaenger behalten ihre IDs und werden nie automatisch zusammengelegt.
const liesJ = f => { try { const o = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); delete o._hinweis; return o; } catch (e) { return {}; } };
const SCHREIB = liesJ('hist_schreibweise.json'), FUSION = liesJ('hist_fusion.json');
const ALIAS = Object.assign(liesJ('hist_alias.json'), SCHREIB);
const FGRUPPE = {};   // ID -> Nachfolger-ID ihrer Fusion (Nachfolger und Vorgaenger)
for (const [nf, f] of Object.entries(FUSION)) { FGRUPPE[nf] = nf; f.vorgaenger.forEach(v => FGRUPPE[v] = nf); }
let teilmengeNamen = null;
const eraExtra = [];   // [id, jahr, damaliger Name] für HISTORIC_NAMES (auch BRD, wenn der alte Name abweicht)
{
    const AB = { ts: 'turnerschaft', tus: 'turnundsport', tsv: 'turnundsport', sb: 'sportbund', sv: 'sportverein', sg: 'sportgemeinschaft',
        bv: 'ballspiel', bsv: 'ballspiel', fv: 'fussballverein', fc: 'fussballclub', sc: 'sportclub', spvgg: 'spielvereinigung', spvg: 'spielvereinigung',
        vfb: 'bewegungsspiele', vfl: 'leibesuebungen', vfr: 'rasenspiele', mtv: 'maennerturn', tv: 'turnverein', tg: 'turngemeinde' };
    const FORMW = new Set(Object.keys(AB).concat(Object.values(AB)).concat(['e', 'v', '1', 'i', 'fussball', 'club', 'verein', 'und', 'von', 'der', 'die', 'im', 'in', 'turn', 'sport']));
    // A, Am., Amat., Amateure = II. Ausnahme Jeddeloh II: der Name des ersten Teams, keine Reserve
    const RES0 = /(\s(III|II|2|U ?2[123]|Amateure|Amat\.?|Am\.?|A))$/i;
    const RES = { test: n => !/jeddeloh/i.test(n) && RES0.test(n), [Symbol.replace]: (n, r) => /jeddeloh/i.test(n) ? n : n.replace(RES0, r) };
    const wort = n => String(n).toLowerCase().replace(/\.(?=[a-z])/g, '')   // "F.C. Hansa" = "FC Hansa".replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss').replace(/gruen[\s-]*wei(ss|s)/g, 'gruenweiss')
        .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')   // "1FC" = "1. FC"
        .split(/[^a-z0-9]+/).filter(Boolean).map(w => AB[w] || w).map(w => /^(18|19)\d\d$/.test(w) ? w.slice(2) : w);
    const stammW = w => w.length >= 4 ? w.replace(/er$/, '').replace(/e$/, '') : w;
    const kernW = n => wort(n.replace(RES, '')).filter(w => !FORMW.has(w) && !/^\d+$/.test(w)).map(stammW);
    const alleW = n => wort(n.replace(RES, '')).map(stammW);
    const res = n => RES.test(String(n).trim());

    // Auftritte je ID (nur Erweiterung; der Seed ist die Referenz und wird nicht umbenannt)
    const info = {};
    const merkeA = (id, y, nm) => { const a = info[id] = info[id] || { jahre: new Set(), namen: {}, n: 0 }; a.jahre.add(y); a.n++; if (nm) a.namen[nm] = (a.namen[nm] || 0) + 1; };
    for (const s of X.seasons) { const y = sy(s.y);
        for (const r of s.table) merkeA(r.id, y, r.nm);
        for (const v of (s.vr || [])) for (const r of v.rows) merkeA(r.id, y, r.nm);
    }
    for (const s of SEED.seasons) for (const r of s.table) merkeA(r.id, sy(s.y), null);
    const nameVon = id => { const a = info[id]; const n = a && Object.entries(a.namen).sort((x, y2) => y2[1] - x[1] || y2[0].length - x[0].length)[0];
        return (n && n[0]) || X.vereine[id] || (GD.teams[id] || {}).name || HC[id] || id; };

    // Kandidatenpaare über gleichen Namenskern
    const eimer = {};
    for (const id of Object.keys(info)) { const k = kernW(nameVon(id)).slice().sort().join(' ') + (res(nameVon(id)) ? '|R' : ''); if (k.trim()) (eimer[k] = eimer[k] || []).push(id); }
    const ziel = {};
    const find = id => { while (ziel[id] && ziel[id] !== id) id = ziel[id]; return id; };
    teilmengeNamen = (a, b) => { const A = alleW(a), B = alleW(b); const gross = A.length >= B.length ? A : B, klein = A.length >= B.length ? B : A;
        const rest = gross.slice(); return klein.every(w => { const i = rest.indexOf(w); if (i < 0) return false; rest.splice(i, 1); return true; })
            && rest.every(w => FORMW.has(w) || /^\d+$/.test(w)); };
    let zusammen = 0; const bsp = [];
    for (const arr of Object.values(eimer)) {
        if (arr.length < 2) continue;
        for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
            const a = find(arr[i]), b = find(arr[j]); if (a === b) continue;
            if (FGRUPPE[a] && FGRUPPE[a] === FGRUPPE[b]) continue;   // Fusion: Vorgaenger bleiben eigene Vereine
            const na = nameVon(a), nb = nameVon(b);
            if (res(na) !== res(nb) || !teilmengeNamen(na, nb)) continue;
            if ([...info[a].jahre].some(y => info[b].jahre.has(y))) continue;   // gleiche Saison -> zwei Vereine
            // Ziel: der Spielverein, sonst die ID mit den meisten Zeilen
            const [ab, weg] = GD.teams[a] ? [a, b] : GD.teams[b] ? [b, a] : (info[a].n >= info[b].n ? [a, b] : [b, a]);
            ziel[weg] = ab; if (FGRUPPE[weg] && !FGRUPPE[ab]) FGRUPPE[ab] = FGRUPPE[weg]; info[ab].jahre = new Set([...info[ab].jahre, ...info[weg].jahre]); info[ab].n += info[weg].n;
            Object.entries(info[weg].namen).forEach(([nm, c]) => info[ab].namen[nm] = (info[ab].namen[nm] || 0) + c);
            zusammen++; if (bsp.length < 20) bsp.push(`${nameVon(weg)} -> ${nameVon(ab)}`);
        }
    }
    // Name -> ID (fuer Alias-Eintraege, die einen anderen Namen als Ziel nennen)
    const nameId = {};
    for (const id of Object.keys(info)) for (const nm of Object.keys(info[id].namen)) if (!nameId[nm] || info[nameId[nm]].n < info[id].n) nameId[nm] = find(id);
    // Aliase von Hand (Name -> Ziel-ID) haben Vorrang und gelten auch ohne gemeinsamen Namensteil
    let vonHand = 0;
    for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
        // Ziel darf eine ID oder ein anderer NAME sein ("FV Oetigheim": "FC Ötigheim") – der Name wird zur ID aufgeloest
        let zielId = r.nm && ALIAS[r.nm] ? ALIAS[r.nm] : null;
        // tools/hist_dubletten.html entscheidet nach dem Vereinsnamen der ID, nicht nach dem Zeilennamen
        // ("Torgelower SV Greif" steht 1990/91 als "Greif Torgelow" da); nie auf ein Ziel, das in derselben Tabelle steht
        const idName = X.vereine[find(r.id)];
        if (!zielId && idName && ALIAS[idName]) { const z = ALIAS[idName]; if (!liste.some(o => o !== r && (o.id === z || o.nm === z))) zielId = z; }
        // Ketten folgen: "SV Merseburg 99" -> "1. FC Merseburg" -> vfbmerseburg_897
        for (const weg = new Set([r.nm]); zielId && ALIAS[zielId] && !weg.has(zielId);) { weg.add(zielId); zielId = ALIAS[zielId]; }
        if (zielId && !info[zielId] && !GD.teams[zielId] && nameId[zielId]) zielId = nameId[zielId];
        // Ziel-Name, der nur im Seed steht ("BSV 07 Schwenningen" = hist_bsv07schwenningen)
        if (zielId && !info[zielId] && !GD.teams[zielId] && !HC[zielId]) zielId = Object.keys(HC).find(id => HC[id] === zielId) || zielId;
        const vorher = r.id;
        // Ziel-ID darf ein neuer historischer Verein sein (falsche Zuordnung trennen): Name gleich mitschreiben
        if (zielId && zielId.startsWith('hist_') && !X.vereine[zielId] && !HC[zielId]) X.vereine[zielId] = r.nm;
        // Alias auf die eigene ID ("SV Merseburg": hist_fa_svmerseburg) haelt die Zeile aus der Automatik heraus
        if (zielId) { if (zielId !== r.id) { r.id = zielId; vonHand++; } }
        else { const z = find(r.id); if (z !== r.id) r.id = z; }
        // NUR bei Zusammenlegung/Alias: der damalige Name weicht vom heutigen ab -> in der damaligen Tabelle so zeigen
        if (r.id !== vorher && r.nm && !SCHREIB[r.nm] && GD.teams[r.id] && slug(r.nm) !== slug(GD.teams[r.id].name) && !teilmengeNamen(r.nm, GD.teams[r.id].name)) eraExtra.push([r.id, sy(s.y), r.nm]);
    }
    for (const id of Object.keys(X.vereine)) if (find(id) !== id || Object.values(ALIAS).includes(id)) { /* Name bleibt am Ziel */ }
    // Steht fuer einen Spielverein ein damaliger Name fest, gelten auch seine uebrigen alten Namen (Heidenheim 1972-76
    // stand schon unter der richtigen ID, hiess damals aber "Heidenheimer SB")
    const mitEra = new Set(eraExtra.map(e => e[0]));
    for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste)
        if (mitEra.has(r.id) && r.nm && !SCHREIB[r.nm] && slug(r.nm) !== slug(GD.teams[r.id].name) && !teilmengeNamen(r.nm, GD.teams[r.id].name)) eraExtra.push([r.id, sy(s.y), r.nm]);
    log(`Dubletten zusammengelegt: ${zusammen} automatisch (${bsp.join(' | ')}${zusammen > bsp.length ? ' …' : ''}), ${vonHand} Zeilen per tools/hist_alias.json`);
}

// ---- 2. Staffelnamen vereinheitlichen ----
// Die Quelle benennt nur manche Staffeln ("Tabellen"/"1" = unbenannt). Himmelsrichtungen ergaenzen, sonst durchzaehlen.
const RICHTUNG = ['Nord', 'Mitte', 'Süd', 'Ost', 'West'];
for (const s of X.seasons) {
    // Zwei Staffeln unter demselben Namen (Verbandsliga Westfalen: beide "Tabellen") erkennt man am Neubeginn bei Platz 1
    const teil = {}, letzter = {};
    for (const r of s.table) {
        const k = r.g || '';
        if (r.rank === 1 && letzter[k] > 1) teil[k] = (teil[k] || 1) + 1;
        letzter[k] = r.rank;
        if (teil[k]) r.g = k + '#' + teil[k];
        else if (Object.keys(teil).length === 0) r.__vorn = true;
    }
    for (const r of s.table) { if (r.__vorn && teil[r.g || '']) r.g = (r.g || '') + '#1'; delete r.__vorn; }
    const labels = [...new Set(s.table.map(r => r.g).filter(Boolean))];
    if (labels.length < 2) { s.table.forEach(r => delete r.g); continue; }
    const benannt = labels.filter(l => RICHTUNG.includes(l) || /^[A-E]$/.test(l) || /runde$/.test(l));   // Meister-/Abstiegsrunde bleiben
    const unbenannt = labels.filter(l => !benannt.includes(l));
    const map = {};
    if (!unbenannt.length) labels.forEach(l => map[l] = l);
    else if (unbenannt.length === 1 && benannt.length) {
        const rest = benannt.includes('Nord') && benannt.includes('Süd') ? 'Mitte' : benannt.includes('West') ? 'Ost' : benannt.includes('Ost') ? 'West' : benannt.includes('Nord') ? 'Süd' : 'Nord';
        labels.forEach(l => map[l] = benannt.includes(l) ? l : rest);
    } else labels.forEach((l, i) => map[l] = String(i + 1));
    s.table.forEach(r => { if (r.g !== map[r.g]) stat.staffel++; r.g = map[r.g]; });
}

// ---- 3. Zeilen ohne S/U/N ----
for (const s of X.seasons) for (const r of s.table) {
    if (r.s != null) continue;
    if (r.sp > 0 && r.p != null && sy(s.y) < 1995) {
        // 2-Punkte-Saison ohne Minuspunkte (eine Zeile): Remisquote der Liga-Saison, Punkte fest
        const bek = s.table.filter(q => q.s != null && q.s + q.u + q.n > 0);
        const q = bek.reduce((a, x) => a + x.u, 0) / Math.max(1, bek.reduce((a, x) => a + x.s + x.u + x.n, 0));
        let sv = Math.round((r.p - q * r.sp) / 2); sv = Math.max(Math.max(0, r.p - r.sp), Math.min(Math.floor(r.p / 2), sv));
        Object.assign(r, { s: sv, u: r.p - 2 * sv, n: r.sp - r.p + sv, e: 1 }); stat.geschaetztNachtrag++;
    } else { Object.assign(r, { s: 0, u: 0, n: 0, gf: r.gf || 0, ga: r.ga || 0 }); stat.leer++; } // zurueckgezogen: 0 Spiele, zaehlt nirgends
}
// Tore fehlen in der Quelle (1. SC Norderstedt 1993/94): 0:0 statt NaN in den Summen
for (const s of X.seasons) for (const r of s.table) { if (r.gf == null) r.gf = 0; if (r.ga == null) r.ga = 0; }

// ---- 4. Era-Namen (DDR) ----
// Spielverein + DDR-Tabelle + Name der Quelle weicht vom heutigen ab -> damaliger Name je Saison.
// Bestehende HISTORIC_NAMES bleiben vorn (App._histClubName nimmt den ersten Treffer), hier nur Jahre ohne Eintrag.
const REVERSE = Object.fromEntries(Object.entries(REMAP).map(([a, b]) => [b, a]));
const hatEra = (id, y) => (HN[id] || []).some(e => y >= (e.from ? sy(e.from) : -1e9) && y <= (e.to ? sy(e.to) : 1e9));
const jahrName = {}; // id -> {y: name}
const merke = (id, y, nm, immer) => {
    if (!GD.teams[id] || !nm || (!immer && y > 1990) || hatEra(id, y)) return;
    const heute = GD.teams[id].name;
    if (slug(nm) === slug(heute)) return;
    const j = jahrName[id] = jahrName[id] || {};
    if (!j[y]) j[y] = nm;
};
for (const s of X.seasons) if (gebietOf(s.lid) === 'DDR') for (const r of s.table) merke(r.id, sy(s.y), r.nm);
// aus Zusammenlegung/Alias: der damalige Name eines Spielvereins, auch in der BRD und nach 1990 ("SB Heidenheim")
eraExtra.forEach(([id, y, nm]) => merke(id, y, nm, true));
// Seed-Namen (DDR-Oberliga) erst NACH dem Vereinheitlichen dazu: "SC Fortschritt Weissenfels" (Oberliga 1955-60) darf nicht
// zur Schreibweise der Bezirksliga-Jahre werden, in denen der Verein BSG hiess.
const seedNamen = [];
for (const s of SEED.seasons) if (s.lid === 'ddr1') for (const r of s.table) if (REVERSE[r.id] || REMAP[r.id]) {
    const neu = REMAP[r.id] || r.id; seedNamen.push([neu, sy(s.y), HC[REVERSE[neu]]]);
}
// Schreibvarianten derselben Namensform vereinheitlichen: mit/ohne DDR-Praefix ("BSG Fortschritt Bischofswerda") und
// Tippfehler der Quelle ("Wismut Pima-Copitz"). Vertreter: mit Praefix vor ohne, dann haeufigster, dann laengster.
const PRAEFIX = /^(bsg|sg|asg|tsg|hsg|zsg|ksg|sc)(?=[a-z])/;
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length]; };
let varianten = 0;
for (const j of Object.values(jahrName)) {
    const zahl = {}; Object.values(j).forEach(n => zahl[n] = (zahl[n] || 0) + 1);
    const formen = Object.keys(zahl), kern = n => slug(n).replace(PRAEFIX, '');
    const pf = n => (slug(n).match(PRAEFIX) || [''])[0];
    // SC -> SG Lichtenberg 47 ist ein echter Namenswechsel: zwei VERSCHIEDENE Praefixe bleiben getrennt
    // dieselbe Namensform anders geschrieben oder umgestellt zaehlt auch: "SB Heidenheim" = "Heidenheimer SB"
    const gleich = (a, b) => (!(pf(a) && pf(b) && pf(a) !== pf(b)) && (kern(a) === kern(b) || lev(kern(a), kern(b)) <= 2))
        || (!!teilmengeNamen && teilmengeNamen(a, b));
    const rang = n => [PRAEFIX.test(slug(n)) ? 1 : 0, zahl[n], n.length];
    const besser = (a, b) => { const x = rang(a), y = rang(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
    const vertreter = {};
    for (const n of formen) { let v = n; for (const m of formen) if (gleich(n, m) && besser(m, v)) v = m; vertreter[n] = v; }
    for (const y in j) if (vertreter[j[y]] !== j[y]) { j[y] = vertreter[j[y]]; varianten++; }
}
seedNamen.forEach(([id, y, nm]) => merke(id, y, nm));
// Liegen die Seed-Jahre INNERHALB des Zeitraums derselben Namensform ohne Praefix (Bischofswerda: Oberliga 1986/87 und
// 1989/90 mitten in den Bezirksliga-/Liga-Jahren), gilt die Praefix-Form fuer den ganzen Zeitraum.
for (const j of Object.values(jahrName)) {
    const kern = n => slug(n).replace(PRAEFIX, '');
    const jahreVon = n => Object.keys(j).filter(y => j[y] === n).map(Number);
    for (const mit of new Set(Object.values(j))) {
        if (!PRAEFIX.test(slug(mit))) continue;
        for (const ohne of new Set(Object.values(j))) {
            if (ohne === mit || PRAEFIX.test(slug(ohne)) || kern(ohne) !== kern(mit)) continue;
            const a = jahreVon(ohne), b = jahreVon(mit);
            if (Math.min(...b) > Math.min(...a) && Math.max(...b) < Math.max(...a)) a.forEach(y => j[y] = mit);
        }
    }
}
const namen = {};
for (const [id, j] of Object.entries(jahrName)) {
    const ys = Object.keys(j).map(Number).sort((a, b) => a - b), runs = [];
    for (const y of ys) {
        const last = runs[runs.length - 1];
        // gleicher Name mit Luecke (Saison in keiner erfassten Liga) bleibt ein Zeitraum, solange kein anderer Eintrag dazwischen liegt
        if (last && last.name === j[y] && ![...Array(y - last.bis - 1)].some((_, i) => hatEra(id, last.bis + 1 + i))) last.bis = y;
        else runs.push({ von: y, bis: y, name: j[y] });
    }
    namen[id] = runs.map(r => ({ from: saison(r.von), to: saison(r.bis), name: r.name }));
}

// ---- 5. Ligen fuer Seitenleiste/Archiv ----
const REGION = {
    bremen: 'Nord', hamburg: 'Nord', niedersachsen: 'Nord', schleswigholstein: 'Nord', nord: 'Nord',
    berlin: 'Berlin', nordost: 'Nordost', nrw: 'West',
    niederrhein: 'West', mittelrhein: 'West', westfalen: 'West', nordrhein: 'West', west: 'West', westsuedwest: 'West',
    rheinland: 'Südwest', saarland: 'Südwest', suedwest: 'Südwest',
    hessen: 'Süd', bayern: 'Süd', nordbaden: 'Süd', suedbaden: 'Süd', nordwuerttemberg: 'Süd', schwarzwaldbodensee: 'Süd', badenwuerttemberg: 'Süd', sued: 'Süd',
};
const REGION_ORD = ['Nord', 'Berlin', 'Nordost', 'West', 'Südwest', 'Süd'];
// DDR-Bezirke in amtlicher Reihenfolge (I Rostock ... XV Berlin)
const BEZIRKE = ['rostock', 'schwerin', 'neubrandenburg', 'potsdam', 'frankfurtoder', 'cottbus', 'magdeburg', 'halle', 'erfurt', 'gera', 'suhl', 'dresden', 'leipzig', 'karlmarxstadt', 'berlin'];
const KURZ = { Bayernliga: 'OL', 'NRW-Liga': 'OL', Regionalliga: 'RL', Amateurliga: 'AL', Amateuroberliga: 'AOL', Verbandsliga: 'VL', Landesliga: 'LL', Oberliga: 'OL', Bezirksliga: 'BZL', 'DDR-Liga': 'DDR2' };
const ligen = {};
const jahre = {};
X.seasons.forEach(s => { if (s.lid !== '3') (jahre[s.lid] = jahre[s.lid] || new Set()).add(sy(s.y)); });
for (const [lid, l] of Object.entries(LIGEN)) {
    const ys = [...jahre[lid]].sort((a, b) => a - b);
    const verband = lid.split('-')[1], typ = l.name.split(' ')[0];
    const ddr = l.gebiet === 'DDR';
    const epoche = ddr ? 'ddr' : l.firstYear < 1974 ? 'brd1' : l.firstYear < 1994 ? 'brd2' : l.firstYear < 2008 ? 'brd3' : 'brd4';
    const region = ddr ? (l.level === 2 ? 'DDR' : 'Bezirke') : (REGION[verband] || 'Süd');
    const ord = ddr ? (l.level === 2 ? 0 : 1 + BEZIRKE.indexOf(verband)) : REGION_ORD.indexOf(region) * 100 + (l.name.localeCompare ? 0 : 0);
    if (ddr && l.level === 3 && !BEZIRKE.includes(verband)) throw new Error('Bezirk unbekannt: ' + lid);
    ligen[lid] = { id: lid, name: l.name, level: l.level, gebiet: l.gebiet, epoche, region, ord, kurz: KURZ[typ] || typ.slice(0, 3).toUpperCase(),
        firstYear: ys[0], lastYear: ys[ys.length - 1], jahre: ys.length === ys[ys.length - 1] - ys[0] + 1 ? undefined : ys };
}

// ---- 6. Vereine (nur benutzte hist_fa_), Anzeigename ohne Zuordnungs-Zusatz ----
const benutzt = new Set();
X.seasons.forEach(s => s.table.forEach(r => benutzt.add(r.id)));
const vereine = {};
for (const [id, nm] of Object.entries(X.vereine)) if (benutzt.has(id)) vereine[id] = nm.replace(/ \((?:2\. Mannschaft\/)?Namensvetter\)$/, '')
    .replace(/\s(A|Amateure|Amat\.?|Am\.?)$/, m => /jeddeloh/i.test(nm) ? m : ' II');
const unbekannt = [...benutzt].filter(id => !GD.teams[id] && !HC[id] && !vereine[id]);
if (unbekannt.length) throw new Error('IDs ohne Namen: ' + unbekannt.slice(0, 10).join(', '));
// Fusionen: jede ID muss nach dem Zusammenlegen noch existieren, sonst zeigt der Steckbrief ins Leere
for (const [nf, fu] of Object.entries(FUSION)) for (const id of [nf, ...fu.vorgaenger])
    if (!GD.teams[id] && !HC[id] && !vereine[id]) throw new Error('hist_fusion.json: ' + id + ' gibt es nicht (zusammengelegt oder vertippt?)');

// ---- 6b. Eine ID darf je Saison nur in EINER Liga stehen (Seed + Erweiterung) ----
{
    const proJahr = {};
    SEED.seasons.forEach(s => s.table.forEach(r => (proJahr[sy(s.y)] = proJahr[sy(s.y)] || new Map()).set(r.id, 'Seed ' + s.lid)));
    let doppelt = 0; const bsp = [];
    for (const s of X.seasons) {
        const m = proJahr[sy(s.y)] = proJahr[sy(s.y)] || new Map();
        for (const r of s.table) {
            if (m.has(r.id) && m.get(r.id) !== s.lid) {
                doppelt++; if (bsp.length < 12) bsp.push(`${s.y} ${r.nm || r.id} in ${s.lid} und ${m.get(r.id)}`);
                // eigene hist-ID (wie Dry-Run 4b): lieber ein Verein zu viel als einer an zwei Orten zugleich
                const neu = 'hist_wk_' + slug(r.nm || r.id) + '_dp';
                vereine[neu] = r.nm || r.id; r.id = neu;
            }
            m.set(r.id, s.lid);
        }
    }
    log(`Doppelbelegung ueber Ligen aufgeloest: ${doppelt}${bsp.length ? ' - ' + bsp.join(' | ') : ''}`);
}

// ---- 7. Tabellen packen ----
const zeile = r => ({ id: r.id, rank: r.rank, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga });
// Covid-Saisons: vr = Vorrunde (eigener Block), kumS/kumT = Endrunde enthaelt S/U/N bzw. Tore schon mit Vorrunde
const tabellen = X.seasons.map(s => Object.assign({ y: s.y, lid: s.lid }, s.abbruch ? { abbruch: 1 } : {}, s.doppel ? { doppel: s.doppel } : {}, s.vr ? { vr: s.vr.map(v => ({ g: v.g, rows: v.rows.map(zeile) })), kumS: s.kumS ? 1 : 0, kumT: s.kumT ? 1 : 0 } : {}, { rows: s.table.map(r => {
    const o = zeile(r);
    if (r.gr != null) o.gr = r.gr;   // Platz in der Runde (rank ist durchnummeriert)
    if (r.b != null) o.b = r.b;      // mitgenommene Vorrunden-Punkte
    if (r.g) o.g = r.g;
    if (r.p2) o.p2 = r.p2; else if (r.p != null) o.p = r.p;
    if (r.sp != null && r.sp !== r.s + r.u + r.n) o.sp = r.sp;
    if (r.est || r.e) o.e = 1;
    return o;
}) }));
// Doppelbelegung darf es nicht geben (eine ID zweimal in einer Liga-Saison)
for (const t of tabellen) { const ids = t.rows.map(r => r.id); if (new Set(ids).size !== ids.length) {
    const d = ids.find((id, i) => ids.indexOf(id) !== i);
    throw new Error('Doppelbelegung ' + t.y + ' ' + t.lid + ': ' + d + ' = ' + t.rows.filter(r => r.id === d).map(r => r.nm || '?').join(' + ') + ' (Alias pruefen)'); } }
const json = JSON.stringify(tabellen);
const gz = zlib.gzipSync(Buffer.from(json), { level: 9 }).toString('base64');
const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
const zeilen = tabellen.reduce((a, t) => a + t.rows.length, 0);
const est = tabellen.reduce((a, t) => a + t.rows.filter(r => r.e).length, 0);

const kopf = `// ERZEUGT von tools/historie_einbau.mjs – nicht von Hand ändern.
// Historische Ligen Ebene 2–3 vor dem Sim-Start (BRD 1963–2024, DDR 1963–1991) aus f-archiv, Wikipedia und ifosta.de.
// ${tabellen.length} Liga-Saisons, ${zeilen} Vereinssaisons (davon ${est} mit geschätzten S/U/N, Kennung e:1).
// Die Tabellen stehen gzip+base64 in "gz" und werden erst bei Bedarf entpackt (app/hist_ext.js).
// remap: DDR-Vereine des Seeds -> heutiger Nachfolger (die Engine stellt alte Spielstände um).
`;
const out = kopf + 'var HIST_EXT = {\n'
    + `    version: ${JSON.stringify(version)},\n`
    + `    remap: ${JSON.stringify(REMAP)},\n`
    + `    hoch2008: ${JSON.stringify(W45 ? W45.hoch2008 : {})},\n`
    + `    ligen: {\n${Object.values(ligen).map(l => '        ' + JSON.stringify(l.id) + ': ' + JSON.stringify(l)).join(',\n')}\n    },\n`
    + `    vereine: ${JSON.stringify(vereine)},\n`
    + `    namen: ${JSON.stringify(namen)},\n`
    + `    fusion: ${JSON.stringify(FUSION)},\n`
    + `    gz: "${gz}"\n};\n`;
fs.writeFileSync(path.join(ROOT, 'app/history_ext.js'), out);
log(`IDs: Era-Name ${stat.eraId}, Seed-hist ${stat.seedId}, auf Nachfolger umgehaengt ${stat.remap} | Staffelnamen ${stat.staffel} | ohne S/U/N: nachgeschaetzt ${stat.geschaetztNachtrag}, leer ${stat.leer}`);
log(`Era-Namen: ${Object.keys(namen).length} Vereine (${varianten} Schreibvarianten vereinheitlicht), ${Object.values(namen).reduce((a, v) => a + v.length, 0)} Zeitraeume`);
log(`Tabellen ${tabellen.length}, Zeilen ${zeilen}, geschaetzt ${est} | Vereine ${Object.keys(vereine).length} | Ligen ${Object.keys(ligen).length}`);
log(`app/history_ext.js ${(out.length / 1024).toFixed(0)} KB (gz ${(gz.length / 1024).toFixed(0)} KB, JSON entpackt ${(json.length / 1024).toFixed(0)} KB), version ${version}`);
