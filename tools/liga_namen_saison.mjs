/* Namen der Spiel-Ligen je Saison vor dem Sim-Start – aus ALLEN Quellen, abgestimmt (Nutzer 30.10.2026: „nimm alle unsere Quellen,
 * je mehr Quellen desto klarer wird der Name pro Liga pro Saison. Demokratisches Prinzip, wobei Wikipedia am zuverlässigsten ist“).
 * Anlass: die Spiel-Ligen trugen in alten Saisons ihren heutigen Namen (2009/10 „Oberliga Niederrhein“ statt Niederrheinliga).
 *
 * Stimmen je (Liga, Saison), nur für Tabellen, die app/history_ext.js unter einer Spiel-Liga führt:
 *   Wikipedia  ×3  tools/wiki_ebene45.json seasons[].quelle (Artikeltitel „Fußball-Bremen-Liga 2008/09“)
 *   f-archiv   ×1  tools/farchiv_ebene23.json tabellen[].liga – zugeordnet über dieselbe Saison und die Torpaare (gf:ga) der Zeilen
 *   fussball.de ×1 tools/_dryrun/fbde_staffelnamen.json (Staffelname = damaliger Name; „spielklasse“ ist rückwirkend und zählt nicht)
 * Gleiche Namen zählen über einen Schlüssel ohne Groß-/Kleinschreibung, Bindestriche und „Herren“.
 *
 *   node tools/liga_namen_saison.mjs   -> tools/_dryrun/liga_namen_saison.txt (Bericht je Liga) + tools/_dryrun/liga_namen_vorschlag.json
 * Der Vorschlag wird geprüft und nach tools/liga_namen_saison.json übernommen; nur DIESE Datei liest historie_einbau.mjs.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lies = f => fs.readFileSync(ROOT + f, 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(lies('game_data.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(lies('app/history_ext.js').replace(/^const /gm, 'var '), ctx);
const GD = ctx.GAME_DATA, HX = ctx.HIST_EXT;
const T = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')));
const sy = y => parseInt(String(y));
const spiel = T.filter(t => GD.leagues[t.lid] && sy(t.y) < 2025);
const GEBIET = { sudwest: 'Südwest', wurttemberg: 'Württemberg', thuringen: 'Thüringen', sudbaden: 'Südbaden', niederrhein: 'Niederrhein', mittelrhein: 'Mittelrhein', westfalen: 'Westfalen', rheinland: 'Rheinland', suedwest: 'Südwest',
    saarland: 'Saarland', hessen: 'Hessen', baden: 'Baden', suedbaden: 'Südbaden', wuerttemberg: 'Württemberg', bayern: 'Bayern',
    niedersachsen: 'Niedersachsen', bremen: 'Bremen', hamburg: 'Hamburg', 'schleswig-holstein': 'Schleswig-Holstein', berlin: 'Berlin',
    brandenburg: 'Brandenburg', 'mecklenburg-vorpommern': 'Mecklenburg-Vorpommern', sachsen: 'Sachsen', 'sachsen-anhalt': 'Sachsen-Anhalt', thueringen: 'Thüringen' };
// Schreibweise vereinheitlichen: „Fußball-“, Saison/Zeitraum am Ende, „Herren“ überall, „Gruppe“/„St.“ = Staffel
const sauber = n => String(n || '').replace(/^Fußball-/, '').replace(/\s*\d{4}\s*[\/–-]\s*(\d{2}|\d{4})\s*$/, '')
    .replace(/[\/(]?\s*\bHerren\b\s*\)?/gi, ' ').replace(/\bGruppe\b/g, 'Staffel').replace(/\bSt\.\s*/g, 'Staffel ')
    .replace(/\s+/g, ' ').trim();
// „Staffel Ost“ = „Ost“ (Landesliga Südwest Staffel Ost)
const schluessel = n => sauber(n).toLowerCase().replace(/[-–]/g, ' ').replace(/staffel (nord|süd|ost|west|mitte)/g, '$1')
    .replace(/^nofv oberliga/, 'oberliga nordost').replace(/\s+/g, ' ').trim();   // NOFV-Oberliga = Oberliga Nordost (Wikipedia)
// fussball.de: Staffelname ohne Region („Verbandsliga Staffel 1“, „Verbandsliga 1“) bekommt die Region des Verbands –
// NUR bei Nummer/Buchstabe, sonst hängte „Oberliga Niederrhein“ sich „Staffel Niederrhein“ an
const GENERISCH = /^(oberliga|verbandsliga|landesliga|bezirksliga|kreisliga [a-d]|kreisoberliga|bezirksoberliga)(\s+(staffel\s*)?(\d+|[a-d]|i{1,3}))?$/i;
// Sponsorennamen sind keine Umbenennung (Lotto Hessenliga, Flens-Oberliga, Karlsberg Liga Saarland, Schröder-Liga Saar …)
const SPONSOR = [[/^Lotto\s+/i, ''], [/^Flens-/i, ''], [/^Stark\s+/i, ''], [/^Gamesright\s+/i, ''], [/^bfv-/i, ''], [/^11\s?teamsports\s+/i, ''],
    [/^(Wernesgrüner|WEKU|Geomix|Radio Brocken|Senioren)\s+/i, ''], [/^Köstritzer-Liga Thüringen$/i, 'Thüringenliga'],
    [/^Karlsberg Liga Saarland$/i, 'Saarlandliga'], [/^Schröder-Liga Saar$/i, 'Saarlandliga']];
const fbdeName = o => { let n = sauber(o.st); if (!n || /\([VL] \d+\)/.test(n)) return null;   // „VERBANDSLIGA (V 01)“ = Kennung, kein Name
    SPONSOR.forEach(([re, ers]) => { n = n.replace(re, ers); });
    if (GENERISCH.test(n)) { const g = GEBIET[o.geb] || (o.geb ? o.geb[0].toUpperCase() + o.geb.slice(1) : ''); if (!g) return null;
        n = n.replace(/^(\S+(?: [A-D])?)(?:\s+(?:Staffel\s*)?(\d+|[A-D]|I{1,3}))?$/i, (m, kl, nr) => kl + ' ' + g + (nr ? ' Staffel ' + nr : '')); }
    return /runde|relegation|entscheidung/i.test(n) ? null : n; };
// Ein Name ohne Staffel-Zusatz, der den heutigen Namen bis auf die Staffel trifft („Bayernliga“ für „Bayernliga Nord“, Wikipedia
// führt beide Staffeln in EINEM Saisonartikel), ist kein anderer Name
const gleichHeute = (n, heute) => { const a = schluessel(n), b = schluessel(heute);
    return a === b || (b.startsWith(a + ' ') && /^(nord|süd|ost|west|mitte|staffel \S+|\S+ staffel \S+)$/.test(b.slice(a.length + 1))); };

const stimmen = {};   // "lid|y" -> {schluessel: {name, w, quellen:[]}}
const gib = (lid, y, name, w, q) => { if (!name) return; const k = lid + '|' + sy(y), s = schluessel(name);
    const z = (stimmen[k] = stimmen[k] || {}); const e = z[s] || (z[s] = { name: sauber(name), w: 0, q: [] }); e.w += w; e.q.push(q);
    if (q === 'wiki') e.name = sauber(name); };   // Schreibweise von Wikipedia

// Wikipedia
const W = JSON.parse(lies('tools/wiki_ebene45.json'));
let nW = 0; for (const s of W.seasons) if (GD.leagues[s.lid] && s.quelle) { gib(s.lid, s.y, s.quelle, 3, 'wiki'); nW++; }
// fussball.de
const FB = JSON.parse(lies('tools/_dryrun/fbde_staffelnamen.json'));
let nF = 0; for (const [key, os] of Object.entries(FB)) { const [lid, y] = key.split('|');
    const namen = [...new Set(os.filter(o => o.ph === 'Hauptrunde' || !o.ph).map(fbdeName).filter(Boolean))];
    // mehrere Staffeln einer Liga (Westfalenliga 1/2 sind eigene Ligen; hier nur, wenn alle denselben Grundnamen haben)
    if (namen.length === 1) { gib(lid, y, namen[0], 1, 'fbde'); nF++; } }
// f-archiv über die Torpaare
const FA = JSON.parse(lies('tools/farchiv_ebene23.json')).tabellen;
const faNachJahr = {}; FA.forEach(t => (faNachJahr[t.y] = faNachJahr[t.y] || []).push(t));
const paare = rows => rows.map(r => r.gf + ':' + r.ga);
let nA = 0;
for (const t of spiel) {
    const kand = faNachJahr[sy(t.y)] || [], soll = paare(t.rows);
    let best = null, bestQ = 0;
    for (const f of kand) { const ist = paare(f.zeilen || []), rest = ist.slice(); let tr = 0;
        soll.forEach(p => { const i = rest.indexOf(p); if (i >= 0) { tr++; rest.splice(i, 1); } });
        const q = tr / Math.max(soll.length, ist.length); if (q > bestQ) { bestQ = q; best = f; } }
    if (best && bestQ >= 0.8) { gib(t.lid, t.y, best.liga, 1, 'farchiv'); nA++; }
}

// Ergebnis je Liga: Name je Saison (höchstes Gewicht), Abschnitte, Streitfälle
const proLiga = {};
for (const t of spiel) { const k = t.lid + '|' + sy(t.y), z = stimmen[k]; if (!z) continue;
    const r = Object.values(z).sort((a, b) => b.w - a.w); (proLiga[t.lid] = proLiga[t.lid] || []).push({ y: sy(t.y), sieger: r[0], alle: r }); }
const bericht = [`Namen der Spiel-Ligen je Saison – Stimmen: Wikipedia ${nW}, fussball.de ${nF}, f-archiv ${nA} (Gewicht 3/1/1)`, ''];
const vorschlag = {};
let streit = 0, ohneHeute = 0;
for (const lid of Object.keys(proLiga).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))) {
    const heute = GD.leagues[lid].name, L = proLiga[lid].sort((a, b) => a.y - b.y);
    bericht.push(`${lid}  ${heute}`);
    const ab = []; let cur = null;
    for (const e of L) { const n = e.sieger.name;
        if (cur && cur.name === n && e.y === cur.bis + 1) cur.bis = e.y; else { cur = { von: e.y, bis: e.y, name: n, belege: new Set() }; ab.push(cur); }
        e.alle.forEach(a => a.q.forEach(q => cur.belege.add(q)));
        if (e.alle.length > 1) { streit++; bericht.push(`     ! ${e.y}/${String(e.y + 1).slice(-2)}  ${e.alle.map(a => `${a.name} [${a.q.join('+')}]`).join('  vs  ')}`); } }
    ab.forEach(a => bericht.push(`   ${a.von === a.bis ? a.von : a.von + '–' + a.bis}  ${a.name}${gleichHeute(a.name, heute) ? '  (= heute)' : ''}   [${[...a.belege].join(', ')}]`));
    const anders = ab.filter(a => !gleichHeute(a.name, heute)).map(a => ({ von: a.von, bis: a.bis, name: a.name }));
    if (anders.length) { vorschlag[lid] = anders; ohneHeute++; }
    bericht.push('');
}
bericht.splice(1, 0, `Ligen mit abweichendem Namen: ${ohneHeute}, Saisons mit Streit: ${streit}`);
fs.writeFileSync(ROOT + 'tools/_dryrun/liga_namen_saison.txt', bericht.join('\n'));
fs.writeFileSync(ROOT + 'tools/_dryrun/liga_namen_vorschlag.json', JSON.stringify(vorschlag, null, 1));
console.log(bericht.slice(0, 2).join('\n') + '\n-> tools/_dryrun/liga_namen_saison.txt, tools/_dryrun/liga_namen_vorschlag.json');
