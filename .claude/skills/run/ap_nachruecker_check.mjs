// Nachrücker im Aufsteiger-Reiter des Amateurpokals gekennzeichnet (Nutzer 13.11.2026): vergangene Saison mit A.nachrueck
// öffnen wie der Nutzer (Archiv-Saison, Reiter Aufsteiger), Block „NACHRÜCKER“ mit genau diesen Vereinen und NR-Marke.
// Handy: Seite nicht breiter als der Schirm. Gegenprobe: dieselbe Saison ohne A.nachrueck darf keinen Block zeigen.
//   node .claude/skills/run/ap_nachruecker_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 6);
const b = await chromium.launch(), befund = [];
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const idx = await page.evaluate(n => { Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    Engine.fastMode = false; const H = Engine.history;
    const mit = H.findIndex(h => (h.amateurpokal.nachrueck || []).length >= 2), ohne = H.findIndex(h => !(h.amateurpokal.nachrueck || []).length && (h.amateurpokal.promoted || []).length);
    return { mit, ohne, soll: mit >= 0 ? H[mit].amateurpokal.nachrueck : [] }; }, N);
const pruefe = async i => {
    await page.evaluate(i => { App.viewHistoryOffset = i; App.showAmateurpokal(); }, i);
    // Reiter „Aufsteiger“ wie der Nutzer anklicken
    const reiter = page.locator('#content button, #content .tab, #content [onclick]').filter({ hasText: /^Aufsteiger/ }).first();
    if (!(await reiter.count())) return { fehlt: 'Reiter Aufsteiger nicht gefunden' };
    await reiter.click(); await page.waitForTimeout(300);
    return page.evaluate(() => { const k = [...document.querySelectorAll('#content div')].find(d => /^NACHRÜCKER \(\d+\)$/.test(d.textContent.trim()));
        if (!k) return { block: false, seite: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        const ids = [], nr = []; let e = k.nextElementSibling;
        for (; e; e = e.nextElementSibling) { const sp = e.querySelector('span[onclick*="showSteckbrief"]'); if (!sp) continue;
            ids.push(/showSteckbrief\('([^']+)'/.exec(sp.getAttribute('onclick'))[1]); nr.push([...e.querySelectorAll('span')].some(s => s.textContent.trim() === 'NR')); }
        return { block: true, ids, nrAlle: nr.every(Boolean), seite: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
};
if (idx.mit < 0) befund.push(`keine Saison mit ≥ 2 Nachrückern in ${N} Saisons – keine Aussage`);
else {
    const r = await pruefe(idx.mit);
    if (r.fehlt) befund.push(r.fehlt);
    else if (!r.block) befund.push('Block NACHRÜCKER fehlt');
    else {
        const s = [...idx.soll].sort().join(','), i = [...r.ids].sort().join(',');
        if (s !== i) befund.push(`Vereine ${i} statt ${s}`);
        if (!r.nrAlle) befund.push('NR-Marke fehlt');
        if (r.seite > 1) befund.push(`Seite ${r.seite}px breiter`);
        console.log(`Saison mit Nachrückern: ${r.ids.length} gezeigt, Soll ${idx.soll.length}, Seite +${r.seite}px`);
        await page.locator('text=/^NACHRÜCKER/').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'docs/ewige-mobil/ap-nachruecker.png' });
    }
}
if (idx.mit >= 0) { await page.evaluate(i => { const A = Engine.history[i].amateurpokal; A._nrTest = A.nachrueck; delete A.nachrueck; }, idx.mit); const g = await pruefe(idx.mit);
    await page.evaluate(i => { const A = Engine.history[i].amateurpokal; A.nachrueck = A._nrTest; delete A._nrTest; }, idx.mit); console.log(`Gegenprobe (Nachrücker entfernt): Block ${g.block ? 'DA – falsch' : 'fehlt – richtig'}`); if (g.block) befund.push('Block auch ohne Nachrücker'); }
if (fehler.length) befund.push('JS: ' + [...new Set(fehler)].join(' / '));
console.log(befund.length ? 'BEFUND: ' + befund.join(' · ') : 'Bestanden');
await b.close(); process.exit(befund.length ? 1 : 0);
