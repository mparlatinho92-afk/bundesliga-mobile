// Ewige Tabelle des Amateurpokals: Spalte „Aufstiege“ (Fix-Liste 12.11.2026). Soll unabhängig aus Engine.history[].amateurpokal.promoted
// (jede gespielte Saison) + laufende Aufsteiger; Ist aus dem DOM nach App.switchAmateurTab(-2) wie der Nutzer. Je Verein verglichen.
// Handy: alle Spalten da, Seite nicht breiter als der Schirm (Tabelle scrollt in ihrem Kasten).
//   node .claude/skills/run/ap_ewige_aufstiege_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 4);
const befund = [], browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const page = await (await browser.newContext(opt)).newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    // N volle Saisons, dann die laufende bis nach dem Sechzehntelfinale (Aufsteiger stehen fest, noch nicht archiviert)
    const soll = await page.evaluate(n => {
        for (let i = 0; i < n; i++) { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        Engine.fastMode = false;
        let g = 0; while (!(Engine.amateurpokal && Engine.amateurpokal.promoted && Engine.amateurpokal.promoted.length) && g++ < 80) App.nextStep();
        // Soll unabhängig von promoted/nachrueck: jeder Wechsel ligalos (nicht im Snapshot) → Liga der Folgesaison ist ein Aufstieg aus
        // dem Amateurpokal, egal über welchen Weg (Pokalaufsteiger oder Nachrücker für einen Zwangsabsteiger, Nutzer 13.11.2026)
        const z = {}, H = Engine.history || [];
        let nr = 0;
        H.forEach((h, i) => { const folge = H[i + 1] ? H[i + 1].teams : Engine.teams, prom = new Set((h.amateurpokal && h.amateurpokal.promoted) || []);
            Object.keys(folge).forEach(id => { const f = folge[id]; if (!f || !f.leagueId || h.teams[id] || !GAME_DATA.teams[id]) return;
                z[id] = (z[id] || 0) + 1; if (!prom.has(id)) nr++; }); });
        (Engine.amateurpokal.promoted || []).forEach(id => { z[id] = (z[id] || 0) + 1; });
        z.__nr = nr;
        return z;
    }, N);
    await page.evaluate(() => { App.showAmateurpokal(); App.switchAmateurTab(-2); });
    await page.waitForTimeout(600);
    const ist = await page.evaluate(() => {
        const t = document.querySelector('#content table.ptbl'); if (!t) return null;
        const ths = [...t.querySelectorAll('thead th')].map(x => x.textContent.trim()), ci = ths.findIndex(x => x.startsWith('Aufstiege'));
        const z = {};
        [...t.querySelectorAll('tbody tr')].forEach(tr => { const sp = tr.querySelector('td.tm span'), m = /showSteckbrief\('([^']+)'/.exec(sp ? sp.getAttribute('onclick') : '');
            const v = parseInt(tr.children[ci] ? tr.children[ci].textContent : ''); if (m && v > 0) z[m[1]] = v; });
        const box = t.parentElement;
        return { ci, ths, z, seite: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    if (!ist) { befund.push(`${geraet}: keine Ewige Tabelle`); continue; }
    if (ist.ci < 0) { befund.push(`${geraet}: Spalte „Aufstiege“ fehlt (${ist.ths.join(' ')})`); continue; }
    const nr = soll.__nr; delete soll.__nr;
    if (nr < 3) befund.push(`${geraet}: nur ${nr} Nachrücker – keine Aussage, mehr Saisons`);
    const ids = new Set([...Object.keys(soll), ...Object.keys(ist.z)]);
    let falsch = 0;
    ids.forEach(id => { if ((soll[id] || 0) !== (ist.z[id] || 0)) { if (falsch++ < 5) befund.push(`${geraet} ${id}: ${ist.z[id] || 0} statt ${soll[id] || 0}`); } });
    const summe = Object.values(soll).reduce((s, v) => s + v, 0);
    console.log(`${geraet}: Nachrücker ${nr} · Vereine mit Aufstieg ${Object.keys(soll).length} · Aufstiege ${summe} · abweichend ${falsch} · Seite +${ist.seite}px`);
    if (summe < 3) befund.push(`${geraet}: zu wenig Aufstiege für eine Aussage`);
    if (ist.seite > 1) befund.push(`${geraet}: Seite ${ist.seite}px breiter als der Schirm`);
    if (geraet === 'handy') { await page.evaluate(() => { App._amateurSortBy('auf'); }); await page.waitForTimeout(300);
        await page.screenshot({ path: 'docs/ewige-mobil/ap-aufstiege.png' }); }
    if (fehler.length) befund.push(`${geraet} JS: ` + [...new Set(fehler)].join(' / '));
}
console.log(befund.length ? 'BEFUND:\n  ' + befund.join('\n  ') : 'Bestanden');
await browser.close();
process.exit(befund.length ? 1 : 0);
