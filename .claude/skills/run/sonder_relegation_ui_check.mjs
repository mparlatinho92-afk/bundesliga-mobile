// Reiter „Sonder-Relegation“ im Amateurpokal (Nutzer 14.11.2026): vergangene Saison mit A.sonder öffnen wie der Nutzer, Reiter
// anklicken. Prüft: ein Block je Sonder-Relegation; ohne „Stand zeigen“ keine Ergebnisse; Häkchen → Umschalter Halbfinale/Finale/
// Endstand; Endstand listet genau sr.auf; Halbfinale zeigt Ergebnisse; Seite nicht breiter als der Schirm (Handy + Desktop).
// Gegenprobe: dieselbe Saison ohne A.sonder darf keinen Block zeigen.
//   node .claude/skills/run/sonder_relegation_ui_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 5);
const b = await chromium.launch(), befund = [];
const geraete = { handy: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }, desktop: { viewport: { width: 1400, height: 900 } } };
for (const [gname, opt] of Object.entries(geraete)) {
    const page = await (await b.newContext(opt)).newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    const idx = await page.evaluate(n => { Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        Engine.fastMode = false; const H = Engine.history;
        const i = H.findIndex(h => (h.amateurpokal.sonder || []).some(s => s.spiele.some(m => m.r === 'Halbfinale')));
        return i < 0 ? { i } : { i, sr: H[i].amateurpokal.sonder.map(s => ({ auf: s.auf, n: s.spiele.length })) }; }, N);
    if (idx.i < 0) { befund.push(`${gname}: keine Saison mit Halbfinale in ${N} Saisons – keine Aussage`); continue; }
    const oeffne = async () => {
        await page.evaluate(i => { App.viewHistoryOffset = i; App.amateurTab = -1; App._amaStandAn = false; App.showAmateurpokal(); }, idx.i);
        const r = page.locator('#content .pokal-tab-btn').filter({ hasText: /^Sonder-Relegation$/ });
        if (!(await r.count())) return false;
        await r.first().click(); await page.waitForTimeout(250); return true;
    };
    const zustand = () => page.evaluate(() => {
        const bl = [...document.querySelectorAll('#content div')].filter(d => / frei$/.test((d.firstElementChild?.textContent || '').trim()) && d.style.borderLeft);
        const scores = [...document.querySelectorAll('#content .pm-score')].map(s => s.firstChild?.textContent.trim() || '');
        const aufKopf = [...document.querySelectorAll('#content div')].filter(d => /^AUFSTEIGER \(\d+\)$/.test(d.textContent.trim()));
        const auf = aufKopf.flatMap(k => { const ids = []; for (let e = k.nextElementSibling; e; e = e.nextElementSibling) { const sp = e.querySelector('span[onclick*="showSteckbrief"]'); if (sp) ids.push(/showSteckbrief\('([^']+)'/.exec(sp.getAttribute('onclick'))[1]); } return ids; });
        return { bloecke: bl.length, scores, auf, seite: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    if (!(await oeffne())) { befund.push(`${gname}: Reiter Sonder-Relegation fehlt`); continue; }
    let z = await zustand();
    if (z.bloecke !== idx.sr.length) befund.push(`${gname}: ${z.bloecke} Blöcke statt ${idx.sr.length}`);
    if (z.scores.some(s => /\d/.test(s))) befund.push(`${gname}: ohne Stand stehen Ergebnisse da`);
    if (z.seite > 1) befund.push(`${gname}: Seite ${z.seite}px breiter`);
    await page.screenshot({ path: `docs/ewige-mobil/sonder-relegation-${gname}.png` });
    // Häkchen „Stand zeigen“ wie der Nutzer
    await page.locator('#content label').filter({ hasText: 'Stand zeigen' }).locator('input').check(); await page.waitForTimeout(200);
    const k = page.locator('#content button.btn').filter({ hasText: /^Halbfinale$/ });
    if (!(await k.count())) befund.push(`${gname}: Umschalter fehlt nach dem Häkchen`);
    else {
        await k.first().click(); await page.waitForTimeout(200); z = await zustand();
        if (!z.scores.some(s => /\d/.test(s))) befund.push(`${gname}: Halbfinale ohne Ergebnisse`);
        await page.locator('#content button.btn').filter({ hasText: /^Endstand$/ }).first().click(); await page.waitForTimeout(200); z = await zustand();
        const soll = idx.sr.flatMap(s => s.auf).sort().join(','), ist = z.auf.slice().sort().join(',');
        if (soll !== ist) befund.push(`${gname}: Endstand ${z.auf.length} Aufsteiger, Soll ${idx.sr.flatMap(s => s.auf).length}`);
        if (z.seite > 1) befund.push(`${gname}: Endstand Seite ${z.seite}px breiter`);
        await page.screenshot({ path: `docs/ewige-mobil/sonder-relegation-${gname}-endstand.png` });
        console.log(`${gname}: ${z.bloecke} Blöcke, ${z.auf.length} Aufsteiger, Seite +${z.seite}px`);
    }
    // Gegenprobe
    await page.evaluate(i => { const A = Engine.history[i].amateurpokal; A._t = A.sonder; delete A.sonder; }, idx.i);
    await oeffne(); const g = await zustand();
    await page.evaluate(i => { const A = Engine.history[i].amateurpokal; A.sonder = A._t; delete A._t; }, idx.i);
    console.log(`${gname} Gegenprobe (ohne sonder): ${g.bloecke} Blöcke – ${g.bloecke ? 'falsch' : 'richtig'}`);
    if (g.bloecke) befund.push(`${gname}: Blöcke auch ohne Daten`);
    if (fehler.length) befund.push(`${gname} JS: ` + [...new Set(fehler)].join(' / '));
}
console.log(befund.length ? 'BEFUND: ' + befund.join(' · ') : 'Bestanden');
await b.close(); process.exit(befund.length ? 1 : 0);
