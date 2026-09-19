// f-archiv-Abschlusstabellen (CSV des Nutzers) -> Ebene 2 und 3 seit 1963/64, BRD und DDR, je Staffel getrennt;
// dazu Ebene 4 (Oberligen) 1994/95-2007/08 unter den Regionalligen.
//
//   node tools/farchiv_ebenen.mjs [csv ...]      # Standard: ~/Downloads/farchiv_output/alle_tabellen_final.csv
//
// Mehrere CSV-Dateien sind erlaubt (Nachlieferungen); gleiche Tabellen werden nur einmal uebernommen.
// Ausgabe: tools/farchiv_ebene23.json  { tabellen:[{y, gebiet, ebene, verband, regionen, staffel, liga, url, zeilen:[...]}] }
//
// Ebene wird NICHT geraten: jede Liga braucht eine Regel in REGELN (Name + Zeitraum). Was einer Regel aehnlich sieht,
// aber keine trifft, wird gemeldet. Gegenprobe je Saison gegen tools/staffeln_ebene23.json (Wikipedia-Zaehlung).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATEIEN = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(os.homedir(), 'Downloads/farchiv_output/alle_tabellen_final.csv')];

// ---------- REGELN: Liganame (f-archiv, Leerzeichen normalisiert) + Saison-Startjahr -> Ebene ----------
// regionen = Namen aus team.regions in game_data.js; der Vereinsabgleich grenzt Kandidaten damit ein.
const NFV = 'Norddeutscher Fußball-Verband', NOFV = 'Nordostdeutscher Fußballverband', WDFV = 'Westdeutscher Fußballverband';
const R = (re, von, bis, gebiet, ebene, verband, regionen, staffel) => ({ re: new RegExp('^(?:' + re + ')$'), von, bis, gebiet, ebene, verband, regionen, staffel });
const REGELN = [
    // BRD Ebene 2: Regionalligen 1963/64-1973/74
    R('Regionalliga Nord', 1963, 1973, 'BRD', 2, 'Nord', [NFV], 'Nord'),
    R('Regionalliga West', 1963, 1973, 'BRD', 2, 'West', [WDFV], 'West'),
    R('Regionalliga Südwest', 1963, 1973, 'BRD', 2, 'Südwest', ['Regionalliga Südwest'], 'Südwest'),
    R('Regionalliga Süd', 1963, 1973, 'BRD', 2, 'Süd', ['Bayern', 'Hessen', 'Baden-Württemberg'], 'Süd'),
    R('Regionalliga Berlin', 1963, 1973, 'BRD', 2, 'Berlin', ['Berlin'], 'Berlin'),
    // BRD Ebene 3: Amateurligen der Landesverbaende 1963/64-1977/78 (Nord bis 1973/74)
    R('Amateurliga Bayern', 1963, 1977, 'BRD', 3, 'Bayern', ['Bayern']),
    R('Amateurliga Hessen', 1963, 1977, 'BRD', 3, 'Hessen', ['Hessen']),
    R('Amateurliga Nordbaden', 1963, 1977, 'BRD', 3, 'Nordbaden', ['Baden']),
    R('Amateurliga Südbaden|Verbandsliga Südbaden', 1963, 1977, 'BRD', 3, 'Südbaden', ['Südbaden']),
    R('(?:1\\. )?Amateurliga (?:Schwarzwald-Bodensee|Schwarzwald)', 1963, 1977, 'BRD', 3, 'Schwarzwald-Bodensee', ['Württemberg', 'Südbaden']),
    R('1\\. Amateurliga Nordwürttemberg|Amateurliga Nordwürttemberg', 1963, 1977, 'BRD', 3, 'Nordwürttemberg', ['Württemberg']),
    R('Amateurliga Rheinland', 1963, 1977, 'BRD', 3, 'Rheinland', ['Fußballverband Rheinland']),
    R('Amateurliga Saarland', 1963, 1977, 'BRD', 3, 'Saarland', ['Saarland']),
    R('Amateurliga Südwest', 1963, 1977, 'BRD', 3, 'Südwest', ['Südwest']),
    R('Amateurliga Berlin', 1963, 1977, 'BRD', 3, 'Berlin', ['Berlin']),
    R('Verbandsliga Mittelrhein', 1963, 1977, 'BRD', 3, 'Mittelrhein', ['Mittelrhein']),
    R('Verbandsliga Niederrhein', 1963, 1977, 'BRD', 3, 'Niederrhein', ['Niederrhein']),
    R('Verbandsliga Westfalen', 1963, 1977, 'BRD', 3, 'Westfalen', ['Westfalen']),
    R('Landesliga Hamburg', 1963, 1973, 'BRD', 3, 'Hamburg', ['Hamburg']),
    R('Landesliga Bremen', 1963, 1973, 'BRD', 3, 'Bremen', ['Bremen']),
    R('Amateurliga Schleswig-Holstein', 1963, 1967, 'BRD', 3, 'Schleswig-Holstein', ['Schleswig-Holstein']),
    R('Landesliga Schleswig-Holstein', 1968, 1973, 'BRD', 3, 'Schleswig-Holstein', ['Schleswig-Holstein']),
    R('Amateuroberliga Niedersachsen (West|Ost)', 1963, 1963, 'BRD', 3, 'Niedersachsen', ['Niedersachsen']),
    R('Amateurliga Niedersachsen', 1964, 1973, 'BRD', 3, 'Niedersachsen', ['Niedersachsen']),
    // BRD Ebene 3: Oberligen 1974/75 (Nord) bzw. 1978/79 - 1993/94
    R('Oberliga Nord', 1974, 1993, 'BRD', 3, 'Nord', [NFV]),
    R('Oberliga Berlin', 1978, 1990, 'BRD', 3, 'Berlin', ['Berlin']),
    R('Oberliga Westfalen', 1978, 1993, 'BRD', 3, 'Westfalen', ['Westfalen']),
    R('Oberliga Nordrhein', 1978, 1993, 'BRD', 3, 'Nordrhein', ['Niederrhein', 'Mittelrhein']),
    R('Oberliga Südwest', 1978, 1993, 'BRD', 3, 'Südwest', ['Regionalliga Südwest']),
    R('Oberliga Hessen', 1978, 1993, 'BRD', 3, 'Hessen', ['Hessen']),
    R('Oberliga Baden-Württemberg', 1978, 1993, 'BRD', 3, 'Baden-Württemberg', ['Baden-Württemberg']),
    R('Oberliga Bayern|Bayernliga', 1978, 1993, 'BRD', 3, 'Bayern', ['Bayern']),
    R('Oberliga Nordost,? (?:Staffel|Satffel) (Nord|Mitte|Süd)', 1991, 1993, 'BRD', 3, 'Nordost', [NOFV]),
    // BRD Ebene 3: Regionalligen 1994/95-2007/08, 3. Liga ab 2008/09
    R('Regionalliga Nord', 1994, 2007, 'BRD', 3, 'Nord', [NFV, WDFV, NOFV], 'Nord'),
    R('Regionalliga Nordost', 1994, 1999, 'BRD', 3, 'Nordost', [NOFV], 'Nordost'),
    R('Regionalliga West/Südwest', 1994, 1999, 'BRD', 3, 'West/Südwest', [WDFV, 'Regionalliga Südwest'], 'West/Südwest'),
    R('Regionalliga Süd', 1994, 2007, 'BRD', 3, 'Süd', ['Bayern', 'Hessen', 'Baden-Württemberg', 'Regionalliga Südwest'], 'Süd'),
    R('3\\. Liga', 2008, 2024, 'BRD', 3, '3. Liga', []),
    // BRD Ebene 4: Oberligen 1994/95-2007/08 (ab 2008/09 Ebene 5, kommen aus tools/wiki_ebene45.mjs)
    // Oberliga Nord 1994-2004 = eine Liga mit zwei Staffeln (so fuehrt es auch Wikipedia), danach eingleisig
    R('Oberliga Niedersachsen/Bremen', 1994, 2003, 'BRD', 4, 'Nord', ['Niedersachsen', 'Bremen'], 'Niedersachsen/Bremen'),
    R('Oberliga Hamburg/Schleswig-Holstein', 1994, 2003, 'BRD', 4, 'Nord', ['Hamburg', 'Schleswig-Holstein'], 'Hamburg/Schleswig-Holstein'),
    R('Oberliga Nord', 2004, 2007, 'BRD', 4, 'Nord', [NFV]),
    R('Oberliga Nordost,? (?:Staffel|Satffel|Gruppe) (Nord|Süd)', 1994, 2007, 'BRD', 4, 'Nordost', [NOFV]),
    R('Oberliga Westfalen', 1994, 2007, 'BRD', 4, 'Westfalen', ['Westfalen']),
    R('Oberliga Nordrhein', 1994, 2007, 'BRD', 4, 'Nordrhein', ['Niederrhein', 'Mittelrhein']),
    R('Oberliga Südwest', 1994, 2007, 'BRD', 4, 'Südwest', ['Regionalliga Südwest']),
    R('Oberliga Hessen', 1994, 2007, 'BRD', 4, 'Hessen', ['Hessen']),
    R('Oberliga Baden-Württemberg', 1994, 2007, 'BRD', 4, 'Baden-Württemberg', ['Baden-Württemberg']),
    R('Oberliga Bayern|Bayernliga', 1994, 2007, 'BRD', 4, 'Bayern', ['Bayern']),
    // DDR Ebene 2: DDR-Liga (1990/91 NOFV-Liga), Ebene 3: 15 Bezirksligen
    R('DDR-Liga', 1963, 1989, 'DDR', 2, 'DDR-Liga', [NOFV]),
    R('NOFV-Liga', 1990, 1990, 'DDR', 2, 'DDR-Liga', [NOFV]),
    ...[['Berlin', 'Berlin'], ['Cottbus', 'Brandenburg'], ['Frankfurt/O\\.|Frankfurt/Oder', 'Brandenburg', 'Frankfurt/Oder'], ['Potsdam', 'Brandenburg'],
        ['Dresden', 'Sachsen'], ['Leipzig', 'Sachsen'], ['Karl-Marx-Stadt|Chemnitz', 'Sachsen', 'Karl-Marx-Stadt'],
        ['Halle', 'Sachsen-Anhalt'], ['Magdeburg', 'Sachsen-Anhalt'], ['Erfurt', 'Thüringen'], ['Gera', 'Thüringen'], ['Suhl', 'Thüringen'],
        ['Rostock', 'Mecklenburg-Vorpommern'], ['Schwerin', 'Mecklenburg-Vorpommern'], ['Neubrandenburg', 'Mecklenburg-Vorpommern']]
        .map(([re, land, name]) => R('Bezirksliga (?:' + re + ')', 1963, 1990, 'DDR', 3, name || re, [land])),
];
// Aehnliche Namen, die keine Regel trifft, sollen auffallen (nur Meldung)
const VERDACHT = /^(?:Regionalliga|Oberliga|Amateuroberliga|Amateurliga|1\. Amateurliga|DDR-Liga|NOFV-Liga|3\. Liga|Bayernliga|Hessenliga|Verbandsliga (?:Westfalen|Mittelrhein|Niederrhein|Südbaden)|Landesliga (?:Hamburg|Bremen|Schleswig-Holstein|Niedersachsen)|Bezirksliga (?:Berlin|Cottbus|Frankfurt|Potsdam|Dresden|Leipzig|Karl-Marx|Chemnitz|Halle|Magdeburg|Erfurt|Gera|Suhl|Rostock|Schwerin|Neubrandenburg))/;

// ---------- CSV lesen ----------
function parse(s) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
        else if (c === '"') q = true;
        else if (c === ',') { row.push(f); f = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
        else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
}
const yr = s => { const m = String(s).match(/(\d{4})/); return m ? +m[1] : null; };
const ligaNorm = l => l.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
// Vereinsname: Fussnotensterne und Zusaetze am Ende abtrennen (auch gestapelt: "Rot-Weiß Essen (N) *")
function vereinZerlegen(v) {
    let s = v.replace(/\s+/g, ' ').trim(), alt; const zusatz = [];
    do {
        alt = s;
        s = s.replace(/\s*\*+\s*$/, '');
        s = s.replace(/(\s(?:II|III))\.$/, '$1'); // "Bayer Leverkusen II." (Oberliga Nordrhein 2007/08) – sonst Profiverein
        const m = s.match(/\s*\(([^)]*)\)\s*$/);
        if (m) { zusatz.unshift(m[1].replace(/\s+/g, '')); s = s.slice(0, m.index); }
        s = s.trim();
    } while (s !== alt);
    return { verein: s, zusatz: zusatz.join(',') || null };
}
const zahl = v => v === '' || v == null ? null : (isFinite(+v) ? +v : null);
const paar = v => { const m = String(v).replace(/\s/g, '').match(/^(-?\d+):(-?\d+)$/); return m ? [+m[1], +m[2]] : null; };

const tabellenRoh = new Map(); // url|title -> {liga, y, url, rows}
let zeilenGelesen = 0;
for (const datei of DATEIEN) {
    const all = parse(fs.readFileSync(datei, 'utf8'));
    const head = all.shift().map(h => h.trim());
    for (const r of all) {
        if (r.length < 2) continue;
        const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]));
        const k = o.url + '|' + o.title;
        if (!tabellenRoh.has(k)) tabellenRoh.set(k, { liga: ligaNorm(o.league), y: yr(o.season), url: o.url, rows: [], datei: path.basename(datei), dateiNr: DATEIEN.indexOf(datei) });
        const t = tabellenRoh.get(k);
        if (t.datei !== path.basename(datei)) continue; // dieselbe Seite in einer spaeteren Datei: erste Datei gilt
        t.rows.push(o); zeilenGelesen++;
    }
}

// ---------- Regeln anwenden, Staffeln trennen, Dubletten entfernen ----------
const verdacht = {};
const rundenErkannt = [];
const aufstiegsrunden = [];
const staffelSchluessel = new Map(); // Saison|Gebiet|Ebene|Verband|Staffel -> Tabelle (nur einstaffelige Seiten)
const ersetztGezielt = [];
const punkteRepariert = [];
const tabellen = [];
const gesehen = new Map(); // Fingerabdruck -> Tabelle (gleiche Tabelle unter zweiter URL)
for (const t of tabellenRoh.values()) {
    if (!t.y || t.y < 1963) continue;
    const regel = REGELN.find(g => g.re.test(t.liga) && t.y >= g.von && t.y <= g.bis);
    if (!regel) { if (VERDACHT.test(t.liga)) (verdacht[t.liga] = verdacht[t.liga] || []).push(t.y); continue; }
    const nameStaffel = (t.liga.match(regel.re) || [])[1] || regel.staffel || null;
    // Staffeln: eine neue Staffel beginnt NUR mit Platz 1 nach einem Platz > 1. Nicht "p <= prev": Punktgleiche
    // teilen sich einen Platz (3., 3.). Nicht "p < prev": die Quelle hat Tippfehler (Suhl 1982/83: 1,2,3,4,5,8,7,8…).
    const gruppen = [];
    let prev = 0;
    for (const o of t.rows) {
        const p = zahl(o.platz);
        if (p == null) continue;
        if (!gruppen.length || (p === 1 && prev > 1)) gruppen.push([]);
        prev = p;
        const { verein, zusatz } = vereinZerlegen(o.verein);
        const tore = paar(o.tore);
        let pkt = paar(o.punkte);
        // Doppelpunkt fehlt in der Quelle ("2321" statt "23:21", Hansa Rostock II 1974/75): im 2-Punkte-System ergeben Plus- und
        // Minuspunkte zusammen 2 x Spiele. Repariert wird nur, wenn GENAU eine Aufteilung aufgeht.
        if (!pkt && /^\d{3,4}$/.test(o.punkte) && zahl(o.spiele)) {
            const p = o.punkte, sp2 = 2 * zahl(o.spiele);
            const moegl = [1, 2].map(i => [+p.slice(0, i), +p.slice(i)]).filter(([a, b]) => p.length - 1 >= 1 && a + b === sp2);
            if (moegl.length === 1) { pkt = moegl[0]; punkteRepariert.push(`${t.y} ${t.liga} ${o.verein}: "${p}" -> ${pkt[0]}:${pkt[1]}`); }
        }
        gruppen[gruppen.length - 1].push({
            platz: p, verein, zusatz, sp: zahl(o.spiele), s: zahl(o.siege), u: zahl(o.unent), n: zahl(o.nieder),
            gf: tore ? tore[0] : null, ga: tore ? tore[1] : null,
            pkt: pkt ? pkt[0] : zahl(o.punkte), pktMinus: pkt ? pkt[1] : null,
        });
    }
    // Tabellen einer Seite mit DENSELBEN Vereinen sind Runden, keine Staffeln (Regionalliga Berlin 1964/65 und 1972/73:
    // Hauptrunde + Gesamttabelle nach Meister-/Abstiegsrunde). Es zaehlt nur die Tabelle mit den meisten Spielen.
    if (gruppen.length > 1) {
        // Nicht exakt gleich verlangen: in der Gesamttabelle koennen Nachruecker/Zurueckgezogene stehen (Berlin 1964/65).
        // Zwei echte Staffeln teilen sich praktisch nie 80 % ihrer Vereine.
        const menge = g => new Set(g.map(z => z.verein));
        const ueberlappt = (a, b) => { const A = menge(a), B = menge(b); let n = 0; A.forEach(v => { if (B.has(v)) n++; }); return n >= 0.8 * Math.min(A.size, B.size); };
        if (gruppen.every(g => ueberlappt(g, gruppen[0]))) {
            const spiele = g => Math.max(...g.map(z => z.sp || 0));
            const best = gruppen.reduce((a, b) => spiele(b) > spiele(a) ? b : a);
            gruppen.length = 0; gruppen.push(best); rundenErkannt.push(t.y + ' ' + t.liga);
        }
    }
    // Aufstiegsrunden haengen unter der Abschlusstabelle (Oberliga Hessen 1998-2006: 3-4 Verbandsligisten, 2-3 Spiele;
    // Oberliga Nord 2007/08: Qualifikationsrunde mit 4 Spielen). Keine Staffel: weniger als halb so viele Spiele wie die Haupttabelle.
    if (gruppen.length > 1) {
        const spiele = g => Math.max(...g.map(z => z.sp || 0)), top = Math.max(...gruppen.map(spiele));
        const kurz = gruppen.filter(g => 2 * spiele(g) < top);
        kurz.forEach(g => aufstiegsrunden.push(`${saison(t.y)} ${t.liga} (${g.length} Vereine, ${spiele(g)} Sp.)`));
        if (kurz.length) { const rest = gruppen.filter(g => !kurz.includes(g)); gruppen.length = 0; gruppen.push(...rest); }
    }
    gruppen.forEach((zeilen, gi) => {
        // Gleiche Tabelle = gleiche Saison, Verband, Plaetze und Torverhaeltnisse. NICHT ueber die Namen: dieselbe Tabelle
        // aus zwei Quellen schreibt Vereine verschieden ("VfR Aalen1" mit Fussnote vs. "VfR Aalen"). Bei einer Dublette
        // gewinnt die SPAETER angegebene Datei – Nachlieferungen und Bereinigungen ersetzen so den aelteren Stand.
        const fp = t.y + '|' + regel.verband + '|' + zeilen.map(z => z.platz + ':' + z.gf + ':' + z.ga).join(';');
        // Gezielte Ersetzung: eine spaetere Datei liefert dieselbe Staffel (Saison, Liga, Staffelname) mit ANDEREN Zeilen –
        // f-archiv hat dort einen Fehler (Oberliga Nordrhein 1999/2000: ein Verein fehlt; Nordost Nord 2000/01: 30 statt 34 Spiele).
        // Nur fuer Seiten mit einer Staffel, damit die Zuordnung eindeutig bleibt.
        const sk = [t.y, regel.gebiet, regel.ebene, regel.verband, nameStaffel].join('|');
        const vorher = gruppen.length === 1 && staffelSchluessel.get(sk);
        if (vorher && t.dateiNr > vorher.dateiNr && !gesehen.has(fp)) {
            ersetztGezielt.push(`${saison(t.y)} ${t.liga}${nameStaffel ? ' ' + nameStaffel : ''}: ${vorher.zeilen.length} -> ${zeilen.length} Zeilen`);
            Object.assign(vorher, { liga: t.liga, url: t.url, zeilen, dateiNr: t.dateiNr }); gesehen.set(fp, vorher);
            return;
        }
        const alt = gesehen.get(fp);
        if (alt) {
            if (t.dateiNr > alt.dateiNr) { Object.assign(alt, { liga: t.liga, url: t.url, zeilen, dateiNr: t.dateiNr }); alt.ersetzt = (alt.ersetzt || 0) + 1; }
            else alt.dubletten = (alt.dubletten || 0) + 1;
            return;
        }
        const tab = {
            y: t.y, saison: saison(t.y), gebiet: regel.gebiet, ebene: regel.ebene, verband: regel.verband, regionen: regel.regionen,
            staffel: gruppen.length > 1 ? null : nameStaffel, staffelNr: gi + 1, staffelnAufSeite: gruppen.length,
            liga: t.liga, url: t.url, zeilen, dateiNr: t.dateiNr,
        };
        gesehen.set(fp, tab);
        if (gruppen.length === 1) staffelSchluessel.set(sk, tab);
        tabellen.push(tab);
    });
}

// ---------- Staffelnamen aus Wikipedia, wo die Groessen passen ----------
const WIKI = JSON.parse(fs.readFileSync(path.join(DIR, 'staffeln_ebene23.json'), 'utf8'));
const wikiKey = name => {
    const s = name.replace(/^1\. /, '').replace(/^Fußball-/, '').replace(/^DDR-Fußball-/, '');
    if (/^(Hessen|Bayern)liga$/.test(s)) return s.replace('liga', '');
    const m = s.match(/^(Amateurliga|Landesliga|Verbandsliga|Oberliga|Bezirksliga) (.+)$/);
    return m ? m[2] : s;
};
let benannt = 0;
const nachSeite = {};
tabellen.filter(t => t.staffelnAufSeite > 1).forEach(t => (nachSeite[t.url + '|' + t.y] = nachSeite[t.url + '|' + t.y] || []).push(t));
for (const gruppe of Object.values(nachSeite)) {
    const t0 = gruppe[0];
    const key = t0.gebiet === 'DDR' && t0.ebene === 2 ? 'Liga' : t0.verband;
    const w = WIKI.funde.find(f => f.y === t0.y && f.gebiet === t0.gebiet && f.ebene === t0.ebene && wikiKey(f.liga) === key && f.staffeln.length === gruppe.length);
    const groessenGleich = w && w.staffeln.every((n, i) => Math.abs(n - gruppe[i].zeilen.length) <= 1);
    gruppe.forEach((t, i) => {
        if (groessenGleich) { t.staffel = w.pfade[i].split(' > ')[0].replace(/^Staffel /, '') || null; benannt++; }
        if (!t.staffel) t.staffel = String(i + 1);
    });
}

// ---------- Gegenprobe gegen Wikipedia je Saison + Luecken ----------
const summe = {}; const je = {};
tabellen.forEach(t => {
    const k = t.gebiet + ' ' + t.ebene;
    summe[k] = summe[k] || { tabellen: 0, vereine: 0 }; summe[k].tabellen++; summe[k].vereine += t.zeilen.length;
    const s = je[k + '|' + t.y] = je[k + '|' + t.y] || { tabellen: 0, vereine: 0 }; s.tabellen++; s.vereine += t.zeilen.length;
});
const abweichung = [];
WIKI.saisons.forEach(z => {
    const k = z.gebiet + ' ' + z.ebene, f = je[k + '|' + z.y] || { tabellen: 0, vereine: 0 };
    const wikiSicher = z.tabGeschaetzt === 0;
    if (f.tabellen !== z.tabellen || Math.abs(f.vereine - z.vereine) > Math.max(2, 0.03 * z.vereine))
        abweichung.push(`${k} ${saison(z.y)}: f-archiv ${f.tabellen}/${f.vereine}, Wikipedia ${z.tabellen}/${z.vereine}${wikiSicher ? '' : ' (Wikipedia teils geschaetzt)'}`);
});
const luecken = [];
REGELN.forEach(g => {
    for (let y = g.von; y <= g.bis; y++) {
        if (g.gebiet === 'BRD' && y > 2020) continue; // Datei endet 2020/21
        if (!tabellen.some(t => t.y === y && t.verband === g.verband && t.gebiet === g.gebiet && t.ebene === g.ebene && g.re.test(t.liga))) luecken.push({ verband: g.gebiet + ' ' + g.ebene + ' ' + g.verband, y, regel: g.re.source });
    }
});
// Luecken zusammenfassen: gleiche Regel, fortlaufende Jahre
const lk = {};
luecken.forEach(l => (lk[l.verband + ' [' + l.regel + ']'] = lk[l.verband + ' [' + l.regel + ']'] || []).push(l.y));
const bereiche = ys => ys.reduce((a, y) => { const b = a[a.length - 1]; if (b && y === b[1] + 1) b[1] = y; else a.push([y, y]); return a; }, []).map(([a, b]) => a === b ? saison(a) : saison(a) + '–' + saison(b)).join(', ');

const sun = tabellen.reduce((s, t) => { t.zeilen.forEach(z => { s.gesamt++; if (z.s != null) s.mit++; }); return s; }, { gesamt: 0, mit: 0 });
const dub = tabellen.reduce((s, t) => s + (t.dubletten || 0), 0);
if (ersetztGezielt.length) console.log(`Gezielt ersetzt (spaetere Datei, gleiche Staffel): ${ersetztGezielt.join(' | ')}`);
if (aufstiegsrunden.length) console.log(`Aufstiegsrunden unter der Abschlusstabelle verworfen: ${aufstiegsrunden.length} (${aufstiegsrunden.join(' | ')})`);
if (rundenErkannt.length) console.log(`Runden statt Staffeln (nur Gesamttabelle behalten): ${rundenErkannt.join(', ')}`);
if (punkteRepariert.length) console.log(`Punkte ohne Doppelpunkt repariert: ${punkteRepariert.length} (${punkteRepariert.slice(0, 5).join(' | ')})`);
const ersetzt = tabellen.filter(t => t.ersetzt);
if (ersetzt.length) console.log(`Durch spaetere Datei ersetzt: ${ersetzt.length} Staffeln (${ersetzt.map(t => t.saison + ' ' + t.liga).join(', ')})`);
console.log(`Gelesen: ${DATEIEN.length} Datei(en), ${zeilenGelesen} Zeilen, ${tabellenRoh.size} Tabellenseiten`);
console.log(`Ebene 2-4 ab 1963: ${tabellen.length} Staffeln, ${sun.gesamt} Vereinssaisons | doppelte Staffeln verworfen: ${dub} | Staffelnamen aus Wikipedia: ${benannt} | mit S/U/N: ${(100 * sun.mit / sun.gesamt).toFixed(0)} %`);
for (const k of Object.keys(summe).sort()) console.log(`  ${k}: ${summe[k].tabellen} Staffeln / ${summe[k].vereine} Vereinssaisons`);
console.log(`\nLuecken (Regel ohne Tabelle, bis 2020/21): ${Object.keys(lk).length} Regeln`);
Object.entries(lk).forEach(([k, ys]) => console.log(`  ${k}: ${bereiche(ys)}`));
console.log(`\nAbweichung zur Wikipedia-Zaehlung: ${abweichung.length} Saisons`);
abweichung.slice(0, 40).forEach(a => console.log('  ' + a));
const vd = Object.entries(verdacht);
console.log(`\nAehnliche Liganamen OHNE Regel (bitte pruefen): ${vd.length}`);
vd.sort((a, b) => a[0].localeCompare(b[0])).forEach(([l, ys]) => console.log(`  ${l}: ${Math.min(...ys)}–${Math.max(...ys)} (${ys.length})`));

fs.writeFileSync(path.join(DIR, 'farchiv_ebene23.json'), JSON.stringify({
    stand: new Date().toISOString().slice(0, 10), quellen: DATEIEN.map(d => path.basename(d)),
    summe, luecken: Object.fromEntries(Object.entries(lk).map(([k, ys]) => [k, bereiche(ys)])), abweichung, tabellen,
}));
console.log('\n-> tools/farchiv_ebene23.json');
