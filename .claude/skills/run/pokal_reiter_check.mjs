// Pokal-Reiter wie bei den Ligen + alle Spalten der Ewigen Tabelle (Nutzer 31.10.2026). Nach einer durchgerechneten Saison,
// Handy (412) und kleines Desktop-Fenster (1000 – dort waren die letzten Runden ohne Scrollbalken unerreichbar):
//   - Zeile 1: Saison | Ewige Tabelle | 🏆 Sieger | Rekorde (+ Aufsteiger), einzeilige Knöpfe, KLICK auf „Saison“ → Runden-Leiste
//   - gewählte Runde (Finale) ganz sichtbar; Desktop: ‹ zurück blättert, › wieder vor, Klick auf die erste Runde wirkt
//   - Ewige Tabelle: alle Spalten sichtbar (auch Handy), Reihenfolge wie die Ligen
//   - historische DFB-Pokal-Saison (1985/86): dieselben Reiter, unter „Saison“ die Runden von damals
//   node .claude/skills/run/pokal_reiter_check.mjs [port]
//   node .claude/skills/run/pokal_reiter_check.mjs --selbsttest    pokal.js/amateurpokal.js/template.html aus git HEAD – muss durchfallen
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/pokal-reiter/';
const git = f => execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 });
const KOPF = { dfb: 'Pl.|||Mannschaft|Jahre|Titel|Sp.|G.|U.|V.|Pkt.|Pkt/Sp|Zuletzt', ama: 'Pl.||Mannschaft|Jahre|Titel|Sp.|G.|U.|V.|Pkt.|Pkt/Sp' };
const OBEN = { dfb: 'Saison|Ewige Tabelle|🏆 Sieger|Rekorde', ama: 'Saison|Ewige Tabelle|🏆 Sieger|Rekorde|Aufsteiger' };
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }],
                             ['desktop', { viewport: { width: 1000, height: 760 } }]]) {
    const page = await (await browser.newContext(opt)).newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    if (SELBST) for (const f of ['app/pokal.js', 'app/amateurpokal.js', 'template.html'])
        await page.route('**/' + f, r => r.fulfill({ status: 200, contentType: f.endsWith('.js') ? 'application/javascript' : 'text/html', body: git(f) }));
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    await page.evaluate(() => { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.fastMode = false; });
    const tippe = async loc => geraet === 'handy' ? loc.tap() : loc.click();
    const knopf = text => page.locator('.pk-oben button', { hasText: text }).first();
    for (const [pk, go] of [['dfb', () => { App.showPokal(); App.switchPokalTab(-2); }], ['ama', () => { App.showAmateurpokal(); App.switchAmateurTab(-2); }],
                            ['hist', () => { App.showPokal(); App._pokalHistGo('1985/86'); App.switchPokalTab(-2); }]]) {
        const tag = `${geraet} ${pk}`;
        await page.evaluate(go); await page.waitForTimeout(300);
        const oben = await page.evaluate(() => [...document.querySelectorAll('.pk-oben button')].map(b => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height })));
        soll(oben.map(b => b.t).join('|') === OBEN[pk === 'ama' ? 'ama' : 'dfb'], `${tag}: Knöpfe „${oben.map(b => b.t).join('|')}“`);
        soll(oben.every(b => b.h > 0 && b.h < 40), `${tag}: Knöpfe nicht einzeilig (${oben.map(b => Math.round(b.h)).join(',')} px)`);
        // Ewige Tabelle: alle Spalten da und sichtbar
        const kopf = await page.evaluate(() => [...document.querySelectorAll('#content table.ptbl thead th')].map(th => ({ t: th.textContent.replace(/[▲▼]/g, '').trim(), v: getComputedStyle(th).display !== 'none' && th.getBoundingClientRect().width > 0 })));
        soll(kopf.map(k => k.t).join('|') === KOPF[pk === 'ama' ? 'ama' : 'dfb'], `${tag}: Spalten „${kopf.map(k => k.t).join('|')}“`);
        soll(kopf.length && kopf.every(k => k.v), `${tag}: ausgeblendete Spalten ${kopf.filter(k => !k.v).map(k => k.t).join(',')}`);
        soll(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), `${tag}: Seite breiter als der Bildschirm`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-${pk}-ewige.png` });
        // „Saison“ anklicken → Runden-Leiste, jüngste Runde (Finale) gewählt und ganz im Bild
        if (!(await knopf('Saison').count())) { befund.push(`${tag}: kein Knopf „Saison“`); continue; }
        await tippe(knopf('Saison')); await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
            const l = document.querySelector('.pk-runden .pokal-tabs'); if (!l) return null;
            const a = l.querySelector('.active'), lr = l.getBoundingClientRect(), ar = a && a.getBoundingClientRect();
            return { n: l.children.length, aktiv: a && a.textContent.trim(), letzte: l.lastElementChild.textContent.trim(),
                ganz: !!ar && ar.left >= lr.left - 1 && ar.right <= lr.right + 1, scroll: l.scrollLeft, max: l.scrollWidth - l.clientWidth };
        });
        if (!r) { befund.push(`${tag}: nach „Saison“ keine Runden-Leiste`); continue; }
        soll(r.aktiv === 'Finale' && r.letzte === 'Finale', `${tag}: gewählt „${r.aktiv}“, letzte „${r.letzte}“ statt Finale`);
        soll(r.ganz, `${tag}: gewählte Runde nicht ganz im Bild (scroll ${r.scroll}/${r.max})`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-${pk}-saison.png` });
        if (geraet === 'desktop' && r.max > 0) {
            const pf = page.locator('.pk-runden .pk-pfeil');
            soll(await pf.first().isVisible(), `${tag}: ‹ nicht sichtbar`);
            for (let k = 0; k < 6; k++) { await pf.first().click(); await page.waitForTimeout(250); }
            const s0 = await page.evaluate(() => document.querySelector('.pk-runden .pokal-tabs').scrollLeft);
            soll(s0 === 0, `${tag}: ‹ blättert nicht an den Anfang (${s0})`);
            await pf.last().click(); await page.waitForTimeout(400);
            const s1 = await page.evaluate(() => document.querySelector('.pk-runden .pokal-tabs').scrollLeft);
            soll(s1 > 0, `${tag}: › blättert nicht`);
        }
        // erste Runde anklicken (über die echte Leiste) → bleibt in „Saison“, Runde gewählt
        await page.evaluate(() => { const l = document.querySelector('.pk-runden .pokal-tabs'); l.style.scrollBehavior = 'auto'; l.scrollLeft = 0; });
        const erste = page.locator('.pk-runden .pokal-tab-btn').first(), et = (await erste.textContent()).trim();
        await tippe(erste); await page.waitForTimeout(300);
        const a2 = await page.evaluate(() => { const a = document.querySelector('.pk-runden .pokal-tab-btn.active'); return a && a.textContent.trim(); });
        soll(a2 === et, `${tag}: Klick auf „${et}“ → gewählt „${a2}“`);
    }
    fehler.forEach(e => befund.push(`${geraet} JS-Fehler: ${e}`));
}
await browser.close();
if (befund.length) { console.log('BEFUND\n  ' + befund.join('\n  ')); process.exit(1); }
console.log('Alles gruen (DFB-Pokal, Amateurpokal, DFB-Pokal 1985/86 – Handy + Desktop 1000 px)');
