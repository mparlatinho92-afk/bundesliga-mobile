// Saisonhistorie im Steckbrief (Fix-Liste 12.11.2026): Rückzug, Zwangsabstieg, Verzicht, Aufstiegsverbot (Reserve), Platz an die Erste.
// Soll aus Engine.archive.strafen (ohne Punktabzug), Ist aus dem DOM nach App.showSteckbrief wie der Nutzer: die Zeile der Saison trägt
// .sb-strf mit dem richtigen Wort, keine andere Zeile trägt eins. Laufende Saison: Rückzug (t.zg) steht in der aktuellen Zeile.
// Handy: Zeile nicht breiter als die Liste.
//   node .claude/skills/run/sb_strafen_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const a = process.argv.slice(2), PORT = a[0] || 3334, N = +(a[1] || 8);
const WORT = { zg: 'Rückzug', zwang: 'Zwangsabstieg', verzicht: 'Verzicht', sperre: 'Aufstiegsverbot', platz: 'Platz an Erste' };
const befund = [], browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const page = await (await browser.newContext(opt)).newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    const fall = await page.evaluate(n => {
        Engine.fastMode = true;
        for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        // laufende Saison zu drei Vierteln: Rückzüge während der Saison stehen dann am Verein (t.zg)
        while (Engine.currentMatchday < 0.8 * Engine.totalMatchdays) Engine.simulateMatchday ? Engine.simulateMatchday() : App.nextStep();
        Engine.fastMode = false;
        const out = [], S = Engine.archive.strafen || {}, fenster = new Set((Engine.history || []).map(h => h.year));
        for (const y in S) if (fenster.has(y)) S[y].forEach(s => { if (s.art !== 'abzug') out.push({ y, id: s.id, art: s.art }); });
        Object.values(Engine.teams).forEach(t => { if (t.zg && t.leagueId) out.push({ y: null, id: t.id, art: 'zg' }); });
        return out;
    }, N);
    const jeArt = {}; fall.forEach(f => jeArt[f.art] = (jeArt[f.art] || 0) + 1);
    console.log(`${geraet}: Fälle ${fall.length} ${JSON.stringify(jeArt)}`);
    for (const art of ['zg', 'verzicht', 'sperre']) if ((jeArt[art] || 0) < 3) befund.push(`${geraet}: nur ${jeArt[art] || 0} Fälle „${art}“ – keine Aussage, mehr Saisons`);
    const proVerein = {}; fall.forEach(f => (proVerein[f.id] = proVerein[f.id] || []).push(f));
    let geprueft = 0;
    for (const [id, fs] of Object.entries(proVerein)) {
        await page.evaluate(id => App.showSteckbrief(id), id); await page.waitForTimeout(150);
        const zeilen = await page.evaluate(() => {
            const list = document.getElementById('sb-hist-list'); if (!list) return null;
            return { lw: list.clientWidth, z: [...list.children].filter(d => d.querySelector('span')).map(d => ({ y: d.firstElementChild.textContent.trim(),
                s: (d.querySelector('.sb-strf') || {}).textContent || '', w: d.scrollWidth, aktuell: /Laufende/.test(d.getAttribute('title') || '') })) };
        });
        if (!zeilen) { befund.push(`${geraet} ${id}: keine Saisonhistorie`); continue; }
        for (const f of fs) {
            const z = f.y ? zeilen.z.find(x => x.y === f.y) : zeilen.z.find(x => x.aktuell);
            if (!z) { befund.push(`${geraet} ${id} ${f.y || 'laufend'}: Zeile fehlt auf Seite 1`); continue; }
            geprueft++;
            if (!z.s.includes(WORT[f.art])) befund.push(`${geraet} ${id} ${f.y || 'laufend'}: „${z.s}“ statt „${WORT[f.art]}“`);
        }
        const soll = new Set(fs.map(f => f.y || '__akt'));
        zeilen.z.forEach(x => { if (x.s && !soll.has(x.aktuell ? '__akt' : x.y)) befund.push(`${geraet} ${id} ${x.y}: unerwartet „${x.s}“`); });
        zeilen.z.forEach(x => { if (x.w > zeilen.lw + 1) befund.push(`${geraet} ${id} ${x.y}: Zeile ${x.w}px breiter als Liste ${zeilen.lw}px`); });
        if (geraet === 'handy' && geprueft && !fs.shot) { fs.shot = 1; }
    }
    if (geraet === 'handy') {
        const id = Object.keys(proVerein).find(k => proVerein[k].some(f => f.art === 'zg' && f.y)) || Object.keys(proVerein)[0];
        if (id) { await page.evaluate(id => App.showSteckbrief(id), id); await page.waitForTimeout(300);
            await page.evaluate(() => document.getElementById('sb-hist-list')?.scrollIntoView()); await page.waitForTimeout(200);
            await page.screenshot({ path: 'docs/ewige-mobil/sb-strafen.png' }); console.log('Bild:', id, JSON.stringify(proVerein[id])); }
    }
    console.log(`${geraet}: geprüfte Zeilen ${geprueft}`);
    if (fehler.length) befund.push(`${geraet} JS: ` + [...new Set(fehler)].join(' / '));
}
console.log(befund.length ? 'BEFUND:\n  ' + befund.slice(0, 25).join('\n  ') + (befund.length > 25 ? `\n  … ${befund.length - 25} weitere` : '') : 'Bestanden');
await browser.close();
process.exit(befund.length ? 1 : 0);
