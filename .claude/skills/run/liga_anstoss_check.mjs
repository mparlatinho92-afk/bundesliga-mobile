// Liga-Vorschau und -Ergebnisse in Blöcken je Tag und Uhrzeit (Engine.ligaAnstoss, Nutzer 29.10.2026), template.html, Desktop + Handy:
//   jede Zeile steht im Block ihres Anstoßes, Blöcke chronologisch; nach Klick auf „Woche“ die Ergebnisse ebenso;
//   nach dem Neuladen dieselben Zeiten in der Vorschau, Ergebnisse entweder richtig geblockt oder ohne Blöcke – nie falsch.
//   node .claude/skills/run/liga_anstoss_check.mjs [port]      Screenshots nach docs/liga-anstoss/
//   node .claude/skills/run/liga_anstoss_check.mjs --selbsttest Zeilen im DOM umgedreht – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/liga-anstoss/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
// Abschnitt (Vorschau/Ergebnisse) lesen: je Zeile Block (Tag, Zeit) gegen Engine.ligaAnstoss(termin, lid)
const lies = (page, art, lid, termin, kaputt) => page.evaluate(([art, lid, termin, kaputt]) => {
    const kopf = [...document.querySelectorAll('#md-feed div, #md-feed span')].find(d => art === 'v' ? /^Vorschau · Spieltag/.test(d.textContent.trim()) : /^Spieltag \d+/.test(d.textContent.trim()));
    if (!kopf) return null;
    const box = kopf.closest('#md-feed > div'), liste = box.querySelector('.reslist');
    if (!liste) return { n: 0, bloecke: 0 };
    if (kaputt) [...liste.querySelectorAll(':scope > .res-item')].reverse().forEach(x => liste.appendChild(x));
    const z = Engine.ligaAnstoss(termin, lid) || {}, nameZuId = {};
    Object.values(Engine.teams).forEach(t => nameZuId[t.name] = t.id);
    let tag = '', zeit = '';
    const fehl = [], sorts = [];
    let bloecke = 0, n = 0;
    liste.querySelectorAll(':scope > .pm-tag, :scope > .pm-zeit, :scope > .res-item').forEach(el => {
        if (el.classList.contains('pm-tag')) { tag = el.textContent.trim(); bloecke++; return; }
        if (el.classList.contains('pm-zeit')) { zeit = el.textContent.trim().replace(' Uhr', ''); return; }
        n++;
        const sp = el.querySelector('.res-h [onclick]'), id = sp ? (sp.getAttribute('onclick').match(/'([^']+)'/) || [])[1] : nameZuId[el.querySelector('.res-h').textContent.trim()];
        const e = z[id];
        if (!bloecke) return;
        const sollTxt = e ? `${Engine._DAY_LABEL[e.d]}${e.datum ? ', ' + String(e.datum.getDate()).padStart(2, '0') + '.' + String(e.datum.getMonth() + 1).padStart(2, '0') + '.' : ''}|${e.t}` : '?';
        if (sollTxt !== tag + '|' + zeit) fehl.push(`${id}: Block ${tag} ${zeit}, Anstoß ${sollTxt}`);
        sorts.push(e ? Engine._slotSort(e.d, e.t) : 0);
    });
    return { n, bloecke, fehl, unsortiert: sorts.filter((s, k) => k && s < sorts[k - 1]).length,
             zeiten: Object.keys(z).sort().map(k => k + ' ' + z[k].d + ' ' + z[k].t).join(',') };
}, [art, lid, termin, kaputt]);
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    const laden = async () => { await page.goto(`http://localhost:${PORT}/template.html`);
        await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 }); };
    const zeige = lid => page.evaluate(lid => { document.getElementById('modal').style.display = 'none'; App.viewHistoryOffset = null; App.matchdayViewIdx = null; App.tsView = null; App.resultsCollapsed = false; App.tableView = 'gesamt'; App.loadLeague(lid); }, lid);
    const naechster = lid => page.evaluate(lid => Engine._kalAktiv() ? Engine.ligaNaechsterTermin(lid) : Engine.currentMatchday + 1, lid);
    await laden();
    // bis Bundesliga UND Amateurliga am nächsten Termin spielen (Saisonstart der Ligen ist gestaffelt)
    await page.evaluate(() => { let g = 0; const t = () => Engine._kalAktiv() ? Engine.ligaNaechsterTermin('1') : Engine.currentMatchday + 1;
        while (g++ < 30 && !(t() === Engine.currentMatchday + 1 && (Engine.schedule[t()] || []).some(m => m.lid === '7-1'))) Engine.playNextMatchday(); });
    const vorher = {};
    for (const lid of ['1', '7-1']) {
        await zeige(lid); await page.waitForTimeout(300);
        const t = await naechster(lid), v = await lies(page, 'v', lid, t, SELBST);
        soll(v && v.n > 0, `${geraet} ${lid}: keine Vorschau`);
        if (!v) continue;
        vorher[lid] = v.zeiten;
        soll(v.bloecke >= (lid === '1' ? 2 : 1), `${geraet} ${lid} Vorschau: ${v.bloecke} Tagesblöcke`);
        soll(!v.fehl.length, `${geraet} ${lid} Vorschau: ${v.fehl.length} Zeilen im falschen Block, z. B. ${v.fehl[0]}`);
        soll(!v.unsortiert, `${geraet} ${lid} Vorschau: ${v.unsortiert} Zeilen nicht chronologisch`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-${lid === '1' ? 'bundesliga' : 'amateur'}-vorschau.png` });
    }
    // „Woche“ klicken wie der Nutzer → Ergebnisse geblockt
    await zeige('1');
    await page.locator('button', { hasText: /^Woche$/ }).first().click();
    await page.waitForTimeout(1500);
    for (const lid of ['1', '7-1']) {
        await zeige(lid); await page.waitForTimeout(300);
        const t = await page.evaluate(() => Engine.currentMatchday), e = await lies(page, 'e', lid, t, SELBST);
        soll(e && e.n > 0, `${geraet} ${lid}: keine Ergebnisse nach „Woche“`);
        if (!e) continue;
        soll(e.bloecke >= 1 && !e.fehl.length && !e.unsortiert, `${geraet} ${lid} Ergebnisse: ${e.bloecke} Blöcke, ${e.fehl.length} falsch, ${e.unsortiert} unsortiert ${e.fehl[0] || ''}`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-${lid === '1' ? 'bundesliga' : 'amateur'}-ergebnisse.png` });
    }
    if (SELBST) { await ctx.close(); break; }
    // Neuladen: Vorschau-Zeiten gleich (fest, ohne Speicher), Ergebnisse richtig geblockt oder ohne Blöcke
    const vorLaden = {};
    for (const lid of ['1', '7-1']) { await zeige(lid); vorLaden[lid] = (await lies(page, 'v', lid, await naechster(lid), false) || {}).zeiten; }
    await page.evaluate(() => Engine.saveGame());
    await laden();
    for (const lid of ['1', '7-1']) {
        await zeige(lid); await page.waitForTimeout(300);
        const v = await lies(page, 'v', lid, await naechster(lid), false);
        soll(v && v.zeiten === vorLaden[lid], `${geraet} ${lid}: Vorschau-Zeiten nach dem Neuladen anders`);
        const e = await lies(page, 'e', lid, await page.evaluate(() => Engine.currentMatchday), false);
        soll(!e || !e.bloecke || (!e.fehl.length && !e.unsortiert), `${geraet} ${lid}: Ergebnisse nach dem Neuladen falsch geblockt ${e && e.fehl[0]}`);
        if (e) console.log(`${geraet} ${lid}: nach Neuladen Ergebnisse ${e.bloecke ? 'mit' : 'ohne'} Blöcke`);
    }
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
}
await browser.close();
if (SELBST && !befund.some(b => b.includes('Ergebnisse'))) befund.length = 0;   // beide Hälften müssen anschlagen
if (SELBST) { befund.slice(0, 4).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
