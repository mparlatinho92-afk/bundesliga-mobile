// Recherche zu den "Vorschlaegen ueber den Ort" (tools/hist_dubletten.html, zweiter Bereich): ist der Quellname derselbe
// Verein wie der Spielverein am selben Ort? Wikipedia, nur lesend, mit Zwischenspeicher.
//
//   node tools/hist_dubletten.mjs        # schreibt tools/_dryrun/hist_orte.json (die offenen Vorschlaege)
//   node tools/hist_ort_recherche.mjs    # -> tools/_dryrun/hist_ort_recherche.txt + tools/_dryrun/hist_ort_export.json
//
// Belege, in dieser Rangfolge:
//   WEITERLEITUNG  Wikipedia leitet den Quellnamen auf den Artikel des Spielvereins um            -> derselbe Verein
//   SATZ           Artikel des Spielvereins nennt den Quellnamen im selben Satz wie ein Umbenennungswort -> derselbe Verein
//   FUSION         ... wie SATZ, aber mit Fusionswort (Fusion, Zusammenschluss)                     -> NICHT zusammenlegen
//                  (Nutzerregel: Fusions-Vorgaenger behalten eigene IDs, tools/hist_fusion.json)
//   EIGEN          Quellname hat einen EIGENEN Artikel, der den Spielverein nicht als Nachfolger nennt -> eigener Verein
//   offen          nichts davon
// GEGENPROBE mit derselben Funktion: bekannte Nachfolger (farchiv_vereine Stufe B, Grund "Nachfolge") muessen "derselbe"
// ergeben, bekannte getrennte Paare (Korrektur null, z. B. Fichte Bielefeld / Arminia) duerfen es NICHT.
// Der Export (zuordnung: Name -> ID) enthaelt nur WEITERLEITUNG und SATZ; Einarbeiten wie jeder Export der Pruefseite:
//   node tools/hist_dubletten.mjs --uebernehmen tools/_dryrun/hist_ort_export.json
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
(0, eval)(fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8').replace(/^const /gm, 'var '));
const GD = globalThis.GAME_DATA;
const ORTE = JSON.parse(fs.readFileSync(path.join(DIR, '_dryrun/hist_orte.json'), 'utf8'));
const VZ = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_vereine.json'), 'utf8')).zuordnung;
const KORR = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_vereine_korrektur.json'), 'utf8'));

const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Vereinszuordnung)';
const CACHE = path.join(os.tmpdir(), 'wiki_ort_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let abrufe = 0;
async function api(params) {
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params));
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (fs.existsSync(datei)) return JSON.parse(fs.readFileSync(datei, 'utf8'));
    for (let i = 0; i < 6; i++) {
        const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch(e => ({ ok: false, status: e.message }));
        if (r.ok) { const j = await r.json(); fs.writeFileSync(datei, JSON.stringify(j)); abrufe++; await sleep(400); return j; }
        console.log(`  [${r.status}] warte ${5 * 2 ** i} s`); await sleep(5000 * 2 ** i);
    }
    throw new Error('API-Fehler');
}

const norm = s => (s || '').toLowerCase().replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const klartext = wt => wt
    // Ueberschrift/Aufzaehlung als Satzgrenze: das Trennmuster verlangt zwei KLEINbuchstaben vor dem Punkt ('ÜBERSCHRIFT.' trennte nie)
    .replace(/^=+[^=\n]*=+\s*$/gm, '\nZwischentitel. Neu ').replace(/^\*+/gm, '\nPunkt. Neu ')
    .replace(/<ref[^>]*\/>/g, ' ').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ' ')
    .replace(/\[\[(?:Datei|File|Bild|Image|Kategorie):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ').replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/^[{|!].*$/gm, ' ').replace(/[ \t]+/g, ' ');
const saetze = text => text.replace(/\s+/g, ' ').split(/(?<=[a-zäöüß)\]"“]{2}[.!?])\s+(?=[A-ZÄÖÜ„"])/);
// Umbenennung/Nachfolge (dieselbe Linie) und Fusion getrennt; Saetze ueber Gegner zaehlen nicht
const UMBENENNUNG = /hervorgegangen|hervorging|ging\s+\S+\s+hervor|umbenannt|Umbenennung|nannte\s+sich|benannte\s+sich|trug\s+(?:den|seit)|hieß|hiess|Nachfolge|Vorgänger|firmierte|gegründet\s+als|Namensänderung|änderte\s+(?:seinen|den)\s+Namen|neuen\s+Namen|ehemals|früher/i;
const FUSION = /Fusion|fusionierte|Zusammenschluss|schloss(?:en)?\s+sich\s+\S*\s*zusammen|vereinigte|Verschmelzung/i;
const GEGNER = /unterlag|gegen\s|Rivale|Konkurrent|Derby|Lokalrivale|Nachbar|Stadtrivale/i;
// Blosse Plaene ("schlug vor, … zu fusionieren") sind kein Beleg
const PLAN = /schlug\s+vor|vorgeschlagen|geplant|scheiterte|gescheitert|Pläne|angedacht|Überlegungen/i;
// Vereinsform-Woerter: allein kein Name
const FORM = new Set('sv fc sc spvgg spvg tus tsv vfb vfl vfr sg fsv ssv bsv tv tsg mtv fv bv esv psv djk dsc sportfreunde sf 1 e v ev und von der'.split(' '));
const kernVon = n => norm(n).split(' ').filter(w => !FORM.has(w) && !/^\d+$/.test(w));

// ---------- Artikel ----------
const artikelCache = new Map();
async function artikel(titel) {
    if (artikelCache.has(titel)) return artikelCache.get(titel);
    const j = await api({ action: 'query', redirects: '1', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titel });
    const p = (j.query?.pages || [])[0];
    const umgeleitet = !!(j.query?.redirects || []).length;
    const a = p && p.revisions ? { titel: p.title, text: p.revisions[0].slots.main.content, umgeleitet } : null;
    artikelCache.set(titel, a);
    return a;
}
// Artikel eines Spielvereins: Name direkt, sonst Suche mit Ort im Titel (keine Saison-/Stadion-/Listenartikel)
async function vereinsArtikel(team) {
    const d = await artikel(team.name);
    if (d && !/Begriffsklärung|\{\{\s*Begriffsklärung/.test(d.text)) return d;
    const s = await api({ action: 'opensearch', search: team.name, limit: '6', namespace: '0' });
    const orte = new Set(kernVon(team.name).concat((team.venues || []).flatMap(v => kernVon((v.ort || '').split(/[-,(]/)[0]))));
    const t = (s[1] || []).find(x => kernVon(x).some(w => orte.has(w)) && !/Saison|\d{4}\/\d{2}|Liste|Stadion|Sportpark|Begriffsklärung/.test(x));
    // ueber die Suche gefunden: kann der Artikel eines VORGAENGERS sein ("Hombrucher SV" -> [[Hombrucher FV 09]]) – kein Beleg
    const a = t ? await artikel(t) : null;
    return a ? { ...a, viaSuche: true } : null;
}

// ---------- eine Frage: ist Quellname q derselbe Verein wie Spielverein z? ----------
async function pruefe(q, zid) {
    const team = GD.teams[zid];
    const za0 = await vereinsArtikel(team);
    if (za0 && za0.viaSuche) return { art: 'offen', beleg: `Artikel zu ${team.name} nur ueber die Suche gefunden ([[${za0.titel}]]) – kann ein Vorgaenger sein` };
    const za = za0;
    const qa = await artikel(q);
    // 1. Satz im Vereinsartikel: Quellname (voller Name, oder Kern aus >= 2 Woertern) + Fusions-/Umbenennungswort.
    //    FUSION zuerst und VOR der Weiterleitung: Wikipedia leitet auch Fusions-Vorgaenger um ("TuS Ahlen" -> Rot Weiss Ahlen,
    //    1996 aus TuS und Blau-Weiss Ahlen fusioniert) – die Weiterleitung allein unterscheidet das nicht.
    let um = null;
    if (za) {
        // Jahreszahlen zaehlen nicht ("TuS 1920 Ahlen" = "TuS Ahlen"); Name voll, oder Kern aus >= 2 Woertern
        const ohneZahl = s => ' ' + norm(s).split(' ').filter(w => !/^\d+$/.test(w)).join(' ') + ' ';
        const k = kernVon(q), voll = ohneZahl(q), kern = ' ' + k.join(' ') + ' ';
        const stelle = n => n.includes(voll) ? n.indexOf(voll) : k.length >= 2 && n.includes(kern) ? n.indexOf(kern) : -1;
        const kandidaten = saetze(klartext(za.text)).map(s => ({ s, n: ohneZahl(s) })).filter(x => stelle(x.n) >= 0 && !GEGNER.test(x.s) && !PLAN.test(x.s));
        // Richtung der Fusion: ist der Quellname ihr ERGEBNIS ("… fusionierte … zur TSG Wismar", "Der Malchower SV entstand … aus
        // einer Fusion"), laeuft die Linie unter ihm weiter -> dieselbe Linie. Ist er VORGAENGER ("Fusion des VfV Hildesheim mit …")
        // -> Fusion, getrennt lassen (tools/hist_fusion.json).
        // ERGEBNIS einer Fusion ist KEIN Beleg fuer die Linie bis heute: "Rot-Weiss und FC Rheine fusionierten zum VfB Rheine",
        // und der FC Eintracht Rheine entstand spaeter aus einer WEITEREN Fusion (die Gegenprobe fiel darauf herein).
        const ergebnis = x => { const i = stelle(x.n), vor = x.n.slice(Math.max(0, i - 45), i), nach = x.n.slice(i, i + voll.length + 45);
            return /\s(zum|zur|zu einem|zu einer|unter der bezeichnung|unter dem namen)\s*$/.test(vor) || /\s(entstand|ging)\s/.test(nach.slice(voll.length - 1)); };
        const fu = kandidaten.filter(x => FUSION.test(x.s));
        const vorg = fu.find(x => !ergebnis(x));
        if (vorg) return { art: 'FUSION', beleg: `[[${za.titel}]]: …${vorg.s.trim().slice(0, 220)}…` };
        um = (kandidaten.find(x => !FUSION.test(x.s) && UMBENENNUNG.test(x.s)) || {}).s || null;
        // Verdacht: eine Fusion ab 1963 am selben Ort (Ort = Wort des Quellnamens, das auch im Spielverein/Stadionort steckt).
        // Dann genuegen Weiterleitung und Umbenennungssatz nicht ("TuS Ahlen" leitet auf Rot Weiss Ahlen, 1996 fusioniert).
        const orteZ = new Set(kernVon(team.name).concat((team.venues || []).flatMap(v => kernVon((v.ort || '').split(/[-,(]/)[0]))));
        const ort = k.find(w => orteZ.has(w));
        const fz = ort && saetze(klartext(za.text)).find(s => FUSION.test(s) && !PLAN.test(s) && ohneZahl(s).includes(' ' + ort + ' ')
            && (s.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).some(j => +j >= 1963));
        if (fz && (um || (qa && qa.umgeleitet && qa.titel === za.titel)))
            return { art: 'FUSION?', beleg: `[[${za.titel}]] nennt eine Fusion am Ort: …${fz.trim().slice(0, 200)}…` };
    }
    // 2. Weiterleitung des Quellnamens auf den Vereinsartikel
    if (qa && za && qa.umgeleitet && qa.titel === za.titel) return { art: 'WEITERLEITUNG', beleg: `"${q}" -> [[${za.titel}]]` };
    // 3. Umbenennungssatz ohne Weiterleitung
    if (um) return { art: 'SATZ', beleg: `[[${za.titel}]]: …${um.trim().slice(0, 220)}…` };
    // 3. Eigener Artikel des Quellnamens (keine Weiterleitung, kein Vereinsartikel), der den Spielverein nicht nennt
    if (qa && !qa.umgeleitet && (!za || qa.titel !== za.titel) && !/Begriffsklärung/.test(qa.text)) {
        const nenntZiel = kernVon(team.name).length && norm(klartext(qa.text)).includes(norm(team.name));
        return { art: nenntZiel ? 'offen' : 'EIGEN', beleg: `eigener Artikel [[${qa.titel}]]${nenntZiel ? ' nennt ' + team.name + ' – von Hand pruefen' : ''}` };
    }
    return { art: 'offen', beleg: za ? `Artikel [[${za.titel}]] ohne Beleg` : `kein Artikel zu ${team.name}` };
}
const DERSELBE = new Set(['WEITERLEITUNG', 'SATZ']);

// ---------- GEGENPROBE ----------
const positiv = Object.entries(VZ).filter(([n, z]) => z.stufe === 'B' && z.id && GD.teams[z.id] && /Nachfolge/.test(z.grund)).slice(0, 40);
// Bekannt VERSCHIEDEN: Quellnamen, die in derselben Saison NEBEN dem Spielverein spielten ("koexistiert mit", Stufe H) –
// zwei Vereine zugleich koennen nicht derselbe sein. Dazu die von Hand getrennten (Korrektur null, Fichte Bielefeld u. a.)
const negativ = [
    ...Object.entries(VZ).filter(([n, z]) => /^koexistiert mit/.test(z.grund || '') && (z.kandidaten || []).length)
        .map(([n, z]) => [n, String(z.kandidaten[0]).split(' ')[0]]),
    ...Object.entries(KORR).filter(([n, id]) => id === null && VZ[n] && VZ[n].id).map(([n]) => [n, VZ[n].id]),
].filter(([, id]) => GD.teams[id]).slice(0, 60);
const probe = { pos: { ja: 0, nein: 0 }, neg: { ja: 0, nein: 0 } }, probeFalsch = [];
for (const [n, z] of positiv) { const r = await pruefe(n, z.id); if (DERSELBE.has(r.art)) probe.pos.ja++; else probe.pos.nein++; }
for (const [n, id] of negativ) { const r = await pruefe(n, id); if (DERSELBE.has(r.art)) { probe.neg.ja++; probeFalsch.push(`${n} -> ${GD.teams[id].name}: ${r.beleg}`); } else probe.neg.nein++; }

// ---------- die Vorschlaege ----------
const ergebnis = [];
for (const o of ORTE) {
    const r = await pruefe(o.name, o.ziel.id);
    // anderer Kandidat mit Beleg? (nur wenn der Hauptvorschlag keinen hat)
    let alt = null;
    if (!DERSELBE.has(r.art)) for (const k of o.kand || []) { const rk = await pruefe(o.name, k.id); if (DERSELBE.has(rk.art)) { alt = { id: k.id, name: k.name, ...rk }; break; } }
    ergebnis.push({ name: o.name, neu: o.neu, jahre: o.jahre, ziel: o.ziel, ...r, alt });
}

// ---------- Ausgabe ----------
const zaehl = {}; ergebnis.forEach(e => { const k = e.alt ? 'ANDERER KANDIDAT' : e.art; zaehl[k] = (zaehl[k] || 0) + 1; });
const aus = [];
aus.push(`Recherche ${new Date().toISOString().slice(0, 10)}: ${ergebnis.length} Vorschlaege | ${Object.entries(zaehl).map(([k, v]) => k + ' ' + v).join(' | ')} | Wikipedia-Abrufe ${abrufe} (Rest aus dem Zwischenspeicher)`);
aus.push(`GEGENPROBE: bekannte Nachfolger (Stufe B) ${probe.pos.ja}/${positiv.length} erkannt | bekannt getrennte Paare faelschlich "derselbe" ${probe.neg.ja}/${negativ.length}`);
probeFalsch.forEach(x => aus.push('  FALSCH: ' + x));
for (const art of ['WEITERLEITUNG', 'SATZ', 'ANDERER KANDIDAT', 'FUSION', 'FUSION?', 'EIGEN', 'offen']) {
    const l = ergebnis.filter(e => (e.alt ? 'ANDERER KANDIDAT' : e.art) === art);
    if (!l.length) continue;
    aus.push('', `== ${art} (${l.length}) ==`);
    l.forEach(e => aus.push(`  ${e.name}${e.neu ? ' [OL 94-08]' : ''} (${e.jahre}) -> ${e.alt ? e.alt.name + ' statt ' + e.ziel.name : e.ziel.name}\n      ${e.alt ? e.alt.beleg : e.beleg}`));
}
fs.writeFileSync(path.join(DIR, '_dryrun/hist_ort_recherche.txt'), aus.join('\n'));
const zuordnung = {};
ergebnis.forEach(e => { if (e.alt) zuordnung[e.name] = e.alt.id; else if (DERSELBE.has(e.art)) zuordnung[e.name] = e.ziel.id; });
// Zwei Namen zum selben Ziel, die in derselben Saison spielten, koennen nicht beide dieser Verein sein -> beide raus
{
    const EB = JSON.parse(fs.readFileSync(path.join(DIR, 'farchiv_ebene23.json'), 'utf8'));
    const jahre = {}; EB.tabellen.forEach(t => t.zeilen.forEach(z => (jahre[z.verein] = jahre[z.verein] || new Set()).add(t.y)));
    const proZiel = {}; Object.entries(zuordnung).forEach(([n, id]) => (proZiel[id] = proZiel[id] || []).push(n));
    // auch gegen Namen, die schon sicher (A/B/K) an diesem Verein haengen
    Object.entries(VZ).forEach(([n, z]) => { if (z.id && proZiel[z.id] && ['A', 'B', 'K'].includes(z.stufe) && !proZiel[z.id].includes(n)) proZiel[z.id].push(n); });
    for (const [id, namen] of Object.entries(proZiel)) for (const a of namen) for (const b of namen) {
        if (a >= b || !jahre[a] || !jahre[b]) continue;
        const zugleich = [...jahre[a]].filter(y => jahre[b].has(y));
        if (!zugleich.length) continue;
        aus.push(`  ZUGLEICH: ${a} und ${b} (beide -> ${GD.teams[id].name}) spielten ${zugleich.slice(0, 3).join(', ')} – nicht zusammengelegt`);
        if (a in zuordnung) delete zuordnung[a];
        if (b in zuordnung) delete zuordnung[b];
    }
    fs.writeFileSync(path.join(DIR, '_dryrun/hist_ort_recherche.txt'), aus.join('\n'));
}
fs.writeFileSync(path.join(DIR, '_dryrun/hist_ort_export.json'), JSON.stringify({ _hinweis: 'aus tools/hist_ort_recherche.mjs – nur WEITERLEITUNG/SATZ; einarbeiten: node tools/hist_dubletten.mjs --uebernehmen <diese Datei>', zuordnung }, null, 2));
console.log(aus.slice(0, 2).join('\n'));
console.log(`-> tools/_dryrun/hist_ort_recherche.txt, tools/_dryrun/hist_ort_export.json (${Object.keys(zuordnung).length} Zusammenlegungen mit Beleg)`);
