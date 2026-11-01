// Liga-Lücke 1990/91 (01.11.2026): die neuen Tabellen 1990/91 mit den Zeilen 1989/90 verbinden – BELEGT, nicht über bloße Ähnlichkeit:
//   Bezirksliga Cottbus/Dresden: fussball-ddr.de nennt den Vorjahresplatz („Chemie Döbern ( 8 )“) → Zeile dieses Platzes 1989/90.
//     Gegenprobe Ort: der Platz zählt nur, wenn alter und neuer Name einen Ortsnamen teilen (Vetschau steht mit „( 5 )“, war aber Elfter;
//     Meißen II/Bischofswerda II sind vertauscht). Sonst die einzige verschwundene Zeile 1989/90 mit diesem Ort.
//   Landesligen Sachsen, Sachsen-Anhalt, Thüringen, Brandenburg: RSSF ddr91 nennt je Platz den BSG-Namen 1989/90 → die einzige Zeile
//     1989/90 im Land (DDR-Liga + Bezirksligen), die 1990/91 sonst nirgends steht und deren Ort im BSG-Namen vorkommt.
// Übersprungen: neue ID steht schon 1989/90 (hängt richtig), gemeinsame Saison, Paare aus hist_fusion.json (frühere Entscheidung).
// Vorschlag: 1990/91-Name → ID von 1989/90 (hist_alias, damaliger Name bleibt sichtbar).
//   node tools/_dryrun/wende9091_zuordnung.cjs [--schreiben]   (nach historie_einbau.mjs, liest app/history_ext.js)
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const ROOT = path.join(__dirname, '../../'), T = path.join(ROOT, 'tools');
const c = {}; vm.createContext(c);
['game_data.js', 'app/history_ext.js'].forEach(f => vm.runInContext(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '), c));
const TAB = JSON.parse(zlib.gunzipSync(Buffer.from(c.HIST_EXT.gz, 'base64')));
const nm = id => (c.HIST_EXT.vereine || {})[id] || (c.HISTORIC_CLUBS || {})[id] || (c.GAME_DATA.teams[id] || {}).name || id;
const S = {}; TAB.forEach(t => t.rows.forEach(r => (S[r.id] = S[r.id] || new Set()).add(parseInt(t.y))));
const tab = (lid, y) => TAB.find(t => t.lid === lid && t.y === y);
const FUSION = JSON.parse(fs.readFileSync(path.join(T, 'hist_fusion.json'), 'utf8'));
const fusioniert = (a, b) => [[a, b], [b, a]].some(([n, v]) => FUSION[n] && FUSION[n].vorgaenger.includes(v));
const X = JSON.parse(fs.readFileSync(path.join(T, 'farchiv_ebene23.json'), 'utf8')).tabellen.filter(t => +t.y === 1990);
const roh = (liga, platz) => { const t = X.find(t => t.liga === liga); const z = t && t.zeilen.find(z => +z.platz === platz); return z && (z.verein || z.name); };
const STOP = /^(bsg|zsg|tsg|asg|esv|fsv|sv|fc|vfb|vfl|spvgg|motor|chemie|stahl|aktivist|fortschritt|einheit|empor|aufbau|lokomotive|dynamo|traktor|turbine|energie|rotation|wismut|post|blau|weiß|weiss|grün|rot|union|germania|preußen|eintracht|kombinat|werk|werke|glaswerke|elektronik|sportgemeinschaft|sportverein|verein|fußball|ii|iii|süd|nord|west|ost|mitte|1990|bezirk)$/;
const orte = s => String(s).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-zäöüß0-9 -]/g, ' ').split(/[\s-]+/).filter(w => w.length >= 4 && !STOP.test(w) && !/^\d+$/.test(w));
const teilenOrt = (a, b) => { const A = orte(a), B = orte(b); return A.some(w => B.some(v => v === w || (w.length >= 6 && v.length >= 6 && (v.startsWith(w.slice(0, 6)) || w.startsWith(v.slice(0, 6)))))); };
const in9091 = new Set(TAB.filter(t => t.y === '1990/91').flatMap(t => t.rows.map(r => r.id)));
const in8990 = new Set(TAB.filter(t => t.y === '1989/90').flatMap(t => t.rows.map(r => r.id)));
const vorschlag = [], offen = [], schon = [];
const pruefe = (art, liga, platz, idNeu, idAlt, beleg) => {
    const r = roh(liga, platz);
    if (idNeu === idAlt) return;
    // Ein Spielverein wird nie auf eine historische ID umgehängt – der Alias zöge ALLE seine Saisons mit (Einheit Wernigerode 1967–2024 → HSV)
    if (c.GAME_DATA.teams[idNeu] && !c.GAME_DATA.teams[idAlt]) { offen.push(`${art} ${liga} ${platz}. ${r} [${idNeu}] ist Spielverein – nicht auf ${nm(idAlt)} [${idAlt}] umhängen`); return; }
    if (fusioniert(idNeu, idAlt)) { offen.push(`${art} ${liga} ${platz}. ${r}: hist_fusion ${nm(idAlt)} → ${nm(idNeu)} (frühere Entscheidung, bleibt)`); return; }
    const gem = [...(S[idNeu] || [])].filter(j => (S[idAlt] || new Set()).has(j));
    if (gem.length) { offen.push(`${art} ${liga} ${platz}. ${r} [${idNeu}] ↔ ${nm(idAlt)} [${idAlt}]: gemeinsame Saison ${gem.join(' ')}`); return; }
    vorschlag.push({ art, liga, platz, roh: r, idNeu, idAlt, alt: nm(idAlt), beleg });
};
const verschwunden = (lids) => TAB.filter(t => t.y === '1989/90' && lids(t.lid)).flatMap(t => t.rows.filter(r => !in9091.has(r.id)));
// 1) fussball-ddr.de Vorjahresplatz + Ort
const VJ = JSON.parse(fs.readFileSync(path.join(__dirname, 'fddr_vorjahr.json'), 'utf8'));
for (const [k, rang] of Object.entries(VJ)) {
    const [lid, y, verein] = k.split('|');
    const liga = lid === 'h3d-cottbus-bezirksliga' ? 'Bezirksliga Cottbus' : 'Bezirksliga Dresden';
    const platz = +X.find(t => t.liga === liga).zeilen.find(z => (z.verein || z.name) === verein).platz;
    const neu = tab(lid, y).rows.find(r => r.rank === platz);
    if (in8990.has(neu.id)) { schon.push(`${liga} ${platz}. ${verein}`); continue; }
    if (rang == null) { offen.push(`fddr ${liga} ${platz}. ${verein}: Neuling, ID ${neu.id} neu`); continue; }
    const amPlatz = tab(lid, '1989/90').rows.find(r => r.rank === rang);
    if (amPlatz && teilenOrt(nm(amPlatz.id), verein)) { pruefe('fddr', liga, platz, neu.id, amPlatz.id, `fussball-ddr.de: Vorjahresplatz ${rang}, gleicher Ort`); continue; }
    const k2 = verschwunden(l => l === lid).filter(r => teilenOrt(nm(r.id), verein));
    if (k2.length === 1) pruefe('fddr', liga, platz, neu.id, k2[0].id, `fussball-ddr.de: Platz ${rang} passt nicht (${amPlatz ? nm(amPlatz.id) : '-'}), einziger verschwundener Verein dieses Orts (1989/90 Platz ${k2[0].rank})`);
    else offen.push(`fddr ${liga} ${platz}. ${verein}: Platz ${rang} = ${amPlatz ? nm(amPlatz.id) : '-'} (anderer Ort), ${k2.length} Orts-Kandidaten`);
}
// 2) RSSF BSG-Spalte + Ort
const LAND = { 'SACHSEN': ['h3d-sachsen-landesliga', 'Landesliga Sachsen', /dresden|leipzig|karlmarxstadt/],
    'SACHSEN-ANHALT': ['h3d-sachsenanhalt-verbandsliga', 'Verbandsliga Sachsen-Anhalt', /halle|magdeburg/],
    'THÜRINGEN': ['h3d-thueringen-landesliga', 'Landesliga Thüringen', /erfurt|gera|suhl/],
    'BRANDENBURG': ['h3d-brandenburg-verbandsliga', 'Verbandsliga Brandenburg', /cottbus|frankfurtoder|potsdam/],
    // RSSF „Landesliga Berlin“ 1990/91 = unsere Bezirksliga Berlin 1990/91 (f-archiv, gleiche Punkte/Tore)
    'BERLIN': ['h3d-berlin-bezirksliga', 'Bezirksliga Berlin', /berlin/] };
const L = fs.readFileSync(path.join(__dirname, 'rsssf_ddr91.txt'), 'utf8').split(/\r?\n/);
let cur = null;
for (const l of L) {
    const h = l.match(/^LANDESLIGA ([A-ZÄÖÜ-]+):/); if (h) { cur = LAND[h[1]] || null; continue; }
    if (/^BEZIRKSMEISTER/.test(l)) cur = null;
    const m = cur && l.match(/^\s*(\d+)\.\s+(.+?)\s\.+\s+\d+\s+\d+\s+\d+:\s*\d+(?:\s+(?:#\d+|Relegated))*\s*(.*)$/); if (!m) continue;
    const [lid, liga, re] = cur, platz = +m[1], bsg = m[3].replace(/#\d+/g, '').trim();
    const neu = tab(lid, '1990/91').rows.find(r => r.rank === platz);
    if (in8990.has(neu.id)) { schon.push(`${liga} ${platz}. ${roh(liga, platz)}`); continue; }
    if (!bsg) { offen.push(`rssf ${liga} ${platz}. ${roh(liga, platz)}: RSSF ohne BSG-Namen, ID ${neu.id} neu`); continue; }
    const k = verschwunden(l => /^h2d-/.test(l) || re.test(l)).filter(r => teilenOrt(nm(r.id), bsg) && teilenOrt(nm(r.id), roh(liga, platz)));
    if (k.length === 1) pruefe('rssf', liga, platz, neu.id, k[0].id, `RSSF ddr91: ${bsg}`);
    else offen.push(`rssf ${liga} ${platz}. ${roh(liga, platz)} ← „${bsg}“: ${k.length} Kandidaten ${k.map(r => nm(r.id) + ' [' + r.id + ']').join(', ')}`);
}
// 3) RSSF eindeutig, aber der Ortsabgleich greift nicht (mehrere Vereine am Ort, Stadtteil, Umzug, RSSF-Tippfehler) – von Hand belegt
const HAND = [
    ['rssf', 'Verbandsliga Sachsen-Anhalt', 1, 'SV Merseburg|1990|h3d-sachsenanhalt-verbandsliga', 'hist_chemiebunaschkopau', 'RSSF ddr91: BSG Chemie Buna Schkopau (1990/91 gab es zwei SV Merseburg – der andere spielte Bezirksliga Halle; 1991/92 NOFV-Oberliga an derselben ID)'],
    ['rssf', 'Verbandsliga Sachsen-Anhalt', 2, 'Wernigeroder SV', 'hist_fa_motorwernigerode', 'RSSF ddr-names: Motor Wernigerode → 1989–90 Wernigeröder SV → 1991 SV Rot-Weiss Wernigerode'],
    ['rssf', 'Verbandsliga Sachsen-Anhalt', 12, 'Fermersleber SV', 'hist_fa_motorsuedostmagdeburg', 'RSSF ddr91: BSG Motor Südost Magdeburg (Fermersleben = Magdeburger Stadtteil)'],
    ['rssf', 'Verbandsliga Sachsen-Anhalt', 13, 'SV Schönebeck', 'hist_fa_motorschoenebeck', 'RSSF ddr91: BSG Motor Schönebeck (erste Mannschaft, DDR-Liga 1989/90)'],
    ['rssf', 'Verbandsliga Sachsen-Anhalt', 14, 'SV Staßfurt', 'hist_fa_aktiviststassfurt', 'RSSF ddr91: BSG Aktivist „Straßfurt“ (Tippfehler)'],
    ['rssf', 'Landesliga Thüringen', 3, 'Blau-Weiß Gera', 'hist_fa_elektronikgera', 'RSSF ddr91: BSG Elektronik Gera'],
    ['rssf', 'Bezirksliga Berlin', 5, 'Wartenberger SV', 'hist_fa_wbkberlin', 'RSSF ddr91: BSG WBK Berlin (Ortsteil Wartenberg)'],
    ['rssf', 'Bezirksliga Berlin', 12, 'Grünauer BC', 'hist_fa_luftfahrtberlin', 'RSSF ddr91: BSG Luftfahrt Berlin (Ortsteil Grünau)'],
    ['rssf', 'Verbandsliga Brandenburg', 12, 'FC Preußen Frankfurt|1990', 'hist_fa_halbleiterwerkfrankfurto', 'RSSF ddr91: BSG Halbleiterwerk Frankfurt (Jahresschlüssel: die ID teilte sich den Namen mit Preußen Frankfurt/Main 1963–65)'],
];
for (const [art, liga, platz, schluessel, idAlt, beleg] of HAND) {
    const idNeu = tab(LAND[Object.keys(LAND).find(k => LAND[k][1] === liga)][0], '1990/91').rows.find(r => r.rank === platz).id;
    const vorher = offen.length; pruefe(art, liga, platz, idNeu, idAlt, beleg);
    if (offen.length === vorher && vorschlag.length && vorschlag[vorschlag.length - 1].idAlt === idAlt) vorschlag[vorschlag.length - 1].roh = schluessel;
    else if (idNeu === idAlt) schon.push(`${liga} ${platz}. ${schluessel} (von Hand)`);
}
// Wernigerode: die Zeile 1990/91 hängt schon an Motor (Runde 5), zu verbinden ist die Zwischenstation 1989/90 „Wernigeroder SV“
if (S.hist_fa_wernigerodersv && ![...S.hist_fa_wernigerodersv].some(j => S.hist_fa_motorwernigerode.has(j)))   // nach dem Einbau schon verbunden
    vorschlag.push({ art: 'rssf', liga: 'Bezirksliga Magdeburg 1989/90', platz: '-', roh: 'Wernigeroder SV', idNeu: 'hist_fa_wernigerodersv', idAlt: 'hist_fa_motorwernigerode',
        alt: nm('hist_fa_motorwernigerode'), beleg: 'RSSF ddr-names: Motor Wernigerode → 1989–90 Wernigeröder SV → 1991 SV Rot-Weiss Wernigerode' });
const txt = `== Vorschlag: ${vorschlag.length}\n` + vorschlag.map(v => `${v.art} ${v.liga} ${v.platz}. „${v.roh}“ [${v.idNeu}] → ${v.alt} [${v.idAlt}]   (${v.beleg})`).join('\n')
    + `\n\n== hängt schon richtig: ${schon.length}\n` + schon.join('\n') + `\n\n== offen: ${offen.length}\n` + offen.join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'wende9091_zuordnung.txt'), txt);
console.log(`Vorschlag ${vorschlag.length}, schon richtig ${schon.length}, offen ${offen.length} → tools/_dryrun/wende9091_zuordnung.txt`);
if (process.argv.includes('--schreiben')) {
    const p = path.join(T, 'hist_alias.json'), t = fs.readFileSync(p, 'utf8'), o = JSON.parse(t); let n = 0;
    for (const v of vorschlag) if (o[v.roh] !== v.idAlt) { if (o[v.roh]) console.log('überschreibe', v.roh, o[v.roh], '→', v.idAlt); o[v.roh] = v.idAlt; n++; }
    let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(p, s); console.log('hist_alias.json', n, 'Einträge gesetzt');
}
