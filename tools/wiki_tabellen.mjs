// Abschlusstabellen aus Wikipedia (nur lesend) im CSV-Format der f-archiv-Datei – schliesst deren Luecken.
//
//   node tools/wiki_tabellen.mjs          # schreibt tools/wiki_ergaenzung.csv (per *.csv von Git ausgeschlossen)
//   node tools/farchiv_ebenen.mjs ~/Downloads/farchiv_output/alle_tabellen_final.csv tools/wiki_ergaenzung.csv
//
// Liest zwei Tabellenformen: die Vorlage {{Fußballtabelle/Zeile}} und handgebaute Wikitabellen (Pl./Verein/Sp./Tore/Punkte).
// GEGENPROBE: Saisons, die f-archiv schon hat (KONTROLLE), werden gelesen und Zeile fuer Zeile verglichen, aber NICHT
// in die CSV geschrieben – die Vereinsnamen weichen je Quelle ab, die Dublettenerkennung wuerde sie doppelt zaehlen.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FARCHIV = path.join(os.homedir(), 'Downloads/farchiv_output/alle_tabellen_final.csv');
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
// league = Name wie in f-archiv, damit die Regeln in farchiv_ebenen.mjs greifen
const LUECKEN = [
    { titel: '1. Amateurliga Schwarzwald-Bodensee 1977/78', league: 'Amateurliga Schwarzwald-Bodensee', y: 1977 },
    ...[2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map(y => ({ titel: '3. Fußball-Liga ' + saison(y), league: '3. Liga', y })),
    // 2016/17 steht auch in der f-archiv-Datei, dort aber aus Wikipedia MIT angeklebten Fussnoten ("VfR Aalen1",
    // "SC Paderborn 072"). Die saubere Fassung ersetzt sie: farchiv_ebenen.mjs laesst bei gleicher Tabelle die spaetere Datei gewinnen.
    { titel: '3. Fußball-Liga 2016/17', league: '3. Liga', y: 2016 },
];
const KONTROLLE = [2013].map(y => ({ titel: '3. Fußball-Liga ' + saison(y), league: '3. Liga', y }));

const UA = 'BundesligaSim-Recherche/1.0 (lokales Analyse-Skript; Tabellen-Ergaenzung)';
const CACHE = path.join(os.tmpdir(), 'wiki_tabellen_cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wikitext(titel) {
    const url = 'https://de.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2', redirects: '1', titles: titel });
    const datei = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    let j;
    if (fs.existsSync(datei)) j = JSON.parse(fs.readFileSync(datei, 'utf8'));
    else {
        for (let i = 0; i < 6 && !j; i++) {
            const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch(e => ({ ok: false, status: e.message }));
            if (r.ok) { j = await r.json(); fs.writeFileSync(datei, JSON.stringify(j)); await sleep(500); }
            else { console.log(`  [${r.status}] warte ${5 * 2 ** i} s`); await sleep(5000 * 2 ** i); }
        }
    }
    const p = j?.query?.pages?.[0];
    return p && p.revisions ? p.revisions[0].slots.main.content : null;
}

// ---------- Wikitext zerlegen ----------
// An | trennen, aber nicht innerhalb von [[...]] oder {{...}}
function splitTop(s, sep = '|') {
    const out = []; let depth = 0, cur = '';
    for (let i = 0; i < s.length; i++) {
        const two = s.slice(i, i + 2);
        if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
        if ((two === '}}' || two === ']]') && depth > 0) { depth--; cur += two; i++; continue; }
        if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
        cur += s[i];
    }
    out.push(cur);
    return out;
}
const text = s => (s || '')
    .replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    // Bildeinbindungen (Punktabzug-Symbol) VOR den Links entfernen – sonst blieb "x22px|Chemnitzer FC Chemnitzer FC" stehen
    .replace(/\[\[(?:Datei|File|Bild|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{0\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '').replace(/'''?/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function abschlusstabelle(wt) {
    const lines = wt.split('\n');
    let start = lines.findIndex(l => /^=+.*Abschlusstabelle.*=+\s*$/.test(l));
    if (start < 0) start = lines.findIndex(l => /^=+\s*Tabelle\s*=+\s*$/.test(l));
    if (start < 0) return { fehler: 'keine Abschnittsueberschrift Abschlusstabelle' };
    for (let i = start + 1; i < lines.length; i++) {
        const l = lines[i];
        if (/^=+[^=]/.test(l) && i > start + 1) return { fehler: 'Abschnitt ohne Tabelle' };
        if (/^\{\{\s*Fußballtabelle\/Kopf/.test(l)) return vorlage(lines, i + 1);
        if (/^\{\|/.test(l) && /wikitable/.test(l)) return wikitabelle(lines, i);
    }
    return { fehler: 'Tabelle nicht gefunden' };
}
const felderGesehen = new Set();
function vorlage(lines, i) {
    const zeilen = [];
    for (; i < lines.length; i++) {
        const l = lines[i].trim();
        if (/^\{\{\s*Fußballtabelle\/Ende/.test(l) || /^=+[^=]/.test(l)) break;
        if (!/^\{\{\s*Fußballtabelle\/Zeile/.test(l)) continue;
        // Vorlage bis zu IHRER schliessenden Klammer lesen: dahinter folgen auf derselben Zeile oft weitere Spalten
        // ("}} || ({{gestiegen}}) / P"), die sonst am Vereinsnamen haengen blieben ("Würzburger Kickers (N)}}").
        let tiefe = 0, ende = -1;
        for (let k = 0; k < l.length - 1; k++) {
            const two = l.slice(k, k + 2);
            if (two === '{{') { tiefe++; k++; } else if (two === '}}') { tiefe--; k++; if (tiefe === 0) { ende = k - 1; break; } }
        }
        const vorlageText = ende > 0 ? l.slice(0, ende) : l;
        const inner = vorlageText.replace(/^\{\{\s*Fußballtabelle\/Zeile\s*\|?/, '');
        const p = {};
        splitTop(inner).forEach(kv => { const m = kv.match(/^\s*([^=]+?)\s*=\s*([\s\S]*)$/); if (m) { p[m[1]] = m[2].trim(); felderGesehen.add(m[1]); } });
        const S = +p.S, U = +p.U, N = +p.N, sp = S + U + N;
        const sieg = +(p.Siegpunkte || 3), abzug = +(p.Abzug || p.Punktabzug || p.PA || 0);
        const pkt = p.Punkte != null && p.Punkte !== '' ? +p.Punkte : sieg * S + U - abzug;
        zeilen.push({ platz: +p.Rang, verein: text(p.Verein), spiele: sp, siege: S, unent: U, nieder: N, tore: `${+p.ET}:${+p.GT}`,
            punkte: sieg === 2 ? `${pkt}:${2 * sp - pkt}` : String(pkt), abzug });
    }
    return { zeilen, form: 'Vorlage' };
}
function wikitabelle(lines, i) {
    const body = [];
    for (i++; i < lines.length && !/^\|\}/.test(lines[i]); i++) body.push(lines[i]);
    const rows = body.join('\n').split(/\n\|-[^\n]*/).map(r => r.trim()).filter(Boolean);
    const kopf = rows.find(r => r.startsWith('!'));
    const spalten = kopf ? kopf.split('\n').flatMap(l => splitTop(l.replace(/^!/, ''), '!!')).map(c => text(splitTop(c).pop()).toLowerCase()) : [];
    const idx = re => spalten.findIndex(c => re.test(c));
    const iPl = idx(/^pl/), iV = idx(/verein|mannschaft/), iSp = idx(/^sp/), iS = idx(/^(s|g)\.?$/), iU = idx(/^u\.?$/), iN = idx(/^(n|v)\.?$/), iT = idx(/tore/), iP = idx(/punkte|pkt/);
    const zeilen = [];
    for (const r of rows) {
        if (r.startsWith('!')) continue;
        const cells = r.split('\n').filter(l => l.startsWith('|')).flatMap(l => splitTop(l.slice(1), '||')).map(c => text(splitTop(c).pop()));
        const platz = parseInt(cells[iPl], 10);
        if (!Number.isFinite(platz)) continue;
        zeilen.push({ platz, verein: cells[iV], spiele: +cells[iSp] || '', siege: iS >= 0 ? +cells[iS] : '', unent: iU >= 0 ? +cells[iU] : '', nieder: iN >= 0 ? +cells[iN] : '',
            tore: (cells[iT] || '').replace(/\s/g, ''), punkte: (cells[iP] || '').replace(/\s/g, '') });
    }
    return { zeilen, form: 'Wikitabelle', spalten };
}

// ---------- Lesen ----------
const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = ['url,title,season,league,platz,verein,spiele,siege,unent,nieder,tore,punkte,notes'];
const gelesen = {};
for (const a of [...LUECKEN, ...KONTROLLE]) {
    const wt = await wikitext(a.titel);
    if (!wt) { console.log(`FEHLT  ${a.titel}`); continue; }
    const t = abschlusstabelle(wt);
    const info = (wt.match(/\|\s*Mannschaften\s*=\s*(\d+)/) || [])[1];
    if (t.fehler) { console.log(`FEHLER ${a.titel}: ${t.fehler}`); continue; }
    const abz = t.zeilen.filter(z => z.abzug).map(z => `${z.verein} -${z.abzug}`);
    const platzLuecke = t.zeilen.map(z => z.platz).some((p, i, arr) => i && p !== arr[i - 1] + 1 && p !== arr[i - 1]);
    console.log(`${KONTROLLE.includes(a) ? 'KONTR.' : 'OK    '} ${a.titel}: ${t.zeilen.length} Zeilen (${t.form})${info && +info !== t.zeilen.length ? ' | Infobox ' + info + ' !' : ''}${abz.length ? ' | Punktabzug: ' + abz.join(', ') : ''}${platzLuecke ? ' | Platzfolge luecken- oder fehlerhaft' : ''}${t.spalten ? ' | Spalten: ' + t.spalten.join('/') : ''}`);
    gelesen[a.titel] = t.zeilen;
    if (KONTROLLE.includes(a)) continue;
    const url = 'https://de.wikipedia.org/wiki/' + encodeURIComponent(a.titel.replace(/ /g, '_'));
    const title = `${a.league} ${saison(a.y)}`;
    t.zeilen.forEach(z => csv.push([url, title, saison(a.y), a.league, z.platz, z.verein, z.spiele, z.siege, z.unent, z.nieder, z.tore, z.punkte, 'Wikipedia: ' + a.titel].map(q).join(',')));
}
console.log('Vorlagenfelder gesehen:', [...felderGesehen].sort().join(', '));

// ---------- GEGENPROBE gegen f-archiv ----------
if (fs.existsSync(FARCHIV)) {
    const raw = fs.readFileSync(FARCHIV, 'utf8').split(/\r?\n/);
    // Jede gelesene Saison, die f-archiv auch hat, wird verglichen – Kontrollsaisons wie ueberschneidende Ersatzsaisons
    for (const a of [...KONTROLLE, ...LUECKEN.filter(x => x.league === '3. Liga')]) {
        const w = gelesen[a.titel]; if (!w) continue;
        if (!raw.some(l => l.includes(',3. Liga,') && l.includes(',' + saison(a.y) + ','))) continue;
        const fa = raw.filter(l => l.includes(',3. Liga,') && l.includes(',' + saison(a.y) + ',')).map(l => {
            const c = splitTop(l, ','); // Vereinsnamen ohne Kommas; reicht fuer den Vergleich
            return { platz: +c[4], verein: c[5], spiele: +c[6], tore: c[10], punkte: c[11] };
        });
        let gleich = 0; const diff = [];
        w.forEach(z => {
            const f = fa.find(x => x.platz === z.platz);
            if (f && f.spiele === z.spiele && f.tore === z.tore && String(+f.punkte) === String(+z.punkte)) gleich++;
            else diff.push(`Pl.${z.platz} Wiki ${z.verein} ${z.spiele}/${z.tore}/${z.punkte} | f-archiv ${f ? f.verein + ' ' + f.spiele + '/' + f.tore + '/' + f.punkte : '-'}`);
        });
        console.log(`GEGENPROBE ${a.titel}: ${gleich} von ${w.length} Zeilen gleich (Platz, Spiele, Tore, Punkte), f-archiv ${fa.length} Zeilen${diff.length ? '\n  ' + diff.join('\n  ') : ''}`);
    }
} else console.log('GEGENPROBE uebersprungen: f-archiv-Datei nicht gefunden');

fs.writeFileSync(path.join(DIR, 'wiki_ergaenzung.csv'), csv.join('\n') + '\n');
console.log(`-> tools/wiki_ergaenzung.csv (${csv.length - 1} Zeilen)`);
