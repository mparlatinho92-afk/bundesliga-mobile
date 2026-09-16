// DRY-RUN: Ebene 2-3 (f-archiv + Wikipedia-Ergaenzung) als Seed-Erweiterung bauen und headless gegen die Engine laufen
// lassen – OHNE eine Spieldatei zu aendern. Alles passiert im Speicher; Ergebnisse nach tools/_dryrun/ (gitignored).
//
//   node tools/farchiv_ebenen.mjs <farchiv.csv> tools/wiki_ergaenzung.csv && node tools/farchiv_vereine.mjs
//   node tools/historie_dryrun.mjs
//
// Prueft: Liga-IDs + Ebenen, Vereins-IDs (A/B/K echt, sonst neue hist_-ID), Doppelbelegung in einer Saison,
// S/U/N-Auffuellung aus dem Wikipedia-Cache, Engine-Start mit erweitertem Seed (NaN, Dauer, Archivgroesse),
// gepackte Groesse, Zugewinn im Ligaverlauf.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const OUT = path.join(DIR, '_dryrun');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const say = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
const SACKGASSE = [];
const sackgasse = (titel, befund, vorschlag) => { SACKGASSE.push({ titel, befund, vorschlag }); say(`!! SACKGASSE: ${titel} – ${befund}`); };

globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS;
const EB = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_ebene23.json'), 'utf8'));
const VZ = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_vereine.json'), 'utf8')).zuordnung;
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const slug = s => s.toLowerCase().replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const mb = b => (b / 1048576).toFixed(2) + ' MB', kb = b => (b / 1024).toFixed(1) + ' KB';

// ---------- 1. Liga-IDs ----------
// 3. Liga ab 2008 = bestehende Liga "3". Sonst eine historische ID je Gebiet/Ebene/Verband/Ligatyp;
// mehrere Staffeln derselben ID in einer Saison bekommen g (wie die 2. BL Nord/Sued im Seed).
const ligaTyp = l => (l.match(/^(?:1\. )?(Regionalliga|Oberliga|Amateuroberliga|Amateurliga|Verbandsliga|Landesliga|Bezirksliga|DDR-Liga|NOFV-Liga|Bayernliga)/) || [, 'Liga'])[1].replace('NOFV-Liga', 'DDR-Liga').replace('Bayernliga', 'Oberliga');
const HLIG = {};
const lidVon = t => {
    if (t.verband === '3. Liga') return '3';
    const id = `h${t.ebene}${t.gebiet === 'DDR' ? 'd' : ''}-${slug(t.verband)}-${slug(ligaTyp(t.liga))}`;
    const h = HLIG[id] = HLIG[id] || { id, name: t.gebiet === 'DDR' && t.ebene === 2 ? 'DDR-Liga' : `${ligaTyp(t.liga)} ${t.verband}`.replace('Liga DDR-Liga', 'DDR-Liga'), level: t.ebene, gebiet: t.gebiet, firstYear: t.y, lastYear: t.y, staffelnMax: 0 };
    h.firstYear = Math.min(h.firstYear, t.y); h.lastYear = Math.max(h.lastYear, t.y);
    return id;
};

// ---------- 2. Vereins-IDs ----------
const neueHist = {}; // name -> hist-ID
let ankerAusserhalb = 0;
const nameJahre = {}; // f-archiv-Name -> Set(Saison-Startjahre) in Ebene 2-3
EB.tabellen.forEach(t => t.zeilen.forEach(z => (nameJahre[z.verein] = nameJahre[z.verein] || new Set()).add(t.y)));
const idVon = (name, y, ti) => {
    const z = VZ[name];
    // Anker-Namensformen nur in ihrer Zeit (+-2 Saisons): die Bezirksliga-"Turbine Halle" der 70er ist nicht der Hallesche FC
    // Ein Zeitfenster war zu streng (1402 Zeilen): "Stahl Eisenhüttenstadt" steht nur 1969/70 im Seed, spielt danach aber 20 Jahre
    // DDR-Liga als derselbe Verein. Ob eine Namensform zur ID passt, entscheidet die Doppelbelegung (4b): ist die ID in der Saison
    // schon anderswo belegt ("Turbine Halle" 1970 Bezirksliga, HFC Chemie Oberliga), verliert die tiefere Zeile. Hier nur gezaehlt.
    // Richtiges Kriterium ist KONTINUITAET: ausserhalb ihrer Seed-Jahre gilt die Namensform nur, wenn der Name lueckenlos
    // (hoechstens eine Saison Luecke) an diese Jahre anschliesst. Stahl Eisenhüttenstadt 1968-72: zusammenhaengend -> ja.
    // "Turbine Halle" 1965: zwoelf Jahre nach 1953 -> nein (sonst E1 -> E3 -> E1 beim Halleschen FC, wo dieser nicht im Seed steht).
    let ankerZeit = true;
    if (z && z.grund === 'Anker-Namensform' && z.ankerVon != null && (y < z.ankerVon || y > z.ankerBis)) {
        const jahre = nameJahre[name] || new Set();
        const [von, bis] = y < z.ankerVon ? [y, z.ankerVon] : [z.ankerBis, y];
        let luecke = 0;
        for (let j = von + 1; j < bis; j++) { if (jahre.has(j)) luecke = 0; else if (++luecke > 1) { ankerZeit = false; break; } }
        if (!ankerZeit) ankerAusserhalb++;
    }
    // Fehlender Anschluss allein ist KEIN Ausschluss: Ebene 4 und die Jahre vor 1963 fehlen in den Daten – SV Sandhausen spielte
    // zwischen Oberliga (E3) und 2. BL (Seed) eben Ebene 4. Nur zusammen mit einem Ebenensprung wird abgespalten (4c).
    const bruch = !ankerZeit;
    ankerZeit = true;
    if (z && z.id && ['A', 'B', 'K'].includes(z.stufe) && ankerZeit) return { id: z.id, art: z.stufe, bruch };
    if (z && z.id && !ankerZeit) ankerAusserhalb++;
    // Neue hist-ID je Name UND zusammenhaengender Region: "VfL Neustadt" in der Pfalz und in Oberfranken sind zwei Vereine
    const key = name + (nameKomp.get(ti + '|' + name) || '');
    if (!neueHist[key]) { let id = 'hist_fa_' + slug(name), n = 2; while (HC[id] || Object.values(neueHist).includes(id)) id = 'hist_fa_' + slug(name) + n++; neueHist[key] = id; }
    return { id: neueHist[key], art: !ankerZeit ? 'Anker-ausserhalb' : z ? z.stufe : '?' };
};

// ---------- 3. S/U/N aus dem Wikipedia-Cache ----------
const splitTop = (s, sep = '|') => { const out = []; let d = 0, cur = ''; for (let i = 0; i < s.length; i++) { const two = s.slice(i, i + 2); if (two === '{{' || two === '[[') { d++; cur += two; i++; continue; } if ((two === '}}' || two === ']]') && d > 0) { d--; cur += two; i++; continue; } if (d === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; continue; } cur += s[i]; } out.push(cur); return out; };
const WIKI = new Map(); // "y|platz|gf|ga" -> [{s,u,n,titel,platz,gf,ga}]
const WIKI_TAB = new Map(); // Artikeltitel -> alle Tabellenzeilen (fuer den Rest-Abgleich innerhalb eines Artikels)
let wikiSeiten = 0, wikiZeilen = 0;
for (const cacheName of ['staffeln_ebene23_cache', 'wiki_tabellen_cache']) {
    const cdir = path.join(os.tmpdir(), cacheName);
    if (!fs.existsSync(cdir)) continue;
    for (const f of fs.readdirSync(cdir)) {
        let j; try { j = JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8')); } catch { continue; }
        for (const p of (j.query?.pages || [])) {
            const c = p.revisions?.[0]?.slots?.main?.content; if (!c) continue;
            const y = +((p.title.match(/(\d{4})\/\d{2,4}/) || [])[1] || 0); if (!y) continue;
            wikiSeiten++;
            for (const l of c.split('\n')) {
                if (!/^\{\{\s*Fußballtabelle\/Zeile/.test(l)) continue;
                let d = 0, e = -1; for (let k = 0; k < l.length - 1; k++) { const two = l.slice(k, k + 2); if (two === '{{') { d++; k++; } else if (two === '}}') { d--; k++; if (!d) { e = k - 1; break; } } }
                const P = {}; splitTop((e > 0 ? l.slice(0, e) : l).replace(/^\{\{\s*Fußballtabelle\/Zeile\s*\|?/, '')).forEach(kv => { const m = kv.match(/^\s*([^=]+?)\s*=\s*([\s\S]*)$/); if (m) P[m[1]] = m[2].trim(); });
                if (![P.Rang, P.S, P.U, P.N, P.ET, P.GT].every(v => v != null && v !== '' && isFinite(+v))) continue;
                const k = `${y}|${+P.Rang}|${+P.ET}|${+P.GT}`;
                const verein = (P.Verein || '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
                    .replace(/\[\[(?:Datei|File|Bild|Image):[^\]]*\]\]/gi, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
                    .replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/'''?/g, '').replace(/\s+/g, ' ').trim();
                const eintrag = { s: +P.S, u: +P.U, n: +P.N, titel: p.title, platz: +P.Rang, gf: +P.ET, ga: +P.GT, verein };
                (WIKI.get(k) || WIKI.set(k, []).get(k)).push(eintrag);
                (WIKI_TAB.get(p.title) || WIKI_TAB.set(p.title, []).get(p.title)).push(eintrag);
                wikiZeilen++;
            }
        }
    }
}
say(`Wikipedia-Cache: ${wikiSeiten} Saisonartikel, ${wikiZeilen} Tabellenzeilen mit S/U/N`);

// ---------- 3a. S/U/N aus ifosta.de (tools/ifosta_tabellen.mjs) ----------
// Schluessel "gebiet|ebene|Liganame|Startjahr" -> Staffel-Tabellen [{datei, zeilen:[{platz, verein, sp, s, u, n, gf, ga, pkt, pktMinus}]}]
const IFOSTA_DATEI = path.join(os.tmpdir(), 'ifosta_cache', '_tabellen.json');
const IFOSTA = fs.existsSync(IFOSTA_DATEI) ? JSON.parse(fs.readFileSync(IFOSTA_DATEI, 'utf8')) : {};
say(`ifosta: ${Object.keys(IFOSTA).length} Liga-Saisons im Zwischenspeicher`);

// Gehoert ein Wikipedia-Artikel zur selben Liga wie die f-archiv-Tabelle? Mit Wortgrenzen: "Oberliga Nord" darf nicht
// "Oberliga Nordrhein" treffen, die BRD-"Amateurliga Berlin" nicht die DDR-"Bezirksliga Berlin".
const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
function gleicheLiga(t, titel) {
    const T = titel.replace(/ \d{4}\/\d{2,4}.*$/, '');
    if (t.gebiet === 'DDR') {
        if (t.ebene === 2) return /^(DDR-Fußball-Liga|NOFV-Liga)$/.test(T);
        return T === 'Fußball-Bezirksliga ' + t.verband || (t.verband === 'Karl-Marx-Stadt' && T === 'Fußball-Bezirksliga Chemnitz');
    }
    if (/Bezirksliga|DDR/.test(T)) return false;
    if (t.verband === '3. Liga') return /^3\. Fußball-Liga$/.test(T);
    if (/^Regionalliga/.test(t.liga)) return /^Fußball-Regionalliga$/.test(T);
    return new RegExp('(^|[\\s-])' + esc(t.verband) + '($|\\s)').test(T)
        || (t.verband === 'Bayern' && /Bayernliga/.test(T)) || (t.verband === 'Hessen' && /Hessenliga/.test(T));
}

// ---------- 3b. Namensgleiche trennen ----------
// Landesverband oben in der Regionshierarchie (team.regions[0]) je Regionsname. Tabellen eines Namens, deren Verbaende sich
// beruehren (Regionalliga Sued = Bayern/Hessen/BW beruehrt Amateurliga Bayern), gehoeren zu EINEM Verein; getrennte Verbaende
// sind getrennte Vereine. Tabellen ohne Region (3. Liga) haengen am groessten Teil.
const TOP = {};
Object.values(GD.teams).forEach(tm => { const top = (tm.regions || [])[0]; (tm.regions || []).forEach(r => (TOP[r] = TOP[r] || new Set()).add(top)); });
const topsVon = t => new Set((t.regionen || []).flatMap(r => [...(TOP[r] || [])]));
const nameKomp = new Map(); // "Tabellenindex|Name" -> "" oder "#n"
let getrennteNamen = 0;
{
    const proName = {};
    EB.tabellen.forEach((t, ti) => { const tops = topsVon(t); t.zeilen.forEach(z => (proName[z.verein] = proName[z.verein] || []).push({ ti, tops })); });
    for (const [name, occ] of Object.entries(proName)) {
        const komp = [], leer = [];
        for (const o of occ) {
            if (!o.tops.size) { leer.push(o); continue; }
            const treff = komp.filter(k => [...o.tops].some(x => k.tops.has(x)));
            if (!treff.length) { komp.push({ tops: new Set(o.tops), ti: [o.ti] }); continue; }
            const k0 = treff[0]; o.tops.forEach(x => k0.tops.add(x)); k0.ti.push(o.ti);
            for (const k of treff.slice(1)) { k.tops.forEach(x => k0.tops.add(x)); k0.ti.push(...k.ti); komp.splice(komp.indexOf(k), 1); }
        }
        if (!komp.length) komp.push({ tops: new Set(), ti: [] });
        const gross = komp.reduce((a, b) => b.ti.length > a.ti.length ? b : a);
        leer.forEach(o => gross.ti.push(o.ti));
        if (komp.length > 1) getrennteNamen++;
        komp.forEach((k, i) => k.ti.forEach(ti => nameKomp.set(ti + '|' + name, komp.length > 1 ? '#' + i : '')));
    }
}
say(`Namensgleiche Vereine in getrennten Regionen: ${getrennteNamen} Namen`);

// ---------- 4. Seed-Erweiterung bauen ----------
const seasons = {}; // "y|lid" -> {y, lid, table}
const stat = { zeilen: 0, sunDa: 0, sunWiki: 0, sunWikiWiderspruch: 0, sunFehlt: 0, idArt: {} };
const nachAuffuellen = [];
const widersprueche = [], mehrdeutig = [], abweichend = [], ligaPaar = {}, restBsp = [];
stat.wikiArt = {}; stat.sunIfosta = 0; stat.ifostaArt = {}; stat.ifostaProbe = { gleich: 0, anders: 0, keiner: 0 }; const ifostaAnders = [];
stat.frueherFremdeLiga = 0; stat.sunWikiMehrdeutig = 0; stat.restProbe = { richtig: 0, falsch: 0, keiner: 0 };
// Rest-Abgleich: noch nicht vergebene Wikipedia-Zeile desselben Artikels mit gleichem Platz, gleichen Spielen und gleichen Punkten;
// Tore nur wie ein Tippfehler abweichend (ein Wert gleich oder beide hoechstens 3 daneben)
// + gemeinsames Namenswort: die Gegenprobe (Tore +10) fand 55 falsche Treffer (0,6 %) – in Artikeln mit mehreren Staffeln gibt es
// denselben Platz mehrfach, und bei gleichen Spielen/Punkten/Gegentoren griff die Zeile einer ANDEREN Staffel. Der Tippfehler
// steckt im Torverhaeltnis, nicht im Namen.
const namensWoerter = s => (s || '').toLowerCase().replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/).filter(w => w.length >= 4);
const gemeinsamesWort = (a, b) => { const A = namensWoerter(a), B = namensWoerter(b);
    return A.some(x => B.some(y => x === y || (x.length >= 5 && y.length >= 5 && (x.startsWith(y.slice(0, -2)) && Math.abs(x.length - y.length) <= 3 || y.startsWith(x.slice(0, -2)) && Math.abs(x.length - y.length) <= 3)))); };
const restKand = (zeilen, benutzt, z) => zeilen.filter(x => !benutzt.has(x) && x.platz === z.platz
    && (z.sp == null || x.s + x.u + x.n === z.sp)
    && (z.pktMinus != null ? 2 * x.s + x.u === z.pkt : (3 * x.s + x.u === z.pkt || 2 * x.s + x.u === z.pkt))
    && (x.gf === z.gf || x.ga === z.ga || (Math.abs(x.gf - z.gf) <= 3 && Math.abs(x.ga - z.ga) <= 3))
    && gemeinsamesWort(x.verein, z.verein));
// ---------- 3c. Ganze Staffel aus ifosta.de uebernehmen ----------
// Wo f-archiv und ifosta sich nicht nur in S/U/N, sondern auch in Toren, Punkten und Plaetzen unterscheiden (1963/64 fast
// ueberall: SV Schlebusch f-archiv 68:32/44:16, ifosta 70:33/42:18), findet der Platz-Abgleich nichts. ifosta ist in sich
// stimmig (Tabelle = Kreuztabelle) und traf 1572 von 1580 bekannten Zeilen. Deshalb: laesst sich JEDER Verein einer Staffel
// ueber den Namen genau einem Verein EINER ifosta-Staffel zuordnen (gleiche Spielzahl, Reserve gleich Reserve), gilt die
// ifosta-Tabelle ganz – Platz, Spiele, S/U/N, Tore, Punkte. Nur fuer Staffeln mit Luecken in S/U/N.
stat.ifostaTabelle = 0; stat.ifostaTabelleZeilen = 0; const ifostaTabBsp = [], ifostaTabProbeBsp = [];
{
    const ohneZusatz = n => (n || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/[„“"]/g, '').trim();
    const reserveVon = n => /(\s(A|Am\.?|Amat\.?|II|2|Amateure)|\sAm\.)$/i.test(ohneZusatz(n));
    // Namensaehnlichkeit: Vereinsform-Kuerzel zaehlen kaum, Ortsnamen/Namenswoerter entscheiden; Jahreszahlen "1889" = "89";
    // Tippfehler (Wolfenbuettler/Wolfenbuetteler) bis Levenshtein 2 ab 5 Buchstaben.
    const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'spvg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'ssvg', 'asv', 'bsc', 'bfc', 'sportfreunde',
        'sportvg', 'fsv', 'kfc', 'sus', 'svg', 'tsr', 'ev', 'rsv', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv', 'sse', 'sf', 'spfr', 'am', 'amateure', 'e', 'v', '1', 'i']);
    const toks = n => ohneZusatz(n).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/(\s(a|am|amat|ii|2|amateure)\.?)$/, '').split(/[^a-z0-9]+/).filter(Boolean).map(w => ALIAS[w] || w).map(w => /^(18|19)\d\d$/.test(w) ? w.slice(2) : w);
    const levK = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, k) => [k]);
        for (let q = 1; q <= b.length; q++) d[0][q] = q;
        for (let k = 1; k <= a.length; k++) for (let q = 1; q <= b.length; q++) d[k][q] = Math.min(d[k - 1][q] + 1, d[k][q - 1] + 1, d[k - 1][q - 1] + (a[k - 1] === b[q - 1] ? 0 : 1));
        return d[a.length][b.length]; };
    // Tippfehler nur bei gleichem Wortanfang: "Singen"/"Wangen" und "Brandenburg"/"Oranienburg" sind verschiedene Orte
    // Ortsadjektiv = Ort ("Wuerzburger"/"Wuerzburg", "Erler"/"Erle")
    const stamm = w => w.length >= 4 ? w.replace(/er$/, '').replace(/e$/, '') : w;
    const gleichW = (a, b) => a === b || stamm(a) === stamm(b) || (a.length >= 6 && b.length >= 6 && a[0] === b[0] && levK(a, b) <= (a.length >= 10 ? 2 : 1));
    // Sportgemeinschafts- und Traditionswoerter: zaehlen halb und reichen allein nie ("Motor Netschkau" ist nicht "Motor Koethen")
    const GENERISCH = new Set(['motor', 'lokomotive', 'stahl', 'chemie', 'einheit', 'dynamo', 'empor', 'aufbau', 'traktor', 'fortschritt', 'vorwaerts',
        'turbine', 'aktivist', 'wismut', 'rotation', 'post', 'medizin', 'wissenschaft', 'energie', 'lok', 'kali', 'glueckauf', 'bau', 'hsg', 'isg', 'asg',
        'germania', 'borussia', 'eintracht', 'union', 'viktoria', 'fortuna', 'alemannia', 'arminia', 'preussen', 'olympia', 'kickers', 'sportfreunde',
        'rot', 'weiss', 'blau', 'schwarz', 'gruen', 'sparta', 'teutonia', 'concordia', 'phoenix', 'hertha', 'tasmania', 'westfalia', 'rhenania', 'bayern', 'sued', 'nord', 'west', 'ost']);
    const ALIAS = { lok: 'lokomotive', akt: 'aktivist', vorw: 'vorwaerts' };
    const aehnlich = (a, b) => {
        const A = toks(a), B = toks(b);
        let dA = A.filter(w => !FORM.has(w)), dB = B.filter(w => !FORM.has(w));
        // Gruendungsjahr nur werten, wenn beide eins nennen ("FC Singen" = "FC Singen 04")
        const zahl = w => /^\d+$/.test(w);
        if (!(dA.some(zahl) && dB.some(zahl))) { dA = dA.filter(w => !zahl(w)); dB = dB.filter(w => !zahl(w)); }
        if (!dA.length || !dB.length) return 0;
        if (dA.join('') === dB.join('')) return 1 + 0.01 * A.filter(w => FORM.has(w) && B.includes(w)).length; // "Niederroden" = "Nieder-Roden"
        const tr = dA.filter(w => dB.some(v => gleichW(w, v)));
        // ein echtes Namenswort muss passen – oder Gruendungsjahr + Traditionsname ("Viktoria 89" = "BFC Viktoria 1889")
        if (!tr.some(w => !GENERISCH.has(w) && !zahl(w)) && !(tr.some(zahl) && tr.some(w => GENERISCH.has(w)))) return 0;
        const gew = w => GENERISCH.has(w) ? 0.5 : 1;
        const summe = l => l.reduce((x, w) => x + gew(w), 0);
        const t = summe(tr);
        const form = A.filter(w => FORM.has(w) && B.includes(w)).length;
        return t / (summe(dA) + summe(dB) - t) + 0.01 * form;
    };
    stat.ifostaTabProbe = { gleich: 0, anders: 0, staffeln: 0 };
    for (const t of EB.tabellen) {
        // GEGENPROBE: vollstaendige Staffeln laufen mit, werden aber nicht veraendert – dort muessen die Paare dieselben S/U/N haben
        const probe = t.zeilen.every(z => z.s != null);
        const lid = lidVon(t); if (lid === '3') continue;
        // Quellen: ifosta-Staffeln (Zeilenzahl muss passen), dann Wikipedia-Artikel derselben Liga-Saison (duerfen mehr
        // Zeilen haben – ein Artikel enthaelt oft alle Staffeln; die Spielzahl trennt Aufstiegsrunden heraus)
        const zweiP = t.y < 1995;
        const staffeln = (IFOSTA[`${t.gebiet}|${t.ebene}|${HLIG[lid].name}|${t.y}`] || []).map(st => ({ ...st, obermenge: false }))
            .concat([...WIKI_TAB.keys()].filter(ti => +((ti.match(/(\d{4})\/\d{2,4}/) || [])[1]) === t.y && gleicheLiga(t, ti)).map(ti => ({
                datei: 'Wikipedia: ' + ti, obermenge: true,
                zeilen: WIKI_TAB.get(ti).map(x => { const sp = x.s + x.u + x.n, p = (zweiP ? 2 : 3) * x.s + x.u;
                    return { verein: x.verein, platz: x.platz, sp, s: x.s, u: x.u, n: x.n, gf: x.gf, ga: x.ga, pkt: p, pktMinus: zweiP ? 2 * sp - p : null }; }) })));
        for (const st of staffeln) {
            const ifo = st.zeilen;
            if ((st.obermenge ? ifo.length < t.zeilen.length : ifo.length !== t.zeilen.length) || ifo.some(x => x.s == null)) continue;
            // alle Paare mit Aehnlichkeit, gleicher Reserve-Eigenschaft und gleicher Spielzahl; beste zuerst vergeben
            const paare = [];
            for (const z of t.zeilen) for (const x of ifo) {
                if (reserveVon(x.verein) !== reserveVon(z.verein) || (z.sp != null && x.sp !== z.sp)) continue;
                const a = aehnlich(z.verein, x.verein); if (a > 0) paare.push({ z, x, a });
            }
            paare.sort((p1, p2) => p2.a - p1.a);
            const paar = new Map(), vergeben = new Set();
            let ok = true;
            for (const pr of paare) {
                if (paar.has(pr.z) || vergeben.has(pr.x)) continue;
                // Gleichstand mit einem anderen, noch freien Kandidaten derselben Zeile -> nicht entscheidbar
                const gleich = paare.find(q => q !== pr && q.z === pr.z && !vergeben.has(q.x) && Math.abs(q.a - pr.a) < 1e-9);
                if (gleich) { ok = false; if (process.env.IFO_DEBUG && !probe) console.log('DBG-GLEICH', saison(t.y), t.liga, pr.z.verein, '=', pr.x.verein, '/', gleich.x.verein, pr.a); break; }
                paar.set(pr.z, pr.x); vergeben.add(pr.x);
            }
            if (ok && paar.size !== t.zeilen.length) ok = false;
            if (!ok && process.env.IFO_DEBUG && !probe) console.log('DBG', saison(t.y), t.liga, st.datei, 'offen:', t.zeilen.filter(z => !paar.has(z)).map(z => z.verein + '/' + z.sp).join(', '), '| frei:', ifo.filter(x => !vergeben.has(x)).map(x => x.verein + '/' + x.sp).join(', '));
            if (!ok) continue;
            if (probe) {
                stat.ifostaTabProbe.staffeln++;
                for (const [z, x] of paar) {
                    if (x.s === z.s && x.u === z.u && x.n === z.n) stat.ifostaTabProbe.gleich++;
                    else { stat.ifostaTabProbe.anders++; if (ifostaTabProbeBsp.length < 12) ifostaTabProbeBsp.push(`${saison(t.y)} ${t.liga}: ${z.verein} ${z.s}-${z.u}-${z.n} <-> ${x.verein} ${x.s}-${x.u}-${x.n}`); }
                }
                break;
            }
            for (const [z, x] of paar) Object.assign(z, { platz: x.platz, sp: x.sp, s: x.s, u: x.u, n: x.n, gf: x.gf, ga: x.ga,
                pkt: x.pkt, pktMinus: x.pktMinus, quelle: st.obermenge ? 'wikipedia' : 'ifosta' });
            t.zeilen.sort((a, b) => a.platz - b.platz);
            stat.ifostaTabelle++; stat.ifostaTabelleZeilen += t.zeilen.length;
            ifostaTabBsp.push(`${saison(t.y)} ${t.liga}${t.staffel ? ' ' + t.staffel : ''} (${st.datei})`);
            break;
        }
    }
}
for (const [ti, t] of EB.tabellen.entries()) {
    const lid = lidVon(t);
    const key = t.y + '|' + lid;
    const S = seasons[key] = seasons[key] || { y: saison(t.y), lid, table: [], staffeln: 0 };
    S.staffeln++;
    if (lid !== '3') HLIG[lid].staffelnMax = Math.max(HLIG[lid].staffelnMax, S.staffeln);
    const benutzt = new Set(), titelZaehl = {}, offen = [], treffer1 = []; // fuer den Rest-Abgleich innerhalb des Artikels
    for (const z of t.zeilen) {
        stat.zeilen++;
        const { id, art, bruch } = idVon(z.verein, t.y, ti);
        stat.idArt[art] = (stat.idArt[art] || 0) + 1;
        let s = z.s, u = z.u, n = z.n, quelle = 'f-archiv';
        if (s == null || u == null || n == null) {
            const alle = WIKI.get(`${t.y}|${z.platz}|${z.gf}|${z.ga}`) || [];
            // NUR Wikipedia-Tabellen DERSELBEN Liga: Saison + Platz + Torverhaeltnis trafen sonst 95-mal eine fremde Liga
            // (Bezirksliga Dresden 1989 <-> Oberliga Hessen) – wo Spiele und Punkte zufaellig passten, wurde falsch aufgefuellt.
            const w = alle.filter(x => gleicheLiga(t, x.titel));
            const pruef = x => {
                const spOk = z.sp == null || x.s + x.u + x.n === z.sp;
                const p2 = 2 * x.s + x.u, p3 = 3 * x.s + x.u;
                const dPkt = z.pkt == null ? 0 : z.pktMinus != null ? z.pkt - p2 : (Math.abs(z.pkt - p3) <= Math.abs(z.pkt - p2) ? z.pkt - p3 : z.pkt - p2);
                return { spOk, pktOk: dPkt === 0, dPkt };
            };
            if (alle.length === 1 && !w.length) { const c = pruef(alle[0]); if (c.spOk && c.pktOk) stat.frueherFremdeLiga++; }
            if (w.length > 1) { stat.sunWikiMehrdeutig++; mehrdeutig.push({ y: t.y, liga: t.liga, verband: t.verband, platz: z.platz, verein: z.verein, tore: z.gf + ':' + z.ga, titel: w.map(x => x.titel) }); }
            if (w.length === 1) {
                const x = w[0], c = pruef(x);
                const stamm = x.titel.replace(/ \d{4}\/\d{2,4}.*$/, ''), pk = t.gebiet + t.ebene + ' ' + t.verband;
                (ligaPaar[pk] = ligaPaar[pk] || {})[stamm] = (ligaPaar[pk][stamm] || 0) + 1;
                // Annahme-Regeln (aus den 290 Widerspruechen abgeleitet):
                //  Spiele + Punkte gleich              -> uebernehmen
                //  Spiele gleich, Punkte weichen <= 6  -> uebernehmen: Punktabzug/Umwertung; S/U/N = Ergebnisse auf dem Platz,
                //                                         die amtlichen f-archiv-Punkte bleiben in p2/p stehen
                //  Punkte gleich, Spiele weichen ab    -> uebernehmen: S/U/N passen zu Punkten und Toren (Bezirksliga Gera 1977/78: 30 vs 28)
                //  beides weicht ab                    -> verwerfen (Energie Cottbus II 1976/77: Wikipedia 25 statt 30 Spiele)
                let art = null;
                if (c.spOk && c.pktOk) art = 'gleich';
                else if (c.spOk && Math.abs(c.dPkt) <= 6) art = 'Punkte weichen ab';
                else if (!c.spOk && c.pktOk) art = 'Spiele weichen ab';
                const eintrag = { y: t.y, liga: t.liga, verband: t.verband, ebene: t.ebene, gebiet: t.gebiet, platz: z.platz, verein: z.verein,
                    fa: { sp: z.sp, tore: z.gf + ':' + z.ga, pkt: z.pkt, pktMinus: z.pktMinus }, wiki: { titel: x.titel, s: x.s, u: x.u, n: x.n, sp: x.s + x.u + x.n, p2: 2 * x.s + x.u, p3: 3 * x.s + x.u }, ...c, art };
                if (art) { s = x.s; u = x.u; n = x.n; quelle = 'wikipedia'; stat.sunWiki++; benutzt.add(x); titelZaehl[x.titel] = (titelZaehl[x.titel] || 0) + 1; if (art === 'gleich' && z.pkt != null) treffer1.push({ z, x }); stat.wikiArt[art] = (stat.wikiArt[art] || 0) + 1; if (art !== 'gleich') abweichend.push(eintrag); }
                else { stat.sunWikiWiderspruch++; widersprueche.push(eintrag); }
            }
        } else stat.sunDa++;
        const row = { rank: z.platz, id, s, u, n, gf: z.gf, ga: z.ga };
        Object.defineProperty(row, '__name', { value: z.verein, enumerable: false }); // nur fuer die Aufloesung unten, nicht im Seed
        Object.defineProperty(row, '__level', { value: t.ebene, enumerable: false });
        Object.defineProperty(row, '__bruch', { value: !!bruch, enumerable: false });
        if (z.pktMinus != null) row.p2 = [z.pkt, z.pktMinus]; else if (z.pkt != null) row.p = z.pkt;
        if (z.sp != null) row.sp = z.sp;
        if (t.staffelnAufSeite > 1 || S.staffeln > 1) row.g = t.staffel || String(t.staffelNr);
        S.table.push(row);
        if (row.s == null) offen.push({ row, z });
    }
    // Rest-Abgleich INNERHALB des Artikels, der den Rest dieser Tabelle geliefert hat: noch nicht vergebene Wikipedia-Zeile mit
    // gleichem Platz, gleichen Spielen und gleichen Punkten. Die Tore duerfen nur wie ein Tippfehler abweichen (ein Wert gleich
    // oder beide hoechstens 3 daneben) – sonst koennte die gleich platzierte Zeile einer ANDEREN Staffel im selben Artikel greifen.
    const artikel = Object.entries(titelZaehl).sort((a, b) => b[1] - a[1])[0];
    // GEGENPROBE des Rest-Abgleichs: exakt getroffene Zeilen mit kuenstlich verfaelschten Toren (+10) muessen dieselbe
    // Wikipedia-Zeile wiederfinden – mit DERSELBEN Funktion restKand, nicht nachgebaut.
    if (artikel) for (const { z, x } of treffer1) {
        if (x.titel !== artikel[0]) continue;
        const ohneX = new Set(benutzt); ohneX.delete(x);
        const k = restKand(WIKI_TAB.get(artikel[0]) || [], ohneX, Object.assign({}, z, { gf: z.gf + 10 }));
        stat.restProbe[k.length === 1 && k[0] === x ? 'richtig' : k.length ? 'falsch' : 'keiner']++;
    }
    // ifosta: Staffeltabellen derselben Liga-Saison. Treffer = gleicher Platz + gleiches Torverhaeltnis (+ bei mehreren Staffeln
    // ein gemeinsames Namenswort); sonst wie beim Wikipedia-Rest: Platz + Spiele + Punkte gleich, Tore tippfehlerartig, Namenswort.
    const ifo = lid === '3' ? [] : (IFOSTA[`${t.gebiet}|${t.ebene}|${HLIG[lid].name}|${t.y}`] || []);
    const ifoZeilen = ifo.flatMap(x => x.zeilen.filter(r => r.s != null));
    const ifoBenutzt = new Set();
    const ifoSuche = z => {
        let k = ifoZeilen.filter(x => !ifoBenutzt.has(x) && x.platz === z.platz && x.gf === z.gf && x.ga === z.ga);
        if (k.length > 1 || ifo.length > 1) k = k.filter(x => gemeinsamesWort(x.verein, z.verein));
        if (k.length === 1) return { x: k[0], art: 'Platz+Tore gleich' };
        const r = z.pkt == null ? [] : restKand(ifoZeilen, ifoBenutzt, z);
        return r.length === 1 ? { x: r[0], art: 'Platz+Spiele+Punkte gleich, Tore weichen ab' } : null;
    };
    // GEGENPROBE: Zeilen, die ihr S/U/N schon haben (f-archiv/Wikipedia), muessen bei ifosta dieselben Werte finden
    if (ifoZeilen.length) for (const r of S.table.slice(S.table.length - t.zeilen.length)) {
        if (r.s == null) continue;
        const z = t.zeilen.find(q => q.platz === r.rank && q.gf === r.gf && q.ga === r.ga && q.verein === r.__name); if (!z) continue;
        const f = ifoSuche(z);
        if (!f) { stat.ifostaProbe.keiner++; continue; }
        if (f.x.s === r.s && f.x.u === r.u && f.x.n === r.n) stat.ifostaProbe.gleich++;
        else { stat.ifostaProbe.anders++; if (ifostaAnders.length < 15) ifostaAnders.push(`${saison(t.y)} ${t.liga} Pl.${z.platz} ${z.verein}: bekannt ${r.s}-${r.u}-${r.n}, ifosta ${f.x.s}-${f.x.u}-${f.x.n} (${f.x.verein})`); }
    }
    for (const o of offen.slice()) {
        const f = ifoZeilen.length && ifoSuche(o.z); if (!f) continue;
        const { x } = f, spOk = o.z.sp == null || x.s + x.u + x.n === o.z.sp;
        const p2 = 2 * x.s + x.u, p3 = 3 * x.s + x.u;
        const pktOk = o.z.pkt == null || (o.z.pktMinus != null ? p2 === o.z.pkt : (p2 === o.z.pkt || p3 === o.z.pkt));
        if (!spOk && !pktOk) continue;
        o.row.s = x.s; o.row.u = x.u; o.row.n = x.n; ifoBenutzt.add(x); stat.sunIfosta++;
        const a = f.art + (pktOk ? '' : ' (Punkte weichen ab)');
        stat.ifostaArt[a] = (stat.ifostaArt[a] || 0) + 1;
        offen.splice(offen.indexOf(o), 1);
    }
    for (const { row, z } of offen) {
        const kand = !artikel || z.pkt == null ? [] : restKand(WIKI_TAB.get(artikel[0]) || [], benutzt, z);
        if (kand.length === 1) {
            const x = kand[0], a = 'Rest: Platz+Spiele+Punkte gleich, Tore weichen ab';
            row.s = x.s; row.u = x.u; row.n = x.n; benutzt.add(x); stat.sunWiki++; stat.wikiArt[a] = (stat.wikiArt[a] || 0) + 1;
            if (restBsp.length < 10) restBsp.push(`${saison(t.y)} ${t.liga} Pl.${z.platz} ${z.verein}: Tore f-archiv ${z.gf}:${z.ga}, Wikipedia ${x.gf}:${x.ga}`);
            continue;
        }
        stat.sunFehlt++; nachAuffuellen.push({ y: t.y, liga: t.liga, row, z, t, lid });
    }
}
// ---------- 4a. S/U/N SCHAETZEN, wo keine Quelle etwas hat (Nutzerentscheidung 14.09.2026: 2-3 Punkte Fehler sind akzeptabel) ----------
// Mit Spielen und 2-Punkte-Wertung ist nur EIN Wert frei: 2S+U = P, S+U+N = Sp  ->  U = P-2S, N = Sp-P+S.
// Die 3-Punkte-Wertung ist 3S+U = P+S – ein Fehler von x Siegen kostet dort genau x Punkte. Geschaetzt wird also die Remiszahl:
//   Remisquote = a + b*(Punktquote-1)^2 + c*Tore je Spiel   (Kleinste Quadrate je Gebiet, aus allen Zeilen mit S/U/N und 2-Punkte-Wertung)
// Schwache und starke Vereine spielen seltener remis, torreiche Ligen ebenso. Dazu ein Liga-Aufschlag: die mittlere Abweichung
// der bekannten Zeilen derselben Liga (+-3 Saisons) vom Modell. Kennzeichen im Seed: est:1.
{
    const lern = []; // {gebiet, lid, y, sp, pkt, gf, ga, u, s}
    for (const S of Object.values(seasons)) for (const r of S.table) {
        if (r.s == null || r.est || !r.p2 || !(r.s + r.u + r.n > 0) || r.s + r.u + r.n !== (r.sp ?? r.s + r.u + r.n) || 2 * r.s + r.u !== r.p2[0] || !isFinite(r.gf + r.ga)) continue;
        const h = HLIG[S.lid]; if (!h) continue;
        lern.push({ gebiet: h.gebiet, lid: S.lid, y: parseInt(S.y), sp: r.s + r.u + r.n, pkt: r.p2[0], gf: r.gf, ga: r.ga, u: r.u, s: r.s });
    }
    const merkmale = x => [1, (x.pkt / x.sp - 1) ** 2, (x.gf + x.ga) / x.sp];
    const loese = A => { // 3x3 Normalgleichungen, Gauss
        const n = 3, M = A.map(r => r.slice());
        for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[m][i])) m = k; [M[i], M[m]] = [M[m], M[i]];
            for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; } }
        const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let v = M[i][n]; for (let j = i + 1; j < n; j++) v -= M[i][j] * x[j]; x[i] = v / M[i][i]; } return x;
    };
    const fit = daten => { const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        for (const x of daten) { const f = merkmale(x), yv = x.u / x.sp; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += f[i] * f[j]; A[i][3] += f[i] * yv; } }
        return loese(A); };
    const quote = (k, x) => merkmale(x).reduce((a, f, i) => a + f * k[i], 0);
    const modell = {}; for (const g of ['BRD', 'DDR']) modell[g] = fit(lern.filter(x => x.gebiet === g));
    // Liga-Aufschlag aus bekannten Zeilen derselben lid, +-3 Saisons (ohne die Zeile selbst bei der Pruefung)
    const proLid = {}; lern.forEach(x => (proLid[x.lid] = proLid[x.lid] || []).push(x));
    const aufschlag = (x, ohne) => { const L = (proLid[x.lid] || []).filter(q => q !== ohne && Math.abs(q.y - x.y) <= 3 && !(ohne && q.y === ohne.y));
        return L.length >= 8 ? L.reduce((a, q) => a + (q.u / q.sp - quote(modell[x.gebiet], q)), 0) / L.length : 0; };
    const schaetze = (x, ohne) => {
        const uq = Math.max(0, quote(modell[x.gebiet], x) + aufschlag(x, ohne));
        const sLo = Math.max(0, x.pkt - x.sp), sHi = Math.floor(x.pkt / 2);
        const sv = Math.min(sHi, Math.max(sLo, Math.round((x.pkt - uq * x.sp) / 2)));
        return { s: sv, u: x.pkt - 2 * sv, n: x.sp - x.pkt + sv };
    };
    // GEGENPROBE: jede bekannte Zeile schaetzen, als waere sie unbekannt (Liga-Aufschlag ohne ihre eigene Saison).
    // Fehler in der 3-Punkte-Wertung = |S geschaetzt - S echt|. Vergleich: nur Gebietsmittel der Remisquote.
    const mittel = {}; for (const g of ['BRD', 'DDR']) { const L = lern.filter(x => x.gebiet === g); mittel[g] = L.reduce((a, x) => a + x.u, 0) / L.reduce((a, x) => a + x.sp, 0); }
    const verteilung = f => { const v = { 0: 0, 1: 0, 2: 0, 3: 0, '4+': 0 }; let sum = 0; for (const x of lern) { const d = Math.abs(f(x) - x.s); if (!isFinite(d)) throw new Error('Schaetzung NaN fuer ' + JSON.stringify(x)); sum += d; v[d >= 4 ? '4+' : d]++; }
        return { mae: (sum / lern.length).toFixed(2), bis2: (100 * (v[0] + v[1] + v[2]) / lern.length).toFixed(1) + ' %', bis3: (100 * (lern.length - v['4+']) / lern.length).toFixed(1) + ' %', v }; };
    const probeModell = verteilung(x => schaetze(x, x).s);
    const probeMittel = verteilung(x => { const sLo = Math.max(0, x.pkt - x.sp), sHi = Math.floor(x.pkt / 2); return Math.min(sHi, Math.max(sLo, Math.round((x.pkt - mittel[x.gebiet] * x.sp) / 2))); });
    // Selbsttest: ein absichtlich falsches Modell (Remisquote 0) MUSS deutlich schlechter abschneiden
    const probeFalsch = verteilung(x => Math.min(Math.floor(x.pkt / 2), Math.max(Math.max(0, x.pkt - x.sp), Math.round(x.pkt / 2))));
    let geschaetzt = 0, ohnePkt = 0;
    for (const o of nachAuffuellen) {
        const { row, z, t } = o;
        const sp = z.sp, pkt = z.pkt;
        if (!(sp > 0) || pkt == null || z.pktMinus == null) { ohnePkt++; continue; }
        const e = schaetze({ gebiet: t.gebiet, lid: o.lid, y: t.y, sp, pkt, gf: z.gf, ga: z.ga }, null);
        row.s = e.s; row.u = e.u; row.n = e.n; row.est = 1; geschaetzt++;
    }
    stat.sunGeschaetzt = geschaetzt;
    say(`\n   S/U/N-Schaetzung: Lernzeilen ${lern.length} | Modell BRD ${modell.BRD.map(v => v.toFixed(3)).join('/')} DDR ${modell.DDR.map(v => v.toFixed(3)).join('/')} (a + b*(Pkt/Sp-1)^2 + c*Tore/Sp)`);
    say(`     Gegenprobe (3-Punkte-Fehler = |dS|): Modell MAE ${probeModell.mae}, <=2 Pkt ${probeModell.bis2}, <=3 Pkt ${probeModell.bis3} ${JSON.stringify(probeModell.v)}`);
    say(`     zum Vergleich Gebietsmittel: MAE ${probeMittel.mae}, <=2 Pkt ${probeMittel.bis2} | Selbsttest Remisquote 0: MAE ${probeFalsch.mae}, <=2 Pkt ${probeFalsch.bis2} (muss deutlich schlechter sein)`);
    say(`     geschaetzt ${geschaetzt} Zeilen (est:1), ohne Spiele/Punkte nicht schaetzbar ${ohnePkt}`);
    if (+probeFalsch.mae <= +probeModell.mae) sackgasse('Schaetzung ohne Aussage', 'die Remisquote-0-Gegenprobe ist nicht schlechter als das Modell', 'Modell pruefen');
}

// g nachtragen, wenn eine lid-Saison erst durch eine zweite Tabelle mehrstaffelig wurde
for (const S of Object.values(seasons)) if (S.staffeln > 1) {
    const ohne = S.table.filter(r => !r.g); if (ohne.length) ohne.forEach(r => r.g = '1');
}
const neu = Object.values(seasons).map(({ staffeln, ...s }) => s);
say(`\n1) Seed-Erweiterung: ${neu.length} Saison-Tabellen (lid je Saison), ${stat.zeilen} Zeilen, ${Object.keys(HLIG).length} neue historische Liga-IDs (+ bestehende "3")`);
say(`   Vereins-IDs: ${JSON.stringify(stat.idArt)} | neue hist_fa-Vereine: ${Object.keys(neueHist).length}`);
say(`   Gegenprobe Namensabgleich (vollstaendige Staffeln): ${stat.ifostaTabProbe.staffeln} Staffeln, S/U/N gleich ${stat.ifostaTabProbe.gleich}, anders ${stat.ifostaTabProbe.anders}`);
ifostaTabProbeBsp.forEach(x => say('     anders: ' + x));
say(`   ganze Staffel uebernommen (ifosta/Wikipedia) ${stat.ifostaTabelle} (${stat.ifostaTabelleZeilen} Zeilen): ${ifostaTabBsp.join(' | ')}`);
say(`   ifosta: aufgefuellt ${stat.sunIfosta} (${Object.entries(stat.ifostaArt).map(([k, v]) => k + ' ' + v).join(', ')}) | Gegenprobe gegen bekannte S/U/N: gleich ${stat.ifostaProbe.gleich}, anders ${stat.ifostaProbe.anders}, nicht gefunden ${stat.ifostaProbe.keiner}`);
ifostaAnders.forEach(x => say('     ifosta anders: ' + x));
say(`   S/U/N: aus f-archiv ${stat.sunDa} | aus Wikipedia aufgefuellt ${stat.sunWiki} (${Object.entries(stat.wikiArt).map(([k, v]) => k + ' ' + v).join(', ')}) | verworfen ${stat.sunWikiWiderspruch} | Wikipedia mehrdeutig ${stat.sunWikiMehrdeutig} | fehlt weiter ${stat.sunFehlt} (${(100 * stat.sunFehlt / stat.zeilen).toFixed(0)} %)`);
say(`   Frueher aus FREMDER Liga aufgefuellt (Spiele+Punkte zufaellig gleich), jetzt ausgeschlossen: ${stat.frueherFremdeLiga}`);
restBsp.forEach(b => say('     Rest-Abgleich: ' + b));
say(`   GEGENPROBE Rest-Abgleich (exakte Treffer mit Toren +10): richtig ${stat.restProbe.richtig} | FALSCH ${stat.restProbe.falsch} | nicht gefunden ${stat.restProbe.keiner}`);
const fehlJe = {}; nachAuffuellen.forEach(x => { const d = Math.floor(x.y / 10) * 10 + 'er'; fehlJe[d] = (fehlJe[d] || 0) + 1; });
say(`   S/U/N fehlt je Jahrzehnt: ${Object.entries(fehlJe).map(([d, n]) => d + ' ' + n).join(' | ')}`);
if (stat.sunFehlt - (stat.sunGeschaetzt || 0)) sackgasse('S/U/N fehlen', `${stat.sunFehlt} Zeilen haben nur Punkte (2-Punkte-System) und Tore; _seedHistory rechnet r.s+r.u+r.n und 3*s+u`,
    'Seed-Zeile um p2/p erweitern; _seedHistory faltet solche Zeilen nur mit Spielen/Toren/Punkten (Ewige Tabelle: Spalten S/U/N leer), oder weitere Quelle fuer S/U/N');

// ---------- 4b. Doppelbelegung aufloesen ----------
// Eine ID zweimal in derselben Saison: die HOEHERE Liga behaelt sie (der Seed zuerst), die tiefere Zeile ist eine zweite
// Mannschaft oder ein Namensvetter ("Arminia Hannover" 1972/73 in Regionalliga UND Amateurliga) -> eigene hist-ID.
// Ausgewiesen, damit es keine falsche Zuordnung verdeckt.
const seedBelegt = {}; SEED.seasons.forEach(s => s.table.forEach(r => { seedBelegt[parseInt(s.y) + '|' + r.id] = s.lid; }));
const proSaisonId = {};
neu.forEach(s => s.table.forEach(r => { const k = parseInt(s.y) + '|' + r.id; (proSaisonId[k] = proSaisonId[k] || []).push(r); }));
let aufgeloest = 0; const aufgeloestBsp = [];
for (const [k, rows] of Object.entries(proSaisonId)) {
    const imSeed = !!seedBelegt[k];
    if (!imSeed && rows.length < 2) continue;
    rows.sort((a, b) => a.__level - b.__level);
    (imSeed ? rows : rows.slice(1)).forEach(r => {
        const name = r.__name + ' (2. Mannschaft/Namensvetter)';
        if (!neueHist[name]) neueHist[name] = 'hist_fa_' + slug(r.__name) + '_2';
        if (aufgeloestBsp.length < 15) aufgeloestBsp.push(`${saison(+k.split('|')[0])} "${r.__name}" E${r.__level}: ${(GD.teams[r.id] || {}).name || HC[r.id] || r.id} ist schon ${imSeed ? 'im Seed (' + seedBelegt[k] + ')' : 'hoeher belegt'}`);
        r.id = neueHist[name]; aufgeloest++;
    });
}
say(`\n1b) Doppelbelegung aufgeloest: ${aufgeloest} Zeilen bekamen eine eigene hist-ID | Anker-Namensform ohne Anschluss an ihre Seed-Jahre (nur markiert): ${ankerAusserhalb} Zeilen`);
aufgeloestBsp.forEach(b => say('   ' + b));

// ---------- 4c. Namensform ohne Anschluss UND Ebenensprung -> Namensvetter ----------
// "Turbine Halle" 1964/65 auf E3 zwischen Oberligasaisons des Halleschen FC (E1): kein Anschluss an die Seed-Jahre der
// Namensform UND in der Nachbarsaison derselben Pyramide mehr als eine Ebene entfernt -> ein anderer Verein gleichen Namens.
const ebeneVon = lid => lid === '1' || lid === 'ddr1' ? 1 : lid === '2' ? 2 : lid === '3' ? 3 : (HLIG[lid] || {}).level;
const pyramide = lid => lid === 'ddr1' || /^h\dd-/.test(lid) ? 'D' : 'B';
const belegung = {};
[...SEED.seasons, ...neu].forEach(s => s.table.forEach(r => { const m = belegung[r.id] = belegung[r.id] || new Map(); m.set(pyramide(s.lid) + '|' + parseInt(s.y), ebeneVon(s.lid)); }));
let abgespalten = 0; const abgespaltenBsp = [];
neu.forEach(s => s.table.forEach(r => {
    if (!r.__bruch) return;
    const y = parseInt(s.y), p = pyramide(s.lid), L = ebeneVon(s.lid), m = belegung[r.id];
    const nachbar = [m.get(p + '|' + (y - 1)), m.get(p + '|' + (y + 1))].filter(x => x != null);
    if (!nachbar.some(x => Math.abs(x - L) > 1)) return;
    const name = r.__name + ' (Namensvetter)';
    if (!neueHist[name]) neueHist[name] = 'hist_fa_' + slug(r.__name) + '_nv';
    if (abgespaltenBsp.length < 12) abgespaltenBsp.push(`${s.y} "${r.__name}" E${L}: ${(GD.teams[r.id] || {}).name || HC[r.id] || r.id} steht in der Nachbarsaison auf Ebene ${nachbar.join('/')}`);
    r.id = neueHist[name]; abgespalten++;
}));
say(`1c) Namensform ohne Anschluss + Ebenensprung -> als Namensvetter abgespalten: ${abgespalten} Zeilen`);
abgespaltenBsp.forEach(b => say('   ' + b));

// ---------- 5. Konsistenz: ein Verein zweimal in derselben Saison? ----------
const belegt = {};
[...SEED.seasons, ...neu].forEach(s => s.table.forEach(r => { const k = parseInt(s.y) + '|' + r.id; (belegt[k] = belegt[k] || []).push(s.lid + (r.g ? '/' + r.g : '')); }));
const doppelt = Object.entries(belegt).filter(([, l]) => l.length > 1);
const doppeltArt = { reserveVerdacht: 0, sonst: 0 };
const doppeltBsp = doppelt.slice(0, 15).map(([k, l]) => { const [y, id] = k.split('|'); return `${saison(+y)} ${(GD.teams[id] || {}).name || HC[id] || id}: ${l.join(' + ')}`; });
say(`\n2) Doppelbelegung (gleiche ID, gleiche Saison, Seed + neu): ${doppelt.length}`);
doppeltBsp.forEach(b => say('   ' + b));
if (doppelt.length) sackgasse('Doppelbelegung', `${doppelt.length} Faelle, in denen eine ID in einer Saison zweimal auftaucht (meist Reserve unter Stammnamen oder falsche A/B-Zuordnung)`, 'Faelle einzeln in die Pruefliste/Korrektur; Engine wuerde sonst zwei Karriere-Saisons zaehlen');

// ---------- 6. Ebenen-Plausibilitaet je Verein: Sprung um mehr als eine Ebene zwischen Folgesaisons ----------
const verlauf = {}; // id -> [{y, level}]
const lvl = lid => lid === '1' ? 1 : lid === '2' ? 2 : lid === '3' ? 3 : lid === 'ddr1' ? 1 : (HLIG[lid] || {}).level;
[...SEED.seasons, ...neu].forEach(s => s.table.forEach(r => (verlauf[r.id] = verlauf[r.id] || []).push({ y: parseInt(s.y), l: lvl(s.lid), ddr: s.lid === 'ddr1' || /^h\dd-/.test(s.lid) })));
let spruenge = 0; const sprungBsp = [];
for (const [id, v] of Object.entries(verlauf)) {
    v.sort((a, b) => a.y - b.y);
    for (let i = 1; i < v.length; i++) if (v[i].y === v[i - 1].y + 1 && v[i].ddr === v[i - 1].ddr && Math.abs(v[i].l - v[i - 1].l) > 1) { spruenge++; if (sprungBsp.length < 10) sprungBsp.push(`${(GD.teams[id] || {}).name || HC[id] || id} ${saison(v[i - 1].y)} E${v[i - 1].l} -> ${saison(v[i].y)} E${v[i].l}`); }
}
say(`\n3) Spruenge um mehr als eine Ebene in Folgesaisons (innerhalb der Daten): ${spruenge}`);
sprungBsp.forEach(b => say('   ' + b));

// ---------- 7. Headless: Engine mit Original-Seed und mit Erweiterung ----------
const lzSrc = fs.readFileSync(path.join(ROOT, 'app/lzstring.min.js'), 'utf8');
async function engineLauf(seedSeasons, histClubs, tag) {
    const store = [];
    const impl = { putSeasonTables: r => { (r || []).forEach(x => store.push(x)); return Promise.resolve(); }, scanSeasonTables: cb => { store.forEach(cb); return Promise.resolve(); }, appendSeason: () => Promise.resolve(), setScope() {}, getScope: () => ({ sid: null, legacy: true }) };
    const ctx = {};
    const code = `
        var window = this, localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document = { getElementById: () => null };
        var IDBStore = new Proxy(__impl, { get: (t, k) => k in t ? t[k] : () => Promise.resolve([]) });
        ${lzSrc.replace(/^const /gm, 'var ')}
        ${fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8').replace(/^const /gm, 'var ')}
        ${fs.readFileSync(path.join(ROOT, 'app/history_data.js'), 'utf8').replace(/^const /gm, 'var ')}
        HISTORY_SEED = Object.assign({}, HISTORY_SEED, { version: HISTORY_SEED.version + 1, seasons: __seasons });
        Object.assign(HISTORIC_CLUBS, __clubs);
        ${fs.readFileSync(path.join(ROOT, 'game_engine.js'), 'utf8').replace(/^const /gm, 'var ')}
        this.Engine = Engine; this.LZString = LZString;`;
    const { runInNewContext } = await import('node:vm');
    const sandbox = { __impl: impl, __seasons: seedSeasons, __clubs: histClubs, console: { log() {}, warn() {}, error: console.error }, setTimeout, Promise, Proxy, Math, JSON, Date, Object, Array, Set, Map, Number, String, isFinite, parseInt, parseFloat, performance };
    const t0 = performance.now();
    runInNewContext(code, sandbox, { timeout: 120000 });
    sandbox.Engine.init();
    const initMs = performance.now() - t0;
    await new Promise(r => setTimeout(r, 400));
    const A = sandbox.Engine.archive;
    const ewigeEntries = Object.values(A.ewige).reduce((n, l) => n + Object.keys(l).length, 0);
    const nan = []; for (const [lid, l] of Object.entries(A.ewige)) for (const [id, e] of Object.entries(l)) if (!Number.isFinite(e.pts) || !Number.isFinite(e.p)) nan.push(lid + ':' + id);
    const archJ = JSON.stringify(A);
    const lz = sandbox.LZString.compressToUTF16(archJ).length * 2;
    const r = { tag, initMs: Math.round(initMs), ewigeLigen: Object.keys(A.ewige).length, ewigeEintraege: ewigeEntries, nan: nan.length, nanBsp: nan.slice(0, 5), archivLZ: lz, idbTabellen: store.length, idbBytes: Buffer.byteLength(JSON.stringify(store)), rekordeBf: !!(A.records && A.records.bf) };
    say(`   ${tag}: Start ${r.initMs} ms | Ewige: ${r.ewigeLigen} Ligen / ${r.ewigeEintraege} Eintraege | NaN-Eintraege ${r.nan}${r.nan ? ' z.B. ' + r.nanBsp.join(', ') : ''} | Archiv LZ ${kb(r.archivLZ)} | IndexedDB ${r.idbTabellen} Tabellen / ${mb(r.idbBytes)} | Rekord-Backfill ${r.rekordeBf ? 'ok' : 'NICHT gelaufen'}`);
    return r;
}
const histNeu = Object.fromEntries(Object.entries(neueHist).map(([key, id]) => [id, key.replace(/#\d+$/, '')]));
say('\n4) Engine headless (Seed nur im Speicher ersetzt):');
const lauf0 = await engineLauf(SEED.seasons, {}, 'Original-Seed        ');
const lauf1 = await engineLauf([...SEED.seasons, ...neu], histNeu, 'Seed + Ebene 2-3 roh ');
const nurVoll = neu.map(s => Object.assign({}, s, { table: s.table.filter(r => r.s != null) })).filter(s => s.table.length);
const lauf2 = await engineLauf([...SEED.seasons, ...nurVoll], histNeu, 'nur Zeilen mit S/U/N ');
if (lauf1.nan) sackgasse('NaN in der Ewigen Tabelle', `${lauf1.nan} Eintraege werden NaN, wenn Zeilen ohne S/U/N eingefaltet werden`, 'siehe S/U/N-Vorschlag');
// Kein NaN heisst nicht "alles gut": _seedHistory rechnet null+null+null = 0 Spiele und UEBERSPRINGT die Zeile wie einen
// zurueckgezogenen Verein. Beleg: roh und "nur Zeilen mit S/U/N" ergeben dieselbe Zahl Ewige-Eintraege.
if (!lauf1.nan && stat.sunFehlt - (stat.sunGeschaetzt || 0) && lauf1.ewigeEintraege === lauf2.ewigeEintraege)
    sackgasse('Stiller Verlust in der Ewigen Tabelle', `${stat.sunFehlt} Zeilen ohne S/U/N gelten in _seedHistory als 0 Spiele und werden wie zurueckgezogene Vereine uebersprungen (Ewige-Eintraege roh ${lauf1.ewigeEintraege} = nur S/U/N ${lauf2.ewigeEintraege}); die Archiv-Tabelle zeigt sie, Karriere/Ewige Tabelle nicht`,
        'Seed-Zeile mit sp + p2/p; _seedHistory nutzt r.sp, wenn S/U/N fehlen (Spiele, Tore, Punkte zaehlen; S/U/N-Spalten leer)');

// ---------- 8. Groessen ----------
const kompakt = JSON.stringify({ ligen: HLIG, vereine: histNeu, seasons: neu.map(s => [s.y, s.lid, s.table.map(r => [r.rank, r.id, r.s, r.u, r.n, r.gf, r.ga, r.p2 || r.p || null, r.sp || null, r.g || null])]) });
const gz = zlib.gzipSync(Buffer.from(kompakt), { level: 9 }).length;
const quelltext = JSON.stringify(neu);
say(`\n5) Groesse: Seed-Erweiterung als JS-Objekt ~${mb(Buffer.byteLength(quelltext))} | kompakt ${mb(Buffer.byteLength(kompakt))} | gzip+base64 ${mb(gz * 4 / 3)} (Schaetzung vorher: 0,24 MB)`);
say(`   Archiv im localStorage: +${kb(lauf1.archivLZ - lauf0.archivLZ)} | IndexedDB: +${mb(lauf1.idbBytes - lauf0.idbBytes)} | Start: +${lauf1.initMs - lauf0.initMs} ms`);

// ---------- 9. Ligaverlauf: Zugewinn je Spielverein ----------
const vorher = {}, nachher = {};
SEED.seasons.forEach(s => s.table.forEach(r => (vorher[r.id] = vorher[r.id] || new Set()).add(parseInt(s.y))));
[...SEED.seasons, ...neu].forEach(s => s.table.forEach(r => (nachher[r.id] = nachher[r.id] || new Set()).add(parseInt(s.y))));
const gewinn = Object.keys(GD.teams).map(id => ({ id, name: GD.teams[id].name, vor: (vorher[id] || new Set()).size, nach: (nachher[id] || new Set()).size })).filter(x => x.nach > x.vor);
gewinn.sort((a, b) => (b.nach - b.vor) - (a.nach - a.vor));
say(`\n6) Ligaverlauf: ${gewinn.length} Spielvereine bekommen Saisons vor dem Sim-Start dazu (vorher hatten ${Object.keys(GD.teams).filter(id => vorher[id]).length} ueberhaupt welche)`);
say('   groesster Zugewinn: ' + gewinn.slice(0, 12).map(x => `${x.name} ${x.vor}->${x.nach}`).join(' | '));

// ---------- 10. Navigation / Einbau-Stellen ----------
say(`\n7) Einbau-Stellen (nicht geaendert, nur festgestellt):`);
say(`   - HIST_ARCHIVE_LEAGUES (app/league.js): heute 1 Eintrag (ddr1); je Eintrag ein Seitenleisten-Punkt (app/core.js renderSidebar) -> ${Object.keys(HLIG).length} neue Punkte`);
sackgasse('Seitenleiste', `${Object.keys(HLIG).length} historische Liga-IDs wuerden je einen Punkt in der Seitenleiste bekommen`, 'eine aufklappbare Gruppe "📜 Historische Ligen" oder Einstieg nur ueber Saison-Archiv/Steckbrief/Ligaverlauf');
say(`   - _seedHistory faltet Ewige Tabelle je lid; neue lid-IDs erzeugen ${lauf1.ewigeLigen - lauf0.ewigeLigen} weitere Ewige-Tabellen`);
say(`   - Nur-bei-Bedarf-Laden: heute liest die Engine HISTORY_SEED synchron in init (_seedHistory) – die Erweiterung muesste dort EINMALIG entpackt und danach nur fuer Archivansichten nachgeladen werden`);

// ---------- 11. Protokoll: Saisons MIT und OHNE S/U/N ----------
// Die Ewige Tabelle rechnet immer auf 3 Punkte je Sieg um (3*S+U) – das geht nur mit S/U/N. Gruppe 1: jede Zeile jeder
// Staffel der Saison hat S/U/N. Gruppe 2: mindestens eine Zeile fehlt (teilweise vorhanden wird mit Anzahl markiert).
{
    const proLigaSaison = {}; // "gebiet|ebene|liga" -> Map(y -> {n, mit, staffeln})
    for (const s of neu) {
        const h = s.lid === '3' ? { name: '3. Liga', gebiet: 'BRD', level: 3 } : HLIG[s.lid];
        const key = `${h.gebiet}|${h.level}|${h.name}`, y = parseInt(s.y);
        const m = proLigaSaison[key] = proLigaSaison[key] || new Map();
        const e = m.get(y) || { n: 0, mit: 0, est: 0, staffeln: new Set() };
        s.table.forEach(r => { e.n++; if (r.est) e.est++; else if (r.s != null) e.mit++; e.staffeln.add(r.g || ''); });
        m.set(y, e);
    }
    const bereiche = (ys, info) => ys.reduce((a, y) => { const b = a[a.length - 1]; if (b && y === b[1] + 1 && !info(y) && !info(b[1])) b[1] = y; else a.push([y, y]); return a; }, [])
        .map(([a, b]) => (a === b ? saison(a) : saison(a) + '–' + saison(b)) + (a === b && info(a) ? ' ' + info(a) : '')).join(', ');
    const zeilenCsv = ['gebiet;ebene;liga;saison;staffeln;vereine;mit_sun;geschaetzt;gruppe'];
    const md = [`# Protokoll: Saisons mit und ohne S/U/N (Ebene 2–3, Stand ${new Date().toISOString().slice(0, 10)})`, '',
        'Erzeugt von `node tools/historie_dryrun.mjs`. Die Ewige Tabelle rechnet immer auf 3 Punkte je Sieg um (3·S+U) – das geht nur mit Siegen, Unentschieden und Niederlagen.', '',
        '- **Gruppe 1 – mit S/U/N:** jede Zeile jeder Staffel der Saison hat S/U/N (aus f-archiv oder aus Wikipedia aufgefüllt).',
        '- **Gruppe 2 – ohne S/U/N:** mindestens eine Zeile hat keine belegten S/U/N (aus f-archiv, Wikipedia oder ifosta.de). Diese Zeilen sind GESCHÄTZT (`est:1` im Seed, s. `tools/historie_dryrun.mjs` 4a). „belegt x/y“ = x von y Zeilen haben belegte S/U/N.', ''];
    let g1 = 0, g2 = 0, g2teil = 0, z1 = 0, z2 = 0;
    const ligen = Object.keys(proLigaSaison).sort((a, b) => { const [ga, la, na] = a.split('|'), [gb, lb, nb] = b.split('|'); return ga.localeCompare(gb) || la - lb || na.localeCompare(nb); });
    const gruppe1 = [], gruppe2 = [];
    for (const key of ligen) {
        const [gebiet, ebene, liga] = key.split('|'), m = proLigaSaison[key];
        const voll = [], ohne = [];
        [...m.keys()].sort((a, b) => a - b).forEach(y => {
            const e = m.get(y), gruppe = e.mit === e.n ? 1 : 2; // geschaetzte Zeilen zaehlen NICHT als belegt
            zeilenCsv.push([gebiet, ebene, liga, saison(y), e.staffeln.size, e.n, e.mit, e.est, gruppe].join(';'));
            if (gruppe === 1) { voll.push(y); g1++; z1 += e.n; } else { ohne.push(y); g2++; z2 += e.n; if (e.mit) g2teil++; }
        });
        const teil = y => { const e = m.get(y); return e.mit && e.mit < e.n ? `(belegt ${e.mit}/${e.n})` : ''; };
        if (voll.length) gruppe1.push(`| ${gebiet} ${ebene} | ${liga} | ${voll.length} | ${bereiche(voll, () => '')} |`);
        if (ohne.length) gruppe2.push(`| ${gebiet} ${ebene} | ${liga} | ${ohne.length} | ${bereiche(ohne, teil)} |`);
    }
    md.push(`**Gruppe 1: ${g1} Liga-Saisons (${z1} Vereinssaisons) · Gruppe 2: ${g2} Liga-Saisons (${z2} Vereinssaisons), davon ${g2teil} teilweise mit S/U/N**`, '');
    md.push('## Gruppe 1 – mit S/U/N', '', '| Gebiet/Ebene | Liga | Saisons | Zeiträume |', '|---|---|---|---|', ...gruppe1, '');
    md.push('## Gruppe 2 – ohne S/U/N', '', '| Gebiet/Ebene | Liga | Saisons | Zeiträume |', '|---|---|---|---|', ...gruppe2, '');
    fs.writeFileSync(path.join(ROOT, 'docs/HISTORIE_SUN_PROTOKOLL.md'), md.join('\n'));
    fs.writeFileSync(path.join(OUT, 'sun_protokoll.csv'), '﻿' + zeilenCsv.join('\r\n'));
    say(`\n8) S/U/N-Protokoll: Gruppe 1 (mit) ${g1} Liga-Saisons / ${z1} Zeilen | Gruppe 2 (ohne) ${g2} Liga-Saisons / ${z2} Zeilen, davon ${g2teil} teilweise -> docs/HISTORIE_SUN_PROTOKOLL.md`);
}

fs.writeFileSync(path.join(OUT, 'wikipedia_widersprueche.json'), JSON.stringify({ widersprueche, abweichend, mehrdeutig, ligaPaar }, null, 1));
// nm = Vereinsname laut Quelle (fuer die Era-Namen in tools/historie_einbau.mjs), gebiet je Liga steht in ligen
fs.writeFileSync(path.join(OUT, 'seed_erweiterung.json'), JSON.stringify({ ligen: HLIG, vereine: histNeu,
    seasons: neu.map(s => ({ ...s, table: s.table.map(r => ({ ...r, nm: r.__name })) })) }));
fs.writeFileSync(path.join(OUT, 'ergebnis.json'), JSON.stringify({ stand: new Date().toISOString(), stat, laeufe: [lauf0, lauf1, lauf2], doppelt: doppeltBsp, spruenge: sprungBsp, gewinn: gewinn.slice(0, 50), sackgassen: SACKGASSE }, null, 1));
fs.writeFileSync(path.join(OUT, 'protokoll.txt'), log.join('\n'));
say(`\n-> tools/_dryrun/seed_erweiterung.json, ergebnis.json, protokoll.txt | Sackgassen: ${SACKGASSE.length}`);
