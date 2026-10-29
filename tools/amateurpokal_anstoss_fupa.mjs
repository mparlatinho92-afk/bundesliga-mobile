/* Anstoßzeiten echter Amateur-Pokalspiele (Kreis-/Bezirks-/Verbandspokal) – Grundlage der Amateurpokal-Termine.
 *
 * Nutzer 29.10.2026 (Sheet): „Amateurpokal erhält wie DFB-Pokal verschiedene Spieltage und Anstoßzeiten.“ Der Amateurpokal
 * hat kein echtes Vorbild; gemessen wird deshalb, wann Vereine der Ebenen 8–11 ihre Pokalspiele tatsächlich anstoßen.
 *
 * DIE ROUTEN (nur lesend):
 *   v1/standings?competition=<slug>&season=2025-26          -> Mannschafts-Slugs einer Liga (tools/torschnitt_fupa.json)
 *   v1/teams/<team-slug>/matches?flavor=past&limit=100      -> alle vergangenen Spiele der Mannschaft, Pokal inklusive
 * Pokal = Wettbewerbsname mit „pokal“ (Kreispokal Euskirchen, Rheinlandpokal …). Liga-Routen kennen keine Pokale
 * („is not a valid league competition“).
 *
 *   node tools/amateurpokal_anstoss_fupa.mjs [Mannschaften je Liga, Standard 3]   -> tools/amateurpokal_anstoss_fupa.json
 */
import fs from 'node:fs';
const UA = 'BundesligaSim/1.0 (research)';
const JE_LIGA = +process.argv[2] || 3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(p) {
    for (let i = 0; i < 4; i++) {
        try {
            const r = await fetch('https://api.fupa.net/' + p, { headers: { 'User-Agent': UA } });
            if (r.ok) return await r.json();
            if (r.status === 404 || r.status === 422 || r.status === 400) return null;
        } catch (e) { /* nochmal */ }
        await sleep(1000 * (i + 1));
    }
    return null;
}
const TAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ligen = JSON.parse(fs.readFileSync('tools/torschnitt_fupa.json', 'utf8')).filter(l => l.level >= 8);
const spiele = new Map();   // Spiel-ID -> {tag, zeit, wettbewerb, ebene}
let teams = 0;
for (const l of ligen) {
    const st = await api(`v1/standings?competition=${encodeURIComponent(l.slug)}&season=2025-26`);
    const ts = ((st && st.standings) || []).map(s => s.team && s.team.slug).filter(Boolean);
    // gleichmäßig über die Tabelle verteilt (oben, Mitte, unten), nicht nur die Spitze
    const wahl = [...new Set(Array.from({ length: JE_LIGA }, (_, k) => ts[Math.floor((k + 0.5) * ts.length / JE_LIGA)]))].filter(Boolean);
    for (const t of wahl) {
        const ms = await api(`v1/teams/${encodeURIComponent(t)}/matches?flavor=past&limit=100`);
        teams++;
        for (const m of (Array.isArray(ms) ? ms : [])) {
            const c = m.competition || {}, name = c.name || '';
            if (!/pokal/i.test(name) || /dfb-pokal|frauen|jugend|junior|ü\d|senioren|alte herren|halle/i.test(name) || !m.kickoff) continue;
            const ko = m.kickoff.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);
            if (!ko) continue;
            const d = new Date(Date.UTC(+ko[1], +ko[2] - 1, +ko[3]));
            if (d < new Date(Date.UTC(2025, 6, 1)) || d > new Date(Date.UTC(2026, 5, 30))) continue;   // Saison 2025/26
            spiele.set(m.id || m.slug || (t + m.kickoff), { tag: TAG[d.getUTCDay()], zeit: ko[4] + ':' + ko[5], wettbewerb: name, ebene: l.level, datum: ko[0].slice(0, 10) });
        }
        await sleep(250);
    }
    process.stderr.write(`\r${ligen.indexOf(l) + 1}/${ligen.length} Ligen, ${teams} Mannschaften, ${spiele.size} Pokalspiele   `);
}
process.stderr.write('\n');
const alle = [...spiele.values()];
const zaehl = f => alle.reduce((o, s) => (o[f(s)] = (o[f(s)] || 0) + 1, o), {});
const sortiert = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const aus = {
    _hinweis: 'ERZEUGT von tools/amateurpokal_anstoss_fupa.mjs – Pokalspiele 2025/26 von Mannschaften der Ebenen 8–11 (FuPa)',
    stand: new Date().toISOString().slice(0, 10), ligen: ligen.length, mannschaften: teams, spiele: alle.length,
    tag: sortiert(zaehl(s => s.tag)), slot: sortiert(zaehl(s => s.tag + ' ' + s.zeit)), wettbewerbe: sortiert(zaehl(s => s.wettbewerb)),
    roh: alle,
};
fs.writeFileSync('tools/amateurpokal_anstoss_fupa.json', JSON.stringify(aus, null, 1));
console.log(`${alle.length} Pokalspiele aus ${teams} Mannschaften (${ligen.length} Ligen)`);
console.log('Tage:', JSON.stringify(aus.tag));
console.log('Slots (Top 25):'); Object.entries(aus.slot).slice(0, 25).forEach(([k, v]) => console.log(`  ${k}  ${v}  (${(100 * v / alle.length).toFixed(1)} %)`));
