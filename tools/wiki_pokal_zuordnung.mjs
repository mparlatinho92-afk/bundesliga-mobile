// Vereinszuordnung für tools/wiki_pokal.json (DFB-Pokal 1935–heute) -> tools/wiki_pokal_ids.json
//
//   node tools/wiki_pokal_zuordnung.mjs           ordnet zu, schreibt die JSON + Bericht tools/_dryrun/wiki_pokal_zuordnung.txt
//   node tools/wiki_pokal_zuordnung.mjs --offen   nur die ungelösten Namen (für tools/wiki_pokal_korrektur.json)
//
// Vorbild tools/wiki_aufstieg_zuordnung.mjs. ZWEI Belege je Nennung: der damalige Name ("TuS Paderborn-Neuhaus") und das
// Linkziel ("SC Paderborn 07" – Wikipedia verlinkt auf den HEUTIGEN Vereinsartikel). Reserve = "(A)", "Amateure", "II" im
// angezeigten Namen, auch wenn der Link auf die Erste zeigt.
// Stufen: K Korrektur | A gepflegte Zuordnungen (hist_alias, hist_schreibweise, club_map – Name, Name|Jahr oder Linkziel)
//         | S Saisonkontext über den Namen | L Saisonkontext über den Link | E Era-Name | G game_data (Link, dann Name)
//         H historischer Verein (Link, dann Name) | N neu (hist_pk_*, Bericht)
// Saisonkontext: Tabellen (HISTORY_SEED + HIST_EXT) ab 1963/64 (BRD) bzw. 1949 (DDR); davor tragen Link und Namen allein.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const NUR_OFFEN = process.argv.includes('--offen');
globalThis.window = globalThis;
const lade = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
['game_data.js', 'app/history_data.js', 'app/history_ext.js'].forEach(lade);
const GD = globalThis.GAME_DATA, SEED = globalThis.HISTORY_SEED, HC = globalThis.HISTORIC_CLUBS || {}, HN = globalThis.HISTORIC_NAMES || {};
const HX = globalThis.HIST_EXT, HXV = HX.vereine || {};
const EXT = JSON.parse(zlib.gunzipSync(Buffer.from(HX.gz, 'base64')).toString());
// --amateur: Deutsche Amateurmeisterschaft (tools/wiki_amateur.json -> wiki_amateur_ids.json, neue IDs hist_am_*). Zusätzliche Stufe P:
// dieselbe Nennung (Link bzw. Name, Reserve gleich) ist im DFB-Pokal schon eindeutig zugeordnet – die Amateurmeister spielten fast alle Pokal.
const AM = process.argv.includes('--amateur');
const QUELLE = AM ? 'wiki_amateur' : 'wiki_pokal', NEU_PRE = AM ? 'hist_am_' : 'hist_pk_';
const DATEN = JSON.parse(fs.readFileSync(path.join(DIR, QUELLE + '.json'), 'utf8'));
const lies = f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { return {}; } };
const KORREKTUR = AM ? { ...lies('wiki_pokal_korrektur.json'), ...lies('wiki_amateur_korrektur.json') } : lies('wiki_pokal_korrektur.json');
const GEPFLEGT = [lies('hist_alias.json'), lies('hist_schreibweise.json'), lies('club_map.json')];

// ---------- Namenskern (wie wiki_aufstieg_zuordnung.mjs) ----------
const slug = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const FORM = new Set(['sv', 'fc', 'vfb', 'vfl', 'vfr', 'spvgg', 'spvg', 'tsv', 'sc', 'fv', 'tus', 'tsg', 'sg', 'ssv', 'ssvg', 'asv', 'bsc', 'bfc', 'sportvg',
    'fsv', 'kfc', 'sus', 'svg', 'tsr', 'ev', 'rsv', 'esv', 'psv', 'djk', 'bv', 'bsv', 'fk', 'ksv', 'msv', 'e', 'v', '1', 'i', 'ii', 'u21', 'u23',
    'fussball', 'club', 'verein', 'sportverein', 'turn', 'und', 'von', 'tv', 'tg', 'mtv', 'tsc', 'ssc', 'jsg',
    'sk', 'ac', 'wac', 'fac', 'wsc']);   // österreichische Formen: "Rapid Wien" = "SK Rapid Wien"
const ALIAS = { sf: 'sportfreunde', spfr: 'sportfreunde', rw: 'rotweiss', sw: 'schwarzweiss', bw: 'blauweiss' };
const STOP = new Set(['a', 'am', 'an', 'der', 'die', 'im', 'in', 'e', 'v']);
const RES_ANZ = /\((A|Am\.?)\)|\bAmateure\b|\sAm(at)?\.?$|\s(II|2)$|\bII\b/;   // "\sAmat?" verfehlte " Am." (28.10.2026: 9 Pokalspiele bei der Ersten)   // auch "1. FC Köln Amat."   // "Werder Bremen Am." ist die Reserve
const istReserve = n => RES_ANZ.test(String(n).trim());
const kern = n => String(n).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/#.*$/, '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/(\s(ii|2|u ?2[123]|amateure|amat?\.?))$/i, '').replace(/\bamat?\.?$/, '').replace(/rot[\s-]*wei(ss|s)/g, 'rotweiss').replace(/schwarz[\s-]*wei(ss|s)/g, 'schwarzweiss').replace(/blau[\s-]*wei(ss|s)/g, 'blauweiss')
    .split(/[^a-z0-9]+/).map(w => ALIAS[w] || w).filter(w => w && !FORM.has(w) && !STOP.has(w) && !/^\d+$/.test(w))
    .map(w => w.length >= 6 ? w.replace(/er$/, '') : w).sort();
const schl = (n, res) => kern(n).join(' ') + (res ? '|R' : '');
const OHNE_FORM = new Set(['1', 'e', 'v', 'i', 'ii', 'u21', 'u23', 'fussball', 'club', 'verein', 'und', 'von', 'turn', 'sportverein']);
const formen = n => new Set(String(n).toLowerCase().split(/[^a-z0-9]+/).filter(w => FORM.has(w) && !OHNE_FORM.has(w)));
const formOk = (a, b) => { const A = formen(a), B = formen(b); return !A.size || !B.size || [...A].some(w => B.has(w)); };
const aehnlich = (a, b) => { const A = kern(a), B = kern(b); if (!A.length || !B.length) return 0; const t = A.filter(w => B.includes(w)).length; return t / (A.length + B.length - t); };

// ---------- Namensauskunft je ID ----------
const nameVon = id => (GD.teams[id] || {}).name || HC[id] || HXV[id] || id;
const resId = id => /\sII$|\sAmateure$/.test(nameVon(id)) || (GD.teams[id] || {}).isReserve;

// ---------- Saisonkontext: wer stand in Saison yy (Startjahr) in einer Tabelle? ----------
const proJahr = {};
const eintrag = (yy, id, name) => {
    const m = proJahr[yy] = proJahr[yy] || new Map();
    const k = schl(name || nameVon(id), resId(id));
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(id);
};
SEED.seasons.forEach(s => { const y = parseInt(s.y); s.table.forEach(r => eintrag(y, r.id)); });
EXT.forEach(t => { const y = parseInt(t.y); t.rows.forEach(r => eintrag(y, r.id)); (t.vr || []).forEach(v => v.rows.forEach(r => eintrag(y, r.id))); });
// Era-Namen (HIST_EXT.namen + HISTORIC_NAMES) – auch in den Saisonkontext, damit "SpVgg Fürth" 1985 auf Greuther Fürth trifft
const eraIdx = {};
[HX.namen || {}, HN].forEach(Q => Object.entries(Q).forEach(([id, eras]) => (eras || []).forEach(e => {
    const von = e.from ? parseInt(e.from) : 1900, bis = e.to ? parseInt(e.to) : 2100;
    (eraIdx[schl(e.name, resId(id))] = eraIdx[schl(e.name, resId(id))] || []).push({ id, von, bis });
    for (let y = von; y <= Math.min(bis, 2025); y++) if (proJahr[y] && [...proJahr[y].values()].some(s => s.has(id))) eintrag(y, id, e.name);
})));
const gdIdx = {}, hcIdx = {};
Object.values(GD.teams).forEach(t => (gdIdx[schl(t.name, resId(t.id))] = gdIdx[schl(t.name, resId(t.id))] || []).push(t.id));
[HC, HXV].forEach(Q => Object.entries(Q).forEach(([id, n]) => { const k = schl(n, resId(id)); if (!(hcIdx[k] || []).includes(id)) (hcIdx[k] = hcIdx[k] || []).push(id); }));

{   // Korrektur-IDs müssen existieren (sonst erfindet ein Tippfehler still einen Verein)
    const falsch = Object.entries(KORREKTUR).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string' && !/^hist_(pk|am)_/.test(v))
        .filter(([, id]) => !GD.teams[id] && !HC[id] && !HXV[id]);
    if (falsch.length) { console.error('FEHLER in tools/wiki_pokal_korrektur.json – diese IDs gibt es nicht:'); falsch.forEach(([k, id]) => console.error('  ' + k + ' -> ' + id)); process.exit(1); }
}

const startJahr = y => /\//.test(y) ? parseInt(y) : parseInt(y) - 1;   // "1956" = Saison 1955/56, Tschammerpokal 1935 = 1934/35
// Ziel einer gepflegten Zuordnung: ID oder (selten) ein Vereinsname
const zielId = t => { if (typeof t !== 'string') return null; if (GD.teams[t] || HC[t] || HXV[t]) return t;
    const g = Object.values(GD.teams).find(x => x.name === t); if (g) return g.id;
    const h = Object.entries(HXV).find(([, n]) => n === t) || Object.entries(HC).find(([, n]) => n === t); return h ? h[0] : null; };
// U: Kurzform innerhalb der Saison ("Borussia M’gladbach", "Bor. Mönchengladbach"): jedes Kernwort (ab 4 Zeichen) steckt in einem
// Kernwort des Kandidaten oder umgekehrt, Vereinsform passt, Reserve gleich – und genau EIN Verein der Saison erfüllt das.
// Beide Richtungen: jedes Wort der Kurzform steckt in einem Wort des Kandidaten UND jedes Kandidatenwort enthält eines der Kurzform
// (einseitig gemessen falsch: "Henger SV" -> Mönchen-HENG-ladbach, "OSC Bremerhaven" -> Bremer SV, "SG Vorhalle" -> Schwäbisch Hall)
const kurzPasst = (a, b) => { const A = kern(a).filter(w => w.length >= 4), B = kern(b); return A.length > 0 && A.every(w => B.some(c => c.includes(w))) && B.every(c => A.some(w => c.includes(w)))
    && A.some(w => !B.includes(w)); };   // mindestens EIN Wort wirklich gekürzt – nur gleicher Ortsname: "OT Bremen" ≠ VfL 07 Bremen
const saisonIds = {};
Object.entries(proJahr).forEach(([y, m]) => { saisonIds[y] = new Set(); m.forEach(s => s.forEach(id => saisonIds[y].add(id))); });
const stat = { K: 0, A: 0, S: 0, L: 0, U: 0, E: 0, P: 0, G: 0, H: 0, V: 0, N: 0 };
// P (nur --amateur): Link|R bzw. Name|R -> ID aus der Pokal-Zuordnung, nur wenn dort genau EINE ID daran hängt
const pokalIdx = {};
if (AM) {
    const P = lies('wiki_pokal_ids.json');
    (P.saisons || []).forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => [[sp.hL, sp.h, sp.hId], [sp.aL, sp.a, sp.aId]].forEach(([l, n, id]) => {
        const r2 = istReserve(n) ? '|R' : '';
        ['L:' + (l || '').replace(/#.*$/, '') + r2, 'N:' + n].forEach(k => { if (k.length > 3) (pokalIdx[k] = pokalIdx[k] || new Set()).add(id); });
    }))));
}
// Reserve muss passen: die Pokal-Zuordnung kann selbst daneben liegen ("Werder Bremen Am." stand dort bei der Ersten)
const ausPokal = (name, link) => { const res = istReserve(name), r = res ? '|R' : '';
    const passt = id => (/^hist_pk_/.test(id) ? /ii$/.test(id) : !!resId(id)) === res;
    for (const k of [...(link ? ['L:' + link.replace(/#.*$/, '') + r] : []), 'N:' + name]) {
        const z = [...(pokalIdx[k] || [])].filter(passt); if (z.length === 1) return z[0]; }
    return null; };
const offen = {}, neuIds = {}, neuNachKern = {};   // Schreibvarianten ohne Link ("Wacker Wien"/"SC Wacker Wien") teilen eine neue ID
const eins = (arr, name) => { const a = [...new Set(arr || [])].filter(id => formOk(name, nameVon(id))); return a.length === 1 ? a[0] : null; };
function idVon(name, link, y) {
    const res = istReserve(name), yy = startJahr(y);
    const lk = link ? link.replace(/#.*$/, '').replace(/\s*\((Fußball|Fußballverein|Verein)[^)]*\)\s*$/, '') : null;
    for (const k of [name + '|' + y, name, 'L:' + (link || '')]) if (typeof KORREKTUR[k] === 'string') { stat.K++; return { id: KORREKTUR[k], stufe: 'K' }; }
    for (const k of [name + '|' + parseInt(y), name, ...(lk && !res ? [lk] : [])]) for (const Q of GEPFLEGT) {
        const id = zielId(Q[k]); if (id) { stat.A++; return { id, stufe: 'A' }; }
    }
    const kn = schl(name, res), kl = lk ? schl(lk, res) : null;
    for (const z of [yy, yy + 1, yy - 1]) {          // Saison im Kontext (Pokal läuft über den Jahreswechsel)
        const m = proJahr[z]; if (!m) continue;
        const a = eins(m.get(kn), name); if (a) { stat.S++; return { id: a, stufe: 'S' }; }
        const b = kl && eins(m.get(kl), lk); if (b) { stat.L++; return { id: b, stufe: 'L' }; }
    }
    for (const z of [yy, yy + 1, yy - 1]) {
        const tr = [...(saisonIds[z] || [])].filter(id => resId(id) === res && formOk(name, nameVon(id)) && kurzPasst(name.replace(/\(I\)/, ''), nameVon(id)));
        if (tr.length === 1) { stat.U++; return { id: tr[0], stufe: 'U' }; }
        if (tr.length > 1) break;
    }
    const era = (eraIdx[kn] || []).filter(e => yy >= e.von - 1 && yy <= e.bis + 1);
    if (new Set(era.map(e => e.id)).size === 1) { stat.E++; return { id: era[0].id, stufe: 'E' }; }
    const pk = AM && ausPokal(name, link);
    if (pk) { stat.P++; return { id: pk, stufe: 'P' }; }
    const g = (kl && eins(gdIdx[kl], lk)) || eins(gdIdx[kn], name);
    if (g) { stat.G++; return { id: g, stufe: 'G' }; }
    const h = (kl && eins(hcIdx[kl], lk)) || eins(hcIdx[kn], name);
    if (h) { stat.H++; return { id: h, stufe: 'H' }; }
    // N: eigene ID über das Linkziel (damit dieselbe Vereinslinie über die Jahre zusammenbleibt), sonst über den Namen
    const kk = schl(lk || name, res);
    const id = neuNachKern[kk] || (neuNachKern[kk] = NEU_PRE + slug(lk || name) + (res && !/ii$/.test(slug(lk || name)) ? 'ii' : ''));
    if (!neuIds[id]) {
        stat.N++;
        neuIds[id] = res && lk ? lk + ' II' : (lk || name);
        const kand = [...Object.values(GD.teams).map(t => ({ n: t.name, id: t.id })), ...Object.entries(HC).map(([i, n]) => ({ n, id: i })), ...Object.entries(HXV).map(([i, n]) => ({ n, id: i }))]
            .map(x => ({ x, a: Math.max(aehnlich(name, x.n), lk ? aehnlich(lk, x.n) : 0) })).filter(x => x.a >= 0.5).sort((p, q) => q.a - p.a).slice(0, 3);
        offen[id] = { name, link, jahr: y, vorschlag: kand.map(c => `${c.x.n} [${c.x.id}] ${c.a.toFixed(2)}`) };
    } else stat.N++;
    return { id, stufe: 'N' };
}

for (const s of DATEN.saisons) s.runden.forEach(r => r.spiele.forEach(sp => {
    const h = idVon(sp.h, sp.hL, s.y), a = idVon(sp.a, sp.aL, s.y);
    sp.hId = h.id; sp.aId = a.id; sp.stufen = h.stufe + a.stufe;
}));
// Amateurmeisterschaft: Gruppentabellen ohne Einzelspiele (1953–55) und die Teilnehmerliste. Die Liste dient nur der Gegenprobe
// (amateur_einbau.mjs): sie verlinkt die Reserve oft auf die Erste ("Werder Bremen" statt "Werder Bremen Amateure").
const extra = [];
if (AM) for (const s of DATEN.saisons) {
    [...s.runden.flatMap(r => r.tabelle || []), ...(s.teilnehmer || [])].forEach(v => {
        const z = idVon(v.name, v.link, s.y); v.id = z.id; v.stufe = z.stufe; extra.push(v);
    });
}
// V (zweiter Durchlauf): Eine NEUE ID, deren Wikipedia-Artikel an anderer Stelle schon sicher einer bestehenden ID zugeordnet
// wurde, ist derselbe Verein (HEBC, Duisburger FV 08, Rot-Weiß Hasborn) – sofern genau EINE bestehende ID am Link hängt.
{
    const linkId = {};
    DATEN.saisons.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => [[sp.hL, sp.h, sp.hId, sp.stufen[0]], [sp.aL, sp.a, sp.aId, sp.stufen[1]]]
        .forEach(([l, n, id, st]) => { if (l && st !== 'N') { const k = l.replace(/#.*$/, '') + (istReserve(n) ? '|R' : ''); (linkId[k] = linkId[k] || new Set()).add(id); } }))));
    DATEN.saisons.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => ['h', 'a'].forEach((x, i) => {
        if (sp.stufen[i] !== 'N') return;
        // mit Link über den Link, ohne Link über den Namen ("Duisburger FV 08" steht mal verlinkt, mal nicht)
        const z = linkId[(sp[x + 'L'] || sp[x]).replace(/#.*$/, '') + (istReserve(sp[x]) ? '|R' : '')];
        if (z && z.size === 1) { sp[x + 'Id'] = [...z][0]; sp.stufen = i ? sp.stufen[0] + 'V' : 'V' + sp.stufen[1]; stat.N--; stat.V++; }
    }))));
    extra.forEach(v => { if (v.stufe !== 'N') return;
        const z = linkId[(v.link || v.name).replace(/#.*$/, '') + (istReserve(v.name) ? '|R' : '')];
        if (z && z.size === 1) { v.id = [...z][0]; v.stufe = 'V'; stat.N--; stat.V++; } });
    // neue IDs, die so ganz aufgegangen sind, aus Bericht und Liste nehmen
    const genutzt = new Set(); DATEN.saisons.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => { genutzt.add(sp.hId); genutzt.add(sp.aId); })));
    extra.forEach(v => genutzt.add(v.id));
    Object.keys(neuIds).forEach(id => { if (!genutzt.has(id)) { delete neuIds[id]; delete offen[id]; } });
}

const summe = Object.values(stat).reduce((a, b) => a + b, 0);
const zeilen = [];
if (!NUR_OFFEN) {
    zeilen.push(`=== ZUORDNUNG (${summe} Nennungen) ===`);
    Object.entries({ K: 'Korrekturdatei', A: 'gepflegte Zuordnung', S: 'Saisonkontext Name', L: 'Saisonkontext Link', U: 'Kurzform in der Saison', E: 'Era-Name', P: 'wie im DFB-Pokal', G: 'game_data', H: 'historischer Verein', V: 'gleicher Artikel', N: `NEU (${NEU_PRE}*)` })
        .forEach(([k, t]) => zeilen.push(`${k} ${t.padEnd(22)}${String(stat[k]).padStart(6)}`));
}
zeilen.push(`\n=== NEU: ${Object.keys(offen).length} Vereine ohne Zuordnung (eigene ID) ===`);
Object.entries(offen).sort((a, b) => String(a[1].jahr).localeCompare(String(b[1].jahr))).forEach(([id, o]) =>
    zeilen.push(`${String(o.jahr).padEnd(9)} ${o.name.padEnd(34)} ${(o.link || '–').padEnd(34)} ${o.vorschlag.length ? '? ' + o.vorschlag.join(' / ') : ''}`));
console.log(zeilen.slice(0, NUR_OFFEN ? 9999 : 12).join('\n'));
fs.mkdirSync(path.join(DIR, '_dryrun'), { recursive: true });
fs.writeFileSync(path.join(DIR, '_dryrun', QUELLE + '_zuordnung.txt'), zeilen.join('\n'));
if (!NUR_OFFEN) {
    fs.writeFileSync(path.join(DIR, QUELLE + '_ids.json'), JSON.stringify({ stand: DATEN.stand, stat, neu: neuIds, saisons: DATEN.saisons }, null, 0));
    console.log(`\n-> tools/${QUELLE}_ids.json, Bericht tools/_dryrun/${QUELLE}_zuordnung.txt`);
}
