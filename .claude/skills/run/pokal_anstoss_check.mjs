// DFB-Pokal-Anstoßzeiten im Browser (template.html): Action-Modus mit Pokal, Tiefe 2 (Uhrzeit) und 4 (Konferenz).
// Klickt sich wie der Nutzer durch: Woche-Knopf bis zur 1. Pokalrunde, Pokalansicht, Vorschau-Zeiten, Konferenz.
//   node .claude/skills/run/pokal_anstoss_check.mjs [port]   Screenshots nach docs/pokal-anstoss/
//   ... --selbsttest   Spielzeilen im DOM umgedreht (nur Desktop, ohne Action) – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/pokal-anstoss/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [];
// Blöcke der Pokalansicht lesen: je Partie der Block (Tag, Zeit) aus dem DOM gegen Engine.pokalAnstoss halten,
// Reihenfolge muss chronologisch sein (Nutzerbefund 27.10.2026: Freitagsspiel ganz unten, Sa-Mittag zwischendrin)
const bloecke = page => page.evaluate(() => {
    const r = Engine.pokal.rounds[App.pokalTab], aus = [], fehl = [];
    let tag = '', zeit = '';
    document.querySelectorAll('.pokal-matches > .pm-tag, .pokal-matches > .pm-zeit, .pokal-matches .pokal-match').forEach(el => {
        if (el.classList.contains('pm-tag')) { tag = el.textContent.trim(); return; }
        if (el.classList.contains('pm-zeit')) { zeit = el.textContent.trim().replace(' Uhr', ''); return; }
        const heim = el.querySelector('.pm-home span').textContent.trim();
        const i = r.matches.findIndex(m => (Engine.teams[m.hId] || {}).name === heim), a = Engine.pokalAnstoss(App.pokalTab, i);
        const soll = a ? `${Engine._DAY_LABEL[a.d]}, ${String(a.datum.getDate()).padStart(2, '0')}.${String(a.datum.getMonth() + 1).padStart(2, '0')}.|${a.t}` : '?';
        if (soll !== tag + '|' + zeit) fehl.push(`${heim}: Block ${tag} ${zeit}, Termin ${soll}`);
        aus.push({ tag, zeit, sort: a ? Engine._slotSort(a.d, a.t) : 0 });
    });
    const unsortiert = aus.filter((x, k) => k && x.sort < aus[k - 1].sort).length;
    return { n: aus.length, tage: [...new Set(aus.map(x => x.tag))], slots: new Set(aus.map(x => x.tag + x.zeit)).size, erster: aus[0] && aus[0].tag + ' ' + aus[0].zeit, unsortiert, fehl };
});
const pruefeBloecke = (b, wo) => {
    console.log(`${wo}: ${b.n} Partien, ${b.slots} Blöcke, Tage ${b.tage.join(' / ')}, zuerst ${b.erster}`);
    if (b.n !== 32) befund.push(`${wo}: ${b.n}/32 Partien`);
    if (b.unsortiert) befund.push(`${wo}: ${b.unsortiert} Partien nicht chronologisch`);
    if (b.slots < 5) befund.push(`${wo}: nur ${b.slots} Blöcke`);
    if (!/^Freitag/.test(b.erster || '')) befund.push(`${wo}: erste Partie nicht am Freitag (${b.erster})`);
    b.fehl.slice(0, 3).forEach(f => befund.push(`${wo}: falscher Block – ${f}`));
};
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    for (const depth of [2, 4]) {
        const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
        page.on('pageerror', e => fehler.push(e.message));
        page.on('dialog', d => d.accept());
        await page.goto(`http://localhost:${PORT}/template.html`);
        await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
        await page.evaluate(d => { App.actionCfg = { on: true, leagues: { '1': true }, pokal: true, depth: d }; App._saveActionCfg(); App.updateStatus(); }, depth);
        // bis direkt vor die 1. Pokalrunde normal weiterklicken (Action aus), dann Action an
        const ziel = await page.evaluate(() => { if (!Engine.pokal) Engine.initPokal(); return Engine.pokal.rounds[0].matchday; });
        await page.evaluate(() => { App.actionCfg.on = false; });
        let g = 0;
        while (await page.evaluate(() => Engine.currentMatchday) < ziel - 1 && g++ < 60) { await page.click('#btn-play'); await page.waitForTimeout(150); }
        // OHNE Action-Modus: Termine müssen in der Pokalansicht trotzdem stehen (Nutzerbefund 27.10.2026)
        if (depth === 2) {
            await page.evaluate(() => { App.pokalTab = 0; App.showPokal(); });
            if (SELBST) { await page.evaluate(() => { const c = document.querySelector('.pokal-matches'); [...c.children].reverse().forEach(e => c.appendChild(e)); });
                pruefeBloecke(await bloecke(page), 'Sabotage');
                console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN');
                await browser.close(); process.exit(befund.length ? 0 : 1); }
            pruefeBloecke(await bloecke(page), `${geraet} ohne Action`);
            const st = await page.textContent('.pm-status').catch(() => '');
            if (!/Fr \d\d\.\d\d\. – Mo \d\d\.\d\d\./.test(st)) befund.push(`${geraet} ohne Action: Zeitraum fehlt in "${st}"`);
            await page.screenshot({ path: `${OUT}${geraet}-ohne-action.png` });
        }
        await page.evaluate(() => { App.actionCfg.on = true; App._saveActionCfg(); App.updateStatus(); });
        await page.click('#btn-play');                                   // Action-Spieltag beginnt
        await page.waitForTimeout(400);
        const plan = await page.evaluate(() => (Engine.actionState?.days || []).filter(d => d.pokalRound === 0).map(d => d.label));
        if (!plan.length) befund.push(`${geraet} T${depth}: kein Pokaltag im Action-Plan`);
        // Konferenz offen? erst schließen, dann Pokalansicht Runde 1
        await page.evaluate(() => { App.pokalTab = 0; App.showPokal(); });
        await page.waitForTimeout(300);
        console.log(`${geraet} T${depth}: Plan ${plan.join(' | ')}`);
        pruefeBloecke(await bloecke(page), `   ${geraet} T${depth} Vorschau`);
        await page.screenshot({ path: `${OUT}${geraet}-t${depth}-vorschau.png` });
        // überläuft die Spielzeile auf dem Handy?
        const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ueber > 1) befund.push(`${geraet} T${depth}: Seite ${ueber}px breiter als der Bildschirm`);
        // den Action-Spieltag zu Ende spielen (Klick wie der Nutzer); Konferenz per Weiter-Klicks
        g = 0; let geschossen = false;
        while (await page.evaluate(() => !!Engine.actionState) && g++ < 200) {
            const konf = await page.evaluate(() => document.getElementById('conf-overlay').style.display !== 'none');
            if (konf) {
                if (!geschossen) { geschossen = true; await page.screenshot({ path: `${OUT}${geraet}-t4-konferenz.png` });
                    const kicks = await page.$$eval('#conf-body .conf-kick', els => [...new Set(els.map(e => e.textContent.trim()))]);
                    console.log(`   Konferenz ${await page.textContent('#conf-daylabel')}: Anstoß ${kicks.join(', ') || '(alle laufen)'}`); }
                await page.evaluate(() => { App.confSkip(); App.closeConference(); });
            } else await page.click('#btn-play').catch(() => {});
            await page.waitForTimeout(depth === 4 ? 600 : 150);
        }
        const fertig = await page.evaluate(() => Engine.pokal.rounds[0].played && Engine.pokal.rounds[0].matches.every(m => m.hGoals != null));
        if (!fertig) befund.push(`${geraet} T${depth}: 1. Runde nach dem Action-Spieltag nicht fertig`);
        if (fehler.length) befund.push(`${geraet} T${depth}: JS-Fehler ${fehler.join(' / ')}`);
        await ctx.close();
    }
}
await browser.close();
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
