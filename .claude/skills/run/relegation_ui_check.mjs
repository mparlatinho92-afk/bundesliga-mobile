// Relegation als Teil der Saison (Nutzer 15.11.2026) in der Oberfläche: Block im Spiel-Feed NUR der beteiligten Ligen (Bundesliga +
// 2. Liga: Relegation Bundesliga; 2. + 3. Liga: Relegation 2. Bundesliga; die zwei Regionalligen: Aufstiegsspiele) mit Hin- und
// Rückspiel und Gesamtstand; Kalenderzeile „Relegation“ – die Paarung zeigt der Klick nur, wenn die gewählte Liga beteiligt ist.
// Desktop + Handy, Bilder docs/relegation/.
//   node .claude/skills/run/relegation_ui_check.mjs              gegen template.html
//   node .claude/skills/run/relegation_ui_check.mjs --selbsttest gegen index.html – muss durchfallen
import { chromium } from 'playwright';
import * as fs from 'node:fs';
fs.mkdirSync('docs/relegation', { recursive: true });
const SELBST = process.argv.includes('--selbsttest');
const URL = `http://localhost:3334/${SELBST ? 'index.html' : 'template.html'}`;
const b = await chromium.launch(), befund = [];
const ok = (n, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${n}: ${txt}`); if (!bed) befund.push(n + ': ' + txt); };
for (const [name, opt] of [['Desktop', { viewport: { width: 1300, height: 900 } }], ['Handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const page = await (await b.newContext(opt)).newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 1000, null, { timeout: 90000 });
    const r = await page.evaluate(() => {
        const K = Engine.kalender;
        if (!K || !(K.rele || []).length) return { fehlt: true };
        const bl = K.rele.find(x => x.k === 'bl'), rl = K.rele.find(x => x.k === 'rl');
        while (Engine.currentMatchday < Math.max(bl.t[1], rl.t[1])) Engine.playNextMatchday();
        const txt = lid => { App.matchdayViewIdx = null; App.viewHistoryOffset = null; App.resultsCollapsed = false; App.loadLeague(lid); return document.getElementById('content').innerText; };
        const t1 = txt('1'), t3 = txt('3'), t5 = txt('5-1'), trl = txt(rl.l[0]), trlAnders = txt(Object.keys(Engine.leagues).find(l => Engine.leagues[l].level === 4 && !rl.l.includes(l)));
        const d = Engine.relegation.d.bl;
        return { t1, t3, t5, trl, trlAnders, hoch: Engine.teams[d.hoch].name, tief: Engine.teams[d.tief].name, bl: bl.t, rlL: rl.l };
    });
    if (r.fehlt) { ok(name, false, 'keine Relegationstermine im Kalender'); continue; }
    ok(`${name} Bundesliga`, r.t1.includes('Relegation Bundesliga') && r.t1.includes('Hinspiel') && r.t1.includes('Rückspiel') && r.t1.includes('Gesamt') && r.t1.includes(r.hoch) && r.t1.includes(r.tief),
        (r.t1.match(/⚔[^\n]*/) || ['(kein Block)'])[0]);
    ok(`${name} 3. Liga`, r.t3.includes('Relegation 2. Bundesliga ·') && !r.t3.includes('Relegation Bundesliga ·'), (r.t3.match(/⚔[^\n]*/g) || ['(kein Block)']).join(' | '));
    const BLOCK = /⚔ (Relegation Bundesliga|Relegation 2\. Bundesliga|Aufstiegsspiele 3\. Liga) ·/;
    ok(`${name} unbeteiligt`, !BLOCK.test(r.t5) && !BLOCK.test(r.trlAnders), 'Oberliga und nicht beteiligte Regionalliga ohne Block');
    ok(`${name} Regionalliga`, r.trl.includes('Aufstiegsspiele 3. Liga'), (r.trl.match(/⚔[^\n]*/) || ['(kein Block)'])[0]);
    await page.evaluate(() => App.loadLeague('1'));
    await page.evaluate(() => { const e = [...document.querySelectorAll('#content div')].find(x => x.innerText && x.innerText.startsWith('⚔')); if (e) e.scrollIntoView(); });
    await page.screenshot({ path: `docs/relegation/feed_${name}.png` });
    // Kalender: Zeile + Klick aufs Hinspiel – mit Bundesliga gewählt Paarung, mit Oberliga gewählt keine Namen
    const kal = await page.evaluate(([t, hoch]) => {
        const klick = lid => { App.activeLeague = lid; App._kalOffen = false; App.kalToggle({ stopPropagation() {} });
            const tr = document.querySelector('#kal-panel tr[data-c="rele"]'); if (!tr) return null;
            tr.querySelector(`td[data-t="${t}"] span`).click(); const s = document.getElementById('kal-info').innerText; App.kalToggle({ stopPropagation() {} }); return s; };
        return { bl: klick('1'), ol: klick('5-1') };
    }, [r.bl[0], r.hoch]);
    ok(`${name} Kalender beteiligt`, kal.bl && kal.bl.includes(r.hoch), kal.bl ? kal.bl.replace(/\s+/g, ' ') : 'Zeile fehlt');
    ok(`${name} Kalender unbeteiligt`, kal.ol && !kal.ol.includes(r.hoch) && kal.ol.includes('Hinspiel'), kal.ol ? kal.ol.replace(/\s+/g, ' ') : 'Zeile fehlt');
    await page.evaluate(() => { App.activeLeague = '1'; App._kalOffen = false; App.kalToggle({ stopPropagation() {} }); });
    await page.screenshot({ path: `docs/relegation/kalender_${name}.png` });
    if (fehler.length) ok(`${name} JS-Fehler`, false, [...new Set(fehler)].join(' / '));
}
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? `BEFUND (${befund.length})` : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
