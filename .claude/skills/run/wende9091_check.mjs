// Liga-Lücke 1990/91 (01.11.2026, Nutzer „weg a nehmen“): Landes-/Verbandsligen der neuen Länder 1990/91 (Ebene 3, eigene ID) und
// Bezirksliga Cottbus/Dresden 1990/91 (fussball-ddr.de). Archiv in template.html, Desktop + Handy, Klick auf das Ziel:
//   Bezirksliga Erfurt 1989/90: Funkwerk Kölleda → „➔ Qualifiziert für Landesliga Thüringen“ (gelb), Klick → Landesliga Thüringen 1990/91
//   Landesliga Thüringen 1990/91: Meister FV Zeulenroda → „➔ Oberliga Nordost Süd“ (Eingliederung 1991, wie die Bezirksligen), wer 1991/92 in der Landesliga spielt, ohne Hinweis
//   Bezirksliga Cottbus 1989/90: Chemie Döbern bleibt (kein Hinweis), Tabelle 1990/91 hat 14 Zeilen
//   in den DDR-Ligen 1989/90 höchstens 40 (Gera 1990/91 fehlt in allen Quellen, Oberliga-Reserven 1989 aufgelöst) „?“/„↘“ (vorher 71)
//   node .claude/skills/run/wende9091_check.mjs [--selbsttest]   (Selbsttest: history_ext.js + league.js aus git HEAD – muss durchfallen)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest'), PORT = 3334;
const git = f => execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 });
const bef = [], soll = (ok, t) => { if (!ok) bef.push(t); };
const b = await chromium.launch();
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                          ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const p = await (await b.newContext(opt)).newPage(), err = [];
    p.on('pageerror', e => err.push(e.message)); p.on('dialog', d => d.accept());
    if (SELBST) for (const f of ['app/league.js', 'app/history_ext.js']) await p.route('**/' + f, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: git(f) }));
    await p.goto(`http://localhost:${PORT}/template.html`);
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    const zeige = async (lid, y) => {
        await p.evaluate(() => document.querySelectorAll('.ltab').forEach(t => t.dataset.alt = '1'));
        try { await p.evaluate(([l, s]) => App._sbSaisonGo(l, s), [lid, y]); } catch (e) { bef.push(`${art} ${lid} ${y}: nicht aufrufbar (${String(e.message).split('\n')[0]})`); return []; }
        await p.waitForFunction(() => document.querySelector('.ltab:not([data-alt]) tbody tr'), null, { timeout: 15000 }).catch(() => {});
        return p.evaluate(() => [...document.querySelectorAll('.ltab:not([data-alt]) tbody tr')].map(tr => ({
            pl: parseInt(tr.querySelector('td').innerText), name: (tr.querySelector('.tmn') || {}).textContent?.trim(),
            txt: ((tr.querySelector('.itxt') || {}).textContent || '').trim(), kurz: ((tr.querySelector('.iarr') || {}).textContent || '').trim(), gelb: tr.classList.contains('row-quali') })));
    };
    let z = await zeige('h3d-erfurt-bezirksliga', '1989/90');
    const k = z.find(r => /Kölleda/.test(r.name));
    soll(k && /^➔ Qualifiziert für Landesliga Thüringen/.test(k.txt) && k.gelb, `${art} Erfurt 1989/90 Kölleda: ${JSON.stringify(k)}`);
    if (art === 'handy') soll(k && /^➔/.test(k.kurz), `handy Kölleda Kurzform: ${k && k.kurz}`);
    if (k && /Qualifiziert/.test(k.txt)) {
        await p.locator('.ltab:not([data-alt]) tbody tr', { hasText: 'Kölleda' }).first().locator(art === 'handy' ? '.iarr' : '.itxt').click();
        await p.waitForTimeout(1200);
        const st = await p.evaluate(() => ({ lid: App.activeLeague, y: App.viewArchivedSeason && App.viewArchivedSeason.y }));
        soll(st.lid === 'h3d-thueringen-landesliga' && st.y === '1990/91', `${art} Klick Kölleda → ${JSON.stringify(st)}`);
    }
    z = await zeige('h3d-thueringen-landesliga', '1990/91');
    soll(z.length === 14, `${art} Landesliga Thüringen 1990/91: ${z.length} Zeilen`);
    const m = z.find(r => r.pl === 1);
    soll(m && /Zeulenroda/.test(m.name) && /^(▲|➔) (NOFV-)?Oberliga/.test(m.txt), `${art} Landesliga Thüringen 1990/91 Meister: ${JSON.stringify(m)}`);
    soll(!z.some(r => /Verbleib|Rückzug/.test(r.txt) && r.pl < 12), `${art} Landesliga Thüringen 1990/91: ${z.filter(r => r.txt).map(r => r.pl + ' ' + r.txt).join(' | ')}`);
    z = await zeige('h3d-cottbus-bezirksliga', '1989/90');
    const d = z.find(r => /Döbern/.test(r.name));
    soll(d && d.txt === '', `${art} Cottbus 1989/90 Döbern: ${JSON.stringify(d)}`);
    z = await zeige('h3d-cottbus-bezirksliga', '1990/91');
    soll(z.length === 14, `${art} Cottbus 1990/91: ${z.length} Zeilen`);
    if (art === 'desktop') {   // Zählung über alle DDR-Ligen 1989/90
        let n = 0;
        for (const lid of await p.evaluate(() => Object.keys(HIST_EXT.ligen).filter(l => /^h[23]d-/.test(l) && (HIST_EXT.ligen[l].firstYear || 0) <= 1989 && (HIST_EXT.ligen[l].lastYear || 0) >= 1989)))
            n += (await zeige(lid, '1989/90')).filter(r => /Verbleib|Rückzug/.test(r.txt)).length;
        soll(n <= 40, `DDR 1989/90: noch ${n} „?“/„↘“ (vorher 71)`);
        console.log(`DDR 1989/90: ${n} „?“/„↘“`);
    }
    if ((await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) bef.push(`${art}: Seite breiter als der Bildschirm`);
    err.forEach(e => bef.push(`${art} JS-Fehler: ${e}`));
}
await b.close();
console.log(bef.length ? 'BEFUND\n  ' + bef.join('\n  ') : 'Alles gruen');
process.exit(bef.length ? 1 : 0);
