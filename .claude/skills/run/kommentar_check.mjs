// Kommentarzeile auf tools/hist_dubletten.html: tippen ohne Fokusverlust, bleibt nach Neuladen, steht im JSON, Handy ohne Ueberlauf.
// --selbsttest: kommentar() stillgelegt -> muss durchfallen
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || 'docs/dubletten-kommentar';
const b = await chromium.launch();
const bef = [];
for (const [name, opt] of [['desktop', { viewport: { width: 1300, height: 900 } }], ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(), err = [];
    p.on('pageerror', e => err.push(String(e)));
    if (SELBST) await p.addInitScript(() => { window.addEventListener('DOMContentLoaded', () => { window.kommentar = () => {}; }); });
    await p.goto('http://localhost:3334/tools/hist_dubletten.html');
    if (SELBST) await p.evaluate(() => { kommentar = () => {}; });
    await p.fill('#suche', 'unscharf'); await p.dispatchEvent('#suche', 'input');
    const feld = p.locator('.kommentar').first();
    if (!(await feld.count())) { bef.push(name + ': kein Kommentarfeld'); continue; }
    await p.evaluate(() => document.querySelector('.kommentar').scrollIntoView({ block: 'center' }));   // Kopf ist fest, Ausgabeleiste unten auch
    await feld.click(); await feld.pressSequentially('B ist Tippfehler, "beide" <falsch>', { delay: 5 });
    const fokus = await p.evaluate(() => document.activeElement && document.activeElement.className);
    if (fokus !== 'kommentar') bef.push(name + ': Fokus verloren');
    await p.evaluate(() => document.querySelector('.kommentar').scrollIntoView({ block: 'center' }));
    await p.screenshot({ path: OUT + '/kommentar-' + name + '.png' });
    const json = JSON.parse(await p.evaluate(() => JSON.stringify(jsonBauen())));
    if (!(json.kommentare || []).some(k => k.text === 'B ist Tippfehler, "beide" <falsch>')) bef.push(name + ': Kommentar fehlt im JSON');
    await p.reload(); await p.fill('#suche', 'unscharf'); await p.dispatchEvent('#suche', 'input');
    const wert = await p.locator('.kommentar').first().inputValue();
    if (wert !== 'B ist Tippfehler, "beide" <falsch>') bef.push(name + ': nach Neuladen "' + wert + '"');
    const ueber = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (ueber) bef.push(name + ': waagrechter Ueberlauf');
    if (err.length) bef.push(name + ': JS-Fehler ' + err[0]);
    await ctx.close();
}
await b.close();
if (bef.length) { console.log('BEFUND\n  ' + bef.join('\n  ')); process.exit(1); }
console.log('OK');
