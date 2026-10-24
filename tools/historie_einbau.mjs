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
import { vergleich, formen as formKurz } from './hist_unscharf.mjs';
// nur Schreibvariante, wenn auch die Vereinsform gleich ist (SG -> SC Lichtenberg 47 bleibt ein damaliger Name)
const variante = (a, b) => formKurz(a) === formKurz(b) && !!vergleich(a, b);

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
    // 2. Bundesliga des Seeds: nur andere Schreibweise des Spielvereins (hist_alias greift im Seed nicht)
    hist_fvwuerzburg04: 'wuerzburgerfv04_37',
    hist_fchanau93: '1hanauerfc93_1002',
    // SC Neubrandenburg (1961-66) = BSG Post = 1. FC Neubrandenburg 04 (Wikipedia, Namenshistorie)
    hist_scneubrandenburg: '1fcneubrandenburg04_727',
    // DDR-Oberliga 1949-55 (17.10.2026, je Fall Wikipedia): Umbenennungen bis zum heutigen Verein, keine gemeinsame Saison
    hist_ankerwismar: 'fcankerwismar_721',        // ZSG Anker 1949 -> BSG Motor 1951 -> TSG Wismar 1961 -> FC Anker Wismar
    hist_motorwismar: 'fcankerwismar_721',
    hist_dvpdresden: 'sgdynamodresden_820',       // SG Polizei -> SV Deutsche Volkspolizei Dresden -> SG Dynamo Dresden 1953
    hist_eintrachtstendal: '1fclokstendal_774',   // BSG Eintracht "Hans Wendler" 1949 -> Lok Stendal
    hist_gerasued: 'bsgwismutgera_861',           // BSG Gera-Sued 1949 -> Motor Gera -> Wismut Gera
    hist_motorgera: 'bsgwismutgera_861',
    hist_motordessau: 'svdessau05_851',           // "Am 2. Februar 1950 ... Umbenennung in BSG Motor Dessau" (Wikipedia SV Dessau 05)
    hist_mvbabelsberg: 'fortunababelsberg_754',   // BSG Maerkische Volksstimme 1949 -> Rotation Babelsberg 1950 (wie hist_rotationbabelsberg)
    hist_unionhalle: 'hallescherfc_821',          // ZSG Union Halle 1949 (Wikipedia Hallescher FC)
    hist_turbineweimar: 'sc1903weimar_896',       // "am 4. April 1951 in Turbine Weimar umbenannt" (Wikipedia SC 1903 Weimar)
    hist_industrieleipzig: 'bsgchemieleipzig_829', // ZSG Industrie Leipzig 1949 -> BSG Chemie Leipzig 1950 (hist_alias schon so)
    // Ziel ist selbst ein historischer Verein (Seed): BSG Franz Mehring Marga 1949 -> Aktivist Brieske-Ost, ZSG -> Stahl Altenburg
    hist_franzmehringmarga: 'hist_aktivistbrieske',
    hist_zsgaltenburg: 'hist_stahlaltenburg',
    // Seed v15: BSG Chemie Karl-Marx-Stadt "am 3. Maerz 1956 in den Sportclub Motor Karl-Marx-Stadt umgewandelt" (Wikipedia Chemnitzer FC)
    hist_chemiekarlmarxstadt: 'chemnitzerfc_827',
    // Seed v15: Vorwaerts Leipzig 1951 gegruendet, 1953 nach Berlin (ASK Vorwaerts), 1971 Frankfurt/Oder (Wikipedia 1. FC Frankfurt).
    // Die "Vorwaerts Leipzig"-Zeilen 1963-74 sind die spaetere Leipziger Armeemannschaft – hist_alias legt sie auf eine eigene ID.
    hist_vorwaertshvaleipzig: '1fcfrankfurtoder_741',
};
Object.entries(REMAP).forEach(([a, b]) => { if (!HC[a] || !(GD.teams[b] || HC[b])) throw new Error('REMAP ungueltig: ' + a + ' -> ' + b); });
// Koexistenz schlaegt Wikipedia: spielen alter und neuer Verein in derselben Saison, ist der alte nicht der Vorgaenger
// (Vorwaerts Stralsund 1978/79 neben Motor Stralsund = TSV 1860). Dann bleibt die hist-ID.
// Zeilen, die hist_alias.json ohnehin auf eine andere ID legt, zaehlen dabei nicht (Vorwaerts Leipzig 1963-74).
const ALIAS_VORAB = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'hist_alias.json'), 'utf8')); } catch (e) { return {}; } })();
const istA = (r, a) => r.id === a && !(r.nm && ALIAS_VORAB[r.nm] && ALIAS_VORAB[r.nm] !== a);
for (const [a, b] of Object.entries(REMAP)) {
    const zugleich = [...X.seasons, ...SEED.seasons].find(s => s.table.some(r => istA(r, a)) && s.table.some(r => r.id === b))
        || X.seasons.find(s => X.seasons.some(t => t !== s && t.y === s.y && t.table.some(r => istA(r, a))) && s.table.some(r => r.id === b));
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
// Ebene 5-8 vor dem Sim-Start aus fussball.de (tools/fbde_ebene58.mjs): Saisons unter den heutigen Liga-IDs, nur wo weder
// f-archiv noch Wikipedia die Saison haben. fe:1 = die Liga spielte damals auf einer anderen Ebene (Schalter in Rekorden und
// Ewiger Tabelle), an:1 = 2020/21 annulliert (probeweise drin, s. Kopf von tools/fbde_ebene58.mjs).
const FB = fs.existsSync(path.join(DIR, 'fbde_ebene58.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'fbde_ebene58.json'), 'utf8')) : null;
if (FB) {
    for (const [id, nm] of Object.entries(FB.vereine)) X.vereine[id] = nm;
    const da = new Set(X.seasons.map(s => s.y + '|' + s.lid));
    FB.seasons.forEach(s => { if (!da.has(s.y + '|' + s.lid)) X.seasons.push({ y: s.y, lid: s.lid, table: s.table, vr: s.vr, kumS: s.kumS, kumT: s.kumT, abbruch: s.abbruch, fe: s.fe, an: s.an }); });
}
// Grossschreibung der Quelle (tools/hist_grossschrift.json, Sheet 22.10.2026 „alle uppercase Schreibweisen fixen"): fussball.de
// schreibt v. a. am Niederrhein 2003-13 ganz gross und schneidet nach 20 Zeichen ab ("TUS 1911 GREVENBROIC"). Korrigiert wird
// GANZ AM ANFANG, damit alles Weitere den richtigen Namen sieht: die Zusammenlegung gleicher Namen (1d) verbindet dann von selbst
// ("SC 1911 KAPELLEN-ERF" -> SC Kapellen-Erft), und ein damaliger Name steht in normaler Schreibung ("SV Schott Jenaer Glas").
const GROSS = (() => { try { const o = JSON.parse(fs.readFileSync(path.join(DIR, 'hist_grossschrift.json'), 'utf8')); delete o._hinweis; return o; } catch (e) { return {}; } })();
const grossGesehen = new Set();
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste)
    if (r.nm && GROSS[r.nm]) { grossGesehen.add(r.nm); r.nm = GROSS[r.nm]; }
for (const [id, nm] of Object.entries(X.vereine)) if (GROSS[nm]) { grossGesehen.add(nm); X.vereine[id] = GROSS[nm]; }
const grossTot = Object.keys(GROSS).filter(k => !grossGesehen.has(k));
if (grossTot.length) console.log(`WARNUNG hist_grossschrift.json: ${grossTot.length} Eintraege treffen keinen Quellnamen mehr: ${grossTot.join(', ')}`);
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
// Fusions-Vorgaenger (tools/hist_fusion.json) behalten ihre ID – das Praefix waere sonst der Nachfolger ("SC Vahr" -> SC Vahr-Blockdiek,
// 2005 aus SC Vahr und SV Blockdiek fusioniert)
const FUS_VORG = new Set(Object.entries((() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'hist_fusion.json'), 'utf8')); } catch (e) { return {}; } })())
    .filter(([k]) => k !== '_hinweis').flatMap(([, f]) => f.vorgaenger));
for (const s of X.seasons) {
    if (gebietOf(s.lid) !== 'BRD') continue;
    const y = sy(s.y), belegt = new Set(X.seasons.filter(t => t.y === s.y).flatMap(t => t.table.map(r => r.id)));
    SEED.seasons.filter(t => t.y === s.y).forEach(t => t.table.forEach(r => belegt.add(r.id)));
    for (const r of s.table) {
        if (!r.id.startsWith('hist_fa_') || !r.nm || FUS_VORG.has(r.id)) continue;
        const reserve = (/\s(A|Amateure|Amat\.?|Amt\.?|Am\.?|II)$/.test(r.nm.trim()) && !/jeddeloh/i.test(r.nm)) || /_2$/.test(r.id);
        const basis = slug(r.nm.trim().replace(/\s(A|Amateure|Amat\.?|Amt\.?|Am\.?|II)$/, ''));
        let cand = null;
        if (reserve) {
            let main = TEAMS.filter(t => !t.isReserve && slug(t.name) === basis);
            if (!main.length) main = TEAMS.filter(t => !t.isReserve && slug(t.name).startsWith(basis) && TEAMS.some(q => q.isReserve && q.parentId === t.id));
            const res = main.length === 1 ? TEAMS.filter(t => t.isReserve && t.parentId === main[0].id) : [];
            if (res.length === 1) cand = res[0].id;
            // keine II im Spiel, aber eine historische ("Arminia Hannover" 1972/73 neben dem Regionalligisten = hist_fa_arminiahannovera)
            if (!cand && main.length === 1 && /_2$/.test(r.id)) {
                const h = Object.keys(X.vereine).filter(id => id.startsWith('hist_') && id !== r.id && /\s(A|Amateure|Amat\.?|Amt\.?|Am\.?|II)$/.test(X.vereine[id])
                    && slug(X.vereine[id].replace(/\s(A|Amateure|Amat\.?|Amt\.?|Am\.?|II)$/, '')) === basis);
                if (h.length === 1) cand = h[0];
            }
        } else if (y >= 1991 && basis.length >= 6) {
            const c = TEAMS.filter(t => !t.isReserve && (slug(t.name).startsWith(basis) || basis.startsWith(slug(t.name))));
            if (c.length === 1) cand = c[0].id;
        }
        if (!cand || belegt.has(cand)) continue;
        const cn = r.nm + ' -> ' + (GD.teams[cand] ? GD.teams[cand].name : X.vereine[cand]);
        belegt.add(cand); zuordnungC[cn] = (zuordnungC[cn] || 0) + 1;
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
// Nachfolger ausserhalb des Spiels (tools/hist_nachfolger.json): nur Anzeige im Steckbrief, kein Einfluss auf IDs
const NACHFOLGER_EXTERN = liesJ('hist_nachfolger.json');
// Ausgruendungen (tools/hist_ausgruendung.json): technisch Umbenennung (eine ID), im Steckbrief als "Ausgründung JAHR" benannt
const AUSGRUENDUNG = liesJ('hist_ausgruendung.json');
const GETR = new Set(Object.entries(liesJ('hist_alias_getrennt.json')).flatMap(([a, bs]) => (Array.isArray(bs) ? bs : []).map(b => a + '|' + b)));
// hist_alias_vorsorge.json: Namen laut Quelle, die (noch) in keiner Tabelle stehen – wirken wie hist_alias, ohne WARNUNG "tot"
const VORSORGE = liesJ('hist_alias_vorsorge.json'), UMBEN_DATEI = liesJ('hist_alias.json');
const UMBEN = Object.assign({}, VORSORGE, UMBEN_DATEI), ALIAS = Object.assign({}, UMBEN, SCHREIB);
const FGRUPPE = {};   // ID -> Nachfolger-ID ihrer Fusion (Nachfolger und Vorgaenger)
for (const [nf, f] of Object.entries(FUSION)) { FGRUPPE[nf] = nf; f.vorgaenger.forEach(v => FGRUPPE[v] = nf); }
let teilmengeNamen = null;
const eraExtra = [];   // [id, jahr, damaliger Name] für HISTORIC_NAMES (auch BRD, wenn der alte Name abweicht)
// Reserve-Zusatz wie in der Anzeige (A / Am. / Amateure = II, ausser Jeddeloh II) und heutiger Name auch historischer IDs
const resName = nm => nm.replace(/\s(A|Amateure|Amat\.?|Amt\.?|Am\.?)$/, m => /jeddeloh/i.test(nm) ? m : ' II');
// Anzeige seit v0.8.197 (Nutzer 11.10.2026: "amateure heißen amateure wenn es damals so war. sonst wurden sie zu II umbenannt"):
// A / Am. / Amat. / Amt. werden zu "Amateure" ausgeschrieben und stehen als damaliger Name; resName bleibt fuer den Vergleich
const AM_RE = /\s(A|Amateure|Amat\.?|Amt\.?|Am\.?)$/;
const amName = nm => /jeddeloh/i.test(nm) ? nm : nm.replace(AM_RE, ' Amateure');
const nameHeute = id => GD.teams[id] ? GD.teams[id].name
    : X.vereine[id] ? amName(X.vereine[id].replace(/ \((?:2\. Mannschaft\/)?Namensvetter\)$/, '')) : HC[id] || null;
// Editierabstand fuer "nur verschrieben" (Texterkennung der Quelle: "elektronic Neuruppin", "Geiselthal-Mitte")
const abstand = (a, b) => { let p = [...Array(b.length + 1).keys()];
    for (let i = 1; i <= a.length; i++) { const c = [i]; for (let k = 1; k <= b.length; k++) c[k] = Math.min(p[k] + 1, c[k - 1] + 1, p[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1)); p = c; }
    return p[b.length]; };
{
    const AB = { ts: 'turnerschaft', tus: 'turnundsport', tsv: 'turnundsport', sb: 'sportbund', sv: 'sportverein', sg: 'sportgemeinschaft',
        bv: 'ballspiel', bsv: 'ballspiel', fv: 'fussballverein', fc: 'fussballclub', sc: 'sportclub', spvgg: 'spielvereinigung', spvg: 'spielvereinigung',
        vfb: 'bewegungsspiele', vfl: 'leibesuebungen', vfr: 'rasenspiele', mtv: 'maennerturn', tv: 'turnverein', tg: 'turngemeinde' };
    const FORMW = new Set(Object.keys(AB).concat(Object.values(AB)).concat(['e', 'v', '1', 'i', 'fussball', 'club', 'verein', 'und', 'von', 'der', 'die', 'im', 'in', 'turn', 'sport']));
    // A, Am., Amat., Amateure = II. Ausnahme Jeddeloh II: der Name des ersten Teams, keine Reserve
    const RES0 = /(\s(III|II|2|U ?2[123]|Amateure|Amat\.?|Amt\.?|Am\.?|A))$/i;
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
    // eine bekannte Schreibvariante bestimmt nicht den Namen fuer die Automatik: fussball.de "Neustadt" (Brandenburgliga) machte
    // Schwarz-Rot Neustadt sonst zu "Neustadt" und legte den VfL Neustadt (Bayern 1963-65) dazu
    const schreibAus = nm => nm && SCHREIB[nm] ? (nameHeute(SCHREIB[nm]) || X.vereine[SCHREIB[nm]] || SCHREIB[nm]) : nm;
    const merkeA = (id, y, nm) => { const a = info[id] = info[id] || { jahre: new Set(), namen: {}, n: 0 }; a.jahre.add(y); a.n++; if (nm) a.namen[nm] = (a.namen[nm] || 0) + 1; };
    for (const s of X.seasons) { const y = sy(s.y);
        for (const r of s.table) merkeA(r.id, y, schreibAus(r.nm));
        for (const v of (s.vr || [])) for (const r of v.rows) merkeA(r.id, y, schreibAus(r.nm));
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
            if (GETR.has(a + '|' + b) || GETR.has(b + '|' + a)) continue;   // Nutzer: "zwei verschiedene Vereine" (hist_alias_getrennt.json)
            const na = nameVon(a), nb = nameVon(b);
            if (res(na) !== res(nb) || !teilmengeNamen(na, nb)) continue;
            if ([...info[a].jahre].some(y => info[b].jahre.has(y))) continue;   // gleiche Saison -> zwei Vereine
            // Ziel: der Spielverein, dann eine ID, auf die tools/hist_fusion.json zeigt, dann die aelteren Quellen vor fussball.de
            // (hist_fb_ ist die juengste – sonst verschwaende z. B. hist_fa_scvahr, der Fusions-Vorgaenger von SC Vahr-Blockdiek),
            // sonst die ID mit den meisten Zeilen
            const rang = id => GD.teams[id] ? 3 : FGRUPPE[id] ? 2 : /^hist_fb_/.test(id) ? 0 : 1;
            const [ab, weg] = rang(a) !== rang(b) ? (rang(a) > rang(b) ? [a, b] : [b, a]) : (info[a].n >= info[b].n ? [a, b] : [b, a]);
            ziel[weg] = ab; if (FGRUPPE[weg] && !FGRUPPE[ab]) FGRUPPE[ab] = FGRUPPE[weg]; info[ab].jahre = new Set([...info[ab].jahre, ...info[weg].jahre]); info[ab].n += info[weg].n;
            Object.entries(info[weg].namen).forEach(([nm, c]) => info[ab].namen[nm] = (info[ab].namen[nm] || 0) + c);
            zusammen++; if (bsp.length < 20) bsp.push(`${nameVon(weg)} -> ${nameVon(ab)}`);
        }
    }
    // Name -> ID (fuer Alias-Eintraege, die einen anderen Namen als Ziel nennen)
    const nameId = {};
    for (const id of Object.keys(info)) for (const nm of Object.keys(info[id].namen)) if (!nameId[nm] || info[nameId[nm]].n < info[id].n) nameId[nm] = find(id);
    // Namen, die es als Verein gibt (Spiel, Seed, Quellen) – ein Schreibweise-Ziel ausserhalb davon ist ein ausgeschriebener Name
    const BEKANNT = new Set([...Object.values(GD.teams).map(t => t.name), ...Object.values(HC), ...Object.values(X.vereine)]);
    // Aliase von Hand (Name -> Ziel-ID) haben Vorrang und gelten auch ohne gemeinsamen Namensteil
    let vonHand = 0;
    for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) {
        // Ziel darf eine ID oder ein anderer NAME sein ("FV Oetigheim": "FC Ötigheim") – der Name wird zur ID aufgeloest
        // "Name|Jahr" gilt nur fuer diese Saison (Lok Dresden 1963/64 = BSG Lok, ab 1965/66 = FSV Lok), "Name|Jahr|Liga" nur fuer
        // diese Tabelle (Lok Stendal 1988/89: Bezirksliga = Reserve, DDR-Liga = erste Mannschaft, beide in der Quelle "Lok Stendal")
        let zielId = r.nm ? ALIAS[r.nm + '|' + sy(s.y) + '|' + s.lid] || ALIAS[r.nm + '|' + sy(s.y)] || ALIAS[r.nm] || null : null;
        // tools/hist_dubletten.html entscheidet nach dem Vereinsnamen der ID, nicht nach dem Zeilennamen
        // ("Torgelower SV Greif" steht 1990/91 als "Greif Torgelow" da); nie auf ein Ziel, das in derselben Tabelle steht
        const idName = X.vereine[find(r.id)];
        if (!zielId && idName && ALIAS[idName]) { const z = ALIAS[idName]; if (!liste.some(o => o !== r && (o.id === z || o.nm === z))) zielId = z; }
        // Ketten folgen: "SV Merseburg 99" -> "1. FC Merseburg" -> vfbmerseburg_897
        for (const weg = new Set([r.nm]); zielId && ALIAS[zielId] && !weg.has(zielId);) { weg.add(zielId); zielId = ALIAS[zielId]; }
        const rohZiel = zielId;
        if (zielId && !info[zielId] && !GD.teams[zielId] && nameId[zielId]) zielId = nameId[zielId];
        // Ziel-Name, der nur im Seed steht ("BSV 07 Schwenningen" = hist_bsv07schwenningen)
        if (zielId && !info[zielId] && !GD.teams[zielId] && !HC[zielId]) zielId = Object.keys(HC).find(id => HC[id] === zielId) || zielId;
        // Schreibweise auf einen Namen, den es nirgends gibt = ausgeschriebener Name fuer diesen Verein ("SV Landsweiler-Leb." ->
        // "SV Landsweiler-Lebach", Nutzer 11.10.2026: Kuerzung tilgen): ID bleibt, nur der Anzeigename wird ersetzt
        // (der Name steht dann schon ueber schreibAus als Name dieser ID in nameId – daher am Rohziel pruefen)
        if (rohZiel && SCHREIB[r.nm] && !/^hist_|_\d+$/.test(rohZiel) && !BEKANNT.has(rohZiel) && (zielId === rohZiel || zielId === find(r.id))) {
            const eigen = find(r.id);
            if (!GD.teams[eigen]) X.vereine[eigen] = rohZiel;
            zielId = eigen;
        }
        const vorher = r.id;
        // Ziel-ID darf ein neuer historischer Verein sein (falsche Zuordnung trennen): Name gleich mitschreiben
        if (zielId && zielId.startsWith('hist_') && !X.vereine[zielId] && !HC[zielId]) X.vereine[zielId] = r.nm;
        // Alias auf die eigene ID ("SV Merseburg": hist_fa_svmerseburg) haelt die Zeile aus der Automatik heraus
        if (zielId) { if (zielId !== r.id) { r.id = zielId; vonHand++; } }
        else { const z = find(r.id); if (z !== r.id) r.id = z; }
        // NUR bei Zusammenlegung/Alias: der damalige Name weicht vom heutigen ab -> in der damaligen Tabelle so zeigen
        // auch fuer historische Ziele: "Bayer Uerdingen A" steht bei KFC Uerdingen II, hiess damals aber so
        if (r.id !== vorher && r.nm && !SCHREIB[r.nm] && nameHeute(r.id) && slug(resName(r.nm)) !== slug(nameHeute(r.id)) && !teilmengeNamen(resName(r.nm), nameHeute(r.id))) eraExtra.push([r.id, sy(s.y), r.nm]);
    }
    for (const id of Object.keys(X.vereine)) if (find(id) !== id || Object.values(ALIAS).includes(id)) { /* Name bleibt am Ziel */ }
    // Steht fuer einen Spielverein ein damaliger Name fest, gelten auch seine uebrigen alten Namen (Heidenheim 1972-76
    // stand schon unter der richtigen ID, hiess damals aber "Heidenheimer SB")
    const mitEra = new Set(eraExtra.map(e => e[0]));
    for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste)
        if (mitEra.has(r.id) && r.nm && !SCHREIB[r.nm] && slug(resName(r.nm)) !== slug(nameHeute(r.id)) && !teilmengeNamen(resName(r.nm), nameHeute(r.id))) eraExtra.push([r.id, sy(s.y), r.nm]);
    // Amateure: in jeder Saison, in der die Quelle sie so nennt, ist das der damalige Name ("Werder Bremen A" 1963-2004)
    for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste)
        if (r.nm && AM_RE.test(r.nm.trim()) && !/jeddeloh/i.test(r.nm) && nameHeute(r.id) && slug(amName(r.nm.trim())) !== slug(nameHeute(r.id))) eraExtra.push([r.id, sy(s.y), r.nm.trim()]);
    // Wache: ein Eintrag haengt am genauen Quellnamen - schreibt eine neue Scraper-Lieferung den Namen anders, greift er stumm
    // nicht mehr. Ebenso ein Ziel, das es als ID nicht (mehr) gibt.
    {
        const gesehen = new Set();
        for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) if (r.nm) { gesehen.add(r.nm.trim()); gesehen.add(resName(r.nm.trim())); }
        Object.values(X.vereine).forEach(n => { gesehen.add(n); gesehen.add(resName(n)); }); Object.values(HC).forEach(n => gesehen.add(n));
        const istId = z => /^hist_|_\d+$/.test(z);
        for (const [datei, o] of [['hist_alias.json', UMBEN_DATEI], ['hist_schreibweise.json', SCHREIB], ['hist_alias_vorsorge.json', VORSORGE]]) {
            const tot = datei === 'hist_alias_vorsorge.json' ? [] : Object.keys(o).filter(k => k !== '_hinweis' && !gesehen.has(k.split('|')[0]) && !Object.values(ALIAS).includes(k));
            const ohneZiel = Object.entries(o).filter(([k, z]) => k !== '_hinweis' && istId(z) && !GD.teams[z] && !X.vereine[z] && !HC[z]).map(([k, z]) => `${k} -> ${z}`);
            if (tot.length) log(`WARNUNG ${datei}: ${tot.length} Eintraege treffen keinen Quellnamen (Schreibweise der Lieferung geaendert?): ${tot.slice(0, 15).join(' | ')}${tot.length > 15 ? ' …' : ''}`);
            if (ohneZiel.length) log(`WARNUNG ${datei}: Ziel-ID gibt es nicht: ${ohneZiel.join(' | ')}`);
        }
    }
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
// Seed v14 (DDR 1949-55): diese Ziele haben eigene Seed-Zeilen – der Name der Quell-ID gaelte sonst fuer ALLE Seed-Jahre des
// Ziels (Dynamo Dresden bis 1963 als "SV Deutsche Volkspolizei"). Ihre damaligen Namen stehen saisongenau in HISTORIC_NAMES.
const REMAP_HN = new Set(['hist_ankerwismar', 'hist_motorwismar', 'hist_dvpdresden', 'hist_eintrachtstendal', 'hist_gerasued', 'hist_motorgera',
    'hist_motordessau', 'hist_mvbabelsberg', 'hist_unionhalle', 'hist_turbineweimar', 'hist_industrieleipzig', 'hist_franzmehringmarga', 'hist_zsgaltenburg', 'hist_chemiekarlmarxstadt', 'hist_vorwaertshvaleipzig']);
const REVERSE = Object.fromEntries(Object.entries(REMAP).filter(([a]) => !REMAP_HN.has(a)).map(([a, b]) => [b, a]));
const hatEra = (id, y) => (HN[id] || []).some(e => y >= (e.from ? sy(e.from) : -1e9) && y <= (e.to ? sy(e.to) : 1e9));
const jahrName = {}; // id -> {y: name}
const merke = (id, y, nm, immer) => {
    // historische IDs nur aus Zusammenlegung/Alias (immer), nicht aus dem DDR-Durchlauf (dort stehen OCR-Varianten)
    if (!(GD.teams[id] || immer) || !nm || (!immer && y > 1990) || hatEra(id, y)) return;
    const heute = nameHeute(id);
    if (!heute) return;
    const nm0 = nm, vonHand = !!ALIAS[nm];   // im Alias = Umbenennung von Hand bestaetigt (SG -> SC Hohenschoenhausen)
    // Amateure: Grundname wie heute, wenn er nur anders geschrieben ist ("1.FC Kaiserslautern A" -> "1. FC Kaiserslautern Amateure")
    if (AM_RE.test(nm.trim()) && !/jeddeloh/i.test(nm)) {
        const basis = nm.trim().replace(AM_RE, ''), hb = heute.replace(/\s(II|Amateure|U ?2[123])$/, '');
        // alle Woerter des heutigen Grundnamens stecken im Quellnamen ("Hertha BSC Berlin A" -> Hertha BSC): heutiger Grundname
        const wl = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').split(/[^a-z0-9]+/).filter(Boolean);
        const drin = wl(hb).every(w => wl(basis).includes(w));
        const j = jahrName[id] = jahrName[id] || {};
        // in hist_schreibweise = nur anders geschrieben ("Hertha Berlin A" 1999/2000): ebenfalls der heutige Grundname
        if (!j[y]) j[y] = (drin || SCHREIB[nm.trim()] === id || slug(basis) === slug(hb) || variante(basis, hb) ? hb : basis) + ' Amateure';
        return;
    }
    nm = resName(nm);
    if (slug(nm) === slug(heute)) return;
    // Abkuerzung/Verschreibung des heutigen Namens ist kein damaliger Name ("SV Südwest Lu'hafen", "Billigh. -Ingenh."), ausser von Hand
    // als Umbenennung bestaetigt (Nutzer 10.10.2026: "rechtschreibvarianten kürzel gehören generell getilgt")
    if (!UMBEN[nm0] && variante(nm, heute)) return;
    // historische ID, automatisch zusammengelegt: eine Verschreibung ist kein damaliger Name
    if (!GD.teams[id] && !vonHand && abstand(slug(nm), slug(heute)) <= 2) return;
    const j = jahrName[id] = jahrName[id] || {};
    if (!j[y]) j[y] = nm;
};
for (const s of X.seasons) if (gebietOf(s.lid) === 'DDR') for (const r of s.table) merke(r.id, sy(s.y), r.nm);
// aus Zusammenlegung/Alias: der damalige Name eines Spielvereins, auch in der BRD und nach 1990 ("SB Heidenheim")
eraExtra.forEach(([id, y, nm]) => merke(id, y, nm, true));
// Seed-Namen (DDR-Oberliga) erst NACH dem Vereinheitlichen dazu: "SC Fortschritt Weissenfels" (Oberliga 1955-60) darf nicht
// zur Schreibweise der Bezirksliga-Jahre werden, in denen der Verein BSG hiess.
const seedNamen = [];
for (const s of SEED.seasons) if (s.lid === 'ddr1') for (const r of s.table) if (REVERSE[r.id] || (REMAP[r.id] && !REMAP_HN.has(r.id))) {
    // Name der Quell-ID selbst – zeigen zwei Seed-IDs auf denselben Nachfolger (ZSG Anker 1949, Motor Wismar 1951 -> FC Anker
    // Wismar), kennt REVERSE nur eine davon
    const neu = REMAP[r.id] || r.id; seedNamen.push([neu, sy(s.y), HC[REMAP[r.id] ? r.id : REVERSE[neu]]]);
}
// Schreibvarianten derselben Namensform vereinheitlichen: mit/ohne DDR-Praefix ("BSG Fortschritt Bischofswerda") und
// Tippfehler der Quelle ("Wismut Pima-Copitz"). Vertreter: mit Praefix vor ohne, dann haeufigster, dann laengster.
const PRAEFIX = /^(bsg|sg|asg|tsg|hsg|zsg|ksg|sc)(?=[a-z])/;
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length]; };
let varianten = 0;
for (const [jid, j] of Object.entries(jahrName)) {
    if (!GD.teams[jid]) continue;   // historische IDs: SC/FC Karl-Marx-Stadt II sind zwei Namen, keine Schreibvarianten
    const zahl = {}; Object.values(j).forEach(n => zahl[n] = (zahl[n] || 0) + 1);
    const formen = Object.keys(zahl), kern = n => slug(n).replace(PRAEFIX, '');
    const pf = n => (slug(n).match(PRAEFIX) || [''])[0];
    // SC -> SG Lichtenberg 47 ist ein echter Namenswechsel: zwei VERSCHIEDENE Praefixe bleiben getrennt
    // dieselbe Namensform anders geschrieben oder umgestellt zaehlt auch: "SB Heidenheim" = "Heidenheimer SB"
    const gleich = (a, b) => (!(pf(a) && pf(b) && pf(a) !== pf(b)) && (kern(a) === kern(b) || lev(kern(a), kern(b)) <= 2))
        || (!!teilmengeNamen && teilmengeNamen(a, b)) || variante(a, b);
    const rang = n => [PRAEFIX.test(slug(n)) ? 1 : 0, zahl[n], n.length];
    const besser = (a, b) => { const x = rang(a), y = rang(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
    const vertreter = {};
    for (const n of formen) { let v = n; for (const m of formen) if (gleich(n, m) && besser(m, v)) v = m; vertreter[n] = v; }
    for (const y in j) if (vertreter[j[y]] !== j[y]) { j[y] = vertreter[j[y]]; varianten++; }
}
// historisches Ziel (Franz Mehring Marga -> Aktivist Brieske): der Seed-Name ist belegt, also wie ein Alias behandeln
seedNamen.forEach(([id, y, nm]) => merke(id, y, nm, !GD.teams[id]));
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
// Saisons, in denen der Verein in einer erfassten Tabelle steht – ohne damaligen Namen hiess er dort schon wie heute
const SG_RE = /^(SG|FSG|JSG|SpG|SGM)\b|\//;
const gespielt = {};
for (const s of X.seasons) for (const liste of [s.table, ...(s.vr || []).map(v => v.rows)]) for (const r of liste) (gespielt[r.id] = gespielt[r.id] || new Set()).add(sy(s.y));
for (const [id, j] of Object.entries(jahrName)) {
    const ys = Object.keys(j).map(Number).sort((a, b) => a - b), runs = [];
    for (const y of ys) {
        const last = runs[runs.length - 1];
        // gleicher Name mit Luecke (Saison in keiner erfassten Liga) bleibt ein Zeitraum, solange kein anderer Eintrag dazwischen liegt
        // – und keine Saison unter dem HEUTIGEN Namen (SG Westerburg 2011-21, 2022/23 schon als SG Westerburg/Gemuenden/Wilmenrod,
        // 2023-25 wieder SG Westerburg: drei Zeitraeume, Nutzer 22.10.2026 "so wie sie pro Saison gemeldet sind").
        // NUR fuer Spielgemeinschaften: dort ist hin und zurueck echt (Partner kommen und gehen). Bei anderen Vereinen entsteht die
        // "Luecke" aus verschiedenen Quellschreibungen (f-archiv "Motor Goerlitz", Wikipedia "Motor WAMA Goerlitz") – glaetten.
        // Erst ab 2001/02 (fussball.de): davor ist SG die Sportgemeinschaft (SG Castrop 02) und / steckt in Frankfurt/O.
        const sg = SG_RE.test(nameHeute(id) || '');
        if (last && last.name === j[y] && ![...Array(y - last.bis - 1)].some((_, i) => hatEra(id, last.bis + 1 + i) || (sg && last.bis + 1 + i >= 2001 && gespielt[id] && gespielt[id].has(last.bis + 1 + i) && !j[last.bis + 1 + i]))) last.bis = y;
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
    hessen: 'Süd', bayern: 'Süd', nordbaden: 'Süd', suedbaden: 'Süd', nordwuerttemberg: 'Süd', schwarzwaldbodensee: 'Süd', badenwuerttemberg: 'Süd', sued: 'Süd', wuerttemberg: 'Süd',
    // Ebene 4 1991-94: Landes-/Verbandsligen der neuen Laender unter der NOFV-Oberliga
    sachsen: 'Nordost', sachsenanhalt: 'Nordost', thueringen: 'Nordost', brandenburg: 'Nordost', mecklenburgvorpommern: 'Nordost',
};
const REGION_ORD = ['Nord', 'Berlin', 'Nordost', 'West', 'Südwest', 'Süd'];
// DDR-Bezirke in amtlicher Reihenfolge (I Rostock ... XV Berlin)
const BEZIRKE = ['rostock', 'schwerin', 'neubrandenburg', 'potsdam', 'frankfurtoder', 'cottbus', 'magdeburg', 'halle', 'erfurt', 'gera', 'suhl', 'dresden', 'leipzig', 'karlmarxstadt', 'berlin'];
const KURZ = { '2.': 'AL2', Bayernliga: 'OL', 'NRW-Liga': 'OL', Regionalliga: 'RL', Amateurliga: 'AL', Amateuroberliga: 'AOL', Verbandsliga: 'VL', Landesliga: 'LL', Oberliga: 'OL', Bezirksliga: 'BZL', 'DDR-Liga': 'DDR2' };
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
for (const [id, nm] of Object.entries(X.vereine)) if (benutzt.has(id)) vereine[id] = amName(nm.replace(/ \((?:2\. Mannschaft\/)?Namensvetter\)$/, ''));
const unbekannt = [...benutzt].filter(id => !GD.teams[id] && !HC[id] && !vereine[id]);
if (unbekannt.length) throw new Error('IDs ohne Namen: ' + unbekannt.slice(0, 10).join(', '));
// Fusionen: jede ID muss nach dem Zusammenlegen noch existieren, sonst zeigt der Steckbrief ins Leere
for (const [nf, fu] of Object.entries(FUSION)) for (const id of [nf, ...fu.vorgaenger])
    if (!GD.teams[id] && !HC[id] && !vereine[id]) throw new Error('hist_fusion.json: ' + id + ' gibt es nicht (zusammengelegt oder vertippt?)');
// Nachfolger ausserhalb: ID weg (zusammengelegt) -> WARNUNG und weglassen; Spielverein -> der hat "heute" schon
const nachfolgerExtern = {};
{
    const weg = [];
    const fusVorg = new Set(Object.values(FUSION).flatMap(f => f.vorgaenger));
    for (const [id, e] of Object.entries(NACHFOLGER_EXTERN)) {
        if (fusVorg.has(id)) continue;     // Fusions-Vorgaenger: der Steckbrief zeigt schon "AUFGEGANGEN IN" mit Link
        if (GD.teams[id] || (!HC[id] && !vereine[id])) { weg.push(id); continue; }
        nachfolgerExtern[id] = e;
    }
    if (weg.length) log(`WARNUNG hist_nachfolger.json: ${weg.length} IDs gibt es nicht mehr oder sind Spielvereine: ${weg.slice(0, 10).join(', ')}`);
}

for (const id of Object.keys(AUSGRUENDUNG))
    if (!GD.teams[id] && !HC[id] && !vereine[id]) throw new Error('hist_ausgruendung.json: ' + id + ' gibt es nicht (zusammengelegt oder vertippt?)');

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

// ---- 6c. Oberligen 1994-2008 (Ebene 4): welche Regionalliga darueber lag ----
// Bis 1999/2000 vier Regionalligen, ab 2000/01 zwei (Nord mit Nordost/Westfalen/Nordrhein, Sued mit Suedwest).
// [von, bis, Regionalliga] je Saison-Startjahr. Gegenprobe: jeder Aufsteiger muss in der eingetragenen Regionalliga landen.
const HOCH1994 = {
    'h4-nord-oberliga': [[1994, 2007, 'h3-nord-regionalliga']],
    'h4-nordost-oberliga': [[1994, 1999, 'h3-nordost-regionalliga'], [2000, 2007, 'h3-nord-regionalliga']],
    'h4-westfalen-oberliga': [[1994, 1999, 'h3-westsuedwest-regionalliga'], [2000, 2007, 'h3-nord-regionalliga']],
    'h4-nordrhein-oberliga': [[1994, 1999, 'h3-westsuedwest-regionalliga'], [2000, 2007, 'h3-nord-regionalliga']],
    'h4-suedwest-oberliga': [[1994, 1999, 'h3-westsuedwest-regionalliga'], [2000, 2007, 'h3-sued-regionalliga']],
    'h4-hessen-oberliga': [[1994, 2007, 'h3-sued-regionalliga']],
    'h4-badenwuerttemberg-oberliga': [[1994, 2007, 'h3-sued-regionalliga']],
    'h4-bayern-oberliga': [[1994, 2007, 'h3-sued-regionalliga']],
};
{
    const wo = {}; X.seasons.forEach(s => s.table.forEach(r => (wo[sy(s.y)] = wo[sy(s.y)] || {})[r.id] = s.lid));
    const h4 = Object.keys(ligen).filter(l => ligen[l].level === 4 && ligen[l].epoche === 'brd3');
    const ohne = h4.filter(l => !HOCH1994[l]);
    if (ohne.length) throw new Error('HOCH1994: Oberliga ohne Regionalliga darueber: ' + ohne.join(', '));
    let ok = 0; const falsch = [];
    X.seasons.filter(s => HOCH1994[s.lid]).forEach(s => s.table.forEach(r => {
        const y = sy(s.y), n = (wo[y + 1] || {})[r.id];
        if (!n || ligen[n]?.level !== 3) return;
        const soll = HOCH1994[s.lid].find(e => y + 1 >= e[0] && y + 1 <= e[1])?.[2];
        if (n === soll) ok++; else falsch.push(`${s.y} ${r.nm || r.id}: ${s.lid} -> ${n} (erwartet ${soll})`);
    }));
    if (falsch.length) throw new Error('HOCH1994 widerspricht den Aufsteigern: ' + falsch.join(' | '));
    log(`Oberligen 1994-2008 -> Regionalliga: ${h4.length} Ligen, ${ok} Aufsteiger bestaetigen die Zuordnung`);
}

// ---- 6c2. Ebene 4 vor 1994: Liga darueber aus den Vereinswechseln (gleiche Form wie HOCH1994) ----
// Je Saison zaehlt, in welcher Ebene-3-Liga die Auf- und Absteiger standen (Aufsteiger: naechste Saison, Absteiger: Vorsaison);
// nur Ligen, die es in DIESER Saison gab. Saisons ohne Wechsel erben die naechste belegte. Gegenstimmen werden gezaehlt.
const HOCH_ALT = {};
{
    const wo = {}; X.seasons.forEach(s => s.table.forEach(r => (wo[sy(s.y)] = wo[sy(s.y)] || {})[r.id] = s.lid));
    const gibt = {}; X.seasons.forEach(s => (gibt[sy(s.y)] = gibt[sy(s.y)] || new Set()).add(s.lid));
    let belege = 0, gegen = 0; const ohneBeleg = [];
    for (const lid of Object.keys(ligen).filter(l => ligen[l].level === 4 && ligen[l].gebiet !== 'DDR' && ligen[l].firstYear < 1994)) {
        const proJahr = {};
        X.seasons.filter(s => s.lid === lid).forEach(s => { const y = sy(s.y);
            s.table.forEach(r => [(wo[y + 1] || {})[r.id], (wo[y - 1] || {})[r.id]].forEach(n => {
                if (n && ligen[n]?.level === 3 && gibt[y]?.has(n)) { const c = proJahr[y] = proJahr[y] || {}; c[n] = (c[n] || 0) + 1; }
            })); });
        const ys = [...jahre[lid]].sort((a, b) => a - b), wahl = {};
        ys.forEach(y => { const c = proJahr[y]; if (!c) return; const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
            wahl[y] = best[0]; belege += best[1]; gegen += Object.values(c).reduce((a, b) => a + b, 0) - best[1]; });
        // Ohne einen einzigen Wechsel (Amateurliga Niedersachsen 1963/64, eine Saison): Ebene-3-Liga desselben Verbands in dieser Saison
        if (!Object.keys(wahl).length) ys.forEach(y => { const v = [...(gibt[y] || [])].filter(n => n.startsWith('h3-' + lid.split('-')[1] + '-'));
            if (v.length === 1) wahl[y] = v[0]; });
        if (!Object.keys(wahl).length) { ohneBeleg.push(lid); continue; }
        ys.forEach(y => { if (wahl[y]) return;
            const nah = ys.filter(z => wahl[z]).sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
            if (gibt[y]?.has(wahl[nah])) wahl[y] = wahl[nah]; });
        HOCH_ALT[lid] = ys.filter(y => wahl[y]).reduce((a, y) => { const b = a[a.length - 1];
            if (b && b[2] === wahl[y] && y === b[1] + 1) b[1] = y; else a.push([y, y, wahl[y]]); return a; }, []);
    }
    log(`Ebene 4 vor 1994 -> Liga darueber: ${Object.keys(HOCH_ALT).length} Ligen, ${belege} Wechsel bestaetigen, ${gegen} widersprechen${ohneBeleg.length ? ', ohne Beleg: ' + ohneBeleg.join(', ') : ''}`);
}

// ---- 6d. Heutige Liga als Nachfolger historischer Ligen (Nutzerwunsch 19.09.2026) ----
// Nur wo der Nachfolger EINDEUTIG ist und die Ewige Tabelle bei Wikipedia die Liga ueber den Ebenenwechsel hinweg zaehlt
// ("Ewige Tabelle der Fussball-Oberliga Westfalen": 1978-2008 + seit 2012; BW, Hessenliga, Rheinland-Pfalz/Saar: seit 1978,
// letztere ausdruecklich = Oberliga Suedwest 1978-2012). NICHT: Oberliga Nord/Nordrhein (aufgeteilt), Bayernliga und NOFV-Oberliga
// (heute je zwei Ligen im Spiel), Regionalligen (Zuschnitt je Aera anders). Die historischen IDs bleiben die Datentraeger
// (ebenenrichtig); die Oberflaeche zeigt sie unter der heutigen Liga (Saisonauswahl, Ewige Tabelle, Meister).
const LIGA_NACHFOLGER = {
    'h3-westfalen-oberliga': '5-10', 'h4-westfalen-oberliga': '5-10',
    'h3-badenwuerttemberg-oberliga': '5-2', 'h4-badenwuerttemberg-oberliga': '5-2',
    'h3-hessen-oberliga': '5-3', 'h4-hessen-oberliga': '5-3',
    'h3-suedwest-oberliga': '5-1', 'h4-suedwest-oberliga': '5-1',
    // Ebene 4 vor 1994 + die Linie bis 1963 (Nutzer 12.10.2026: "nachfolger, ja. mit hinweis in der ewigen tabelle").
    // Belegt in den Wikipedia-Artikeln der heutigen Ligen (Geschichte): oberste Liga des Verbands ueber alle Umbenennungen.
    // NICHT: Westfalen (heute zwei Westfalenliga-Staffeln), Hessen/Bayern-Landesligen (heute drei bzw. fuenf), Saarland,
    // Wuerttemberg vor 1978 (Verbandsliga 1978 aus Nordwuerttemberg + Schwarzwald-Bodensee), Oberliga Berlin 1974-91 (ging
    // in die Oberliga Nordost, nicht in die Berlin-Liga), die zweiten Ligen bis 1974 (-bis1974, heute mehrere Landesligen).
    'h3-hamburg-landesliga': '5-5', 'h4-hamburg-landesliga': '5-5', 'h4-hamburg-verbandsliga': '5-5',
    'h3-bremen-landesliga': '5-7', 'h4-bremen-verbandsliga': '5-7',
    'h3-schleswigholstein-amateurliga': '5-4', 'h3-schleswigholstein-landesliga': '5-4', 'h4-schleswigholstein-landesliga': '5-4', 'h4-schleswigholstein-verbandsliga': '5-4',
    'h3-niedersachsen-amateuroberliga': '5-6', 'h3-niedersachsen-amateurliga': '5-6', 'h4-niedersachsen-landesliga': '5-6', 'h4-niedersachsen-verbandsliga': '5-6',
    'h3-niederrhein-verbandsliga': '5-11', 'h4-niederrhein-verbandsliga': '5-11',
    'h3-mittelrhein-verbandsliga': '5-12', 'h4-mittelrhein-verbandsliga': '5-12',
    'h3-rheinland-amateurliga': '6-2', 'h4-rheinland-verbandsliga': '6-2',
    'h3-suedwest-amateurliga': '6-1', 'h4-suedwest-verbandsliga': '6-1',
    'h3-nordbaden-amateurliga': '6-4', 'h4-nordbaden-amateurliga': '6-4',
    'h3-suedbaden-amateurliga': '6-5', 'h3-suedbaden-verbandsliga': '6-5', 'h4-suedbaden-verbandsliga': '6-5',
    'h4-wuerttemberg-verbandsliga': '6-6',
    'h4-berlin-verbandsliga': '6-21',
    'h4-sachsen-landesliga': '6-24', 'h4-thueringen-landesliga': '6-23', 'h4-sachsenanhalt-verbandsliga': '6-22',
    'h4-brandenburg-verbandsliga': '6-20', 'h4-mecklenburgvorpommern-verbandsliga': '6-19',
};
{
    const fehlt = Object.entries(LIGA_NACHFOLGER).filter(([h, n]) => !ligen[h] || !GD.leagues[n]).map(([h, n]) => h + ' -> ' + n);
    if (fehlt.length) throw new Error('LIGA_NACHFOLGER: unbekannte Liga ' + fehlt.join(', '));
    // Zeitlich duerfen sich Vorgaenger und Nachfolger nicht ueberschneiden, sonst gaebe es eine Saison doppelt in der Auswahl
    const jahreVon = lid => new Set(X.seasons.filter(s => s.lid === lid).map(s => s.y));
    const schnitt = [];
    for (const n of new Set(Object.values(LIGA_NACHFOLGER))) {
        const alle = new Map();
        [n, ...Object.keys(LIGA_NACHFOLGER).filter(h => LIGA_NACHFOLGER[h] === n)].forEach(l => jahreVon(l).forEach(y => { if (alle.has(y)) schnitt.push(`${y} ${alle.get(y)} + ${l}`); else alle.set(y, l); }));
    }
    if (schnitt.length) throw new Error('LIGA_NACHFOLGER: Saison doppelt ' + schnitt.join(' | '));
    log(`Liga-Nachfolger: ${Object.keys(LIGA_NACHFOLGER).length} historische Ligen unter ${new Set(Object.values(LIGA_NACHFOLGER)).size} heutigen`);
}

// ---- 7. Tabellen packen ----
const zeile = r => ({ id: r.id, rank: r.rank, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga });
// Covid-Saisons: vr = Vorrunde (eigener Block), kumS/kumT = Endrunde enthaelt S/U/N bzw. Tore schon mit Vorrunde
const tabellen = X.seasons.map(s => Object.assign({ y: s.y, lid: s.lid }, s.abbruch ? { abbruch: 1 } : {}, s.doppel ? { doppel: s.doppel } : {}, s.fe ? { fe: 1 } : {}, s.an ? { an: 1 } : {}, s.vr ? { vr: s.vr.map(v => ({ g: v.g, rows: v.rows.map(zeile) })), kumS: s.kumS ? 1 : 0, kumT: s.kumT ? 1 : 0 } : {}, { rows: s.table.map(r => {
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
// Die Liga-Nachfolger gehen mit in die Version: sie aendern die Faltung der Ewigen Tabellen, und nur eine neue Version
// loest in bestehenden Spielstaenden die Neufaltung aus (archive.histExtSeeded)
const version = crypto.createHash('sha1').update(json).update(JSON.stringify(LIGA_NACHFOLGER)).digest('hex').slice(0, 10);
const zeilen = tabellen.reduce((a, t) => a + t.rows.length, 0);
const est = tabellen.reduce((a, t) => a + t.rows.filter(r => r.e).length, 0);

const kopf = `// ERZEUGT von tools/historie_einbau.mjs – nicht von Hand ändern.
// Historische Ligen Ebene 2–3 vor dem Sim-Start (BRD 1963–2024, DDR 1963–1991), Oberligen 1994–2008 (Ebene 4) und
// Ebene 4–5 ab 2008 aus f-archiv, Wikipedia und ifosta.de, Ebene 5–8 ab 2001 aus fussball.de (fe:1 = damals andere Ebene,
// an:1 = Saison 2020/21 annulliert).
// hoch1994: Oberliga 1994–2008 -> Regionalliga darüber, je Saison-Startjahr [von, bis, lid]; seit 12.10.2026 auch Ebene 4 vor 1994
// (Landes-/Verbandsligen -> Liga darüber, aus den Vereinswechseln).
// ligaNachfolger: historische Liga -> heutige Liga (eindeutiger Nachfolger; Saisonauswahl, Ewige Tabelle, Meister).
// ${tabellen.length} Liga-Saisons, ${zeilen} Vereinssaisons (davon ${est} mit geschätzten S/U/N, Kennung e:1).
// Die Tabellen stehen gzip+base64 in "gz" und werden erst bei Bedarf entpackt (app/hist_ext.js).
// remap: DDR-Vereine des Seeds -> heutiger Nachfolger (die Engine stellt alte Spielstände um).
`;
const out = kopf + 'var HIST_EXT = {\n'
    + `    version: ${JSON.stringify(version)},\n`
    + `    remap: ${JSON.stringify(REMAP)},\n`
    + `    hoch2008: ${JSON.stringify(W45 ? W45.hoch2008 : {})},\n`
    + `    hoch1994: ${JSON.stringify(Object.assign({}, HOCH1994, HOCH_ALT))},\n`
    + `    ligaNachfolger: ${JSON.stringify(LIGA_NACHFOLGER)},\n`
    + `    ligen: {\n${Object.values(ligen).map(l => '        ' + JSON.stringify(l.id) + ': ' + JSON.stringify(l)).join(',\n')}\n    },\n`
    + `    vereine: ${JSON.stringify(vereine)},\n`
    + `    namen: ${JSON.stringify(namen)},\n`
    + `    fusion: ${JSON.stringify(FUSION)},\n`
    + `    nachfolgerExtern: ${JSON.stringify(nachfolgerExtern)},\n`
    + `    ausgruendung: ${JSON.stringify(AUSGRUENDUNG)},\n`
    + `    gz: "${gz}"\n};\n`;
fs.writeFileSync(path.join(ROOT, 'app/history_ext.js'), out);
log(`IDs: Era-Name ${stat.eraId}, Seed-hist ${stat.seedId}, auf Nachfolger umgehaengt ${stat.remap} | Staffelnamen ${stat.staffel} | ohne S/U/N: nachgeschaetzt ${stat.geschaetztNachtrag}, leer ${stat.leer}`);
log(`Era-Namen: ${Object.keys(namen).length} Vereine (${varianten} Schreibvarianten vereinheitlicht), ${Object.values(namen).reduce((a, v) => a + v.length, 0)} Zeitraeume`);
log(`Tabellen ${tabellen.length}, Zeilen ${zeilen}, geschaetzt ${est} | Vereine ${Object.keys(vereine).length} | Ligen ${Object.keys(ligen).length}`);
log(`app/history_ext.js ${(out.length / 1024).toFixed(0)} KB (gz ${(gz.length / 1024).toFixed(0)} KB, JSON entpackt ${(json.length / 1024).toFixed(0)} KB), version ${version}`);
