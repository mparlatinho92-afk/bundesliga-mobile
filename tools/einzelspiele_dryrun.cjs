// PROBELAUF (kein Einbau): historische Einzelspiele den Abschlusstabellen des Spiels zuordnen.
//
//   node tools/einzelspiele_dryrun.cjs [--ohne-fbde] [--ohne-of]
//   -> tools/einzelspiele_dryrun.json (je Staffel: Quelle, Saison, Liga im Spiel, Zuordnung, Gegenprobe) + Zusammenfassung
//
// Quellen (alle nur gelesen):
//   wiki  Wikipedia-Kreuztabellen 1963/64-2002/03   G:\Meine Ablage\fussball.de\wikipedia\spiele.csv   (Scraper-Projekt des Nutzers)
//   fbde  fussball.de je Verband ab 2001/02         G:\Meine Ablage\fussball.de\<verband>\spiele.csv
//   of    openfootball 1./2./3. Liga ab 2010/11      github.com/openfootball/deutschland (Zwischenspeicher %TEMP%\of_cache)
//
// ZUORDNUNG UEBER DIE ZAHLEN, NICHT UEBER DEN NAMEN. Aus den Spielen einer Staffel wird je Verein die Tabelle nachgerechnet
// (Spiele, Tore, Gegentore). Die Staffel gehoert zu der Spiel-Tabelle derselben Saison, in der die meisten dieser Dreier
// wiederkehren; Vereine mit eindeutigem Dreier sind damit belegt. Erst der Rest geht ueber den Namen, und ein einzelner
// uebriger Verein auf beiden Seiten ueber den Ausschluss. Derselbe Beleg wie bei den Aufstiegsrunden und bei ifosta.
//
// GEGENPROBE: weicht die nachgerechnete Zeile von der Spiel-Tabelle ab, steckt dort eine Wertung am Gruenen Tisch, ein
// Lesefehler oder eine unvollstaendige Kreuztabelle. Die Wikipedia-Daten tragen KEINE Sonderwertung (0 von 181.275) -
// diese Abweichung ist der einzige Hinweis darauf. Ein Rekord aus einer abweichenden Staffel ist verdaechtig.
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const ROOT = path.join(__dirname, '..') + path.sep;
const G = process.env.FBDE_DIR || 'G:\\Meine Ablage\\fussball.de';
const ARG = process.argv.slice(2);

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

// ---------------------------------------------------------------- Spiel-Tabellen je Saison und Staffel
const saisonY = s => {                       // "63/64" | "99/00" | "1999/2000" | "2010-11" -> "1963/64"
    const m = String(s).match(/^(\d{2,4})[\/-](\d{2,4})$/); if (!m) return null;
    let a = +m[1]; if (a < 100) a += a >= 60 ? 1900 : 2000;
    return a === 1999 ? '1999/2000' : a + '/' + String((a + 1) % 100).padStart(2, '0');   // so schreibt das Spiel die Jahrtausendsaison
};
const levelOf = lid => (GAME_DATA.leagues[lid] || {}).level || ({ h2: 2, h2d: 2, h3: 3, h3d: 3, h4: 4, h5: 5 })[lid.split('-')[0]] || (lid === 'ddr1' ? 1 : 99);
const nameOf = id => (GAME_DATA.teams[id] || {}).name || HISTORIC_CLUBS[id] || id;
const namenVon = id => [nameOf(id)].concat(((HISTORIC_NAMES || {})[id] || []).map(e => e.name));

function spielTabellen(x) {
    const T = {};                            // y -> [{key, lid, g, rows}]
    const add = (y, lid, rows) => {
        const grp = {};
        rows.forEach(r => (grp[r.g || ''] = grp[r.g || ''] || []).push(r));
        for (const g in grp) (T[y] = T[y] || []).push({ key: y + '|' + lid + (g ? '|' + g : ''), y, lid, g, rows: grp[g] });
    };
    HISTORY_SEED.seasons.forEach(s => add(s.y, s.lid, s.table));
    Object.values(x.byKey).forEach(r => { if (!HISTORY_SEED.seasons.some(s => s.y === r.y && s.lid === r.lid)) add(r.y, r.lid, r.rows); });
    return T;
}

// ---------------------------------------------------------------- Namensvergleich (nur Ersatz)
const norm = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(fc|sv|tsv|vfb|vfl|tus|sc|fsv|ssv|spvgg|sg|bsg|sc|ev|e v|1|1\.|fk|tsg|sportfreunde|sportverein|verein|von|19\d\d|18\d\d|20\d\d|\d\d)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
const bigr = s => { const b = new Set(); for (let i = 0; i < s.length - 1; i++) b.add(s.slice(i, i + 2)); return b; };
const dice = (a, b) => { const A = bigr(norm(a)), B = bigr(norm(b)); if (!A.size || !B.size) return 0; let n = 0; A.forEach(x => B.has(x) && n++); return 2 * n / (A.size + B.size); };
// Zusatz II/III/Reserve muss auf beiden Seiten gleich sein – sonst ist es ein anderer Verein
const reserve = s => /\b(II|III|IV|2|Am\.?|Amat(eure)?|A)\s*$|\bII\b|\bReserve\b/i.test(String(s).replace(/\(.*?\)/g, '').trim()) ? 1 : 0;

// ---------------------------------------------------------------- eine Staffel zuordnen
function zuordnen(st, kand) {
    const tab = {};                          // Verein -> {sp,s,u,n,gf,ga}
    const z = n => tab[n] || (tab[n] = { sp: 0, s: 0, u: 0, n: 0, gf: 0, ga: 0 });
    st.spiele.forEach(([h, a, th, tg]) => {
        const H = z(h), A = z(a);
        H.sp++; A.sp++; H.gf += th; H.ga += tg; A.gf += tg; A.ga += th;
        if (th > tg) { H.s++; A.n++; } else if (th < tg) { A.s++; H.n++; } else { H.u++; A.u++; }
    });
    const vereine = Object.keys(tab);
    const dreier = r => (r.s + r.u + r.n) + '|' + r.gf + '|' + r.ga;
    let best = null;
    for (const t of kand) {
        const zaehl = {}; t.rows.forEach(r => { const k = dreier(r); zaehl[k] = (zaehl[k] || 0) + 1; });
        const treffer = vereine.filter(v => zaehl[dreier(tab[v])] === 1).length;
        if (!best || treffer > best.treffer) best = { t, treffer };
    }
    if (!best || best.treffer < Math.max(3, Math.ceil(vereine.length * 0.4))) return { tab, vereine, t: null };
    const t = best.t, frei = new Set(t.rows.map(r => r.id)), zu = {}, wie = {};
    const proDreier = {}; t.rows.forEach(r => (proDreier[dreier(r)] = proDreier[dreier(r)] || []).push(r));
    vereine.forEach(v => { const c = proDreier[dreier(tab[v])]; if (c && c.length === 1 && frei.has(c[0].id)) { zu[v] = c[0].id; wie[v] = 'zahl'; frei.delete(c[0].id); } });
    // Rest ueber den Namen: bestes Paar zuerst, Mindestaehnlichkeit 0,5, Reservezusatz muss passen
    const paare = [];
    vereine.filter(v => !zu[v]).forEach(v => frei.forEach(id => {
        const sc = Math.max(...namenVon(id).map(n => reserve(n) === reserve(v) ? dice(v, n) : 0));
        paare.push([sc, v, id]);
    }));
    paare.sort((a, b) => b[0] - a[0]);
    paare.forEach(([sc, v, id]) => { if (sc >= 0.5 && !zu[v] && frei.has(id)) { zu[v] = id; wie[v] = 'name'; frei.delete(id); } });
    const offen = vereine.filter(v => !zu[v]);
    if (offen.length === 1 && frei.size === 1) { zu[offen[0]] = [...frei][0]; wie[offen[0]] = 'rest'; frei.clear(); }
    // Gegenprobe gegen die Spiel-Zeile (S/U/N nur, wo nicht geschaetzt)
    const byId = {}; t.rows.forEach(r => { byId[r.id] = r; });
    const abw = vereine.filter(v => zu[v]).filter(v => {
        const r = byId[zu[v]], q = tab[v];
        return q.gf !== r.gf || q.ga !== r.ga || q.sp !== r.s + r.u + r.n || (!r.e && (q.s !== r.s || q.u !== r.u));
    });
    // Tore/Spiele daneben = für Spielrekorde verdächtig; nur S/U/N daneben = Torbilanz stimmt, Rekorde unberührt
    const abwTore = abw.filter(v => { const r = byId[zu[v]], q = tab[v]; return q.gf !== r.gf || q.ga !== r.ga || q.sp !== r.s + r.u + r.n; });
    return { tab, vereine, t, zu, wie, abw, abwTore, offenSpiel: [...frei] };
}

// ---------------------------------------------------------------- Quellen lesen
async function leseCsv(datei, onRow) {
    const rl = readline.createInterface({ input: fs.createReadStream(datei, { encoding: 'utf8' }), crlfDelay: Infinity });
    let kopf = null;
    for await (const line of rl) {
        const f = line.replace(/^\uFEFF/, '').split(';');
        if (!kopf) { kopf = f; continue; }
        const o = {}; kopf.forEach((k, i) => { o[k] = f[i]; });
        onRow(o);
    }
}
function staffelSammler(quelle) {
    const S = {};
    return {
        S,
        add(id, y, titel, h, a, th, tg, sonder) {
            const st = S[id] || (S[id] = { quelle, id, y, titel, spiele: [], sonder: 0 });
            if (sonder) st.sonder++;
            if (Number.isFinite(th) && Number.isFinite(tg)) st.spiele.push([h, a, th, tg]);
        }
    };
}
async function leseWiki() {
    const c = staffelSammler('wiki');
    // Lieferung vom 10.10.2026 enthielt jedes Spiel doppelt (612 statt 306 Zeilen je Bundesliga-Saison): je spiel_id nur einmal
    const gesehen = new Set();
    await leseCsv(path.join(G, 'wikipedia', 'spiele.csv'), o =>
        (o.spiel_id && gesehen.has(o.spiel_id)) ? null : (o.spiel_id && gesehen.add(o.spiel_id), c.add(o.staffel_id, saisonY(o.saison), o.staffel, o.heim, o.gast, parseInt(o.tore_heim), parseInt(o.tore_gast), o.sonderwertung)));
    return c.S;
}
async function leseFbde() {
    const c = staffelSammler('fbde');
    for (const v of fs.readdirSync(G)) {
        const p = path.join(G, v, 'spiele.csv');
        if (v === 'wikipedia' || !fs.existsSync(p)) continue;
        const gesehen = new Set();
        await leseCsv(p, o => {
            if (o.spiel_id) { if (gesehen.has(o.spiel_id)) return; gesehen.add(o.spiel_id); }   // doppelt gelieferte Zeilen
            if ((o.phase || 'Hauptrunde') !== 'Hauptrunde') return;          // Relegation/Auf-/Abstiegsrunden sind keine Ligasaison
            const y = saisonY(o.saison); if (!y || y > '2024/25') return;     // ab dem Sim-Start spielt das Spiel selbst
            c.add('fbde:' + o.staffel_id, y, v + ' · ' + o.spielklasse + ' · ' + o.staffel, o.heim, o.gast, parseInt(o.tore_heim), parseInt(o.tore_gast), o.sonderwertung);
        });
        process.stderr.write(`fbde ${v}      \r`);
    }
    return c.S;
}
async function leseOf() {
    const c = staffelSammler('of');
    const cache = path.join(os.tmpdir(), 'of_cache'); fs.mkdirSync(cache, { recursive: true });
    const holen = async (url, datei) => {
        const p = path.join(cache, datei.replace(/[\/\\]/g, '_'));
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
        const r = await fetch(url); if (!r.ok) return null;
        const t = await r.text(); fs.writeFileSync(p, t); await new Promise(z => setTimeout(z, 50)); return t;
    };
    const baum = JSON.parse(await holen('https://api.github.com/repos/openfootball/deutschland/git/trees/master?recursive=1', 'tree.json'));
    for (const f of baum.tree.filter(x => /^\d{4}-\d{2}\/(1-bundesliga|2-bundesliga2|3-liga3)\.txt$/.test(x.path))) {
        const y = saisonY(f.path.slice(0, 7)); if (!y || y > '2024/25') continue;
        const txt = await holen('https://raw.githubusercontent.com/openfootball/deutschland/master/' + f.path, f.path);
        if (!txt) continue;
        txt.split('\n').forEach(line => {
            // zwei Schreibweisen: "Heim v Gast 1-0 (0-0)" (bis 2019/20) und "Heim  1-0 (0-0)  Gast" (ab 2020/21)
            const m = line.match(/^\s+(?:\d{1,2}:\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d{1,2})-(\d{1,2})/);
            const n = !m && line.match(/^\s+(?:\d{1,2}:\d{2}\s+)?(.+?)\s{2,}(\d{1,2})-(\d{1,2})(?:\s*\([^)]*\))?\s{2,}(.+?)\s*$/);
            if (m) c.add('of:' + f.path, y, f.path, m[1].trim(), m[2].trim(), +m[3], +m[4], '');
            else if (n) c.add('of:' + f.path, y, f.path, n[1].trim(), n[4].trim(), +n[2], +n[3], '');
        });
    }
    return c.S;
}

// ---------------------------------------------------------------- Zuordnung aller Staffeln (auch fuer tools/einzelspiele_einbau.cjs)
// onStaffel(q, st, r) je Staffel; danach onQuelle(q, S). Staffeln ohne Spiel-Tabelle verlieren ihre Spiele gleich wieder –
// fussball.de hat 2,4 Mio. davon, die sonst bis zum Ende im Speicher lagen.
async function zuordnungen(opt, onStaffel, onQuelle) {
    const x = await HistExt.load();
    const T = spielTabellen(x);
    const quellen = [['wiki', leseWiki]];
    if (!opt.ohneOf) quellen.push(['of', leseOf]);
    if (!opt.ohneFbde) quellen.push(['fbde', leseFbde]);
    for (const [q, lese] of quellen) {
        const S = await lese();
        for (const st of Object.values(S)) {
            if (!st.y || st.spiele.length < 6) continue;
            const r = zuordnen(st, T[st.y] || []);
            onStaffel(q, st, r);
            if (!r.t) st.spiele = null;
        }
        if (onQuelle) onQuelle(q, S);
    }
}
module.exports = { zuordnungen, levelOf, nameOf, saisonY };

// ---------------------------------------------------------------- Lauf (nur direkt aufgerufen)
if (require.main === module) (async () => {
    const aus = [], sum = {};
    await zuordnungen({ ohneOf: ARG.includes('--ohne-of'), ohneFbde: ARG.includes('--ohne-fbde') }, (q, st, r) => {
        const n = r.vereine.length, soll = n * (n - 1);
        const lv = r.t ? levelOf(r.t.lid) : '-';
        const k = q + '|' + (r.t ? 'E' + lv : 'ohne Spiel-Tabelle');
        const s = sum[k] || (sum[k] = { staffeln: 0, spiele: 0, vollst: 0, vereine: 0, zahl: 0, name: 0, rest: 0, offen: 0, abwStaffeln: 0, abwVereine: 0, toreStaffeln: 0, sonder: 0, ligen: new Set() });
        s.staffeln++; s.spiele += st.spiele.length; s.sonder += st.sonder;
        if (st.spiele.length === soll) s.vollst++;
        if (r.t) {
            s.ligen.add(r.t.lid); s.vereine += n;
            Object.values(r.wie).forEach(w => s[w]++);
            s.offen += n - Object.keys(r.zu).length;
            if (r.abw.length) { s.abwStaffeln++; s.abwVereine += r.abw.length; }
            if (r.abwTore.length) s.toreStaffeln++;
        }
        aus.push({
            quelle: q, id: st.id, y: st.y, titel: st.titel, spiele: st.spiele.length, soll, sonder: st.sonder,
            tabelle: r.t ? r.t.key : null, vereine: n,
            zu: r.t ? Object.fromEntries(Object.entries(r.zu).map(([v, id]) => [v, [id, r.wie[v]]])) : null,
            offen: r.t ? r.vereine.filter(v => !r.zu[v]) : null,
            abw: r.t ? r.abw.map(v => ({ v, id: r.zu[v], tore: r.abwTore.includes(v), quelle: r.tab[v], spiel: r.t.rows.find(z => z.id === r.zu[v]) })) : null
        });
    }, (q, S) => process.stderr.write(`${q}: ${Object.keys(S).length} Staffeln gelesen          \n`));
    fs.writeFileSync(ROOT + 'tools/einzelspiele_dryrun.json', JSON.stringify(aus));
    console.log('\nQuelle|Ebene im Spiel        Staffeln  vollst.   Spiele | Vereine  Zahl  Name  Rest offen | Gegenprobe abw.: Staffeln/Vereine, davon Tore | Ligen');
    Object.keys(sum).sort().forEach(k => {
        const s = sum[k];
        console.log(`${k.padEnd(28)} ${String(s.staffeln).padStart(6)} ${String(s.vollst).padStart(8)} ${String(s.spiele).padStart(8)} | ${String(s.vereine).padStart(7)} ${String(s.zahl).padStart(5)} ${String(s.name).padStart(5)} ${String(s.rest).padStart(4)} ${String(s.offen).padStart(5)} | ${String(s.abwStaffeln).padStart(6)} / ${String(s.abwVereine).padStart(5)}, ${String(s.toreStaffeln).padStart(4)} | ${s.ligen.size}`);
    });
})();
