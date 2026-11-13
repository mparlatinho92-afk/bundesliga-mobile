// Pyramide historischer Saisons (Nutzer 29.10.2026: „NRW-Liga hat keinen Unterbau obwohl verfügbar. Verbandsliga Hamburg hat
// 2001/2002 als Unterbau Rheinlandliga, Brandenburgliga, Berlin-Liga, Westfalenliga 1/2“), template.html, Desktop + Handy.
// Ursache: fussball.de-Tabellen mit fe:1 spielten damals eine Ebene anders (vor 2008 höher, 2008–12 tiefer) – die Pyramide
// nahm die heutige Ebene; ohne Zuordnung hing sie Ligen an die ERSTE Liga der Ebene darüber; Nordost Nord/Süd nach „Region“.
// Geprüft wird die Leiste über der Tabelle (echter Saison-Sprung wie aus Ligen-Chronik/Steckbrief) und die Karte selbst.
//   node .claude/skills/run/pyramide_hist_check.mjs [port]       Screenshots nach docs/pyramide-hist/
//   node .claude/skills/run/pyramide_hist_check.mjs --selbsttest  app/pyramide.js aus v0.8.228.50 – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/pyramide-hist/';
fs.mkdirSync(OUT, { recursive: true });
const ALT = SELBST ? execSync('git show 39a1195:app/pyramide.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) : null;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const FAELLE = [   // [lid, Saison, ↑ muss, ↓ muss (alle), ↓/↔ darf nicht, Geschwister dürfen nicht]
    ['5-5', '2001/02', /Oberliga Nord/, [], /Rheinland|Brandenburg|Berlin|Westfalen/, null],
    ['h5-nrw-oberliga', '2009/10', /Regionalliga West/, ['Niederrheinliga', 'Mittelrheinliga', 'Westfalenliga Staffel 1', 'Westfalenliga Staffel 2'], null, /Niederrhein|Mittelrhein/],   // 2009/10 hieß die Oberliga Niederrhein Niederrheinliga (liga_namen_check)
    ['6-2', '2001/02', /Oberliga Südwest/, ['Bezirksliga Rheinland'], null, /Hamburg/],
    ['6-20', '2001/02', /Oberliga Nordost Nord/, [], null, /Sachsen|Thüringen/],
    ['6-23', '2005/06', /Oberliga Nordost Süd/, [], null, /Hessen/],
];
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    if (ALT) await page.route('**/app/pyramide.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ALT }));
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    for (const [lid, y, oben, unten, untenNicht, sibNicht] of FAELLE) {
        await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
        await page.waitForTimeout(2200);
        const nav = await page.evaluate(() => [...document.querySelectorAll('.navleiste .navrow')].map(r => [...r.querySelectorAll('.navknopf')].map(b => ({ t: b.getAttribute('data-full') || b.textContent.trim(), cls: b.textContent.trim().slice(0, 1) }))));
        const flach = nav.flat(), up = flach.filter(b => b.cls === '↑').map(b => b.t), dn = flach.filter(b => b.cls === '↓').map(b => b.t), sib = flach.filter(b => !/[↑↓]/.test(b.cls)).map(b => b.t);
        soll(up.some(t => oben.test(t)), `${geraet} ${lid} ${y}: ↑ ${JSON.stringify(up)} statt ${oben}`);
        unten.forEach(u => soll(dn.some(t => t.includes(u)), `${geraet} ${lid} ${y}: ↓ ohne „${u}“ (${JSON.stringify(dn)})`));
        if (untenNicht) soll(!dn.some(t => untenNicht.test(t)), `${geraet} ${lid} ${y}: ↓ mit fremden Ligen ${JSON.stringify(dn.filter(t => untenNicht.test(t)))}`);
        if (sibNicht) soll(!sib.some(t => sibNicht.test(t)), `${geraet} ${lid} ${y}: daneben fremde Ligen ${JSON.stringify(sib.filter(t => sibNicht.test(t)))}`);
        if (!SELBST && geraet === 'handy' && (lid === 'h5-nrw-oberliga' || lid === '5-5')) await page.screenshot({ path: `${OUT}handy-${lid}-${y.replace('/', '-')}.png` });
        if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} ${lid} ${y}: Seite breiter als der Bildschirm`);
    }
    // Karte 2001/02 und 2009/10: keine Liga doppelt (Platzhalter des Vorgängers neben dem Nachfolger), alle Saisons ohne Fehler
    const k = await page.evaluate(async () => {
        const f = n => n === 1999 ? '1999/2000' : `${n}/${String(n + 1).slice(-2)}`, aus = { doppelt: [], fehler: [] };
        for (let sy = 1963; sy <= 2024; sy++) {
            try {
                const D = App._pyrBaue(f(sy), await App._pyrTabellen(f(sy)), await App._pyrTabellen(f(sy + 1)), await App._pyrTabellen(f(sy - 1)), 'eng');
                const n = D.knoten.filter(x => !x.fill).map(x => App._archLeagueName(x.lid, sy) + (x.g ? ' ' + x.g : ''));
                n.filter((x, i) => n.indexOf(x) !== i).forEach(x => aus.doppelt.push(f(sy) + ' ' + x));
            } catch (e) { aus.fehler.push(f(sy) + ': ' + e.message); }
        }
        return aus;
    });
    soll(!k.fehler.length, `${geraet}: Pyramide wirft ${k.fehler.slice(0, 3).join(' | ')}`);
    soll(!k.doppelt.some(x => /^200[01]\/0\d (Verbandsliga Berlin|Berlin-Liga|Verbandsliga Brandenburg|Brandenburgliga)$/.test(x)), `${geraet}: Liga doppelt in der Karte ${k.doppelt.slice(0, 4).join(' | ')}`);
    if (!SELBST && geraet === 'desktop') { await page.evaluate(() => App.showPyramide('2001/02')); await page.waitForTimeout(2500); await page.screenshot({ path: `${OUT}desktop-karte-2001-02.png` }); }
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 5).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: der alte Code fällt durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
