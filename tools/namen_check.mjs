// Namensspalte der Tabelle prüfen – beides in einem Lauf:
//   1) KUERZEL: _teamShort über alle 1262 Vereine. Auffällig = Ziffern im Kürzel (Gründungsjahr
//      blieb stehen, z.B. "04/19") oder ein nacktes generisches Kürzel ("FV", "BC").
//   2) UEBERLAUF: bei Handy-Breite jede Liga rendern und messen, ob eine Namenszelle breiter ist
//      als ihr Platz. Überlauf heißt: die CSS-Ellipsis schneidet die Stärke in Klammern ab.
// Voraussetzung: python -m http.server 3334
//   node tools/namen_check.mjs                 # aktueller Stand
//   node tools/namen_check.mjs index.html      # letzter Build
// Exit 1 = Befund.
import { chromium } from 'playwright';

const FILE = process.argv[2] || 'template.html';
const PORT = process.argv[3] || 3334;
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 363, height: 806 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(`http://localhost:${PORT}/${FILE}`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);

const kuerzel = await p.evaluate(() => {
    const out = [];
    for (const [id, t] of Object.entries(GAME_DATA.teams)) {
        const basis = t.name.replace(/\s(II|III|IV|U\d+)$/, '');
        if (App._TEAM_SHORT_OVERRIDE[basis]) continue;   // bewusst gesetzt (1860, Bayern, …)
        const s = App._teamShort(id);
        if (/\d/.test(s.replace(/\s(II|III|IV|U\d+)$/, '')) || s.replace(/\s(II|III|IV|U\d+)$/, '').length <= 2)
            out.push(`${s}  <-  ${t.name}`);
    }
    return out;
});

await p.evaluate(() => Engine.simulateFullSeason());
await p.waitForTimeout(600);
const fit = await p.evaluate(async () => {
    const ligen = [...new Set(Object.values(Engine.teams).map(t => t.leagueId).filter(Boolean))];
    let zellen = 0; const ueberlauf = []; const stufe = { voll: 0, kurz: 0, not: 0 };
    for (const lid of ligen) {
        App.loadLeague(lid);
        await new Promise(r => setTimeout(r, 25));
        document.querySelectorAll('.ltab td.tm').forEach(td => {
            const s = td.querySelector('.tmn'); if (!s) return;
            zellen++;
            const txt = s.textContent.trim();
            stufe[txt === s.getAttribute('data-full') ? 'voll' : txt === s.getAttribute('data-short') ? 'kurz' : 'not']++;
            if (td.scrollWidth > td.clientWidth + 1) ueberlauf.push(`${txt}  (${td.scrollWidth} > ${td.clientWidth} px)`);
        });
    }
    return { ligen: ligen.length, zellen, stufe, ueberlauf };
});
await b.close();

console.log(`${FILE} @ 363 px – ${fit.ligen} Ligen, ${fit.zellen} Namenszellen`);
console.log(`  Stufen: ${fit.stufe.voll} voll | ${fit.stufe.kurz} Kurzname | ${fit.stufe.not} Notkuerzel`);
console.log(`\n== Auffaellige Kuerzel (${kuerzel.length}) ==`);
kuerzel.forEach(z => console.log('  ' + z));
console.log(`\n== Ueberlaufende Namenszellen (${fit.ueberlauf.length}) ==`);
fit.ueberlauf.slice(0, 25).forEach(z => console.log('  ' + z));
if (kuerzel.length || fit.ueberlauf.length) process.exit(1);
