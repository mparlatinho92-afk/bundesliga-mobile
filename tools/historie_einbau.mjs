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

const LIGEN = X.ligen;
const gebietOf = lid => lid === '3' ? 'BRD' : LIGEN[lid].gebiet;
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
        const reserve = /\s(A|Am\.?|II)$/.test(r.nm.trim()) || /_2$/.test(r.id);
        const basis = slug(r.nm.trim().replace(/\s(A|Am\.?|II)$/, ''));
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
    const benannt = labels.filter(l => RICHTUNG.includes(l) || /^[A-E]$/.test(l));
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
const merke = (id, y, nm) => {
    if (!GD.teams[id] || !nm || y > 1990 || hatEra(id, y)) return;
    const heute = GD.teams[id].name;
    if (slug(nm) === slug(heute)) return;
    const j = jahrName[id] = jahrName[id] || {};
    if (!j[y]) j[y] = nm;
};
for (const s of X.seasons) if (gebietOf(s.lid) === 'DDR') for (const r of s.table) merke(r.id, sy(s.y), r.nm);
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
    const gleich = (a, b) => !(pf(a) && pf(b) && pf(a) !== pf(b)) && (kern(a) === kern(b) || lev(kern(a), kern(b)) <= 2);
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
    berlin: 'Berlin', nordost: 'Nordost',
    niederrhein: 'West', mittelrhein: 'West', westfalen: 'West', nordrhein: 'West', west: 'West', westsuedwest: 'West',
    rheinland: 'Südwest', saarland: 'Südwest', suedwest: 'Südwest',
    hessen: 'Süd', bayern: 'Süd', nordbaden: 'Süd', suedbaden: 'Süd', nordwuerttemberg: 'Süd', schwarzwaldbodensee: 'Süd', badenwuerttemberg: 'Süd', sued: 'Süd',
};
const REGION_ORD = ['Nord', 'Berlin', 'Nordost', 'West', 'Südwest', 'Süd'];
// DDR-Bezirke in amtlicher Reihenfolge (I Rostock ... XV Berlin)
const BEZIRKE = ['rostock', 'schwerin', 'neubrandenburg', 'potsdam', 'frankfurtoder', 'cottbus', 'magdeburg', 'halle', 'erfurt', 'gera', 'suhl', 'dresden', 'leipzig', 'karlmarxstadt', 'berlin'];
const KURZ = { Regionalliga: 'RL', Amateurliga: 'AL', Amateuroberliga: 'AOL', Verbandsliga: 'VL', Landesliga: 'LL', Oberliga: 'OL', Bezirksliga: 'BZL', 'DDR-Liga': 'DDR2' };
const ligen = {};
const jahre = {};
X.seasons.forEach(s => { if (s.lid !== '3') (jahre[s.lid] = jahre[s.lid] || new Set()).add(sy(s.y)); });
for (const [lid, l] of Object.entries(LIGEN)) {
    const ys = [...jahre[lid]].sort((a, b) => a - b);
    const verband = lid.split('-')[1], typ = l.name.split(' ')[0];
    const ddr = l.gebiet === 'DDR';
    const epoche = ddr ? 'ddr' : l.firstYear < 1974 ? 'brd1' : l.firstYear < 1994 ? 'brd2' : 'brd3';
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
for (const [id, nm] of Object.entries(X.vereine)) if (benutzt.has(id)) vereine[id] = nm.replace(/ \((?:2\. Mannschaft\/)?Namensvetter\)$/, '');
const unbekannt = [...benutzt].filter(id => !GD.teams[id] && !HC[id] && !vereine[id]);
if (unbekannt.length) throw new Error('IDs ohne Namen: ' + unbekannt.slice(0, 10).join(', '));

// ---- 7. Tabellen packen ----
const tabellen = X.seasons.map(s => ({ y: s.y, lid: s.lid, rows: s.table.map(r => {
    const o = { id: r.id, rank: r.rank, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga };
    if (r.g) o.g = r.g;
    if (r.p2) o.p2 = r.p2; else if (r.p != null) o.p = r.p;
    if (r.sp != null && r.sp !== r.s + r.u + r.n) o.sp = r.sp;
    if (r.est || r.e) o.e = 1;
    return o;
}) }));
// Doppelbelegung darf es nicht geben (eine ID zweimal in einer Liga-Saison)
for (const t of tabellen) { const ids = t.rows.map(r => r.id); if (new Set(ids).size !== ids.length) throw new Error('Doppelbelegung ' + t.y + ' ' + t.lid); }
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
    + `    ligen: {\n${Object.values(ligen).map(l => '        ' + JSON.stringify(l.id) + ': ' + JSON.stringify(l)).join(',\n')}\n    },\n`
    + `    vereine: ${JSON.stringify(vereine)},\n`
    + `    namen: ${JSON.stringify(namen)},\n`
    + `    gz: "${gz}"\n};\n`;
fs.writeFileSync(path.join(ROOT, 'app/history_ext.js'), out);
log(`IDs: Era-Name ${stat.eraId}, Seed-hist ${stat.seedId}, auf Nachfolger umgehaengt ${stat.remap} | Staffelnamen ${stat.staffel} | ohne S/U/N: nachgeschaetzt ${stat.geschaetztNachtrag}, leer ${stat.leer}`);
log(`Era-Namen: ${Object.keys(namen).length} Vereine (${varianten} Schreibvarianten vereinheitlicht), ${Object.values(namen).reduce((a, v) => a + v.length, 0)} Zeitraeume`);
log(`Tabellen ${tabellen.length}, Zeilen ${zeilen}, geschaetzt ${est} | Vereine ${Object.keys(vereine).length} | Ligen ${Object.keys(ligen).length}`);
log(`app/history_ext.js ${(out.length / 1024).toFixed(0)} KB (gz ${(gz.length / 1024).toFixed(0)} KB, JSON entpackt ${(json.length / 1024).toFixed(0)} KB), version ${version}`);
