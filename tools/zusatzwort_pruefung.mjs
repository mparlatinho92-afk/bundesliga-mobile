// Zusatzwort-Dubletten nach dem Metternich-Muster (Nutzer 28.10.2026: „FC Metternich“ = „FC Germania Metternich“ – „mannschaft a
// und b wohl identisch, weil eines der beiden teile des namens weglässt“).
//   node tools/hist_dubletten.mjs            (schreibt tools/_dryrun/hist_dubletten_paare.json)
//   node tools/zusatzwort_pruefung.mjs       -> Bericht tools/_dryrun/zusatzwort_pruefung.txt
//   node tools/zusatzwort_pruefung.mjs --selbsttest   Metternich vor der Zusammenlegung (git 4c8a81b) muss als „stark“ gelten
//
// Paar = ein Name enthält alle Kernwörter des anderen plus mindestens eins (Vereinsform/Jahreszahl zählen nicht), KEINE gemeinsame
// Saison, noch nicht entschieden (hist_alias/schreibweise/fusion/getrennt). Belege je Namenswechsel in der Saisonfolge:
//   Lücke  = Jahre zwischen letzter Saison des einen und erster des anderen Namens (0 = Folgesaison)
//   Liga   = gleiche Liga, oder Auf-/Abstieg (Mutter/Tochter im Ligenbaum), oder Nachbarstaffel (gleiche Mutter)
// stark   = jeder Wechsel mit Lücke 0 UND passender Liga, Zusatzwort kein Ort und keine Spielgemeinschaft
// mittel  = jeder Wechsel passt in der Liga, Lücke höchstens 2 Jahre
// schwach = sonst (zeitlich oder räumlich auseinander)
// Das Zusatzwort wird geprüft: ein Ort (Gemeindename aus den Stadien) oder „/“/SG = eher anderer Verein bzw. Spielgemeinschaft.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: { getElementById: () => null }, console };
vm.createContext(ctx);
// Selbsttest: history_ext.js aus dem Stand VOR der Metternich-Zusammenlegung (v0.8.228.38)
const quelle = f => SELBST && f === 'app/history_ext.js' ? execSync('git show 4c8a81b:app/history_ext.js', { cwd: ROOT, maxBuffer: 1 << 28 }).toString() : fs.readFileSync(ROOT + f, 'utf8');
for (const f of ['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'game_engine.js'])
    vm.runInContext(quelle(f).replace(/^const /gm, 'var '), ctx, { filename: f });
const { GAME_DATA: GD, HISTORY_SEED: SEED, HISTORIC_CLUBS: HC, HIST_EXT: HX, Engine } = ctx;
const tab = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')).toString());

// ---------- Auftritte je Verein: Jahr -> Ligen ----------
const auf = {};
const merke = (id, y, lid) => { const j = parseInt(y); ((auf[id] = auf[id] || {})[j] = auf[id][j] || new Set()).add(lid); };
for (const t of Object.values(tab)) { t.rows.forEach(r => merke(r.id, t.y, t.lid)); (t.vr || []).forEach(v => v.rows.forEach(r => merke(r.id, t.y, t.lid))); }
SEED.seasons.forEach(s => s.table.forEach(r => merke(r.id, s.y, s.lid)));
const namen = {};
Object.entries(HX.vereine).forEach(([id, n]) => namen[id] = n);
Object.entries(HC || {}).forEach(([id, n]) => namen[id] = n);
Object.values(GD.teams).forEach(t => namen[t.id] = t.name);

// ---------- Ligenbaum: Mutter einer Liga (Spiel-Ligen aus Engine.HARD_LINKS, historische aus hoch1994/hoch2008) ----------
const mutter = {};
for (const [p, kids] of Object.entries(Engine.HARD_LINKS || {})) kids.forEach(c => mutter[c] = mutter[c] || new Set([p]));
for (const [c, p] of Object.entries(HX.hoch2008 || {})) (mutter[c] = mutter[c] || new Set()).add(p);
for (const [c, arr] of Object.entries(HX.hoch1994 || {})) arr.forEach(([, , p]) => (mutter[c] = mutter[c] || new Set()).add(p));
const ligaName = l => (HX.ligen[l] && HX.ligen[l].name) || (GD.leagues[l] && GD.leagues[l].name) || l;
const ebene = l => (HX.ligen[l] && HX.ligen[l].level) || (GD.leagues[l] && GD.leagues[l].level) || 0;
const nachfolger = HX.ligaNachfolger || {};
// Historische Liga -> heutige Nachfolge-Liga (Oberliga Südwest -> Oberliga RLP/Saar): erst darüber sieht man, dass Metternich
// 2000 -> 2001 aus der Oberliga Südwest in die Rheinlandliga abstieg (Selbsttest fiel ohne das durch)
const kanon = l => nachfolger[l] || l;
const gleich = (a, b) => a === b || kanon(a) === kanon(b);
const verwandt = (a, b) => {
    if (gleich(a, b)) return 'gleiche Liga';
    for (const [x, y] of [[a, b], [kanon(a), kanon(b)], [a, kanon(b)], [kanon(a), b]]) {
        const mx = mutter[x] || new Set(), my = mutter[y] || new Set();
        if (mx.has(y) || my.has(x)) return 'Auf-/Abstieg';
        if ([...mx].some(m => my.has(m))) return 'Nachbarstaffel';
    }
    return null;
};

// ---------- Namen: Kernwörter ohne Vereinsform/Jahreszahl ----------
const FORM = new Set(['klub', 'kickers', 'tsvgg', 'sportgemeinschaft', 'sf', 'ts', 'tus', 'tsv', 'sb', 'sv', 'sg', 'bv', 'bsv', 'fv', 'fc', 'sc', 'spvgg', 'spvg', 'vfb', 'vfl', 'vfr', 'mtv', 'tv', 'tg', 'ssv', 'fsv',
    'tsg', 'sgm', 'fsg', 'jsg', 'spg', 'djk', 'esv', 'psv', 'ksv', 'asv', 'bsg', 'e', 'v', 'ev', '1', 'i', 'ii', 'iii', 'am', 'amateure', 'fussball', 'club', 'verein', 'und', 'von',
    'der', 'die', 'im', 'in', 'a', 'turn', 'sport', 'sportverein', 'turnverein', 'fussballclub', 'sportclub', 'sportfreunde', 'spielvereinigung']);
const norm = n => n.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').split(/[^a-z0-9]+/).filter(Boolean);
const kern = n => norm(n).filter(w => !FORM.has(w) && !/^\d+$/.test(w));
// Gemeindenamen aus den Stadien (venues[].gem / ort) – ist das Zusatzwort ein Ort, ist es eher ein anderer Verein
const orte = new Set();
for (const t of Object.values(GD.teams)) for (const v of t.venues || []) for (const x of [v.gem, v.ort]) if (x) norm(x).forEach(w => w.length >= 4 && orte.add(w));

const paare = JSON.parse(fs.readFileSync(ROOT + 'tools/_dryrun/hist_dubletten_paare.json', 'utf8'));
// Selbsttest: das Paar aus dem Stand VOR der Zusammenlegung (die Paarliste von heute kennt es nicht mehr)
if (SELBST) paare.push({ a: 'fcgermaniametternich_175', b: 'hist_fb_fcmetternich', na: namen.fcgermaniametternich_175, nb: namen.hist_fb_fcmetternich, zugleich: 0, entschieden: false });
const ergebnis = [];
for (const p of paare) {
    if (p.zugleich || p.entschieden || !auf[p.a] || !auf[p.b]) continue;
    const ka = kern(p.na), kb = kern(p.nb);
    const [kurz, lang, idK, idL] = ka.length <= kb.length ? [ka, kb, p.a, p.b] : [kb, ka, p.b, p.a];
    if (!kurz.length || !kurz.every(w => lang.includes(w))) continue;   // nur echtes Weglassen
    // gleicher Kern: dann unterscheidet sich nur die Vereinsform („Kosova“ / „Klub Kosova“, „TSV“ / „TSVgg Stadecken-Elsheim“)
    const nurForm = lang.length === kurz.length;
    if (nurForm && norm(p.na).join(' ') === norm(p.nb).join(' ')) continue;
    // Erste Mannschaft und Reserve nie paaren („Germania Forst“ / „Germania Forst (A)“)
    const RES = /(\s(III|II|2|U ?2[123]|Amateure|Am\.?|A)|\(A\).*)$/i;
    if (RES.test(p.na.trim()) !== RES.test(p.nb.trim())) continue;
    // nur Vereinsform: zählt nur, wenn EINE Seite sie weglässt (Kosova / Klub Kosova). Eine ANDERE Form (FC Engen / VfR Engen)
    // ist Umbenennung oder Fusion – nicht das Weglassen-Muster, das gehört in hist_dubletten.mjs.
    if (nurForm) { const x = new Set(norm(p.na)), y = new Set(norm(p.nb));
        if (![...x].every(w => y.has(w)) && ![...y].every(w => x.has(w))) continue; }
    const zusatz = nurForm ? (() => { const x = norm(p.na), y = norm(p.nb); return x.filter(w => !y.includes(w)).concat(y.filter(w => !x.includes(w))); })() : lang.filter(w => !kurz.includes(w));
    // Saisonfolge: [Jahr, wer, Ligen]
    const folge = [];
    for (const [id, wer] of [[p.a, 'a'], [p.b, 'b']]) for (const [j, l] of Object.entries(auf[id])) folge.push([+j, wer, [...l]]);
    folge.sort((x, y) => x[0] - y[0]);
    const wechsel = [];
    for (let i = 1; i < folge.length; i++) if (folge[i][1] !== folge[i - 1][1]) {
        const [j0, , l0] = folge[i - 1], [j1, , l1] = folge[i];
        let liga = null; for (const x of l0) for (const y of l1) liga = liga || verwandt(x, y);
        wechsel.push({ von: j0, nach: j1, luecke: j1 - j0 - 1, liga, l0: l0.map(ligaName).join('/'), l1: l1.map(ligaName).join('/') });
    }
    const ort = zusatz.filter(w => orte.has(w));
    // Spielgemeinschaft: ein Name mit „/“ oder SG-Form, der andere ohne – ODER beide SG, aber nur einer nennt zwei Orte
    // („SG Geisfeld“ vs. „SG Rascheid/Geisfeld“): dann ist das Zusatzwort der zweite Ort einer Gemeinschaft, kein Namensteil
    const SGRE = /\bSG\b|\bSGM\b|\bFSG\b|\bJSG\b|\bSpG\b/;
    const sg = SGRE.test(p.na) !== SGRE.test(p.nb) || /\//.test(p.na) !== /\//.test(p.nb);
    const alleLiga = wechsel.every(w => w.liga), maxL = Math.max(...wechsel.map(w => w.luecke));
    const stufe = alleLiga && maxL === 0 && !ort.length && !sg ? 'stark' : alleLiga && maxL <= 2 ? 'mittel' : 'schwach';
    ergebnis.push({ stufe, nurForm, kurz: namen[idK], idK, lang: namen[idL], idL, zusatz, ort, sg, wechsel,
        jahreK: Object.keys(auf[idK]).map(Number).sort((x, y) => x - y), jahreL: Object.keys(auf[idL]).map(Number).sort((x, y) => x - y) });
}
const R = { stark: 0, mittel: 1, schwach: 2 };
ergebnis.sort((x, y) => R[x.stufe] - R[y.stufe] || x.kurz.localeCompare(y.kurz, 'de'));
const spanne = js => { const t = []; let a = js[0], b = js[0]; for (const j of js.slice(1).concat(null)) { if (j === b + 1) { b = j; continue; } t.push(a === b ? `${a}` : `${a}–${b}`); a = b = j; } return t.join(', '); };
const zeilen = ergebnis.map(e => `[${e.stufe}] ${e.kurz} [${e.idK}]  <->  ${e.lang} [${e.idL}]   ${e.nurForm ? 'nur Vereinsform' : 'Zusatz'}: ${e.zusatz.join(' ')}${e.ort.length ? '  (ORT?)' : ''}${e.sg ? '  (SG/„/“)' : ''}
      ${e.kurz}: ${spanne(e.jahreK)} | ${e.lang}: ${spanne(e.jahreL)}
      ${e.wechsel.map(w => `${w.von}→${w.nach}${w.luecke ? ` (+${w.luecke} J. Lücke)` : ''}: ${w.liga || 'Liga passt NICHT'} (${w.l0} → ${w.l1})`).join('\n      ')}`);
const zahl = s => ergebnis.filter(e => e.stufe === s).length;
const kopf = `Zusatzwort-Paare ohne gemeinsame Saison, noch nicht entschieden: ${ergebnis.length} (stark ${zahl('stark')}, mittel ${zahl('mittel')}, schwach ${zahl('schwach')})`;
fs.writeFileSync(ROOT + 'tools/_dryrun/zusatzwort_pruefung' + (SELBST ? '_selbsttest' : '') + '.txt', kopf + '\n\n' + zeilen.join('\n\n') + '\n');
console.log(kopf);
if (SELBST) {
    const m = ergebnis.find(e => /Metternich/.test(e.kurz + e.lang));
    console.log(m ? `Metternich: ${m.stufe} – ${m.wechsel.map(w => `${w.von}→${w.nach} ${w.liga}`).join(', ')}` : 'Metternich nicht gefunden');
    const ok = m && m.stufe === 'stark';
    console.log(ok ? 'Selbsttest bestanden: das bekannte Paar wird als „stark“ erkannt.' : 'SELBSTTEST DURCHGEFALLEN');
    process.exit(ok ? 0 : 1);
}
console.log('Bericht: tools/_dryrun/zusatzwort_pruefung.txt');
