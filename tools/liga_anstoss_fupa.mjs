/* Anstoßzeiten normaler Liga-Spieltage je Ebene (FuPa, nur lesend) – Grundlage von Engine._ACTION_SLOTS ab Ebene 4.
 *
 * Anlass (Nutzer 29.10.2026): die Amateurligen spielten im Spiel zu 7/9 Sa 15:00 (Recherche-Schätzung), die Messung der
 * Amateur-Pokalspiele (tools/amateurpokal_anstoss_fupa.mjs) zeigte So 15:00 vorn. tools/schlussspieltage_fupa.json hatte es
 * schon angedeutet (drittletzter Spieltag, häufigster Anstoß: 77 von 124 Amateurligen sonntags), aber nur je Liga EINEN Wert.
 *
 * Route: v1/competitions/<slug>/seasons/2025-26/matches?sort=desc&limit=100 (tools/torverteilung_fupa.mjs), Ligen aus
 * tools/torschnitt_fupa.json (Slug + Ebene). Eine Seite je Liga (= die letzten ~10 Spieltage), Englische Wochen zählen getrennt
 * (Di–Do). FuPa sperrt nach zwei Volläufen mit 429 – deshalb Pause und nur Ebene 4–8.
 *
 *   node tools/liga_anstoss_fupa.mjs   -> tools/liga_anstoss_fupa.json + Tabelle je Ebene
 */
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (BundesligaSim-Recherche)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(p) {
    for (let i = 0; i < 4; i++) {
        try {
            const r = await fetch('https://api.fupa.net/' + p, { headers: { 'User-Agent': UA } });
            if (r.ok) { const j = await r.json(); if (Array.isArray(j)) return j; }
            if (r.status === 404) return null;
            if (r.status === 429) { process.stderr.write(' 429 '); await sleep(15000); }
        } catch (e) { /* nochmal */ }
        await sleep(1000 * (i + 1));
    }
    return null;
}
const TAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ligen = JSON.parse(fs.readFileSync('tools/torschnitt_fupa.json', 'utf8')).filter(l => l.level >= 4 && l.level <= 8);
const je = {};   // Ebene -> {spiele, ligen, slot:{'So 15:00':n}}
for (const [k, l] of ligen.entries()) {
    const ms = await api(`v1/competitions/${encodeURIComponent(l.slug)}/seasons/2025-26/matches?sort=desc&limit=100`);
    const E = je[l.level] = je[l.level] || { ligen: 0, spiele: 0, slot: {} };
    let n = 0;
    for (const m of (ms || [])) {
        const ko = (m.kickoff || '').match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);
        if (!ko || m.homeGoal == null) continue;                           // nur gespielte Spiele mit Anstoß
        const d = new Date(Date.UTC(+ko[1], +ko[2] - 1, +ko[3]));
        const s = TAG[d.getUTCDay()] + ' ' + ko[4] + ':' + ko[5];
        E.slot[s] = (E.slot[s] || 0) + 1; n++;
    }
    if (n) { E.ligen++; E.spiele += n; }
    process.stderr.write(`\r${k + 1}/${ligen.length} Ligen   `);
    await sleep(400);
}
process.stderr.write('\n');
const aus = { _hinweis: 'ERZEUGT von tools/liga_anstoss_fupa.mjs – Anstoß je Spiel 2025/26, letzte ~100 Spiele je Liga, Ebene 4–8 (FuPa)', stand: new Date().toISOString().slice(0, 10), ebenen: {} };
for (const [e, E] of Object.entries(je)) {
    const slot = Object.fromEntries(Object.entries(E.slot).sort((a, b) => b[1] - a[1]));
    const tag = {}; Object.entries(slot).forEach(([s, n]) => tag[s.split(' ')[0]] = (tag[s.split(' ')[0]] || 0) + n);
    aus.ebenen[e] = { ligen: E.ligen, spiele: E.spiele, tag, slot };
    console.log(`Ebene ${e}: ${E.ligen} Ligen, ${E.spiele} Spiele | Tage ${JSON.stringify(tag)}`);
    Object.entries(slot).slice(0, 8).forEach(([s, n]) => console.log(`   ${s}  ${n}  (${(100 * n / E.spiele).toFixed(1)} %)`));
}
fs.writeFileSync('tools/liga_anstoss_fupa.json', JSON.stringify(aus, null, 1));
