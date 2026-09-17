// Regional- und Oberligen (Ebene 4 und 5) von 2008/09 bis 2024/25 aus Wikipedia (nur lesend) -> tools/wiki_ebene45.json
//
//   node tools/wiki_ebene45.mjs          danach: node tools/historie_einbau.mjs
//
// Nur Saisons, in denen die Liga schon auf der HEUTIGEN Ebene spielte (Oberligen seit 2008 Ebene 5, Regionalligen seit
// 2008 Ebene 4). Wo die heutige Liga dieselbe ist, landen die Saisons unter ihrer Spiel-ID (4-x/5-x); Ligen, die es heute
// nicht mehr gibt (Regionalliga Süd, Bayernliga und NRW-Liga 2008-12), bekommen eine historische ID.
// Mittelrheinliga und Oberliga Niederrhein/Westfalen vor 2012 waren Ebene 6 bzw. Teil der NRW-Liga – nicht dabei.
// Bayern spielte 2019-21 eine Doppelsaison: sie zaehlt als 2019/20.
//
// Vereins-IDs: Spielverein bei eindeutigem Namen (Kern ohne Vereinsform/Jahr) oder eindeutig bester Aehnlichkeit,
// Reserve nur zu Reserve, jede ID hoechstens einmal je Saison (auch gegen den bestehenden Seed und die Erweiterung).
// Sonst neue ID hist_wk_<name>.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Abschlusstabellen Ebene 4-5)';
const API = 'https://de.wikipedia.org/w/api.php';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const CACHE = path.join(os.tmpdir(), 'staffeln_ebene23_cache'); // derselbe Zwischenspeicher wie tools/staffeln_ebene23.mjs
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
        await sleep(Math.max(retry * 1000, 5000 * 2 ** i));
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
async function inhalte(titel) {
    const out = {};
    for (let i = 0; i < titel.length; i += 50) {
        const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titel.slice(i, i + 50).join('|') });
        (j.query?.pages || []).forEach(p => { out[p.title] = p.revisions ? p.revisions[0].slots.main.content : ''; });
    }
    return out;
}

globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js');
if (fs.existsSync(path.join(ROOT, 'app/history_ext.js'))) load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS;

// ---------- Ligen ----------
// Artikelstamm -> Ziel je Saison. staffel: Ueberschrift, die die Tabelle tragen muss (sonst genau eine Abschlusstabelle).
const HIST = {
    'h4-sued-regionalliga': { name: 'Regionalliga Süd', level: 4 },
    'h5-bayern-bayernliga': { name: 'Bayernliga', level: 5 },
    'h5-nrw-oberliga': { name: 'NRW-Liga', level: 5 },
};
// 2008/09 bis 2011/12 hingen die Ligen anders zusammen als heute (drei Regionalligen): wer lag wo darunter?
const HOCH_2008 = {
    '4-2': '3', '4-4': '3', 'h4-sued-regionalliga': '3',
    '5-1': '4-4', 'h5-nrw-oberliga': '4-4',
    '5-2': 'h4-sued-regionalliga', '5-3': 'h4-sued-regionalliga', 'h5-bayern-bayernliga': 'h4-sued-regionalliga',
    '5-4': '4-2', '5-5': '4-2', '5-6': '4-2', '5-7': '4-2', '5-8': '4-2', '5-9': '4-2',
};
function ziele(stamm, y) {
    const s = stamm;
    if (s === 'Fußball-Regionalliga') return y <= 2011 ? [{ lid: '4-2', staffel: /Nord/ }, { lid: '4-4', staffel: /West/ }, { lid: 'h4-sued-regionalliga', staffel: /Süd/ }] : null;
    const rl = { 'Fußball-Regionalliga Nord': '4-2', 'Fußball-Regionalliga Nordost': '4-3', 'Fußball-Regionalliga West': '4-4', 'Fußball-Regionalliga Südwest': '4-1', 'Fußball-Regionalliga Bayern': '4-5' }[s];
    if (rl) return y >= 2012 ? [{ lid: rl }] : null;
    if (s === 'Fußball-Bayernliga') return y <= 2011 ? [{ lid: 'h5-bayern-bayernliga' }] : [{ lid: '5-13', staffel: /Nord/ }, { lid: '5-14', staffel: /Süd/ }];
    if (s === 'NRW-Liga') return y <= 2011 ? [{ lid: 'h5-nrw-oberliga' }] : null;
    if (s === 'Fußball-Oberliga Nordost') return [{ lid: '5-8', staffel: /Nord/ }, { lid: '5-9', staffel: /Süd/ }];
    if (s === 'Fußball-Oberliga Niedersachsen') return [{ lid: '5-6', staffeln: y <= 2009 }];
    const ol = { 'Fußball-Oberliga Baden-Württemberg': '5-2', 'Fußball-Hessenliga': '5-3', 'Fußball-Oberliga Hamburg': '5-5', 'Fußball-Bremen-Liga': '5-7',
        'Fußball-Schleswig-Holstein-Liga': '5-4', 'Fußball-Oberliga Schleswig-Holstein': '5-4', 'Fußball-Oberliga Südwest': '5-1', 'Fußball-Oberliga Rheinland-Pfalz/Saar': '5-1' }[s];
    if (ol) return [{ lid: ol }];
    const ab2012 = { 'Fußball-Oberliga Niederrhein': '5-11', 'Fußball-Oberliga Westfalen': '5-10', 'Fußball-Mittelrheinliga': '5-12' }[s];
    if (ab2012) return y >= 2012 ? [{ lid: ab2012 }] : null;
    return null;
}

// ---------- Tabellen im Wikitext ----------
const splitTop = (s, sep = '|') => { const out = []; let d = 0, cur = ''; for (let i = 0; i < s.length; i++) { const two = s.slice(i, i + 2); if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; } if ((two === '}}' || two === ']]') && d > 0) { d--; cur += two; i++; continue; } if (d === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; continue; } cur += s[i]; } out.push(cur); return out; };
const AUSSCHLUSS = /Aufstieg|Abstieg|Relegation|Entscheidung|Qualifikation|Endrunde|Meisterschaft|Heim|Auswärts|Hinrunde|Rückrunde|Kreuz|Torschütz|Zuschauer|Halle|Vorrunde|Finalrunde|Pokal|Ewige|Meisterrunde|Abstiegsrunde|Play|Hauptrunde/i;
function tabellen(txt, alle) {
    const pfad = [], tabs = []; let cur = null;
    const neu = () => { cur = { pfad: pfad.filter(Boolean).join(' > '), zeilen: [] }; tabs.push(cur); };
    for (const l of txt.split('\n')) {
        const h = l.match(/^(=+)\s*(.*?)\s*=+\s*$/);
        if (h) { pfad.length = h[1].length; pfad[h[1].length - 1] = h[2]; cur = null; continue; }
        if (/^\{\{\s*Fußballtabelle\/Kopf/.test(l)) { neu(); continue; }
        if (!/^\{\{\s*Fußballtabelle\/Zeile/.test(l)) continue;
        if (!cur) neu();
        let d = 0, e = -1; for (let k = 0; k < l.length - 1; k++) { const two = l.slice(k, k + 2); if (two === '{{') { d++; k++; } else if (two === '}}') { d--; k++; if (!d) { e = k - 1; break; } } }
        const P = {}; splitTop((e > 0 ? l.slice(0, e) : l).replace(/^\{\{\s*Fußballtabelle\/Zeile\s*\|?/, '')).forEach(kv => { const m = kv.match(/^\s*([^=]+?)\s*=\s*([\s\S]*)$/); if (m) P[m[1]] = m[2].trim(); });
        // Die Vorlage laesst Nullen weg ("Rang=21 |N=8 |ET=8 |GT=25"): fehlende S/U/N/ET/GT sind 0, nur der Rang ist Pflicht
        if (P.Rang == null || P.Rang === '' || !isFinite(+P.Rang)) continue;
        for (const k of ['S', 'U', 'N', 'ET', 'GT']) if (P[k] == null || P[k] === '') P[k] = '0';
        if (![P.S, P.U, P.N, P.ET, P.GT].every(v => isFinite(+v))) continue;
        const roh = (P.Verein || '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/\[\[(?:Datei|File|Bild|Image):[^\]]*\]\]/gi, '');
        const ziel = (roh.match(/\[\[([^\]|#]+)/) || [])[1] || '';
        const verein = roh.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/'''?/g, '').replace(/&nbsp;/g, ' ').replace(/[/\s]+$/, '')
            .replace(/(\s*\([^)]*\))+\s*$/, '').replace(/\s+/g, ' ').trim().replace(/[/\s]+$/, ''); // "II/ (A)": Schrägstrich vor dem Zusatz
        const r = { rank: +P.Rang, verein, ziel, s: +P.S, u: +P.U, n: +P.N, gf: +P.ET, ga: +P.GT };
        if (P.Bonus != null && P.Bonus !== '' && isFinite(+P.Bonus)) r.bonus = +P.Bonus;   // mitgenommene Vorrunden-Punkte
        if (P.Pkt != null && isFinite(+P.Pkt) && P.Pkt !== '') r.pkt = +P.Pkt;
        if (P.Sp != null && isFinite(+P.Sp) && P.Sp !== '') r.sp = +P.Sp;
        cur.zeilen.push(r);
    }
    if (alle) return tabs.filter(t => t.zeilen.length >= 4 && !/Kreuz|Heim|Auswärts|Torschütz|Zuschauer|Modus/i.test(t.pfad));
    return tabs.filter(t => t.zeilen.length >= 8 && !AUSSCHLUSS.test(t.pfad));
}

// ---------- Vereinsabgleich ----------
const slug = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'spvg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'ssvg', 'asv', 'bsc', 'bfc', 'sportvg',
    'fsv', 'kfc', 'sus', 'svg', 'tsr', 'ev', 'rsv', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv', 'sf', 'spfr', 'e', 'v', '1', 'i', 'ii', 'u21', 'u23',
    'fussball', 'club', 'verein', 'sportverein', 'turn', 'und', 'von', 'tv', 'tg', 'mtv', 'tsc', 'ssc', 'jsg', 'teutonia']);
const RESERVE = /(\s(III|II|2|U ?2[123]|Amateure|Am\.?))$/i;
const istReserve = n => RESERVE.test(n.trim());
const ALIAS = { sf: 'sportfreunde', spfr: 'sportfreunde', rw: 'rotweiss', sw: 'schwarzweiss', bw: 'blauweiss' };
const STOP = new Set(['a', 'am', 'an', 'der', 'die', 'im', 'in', 'e', 'v']);
// Namenskern: Vereinsform, Jahreszahlen und Fuellwoerter weg, Ortsadjektiv -> Ort ("Spandauer" -> "spandau"), Farben zusammen
const kern = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/(\s(ii|2|u ?2[123]|amateure|am\.?))$/i, '').replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss')
    .split(/[^a-z0-9]+/).map(w => ALIAS[w] || w).filter(w => w && !FORM.has(w) && !STOP.has(w) && !/^\d+$/.test(w))
    .map(w => w.length >= 6 ? w.replace(/er$/, '') : w).sort();
// Vereinsform: nennen beide Namen eine und es gibt keine gemeinsame, sind es zwei Vereine ("1. FC Frankfurt" / "FSV Frankfurt")
const OHNE_FORM = new Set(['1', 'e', 'v', 'i', 'ii', 'u21', 'u23', 'fussball', 'club', 'verein', 'und', 'von', 'turn', 'sportverein']);
const formen = n => new Set(n.toLowerCase().split(/[^a-z0-9]+/).filter(w => FORM.has(w) && !OHNE_FORM.has(w)));
const formOk = (a, b) => { const A = formen(a), B2 = formen(b); return !A.size || !B2.size || [...A].some(w => B2.has(w)); };
const TEAMS = Object.values(GD.teams);
const kernIdx = {};
TEAMS.forEach(t => { const k = kern(t.name).join(' ') + (t.isReserve ? '|R' : ''); (kernIdx[k] = kernIdx[k] || []).push(t.id); });
const HIST_IDX = {};
Object.entries(HC).forEach(([id, n]) => { const k = kern(n).join(' ') + (istReserve(n) ? '|R' : ''); (HIST_IDX[k] = HIST_IDX[k] || []).push(id); });
// Vorschlaege (nicht angewendet): gleiche Reserve-Eigenschaft, mindestens ein gemeinsames Kernwort
const aehnlich = (a, b) => { const A = kern(a), B = kern(b); if (!A.length || !B.length) return 0; const t = A.filter(w => B.includes(w)).length; return t / (A.length + B.length - t); };
const KORREKTUR = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_ebene45_korrektur.json'), 'utf8')); } catch (e) { return {}; } })();
// belegt[y] = IDs, die in dieser Saison schon woanders spielen (Seed, Erweiterung, andere Wikipedia-Tabellen)
const belegt = {};
const merke = (y, id) => (belegt[y] = belegt[y] || new Set()).add(id);
SEED.seasons.forEach(s => s.table.forEach(r => merke(parseInt(s.y), r.id)));
const idStat = { exakt: 0, hist: 0, neu: 0 }, vorschlag = {}, neueVereine = {};
function idVon(verein, y) {
    const res = istReserve(verein), k = kern(verein).join(' ') + (res ? '|R' : '');
    const frei = id => !(belegt[y] && belegt[y].has(id));
    if (KORREKTUR[verein] && frei(KORREKTUR[verein])) { idStat.korrektur = (idStat.korrektur || 0) + 1; return KORREKTUR[verein]; }
    const exakt = (kernIdx[k] || []).filter(frei).filter(id => formOk(verein, GD.teams[id].name));
    if (exakt.length === 1) { idStat.exakt++; return exakt[0]; }
    if (!exakt.length && !vorschlag[verein]) {
        const kand = TEAMS.filter(t => !!t.isReserve === res).map(t => ({ t, a: aehnlich(verein, t.name) })).filter(x => x.a >= 0.5).sort((p, q) => q.a - p.a);
        if (kand.length) vorschlag[verein] = kand.slice(0, 3).map(x => `${x.t.name} [${x.t.id}] ${x.a.toFixed(2)}`).join(' / ');
    }
    const h = (HIST_IDX[k] || []).filter(frei);
    if (h.length === 1) { idStat.hist++; return h[0]; }
    let id = 'hist_wk_' + slug(verein), n = 2;
    while ((HC[id] && HC[id] !== verein) || (neueVereine[id] && neueVereine[id] !== verein)) id = 'hist_wk_' + slug(verein) + n++;
    if (!neueVereine[id]) idStat.neu++;
    neueVereine[id] = verein;
    return id;
}

// ---------- Covid-Modus: Vorrunde, danach Meister-/Aufstiegs- und Abstiegsrunde ----------
// Die Vorrunde ist eine vorgeschaltete Runde (eigener Block), die beiden Platzierungsrunden sind zwei Staffeln derselben
// Saison. Platz wird DURCHNUMMERIERT (Abstiegsrunde zaehlt nach der Meisterrunde weiter), der Platz in der Runde steht in gr.
// Die Artikel zaehlen verschieden: Endrunde enthaelt die ganze Saison (kumS/kumT), nur die Runde, oder – Westfalen –
// S/U/N nur die Runde, Tore dagegen mit Vorrunde und die Vorrunden-Punkte als Bonus. Erkannt wird das am Vergleich.
const ist = { oben: /Meisterrunde|Aufstiegsrunde/, unten: /Abstiegsrunde/ };
function platzierungsrunden(txt, y, lid, titel) {
    const tabs = tabellen(txt, true);
    const oben = tabs.find(tb => ist.oben.test(tb.pfad)), unten = tabs.find(tb => ist.unten.test(tb.pfad));
    if (!oben || !unten) return null;
    const vor = tabs.filter(tb => tb !== oben && tb !== unten && !ist.oben.test(tb.pfad) && !ist.unten.test(tb.pfad));
    if (!vor.length) return null;
    const vrName = tb => (tb.pfad.split(' > ').filter(x => !/^(Tabelle|Abschlusstabelle)$/.test(x)).pop() || 'Vorrunde');
    const vrListe = [];
    // Endrunden-Verein -> Vorrunden-Verein: gleicher Name, sonst gleicher Kern mit vertraeglicher Vereinsform (SSVg ≠ SC Velbert)
    const ausVorrunde = nm => {
        const exakt = vrListe.filter(v => v.nm === nm); if (exakt.length === 1) return exakt[0].id;
        const k = kern(nm).join(' ') + (istReserve(nm) ? '|R' : '');
        const c = vrListe.filter(v => kern(v.nm).join(' ') + (istReserve(v.nm) ? '|R' : '') === k && formOk(v.nm, nm));
        return c.length === 1 ? c[0].id : null;
    };
    const vr = vor.map(tb => ({ g: vor.length > 1 ? vrName(tb) : null, rows: tb.zeilen.map(r => {
        const id = idVon(r.verein, y); merke(y, id); vrListe.push({ nm: r.verein, id });
        return { rank: r.rank, id, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga, nm: r.verein };
    }) }));
    const vrVon = {}; vr.forEach(v => v.rows.forEach(r => { vrVon[r.id] = r; }));
    const table = []; let off = 0;
    for (const tb of [oben, unten]) {
        const g = (tb.pfad.match(/Meisterrunde|Aufstiegsrunde|Abstiegsrunde/) || [])[0];
        const sortiert = tb.zeilen.slice().sort((a, b) => a.rank - b.rank);
        const erster = sortiert[0].rank;   // manche Artikel zaehlen die Abstiegsrunde schon weiter (11, 12, ...)
        for (const r0 of sortiert) {
            const r = Object.assign({}, r0, { rank: r0.rank - erster + 1 });
            const id = ausVorrunde(r.verein) || idVon(r.verein, y);
            const row = { rank: off + r.rank, gr: r.rank, g, id, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga, nm: r.verein };
            if (r.bonus != null) row.b = r.bonus;
            table.push(row);
        }
        off += sortiert.length;
    }
    // Zaehlweise: gilt fuer ALLE Vereine komponentenweise "Endrunde >= Vorrunde", enthaelt die Endrunde die Vorrunde schon
    // zurueckgezogene Vereine (0 Spiele in der Endrunde) sagen ueber die Zaehlweise nichts
    const paare = table.filter(r => r.s + r.u + r.n > 0).map(r => [r, vrVon[r.id]]).filter(([, v]) => v);
    const mitSpiel = table.filter(r => r.s + r.u + r.n > 0).length;
    const kumS = paare.length === mitSpiel && paare.every(([r, v]) => r.s >= v.s && r.u >= v.u && r.n >= v.n);
    const kumT = kumS || (paare.length === mitSpiel && paare.every(([r, v]) => r.gf >= v.gf && r.ga >= v.ga) && table.some(r => r.b != null));
    rundenBericht.push(`${saison(y)} ${titel.replace(/ \d{4}.*$/, '')}: Vorrunde ${vr.map(v => v.rows.length).join('+')}, ${oben.zeilen.length}+${unten.zeilen.length} (${table[0].g}/${table[table.length - 1].g}), S/U/N ${kumS ? 'gesamt' : 'nur Runde'}, Tore ${kumT ? 'gesamt' : 'nur Runde'}${table.some(r => r.b != null) ? ', Bonus' : ''}${paare.length !== mitSpiel ? `, ${mitSpiel - paare.length} ohne Vorrunde!` : ''}`);
    return { y: saison(y), lid, table, vr, kumS, kumT, quelle: titel };
}
const rundenBericht = [];

const ZWISCHEN = /Unterbrechung|Zwischenstand/i;
const STAFFEL = /Staffel|Gruppe(?!nphase$)/i;
// "Gruppenphase > Gruppe Nord > Tabelle" -> "Nord", "Staffel Weser-Ems/Lüneburg > Tabelle" -> "Weser-Ems/Lüneburg"
const staffelName = (pfad, i) => {
    const teil = pfad.split(' > ').find(x => /^(Staffel|Gruppe) /.test(x));
    return teil ? teil.replace(/^(Staffel|Gruppe) /, '') : ((pfad.match(/Ost|West|Nord|Süd/) || [])[0] || String(i + 1));
};
const warnung = [];

// ---------- Abruf ----------
const seasons = [], fehlt = [], stat = { artikel: 0, tabellen: 0, zeilen: 0 };
for (let y = 2008; y <= 2024; y++) {
    const kat = await kategorie(y);
    const titel = kat.filter(t => !/Frauen|Jugend|Junior|Pokal|Futsal/.test(t)).map(t => {
        const m = t.match(/^(.*?) (\d{4})(\/\d{2,4}|–21)$/); if (!m || +m[2] !== y) return null;
        const z = ziele(m[1], y); return z ? { t, z } : null;
    }).filter(Boolean);
    const txt = await inhalte(titel.map(x => x.t));
    for (const { t, z } of titel) {
        stat.artikel++;
        const runden = z.length === 1 ? platzierungsrunden(txt[t] || '', y, z[0].lid, t) : null;
        if (runden) { seasons.push(runden); stat.tabellen += 2 + runden.vr.length; stat.zeilen += runden.table.length; continue; }
        const tabs = tabellen(txt[t] || '');
        for (const ziel of z) {
            let wahl;
            if (ziel.staffel) wahl = tabs.filter(tb => ziel.staffel.test(tb.pfad));
            else wahl = tabs;
            // Zwischenstaende weichen, wenn es eine spaetere Tabelle gibt (Regionalliga Bayern 2019-21: "Nach Fortfuehrung")
            if (wahl.length > 1 && wahl.some(tb => !ZWISCHEN.test(tb.pfad))) wahl = wahl.filter(tb => !ZWISCHEN.test(tb.pfad));
            // parallele Staffeln einer Liga (2020/21 oft zwei Gruppen) werden ALLE uebernommen, als Staffeln der Saison
            const parallel = wahl.filter(tb => STAFFEL.test(tb.pfad));
            let gruppiert = !!ziel.staffeln;
            if (!ziel.staffel && !ziel.staffeln && parallel.length >= 2) { wahl = parallel; gruppiert = true; }
            // sonst: die mit "Abschlusstabelle"/"Tabelle" im Pfad, sonst die erste
            else if (!ziel.staffeln && wahl.length > 1) { const a = wahl.filter(tb => /Tabelle/i.test(tb.pfad)); wahl = [(a.length ? a : wahl)[0]]; }
            if (ziel.staffel && wahl.length > 1) wahl = [wahl[0]];
            if (!wahl.length) { fehlt.push(`${saison(y)} ${t} -> ${ziel.lid}${ziel.staffel ? ' ' + ziel.staffel : ''} (Tabellen: ${tabs.map(tb => tb.pfad || '-').join(' | ')})`); continue; }
            const table = [];
            wahl.forEach((tb, i) => {
                const g = gruppiert ? staffelName(tb.pfad, i) : null;
                tb.zeilen.forEach(r => {
                    const row = { rank: r.rank, id: idVon(r.verein, y), s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga, nm: r.verein };
                    if (r.pkt != null && r.pkt !== 3 * r.s + r.u) row.p = r.pkt;          // Punktabzug
                    if (r.sp != null && r.sp !== r.s + r.u + r.n) row.sp = r.sp;
                    if (g) row.g = g;
                    merke(y, row.id); table.push(row);
                });
                stat.tabellen++;
            });
            stat.zeilen += table.length;
            const eintrag = { y: saison(y), lid: ziel.lid, table, quelle: t };
            // Covid: abgebrochene Saisons 2019/20 und 2020/21 wurden nach Quotient (Punkte je Spiel) gewertet
            // 2019/20 wurde auf diesen Ebenen ueberall abgebrochen; sonst (2020/21, Doppelsaison) nur, wenn die Tabelle ein
            // Abbruchstand ist oder die Spielzahlen ungleich sind – RL Suedwest/West 2020/21 liefen zu Ende
            if (/–21$/.test(t)) eintrag.doppel = '2019–21';
            const sp = table.map(r => r.s + r.u + r.n), ungleich = Math.max(...sp) - Math.min(...sp) >= 2;
            if ((y === 2019 && !eintrag.doppel) || ((y === 2020 || eintrag.doppel) && (ungleich || wahl.some(tb => ZWISCHEN.test(tb.pfad) || /Abbruch/i.test(tb.pfad))))) eintrag.abbruch = 1;
            // Warnung: Staffeltabellen im Artikel mit mehr Zeilen als uebernommen (Gegenprobe gegen Auswahlfehler)
            const imArtikel = tabs.filter(tb => STAFFEL.test(tb.pfad) && !ZWISCHEN.test(tb.pfad) && (!ziel.staffel || ziel.staffel.test(tb.pfad))).reduce((a, tb) => a + tb.zeilen.length, 0);
            if (imArtikel > table.length) warnung.push(`${saison(y)} ${t} -> ${ziel.lid}: Artikel ${imArtikel} Zeilen in Staffeltabellen, uebernommen ${table.length}`);
            seasons.push(eintrag);
        }
    }
    process.stdout.write(`${saison(y)} `);
}
// Doppelte Saisons (zwei Artikel auf dieselbe Liga, z. B. SH-Liga/Oberliga SH im Umbenennungsjahr): erste gewinnt
const gesehen = new Set(), doppelt = [];
const eindeutig = seasons.filter(s => { const k = s.y + '|' + s.lid; if (gesehen.has(k)) { doppelt.push(k + ' ' + s.quelle); return false; } gesehen.add(k); return true; });
const ligen = Object.fromEntries(Object.entries(HIST).map(([id, h]) => {
    const ys = eindeutig.filter(s => s.lid === id).map(s => parseInt(s.y));
    return [id, { id, name: h.name, level: h.level, gebiet: 'BRD', firstYear: Math.min(...ys), lastYear: Math.max(...ys), staffelnMax: 1 }];
}));
fs.writeFileSync(path.join(DIR, 'wiki_ebene45.json'), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), ligen, vereine: neueVereine, hoch2008: HOCH_2008, seasons: eindeutig }));
console.log(`\nArtikel ${stat.artikel}, Tabellen ${stat.tabellen}, Liga-Saisons ${eindeutig.length}, Zeilen ${stat.zeilen}`);
console.log(`IDs: ${JSON.stringify(idStat)}`);
const proLid = {}; eindeutig.forEach(s => (proLid[s.lid] = proLid[s.lid] || []).push(parseInt(s.y)));
Object.entries(proLid).sort().forEach(([l, ys]) => console.log(`  ${l.padEnd(22)} ${ys.length}: ${ys.sort().join(' ')}`));
if (doppelt.length) console.log('Doppelt (verworfen): ' + doppelt.join(' | '));
console.log('Platzierungsrunden (' + rundenBericht.length + '):\n  ' + rundenBericht.join('\n  '));
console.log('Abgebrochen (Quotient): ' + eindeutig.filter(s => s.abbruch).map(s => s.y + ' ' + s.lid).join(', '));
console.log('Doppelsaison: ' + eindeutig.filter(s => s.doppel).map(s => s.y + ' ' + s.lid).join(', '));
console.log('Staffeln: ' + eindeutig.filter(s => !s.vr && s.table.some(r => r.g)).map(s => `${s.y} ${s.lid} (${[...new Set(s.table.map(r => r.g))].join('/')})`).join(', '));
if (warnung.length) console.log('WARNUNG – weniger uebernommen als im Artikel (' + warnung.length + '):\n  ' + warnung.join('\n  '));
if (fehlt.length) console.log('Ohne Tabelle (' + fehlt.length + '):\n  ' + fehlt.join('\n  '));
fs.writeFileSync(path.join(DIR, '_dryrun', 'wiki_ebene45_vorschlaege.txt'), Object.entries(vorschlag).map(([v, k]) => `${v}  =>  ${k}`).join('\n'));
console.log(`Vorschlaege fuer ${Object.keys(vorschlag).length} Namen -> tools/_dryrun/wiki_ebene45_vorschlaege.txt (Uebernahme per tools/wiki_ebene45_korrektur.json)`);
console.log('-> tools/wiki_ebene45.json');
