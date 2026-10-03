/* Echte Spieltermine aus openfootball/deutschland: wann spielt welche Liga welchen Spieltag,
 * wann der DFB-Pokal welche Runde. Grundlage fuer den Saisonkalender (docs/kalender-konzept/).
 *
 * Je Spieltag zaehlt der Termin, an dem die MEISTEN Spiele lagen (Nachholspiele verschieben ihn
 * sonst). Fr-Mo = Wochenende (Anker: Samstag), Di-Do = englische Woche (Anker: Mittwoch).
 *
 *   node tools/kalender_real.mjs            -> tools/kalender_real.json + Zusammenfassung
 */
import fs from 'fs';
const RAW = 'https://raw.githubusercontent.com/openfootball/deutschland/master/';
const QUELLEN = [];
for (const s of ['2022-23', '2023-24', '2024-25', '2025-26']) {
    QUELLEN.push([s, '1', `${s}/1-bundesliga.txt`], [s, '2', `${s}/2-bundesliga2.txt`],
                 [s, '3', `${s}/3-liga3.txt`], [s, 'pokal', `${s}/cup.txt`]);
}
for (const rl of ['bayern', 'nord', 'nordost', 'suedwest', 'west']) QUELLEN.push(['2024-25', 'rl-' + rl, `2024-25/4-regionalliga-${rl}.txt`]);
QUELLEN.push(['2026-27', '1', 'openliga/2026-27_de.1.txt'], ['2026-27', '2', 'openliga/2026-27_de.2.txt'],
             ['2026-27', '3', 'openliga/2026-27_de.3.txt'], ['2026-27', 'pokal', 'openliga/2026-27_de.cup.txt']);

const MON = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const WD = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function parse(txt, saison) {
    const y0 = +saison.slice(0, 4);
    const runden = []; let cur = null, datum = null;
    for (const line of txt.split('\n')) {
        const h = line.match(/^▪\s*(.+?)\s*$/);
        if (h) {
            // Nachholspiele stehen unter einem wiederholten Kopf ("Regular Season - 16") -> zusammenfassen
            const nr = (h[1].match(/(\d+)\D*$/) || [])[1];
            cur = (nr && !/Round|Runde/i.test(h[1]) && runden.find(r => r.nr === nr)) || null;
            if (!cur) { cur = { name: h[1], nr, tage: {} }; runden.push(cur); }
            datum = null; continue;
        }
        const d = line.match(/^\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/);
        if (d) {
            const m = MON[d[2]];
            const y = d[4] ? +d[4] : (m >= 6 ? y0 : y0 + 1);
            datum = iso(new Date(y, m, +d[3])); continue;
        }
        // Spielzeile: Uhrzeit oder eingerueckte Paarung mit " v " bzw. Ergebnis
        if (cur && datum && (/^\s+\d{1,2}[:.]\d{2}\s+\S/.test(line) || /^\s{6,}\S.*\sv\s/.test(line))) {
            cur.tage[datum] = (cur.tage[datum] || 0) + 1;
        }
    }
    return runden.filter(r => Object.keys(r.tage).length).map((r, i) => {
        const tage = Object.entries(r.tage).sort((a, b) => a[0].localeCompare(b[0]));
        const spiele = tage.reduce((s, t) => s + t[1], 0);
        // Hauptblock: Fenster von 4 Tagen mit den meisten Spielen
        let best = null;
        for (const [t0] of tage) {
            const a = new Date(t0), n = tage.filter(([t]) => { const x = (new Date(t) - a) / 864e5; return x >= 0 && x < 4; }).reduce((s, t) => s + t[1], 0);
            if (!best || n > best.n) best = { t0, n };
        }
        const block = tage.filter(([t]) => { const x = (new Date(t) - new Date(best.t0)) / 864e5; return x >= 0 && x < 4; });
        const haupt = block.reduce((a, b) => b[1] > a[1] ? b : a)[0];
        const wd = new Date(haupt).getDay();
        const typ = (wd >= 2 && wd <= 4) ? 'MW' : 'WE';
        const anker = new Date(haupt);
        if (typ === 'WE') anker.setDate(anker.getDate() + ((6 - wd + 7) % 7 > 3 ? (6 - wd) - 7 : (6 - wd)));
        else anker.setDate(anker.getDate() + (3 - wd));
        return { nr: i + 1, name: r.name, haupt, wt: WD[wd], typ, anker: iso(anker), spiele, imBlock: best.n };
    });
}

const out = {};
for (const [saison, lid, pfad] of QUELLEN) {
    const r = await fetch(RAW + pfad);
    if (!r.ok) { console.log('fehlt', pfad, r.status); continue; }
    const runden = parse(await r.text(), saison);
    (out[saison] ||= {})[lid] = runden;
}
fs.writeFileSync(new URL('./kalender_real.json', import.meta.url), JSON.stringify(out, null, 1));

// Zusammenfassung je Saison und Wettbewerb
const kw = s => { const d = new Date(s); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); };
for (const [saison, ligen] of Object.entries(out)) {
    console.log(`\n=== ${saison}`);
    for (const [lid, rr] of Object.entries(ligen)) {
        if (!rr.length) continue;
        const mw = rr.filter(x => x.typ === 'MW');
        // Pausen: Samstage zwischen erstem und letztem Spieltag ohne Spiel (Winter separat)
        const anker = new Set(rr.map(x => x.anker));
        const pausen = [];
        const a = new Date(rr[0].anker); a.setDate(a.getDate() + ((6 - a.getDay() + 7) % 7));
        const e = new Date(rr[rr.length - 1].anker);
        for (let d = new Date(a); d <= e; d.setDate(d.getDate() + 7)) {
            const mi = new Date(d); mi.setDate(mi.getDate() - 3);
            if (!anker.has(iso(d)) && !anker.has(iso(mi))) pausen.push(kw(iso(d)));
        }
        const kurz = lid === 'pokal' ? rr.map(x => `${x.name.replace(/Round|Runde/,'R')}:${kw(x.haupt)} ${x.wt}`).join(' | ') : '';
        console.log(`${lid.padEnd(12)} ${String(rr.length).padStart(2)} Termine  ${kw(rr[0].haupt)}–${kw(rr[rr.length-1].haupt)}  ` +
            (lid === 'pokal' ? kurz : `engl. Wochen ${mw.length}${mw.length ? ' (' + mw.map(x => x.nr + ':' + kw(x.haupt)).join(', ') + ')' : ''}  spielfreie Sa ${pausen.length}: ${pausen.join(' ')}`));
    }
}
