// Ligen-Chronik (···-Menü, App.showLigaChronik, Sheet 28.10.2026) im Browser, template.html: alle Ligen, Standard-Sortierung
// nach erster Saison, Gründung mit Link, Sortieren nach Vorlauf, Klick öffnet die erste Saison, Handy ohne Querscrollen.
//   node .claude/skills/run/liga_chronik_check.mjs [port]      Screenshots nach docs/liga-chronik/
//   node .claude/skills/run/liga_chronik_check.mjs --selbsttest  LIGA_CHRONIK geleert – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/liga-chronik/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { LIGA_CHRONIK.l.length = 0; });
    // über das ···-Menü öffnen, wie der Nutzer
    await page.evaluate(() => { const m = document.getElementById('dots-menu'); if (m) m.style.display = 'block'; });
    await page.evaluate(() => [...document.querySelectorAll('.dots-item')].find(e => /Ligen-Chronik/.test(e.textContent))?.click());
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.lc-tab tbody tr')].map(r => [...r.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()));
        const links = document.querySelectorAll('.lc-tab a[href*="wikipedia"]').length;
        // Nutzer 28.10.2026: kein Gedankenstrich – Jahr, ✓ oder ? (Spalten Gegründet = vorletzte, Vorlauf = letzte)
        const strich = rows.filter(r => r.slice(-2).some(c => c === '–' || c === '')).length;
        const rlsw = rows.find(r => /^Regionalliga Südwest hist\./.test(r[0]));
        return { n: rows.length, strich, rlsw, erste: rows[0], bl: rows.find(r => /^1\. Bundesliga/.test(r[0])), ddr: rows.find(r => /^DDR-Liga/.test(r[0])), links,
            breit: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    console.log(`${geraet}: ${t.n} Ligen, ${t.links} Wikipedia-Links | erste ${JSON.stringify(t.erste)} | 1. BL ${JSON.stringify(t.bl)} | DDR-Liga ${JSON.stringify(t.ddr)}`);
    // 01.11.2026: + 4 Landes-/Verbandsligen der neuen Länder 1990/91 (eigene ID auf DDR-Ebene 3)
    soll(t.n === 221, `${geraet}: ${t.n} statt 221 Ligen`);
    soll(t.bl && t.bl.includes('1963/64') && t.bl.includes('1963'), `${geraet}: 1. Bundesliga falsch ${JSON.stringify(t.bl)}`);
    soll(t.ddr && t.ddr.includes('1950') && t.ddr.some(c => /^13 J\.$/.test(c)), `${geraet}: DDR-Liga ohne Gründung 1950 / Vorlauf 13 J. ${JSON.stringify(t.ddr)}`);
    soll(t.links > 100, `${geraet}: nur ${t.links} Links`);
    console.log(`${geraet}: ${t.strich} Zeilen mit Strich/leer | Regionalliga Südwest hist. ${JSON.stringify(t.rlsw)}`);
    soll(t.strich === 0, `${geraet}: ${t.strich} Zeilen mit Gedankenstrich oder leer in Gegründet/Vorlauf`);
    soll(t.rlsw && t.rlsw.slice(-2).join(' ') === '1963 ✓', `${geraet}: Regionalliga Südwest 1963–74 nicht „1963 ✓“ ${JSON.stringify(t.rlsw)}`);
    soll(t.breit <= 1, `${geraet}: Seite ${t.breit}px zu breit`);
    await page.screenshot({ path: `${OUT}${geraet}-chronik.png` });
    // nach Vorlauf sortieren: größter zuerst
    const v = await page.evaluate(() => { App.showLigaChronik('vorlauf'); const r = document.querySelector('.lc-tab tbody tr'); return r ? [...r.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()) : null; });
    console.log(`${geraet} Vorlauf ▼: ${JSON.stringify(v)}`);
    soll(v && /\d+ J\./.test(v[v.length - 1]), `${geraet}: Sortierung nach Vorlauf ohne Wert oben`);
    // Bayernliga 2008–11: früherer Name (Amateurliga Bayern ab 1963) zählt mit -> 18 J., nicht 63
    const bay = await page.evaluate(() => { const r = [...document.querySelectorAll('.lc-tab tbody tr')].find(x => /^Bayernliga/.test(x.textContent.trim()));
        return r ? [...r.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()) : null; });
    console.log(`${geraet} Bayernliga: ${JSON.stringify(bay)}`);
    soll(bay && bay[bay.length - 1] === '18 J.', `${geraet}: Bayernliga-Vorlauf ${bay && bay[bay.length - 1]} statt 18 J.`);
    // Klick auf DDR-Liga: Liga öffnet in ihrer ersten Saison
    const k = await page.evaluate(() => { App._ligaChronikSort = { k: 'ab', d: 1 }; App.showLigaChronik();
        const s = [...document.querySelectorAll('.lc-tab .lc-name span')].find(e => e.textContent === 'DDR-Liga'); s && s.click();
        return { modal: document.getElementById('modal').style.display, liga: App.activeLeague, saison: App._viewedSeason && App._viewedSeason() }; });
    await page.waitForTimeout(500);
    console.log(`${geraet} Klick DDR-Liga: ${JSON.stringify(k)}`);
    soll(k.modal === 'none' && /ddr/i.test(k.liga || '') && /1963/.test(String(k.saison)), `${geraet}: Klick öffnet nicht DDR-Liga 1963/64 ${JSON.stringify(k)}`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
