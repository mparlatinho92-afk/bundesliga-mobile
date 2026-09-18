// Dubletten und Umbenennungen unter den historischen Vereinen finden (app/history_ext.js + HISTORIC_CLUBS + Spielvereine).
//
//   node tools/hist_dubletten.mjs            Bericht nach tools/_dryrun/hist_dubletten.txt
//                                            + Entscheidungsseite tools/hist_dubletten.html (Daten eingebettet, offline)
//   node tools/hist_dubletten.mjs --offen    nur Paare, die noch nicht in tools/hist_alias.json oder _getrennt stehen
//   node tools/hist_dubletten.mjs --uebernehmen <export.json>
//                                            Export der Seite in die vier Dateien einarbeiten (neuere Entscheidung gewinnt),
//                                            danach node tools/historie_einbau.mjs
//
// Zwei Namen sind ein Verdacht, wenn ihr Namenskern gleich ist (Vereinsform, Jahreszahlen, Füllwörter weg, Ortsadjektiv =
// Ort) ODER eine gängige Abkürzung aufgelöst dasselbe ergibt ("Leher TS" = "Leher Turnerschaft"). Entscheidend ist dann die
// KOEXISTENZ: spielen beide in derselben Saison, sind es zwei Vereine; sonst ist es meist eine Umbenennung/Schreibweise.
// Vier Arten Entscheidung, je eine Datei:
//   Umbenennung   tools/hist_alias.json         "Name" -> Ziel (eine ID, der alte Name erscheint als damaliger Name)
//   Schreibweise  tools/hist_schreibweise.json  wie oben, aber derselbe Name – KEIN damaliger Name
//   Fusion        tools/hist_fusion.json        Nachfolger -> {jahr, vorgaenger:[IDs]}; Vorgaenger behalten ihre IDs
//   getrennt      tools/hist_alias_getrennt.json zwei Vereine, der Bericht meldet sie nicht wieder
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
const load = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
load('game_data.js'); load('app/history_data.js'); load('app/history_ext.js');
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS, HX = globalThis.HIST_EXT;
const OFFEN = process.argv.includes('--offen');
const lies = f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return {}; } };
const ALIAS = lies('hist_alias.json'), GETRENNT = lies('hist_alias_getrennt.json'), SCHREIB = lies('hist_schreibweise.json'), FUSION = lies('hist_fusion.json');
[ALIAS, GETRENNT, SCHREIB, FUSION].forEach(o => delete o._hinweis);

// ---------- Export der Seite uebernehmen ----------
const UEB = process.argv.indexOf('--uebernehmen');
if (UEB >= 0) {
    const E = JSON.parse(fs.readFileSync(process.argv[UEB + 1], 'utf8'));
    const datei = { alias: 'hist_alias.json', schreibweise: 'hist_schreibweise.json', fusion: 'hist_fusion.json', getrennt: 'hist_alias_getrennt.json' };
    const roh = k => { try { return JSON.parse(fs.readFileSync(path.join(DIR, datei[k]), 'utf8')); } catch (e) { return {}; } };
    const D = { alias: roh('alias'), schreibweise: roh('schreibweise'), fusion: roh('fusion'), getrennt: roh('getrennt') };
    const log = [];
    // Name -> Ziel: ein Name steht nur in EINER der beiden Dateien; die Gegenrichtung (FV -> TG und TG -> FV) waere ein Kreis
    for (const art of ['alias', 'schreibweise']) for (const [nm, ziel] of Object.entries(E[art] || {})) {
        const andere = art === 'alias' ? 'schreibweise' : 'alias';
        if (nm in D[andere]) { log.push(`${nm}: von ${andere} nach ${art}`); delete D[andere][nm]; }
        for (const a of ['alias', 'schreibweise']) if (D[a][ziel] === nm) { log.push(`Gegenrichtung entfernt: ${ziel} -> ${nm}`); delete D[a][ziel]; }
        if (D[art][nm] !== ziel) { if (nm in D[art]) log.push(`${nm}: ${D[art][nm]} -> ${ziel}`); D[art][nm] = ziel; }
    }
    for (const [nf, fu] of Object.entries(E.fusion || {})) {
        const z = D.fusion[nf] = D.fusion[nf] || { vorgaenger: [] };
        if (fu.jahr) z.jahr = fu.jahr;
        fu.vorgaenger.forEach(v => { if (!z.vorgaenger.includes(v)) z.vorgaenger.push(v); });
    }
    for (const [a, bs] of Object.entries(E.getrennt || {})) { const l = D.getrennt[a] = D.getrennt[a] || []; bs.forEach(b => { if (!l.includes(b)) l.push(b); }); }
    for (const a of ['alias', 'schreibweise']) for (const k of Object.keys(D[a])) {
        if (k === '_hinweis') continue;
        const weg = new Set([k]); let z = D[a][k];
        while (D.alias[z] !== undefined || D.schreibweise[z] !== undefined) { if (weg.has(z)) throw new Error('Kreis bei ' + k); weg.add(z); z = D.alias[z] !== undefined ? D.alias[z] : D.schreibweise[z]; }
    }
    for (const k of Object.keys(datei)) fs.writeFileSync(path.join(DIR, datei[k]), JSON.stringify(D[k], null, 2) + '\n');
    log.forEach(l => console.log('  ' + l));
    console.log(`uebernommen: ${Object.keys(E.alias || {}).length} Umbenennungen, ${Object.keys(E.schreibweise || {}).length} Schreibweisen, ${Object.keys(E.fusion || {}).length} Fusionen, ${Object.keys(E.getrennt || {}).length} getrennt – jetzt node tools/historie_einbau.mjs`);
    process.exit(0);
}

// ---------- Namen und Auftritte ----------
// Tabellen entpacken (Node hat DecompressionStream seit 18)
const bin = Buffer.from(HX.gz, 'base64');
const tab = JSON.parse((await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text()));
const auftritt = {};   // id -> {jahre:Set, ligen:Set}
const merke = (id, y, lid) => { const a = auftritt[id] = auftritt[id] || { jahre: new Set(), ligen: new Set() }; a.jahre.add(parseInt(y)); a.ligen.add(lid); };
tab.forEach(t => { t.rows.forEach(r => merke(r.id, t.y, t.lid)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y, t.lid))); });
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y, s.lid)));

const namen = {};      // id -> Anzeigename
Object.entries(HX.vereine).forEach(([id, n]) => namen[id] = n);   // erst app/hist_ext.js mischt sie in HISTORIC_CLUBS
Object.entries(HC).forEach(([id, n]) => namen[id] = n);
Object.values(GD.teams).forEach(t => namen[t.id] = t.name);

// ---------- Namenskern ----------
const AB = { ts: 'turnerschaft', tus: 'turnundsportverein', tsv: 'turnundsportverein', sb: 'sportbund', sv: 'sportverein', sg: 'sportgemeinschaft',
    bv: 'ballspielverein', bsv: 'ballspielverein', fv: 'fussballverein', fc: 'fussballclub', sc: 'sportclub', spvgg: 'spielvereinigung', spvg: 'spielvereinigung',
    vfb: 'vereinfuerbewegungsspiele', vfl: 'vereinfuerleibesuebungen', vfr: 'vereinfuerrasenspiele', mtv: 'maennerturnverein', tv: 'turnverein', tg: 'turngemeinde' };
const FORM = new Set(Object.keys(AB).concat(['e', 'v', '1', 'i', 'ii', 'u21', 'u23', 'am', 'amateure', 'fussball', 'club', 'verein', 'und', 'von', 'der', 'die', 'im', 'in', 'a', 'turn', 'sport']));
const norm = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss')
    .replace(/gruen[\s-]*wei(ss|s)/g, 'gruenweiss').split(/[^a-z0-9]+/).filter(Boolean);
const reserve = n => /(\s(III|II|2|U ?2[123]|Amateure|Am\.?|A))$/i.test(n.trim());
const stamm = w => w.length >= 4 ? w.replace(/er$/, '').replace(/e$/, '') : w;
const kern = n => norm(n).filter(w => !FORM.has(w) && !/^\d+$/.test(w)).map(stamm).sort();
// Abkuerzungen aufgeloest: "Leher TS" -> leher + turnerschaft; damit trifft "Leher Turnerschaft"
const langKern = n => norm(n).map(w => AB[w] || w).filter(w => !/^\d+$/.test(w) && !['e', 'v', '1'].includes(w)).map(stamm).sort();

const ids = Object.keys(auftritt).filter(id => namen[id]);
const gruppen = {};
for (const id of ids) {
    const n = namen[id], r = reserve(n) ? '|R' : '';
    [kern(n).join(' ') + r, 'L:' + langKern(n).join(' ') + r].forEach(k => { if (k.replace(/^L:/, '').trim()) (gruppen[k] = gruppen[k] || new Set()).add(id); });
}

const spiel = id => !!GD.teams[id];
const zeile = id => `${namen[id]} [${id}]${spiel(id) ? ' (Spielverein)' : ''} ${[...auftritt[id].jahre].sort((a, b) => a - b).map(y => y).slice(0, 3).join(',')}${auftritt[id].jahre.size > 3 ? '…' : ''} ${[...auftritt[id].ligen].slice(0, 3).join(',')}`;
const paare = new Map();
for (const [k, set] of Object.entries(gruppen)) {
    const arr = [...set]; if (arr.length < 2) continue;
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j], key = [a, b].sort().join('|');
        if (paare.has(key)) continue;
        const ja = auftritt[a].jahre, jb = auftritt[b].jahre;
        const zugleich = [...ja].filter(y => jb.has(y));
        paare.set(key, { a, b, lang: k.startsWith('L:'), zugleich });
    }
}
const fusioniert = (a, b) => [[a, b], [b, a]].some(([n, v]) => FUSION[n] && FUSION[n].vorgaenger.includes(v))
    || Object.values(FUSION).some(f => f.vorgaenger.includes(a) && f.vorgaenger.includes(b));
const bekannt = ([a, b]) => (GETRENNT[a] || []).includes(b) || (GETRENNT[b] || []).includes(a) || fusioniert(a, b)
    || [ALIAS, SCHREIB].some(A => Object.entries(A).some(([nm, ziel]) => (ziel === a || ziel === b) && [namen[a], namen[b]].includes(nm)));
const liste = [...paare.values()].filter(p => !(OFFEN && bekannt([p.a, p.b])))
    .sort((p, q) => p.zugleich.length - q.zugleich.length || (spiel(p.a) || spiel(p.b) ? -1 : 0) - (spiel(q.a) || spiel(q.b) ? -1 : 0));
const aus = [];
aus.push(`Verdachtsfaelle: ${liste.length} (ohne Koexistenz ${liste.filter(p => !p.zugleich.length).length}, mit ${liste.filter(p => p.zugleich.length).length})`);
aus.push('', '== Ohne gemeinsame Saison (meist Umbenennung/Schreibweise) ==');
liste.filter(p => !p.zugleich.length).forEach(p => aus.push(`  ${zeile(p.a)}\n  ${zeile(p.b)}${p.lang ? '   [Abkuerzung aufgeloest]' : ''}\n`));
aus.push('== Mit gemeinsamer Saison (zwei verschiedene Vereine) ==');
liste.filter(p => p.zugleich.length).forEach(p => aus.push(`  ${namen[p.a]} [${p.a}] <-> ${namen[p.b]} [${p.b}] – zusammen in ${p.zugleich.sort().slice(0, 4).join(',')}`));
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
fs.writeFileSync(path.join(DIR, '_dryrun/hist_dubletten.txt'), aus.join('\n'));

// ---------- Entscheidungsseite (eine Datei, Daten eingebettet – laeuft per Doppelklick) ----------
const ligaName = lid => (HX.ligen[lid] && HX.ligen[lid].name) || (GD.leagues[lid] && GD.leagues[lid].name) || (lid === 'ddr1' ? 'DDR-Oberliga' : lid);
const saisonStr = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const seite = id => ({ id, name: namen[id], spiel: spiel(id),
    jahre: [...auftritt[id].jahre].sort((a, b) => a - b).map(saisonStr),
    ligen: [...auftritt[id].ligen].map(ligaName) });
const daten = { stand: new Date().toISOString().slice(0, 10), alias: ALIAS, getrennt: GETRENNT,
    paare: liste.map(p => ({ a: seite(p.a), b: seite(p.b), abk: !!p.lang, zugleich: p.zugleich.sort().map(saisonStr) })) };
const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Historische Vereine: Dubletten pruefen</title>
<style>
  :root{ --bg:#0d1117; --panel:#161b22; --line:#30363d; --text:#e6edf3; --muted:#8b949e; --ok:#3fb950; --bad:#f85149; --accent:#58a6ff; --chip:#21262d; }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--text); font-size:13px; }
  header{ position:sticky; top:0; z-index:10; background:#010409; border-bottom:1px solid var(--line); padding:10px 14px; }
  h1{ margin:0 0 4px; font-size:16px; }
  .sub{ color:var(--muted); font-size:11px; line-height:1.5; margin-bottom:8px; }
  .bar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  button, label.btn{ background:var(--panel); border:1px solid var(--line); color:var(--text); padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; }
  button:hover{ border-color:var(--accent); }
  button.primary{ background:#1f6feb; border-color:#388bfd; }
  input[type=search]{ background:#0d1117; border:1px solid var(--line); color:var(--text); border-radius:6px; padding:6px 8px; font-size:12px; min-width:180px; }
  .zaehler{ color:var(--muted); font-size:12px; }
  main{ padding:12px 14px 90px; }
  .paar{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-bottom:10px; }
  .paar.erledigt{ opacity:.55; }
  .koex{ color:var(--bad); font-size:11px; margin-bottom:6px; }
  .frei{ color:var(--ok); font-size:11px; margin-bottom:6px; }
  .seiten{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media(max-width:760px){ .seiten{ grid-template-columns:1fr; } }
  .seite{ background:#0d1117; border:1px solid var(--line); border-radius:6px; padding:8px 10px; }
  .seite h3{ margin:0 0 3px; font-size:14px; }
  .seite .id{ color:var(--muted); font-size:10px; word-break:break-all; }
  .chips{ display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .chip{ background:var(--chip); border-radius:10px; padding:2px 7px; font-size:10px; color:#c9d1d9; }
  .chip.liga{ background:#1c2d41; }
  .wahl{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .wahl button.aktiv{ background:#1f6feb; border-color:#388bfd; }
  .tip{ background:#1c2d41; color:#9ecbff; border-radius:8px; padding:1px 6px; font-size:10px; margin-left:3px; }
  .wahl button.aktiv .tip{ background:#0b3a76; color:#cfe8ff; }
  .wahl button.aktiv.trenn{ background:#8b2c22; border-color:var(--bad); }
  .art{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:6px; font-size:11px; color:#8b949e; }
  .art button{ font-size:11px; padding:3px 9px; }
  .art button.aktiv{ background:#238636; border-color:#2ea043; }
  textarea{ width:100%; height:180px; background:#0d1117; border:1px solid var(--line); color:var(--text); border-radius:6px; padding:8px; font-family:Consolas,monospace; font-size:11px; }
  .ausgabe{ position:fixed; bottom:0; left:0; right:0; background:#010409; border-top:1px solid var(--line); padding:8px 14px; }
  .ausgabe.zu textarea{ display:none; }
</style>
</head>
<body>
<header>
  <h1>Historische Vereine: Dubletten pruefen</h1>
  <div class="sub">Zwei Eintraege koennen derselbe Verein sein. <b>Spielen beide in derselben Saison, sind es zwei Vereine.</b>
    Entscheidung waehlen &rarr; unten entsteht das JSON fuer <code>tools/hist_alias.json</code> (Zusammenlegen) und
    <code>tools/hist_alias_getrennt.json</code> (bewusst getrennt, damit der Bericht sie nicht erneut meldet).
    <b>Welche Seite waehlen?</b> Die gewaehlte Seite ist der Verein, unter dem beide Zeitraeume gefuehrt werden – am besten
    der heute noch bestehende (Kennzeichen <span class="tip">im Spiel</span>). Der andere Name geht nicht verloren: er
    erscheint als damaliger Name in seinen Saisons. Gibt es den Verein heute nicht mehr, waehle die Namensform, unter der er
    am laengsten gespielt hat. Entscheidungen bleiben im Browser gespeichert. Stand der Daten: ${daten.stand}<br>
    <b>So geht es weiter:</b> unten <i>JSON speichern</i> &rarr; Datei an Claude geben (oder die beiden Eintraege selbst in die
    JSON-Dateien uebernehmen) &rarr; <code>node tools/historie_einbau.mjs</code> baut die Daten neu.</div>
  <div class="bar">
    <input type="search" id="suche" placeholder="Name oder Liga suchen" oninput="zeichne()">
    <label class="btn"><input type="checkbox" id="nurOffen" onchange="zeichne()" checked> nur unentschiedene</label>
    <label class="btn"><input type="checkbox" id="mitKoex" onchange="zeichne()"> auch Paare mit gemeinsamer Saison</label>
    <span class="zaehler" id="zaehler"></span>
    <div style="flex:1"></div>
    <button onclick="jsonZeigen()">JSON anzeigen</button>
    <button class="primary" onclick="jsonDatei()">JSON speichern</button>
    <button onclick="jsonKopieren()">Kopieren</button>
    <button onclick="if(confirm('Alle Entscheidungen verwerfen?')){ W={}; sichern(); zeichne(); }">Zuruecksetzen</button>
  </div>
</header>
<main id="liste"></main>
<div class="ausgabe zu" id="ausgabe"><textarea id="json" readonly></textarea></div>
<script>
const DATEN = ${JSON.stringify(daten)};
const KEY = 'hist_dubletten_wahl_v1';
let W = {};
try { W = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { W = {}; }
const sichern = () => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };
const schluessel = p => p.a.id + '|' + p.b.id;
// Wert: 'a'/'b' = diese Seite ist der heutige Verein, dahinter ':s' Schreibweise oder ':f' Fusion (ohne = Umbenennung); 'x' = getrennt
const teil = w => ({ dir: w && w[0] !== 'x' ? w[0] : null, art: (w || '').split(':')[1] || 'u' });
function waehle(i, wert) {
  const p = DATEN.paare[i], k = schluessel(p), t = teil(W[k]);
  if (wert === 'x') W[k] === 'x' ? delete W[k] : W[k] = 'x';
  else if (t.dir === wert) delete W[k];
  else W[k] = wert + (t.art !== 'u' ? ':' + t.art : '');
  sichern(); zeichne(); jsonBauen();
}
function waehleArt(i, art) {
  const p = DATEN.paare[i], k = schluessel(p), t = teil(W[k]);
  if (!t.dir) return;
  W[k] = t.dir + (art !== 'u' ? ':' + art : '');
  sichern(); zeichne(); jsonBauen();
}
// Ist eine Seite ein Verein aus dem Spiel, gehoert die Historie normalerweise dorthin
function empfehlung(p) { if (p.a.spiel === p.b.spiel) return null; return p.a.spiel ? 'a' : 'b'; }
// Abstand zwischen beiden Zeitraeumen: eine grosse Luecke spricht eher fuer zwei Vereine
function luecke(p) {
  const j = s => s.jahre.map(x => parseInt(x));
  const A = j(p.a), B = j(p.b);
  const d = Math.max(0, Math.max(Math.min(...B) - Math.max(...A), Math.min(...A) - Math.max(...B)) - 1);
  return d ? ' · ' + d + ' Jahre Abstand' : ' · direkt aufeinander folgend';
}
function jahreText(s) {
  const j = s.jahre; if (j.length <= 6) return j.join(', ');
  return j[0] + ' … ' + j[j.length - 1] + ' (' + j.length + ' Saisons)';
}
function zeichne() {
  const q = (document.getElementById('suche').value || '').toLowerCase();
  const nurOffen = document.getElementById('nurOffen').checked, mitKoex = document.getElementById('mitKoex').checked;
  let n = 0, offen = 0;
  const html = DATEN.paare.map((p, i) => {
    const k = schluessel(p), w = W[k], t = teil(w);
    if (!w) offen++;
    if (!mitKoex && p.zugleich.length) return '';
    if (nurOffen && w) return '';
    const text = (p.a.name + ' ' + p.b.name + ' ' + p.a.ligen.join(' ') + ' ' + p.b.ligen.join(' ')).toLowerCase();
    if (q && !text.includes(q)) return '';
    n++;
    const seite = (s, andere) => \`<div class="seite"><h3>\${s.name}\${s.spiel ? ' <span class="chip">Spielverein</span>' : ''}</h3>
      <div class="id">\${s.id}</div>
      <div class="chips">\${s.ligen.slice(0, 4).map(l => '<span class="chip liga">' + l + '</span>').join('')}</div>
      <div class="chips"><span class="chip">\${jahreText(s)}</span></div></div>\`;
    return \`<div class="paar \${w ? 'erledigt' : ''}">
      \${p.zugleich.length ? '<div class="koex">Beide zusammen in ' + p.zugleich.slice(0, 5).join(', ') + ' &rarr; zwei Vereine: getrennt oder spaeter fusioniert</div>'
        : '<div class="frei">Nie in derselben Saison' + luecke(p) + (p.abk ? ' · Abkuerzung aufgeloest' : '') + '</div>'}
      <div class="seiten">\${seite(p.a)}\${seite(p.b)}</div>
      <div class="wahl">
        <button class="\${t.dir === 'a' ? 'aktiv' : ''}" onclick="waehle(\${i},'a')" title="\${p.a.name} ist der heutige Verein">
          Heute: <b>\${p.a.name}</b>\${p.a.spiel ? ' <span class="tip">im Spiel</span>' : ''}\${empfehlung(p) === 'a' ? ' <span class="tip">empfohlen</span>' : ''}</button>
        <button class="\${t.dir === 'b' ? 'aktiv' : ''}" onclick="waehle(\${i},'b')" title="\${p.b.name} ist der heutige Verein">
          Heute: <b>\${p.b.name}</b>\${p.b.spiel ? ' <span class="tip">im Spiel</span>' : ''}\${empfehlung(p) === 'b' ? ' <span class="tip">empfohlen</span>' : ''}</button>
        <button class="trenn \${w === 'x' ? 'aktiv trenn' : ''}" onclick="waehle(\${i},'x')">Zwei verschiedene Vereine</button>
      </div>
      \${t.dir ? (() => { const alt = t.dir === 'a' ? p.b.name : p.a.name, neu = t.dir === 'a' ? p.a.name : p.b.name;
        return \`<div class="art">Art:
        <button class="\${t.art === 'u' ? 'aktiv' : ''}" onclick="waehleArt(\${i},'u')" title="\${alt} wird zu \${neu}, der alte Name erscheint als damaliger Name">Umbenennung</button>
        <button class="\${t.art === 's' ? 'aktiv' : ''}" onclick="waehleArt(\${i},'s')" title="derselbe Name anders geschrieben – kein damaliger Name">nur Schreibweise</button>
        <button class="\${t.art === 'f' ? 'aktiv' : ''}" onclick="waehleArt(\${i},'f')" title="\${alt} ist in \${neu} aufgegangen; beide behalten ihre eigenen Zahlen">Fusion (Vorgaenger)</button></div>\`; })() : ''}
      </div>\`;
  }).join('');
  document.getElementById('liste').innerHTML = html || '<div class="sub">Nichts zu zeigen – Filter aendern.</div>';
  document.getElementById('zaehler').textContent = n + ' angezeigt · ' + (DATEN.paare.length - offen) + ' von ' + DATEN.paare.length + ' entschieden';
}
function jsonBauen() {
  const alias = {}, schreibweise = {}, fusion = {}, getrennt = {};
  DATEN.paare.forEach(p => {
    const w = W[schluessel(p)]; if (!w) return;
    if (w === 'x') { (getrennt[p.a.id] = getrennt[p.a.id] || []).push(p.b.id); return; }
    const t = teil(w), ziel = t.dir === 'a' ? p.a : p.b, weg = t.dir === 'a' ? p.b : p.a;
    if (t.art === 'f') { (fusion[ziel.id] = fusion[ziel.id] || { vorgaenger: [] }).vorgaenger.push(weg.id); return; }
    (t.art === 's' ? schreibweise : alias)[weg.name] = ziel.spiel ? ziel.id : ziel.name;   // Spielverein per ID, sonst per Name
  });
  const out = { _hinweis: 'einarbeiten: node tools/hist_dubletten.mjs --uebernehmen <diese Datei>, danach node tools/historie_einbau.mjs', alias, schreibweise, fusion, getrennt };
  document.getElementById('json').value = JSON.stringify(out, null, 2);
  return out;
}
function jsonZeigen() { jsonBauen(); document.getElementById('ausgabe').classList.toggle('zu'); }
function jsonDatei() {
  const blob = new Blob([JSON.stringify(jsonBauen(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hist_dubletten_entscheidungen.json'; a.click();
}
function jsonKopieren() { jsonBauen(); const t = document.getElementById('json'); t.select();
  try { navigator.clipboard.writeText(t.value); alert('JSON kopiert.'); } catch (e) { alert('Kopieren fehlgeschlagen – Text markieren und kopieren.'); } }
zeichne(); jsonBauen();
</script>
</body>
</html>`;
fs.writeFileSync(path.join(DIR, 'hist_dubletten.html'), html);
console.log(aus.slice(0, 1).join('\n'));
console.log(`-> tools/_dryrun/hist_dubletten.txt und tools/hist_dubletten.html (${ids.length} Vereine geprueft)`);
