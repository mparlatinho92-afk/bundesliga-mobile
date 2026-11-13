// Globale Suche ohne Doppeleinträge (FIXES_OFFEN „TuS Chlodwig Zülpich hat in der Suche zwei Einträge“), template.html, Desktop + Handy:
// historische IDs, die heute Spielverein sind (HISTORIC_CLUBS + GAME_DATA.teams), erscheinen je Namensform nur einmal,
// ein abweichender Altname als „früher · <heutiger Name>“ statt „ehemaliger Verein“. Getippt wird ins echte Suchfeld.
//   node .claude/skills/run/suche_dubletten_check.mjs [port]       Screenshots nach docs/suche-dubletten/
//   node .claude/skills/run/suche_dubletten_check.mjs --selbsttest  app/core.js aus git HEAD (alter Code) – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/suche-dubletten/';
fs.mkdirSync(OUT, { recursive: true });
const ALT = SELBST ? execSync('git show HEAD:app/core.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) : null;
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
    await page.waitForFunction(() => typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS.hist_fa_tuschlodwigzuelpich, null, { timeout: 60000 });
    // alle Spiel-IDs, die zugleich historische Vereine sind
    const doppel = await page.evaluate(() => Object.keys(GAME_DATA.teams).filter(id => HISTORIC_CLUBS[id] !== undefined)
        .map(id => ({ id, name: GAME_DATA.teams[id].name, alt: HISTORIC_CLUBS[id] })));
    soll(doppel.length >= 10, `${geraet} nur ${doppel.length} Spiel-IDs in HISTORIC_CLUBS gefunden – Prüfung greift nicht`);
    const suche = async q => {
        // Suchfeld wie der Nutzer öffnen (Lupe tippen), falls zu – auf dem Handy ist es eingeklappt
        if (!(await page.evaluate(() => document.getElementById('gs-wrap')?.classList.contains('open')))) {
            await page.click('#gs-icon'); await page.waitForTimeout(300);
        }
        await page.fill('#gs-input', '');
        await page.type('#gs-input', q);
        await page.waitForTimeout(150);
        // Zeile: [Typ-Chip] [div: Name-div, Unterzeile-div] [Wappen]
        return page.evaluate(() => [...document.querySelectorAll('#gs-list div[onclick]')].map(d => {
            const txt = d.querySelector(':scope > div')?.children || [];
            return { id: (d.getAttribute('onclick').match(/'verein','(.+?)'\)/) || [])[1],
                     label: txt[0]?.textContent || '', sub: txt[1]?.textContent || '' };
        }));
    };
    for (const v of doppel) {
        const r = await suche(v.name);
        const n = r.filter(x => x.id === v.id && x.label.toLowerCase() === v.name.toLowerCase()).length;
        soll(n === 1, `${geraet} „${v.name}“ (${v.id}) ${n}× in der Suche`);
        const ehem = r.filter(x => x.id === v.id && x.sub === 'ehemaliger Verein');
        soll(!ehem.length, `${geraet} ${v.id} als „ehemaliger Verein“ gelistet (${ehem.map(x => x.label).join(', ')})`);
        const sk = r.map(x => x.id + '|' + x.label.toLowerCase());
        soll(sk.length === new Set(sk).size, `${geraet} Suche „${v.name}“: doppelte Zeilen`);
    }
    // Altname eines heutigen Spielvereins: früher · heutiger Name
    const bi = await suche('Arminia Bielefeld Amateure');
    soll(bi.some(x => x.id === 'hist_fa_arminiabielefelda' && x.sub === 'früher · DSC Arminia Bielefeld II'),
        `${geraet} „Arminia Bielefeld Amateure“ nicht als „früher · DSC Arminia Bielefeld II“ (${JSON.stringify(bi.slice(0, 3))})`);
    // Klick öffnet den Steckbrief des Spielvereins
    const zr = await suche('Chlodwig Zülpich');
    soll(zr.filter(x => x.id === 'hist_fa_tuschlodwigzuelpich').length === 1, `${geraet} „Chlodwig Zülpich“: ${zr.length} Treffer ${JSON.stringify(zr)}`);
    if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-zuelpich.png` });
    await page.click('#gs-list div[onclick*="hist_fa_tuschlodwigzuelpich"]');
    await page.waitForTimeout(1200);
    const sb = await page.evaluate(() => document.querySelector('.modal-content')?.textContent || '');
    soll(/TuS Chlodwig Zülpich/.test(sb), `${geraet} Klick auf Zülpich öffnet keinen Steckbrief`);
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) befund.forEach(b => console.log("  " + b));
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: der alte Code fällt durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
