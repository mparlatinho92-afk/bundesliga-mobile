// Historischer DFB-Pokal im Browser (template.html): Ewige Tabelle mit Historie, Klick auf eine historische Saison in der
// Siegerliste, Runden von damals, Stand nach der Saison + Feld hervorgehoben, Blättern, zurück zur laufenden Saison.
//   node .claude/skills/run/pokal_hist_check.mjs [port]      Screenshots nach docs/pokal-hist/
//   node .claude/skills/run/pokal_hist_check.mjs --selbsttest  POKAL_HIST vor dem Rendern geleert – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/pokal-hist/';
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
    if (SELBST) await page.evaluate(() => { POKAL_HIST.saisons.length = 0; });
    const zeile = name => page.evaluate(n => { const tr = [...document.querySelectorAll('#content table.ptbl tbody tr')].find(r => r.querySelector('.tm')?.textContent.trim() === n);
        return tr ? [...tr.querySelectorAll('td')].map(t => t.textContent.trim()) : null; }, name);

    // 1) Ewige Tabelle heute: Bayern 20 Titel (bis 2024/25), Platz 1, 275+ Spiele
    await page.evaluate(() => { App._navSaisonSetzen(null, '1'); App.pokalHistY = null; App.ewigeSeasonIdx = null; App.pokalTab = -2; App.showPokal(); });
    let z = await zeile('FC Bayern München'), n = await page.$$eval('#content table.ptbl tbody tr', r => r.length);
    console.log(`${geraet} Ewige heute: ${n} Vereine, Bayern ${z && z.slice(0, 6).join(' | ')}`);
    soll(z && z[0] === '1.' && +z[5] >= 20, `${geraet} Ewige heute: Bayern nicht Platz 1 mit ≥20 Titeln (${z})`);
    soll(n > 850, `${geraet} Ewige heute: nur ${n} Vereine (Historie fehlt?)`);
    // Zuletzt (Sheet 28.10.2026): Bayern = laufende Saison, Stettiner SC = vor 1945; Pkt./Sp. 0.00 statt Strich, wenn gespielt
    // vor der Auslosung (frischer Spielstand: Engine.pokal fehlt) ist die letzte Teilnahme 2024/25
    const lauf = await page.evaluate(() => Engine.pokal && Engine.pokal.rounds && ((Engine.pokal.rounds[0] || {}).matches || []).length
        ? App._seasonStrOf(Engine.startYear + Engine.currentSeasonOffset) : '2024/25');
    soll(z && z[12] === lauf, `${geraet} Zuletzt Bayern ${z && z[12]} statt ${lauf}`);
    const stet = await zeile('Stettiner SC');
    soll(stet && /^19[34]\d$/.test(stet[12]), `${geraet} Zuletzt Stettiner SC ${stet && stet[12]}`);
    const null0 = await page.evaluate(() => [...document.querySelectorAll('#content table.ptbl tbody tr')].map(r => [...r.querySelectorAll('td')].map(t => t.textContent.trim()))
        .filter(t => t[10] === '0' && +t[6] > 0).map(t => t[11]));   // Spalten seit 31.10.2026 wie die Ligen: Jahre|Titel|Sp.|G.|U.|V.|Pkt.|Pkt/Sp|Zuletzt
    console.log(`${geraet} Zuletzt Bayern ${z && z[12]}, Stettiner SC ${stet && stet[12]}, ${null0.length} Vereine ohne Punkt: ${[...new Set(null0)].join(' ')}`);
    soll(null0.length > 0 && null0.every(v => v === '0.00'), `${geraet} Pkt./Sp. ohne Punkt: ${[...new Set(null0)].join(' ')}`);
    // Archivwert (archive.cups.p[id].zl, ab v0.8.228.35) wird gelesen: kurz auf 2030 gesetzt, gezeigt, zurückgesetzt
    const arch = await page.evaluate(() => { const A = Engine.archive || (Engine.archive = {}), C = A.cups || (A.cups = {}), P = C.p || (C.p = {});
        const alt = P.fcbayernmuenchen_0; P.fcbayernmuenchen_0 = Object.assign({ wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 }, alt || {}, { zl: 2030 });
        App.showPokal(); const tr = [...document.querySelectorAll('#content table.ptbl tbody tr')].find(r => r.querySelector('.tm')?.textContent.trim() === 'FC Bayern München');
        const v = tr ? tr.querySelectorAll('td')[12].textContent.trim() : null; if (alt) P.fcbayernmuenchen_0 = alt; else delete P.fcbayernmuenchen_0; App.showPokal(); return v; });
    soll(arch === '2030/31', `${geraet} Zuletzt aus dem Archiv: ${arch} statt 2030/31`);
    // seit 31.10.2026 alle Spalten, die Tabelle darf breiter sein (wischt seitlich wie die Ligen) – „Zuletzt“ muss erreichbar bleiben
    const pk = await page.evaluate(() => { const c = document.getElementById('content'), t = document.querySelector('#content table.ptbl'); if (!t) return 0; c.scrollLeft = c.scrollWidth;
        const ths = t.querySelectorAll('thead th'), r = Math.round(ths[ths.length - 1].getBoundingClientRect().right - document.documentElement.clientWidth); c.scrollLeft = 0; return r; });
    soll(pk <= 1, `${geraet} Ewige Tabelle: „Zuletzt“ auch ganz rechts ${pk}px abgeschnitten`);
    await page.screenshot({ path: `${OUT}${geraet}-ewige-heute.png` });

    // 2) Siegerliste: 1985/86 anklickbar → Runden von damals, Reiter Finale
    await page.evaluate(() => { App.pokalTab = -3; App.showPokal(); });
    const kl = await page.$$eval('#content .sg-saison', e => e.length);
    console.log(`${geraet} Sieger: ${kl} Saisons anklickbar`);
    soll(kl >= 82, `${geraet} Sieger: nur ${kl} Saisons anklickbar`);
    await page.evaluate(() => { const td = [...document.querySelectorAll('#content .sg-saison')].find(e => e.textContent.trim() === '1985/86'); td && td.click(); });
    await page.waitForTimeout(300);
    const fin = await page.evaluate(() => ({ y: App.pokalHistY, tab: (document.querySelector('.pokal-tab-btn.active') || {}).textContent,
        spiel: [...document.querySelectorAll('#content .pokal-match')].map(m => m.textContent.replace(/\s+/g, ' ').trim())[0], leiste: (document.querySelector('.pk-hist-leiste') || {}).textContent || '' }));
    console.log(`${geraet} Klick 1985/86 → ${fin.y}, Reiter "${fin.tab}", ${fin.spiel}`);
    soll(fin.y === '1985/86' && /Finale/.test(fin.tab || '') && /Bayern.*5 : 2.*Stuttgart/.test(fin.spiel || ''), `${geraet} Finale 1985/86 falsch: ${JSON.stringify(fin)}`);
    await page.screenshot({ path: `${OUT}${geraet}-finale-1986.png` });
    // 1. Hauptrunde: 32 Spiele + 1 Wiederholung
    await page.evaluate(() => App.switchPokalTab(0));
    const r1 = await page.$$eval('#content .pokal-match', e => e.length);
    soll(r1 === 33, `${geraet} 1985/86 1. Hauptrunde: ${r1} statt 33 Spiele`);

    // 3) Ewige in der historischen Saison: Stand nach 1985/86, Bayern 8 Titel, Feld 64 hervorgehoben
    await page.evaluate(() => App.switchPokalTab(-2));
    z = await zeile('FC Bayern München');
    const st = await page.evaluate(() => ({ akt: document.querySelectorAll('#content tr.akt').length, kopf: document.querySelector('#content .akt-leg')?.parentElement?.textContent.replace(/\s+/g, ' ').trim() }));
    console.log(`${geraet} Ewige 1985/86: Bayern ${z && z.slice(0, 6).join(' | ')} | ${st.akt} hervorgehoben | ${st.kopf}`);
    soll(z && z[5] === '8', `${geraet} Ewige 1985/86: Bayern ${z && z[5]} statt 8 Titel`);
    soll(st.akt === 64, `${geraet} Ewige 1985/86: ${st.akt} statt 64 hervorgehoben`);
    soll(z && z[12] === '1985/86', `${geraet} Ewige 1985/86: Zuletzt Bayern ${z && z[12]}`);
    await page.screenshot({ path: `${OUT}${geraet}-ewige-1986.png` });

    // 4) Blättern ◀ (1984/85) und zurück zur laufenden Saison
    await page.evaluate(() => App._pokalHistNav(-1));
    const y2 = await page.evaluate(() => App.pokalHistY);
    soll(y2 === '1984/85', `${geraet} ◀ landet bei ${y2}`);
    await page.evaluate(() => App._pokalHistZu());
    const zu = await page.evaluate(() => ({ y: App.pokalHistY, leiste: !!document.querySelector('.pk-hist-leiste') }));
    soll(!zu.y && !zu.leiste, `${geraet} „Laufende Saison“ verlässt die Historie nicht`);
    const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (breit > 1) befund.push(`${geraet}: Seite ${breit}px breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
