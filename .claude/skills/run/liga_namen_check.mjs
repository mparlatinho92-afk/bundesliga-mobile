// Damalige Namen der Spiel-Ligen (Nutzer 30.10.2026: 2009/10 hieß die Oberliga Niederrhein „Niederrheinliga“), template.html,
// Desktop + Handy. Geprüft: Leiste über der Tabelle (gewählte Liga + Nachbarn, alle drei Namen), Kopf der Seite, Pyramide;
// dazu die Gegenrichtung: ab der Umbenennung wieder der heutige Name.
//   node .claude/skills/run/liga_namen_check.mjs [port]       Screenshot nach docs/liga-namen/
//   node .claude/skills/run/liga_namen_check.mjs --selbsttest  HIST_EXT.ligaNamen entfernt – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/liga-namen/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const FAELLE = [   // [lid, Saison, Name, darf nicht]
    ['5-11', '2009/10', 'Niederrheinliga', /Oberliga Niederrhein/],
    ['5-11', '2005/06', 'Verbandsliga Niederrhein', /Oberliga Niederrhein|Niederrheinliga/],
    ['5-11', '2013/14', 'Oberliga Niederrhein', /Niederrheinliga/],
    ['6-21', '2005/06', 'Verbandsliga Berlin', /Berlin-Liga/],
    ['6-7', '2005/06', 'Landesliga Hessen Nord', /Verbandsliga Hessen Nord/],
    ['6-14', '2007/08', 'Bezirksoberliga Weser-Ems', /Landesliga Weser-Ems/],
    ['5-5', '2006/07', 'Hamburg-Liga', /Oberliga Hamburg/],
];
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    if (SELBST) await page.evaluate(() => { delete HIST_EXT.ligaNamen; });
    for (const [lid, y, name, nicht] of FAELLE) {
        await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
        await page.waitForTimeout(2000);
        const r = await page.evaluate(lid => {
            const b = document.querySelector(`.navleiste .navknopf[data-lid="${lid}"]`);
            return b ? { full: b.getAttribute('data-full'), mid: b.getAttribute('data-mid'), kurz: b.getAttribute('data-short'), txt: b.textContent.trim(),
                kopf: document.body.innerText.slice(0, 600) } : null;
        }, lid);
        soll(r, `${geraet} ${lid} ${y}: Liga nicht in der Leiste`);
        if (!r) continue;
        soll(r.full === name, `${geraet} ${lid} ${y}: Leiste „${r.full}“ statt „${name}“`);
        soll(![r.mid, r.kurz, r.txt].some(t => nicht.test(t)), `${geraet} ${lid} ${y}: Mittel-/Kurzname heutig („${r.mid}“ / „${r.kurz}“ / „${r.txt}“)`);
        if (!SELBST && geraet === 'handy' && lid === '5-11' && y === '2009/10') await page.screenshot({ path: `${OUT}handy-niederrheinliga-2009-10.png` });
        if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} ${lid} ${y}: Seite breiter als der Bildschirm`);
    }
    // Pyramide 2009/10: Knoten 5-11 heißt Niederrheinliga, Kürzel ebenfalls damalig
    const k = await page.evaluate(async () => {
        const D = App._pyrBaue('2009/10', await App._pyrTabellen('2009/10'), await App._pyrTabellen('2010/11'), await App._pyrTabellen('2008/09'), 'eng');
        const x = D.knoten.find(n => n.lid === '5-11'); return x ? { name: x.name, kurz: x.kurz } : null;
    });
    soll(k && k.name === 'Niederrheinliga' && !/Oberliga/.test(k.kurz), `${geraet}: Pyramide 2009/10 zeigt ${JSON.stringify(k)}`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 5).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: ohne ligaNamen fällt die Prüfung durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
