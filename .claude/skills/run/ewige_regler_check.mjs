// Ewige Tabelle am Handy (Fix-Liste 12.11.2026): Name einzeilig/Kürzel, waagerechter Touch-Schieberegler (App._ewRegler).
// Prüft: Regler da und so breit wie der sichtbare Bereich, Ziehen nach rechts scrollt #content bis ans Ende, Tippen auf die
// Schiene springt, Griff folgt dem Wischen, alle Namen einzeilig, Seite nicht breiter als der Schirm, Desktop ohne Regler.
//   node .claude/skills/run/ewige_regler_check.mjs [port] [liga]   → docs/ewige-mobil/regler-*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
const a = process.argv.slice(2), PORT = a[0] || 3334, LID = a[1] || '6-34', AP = LID === 'ap', TAB = AP ? 'ap-ew' : 'ew-tab';   // 'ap' = Amateurpokal
fs.mkdirSync('docs/ewige-mobil', { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }],
                             ['desktop', { viewport: { width: 1400, height: 900 } }]]) {
    const page = await (await browser.newContext(opt)).newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    await page.evaluate(([lid, ap]) => { if (ap) { Engine.fastMode = true; for (let i = 0; i < 2; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false; App.showAmateurpokal(); App.switchAmateurTab(-2); } else { App.tableView = 'ewige'; App.loadLeague(lid); } }, [LID, AP]);
    await page.waitForTimeout(1200);
    const da = await page.evaluate(() => !!document.getElementById('ew-regler'));
    if (geraet === 'desktop') { soll(!da, 'Desktop (Maus) zeigt den Regler'); if (fehler.length) befund.push('desktop JS: ' + fehler.join(' / ')); break; }
    soll(da, 'handy: kein Regler');
    if (!da) break;
    const m = await page.evaluate(tab => {
        const c = document.getElementById('content'), r = document.getElementById('ew-regler');
        const zeilen = [...document.querySelectorAll('#' + tab + ' td.tm')];
        const zwei = zeilen.filter(td => td.querySelector('.tmn').getBoundingClientRect().height > 22).map(td => td.textContent.trim());
        const gekuerzt = zeilen.filter(td => { const s = td.querySelector('.tmn'); return s.textContent !== s.getAttribute('data-full'); }).length;
        return { cw: c.clientWidth, rw: Math.round(r.getBoundingClientRect().width), max: c.scrollWidth - c.clientWidth, zwei, gekuerzt, n: zeilen.length,
                 seite: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, TAB);
    soll(Math.abs(m.cw - m.rw) <= 2, `Regler ${m.rw}px, sichtbarer Bereich ${m.cw}px`);
    soll(!m.zwei.length, `${m.zwei.length} Namen zweizeilig, z. B. ${m.zwei[0]}`);
    soll(m.seite <= 1, `Seite ${m.seite}px breiter als der Schirm`);
    // Regler in den Blick holen (sticky unten im sichtbaren Bereich), Bild vorher
    await page.evaluate(() => { document.getElementById('content').scrollTop = 400; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `docs/ewige-mobil/${AP ? 'ap-' : ''}regler-vorher.png` });
    const box = async () => page.evaluate(() => { const b = document.querySelector('#ew-regler i').getBoundingClientRect(), r = document.getElementById('ew-regler').getBoundingClientRect();
        return { gx: b.left + b.width / 2, gy: b.top + b.height / 2, gl: b.left, gw: b.width, rl: r.left, rr: r.right, ry: r.top + r.height / 2, sl: document.getElementById('content').scrollLeft }; });
    const b0 = await box();
    soll(b0.ry > 0 && b0.ry < 915, `Regler nicht im sichtbaren Bereich (y=${Math.round(b0.ry)})`);
    // Griff ganz nach rechts ziehen
    await page.mouse.move(b0.gx, b0.gy); await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(b0.gx + (b0.rr - b0.gx) * k / 8 + 20, b0.gy);
    await page.mouse.up(); await page.waitForTimeout(150);
    const b1 = await box();
    soll(Math.abs(b1.sl - m.max) <= 2, `Ziehen nach rechts: scrollLeft ${b1.sl} statt ${m.max}`);
    soll(b1.gl + b1.gw >= b1.rr - 2, 'Griff steht nach dem Ziehen nicht am rechten Ende');
    await page.screenshot({ path: `docs/ewige-mobil/${AP ? 'ap-' : ''}regler-rechts.png` });
    // Tippen links auf die Schiene → zurück an den Anfang
    await page.mouse.click(b1.rl + 4, b1.ry); await page.waitForTimeout(150);
    const b2 = await box();
    soll(b2.sl <= 2, `Tippen links auf die Schiene: scrollLeft ${b2.sl} statt 0`);
    // Wischen (scrollLeft direkt) → Griff folgt
    await page.evaluate(max => { document.getElementById('content').scrollLeft = max / 2; }, m.max); await page.waitForTimeout(150);
    const b3 = await box();
    soll(b3.gl > b2.gl + 10, 'Griff folgt dem Wischen nicht');
    // Namen in der Kopfzeile antippbar? Tippen auf einen Vereinsnamen öffnet den Steckbrief (Regler darf nichts schlucken)
    console.log(`Namen ${m.n}, davon gekürzt ${m.gekuerzt} · Scrollweg ${m.max}px · Regler ${m.rw}px`);
    if (fehler.length) befund.push('handy JS: ' + fehler.join(' / '));
}
console.log(befund.length ? 'BEFUND:\n  ' + befund.join('\n  ') : 'Bestanden');
await browser.close();
process.exit(befund.length ? 1 : 0);
