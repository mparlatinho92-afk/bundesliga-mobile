// Globale Suche mit historischen Ligen (Nutzer 29.10.2026: „in Suche rechts oben fehlen Historische Ligen (Unterschied zu Liga,
// Hinweis auf Historisch)“), template.html, Desktop + Handy. Getippt wird ins echte Suchfeld, geklickt wird der Treffer:
//   „Oberliga Westfalen“ → heutige Liga („Liga“) + zwei historische Abschnitte („Historisch“, Zeitraum, „heute Oberliga Westfalen“)
//   „Regionalliga Süd“   → drei historische Ligen ohne heutigen Nachfolger; Klick öffnet die letzte Saison 1972/73 (1963–73)
//   „DDR-Oberliga“       → Historisch; Klick auf den Vorgänger „Oberliga Westfalen 1978/79–1993/94“ öffnet dessen letzte Saison
//   node .claude/skills/run/suche_ligen_check.mjs [port]       Screenshots nach docs/suche-ligen/
//   node .claude/skills/run/suche_ligen_check.mjs --selbsttest  app/core.js aus v0.8.228.49 (ohne historische Ligen) – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/suche-ligen/';
fs.mkdirSync(OUT, { recursive: true });
const ALT = SELBST ? execSync('git show b317938:app/core.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) : null;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    if (ALT) await page.route('**/app/core.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ALT }));
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    await page.waitForFunction(() => typeof HIST_ARCHIVE_LEAGUES !== 'undefined' && Object.keys(HIST_ARCHIVE_LEAGUES).length > 100, null, { timeout: 60000 });
    const suche = async q => {
        if (!(await page.evaluate(() => document.getElementById('gs-wrap')?.classList.contains('open')))) { await page.click('#gs-icon'); await page.waitForTimeout(300); }
        await page.fill('#gs-input', ''); await page.type('#gs-input', q); await page.waitForTimeout(200);
        return page.evaluate(() => [...document.querySelectorAll('#gs-list div[onclick]')].map(d => {
            const t = d.querySelector(':scope > div')?.children || [];
            return { typ: d.querySelector(':scope > span')?.textContent || '', label: t[0]?.textContent || '', sub: t[1]?.textContent || '',
                     onclick: d.getAttribute('onclick') };
        }));
    };
    // 1) Oberliga Westfalen: heutige + zwei historische, unterscheidbar
    const ow = await suche('Oberliga Westfalen');
    const owH = ow.filter(r => r.typ === 'Historisch' && r.label === 'Oberliga Westfalen');
    soll(ow.some(r => r.typ === 'Liga' && r.label === 'Oberliga Westfalen'), `${geraet} „Oberliga Westfalen“: heutige Liga fehlt`);
    soll(owH.length === 2, `${geraet} „Oberliga Westfalen“: ${owH.length} historische statt 2 ${JSON.stringify(ow.map(r => r.typ + ':' + r.sub))}`);
    soll(owH.some(r => r.sub.includes('1978/79–1993/94') && r.sub.includes('heute Ebene 5')), `${geraet} Oberliga Westfalen 1978–94 ohne Zeitraum/heutige Ebene (${owH.map(r => r.sub).join(' | ')})`);
    if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-oberliga-westfalen.png` });
    // 2) Regionalliga Süd 1963–73 anklicken → letzte Saison dieser Liga
    const rs = await suche('Regionalliga Süd');
    const rs63 = rs.find(r => r.typ === 'Historisch' && r.sub.startsWith('1963/64–1973/74'));
    soll(rs.filter(r => r.typ === 'Historisch' && r.label === 'Regionalliga Süd').length === 3, `${geraet} „Regionalliga Süd“: nicht 3 historische (${rs.map(r => r.typ + ':' + r.sub).join(' | ')})`);
    if (rs63) {
        await page.click(`#gs-list div[onclick="${rs63.onclick}"]`); await page.waitForTimeout(1200);
        const st = await page.evaluate(() => ({ lid: App.activeLeague, titel: document.getElementById('league-title')?.textContent || '', inhalt: (document.getElementById('content')?.textContent || '').slice(0, 3000) }));
        soll(st.lid === 'h2-sued-regionalliga' && /Regionalliga Süd/.test(st.titel), `${geraet} Klick Regionalliga Süd 1963–73: Liga ${st.lid}, Titel ${st.titel}`);
        soll(/1973\/74/.test(st.titel + st.inhalt), `${geraet} Klick Regionalliga Süd: Saison 1973/74 nicht offen`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-regionalliga-sued-1973.png` });
    } else befund.push(`${geraet} Regionalliga Süd 1963/64–1973/74 nicht in der Suche`);
    // 3) DDR-Oberliga als Historisch
    const ddr = await suche('DDR-Oberliga');
    soll(ddr.some(r => r.typ === 'Historisch' && r.label === 'DDR-Oberliga' && /1949\/50/.test(r.sub)), `${geraet} „DDR-Oberliga“ nicht als Historisch (${JSON.stringify(ddr.slice(0, 3))})`);
    // 4) Vorgänger anklicken: Oberliga Westfalen 1978–94 → dessen letzte Saison (1993/94)
    const ow2 = await suche('Oberliga Westfalen');
    const v = ow2.find(r => r.typ === 'Historisch' && r.sub.includes('1978/79–1993/94'));
    if (v) {
        await page.click(`#gs-list div[onclick="${v.onclick}"]`); await page.waitForTimeout(1200);
        const st = await page.evaluate(() => ({ titel: document.getElementById('league-title')?.textContent || '', inhalt: (document.getElementById('content')?.textContent || '').slice(0, 3000), avs: App.viewArchivedSeason }));
        soll(/1993\/94/.test(st.titel + st.inhalt + JSON.stringify(st.avs || {})), `${geraet} Klick Oberliga Westfalen 1978–94: Saison 1993/94 nicht offen (${st.titel})`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-oberliga-westfalen-1993.png` });
    }
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 4).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: der alte Code fällt durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
