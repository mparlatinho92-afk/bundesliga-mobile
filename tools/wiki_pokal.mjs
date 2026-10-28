// DFB-Pokal / Tschammerpokal 1935–heute: alle Spiele der Hauptrunden aus de.wikipedia (je Saison ein Artikel)
//   node tools/wiki_pokal.mjs            -> tools/wiki_pokal.json + Zusammenfassung
//   node tools/wiki_pokal.mjs --neu      Zwischenspeicher ignorieren und neu abrufen
//
// Quelle: Rohtext der Saisonartikel ("DFB-Pokal 1985/86", "Tschammerpokal 1935"), Vorlage {{OneLegResult|…}}:
//   1 = Heim, 4 = Gast, 3 = Ergebnis, 6 = Datum (benannt ODER positional – 1953/54 schreibt den Heimverein ohne "1=").
// Der Link zeigt auf den HEUTIGEN Vereinsartikel, angezeigt wird der damalige Name: [[SC Paderborn 07|TuS Paderborn-Neuhaus]].
// Beides wird gespeichert – die Zuordnung (tools/wiki_pokal_zuordnung.mjs) nutzt den Link als zweiten Beleg.
// Sieger = fett gesetzter Verein ('''…'''), sonst aus den Toren. Wiederholungsspiele sind eigene Spiele derselben Runde.
// Weitere Formate: {{TwoLegResult| A || Summe | B || Hin | Rück}} (1971–73, beide Ergebnisse aus Sicht von A) und das Finale
// als {{Fußballspiel national|HEIM NAME=…|GAST NAME=…|ERGEBNIS=…|GEWINNER=…}}. 1956–1963 heißen die Artikel nach dem
// Kalenderjahr ("DFB-Pokal 1956"), wie die Schlüssel in tools/pokal_seed.json.
// Zwischenspeicher %TEMP%/pokal_wiki_cache (Windows leert %TEMP% gelegentlich still – dann wird neu abgerufen).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
// --amateur: Deutsche Amateurmeisterschaft 1951–1998 (gleiche Vorlagen, je Jahr ein Artikel) -> tools/wiki_amateur.json, s. docs/AMATEURMEISTERSCHAFT.md
const AM = process.argv.includes('--amateur');
const CACHE = path.join(process.env.TEMP || os.tmpdir(), AM ? 'ama_wiki_cache' : 'pokal_wiki_cache');
const NEU = process.argv.includes('--neu');
const UA = 'BundesligaSim-Research/1.0 (private hobby project)';
fs.mkdirSync(CACHE, { recursive: true });

const saisons = [];
if (AM) for (let y = 1951; y <= 1998; y++) saisons.push({ y: String(y), titel: 'Deutsche Fußball-Amateurmeisterschaft ' + y });
else for (let y = 1935; y <= 1943; y++) saisons.push({ y: String(y), titel: 'Tschammerpokal ' + y });
if (!AM) for (let y = 1952; y <= 2026; y++) {
    if (y >= 1955 && y <= 1962) { saisons.push({ y: String(y + 1), titel: 'DFB-Pokal ' + (y + 1) }); continue; }
    const s = y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
    saisons.push({ y: s, titel: 'DFB-Pokal ' + s });
}

const warte = ms => new Promise(r => setTimeout(r, ms));
async function holen(titel) {
    const f = path.join(CACHE, titel.replace(/[\/ ]/g, '_') + '.txt');
    if (!NEU && fs.existsSync(f) && fs.statSync(f).size > 500) return fs.readFileSync(f, 'utf8');
    const url = 'https://de.wikipedia.org/w/index.php?title=' + encodeURIComponent(titel.replace(/ /g, '_')) + '&action=raw';
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`${titel}: HTTP ${r.status}`);
    const t = await r.text();
    fs.writeFileSync(f, t);
    await warte(1000);
    return t;
}

// ---------- Wikitext-Hilfen ----------
// Vorlage ab Position i (zeigt auf "{{") bis zur passenden "}}" → Ende-Index
function vorlageEnde(t, i) {
    let d = 0;
    for (let k = i; k < t.length - 1; k++) {
        if (t[k] === '{' && t[k + 1] === '{') { d++; k++; continue; }
        if (t[k] === '}' && t[k + 1] === '}') { d--; k++; if (!d) return k + 1; }
    }
    return t.length;
}
// Parameter auf oberster Ebene trennen (| in [[…]] und {{…}} zählt nicht)
function parameter(inhalt) {
    const teile = []; let d = 0, l = 0, cur = '';
    for (let k = 0; k < inhalt.length; k++) {
        const c = inhalt[k], n = inhalt[k + 1];
        if (c === '{' && n === '{') { d++; cur += '{{'; k++; continue; }
        if (c === '}' && n === '}') { d--; cur += '}}'; k++; continue; }
        if (c === '[' && n === '[') { l++; cur += '[['; k++; continue; }
        if (c === ']' && n === ']') { l--; cur += ']]'; k++; continue; }
        if (c === '|' && !d && !l) { teile.push(cur); cur = ''; continue; }
        cur += c;
    }
    teile.push(cur);
    const p = {}; let pos = 0;
    teile.slice(1).forEach(x => {
        const m = x.match(/^\s*([0-9A-Za-zäöü_ ]+?)\s*=([\s\S]*)$/);
        if (m && !/\[\[/.test(m[1])) p[m[1].trim()] = m[2].trim();
        else { pos++; while (p[String(pos)] !== undefined) pos++; p[String(pos)] = x.trim(); }
    });
    return p;
}
const ohneRef = s => String(s || '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{FN[^}]*\}\}/g, '').replace(/<sup>[\s\S]*?<\/sup>/g, '').replace(/\{\{0\|[^}]*\}\}/g, '').replace(/&nbsp;/g, ' ');
// Vereinsfeld → {name, link, fett}
function verein(feld) {
    const s = ohneRef(feld);
    const fett = /'''/.test(s);
    const m = s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    let link = null, name;
    if (m) { link = m[1].trim(); name = (m[2] || m[1]).trim(); }
    else name = s.replace(/'''?/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]+>/g, '').trim();
    name = name.replace(/'''?/g, '').replace(/\s+/g, ' ').trim();
    return { name, link, fett };
}
// Ergebnisfeld → {h, a, nv, ie:[h,a]|null, sonder}
function ergebnis(feld) {
    const s = ohneRef(feld).replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\{\{nowrap\|/gi, '').replace(/\}\}/g, ' ')
        .replace(/<br\s*\/?>/gi, ' ').replace(/'''?/g, '');
    const z = [...s.matchAll(/(\d+)\s*:\s*(\d+)/g)].map(m => [+m[1], +m[2]]);
    const nv = /n\.\s*V\./i.test(s), ie = /i\.\s*E\./i.test(s);
    const r = { roh: s.trim().replace(/\s+/g, ' ') };
    if (!z.length) { r.sonder = r.roh || 'ohne Ergebnis'; return r; }
    // "1:1 n. V., 4:3 i. E." → erstes Paar = Spiel, letztes = Elfmeterschießen; steht nur EIN Paar mit i. E. da, ist es das Elfmeterergebnis
    if (ie && z.length >= 2) { [r.h, r.a] = z[0]; r.ie = z[z.length - 1]; }
    else if (ie) { r.ie = z[0]; r.ieOhneTore = true; }
    else [r.h, r.a] = z[0];
    if (nv || ie) r.nv = true;
    if (/kampflos|Wertung|gewertet|annull|abgebrochen|Los\b|Losentscheid|nicht angetreten|zurückgezogen/i.test(s)) r.sonder = r.roh;
    return r;
}

// ---------- je Saison ----------
const aus = [], probleme = [];
for (const s of saisons) {
    let t;
    try { t = await holen(s.titel); } catch (e) { probleme.push(e.message); continue; }
    // Eingebundene Seiten auflösen: Endspiele 1935–43 und 1973 stehen als {{:DFB-Pokal-Finale 1973}} im Artikel
    for (const em of [...t.matchAll(/\{\{:([^}|]+)\}\}/g)]) {
        try { t = t.replace(em[0], (await holen(em[1].trim())).replace(/^=+.*=+\s*$/gm, '')); } catch (e) { probleme.push('Einbindung ' + em[1] + ': ' + e.message); }
    }
    const runden = [];
    let runde = null, ober = null;
    // Überschriften und Vorlagen in Textreihenfolge
    const re = /^(={2,4})\s*(.+?)\s*\1\s*$|\{\{\s*(OneLegResult|TwoLegResult|Fußballspiel|Fußball Gruppenspiel|Fußballtabelle\/Zeile)/gm;
    let m;
    while ((m = re.exec(t))) {
        if (m[1]) {
            const ebene = m[1].length, txt = m[2].replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1').replace(/\[\[|\]\]/g, '');
            if (ebene === 2) { ober = txt; runde = null; }
            else runde = { name: ober ? `${ober} · ${txt}` : txt };
            if (ebene === 2) runde = { name: txt };
            continue;
        }
        const ende = vorlageEnde(t, m.index), p = parameter(t.slice(m.index + 2, ende - 2));
        re.lastIndex = ende;
        const rn = runde ? runde.name : '(ohne Überschrift)';
        const ablegen = sp => { let r = runden.find(x => x.name === rn); if (!r) { r = { name: rn, spiele: [] }; runden.push(r); } r.spiele.push(sp); };
        if (m[3] === 'Fußballtabelle/Zeile') {
            // Gruppentabelle (Amateurmeisterschaft 1953–55: Vorrunde nur als Tabelle, ohne Einzelspiele; Endrunde 1998) – Verein, Rang, Bilanz
            if (!AM) continue;
            const v = verein(p['Verein'] || '');
            if (!v.name) continue;
            let r = runden.find(x => x.name === rn); if (!r) { r = { name: rn, spiele: [] }; runden.push(r); }
            const z = k => +(p[k] || 0) || 0;
            (r.tabelle = r.tabelle || []).push({ name: v.name, link: v.link, rang: +p['Rang'] || null, s: z('S'), u: z('U'), n: z('N'), et: z('ET'), gt: z('GT') });
            continue;
        }
        if (m[3] === 'TwoLegResult') {
            // positional ohne Leerfelder: A, Summe, B, Hin, Rück – Ergebnisse aus Sicht von A
            const w = Object.keys(p).filter(k => /^\d+$/.test(k)).sort((x, y) => x - y).map(k => p[k]).filter(x => x.trim() !== '');
            const A = verein(w[0]), B = verein(w[2]), hin = ergebnis(w[3] || ''), rue = ergebnis(w[4] || '');
            const tie = A.fett && !B.fett ? 'A' : B.fett && !A.fett ? 'B' : null;
            const s1 = { h: A.name, hL: A.link, a: B.name, aL: B.link, hg: hin.h, ag: hin.a, hin: 1 };
            if (hin.sonder) s1.sonder = hin.sonder;
            s1.sieger = hin.h != null && hin.h !== hin.a ? (hin.h > hin.a ? 'h' : 'a') : null;
            const s2 = { h: B.name, hL: B.link, a: A.name, aL: A.link, hg: rue.a, ag: rue.h, rueck: 1 };
            if (rue.nv) s2.nv = 1;
            const ieS = ergebnis(w[1] || '').ie || rue.ie;          // Elfmeter steht mal bei der Summe, mal beim Rückspiel
            if (ieS) { s2.ie = [ieS[1], ieS[0]]; s2.nv = 1; }
            if (rue.sonder) s2.sonder = rue.sonder;
            s2.sieger = tie === 'A' ? 'a' : tie === 'B' ? 'h' : null;   // Rückspiel trägt den Weiterkommenden
            ablegen(s1); ablegen(s2);
            continue;
        }
        if (m[3] === 'Fußballspiel' || m[3] === 'Fußball Gruppenspiel') {
            const H = verein(p['HEIM NAME'] || ''), G = verein(p['GAST NAME'] || ''), e = ergebnis(p['ERGEBNIS'] || '');
            if (!H.name || !G.name) continue;
            const gew = verein(p['GEWINNER'] || '').name;
            const sp = { h: H.name, hL: H.link, a: G.name, aL: G.link, hg: e.h, ag: e.a, datum: ohneRef(p['DATUM'] || '').trim() };
            if (e.nv) sp.nv = 1;
            if (e.ie) sp.ie = e.ie;
            if (e.sonder) sp.sonder = e.sonder;
            sp.sieger = gew && gew === H.name ? 'h' : gew && gew === G.name ? 'a' : e.ie ? (e.ie[0] > e.ie[1] ? 'h' : 'a') : (e.h != null && e.h !== e.a ? (e.h > e.a ? 'h' : 'a') : null);
            ablegen(sp);
            continue;
        }
        const h = verein(p['1'] || ''), a = verein(p['4'] || p['2'] || ''), e = ergebnis(p['3'] || '');
        const sp = { h: h.name, hL: h.link, a: a.name, aL: a.link, datum: ohneRef(p['6'] || p['5'] || '').trim() };
        Object.assign(sp, { hg: e.h, ag: e.a });
        if (e.nv) sp.nv = 1;
        if (e.ie) sp.ie = e.ie;
        if (e.ieOhneTore) sp.ieOhneTore = 1;
        if (e.sonder) sp.sonder = e.sonder;
        // Sieger: fett, sonst Tore / Elfmeter
        sp.sieger = h.fett && !a.fett ? 'h' : a.fett && !h.fett ? 'a'
            : e.ie ? (e.ie[0] > e.ie[1] ? 'h' : 'a') : (e.h != null && e.h !== e.a ? (e.h > e.a ? 'h' : 'a') : null);
        ablegen(sp);
    }
    // Amateurmeisterschaft: Teilnehmer mit Teilnahmegrund (Nutzer 28.10.2026: „mit der Begründung, warum die Mannschaft teilnahm“).
    // Zwei Formen: Tabelle (Logo | Verein | Verband bzw. Liga) oder Liste "* [[Verein]] (Nord)" / "(Dritter [[Regionalliga Süd]])".
    // Der Vereinsname ist der GANZE Zelltext – "[[Werder Bremen]] (Amateure)" steht mit dem Zusatz außerhalb des Links.
    // Dazu der Einleitungssatz des Abschnitts (die Regel des Jahrgangs: "Amateurmeister der fünf Regionalverbände").
    const teilAbschnitt = ((t.match(/==\s*Teilnehm[^=]*==([\s\S]*?)(\n==[^=]|\{\{Fußballtabelle|\{\{OneLeg|$)/) || [])[1] || '');
    const klar = s => ohneRef(s).replace(/\[\[(?:Datei|File|Bild):[^\]]*\]\]/g, '').replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/<small>|<\/small>|''+/g, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/\s+/g, ' ').trim();
    const zelle = c => c.replace(/^[^|\[]*?(style|width|align|bgcolor)\s*=[^|]*\|(?!\|)/, '').replace(/^\|\s*/, '').trim();   // "width="250" | Text" -> "Text"
    const KEIN_VEREIN = /Liga|Verband|verband|Oberliga|Amateurliga|Landesliga|Bayernliga|Verbandsliga|Relegation/;
    let teil = null, einleitung = '';
    if (AM) {
        teil = [];
        const tab = (teilAbschnitt.match(/\{\|[\s\S]*?\n\|\}/) || [''])[0];
        tab.split(/\n\|-/).slice(1).forEach(z => {
            const zellen = z.replace(/^[^\n]*\n/, '\n').split(/\n\||\|\|/).map(zelle).filter(c => c && c !== '}' && !/^[!-]/.test(c));
            const i = zellen.findIndex(c => { const l = c.match(/\[\[(?!\s*(?:Datei|File|Bild):)([^\]|]+)/); return l && !KEIN_VEREIN.test(l[1]); });
            if (i < 0) return;
            const v = verein(zellen[i]), name = klar(zellen[i]);
            teil.push({ name: name || v.name, link: v.link, grund: klar(zellen.slice(i + 1).join(' ')) });
        });
        if (!teil.length) teilAbschnitt.split('\n').filter(z => /^\*/.test(z)).forEach(z => {
            const s = z.replace(/^\*\s*/, '').replace(/&nbsp;/g, ' ').replace(/\[\[\s*(?:Datei|File|Bild):[^\]]*\]\]/g, '').trim();   // 1971: Logo vor dem Verein
            const m = s.match(/^(.*?)\s*\(((?:[^()]|\([^()]*\))*)\)\s*$/);
            const v = verein(m ? m[1] : s);
            if (v.name) teil.push({ name: klar(m ? m[1] : s) || v.name, link: v.link, grund: m ? klar(m[2]) : '' });
        });
        einleitung = klar(teilAbschnitt.replace(/\{\|[\s\S]*?\n\|\}/g, '').split('\n').filter(z => z.trim() && !/^[*{|!=]/.test(z.trim())).join(' '));
    }
    // Meister aus der Infobox – das Finale 1977–79 hatte Hin- und Rückspiel, der Sieger des letzten Spiels ist dort nicht der Meister
    const meister = AM ? verein((t.match(/\|\s*Meister\s*=\s*([^\n]*)/) || [])[1] || '') : null;
    aus.push({ y: s.y, titel: s.titel, runden, ...(teil ? { teilnehmer: teil, meister, einleitung } : {}) });
}

// ---------- Zusammenfassung ----------
let n = 0, ohne = 0, sonder = 0;
aus.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => { n++; if (sp.hg == null && !sp.ie) ohne++; if (sp.sonder) sonder++; })));
console.log(`${aus.length} Saisons, ${n} Spiele (${ohne} ohne Tore, ${sonder} mit Sondervermerk)`);
aus.forEach(s => {
    const k = s.runden.map(r => `${r.name.replace(/Hauptrunde/, 'HR').slice(0, 28)}:${r.spiele.length}`).join(' | ');
    console.log(`${s.y.padEnd(9)} ${String(s.runden.reduce((a, r) => a + r.spiele.length, 0)).padStart(3)}  ${k}`);
});
probleme.forEach(p => console.log('PROBLEM ' + p));
const ZIEL = AM ? 'wiki_amateur.json' : 'wiki_pokal.json';
fs.writeFileSync(path.join(DIR, ZIEL), JSON.stringify({ stand: new Date().toISOString().slice(0, 10), quelle: 'de.wikipedia, Saisonartikel', saisons: aus }, null, 0));
console.log('-> tools/' + ZIEL);
