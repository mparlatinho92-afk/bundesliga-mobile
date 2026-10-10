// Abschlusstabellen der Spiel-Ligen Ebene 5-8 vor dem Sim-Start aus fussball.de (Scraper-Projekt des Nutzers, nur lesend)
// -> tools/fbde_ebene58.json (gleiches Format wie tools/wiki_ebene45.json) + Bericht tools/_dryrun/fbde_bericht.txt
//
//   node tools/fbde_ebene58.mjs            Probelauf: Zuordnung, Gegenprobe gegen die Einzelspiele, Vereinsabgleich
//
// Quelle: G:\Meine Ablage\fussball.de\<verband>\tabellen.csv + spiele.csv (Hauptrunde, 2001/02-2024/25).
// Nur Ligen, die es im Spiel gibt (Nutzerentscheidung 10.10.2026). Zuordnung Staffel -> Liga ueber den Staffelnamen
// (Regeln unten, je Liga und Zeitraum), unbenannte Staffeln danach ueber die Vereine der Nachbarsaisons.
//
// EBENE: jede Saison traegt fe:1, wenn die Liga damals auf einer anderen Ebene spielte als heute (vor 2008 lag alles
// unterhalb der Regionalliga eine Ebene hoeher; Bayern/NRW-Umbau 2012). Die Saison wird trotzdem uebernommen – ein
// Schalter in Rekorden und Ewiger Tabelle blendet sie aus (Nutzerentscheidung: Standard ist dazuzaehlen).
// Vorgaenger nur bei EINDEUTIGEM Nachfolger (wie HIST_EXT.ligaNachfolger): Bayernliga bis 2008 (-> Nord UND Sued),
// Landesliga Bayern Nord/Sued vor 2012, Verbandsliga Saar vor 2012 und Verbandsliga Schleswig-Holstein vor 2017 fehlen
// deshalb bewusst.
//
// WERTUNG wie in echt: 2019/20 nach Quotient (Platz aus der Quelle, gezaehlt werden die gespielten Spiele),
// zurueckgezogene Mannschaften fallen ganz heraus (DFB-SpO § 55a, Landesverbaende entsprechend).
// 2020/21 wurde in den meisten Verbaenden ANNULLIERT. Die Saison steht hier trotzdem drin, markiert mit an:1.
// >>> GESCHMACKSSACHE (Nutzer 10.10.2026: "probeweise rein"): genauso gut vertretbar ist, 2020/21 ganz wegzulassen –
// >>> dann ANNULLIERT_UEBERNEHMEN = false setzen. Annulliert heisst eigentlich "hat nicht stattgefunden".
const ANNULLIERT_UEBERNEHMEN = true;

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const QUELLE = process.env.FBDE_DIR || 'G:/Meine Ablage/fussball.de';
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });

globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS;
const W45 = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_ebene45.json'), 'utf8'));
// f-archiv-Grundlage des Einbaus (vor app/history_ext.js – das enthaelt nach dem ersten Einbau auch diese Daten selbst)
const FA = JSON.parse(fs.readFileSync(path.join(DIR, '_dryrun/seed_erweiterung.json'), 'utf8'));

const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const jahrVon = s => { const a = +s.slice(0, 2); return a < 50 ? 2000 + a : 1900 + a; };   // "04/05" -> 2004
const fold = s => String(s || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();

// ---------- Regeln: Liga -> Staffeln je Zeitraum ----------
// t = Spielklasse + ' | ' + Staffelname, klein, ohne Umlaute. ebene = [[abJahr, Ebene], ...] (Jahr = Saisonbeginn).
const E5 = [[2001, 5]], E6 = [[2001, 5], [2008, 6]], E7 = [[2001, 6], [2008, 7]], E8 = [[2001, 7], [2008, 8]];
const NRW_LL = [[2001, 6], [2008, 7], [2012, 6]];          // Landesliga Niederrhein/Mittelrhein: unter der NRW-Liga 2008-12 eine Ebene tiefer
const REGELN = {
    // Oberliga Hessen bis 2008 steht schon aus f-archiv drin (h4-hessen-oberliga, Nachfolger 5-3) – hier nur zum Vergleich mit Wikipedia
    '5-3': { v: 'hessen', re: [[/^hessenliga \| /, 2008]], ebene: [[2008, 5]] },
    '5-4': { v: 'schleswig_holstein', re: [[/^verbandsliga \| verbandsliga( a)?( -)? herren$/, 2004, 2007], [/^oberliga schleswig-holstein \| /, 2008]], ebene: E5 },
    '5-5': { v: 'hamburg', re: /^verbandsliga \| /, ebene: E5 },
    '5-6': { v: 'niedersachsen', re: /^(niedersachsenliga|oberliga niedersachsen) \| /, ebene: E5 },
    '5-7': { v: 'bremen', re: /^verbandsliga \| /, ebene: E5 },
    '5-11': { v: 'niederrhein', re: /^(niederrheinliga|oberliga niederrhein) \| /, ebene: [[2001, 5], [2008, 6], [2012, 5]] },
    '6-1': { v: 'suedwest', re: /^verbandsliga \| /, ebene: E6 },
    '6-2': { v: 'rheinland', re: /^rheinlandliga \| /, ebene: E6 },
    '6-3': { v: 'saarland', re: [[/^saarland-liga \| /, 2012]], ebene: [[2012, 6]] },
    '6-4': { v: 'baden', re: /^verbandsliga \| /, ebene: E6 },
    '6-5': { v: 'suedbaden', re: /^verbandsliga \| /, ebene: E6 },
    '6-6': { v: 'wuerttemberg', re: /^verbandsliga \| /, ebene: E6 },
    '6-7': { v: 'hessen', re: [[/^landesliga hessen bis 07\/08 \| (ll gr\.? ?nord|ll gruppe nord|nord)$/, 2001, 2007], [/^verbandsliga \| .*gr\.? ?nord$/, 2008]], ebene: E6 },
    '6-8': { v: 'hessen', re: [[/^landesliga hessen bis 07\/08 \| (ll gr\.? ?mitte|landesliga-mitte|mitte)$/, 2001, 2007], [/^verbandsliga \| .*gr\.? ?mitte$/, 2008]], ebene: E6 },
    '6-9': { v: 'hessen', re: [[/^landesliga hessen bis 07\/08 \| (ll gr\.? ?sud|ll gruppe sud|sued)$/, 2001, 2007], [/^verbandsliga \| .*gr\.? ?sud$/, 2008]], ebene: E6 },
    '6-10': { v: 'schleswig_holstein', re: [[/^landesliga \| (senioren )?landesliga schleswig$/, 2017]], ebene: [[2017, 6]] },
    '6-11': { v: 'schleswig_holstein', re: [[/^landesliga \| (senioren )?landesliga holstein$/, 2017]], ebene: [[2017, 6]] },
    '6-12': { v: 'hamburg', re: /^landesliga \| .*hammonia/, ebene: [[2001, 6]] },
    '6-13': { v: 'hamburg', re: /^landesliga \| .*hansa/, ebene: [[2001, 6]] },
    '6-14': { v: 'niedersachsen', re: /^landesliga \| .*weser-ems/, ebene: [[2001, 6]] },
    '6-15': { v: 'niedersachsen', re: /^landesliga \| .*luneburg/, ebene: [[2001, 6]] },
    '6-16': { v: 'niedersachsen', re: /^landesliga \| .*hannover/, ebene: [[2001, 6]] },
    '6-17': { v: 'niedersachsen', re: /^landesliga \| .*braunschweig/, ebene: [[2001, 6]] },
    '6-18': { v: 'bremen', re: /^landesliga \| /, ebene: [[2001, 6]] },
    '6-19': { v: 'mecklenburg_vorpommern', re: /^verbandsliga \| /, ebene: E6 },
    '6-20': { v: 'brandenburg', re: /^verbandsliga \| /, ebene: E6 },
    '6-21': { v: 'berlin', re: /^verbandsliga \| /, ebene: E6 },
    '6-22': { v: 'sachsen_anhalt', re: /^verbandsliga \| /, ebene: E6 },
    '6-23': { v: 'thueringen', re: /^(verbandsliga|landesliga) \| .*(thuringenliga|liga thuringen)/, ebene: E6 },
    '6-24': { v: 'sachsen', re: /^landesliga \| /, ebene: E6 },
    '6-25': { v: 'westfalen', re: /^verbandsliga \| .*\b1$/, ebene: E6 },
    '6-26': { v: 'westfalen', re: /^verbandsliga \| .*\b2$/, ebene: E6 },
    '6-27': { v: 'niederrhein', re: /^landesliga \| landesliga,? gruppe 1$/, ebene: NRW_LL },
    '6-28': { v: 'niederrhein', re: /^landesliga \| landesliga,? gruppe 2$/, ebene: NRW_LL },
    '6-29': { v: 'mittelrhein', re: /^landesliga \| .*staffel 1$/, ebene: NRW_LL },
    '6-30': { v: 'mittelrhein', re: /^landesliga \| .*staffel 2$/, ebene: NRW_LL },
    '6-31': { v: 'bayern', re: [[/^landesliga \| landesliga nordwest$/, 2012]], ebene: [[2012, 6]] },
    '6-32': { v: 'bayern', re: [[/^landesliga \| landesliga nordost$/, 2012]], ebene: [[2012, 6]] },
    '6-33': { v: 'bayern', re: /^landesliga \| landesliga mitte$/, ebene: E6 },
    '6-34': { v: 'bayern', re: [[/^landesliga \| landesliga sudwest$/, 2012]], ebene: [[2012, 6]] },
    '6-35': { v: 'bayern', re: [[/^landesliga \| landesliga sudost$/, 2012]], ebene: [[2012, 6]] },
    '7-1': { v: 'suedwest', re: /^landesliga \| .*\bost\b/, ebene: E7 },
    '7-2': { v: 'suedwest', re: /^landesliga \| .*\bwest\b/, ebene: E7 },
    '7-3': { v: 'rheinland', re: /^bezirksliga \| bezirksliga west/, ebene: E7 },
    '7-4': { v: 'rheinland', re: /^bezirksliga \| bezirksliga mitte/, ebene: E7 },
    '7-5': { v: 'rheinland', re: /^bezirksliga \| bezirksliga ost/, ebene: E7 },
    '7-6': { v: 'saarland', re: [[/^verbandsliga \| verbandsliga nord ?\/ ?ost$/, 2012]], ebene: [[2012, 7]] },
    '7-7': { v: 'saarland', re: [[/^verbandsliga \| verbandsliga sud ?\/ ?west$/, 2012]], ebene: [[2012, 7]] },
    '7-8': { v: 'berlin', re: /^landesliga \| (.*(st\.? ?|staffel )1|landesliga 1\/herren)$/, ebene: E7 },
    '7-9': { v: 'berlin', re: /^landesliga \| (.*(st\.? ?|staffel )2|landesliga 2\/herren)$/, ebene: E7 },
    '8-1': { v: 'suedwest', re: /^bezirksliga( \(verband\))? \| .*(rheinhessen|rhh)/, ebene: E8 },
    '8-2': { v: 'suedwest', re: /^bezirksliga( \(verband\))? \| .*vorderpfalz/, ebene: E8 },
    '8-3': { v: 'suedwest', re: /^bezirksliga( \(verband\))? \| .*nahe/, ebene: E8 },
    '8-4': { v: 'suedwest', re: /^bezirksliga( \(verband\))? \| .*westpfalz/, ebene: E8 },
};
const AUSSCHLUSS = /freizeit|7er|\bu ?[3-6]0|alte herren|frauen|reserve|kleinfeld|futsal|jugend/;
const ebeneIn = (lid, y) => { let e = null; for (const [ab, lv] of REGELN[lid].ebene) if (y >= ab) e = lv; return e; };
const regelPasst = (lid, t, y) => {
    const r = REGELN[lid].re;
    const liste = r instanceof RegExp ? [[r]] : r;
    return liste.some(([re, von, bis]) => re.test(t) && (von == null || y >= von) && (bis == null || y <= bis)) && ebeneIn(lid, y) != null;
};
for (const lid of Object.keys(REGELN)) if (!GD.leagues[lid]) throw new Error('Regel fuer unbekannte Liga ' + lid);

// ---------- Quelle lesen ----------
const csv = f => { const L = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/); const h = L[0].split(';'); const ix = {}; h.forEach((n, i) => ix[n] = i); return { L, ix }; };
const VERBAENDE = [...new Set(Object.values(REGELN).map(r => r.v))];
const staffeln = {};   // staffel_id -> { v, s, y, k, st, t, rows[] }
for (const v of VERBAENDE) {
    const { L, ix } = csv(path.join(QUELLE, v, 'tabellen.csv'));
    for (let i = 1; i < L.length; i++) {
        const c = L[i].split(';'); if (c.length < 15 || c[ix.phase] !== 'Hauptrunde') continue;
        const y = jahrVon(c[ix.saison]); if (y > 2024) continue;   // 2025/26 ist die laufende Saison des Spiels
        const sid = c[ix.staffel_id];
        const o = staffeln[sid] || (staffeln[sid] = { sid, v, y, k: c[ix.spielklasse], st: c[ix.staffel], t: fold(c[ix.spielklasse] + ' | ' + c[ix.staffel]), rows: [] });
        o.rows.push({ platz: +c[ix.platz], nm: c[ix.mannschaft], sp: +c[ix.spiele], s: +c[ix.g], u: +c[ix.u], n: +c[ix.v], gf: +c[ix.tore], ga: +c[ix.gegentore],
            p: +c[ix.punkte], wertung: c[ix.wertung], zg: /zur.ckgezogen/.test(c[ix.hinweis]) || / zg\.?$/.test(c[ix.mannschaft]) });
    }
}

// ---------- 1. Zuordnung ueber den Namen ----------
const zu = {};   // lid|y -> [staffel]
const frei = [];
for (const o of Object.values(staffeln)) {
    // Aufstiegs-/Platzierungsspiele haengen als Mini-Tabelle (2-4 Vereine) in derselben Spielklasse
    if (AUSSCHLUSS.test(o.t) || o.rows.length < 3 || /aufstiegs?spiel|platzierungsspiel|spiel zum aufstieg/.test(o.t)) continue;
    const hits = Object.keys(REGELN).filter(lid => REGELN[lid].v === o.v && regelPasst(lid, o.t, o.y));
    if (hits.length === 1) { (zu[hits[0] + '|' + o.y] = zu[hits[0] + '|' + o.y] || []).push(o); o.lid = hits[0]; o.wie = 'Name'; }
    else if (hits.length > 1) { o.mehrdeutig = hits; frei.push(o); }
    else frei.push(o);
}
// Kleine Tabellen (unter 7 Vereinen) sind Aufstiegsrunden zur Liga darueber ("Aufstieg Lotto Hessenliga", 3 Vereine) – ausser im
// Rundenmodus: hat die Saison mindestens zwei Vorrunden-Gruppen, gehoert auch eine kleine Auf-/Abstiegsrunde dazu (Hannover 2021/22).
for (const key of Object.keys(zu)) {
    const gross = zu[key].filter(o => o.rows.length >= 7).length;
    zu[key] = zu[key].filter(o => o.rows.length >= 7 || (gross >= 2 && /(auf|ab)stieg/.test(o.t)));
    zu[key].forEach(o => { o.drin = 1; });
    if (!zu[key].length) delete zu[key];
}
for (const o of Object.values(staffeln)) if (o.lid && !o.drin) delete o.lid;
// ---------- 2. Unbenannte Staffeln ueber die Vereine der Nachbarsaisons ----------
// Nur Spielklassen, aus denen der Verband schon benannte Staffeln liefert, und nur, wenn die Liga in dieser Saison noch frei ist.
const kader = o => new Set(o.rows.filter(r => !r.zg).map(r => fold(r.nm)));
const klassenMit = new Set(Object.values(staffeln).filter(o => o.lid).map(o => o.v + '|' + o.k));
const ueberVereine = [];
for (const o of frei) {
    if (o.rows.length < 8 || !klassenMit.has(o.v + '|' + o.k)) continue;
    const K = kader(o); let best = null, bq = 0, zweit = 0;
    for (const lid of Object.keys(REGELN)) {
        if (REGELN[lid].v !== o.v || zu[lid + '|' + o.y] || ebeneIn(lid, o.y) == null) continue;
        for (const d of [-1, 1]) for (const n of zu[lid + '|' + (o.y + d)] || []) {
            const N = kader(n); let ov = 0; for (const m of K) if (N.has(m)) ov++;
            const q = ov / Math.min(K.size, N.size);
            if (q > bq) { if (best !== lid) zweit = bq; bq = q; best = lid; } else if (best !== lid && q > zweit) zweit = q;
        }
    }
    if (best && bq >= 0.5 && bq - zweit >= 0.2) { o.lid = best; o.wie = `Vereine ${Math.round(bq * 100)} %`; (zu[best + '|' + o.y] = zu[best + '|' + o.y] || []).push(o); ueberVereine.push(`${saison(o.y)} ${best} <- ${o.v} "${o.k} | ${o.st}" (${Math.round(bq * 100)} %, naechste ${Math.round(zweit * 100)} %)`); }
}

// ---------- 3. Gegenprobe: jede Tabelle aus ihren Einzelspielen nachrechnen ----------
const benutzt = new Set(Object.values(zu).flat().map(o => o.sid));
const nach = {};   // sid -> name -> {sp,s,u,n,gf,ga}
let spieleGelesen = 0;
for (const v of VERBAENDE) {
    const { L, ix } = csv(path.join(QUELLE, v, 'spiele.csv'));
    for (let i = 1; i < L.length; i++) {
        const c = L[i].split(';'); const sid = c[ix.staffel_id]; if (!benutzt.has(sid)) continue;
        const th = c[ix.tore_heim], tg = c[ix.tore_gast]; if (th === '' || tg === '' || isNaN(+th) || isNaN(+tg)) continue;
        spieleGelesen++;
        const T = nach[sid] || (nach[sid] = {});
        const add = (nm, f, a) => { const z = T[nm] || (T[nm] = { sp: 0, s: 0, u: 0, n: 0, gf: 0, ga: 0 }); z.sp++; z.gf += f; z.ga += a; if (f > a) z.s++; else if (f === a) z.u++; else z.n++; };
        add(c[ix.heim], +th, +tg); add(c[ix.gast], +tg, +th);
    }
}
// Reparatur ganzer Staffeln (die amtliche Tabelle gewinnt sonst, sie kennt Sportgerichtsurteile, die Spieleliste nicht):
//   Tabelle nur Nullen        -> aus den Spielen nachrechnen (Sachsen-Anhalt 2002/03)
//   U und N vertauscht        -> tauschen, wenn es bei der Mehrheit der Zeilen genau so passt (Sachsen-Anhalt 2008/09, 2011/12)
const repariert = [];
for (const o of Object.values(zu).flat()) {
    const T = nach[o.sid]; if (!T) continue;
    const akt = o.rows.filter(r => !r.zg && T[r.nm]);
    if (akt.length < 7) continue;
    if (akt.every(r => r.s + r.u + r.n === 0)) {
        akt.forEach(r => Object.assign(r, { s: T[r.nm].s, u: T[r.nm].u, n: T[r.nm].n, gf: T[r.nm].gf, ga: T[r.nm].ga }));
        repariert.push(`${saison(o.y)} ${o.lid} "${o.st}": Tabelle leer -> aus ${akt.length} Vereinen der Spiele nachgerechnet`); o.ausSpielen = 1; continue;
    }
    const tausch = akt.filter(r => r.u !== r.n && r.u === T[r.nm].n && r.n === T[r.nm].u && r.s === T[r.nm].s).length;
    if (tausch >= akt.length / 2) { o.rows.forEach(r => { const u = r.u; r.u = r.n; r.n = u; }); repariert.push(`${saison(o.y)} ${o.lid} "${o.st}": U/N vertauscht (${tausch} von ${akt.length} Zeilen) -> getauscht`); }
}
const probe = { gleich: 0, abw: 0, ohne: 0 }, probeLiga = {};
for (const o of Object.values(zu).flat()) {
    const T = nach[o.sid]; const key = o.lid + '|' + o.y;
    const pl = probeLiga[key] || (probeLiga[key] = { gleich: 0, abw: 0, ohne: 0, bsp: [] });
    for (const r of o.rows) {
        if (r.zg) continue;
        const z = T && T[r.nm];
        if (!z) { probe.ohne++; pl.ohne++; continue; }
        const ok = z.s === r.s && z.u === r.u && z.n === r.n && z.gf === r.gf && z.ga === r.ga;
        if (ok) { probe.gleich++; pl.gleich++; } else { probe.abw++; pl.abw++; if (pl.bsp.length < 2) pl.bsp.push(`${r.nm} Tabelle ${r.s}-${r.u}-${r.n} ${r.gf}:${r.ga} / Spiele ${z.s}-${z.u}-${z.n} ${z.gf}:${z.ga}`); }
    }
}

// ---------- 4. Vereinsabgleich (wie tools/wiki_ebene45.mjs) ----------
const slug = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'spvg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'ssvg', 'asv', 'bsc', 'bfc', 'sportvg',
    'fsv', 'kfc', 'sus', 'svg', 'tsr', 'ev', 'rsv', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv', 'sf', 'spfr', 'e', 'v', '1', 'i', 'ii', 'u21', 'u23',
    'fussball', 'club', 'verein', 'sportverein', 'turn', 'und', 'von', 'tv', 'tg', 'mtv', 'tsc', 'ssc', 'jsg', 'teutonia']);
const RESERVE = /(\s(III|II|2|U ?2[123]|Amateure|Am\.?))$/i;
// fussball.de-Eigenheiten: "zg." (zurueckgezogen), "(N)"/"(A)", Sternchen, abgekuerzte Vornamen ("Vikt.Urberach")
// Mannschaftsnummer: Hamburg/Berlin/SH haengen sie an ("Paloma 1.", "SV Tasmania I", "Husumer SpVg 1", "SV Werder 3")
const ABK = { 'eintr.': 'Eintracht', 'germ.': 'Germania', 'vikt.': 'Viktoria', 'bor.': 'Borussia', 'conc.': 'Concordia', 'spfr.': 'Sportfreunde',
    'fort.': 'Fortuna', 'vorw.': 'Vorwärts', 'alem.': 'Alemannia', 'rhen.': 'Rhenania', 'spvgg.': 'SpVgg', 'spvg.': 'SpVgg', 'vg.': 'SpVgg', 'amat.': 'Amateure' };
const putz = n => String(n).replace(/\s+zg\.?$/i, '').replace(/\s*\((N|A|M|Ab|Auf)\)\s*$/i, '').replace(/\*+$/, '')
    .replace(/\b([A-Z])\.([A-Z])\.(?=\s|$)/g, '$1$2').replace(/\.(?=\S)/g, '. ').replace(/\s+/g, ' ').trim()
    .replace(/([a-zäöüß])(II|III)$/, '$1 $2').replace(/\s+(1\.?|I)$/, '').replace(/\s+(2\.?|II\.)$/, ' II').replace(/\s+(3\.?|III\.)$/, ' III')
    .split(' ').map(w => ABK[w.toLowerCase()] || w).join(' ');
const istReserve = n => RESERVE.test(putz(n));
const ALIAS = { sf: 'sportfreunde', spfr: 'sportfreunde', rw: 'rotweiss', sw: 'schwarzweiss', bw: 'blauweiss', gw: 'gruenweiss', rs: 'rotschwarz' };
const STOP = new Set(['a', 'am', 'an', 'der', 'die', 'im', 'in', 'e', 'v']);
const kernRoh = (n, ohneEr) => putz(n).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/(\s(ii|2|u ?2[123]|amateure|am\.?))$/i, '').replace(/(rot|schwarz|blau|gruen|gelb)[\s-]*(weiss|weis|schwarz|rot|gelb|blau|gruen)\b/g, (m, a, b) => a + (b === 'weis' ? 'weiss' : b))
    .split(/[^a-z0-9]+/).map(w => ALIAS[w] || w).filter(w => w && !FORM.has(w) && !STOP.has(w) && !/^\d+$/.test(w))
    .map(w => w.length >= 6 && !ohneEr ? w.replace(/er$/, '') : w);
const kern = n => kernRoh(n).sort();
// Zweiter Schluessel: Kernwoerter in Originalreihenfolge zusammengezogen – "Nieder-Roden" = "Niederroden",
// "Türkgücü-Ataspor" = "Türk Gücü Ataspor" (der sortierte Kern trennt solche Schreibweisen)
const kompakt = n => kernRoh(n, true).join('') + (istReserve(n) ? '|R' : '');   // ohne er-Kuerzung: "Nieder"+"roden"
const OHNE_FORM = new Set(['1', 'e', 'v', 'i', 'ii', 'u21', 'u23', 'fussball', 'club', 'verein', 'und', 'von', 'turn', 'sportverein']);
const formen = n => new Set(putz(n).toLowerCase().split(/[^a-z0-9]+/).filter(w => FORM.has(w) && !OHNE_FORM.has(w)));
const formOk = (a, b) => { const A = formen(a), B2 = formen(b); return !A.size || !B2.size || [...A].some(w => B2.has(w)); };
const TEAMS = Object.values(GD.teams);
const kernIdx = {};
TEAMS.forEach(t => { const k = kern(t.name).join(' ') + (t.isReserve ? '|R' : ''); (kernIdx[k] = kernIdx[k] || []).push(t.id); });
const HIST_IDX = {};
const alleHist = Object.assign({}, HC, FA.vereine, W45.vereine);
Object.entries(alleHist).forEach(([id, n]) => { const k = kern(n).join(' ') + (istReserve(n) ? '|R' : ''); (HIST_IDX[k] = HIST_IDX[k] || []).push(id); });
const KOMPAKT_T = {}, KOMPAKT_H = {};
TEAMS.forEach(t => { const k = kompakt(t.name + (t.isReserve && !istReserve(t.name) ? ' II' : '')); (KOMPAKT_T[k] = KOMPAKT_T[k] || []).push(t.id); });
Object.entries(alleHist).forEach(([id, n]) => { const k = kompakt(n); (KOMPAKT_H[k] = KOMPAKT_H[k] || []).push(id); });
const aehnlich = (a, b) => { const A = kern(a), B = kern(b); if (!A.length || !B.length) return 0; const t = A.filter(w => B.includes(w)).length; return t / (A.length + B.length - t); };
const KORREKTUR = (() => { try { const o = JSON.parse(fs.readFileSync(path.join(DIR, 'fbde_ebene58_korrektur.json'), 'utf8')); delete o._hinweis; return o; } catch (e) { return {}; } })();
let belegt, idStat, vorschlag, neueVereine, aehnlichZu;
const merke = (y, id) => (belegt[y] = belegt[y] || new Set()).add(id);
const zuruecksetzen = () => {
    belegt = {}; idStat = { exakt: 0, korrektur: 0, aehnlich: 0, hist: 0, neu: 0 }; vorschlag = {}; neueVereine = {}; aehnlichZu = {};
    SEED.seasons.forEach(s => s.table.forEach(r => merke(parseInt(s.y), r.id)));
    W45.seasons.forEach(s => [...s.table, ...(s.vr || []).flatMap(v => v.rows)].forEach(r => merke(parseInt(s.y), r.id)));
    FA.seasons.forEach(s => s.table.forEach(r => merke(parseInt(s.y), r.id)));
};
// Eindeutige Aehnlichkeit wird uebernommen (Nutzer 10.10.2026: "eindeutige vereine uebernehmen, rest als neue vereine"):
// genau EIN Spielverein mit Aehnlichkeit >= 0,6, gleicher Reserve-Eigenschaft und vertraeglicher Vereinsform. SPERRE: Paare, die
// in derselben Saison nebeneinander spielen – dann sind es zwei Vereine (zweiter Durchlauf, s. unten).
const SPERRE = new Set();
// Stadtstaaten nennen den Ort nicht ("Concordia", "SV Werder 2"): findet der Name nichts, mit angehaengter Stadt noch einmal suchen
const STADT = { hamburg: 'Hamburg', bremen: 'Bremen', berlin: 'Berlin' };
function idVon(verein, y, verband) {
    const nm0 = putz(verein);
    if (STADT[verband]) { const mit = putz(verein).replace(/(\s(II|III))?$/, m => ' ' + STADT[verband] + m);
        const km = kern(mit).join(' ') + (istReserve(mit) ? '|R' : '');
        if (!kernIdx[kern(putz(verein)).join(' ') + (istReserve(verein) ? '|R' : '')] && kernIdx[km] && kernIdx[km].length === 1) verein = mit; }
    const nm = putz(verein), res = istReserve(nm), k = kern(nm).join(' ') + (res ? '|R' : '');
    const istFrei = id => !(belegt[y] && belegt[y].has(id));
    // Korrektur: Schluessel "verband|Name" oder "Name", jeweils mit dem Namen der Quelle (vor dem Stadt-Zusatz) oder danach
    const schl = [verband + '|' + nm0, verband + '|' + nm, nm0, nm].find(x => x in KORREKTUR);
    const korr = schl ? KORREKTUR[schl] : undefined, zwingeNeu = korr === null;
    if (korr && istFrei(korr)) { idStat.korrektur++; return korr; }
    // Zweitvertretung ohne Zusatz: spielt der gleichnamige Spielverein in derselben Saison schon woanders (Berlin 2001/02 "1.FC Union"
    // in der Verbandsliga, Union selbst in der 2. Bundesliga), ist es seine Reserve
    if (!res && !zwingeNeu) {
        const gleich = (kernIdx[k] || []).filter(id => formOk(nm, GD.teams[id].name));
        if (gleich.length === 1 && !istFrei(gleich[0])) {
            const r2 = TEAMS.filter(t => t.isReserve && t.parentId === gleich[0] && istFrei(t.id));
            if (r2.length === 1) { idStat.reserve = (idStat.reserve || 0) + 1; return r2[0].id; }
            return idVon(GD.teams[gleich[0]].name + ' II', y, verband);
        }
    }
    const kp = kompakt(nm);
    let exakt = (kernIdx[k] || []).filter(istFrei).filter(id => formOk(nm, GD.teams[id].name));
    if (!exakt.length) exakt = (KOMPAKT_T[kp] || []).filter(istFrei).filter(id => formOk(nm, GD.teams[id].name));
    if (exakt.length === 1 && !zwingeNeu) { idStat.exakt++; return exakt[0]; }
    if (!exakt.length && !zwingeNeu) {
        const aeh = TEAMS.filter(t => !!t.isReserve === res && istFrei(t.id) && formOk(nm, t.name)).map(t => ({ t, a: aehnlich(nm, t.name) })).filter(x => x.a >= 0.6);
        if (aeh.length === 1 && !SPERRE.has(nm + '|' + aeh[0].t.id)) { idStat.aehnlich++; aehnlichZu[nm] = aeh[0].t.id; return aeh[0].t.id; }
    }
    if (!exakt.length && !vorschlag[nm]) {
        const kand = TEAMS.filter(t => !!t.isReserve === res).map(t => ({ t, a: aehnlich(nm, t.name) })).filter(x => x.a >= 0.5).sort((p, q) => q.a - p.a);
        if (kand.length) vorschlag[nm] = kand.slice(0, 3).map(x => `${x.t.name} [${x.t.id}] ${x.a.toFixed(2)}`).join(' / ');
    }
    // Mehrere hist-IDs mit demselben Namenskern sind Schreibvarianten derselben Mannschaft in f-archiv ("Rot-Weiß Erfurt II",
    // "FC Rot Weiß Erfurt II" …), die historie_einbau.mjs ohnehin zusammenlegt: die erste nehmen statt eine weitere anzulegen
    // Vereinsform muss passen: "VfB Chemnitz" hat denselben Kern wie "Chemnitzer FC A" und "Chemnitzer SV"
    let h = (HIST_IDX[k] || []).filter(istFrei).filter(id => formOk(nm, alleHist[id])).sort();
    if (!h.length) h = (KOMPAKT_H[kp] || []).filter(istFrei).filter(id => formOk(nm, alleHist[id])).sort();
    if (h.length && !zwingeNeu) { idStat.hist++; return h[0]; }
    // Neue ID je Namenskern, nicht je Schreibweise ("Rot-Weiss" und "Rot-Weiß" sind ein Verein). Erzwungen eigene ID bei bekanntem
    // Namen = bewusst getrennter Namensvetter (_nv, wie historie_einbau_test erwartet)
    // Kern + Vereinsform ("DJK Gladbach" und "SV Gladbach" sind zwei Vereine); in derselben Saison schon vergeben -> Namensvetter
    // Gibt es den Namen schon (Spielverein oder hist-ID), war er hier aber nicht verwendbar (spielt in derselben Saison woanders,
    // erzwungen getrennt), ist es ein bewusst getrennter Namensvetter: Zusatz _nv, wie historie_einbau_test es erwartet
    const bekannt = [kernIdx[k], HIST_IDX[k], KOMPAKT_T[kp], KOMPAKT_H[kp]].some(a => a && a.length);
    const basis = 'hist_fb_' + slug([...formen(nm)].sort().join(' ') + ' ' + kp.replace('|R', ' ii')) + (bekannt ? '_nv' : '');
    let id = basis, n = 2;
    while ((alleHist[id] && kompakt(alleHist[id]) !== kp) || !istFrei(id)) id = basis + n++;
    if (!neueVereine[id]) { idStat.neu++; neueVereine[id] = nm; }
    return id;
}

// ---------- 5. Saisons bauen ----------
const W45key = new Set(W45.seasons.map(s => s.y + '|' + s.lid));
const W45map = Object.fromEntries(W45.seasons.map(s => [s.y + '|' + s.lid, s]));
const RUNDE = /aufstieg|abstieg|meister|quali/;
let seasons, runden, wikiVergleich, ausgelassen, zgRaus;
function bauen() {
zuruecksetzen();
seasons = []; runden = []; wikiVergleich = { gleich: 0, abw: 0, bsp: [] }; ausgelassen = { wiki: 0, annulliert: 0 }; zgRaus = 0;
for (const key of Object.keys(zu).sort()) {
    const [lid, ys] = key.split('|'), y = +ys, sy = saison(y);
    const st = zu[key].sort((a, b) => a.st.localeCompare(b.st));
    const annulliert = y === 2020;
    if (annulliert && !ANNULLIERT_UEBERNEHMEN) { ausgelassen.annulliert++; continue; }
    if (W45key.has(sy + '|' + lid)) {                                           // Wikipedia hat die Saison schon: nur vergleichen (ueber den Namenskern,
        ausgelassen.wiki++;                                                      // IDs vergibt Wikipedia; keine ID hier, sonst waere sie doppelt belegt)
        const w = W45map[sy + '|' + lid], wk = w.table.map(x => ({ x, k: kern(x.nm || '').join(' ') }));
        for (const o of st) for (const r of o.rows.filter(r => !r.zg)) {
            const k = kern(r.nm).join(' '), q = (wk.find(e => e.k === k) || wk.find(e => e.x.s === r.s && e.x.u === r.u && e.x.n === r.n && e.x.gf === r.gf && e.x.ga === r.ga) || {}).x;
            if (q && q.s === r.s && q.u === r.u && q.n === r.n && q.gf === r.gf && q.ga === r.ga) wikiVergleich.gleich++;
            else { wikiVergleich.abw++; if (wikiVergleich.bsp.length < 8) wikiVergleich.bsp.push(`${sy} ${lid} ${putz(r.nm)}: fussball.de ${r.s}-${r.u}-${r.n} ${r.gf}:${r.ga} / Wikipedia ${q ? `${q.s}-${q.u}-${q.n} ${q.gf}:${q.ga} (${q.nm})` : 'nicht gefunden'}`); }
        }
        continue;
    }
    if (st.length > 1) runden.push(`${sy} ${lid}: ${st.map(o => `"${o.st}" (${o.rows.length})`).join(', ')}${st.some(o => RUNDE.test(fold(o.st))) ? '  << RUNDENMODUS' : ''}`);
    // Rundenmodus (Hannover/Vorderpfalz 2021/22): Vorrunden-Gruppen als vr, Auf-/Abstiegsrunde als Staffeln der Saison, Platz
    // durchgezaehlt (Aufstiegsrunde zuerst), Platz in der Runde in gr – dieselbe Form wie tools/wiki_ebene45.mjs.
    const istRunde = o => RUNDE.test(fold(o.st));
    const runde = st.filter(istRunde), vorr = st.filter(o => !istRunde(o));
    const rundenmodus = runde.length && vorr.length >= 2;
    const idJeName = {};
    const zeilen = (o, start) => { const aktiv = o.rows.filter(r => !r.zg); zgRaus += o.rows.length - aktiv.length;
        return aktiv.sort((a, b) => a.platz - b.platz).map((r, i) => {
            const nm = putz(r.nm);
            const id = idJeName[nm] || (idJeName[nm] = idVon(r.nm, y, o.v));
            merke(y, id);
            return { rank: start + i + 1, id, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga, nm, sp: r.sp };
        }); };
    let table = [], vr = null, kumS = 0;
    if (rundenmodus) {
        vr = vorr.map(o => ({ g: o.st, rows: zeilen(o, 0) }));
        const vrSp = {}; vr.forEach(v => v.rows.forEach(r => { vrSp[r.id] = r.sp; }));
        runde.sort((a, b) => (/ab/.test(fold(a.st)) ? 1 : 0) - (/ab/.test(fold(b.st)) ? 1 : 0));
        for (const o of runde) { const z = zeilen(o, table.length); z.forEach((r, i) => { r.gr = i + 1; r.g = o.st; }); table.push(...z); }
        const mit = table.filter(r => vrSp[r.id] != null);
        kumS = mit.filter(r => r.sp > vrSp[r.id]).length > mit.length / 2 ? 1 : 0;   // Runde enthaelt die Vorrunde schon?
    } else for (const o of st) { const z = zeilen(o, 0); if (st.length > 1) z.forEach(r => { r.g = o.st; }); table.push(...z); }
    table.forEach(r => delete r.sp); if (vr) vr.forEach(v => v.rows.forEach(r => delete r.sp));
    const s = { y: sy, lid, table, quelle: 'fussball.de' };
    if (vr) Object.assign(s, { vr, kumS, kumT: kumS });
    if (ebeneIn(lid, y) !== GD.leagues[lid].level) s.fe = 1;                 // fruehere Ebene: Schalter in Rekorde/Ewige Tabelle
    const spz = table.map(r => r.s + r.u + r.n);
    if (st.some(o => o.rows.some(r => r.wertung === 'Quotient')) || (y === 2019 && Math.max(...spz) - Math.min(...spz) >= 2)) s.abbruch = 1;
    if (annulliert) s.an = 1;                                                   // 2020/21 annulliert – Geschmackssache, s. Kopf
    if (st.some(o => o.rows.some(r => r.wertung === '2-Punkte-Regel'))) s.p2 = 1;
    if (st.some(o => o.ausSpielen)) s.ausSpielen = 1;
    seasons.push(s);
}
}
bauen();
// Koexistenz: spielt der aehnlich zugeordnete Name in einer Saison, in der der Spielverein selbst (unter anderem Namen oder im
// Seed/Wikipedia) auch spielt, sind es zwei Vereine -> sperren und neu bauen, bis nichts mehr kollidiert.
for (let lauf = 0; lauf < 5; lauf++) {
    const da = {};   // y -> id -> Set(Namen)
    const add = (y, id, nm) => { const m = da[y] = da[y] || {}; (m[id] = m[id] || new Set()).add(nm); };
    SEED.seasons.forEach(s => s.table.forEach(r => add(parseInt(s.y), r.id, '#seed')));
    W45.seasons.forEach(s => s.table.forEach(r => add(parseInt(s.y), r.id, '#wiki')));
    seasons.forEach(s => [...s.table, ...(s.vr || []).flatMap(v => v.rows)].forEach(r => add(parseInt(s.y), r.id, r.nm)));
    let neu = 0;
    for (const [nm, id] of Object.entries(aehnlichZu)) {
        const jahre = Object.keys(da).filter(y => da[y][id] && da[y][id].has(nm));
        const kollidiert = Object.keys(da).some(y => da[y][id] && [...da[y][id]].some(n => n !== nm) && seasons.some(s => parseInt(s.y) === +y && s.table.some(r => r.nm === nm)))
            || jahre.length === 0;
        if (kollidiert && !SPERRE.has(nm + '|' + id)) { SPERRE.add(nm + '|' + id); neu++; }
    }
    if (!neu) break;
    bauen();
}

// ---------- 6. Durchgaengigkeit: gleiche Liga, Folgesaison – wie viele Vereine bleiben? ----------
const bruch = [];
const proLid = {};
seasons.forEach(s => (proLid[s.lid] = proLid[s.lid] || []).push(s));
for (const [lid, ss] of Object.entries(proLid)) {
    ss.sort((a, b) => parseInt(a.y) - parseInt(b.y));
    for (let i = 1; i < ss.length; i++) {
        if (parseInt(ss[i].y) !== parseInt(ss[i - 1].y) + 1) continue;
        const A = new Set(ss[i - 1].table.map(r => r.id)), B = ss[i].table.map(r => r.id);
        const ov = B.filter(id => A.has(id)).length / Math.min(A.size, B.length);
        if (ov < 0.4) bruch.push(`${lid} ${ss[i - 1].y} -> ${ss[i].y}: nur ${Math.round(ov * 100)} % gleiche Vereine`);
    }
}

// ---------- Ausgabe ----------
fs.writeFileSync(path.join(DIR, 'fbde_ebene58.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), quelle: QUELLE, annulliertUebernommen: ANNULLIERT_UEBERNEHMEN, ligen: {}, vereine: neueVereine, seasons }));
const B = [];
const p = s => B.push(s);
p(`fussball.de Ebene 5-8 – Probelauf ${new Date().toISOString().slice(0, 10)}  (Quelle ${QUELLE})`);
p(`Liga-Saisons neu: ${seasons.length}, Zeilen ${seasons.reduce((a, s) => a + s.table.length, 0)}  |  davon fruehere Ebene (fe) ${seasons.filter(s => s.fe).length}, Quotient 2019/20 ${seasons.filter(s => s.abbruch).length}, annulliert 2020/21 ${seasons.filter(s => s.an).length}`);
p(`Schon von Wikipedia vorhanden (nur verglichen): ${ausgelassen.wiki} Liga-Saisons – Zeilen gleich ${wikiVergleich.gleich}, abweichend ${wikiVergleich.abw}`);
wikiVergleich.bsp.forEach(b => p('    ' + b));
p(`Zurueckgezogene Mannschaften herausgenommen: ${zgRaus}`);
p('Repariert:'); repariert.forEach(r => p('    ' + r));
p(`Gegenprobe gegen die Einzelspiele (${spieleGelesen} Spiele): gleich ${probe.gleich}, abweichend ${probe.abw}, Verein ohne Spiele ${probe.ohne}  (${(100 * probe.gleich / (probe.gleich + probe.abw + probe.ohne)).toFixed(1)} % gleich)`);
p(`Aehnlich uebernommen: ${Object.keys(aehnlichZu).length} Namen, wegen gleichzeitigem Spielbetrieb gesperrt: ${SPERRE.size}`);
p(`Vereine: ${JSON.stringify(idStat)}  -> ${Object.keys(neueVereine).length} neue hist_fb-Vereine, Vorschlaege fuer ${Object.keys(vorschlag).length} Namen in tools/_dryrun/fbde_vorschlaege.txt`);
p('');
p('JE LIGA  (Saisons | Ebene abweichend | Gegenprobe gleich/abweichend/ohne Spiele)');
for (const lid of Object.keys(REGELN)) {
    const ss = (proLid[lid] || []).map(s => parseInt(s.y));
    const pr = Object.entries(probeLiga).filter(([k]) => k.startsWith(lid + '|')).reduce((a, [, v]) => ({ g: a.g + v.gleich, a: a.a + v.abw, o: a.o + v.ohne }), { g: 0, a: 0, o: 0 });
    const fehl = []; if (ss.length) for (let y = Math.min(...ss); y <= 2024; y++) if (!ss.includes(y) && !W45key.has(saison(y) + '|' + lid)) fehl.push(saison(y));
    p(`  ${lid.padEnd(6)} ${GD.leagues[lid].name.padEnd(38)} ${String(ss.length).padStart(2)} Saisons ${ss.length ? saison(Math.min(...ss)) + '–' + saison(Math.max(...ss)) : ''}  fe ${(proLid[lid] || []).filter(s => s.fe).length}  Probe ${pr.g}/${pr.a}/${pr.o}${fehl.length ? '  Luecken: ' + fehl.join(' ') : ''}`);
}
p('');
p('Gegenprobe – Liga-Saisons mit Abweichungen:');
Object.entries(probeLiga).filter(([, v]) => v.abw || v.ohne).sort().forEach(([k, v]) => p(`  ${k.replace('|', ' ')}: ${v.abw} abweichend, ${v.ohne} ohne Spiele${v.bsp.length ? '  z. B. ' + v.bsp.join(' | ') : ''}`));
p('');
p('Mehrere Staffeln in einer Liga-Saison (Corona-Gruppen / Rundenmodus – vor dem Einbau entscheiden):');
runden.forEach(r => p('  ' + r));
p('');
p('Ueber die Vereine zugeordnet (unbenannte Staffeln):');
ueberVereine.forEach(r => p('  ' + r));
p('');
p('Bruch in der Durchgaengigkeit (falsche Staffel?):');
bruch.forEach(r => p('  ' + r));
p('');
p('Nicht zugeordnet, mehrdeutig: ' + frei.filter(o => o.mehrdeutig).map(o => `${saison(o.y)} ${o.v} "${o.st}" -> ${o.mehrdeutig.join('/')}`).join(' | '));
fs.writeFileSync(path.join(DIR, '_dryrun', 'fbde_bericht.txt'), B.join('\n'));
fs.writeFileSync(path.join(DIR, '_dryrun', 'fbde_vorschlaege.txt'), Object.entries(vorschlag).map(([v, k]) => `${v}  =>  ${k}`).join('\n'));
console.log(B.slice(0, 8).join('\n'));
console.log('-> tools/fbde_ebene58.json, Bericht tools/_dryrun/fbde_bericht.txt');
fs.writeFileSync(path.join(DIR, '_dryrun', 'fbde_aehnlich.txt'), Object.entries(aehnlichZu).map(([n, id]) => `${n}  ->  ${GD.teams[id].name} [${id}]`).sort().join('\n'));
