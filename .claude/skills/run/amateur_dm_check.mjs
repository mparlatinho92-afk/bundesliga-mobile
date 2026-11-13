// Deutsche Amateurmeisterschaft im Steckbrief (app/amateur_dm.js, Nutzer 28.10.2026: „kommt nach ganz unten“), template.html, Desktop + Handy.
//   node .claude/skills/run/amateur_dm_check.mjs [port]       Screenshots nach docs/amateur-dm/
//   node .claude/skills/run/amateur_dm_check.mjs --selbsttest  AMATEUR_DM vor dem Öffnen geleert – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/amateur-dm/';
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
    if (SELBST) await page.evaluate(() => { for (const k in AMATEUR_DM.jahre) delete AMATEUR_DM.jahre[k]; });
    const oeffne = id => page.evaluate(i => { App.showSteckbrief(i); }, id).then(() => page.waitForTimeout(300));
    const abschnitt = () => page.evaluate(() => {
        const el = document.getElementById('sb-amdm');
        if (!el) return null;
        // ganz unten: nach dem Abschnitt folgt im Steckbrief kein weiterer sichtbarer Inhalt
        let n = el, danach = '';
        while (n) { let s = n.nextElementSibling; while (s) { danach += s.textContent.trim(); s = s.nextElementSibling; } n = n.parentElement; if (n && n.classList.contains('modal-content')) break; }
        const r = el.getBoundingClientRect();
        // Textknoten einzeln mit Leerzeichen verbinden – textContent klebt die Flex-Spalten aneinander ("1966Finale1:5gg.")
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), teile = []; while (w.nextNode()) teile.push(w.currentNode.nodeValue.trim());
        return { text: teile.filter(Boolean).join(' ').replace(/\s+/g, ' '), danach: danach.slice(0, 80), rechts: r.right, breite: document.documentElement.clientWidth,
                 ueber: [...el.querySelectorAll('*')].some(e => e.getBoundingClientRect().right > el.getBoundingClientRect().right + 1 && getComputedStyle(e).overflow !== 'hidden') };
    });

    // 1) Hannover 96 II: Meister 1960 (nach Wiederholungsspiel), 1964, 1965; Finale 1966, 1967
    await oeffne('hannover96ii_539');
    const h = await abschnitt();
    console.log(`${geraet} Hannover 96 II: ${h ? h.text.slice(0, 300) : '–'}`);
    soll(h, `${geraet} Hannover 96 II: Abschnitt fehlt`);
    if (h) {
        soll(/3× Meister/.test(h.text) && /2× Finale/.test(h.text), `${geraet} Hannover 96 II: Summe nicht 3× Meister / 2× Finale`);
        soll(/1960 🏆 Meister 1:1 n\.V\., 3:0 gg\. BV Osterfeld/.test(h.text), `${geraet} Hannover 96 II: 1960 nicht 1:1 n.V., 3:0 gg. BV Osterfeld`);
        soll(/1966 Finale 1:5 gg\. SV Werder Bremen II/.test(h.text), `${geraet} Hannover 96 II: 1966 nicht 1:5 gg. Werder II (Sicht des Verlierers)`);
        soll(h.text.indexOf('1967') < h.text.indexOf('1960'), `${geraet} Hannover 96 II: nicht neueste zuerst`);
        soll(!h.danach, `${geraet} Hannover 96 II: nach dem Abschnitt kommt noch „${h.danach}“ – nicht ganz unten`);
        soll(!/hist_/.test(h.text), `${geraet} Hannover 96 II: rohe ID im Text`);
        soll(!/als Hannover 96/.test(h.text), `${geraet} Hannover 96 II: „als Hannover 96 Amateure“ – nur Reserve-Schreibweise, kein Namenswechsel`);
    }
    await page.evaluate(() => document.getElementById('sb-amdm')?.scrollIntoView());
    await page.screenshot({ path: `${OUT}${geraet}-hannover96ii.png` });
    // Klick auf den Finalgegner führt in dessen Steckbrief
    const klick = await page.evaluate(() => { const s = [...document.querySelectorAll('#sb-amdm span[onclick]')].find(e => /Osterfeld/.test(e.textContent)); if (!s) return null; s.click();
        return document.querySelector('.modal-content')?.textContent.includes('BV Osterfeld') && document.getElementById('sb-amdm')?.textContent.includes('1960'); });
    soll(klick, `${geraet} Klick auf BV Osterfeld öffnet nicht dessen Steckbrief mit 1960`);

    // 2) Hombrucher SV: Meister 1958 als Hombrucher FV 09 (damaliger Name)
    await oeffne('hombruchersv_1259');
    const hb = await abschnitt();
    soll(hb && /1958 🏆 Meister 3:1 gg\. ASV Bergedorf 85/.test(hb.text) && /als Hombrucher FV 09/.test(hb.text), `${geraet} Hombruch: 1958 Meister als Hombrucher FV 09 fehlt (${hb && hb.text.slice(0, 160)})`);
    if (hb && (hb.rechts > hb.breite + 1)) befund.push(`${geraet} Hombruch: Abschnitt ragt über den Bildschirm`);
    await page.screenshot({ path: `${OUT}${geraet}-hombruch.png` });

    // 2b) Eigener Einstieg: letzter Eintrag der Seitenleiste, vier Reiter, Sprung aus dem Steckbrief
    const breitP = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const inhalt = () => page.evaluate(() => { const el = document.getElementById('amdm-inhalt'); if (!el) return '';
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t = []; while (w.nextNode()) t.push(w.currentNode.nodeValue.trim()); return t.filter(Boolean).join(' '); });
    await page.evaluate(() => { document.getElementById('modal').style.display = 'none'; });
    const sb = await page.evaluate(() => { const it = [...document.querySelectorAll('.league-item')]; const l = it[it.length - 1]; if (!l || !/Amateurmeisterschaft/.test(l.textContent)) return null; l.click();
        return document.getElementById('league-title')?.textContent || ''; });
    soll(sb && /Amateurmeisterschaft/.test(sb), `${geraet} Seitenleiste: Amateurmeisterschaft nicht letzter Eintrag oder Klick ohne Wirkung`);
    for (const [tab, y, muster, was] of [
        ['sieger', null, /1958 Hombrucher FV 09 3:1 ASV Bergedorf 85[\s\S]*REKORDSIEGER 3× /, 'Sieger 1958 / Rekordsieger'],
        ['teilnahmen', null, /Hannover 96 Amateure|Hannover 96 II 5 3 5/, 'Teilnahmen Hannover 96 II = 5'],
        ['teilnehmer', '1996', /Vizemeister und Dritte[\s\S]*Tennis Borussia Berlin Verlierer Aufstiegsrelegation/, 'Teilnehmer 1996 mit Grund'],
        ['teilnehmer', '1967', /Holstein Kiel \(Amateure\)/, 'Teilnehmer 1967 Reserve mit Zusatz'],
        ['runden', '1977', /FINALE[\s\S]*1:0 Hinspiel[\s\S]*2:2 Rückspiel/, 'Runden 1977 Finale Hin/Rück'],
        ['runden', '1953', /VORRUNDE · GRUPPE 1 Pl Verein S U N Tore 1 VfB 03 Bielefeld 6 0 0 22:6/, 'Runden 1953 Gruppentabelle']]) {
        await page.evaluate(([t, j]) => App.showAmateurDM(t, j), [tab, y]);
        const tx = await inhalt();
        soll(muster.test(tx), `${geraet} ${was} fehlt (${tx.slice(0, 200)})`);
        soll(!/hist_|undefined/.test(tx), `${geraet} ${was}: rohe ID/undefined im Text`);
        if ((await breitP()) > 1) befund.push(`${geraet} ${tab} ${y || ''}: Seite breiter als der Bildschirm`);
        await page.screenshot({ path: `${OUT}${geraet}-seite-${tab}${y ? '-' + y : ''}.png`, fullPage: false });
    }
    await oeffne('hannover96ii_539');
    await page.evaluate(() => [...document.querySelectorAll('#sb-amdm b[onclick]')].find(b => b.textContent === '1960')?.click());
    const sprung = await page.evaluate(() => ({ modal: document.getElementById('modal').style.display, y: App.amDmY, tab: App.amDmTab }));
    soll(sprung.modal === 'none' && sprung.y === '1960' && sprung.tab === 'runden', `${geraet} Klick auf 1960 im Steckbrief springt nicht in die Runden 1960 (${JSON.stringify(sprung)})`);

    // 3) Ein Verein ohne Teilnahme bekommt keinen Abschnitt
    await oeffne('fcbayernmuenchen_0');
    soll(!(await abschnitt()), `${geraet} Bayern (nie dabei) hat einen Abschnitt`);
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet}: Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
