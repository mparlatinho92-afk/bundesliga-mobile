// Namensspalte der Tabelle prüfen – beides in einem Lauf:
//   1) KUERZEL: _teamShort über alle 1262 Vereine. Auffällig = Ziffern im Kürzel (Gründungsjahr
//      blieb stehen, z.B. "04/19") oder ein nacktes generisches Kürzel ("FV", "BC").
//   2) UEBERLAUF: bei Handy-Breite jede Liga rendern und messen, ob eine Namenszelle breiter ist
//      als ihr Platz. Überlauf heißt: die CSS-Ellipsis schneidet die Stärke in Klammern ab.
//   3) VERSCHENKTER PLATZ: passt der Rumpfname (_teamRumpf) ganz in die Zelle, darf dort nichts
//      Kürzeres stehen – findet "Grafschafter SV zeigt GSV, obwohl Platz frei ist".
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
    let zellen = 0; const ueberlauf = [], verschenkt = [];
    const stufe = { voll: 0, rumpf: 0, kurz: 0, gekuerzt: 0 };
    const zeichen = x => x.replace(/…/g, '').length;
    for (const lid of ligen) {
        App.loadLeague(lid);
        await new Promise(r => setTimeout(r, 25));
        document.querySelectorAll('.ltab td.tm').forEach(td => {
            const s = td.querySelector('.tmn'); if (!s) return;
            zellen++;
            const txt = s.textContent.trim(), full = s.getAttribute('data-full');
            const rumpf = App._teamRumpf(full);
            stufe[txt === full ? 'voll' : txt === rumpf ? 'rumpf'
                : txt === s.getAttribute('data-short') ? 'kurz' : 'gekuerzt']++;
            if (td.scrollWidth > td.clientWidth + 1) ueberlauf.push(`${txt}  (${td.scrollWidth} > ${td.clientWidth} px)`);
            if (txt === full) return;
            // INVARIANTE: passt der Rumpfname ganz in die Zelle, darf dort nichts Kuerzeres stehen.
            // Genau das war der Befund "Grafschafter SV zeigt GSV, obwohl Platz frei ist". Handgepflegte
            // Kuerzel (_TEAM_SHORT_OVERRIDE) sind bewusst kurz und deshalb ausgenommen.
            const rs = full.match(/\s(II|III|IV|U\d+)$/);
            if (App._TEAM_SHORT_OVERRIDE[rs ? full.slice(0, rs.index) : full]) return;
            const cs = getComputedStyle(td);
            const innerW = td.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
            let others = 0; for (const c of td.children) if (c !== s) others += c.getBoundingClientRect().width;
            const frei = innerW - others - 2;
            s.textContent = rumpf;
            const passt = s.getBoundingClientRect().width <= frei;
            s.textContent = txt;
            if (passt && zeichen(rumpf) > zeichen(txt))
                verschenkt.push(`${txt}  statt  ${rumpf}   (${Math.round(frei)} px frei)`);
        });
    }
    return { ligen: ligen.length, zellen, stufe, ueberlauf, verschenkt };
});
await b.close();

console.log(`${FILE} @ 363 px – ${fit.ligen} Ligen, ${fit.zellen} Namenszellen`);
console.log(`  Stufen: ${fit.stufe.voll} voll | ${fit.stufe.rumpf} Rumpfname | ${fit.stufe.kurz} Kurzname | ${fit.stufe.gekuerzt} gekuerzt`);
console.log(`\n== Auffaellige Kuerzel (${kuerzel.length}) ==`);
kuerzel.forEach(z => console.log('  ' + z));
console.log(`\n== Ueberlaufende Namenszellen (${fit.ueberlauf.length}) ==`);
fit.ueberlauf.slice(0, 25).forEach(z => console.log('  ' + z));
console.log(`\n== Verschenkter Platz: Rumpfname haette ganz gepasst (${fit.verschenkt.length}) ==`);
fit.verschenkt.slice(0, 25).forEach(z => console.log('  ' + z));
if (kuerzel.length || fit.ueberlauf.length || fit.verschenkt.length) process.exit(1);
