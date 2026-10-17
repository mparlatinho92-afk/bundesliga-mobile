/* Echte Anstoßzeiten der letzten Spieltage je Spiel-Liga (FuPa, nur lesend).
 *
 * Frage (Nutzer 17.10.2026): laufen am Saisonende wirklich alle Spiele zeitgleich – und an welchen Spieltagen, um wie viel Uhr?
 * Je Liga und Saison: die letzten drei Spieltage (round.number), je Spieltag Anteil der Spiele im häufigsten Anstoß
 * (Datum+Uhrzeit) und dieser Anstoß. Nachholspiele zählen mit (sie senken den Anteil), deshalb "zeitgleich" = ≥ 80 %.
 *
 *   node tools/schlussspieltage_fupa.mjs [2025-26 2024-25 …]   -> tools/schlussspieltage_fupa.json + Tabelle
 *
 * Route wie tools/torverteilung_fupa.mjs: v1/competitions/<slug>/seasons/<saison>/matches?sort=desc&limit=100&offset=N
 * Slugs: Spiel-Liga-ID -> Liste von Kandidaten (der erste mit Spielen gewinnt). */
import fs from 'fs';
const UA = 'Mozilla/5.0 (BundesligaSim-Recherche)';
// --nur 8-1,8-2: nur diese Ligen neu holen und in die bestehende JSON eintragen (nach einer 429-Sperre)
const NUR = (() => { const i = process.argv.indexOf('--nur'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
const SAISONS = process.argv.slice(2).filter((a, i, A) => a !== '--nur' && A[i - 1] !== '--nur').length ? process.argv.slice(2).filter((a, i, A) => a !== '--nur' && A[i - 1] !== '--nur') : ['2025-26', '2024-25'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(p) {
    for (let i = 0; i < 4; i++) {
        try {
            const r = await fetch('https://api.fupa.net/' + p, { headers: { 'User-Agent': UA } });
            if (r.ok) { const j = await r.json(); if (Array.isArray(j)) return j; }
            if (r.status === 404) return null;
        } catch (e) {}
        await sleep(1000 * (i + 1));
    }
    return null;
}
const SLUG = {
    '1': ['bundesliga'], '2': ['2-bundesliga'], '3': ['3-liga'],
    '4-1': ['regionalliga-suedwest'], '4-2': ['regionalliga-nord'], '4-3': ['regionalliga-nordost'], '4-4': ['regionalliga-west'], '4-5': ['regionalliga-bayern'],
    '5-1': ['oberliga-rheinland-pfalz-saar'], '5-2': ['oberliga-baden-wuerttemberg'], '5-3': ['hessenliga'], '5-4': ['oberliga-schleswig-holstein'],
    '5-5': ['oberliga-hamburg'], '5-6': ['oberliga-niedersachsen'], '5-7': ['bremen-liga'], '5-8': ['nofv-oberliga-nord'], '5-9': ['nofv-oberliga-sued'],
    '5-10': ['oberliga-westfalen'], '5-11': ['oberliga-niederrhein'], '5-12': ['mittelrheinliga'], '5-13': ['bayernliga-nord'], '5-14': ['bayernliga-sued'],
    '6-1': ['herren-verbandsliga-suedwest'], '6-2': ['rheinlandliga'], '6-3': ['saarlandliga'], '6-4': ['verbandsliga-nordbaden'], '6-5': ['verbandsliga-suedbaden'],
    '6-6': ['verbandsliga-wuerttemberg'], '6-7': ['verbandsliga-nord'], '6-8': ['verbandsliga-hessen-mitte'], '6-9': ['verbandsliga-hessen-sued'],
    '6-10': ['landesliga-schleswig'], '6-11': ['landesliga-holstein'], '6-12': ['landesliga-hammonia-hamburg'], '6-13': ['landesliga-hansa-hamburg'],
    '6-14': ['landesliga-weser-ems'], '6-15': ['landesliga-lueneburg'], '6-16': ['landesliga-hannover'], '6-17': ['landesliga-braunschweig'], '6-18': ['landesliga-bremen'],
    '6-19': ['verbandsliga-mecklenburg-vorpommern'], '6-20': ['brandenburgliga'], '6-21': ['berlin-liga'],
    '6-22': ['verbandsliga-sachsen-anhalt', 'sachsen-anhalt-verbandsliga', 'lotto-verbandsliga-sachsen-anhalt'],
    '6-23': ['verbandsliga-thueringen', 'thueringenliga'], '6-24': ['sachsenliga'], '6-25': ['westfalenliga-staffel-1'], '6-26': ['westfalenliga-staffel-2'],
    '6-27': ['landesliga-niederrhein-gruppe-1', 'landesliga-niederrhein-1'], '6-28': ['landesliga-niederrhein-gruppe-2', 'landesliga-niederrhein-2'],
    '6-29': ['landesliga-mittelrhein-staffel-1', 'landesliga-mittelrhein-1'], '6-30': ['landesliga-mittelrhein-staffel-2', 'landesliga-mittelrhein-2'],
    '6-31': ['bayern-landesliga-nordwest'], '6-32': ['bayern-landesliga-nordost'], '6-33': ['bayern-landesliga-mitte'], '6-34': ['bayern-landesliga-suedwest'], '6-35': ['bayern-landesliga-suedost'],
    '7-1': ['herren-landesliga-ost-suedwest', 'landesliga-ost-suedwest'], '7-2': ['herren-landesliga-west-suedwest', 'landesliga-west-suedwest'],
    '7-3': ['bezirksliga-west-rheinland'], '7-4': ['bezirksliga-mitte-rheinland'], '7-5': ['bezirksliga-ost-rheinland'],
    '7-6': ['verbandsliga-nord-ost-saarland', 'verbandsliga-nordost-saarland', 'verbandsliga-saarland-nord-ost'], '7-7': ['verbandsliga-suedwest', 'verbandsliga-sued-west-saarland', 'verbandsliga-suedwest-saarland', 'verbandsliga-saarland-sued-west'],
    '7-8': ['landesliga-berlin-st-1'], '7-9': ['landesliga-berlin-st-2'],
    '8-1': ['herren-bezirksliga-rheinhessen', 'bezirksliga-rheinhessen'], '8-2': ['bzl-vorderpfalz', 'herren-bezirksliga-vorderpfalz', 'bezirksliga-vorderpfalz'],
    '8-3': ['herren-bezirksliga-nahe', 'bezirksliga-nahe'], '8-4': ['bezirksliga-westpfalz', 'herren-bezirksliga-westpfalz']
};
const NAMEN = (() => { try { global.window = global; (0, eval)(fs.readFileSync('game_data.js', 'utf8').replace(/^const /gm, 'var ')); return Object.fromEntries(Object.entries(GAME_DATA.leagues).map(([k, v]) => [k, v.name])); } catch (e) { return {}; } })();
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
async function spiele(slug, saison) {
    const out = [];
    for (let off = 0; off <= 1200; off += 100) {
        const j = await api(`v1/competitions/${encodeURIComponent(slug)}/seasons/${saison}/matches?sort=desc&limit=100&offset=${off}`);
        await sleep(120);
        if (!j || !j.length) break;
        out.push(...j);
        if (j.length < 100) break;
    }
    return out;
}
const erg = NUR && fs.existsSync('tools/schlussspieltage_fupa.json') ? JSON.parse(fs.readFileSync('tools/schlussspieltage_fupa.json', 'utf8')) : {};
for (const [lid, kand] of Object.entries(SLUG)) {
    if (NUR && !NUR.includes(lid)) continue;
    erg[lid] = { name: NAMEN[lid] || lid, saisons: {} };
    for (const saison of SAISONS) {
        let ms = [], slug = null;
        for (const s of kand) { ms = await spiele(s, saison); if (ms.length) { slug = s; break; } }
        if (!slug) { erg[lid].saisons[saison] = null; continue; }
        erg[lid].slug = slug;
        const je = {};
        ms.forEach(m => { const n = m.round && m.round.number; if (n && m.kickoff && m.round.type === 'league') (je[n] = je[n] || []).push(m.kickoff); });
        const runden = Object.keys(je).map(Number).sort((a, b) => b - a), letzte = runden[0];
        erg[lid].saisons[saison] = runden.slice(0, 3).map(n => {
            const k = {}; je[n].forEach(x => { const key = x.slice(0, 16); k[key] = (k[key] || 0) + 1; });
            const [top, cnt] = Object.entries(k).sort((a, b) => b[1] - a[1])[0];
            const d = new Date(top + ':00');
            return { md: n, vonLetztem: letzte - n, spiele: je[n].length, gleich: cnt, anteil: +(cnt / je[n].length).toFixed(2), anstoss: WT[d.getDay()] + ' ' + top.slice(11, 16), zeiten: Object.keys(k).length };
        });
    }
    const z = s => { const a = erg[lid].saisons[s]; return a ? a.map(r => `${r.md}:${Math.round(r.anteil * 100)}% ${r.anstoss}`).join('  ') : '—'; };
    console.log(`${lid.padEnd(5)} ${(erg[lid].name || '').slice(0, 34).padEnd(34)} ${SAISONS.map(z).join('  ||  ')}`);
}
fs.writeFileSync('tools/schlussspieltage_fupa.json', JSON.stringify(erg, null, 1));
