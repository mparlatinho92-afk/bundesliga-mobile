// DDR-Vereine: IDs ueber die Ewigen Tabellen verbinden (Nutzerauftrag 14.10.2026, nur lesend – schreibt einen Vorschlag).
//
//   node tools/wiki_ddr_ewig.mjs      -> tools/_dryrun/wiki_ddr_ewig.txt (Bericht)
//                                        tools/_dryrun/wiki_ddr_ewig_export.json (Format der Entscheidungsseite)
//   danach: node tools/hist_dubletten.mjs --uebernehmen tools/_dryrun/wiki_ddr_ewig_export.json && node tools/historie_einbau.mjs
//
// Quellen: Ewige Tabellen der DDR-Oberliga, DDR-Liga, II. DDR-Liga, Bezirksliga Neubrandenburg (Wikipedia). Eine Tabellenzeile ist
// EIN Verein: Anzeigename, Spalte "andere Vereinsnamen", Fussnoten ("frueherer Name"), Schraegstrich-Formen ("BSG Empor/MR/TSG
// Neustrelitz") und der Artikel hinter dem Link. Dazu die Umbenennungen 1990 von fussball-ddr.de (tools/ddr_umbenennungen_1990.json).
// Verbunden wird nur ueber GLEICHE Namen (DDR-Kuerzel BSG/SG/SC/... vorn weg, "Lok" = "Lokomotive") – kein unscharfer Vergleich.
// Gesperrt: gemeinsame Saison (dann zwei Mannschaften), Fusions-Vorgaenger (hist_fusion.json), getrennt-Liste, Name an mehreren IDs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HX = globalThis.HIST_EXT;
const lies = f => { try { const o = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); delete o._hinweis; return o; } catch (e) { return {}; } };
const ALIAS = lies('hist_alias.json'), SCHREIB = lies('hist_schreibweise.json'), FUSION = lies('hist_fusion.json'), GETRENNT = lies('hist_alias_getrennt.json');
const U90 = lies('ddr_umbenennungen_1990.json');

// ---------- Auftritte ----------
const tab = JSON.parse(await new Response(new Blob([Buffer.from(HX.gz, 'base64')]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
const istDDR = l => l === 'ddr1' || /^h[23]d-/.test(l);
const auftritt = {};   // id -> {jahre:Set, ddr:bool, n}
const merke = (id, y, lid) => { const a = auftritt[id] = auftritt[id] || { jahre: new Set(), ddr: false, n: 0 }; a.jahre.add(parseInt(y)); a.n++; if (istDDR(lid)) a.ddr = true; };
tab.forEach(t => { t.rows.forEach(r => merke(r.id, t.y, t.lid)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y, t.lid))); });
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y, s.lid)));
const namen = {};
Object.entries(HX.vereine).forEach(([id, n]) => namen[id] = n);
Object.entries(HC).forEach(([id, n]) => namen[id] = n);
Object.values(GD.teams).forEach(t => namen[t.id] = t.name);
const spiel = id => !!GD.teams[id];
const zugleich = (a, b) => auftritt[a] && auftritt[b] ? [...auftritt[a].jahre].filter(y => auftritt[b].jahre.has(y)) : [];

// ---------- Namensschluessel ----------
const PRAEFIX = new Set(['bsg', 'sg', 'sc', 'asg', 'ask', 'tsg', 'hsg', 'zsg', 'ksg', 'sv', 'spvgg', 'fsv', 'fc', 'betriebssportgemeinschaft', 'sportgemeinschaft']);
const LANG = { lok: 'lokomotive', mot: 'motor', chem: 'chemie', wissensch: 'wissenschaft', fortschr: 'fortschritt' };
const RES = /\s+(II|III|2|3)$/;
function schluessel(n) {
    if (!n) return '';
    let s = n.replace(/[„“"]/g, ' ').replace(/\(.*?\)/g, ' ');
    const r = (s.trim().match(RES) || [])[1] || '';
    s = s.trim().replace(RES, '');
    const w = s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/é/g, 'e')
        .split(/[^a-z0-9]+/).filter(Boolean).map(x => LANG[x] || x);
    while (w.length > 1 && PRAEFIX.has(w[0])) w.shift();
    return w.join(' ') + (r ? ' #' + (r === '2' ? 'II' : r === '3' ? 'III' : r) : '');
}
const reserveVon = k => (k.match(/ #(II|III)$/) || [])[1] || '';
// Index: nur IDs mit DDR-Auftritt (dort sitzen die Dubletten) + alle Spielvereine (moegliches Ziel)
const idx = {};
const nimm = (k, id) => { if (k) (idx[k] = idx[k] || new Set()).add(id); };
for (const id of Object.keys(auftritt)) if (auftritt[id].ddr && namen[id]) nimm(schluessel(namen[id]), id);
for (const t of Object.values(GD.teams)) nimm(schluessel(t.name), t.id);
// damalige Namen der Spielvereine (HIST_EXT.namen) gehoeren auch zum Verein
for (const [id, l] of Object.entries(HX.namen || {})) if (spiel(id)) l.forEach(e => nimm(schluessel(e.name), id));
const nameIds = {};    // Anzeigename -> IDs (ein Alias wirkt auf den NAMEN; traegt ihn mehr als eine ID, ist er gesperrt)
Object.entries(namen).forEach(([id, n]) => { if (auftritt[id]) (nameIds[n] = nameIds[n] || []).push(id); });

// ---------- Wikipedia ----------
const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; DDR-Ewige-Tabellen)';
const CACHE = path.join(os.tmpdir(), 'wiki_ddr_cache');
fs.mkdirSync(CACHE, { recursive: true });
async function wikitext(titel) {
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'parse', page: titel, prop: 'wikitext', format: 'json', formatversion: '2', redirects: '1' });
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (!fs.existsSync(datei)) {
        const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
        if (!r.ok) throw new Error(titel + ': ' + r.status);
        fs.writeFileSync(datei, await r.text());
    }
    return JSON.parse(fs.readFileSync(datei, 'utf8')).parse.wikitext;
}
const SEITEN = ['Ewige Tabelle der DDR-Oberliga', 'Ewige Tabelle der DDR-Liga', 'Ewige Tabelle der II. DDR-Liga', 'Ewige Tabelle der DDR-Bezirksliga Neubrandenburg'];
const ohneRef = s => s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
const klar = s => ohneRef(s).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/\s+/g, ' ').trim();
const links = s => [...ohneRef(s).matchAll(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g)].map(m => ({ ziel: m[1].trim(), text: (m[2] || m[1]).trim() }));
// "BSG Empor/MR/TSG Neustrelitz" -> Empor Neustrelitz, MR Neustrelitz, TSG Neustrelitz (+ die Form mit Schraegstrich selbst)
function aufklappen(n) {
    const w = n.split(/\s+/); const out = [n];
    const i = w.findIndex(x => x.includes('/'));
    if (i >= 0 && !/^\d/.test(w[i])) w[i].split('/').filter(Boolean).forEach(alt => out.push(...aufklappen([...w.slice(0, i), alt, ...w.slice(i + 1)].join(' '))));
    return [...new Set(out)];
}
const ORT_FORM = /^(BSG|SG|SC|ASG|ASK|TSG|HSG|ZSG|KSG)$/;
// Ort eines Anzeigenamens: alles hinter dem ersten Sportvereinigungs-Wort ("BSG Motor Süd Brandenburg" -> nur der letzte Teil reicht nicht,
// deshalb: Fussnotennamen ohne eines der Ortswoerter bekommen das LETZTE Wort angehaengt; II wandert mit)
function mitOrt(kurz, anzeige) {
    const res = (anzeige.match(RES) || [''])[0];
    const ort = anzeige.replace(RES, '').replace(/[„“"].*?[“"]/g, ' ').trim().split(/\s+/).pop();
    const k = kurz.replace(RES, '');
    return (k.includes(ort) ? k : k + ' ' + ort) + res;
}

const zeilen = [];
for (const titel of SEITEN) {
    const wt = await wikitext(titel);
    const fn = {};
    for (const m of wt.matchAll(/\{\{FNZ\|(\d+)\|([\s\S]*?)\}\}\s*(?=\{\{FNZ|\}\})/g)) fn[m[1]] = m[2];
    const tabelle = wt.slice(wt.indexOf('{|'), wt.indexOf('\n|}'));
    for (const roh of tabelle.split(/\n\|-[^\n]*/).slice(1)) {
        const zellen = roh.replace(/^\s*\|/, '').split('||');
        const vz = zellen.findIndex(z => /text-align:\s*left/.test(z));
        if (vz < 0) continue;
        const zelle = zellen[vz].replace(/^[^|]*text-align:\s*left"?\s*\|/, '');
        const l = links(zelle);
        const anzeige = klar(zelle.replace(/\{\{FN\|\d+\}\}/g, ''));
        const varianten = new Set(aufklappen(anzeige));
        const artikel = l.length ? l[0].ziel : null;
        const quelle = [];
        // Oberliga: Spalte "andere Vereinsnamen in der DDR-Oberliga"
        if (/Oberliga$/.test(titel)) klar(zellen[vz + 1].replace(/<br\s*\/?>/g, ',')).split(',').map(s => s.trim()).filter(Boolean).forEach(n => { varianten.add(n); quelle.push('andere Namen'); });
        // Fussnoten: "frueherer Name" / "zeitweise". Bei einer Reserve-Zeile meinen sie den Verein SELBST, nicht seine Reserve:
        // "BSG Sachsenring Zwickau II" – frueher "BSG Aktivist Karl Marx Zwickau" (dessen erste Mannschaft wurde 1968 zur Reserve)
        const fussnote = new Set();
        for (const m of zelle.matchAll(/\{\{FN\|(\d+)\}\}/g)) {
            const t = fn[m[1]] || '';
            if (/ausgegliedert|Bestechung/.test(t)) continue;
            for (const teil of ohneRef(t).split(/,(?![^\[]*\]\])/)) {
                const lk = links(teil);
                const n = klar(teil).replace(/^zeitweise\s+/, '').replace(/\(.*?\)/g, '').trim();
                if (!n) continue;
                const nn = n.split(/\s+/).length === 1 || (ORT_FORM.test(n.split(/\s+/)[0]) && n.split(/\s+/).length === 2) ? mitOrt(n, anzeige) : n;
                aufklappen(nn).forEach(x => { varianten.add(x); fussnote.add(x); });
                lk.forEach(x => { if (/\s/.test(x.ziel)) { varianten.add(x.ziel); fussnote.add(x.ziel); } });
                quelle.push('Fussnote ' + m[1]);
            }
        }
        // letzte Spalte: derzeitiger Vereinsname (Oberliga), nicht der "Nachfolger"
        const letzte = zellen[zellen.length - 1];
        let aktuell = null;
        if (!/Nachfolge/.test(letzte)) { const m = letzte.match(/<small>''([^']+)''<\/small>/); if (m) aktuell = klar(m[1]); }
        zeilen.push({ quelle: titel.replace('Ewige Tabelle der ', ''), anzeige, artikel, aktuell, varianten: [...varianten], fussnote, nebenquelle: quelle });
    }
}
console.log(`Wikipedia: ${zeilen.length} Tabellenzeilen aus ${SEITEN.length} Ewigen Tabellen`);

// ---------- Zeile -> IDs ----------
// Union-Find ueber Knoten "id:<id>" und "art:<Artikel>" – dieselbe Zeile in zwei Tabellen (gleicher Artikel) ist derselbe Verein
const vater = {};
const finde = x => { while (vater[x] && vater[x] !== x) x = vater[x] = vater[vater[x]] || vater[x]; return x; };
const vereinige = (a, b) => { vater[a] = vater[a] || a; vater[b] = vater[b] || b; const ra = finde(a), rb = finde(b); if (ra !== rb) vater[rb] = ra; };
const beleg = {};      // id -> [Text]
const perName = new Set();   // IDs, die mindestens einmal ueber einen NAMEN der Zeile kamen (nicht nur ueber den Artikel)
const belege = (id, t, nurArtikel) => { (beleg[id] = beleg[id] || []).push(t); if (!nurArtikel) perName.add(id); };
// Mehrere IDs zu einem Namen: "_2"-Abspaltungen weg, wenn ihre Grund-ID mittrifft (die legt der Einbau selbst an, wenn eine ID zweimal in
// einer Saison steht); Spielvereine ohne DDR-Auftritt nur, wenn sie allein stehen (Namensvettern im Westen). Uebrig bleibende IDs gelten als
// Schreibweisen EINES Vereins ("Lok Prenzlau" / "Lokomotive Prenzlau"), solange keine zwei in derselben Saison spielen – sonst mehrdeutig.
function eindeutig(treffer) {
    let t = treffer.filter(id => !(/_\d+$/.test(id) && treffer.includes(id.replace(/_\d+$/, ''))));
    if (t.length > 1) t = t.filter(id => !spiel(id) || (auftritt[id] && auftritt[id].ddr));
    if (t.length > 1 && t.filter(spiel).length > 1) return null;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (zugleich(t[i], t[j]).length) return null;
    return t.length ? t : null;
}
const mehrdeutig = [];
for (const z of zeilen) {
    const res = reserveVon(schluessel(z.anzeige));
    const knoten = [];
    if (z.artikel) knoten.push('art:' + z.artikel + (res ? ' ' + res : ''));
    const kandidaten = [...z.varianten, ...(z.aktuell ? [z.aktuell + (res ? ' ' + res : '')] : []), ...(z.artikel && !res ? [z.artikel] : [])];
    for (const v of kandidaten) {
        let k = schluessel(v);
        if (res && !reserveVon(k) && !z.fussnote.has(v)) k += ' #' + res;      // Zeile einer Reserve: ihre Formen sind Reserve-Formen
        // _nv = bewusst angelegter Namensvetter (tools/fbde_ebene58.mjs, f-archiv) – nie ueber den Namen zusammenlegen
        const treffer = [...(idx[k] || [])].filter(id => !/_nv$/.test(id));
        if (!treffer.length) continue;
        const t = eindeutig(treffer);
        if (!t) { mehrdeutig.push(`${z.quelle}: "${v}" -> ${treffer.map(i => namen[i] + ' [' + i + ']').join(', ')}`); continue; }
        const ueberArtikel = !z.varianten.includes(v);
        for (const id of t) { knoten.push('id:' + id); belege(id, `${z.quelle}, Zeile "${z.anzeige}": "${v}"${ueberArtikel ? ' (Artikel/heutiger Name)' : ''}`, ueberArtikel); }
    }
    for (let i = 1; i < knoten.length; i++) vereinige(knoten[0], knoten[i]);
}

// ---------- fussball-ddr.de: Umbenennungen 1990 ----------
const fusionVorschlag = {};
{
    const y90 = tab.filter(t => t.lid === 'h2d-ddrliga-ddrliga' && /^1990/.test(t.y)).flatMap(t => t.rows);
    const alt89 = {};
    tab.filter(t => istDDR(t.lid) && /^1989/.test(t.y)).forEach(t => t.rows.forEach(r => alt89[namen[r.id]] = r.id));
    SEED.seasons.filter(s => istDDR(s.lid) && /^1989/.test(s.y)).forEach(s => s.table.forEach(r => alt89[namen[r.id]] = r.id));
    const perZahl = {};
    for (const st of Object.values(U90.tabelle1990 || {})) if (Array.isArray(st)) for (const [n, s, u, nl, gf, ga] of st) {
        const r = y90.filter(r => r.s === s && r.u === u && r.n === nl && r.gf === gf && r.ga === ga);
        if (r.length === 1) perZahl[n] = r[0].id; else console.log(`  fussball-ddr 1990/91: "${n}" ${r.length} Treffer ueber die Zahlen`);
    }
    for (const p of U90.paare || []) {
        const a = alt89[p.alt], b = perZahl[p.neu];
        if (!a || !b) { console.log(`  fussball-ddr: Paar ${p.alt} -> ${p.neu} nicht aufgeloest (${a || '-'} / ${b || '-'})`); continue; }
        if (a === b) continue;
        if (p.typ === 'F') { (fusionVorschlag[b] = fusionVorschlag[b] || { jahr: 1990, vorgaenger: [], beleg: p.beleg }).vorgaenger.push(a); continue; }
        vereinige('id:' + b, 'id:' + a);
        belege(a, `fussball-ddr.de 1990/91: ${p.beleg}`); belege(b, `fussball-ddr.de 1990/91: ${p.beleg}`);
    }
}

// ---------- Gruppen -> Vorschlaege ----------
const gruppen = {};
for (const x of Object.keys(vater)) if (x.startsWith('id:')) (gruppen[finde(x)] = gruppen[finde(x)] || []).push(x.slice(3));
const istVorg = id => Object.values(FUSION).some(f => f.vorgaenger.includes(id));
const getrennt = (a, b) => (GETRENNT[a] || []).includes(b) || (GETRENNT[b] || []).includes(a);
const exp = { alias: {}, fusion: {} };
// Linien, die die Tabelle nur ueber den ARTIKEL an einen Spielverein haengt, wurden im Artikel nachgelesen (14.10.2026):
// zwei davon sind Fusionsvereine – dort gilt Fusion statt Umbenennung.
const ARTIKEL_FUSION = {
    sv09arnstadt_845: { jahr: 2009, beleg: 'Wikipedia SV 09 Arnstadt: "entstand am 19. Mai 2009 infolge eines Zusammenschlusses des SV Arnstadt-Rudisleben und des BC 07 Arnstadt"' },
    '1fcbitterfeldwolfen_852': { jahr: 1991, beleg: 'Wikipedia 1. FC Bitterfeld-Wolfen: "loeste sich die BSG Chemie Bitterfeld in mehrere Einzelvereine auf … Zusammenschluss von SG Chemie und FC Blau Weiss Bitterfeld 1991"' },
};
// Quellen widersprechen sich -> nicht automatisch, dem Nutzer vorlegen
const HALTEN = {
    'Einheit Greifswald': 'Wikipedia (Ewige Tabelle DDR-Liga) nennt Einheit als frueheren Namen der BSG KKW; fussball-ddr.de: "21.06.1990 Fusion der BSG KKW mit BSG Einheit zum Greifswalder SC" – Einheit bestand also neben KKW weiter',
};
const bericht = [], konflikte = [], schon = [], artikelNur = [];
for (const ids of Object.values(gruppen)) {
    if (ids.length < 2) continue;
    const sp = ids.filter(spiel);
    let ziel;
    if (sp.length > 1) {
        // Spielverein + seine eigene Reserve stehen nie in einer Zeile (Reserve-Schluessel getrennt); mehrere = Fusion/Nachfolge
        konflikte.push(`mehrere Spielvereine in einer Linie: ${sp.map(i => namen[i] + ' [' + i + ']').join(', ')} – Rest: ${ids.filter(i => !spiel(i)).map(i => namen[i]).join(', ')}`);
        continue;
    }
    ziel = sp[0] || ids.slice().sort((a, b) => (/^hist_fa_/.test(a) - /^hist_fa_/.test(b)) || ((auftritt[b] || { n: 0 }).n - (auftritt[a] || { n: 0 }).n))[0];
    const zeilenB = [`${namen[ziel]} [${ziel}]${spiel(ziel) ? ' (Spielverein)' : ''}${perName.has(ziel) ? '' : '   ⚠ nur ueber Artikel/heutigen Namen verbunden'}`];
    const drin = [ziel];
    for (const id of ids.slice().sort((a, b) => ((auftritt[b] || { n: 0 }).n - (auftritt[a] || { n: 0 }).n))) {
        if (id === ziel) continue;
        const n = namen[id];
        const neben = drin.find(d => zugleich(id, d).length);
        const zg = neben ? zugleich(id, neben) : [];
        const grund = !auftritt[id] ? 'keine Saison' : zg.length ? `gemeinsame Saison ${zg.sort().slice(0, 3).join(',')} mit ${namen[neben]}` : istVorg(id) ? 'Fusions-Vorgaenger (hist_fusion.json)'
            : getrennt(id, ziel) ? 'getrennt (hist_alias_getrennt.json)' : (nameIds[n] || []).filter(x => x.replace(/_\d+$/, '') !== id.replace(/_\d+$/, '')).length ? `Name an ${nameIds[n].length} IDs (${nameIds[n].join(', ')})` : null;
        const alt = ALIAS[n] ?? SCHREIB[n];
        if (!grund && HALTEN[n]) { konflikte.push(`${n} [${id}] -> ${namen[ziel]} [${ziel}]: zurueckgehalten – ${HALTEN[n]}`); zeilenB.push(`   ? ${n} [${id}] – zurueckgehalten`); continue; }
        // Linie endet in einem Fusionsverein: der DDR-Verein ist Vorgaenger mit eigener ID, keine Umbenennung (Projektregel)
        if (!grund && ARTIKEL_FUSION[ziel]) {
            const f = exp.fusion[ziel] = exp.fusion[ziel] || { jahr: ARTIKEL_FUSION[ziel].jahr, vorgaenger: [] };
            f.vorgaenger.push(id); drin.push(id);
            zeilenB.push(`   F ${n} [${id}] – Fusions-Vorgaenger (${ARTIKEL_FUSION[ziel].beleg})`); continue;
        }
        if (grund) { konflikte.push(`${n} [${id}] -> ${namen[ziel]} [${ziel}]: ${grund}\n      Beleg: ${(beleg[id] || [])[0] || '-'}`); zeilenB.push(`   ✖ ${n} [${id}] – ${grund}`); continue; }
        if (alt !== undefined && (alt === ziel || alt === namen[ziel])) { schon.push(n); zeilenB.push(`   = ${n} (steht schon in hist_alias/schreibweise)`); continue; }
        if (alt !== undefined) { konflikte.push(`${n} [${id}]: hist_alias sagt ${alt}, Ewige Tabelle sagt ${namen[ziel]} [${ziel}]`); zeilenB.push(`   ✖ ${n} – hist_alias sagt ${alt}`); continue; }
        exp.alias[n] = ziel; drin.push(id);
        if (!perName.has(ziel)) artikelNur.push([n, ziel]);
        zeilenB.push(`   + ${n} [${id}]  ${[...auftritt[id].jahre].sort().join(',').slice(0, 60)}\n       ${(beleg[id] || []).slice(0, 2).join(' | ')}`);
    }
    if (zeilenB.length > 1) bericht.push(zeilenB.join('\n'));
}
for (const [nf, f] of Object.entries(fusionVorschlag)) {
    const vorg = f.vorgaenger.filter(v => !(FUSION[nf] || { vorgaenger: [] }).vorgaenger.includes(v) && !Object.values(exp.alias).includes(v) && !(namen[v] in exp.alias));
    if (vorg.length) exp.fusion[nf] = { jahr: f.jahr, vorgaenger: vorg };
    bericht.push(`FUSION ${namen[nf]} [${nf}] <- ${f.vorgaenger.map(v => namen[v] + ' [' + v + ']').join(' + ')}  (${f.beleg})${vorg.length ? '' : '  – schon eingetragen'}`);
}
const aus = [
    `DDR-Vereine ueber die Ewigen Tabellen (${new Date().toISOString().slice(0, 10)})`,
    `Vorschlag: ${Object.keys(exp.alias).length} Umbenennungen, ${Object.keys(exp.fusion).length} Fusionen; ${schon.length} standen schon drin; ${konflikte.length} gesperrt/Konflikt; ${mehrdeutig.length} mehrdeutige Namen`,
    '', '== Linien (Ziel, + = neu verbunden, ✖ = gesperrt) ==', ...bericht,
    '', '== Gesperrt / Konflikt (bleibt getrennt, bitte ansehen) ==', ...konflikte.map(k => '  ' + k),
    '', '== Mehrdeutige Namen (nicht verwendet) ==', ...mehrdeutig.map(k => '  ' + k)];
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
fs.writeFileSync(path.join(DIR, '_dryrun/wiki_ddr_ewig.txt'), aus.join('\n'));
exp._hinweis = 'Vorschlag von tools/wiki_ddr_ewig.mjs (Ewige Tabellen DDR, Wikipedia + fussball-ddr.de 1990/91). Einarbeiten: node tools/hist_dubletten.mjs --uebernehmen <diese Datei>';
fs.writeFileSync(path.join(DIR, '_dryrun/wiki_ddr_ewig_export.json'), JSON.stringify(exp, null, 1));
console.log(aus.slice(0, 2).join('\n'));
console.log('-> tools/_dryrun/wiki_ddr_ewig.txt, tools/_dryrun/wiki_ddr_ewig_export.json');
