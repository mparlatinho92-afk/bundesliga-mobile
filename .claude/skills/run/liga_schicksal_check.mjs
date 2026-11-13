// Was erzählt die Archivtabelle über den Verbleib? (Nutzer 30.10.2026: letzte Saison der Oberliga als dritte Liga zeigte „Rückzug“/
// „Abstieg“, obwohl die Mannschaft in derselben Liga blieb – die Liga selbst rutschte eine Ebene.) template.html.
// Alle Liga-Saisons aus tools/_dryrun/liga_schicksal.txt (node tools/liga_schicksal_scan.cjs): wer in der Fortsetzung der Liga
// bleibt, trägt weder ▲ noch ▼/↘; wer in eine höhere Liga geht, trägt ▲. Gegenproben: Regionalliga Nord 1973/74 → Oberliga Nord
// bleibt ▼ (andere Liga), live 2. Bundesliga Platz 3 „⇄ … (Relegation)“ bzw. „(Rel.)“.
//   node .claude/skills/run/liga_schicksal_check.mjs [port]       Screenshots nach docs/liga-schicksal/
//   node .claude/skills/run/liga_schicksal_check.mjs --selbsttest  app/league.js aus git HEAD – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/liga-schicksal/';
fs.mkdirSync(OUT, { recursive: true });
const ALT = SELBST ? execSync('git show HEAD:app/league.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) : null;
const FAELLE = fs.readFileSync('tools/_dryrun/liga_schicksal.txt', 'utf8').split('\n\nANDERE')[0].split('\n')
    .map(l => l.match(/^(\S+)\s+(\S+) .* in (\S+) /)).filter(Boolean).map(m => [m[2], m[1], m[3]]);
if (FAELLE.length < 60) { console.log('FEHLER: zu wenige Fälle in tools/_dryrun/liga_schicksal.txt – erst den Scan laufen lassen'); process.exit(1); }
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    if (ALT) await page.route('**/app/league.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ALT }));
    // --selbsttest-daten: nur die Historie aus HEAD (vor dem Verbinden der DDR-Liga-Vereine 1990/91), Code aktuell
    if (process.argv.includes('--selbsttest-daten')) await page.route('**/app/history_ext.js', r => r.fulfill({ status: 200, contentType: 'application/javascript',
        body: execSync('git show HEAD:app/history_ext.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) }));
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    const liste = geraet === 'desktop' ? FAELLE : FAELLE.filter(f => /oberliga/.test(f[0]) && f[1] === '1993/94').slice(0, 2);
    const reihen = liste.concat([['h2-nord-regionalliga', '1973/74', 'h3-nord-oberliga', 'gegen']]);
    for (const [lid, y, fort, gegen] of reihen) {
        await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
        await page.waitForFunction(() => document.querySelector('.ltab tbody tr'), null, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(300);
        const r = await page.evaluate(([lid, y]) => {
            const x = HistExt.loaded(), ny = App._nextSeasonStr(y), naechst = {};
            Object.values(x.byKey).filter(t => t.key.startsWith(ny + '|')).forEach(t => t.rows.forEach(q => { naechst[q.id] = t.key.split('|')[1]; }));
            return [...document.querySelectorAll('.ltab tbody tr')].map(tr => {
                const m = (tr.querySelector('.tmn') || {}).getAttribute ? tr.querySelector('.tmn').getAttribute('onclick').match(/'([^']+)'/) : null;
                const inf = tr.querySelector('.inf .itxt'), arr = tr.querySelector('.inf .iarr');
                return { id: m && m[1], txt: inf ? inf.textContent.trim() : '', arr: arr ? arr.textContent.trim() : '', ziel: m ? naechst[m[1]] : null };
            });
        }, [lid, y]);
        soll(r.length, `${geraet} ${lid} ${y}: keine Tabelle`);
        const lv = await page.evaluate(([a, b]) => [App._archLevelOf(a), App._archLevelOf(b)], [lid, fort]);
        for (const z of r) {
            const sicht = geraet === 'handy' ? z.arr : z.txt;
            if (gegen) { if (z.ziel === fort) soll(/^▼/.test(sicht), `${geraet} ${lid} ${y}: ${z.id} in ${fort} ohne ▼ („${sicht}“) – andere Liga ist Abstieg`); continue; }
            if (z.ziel === fort) soll(!/^[▲▼↘]/.test(sicht), `${geraet} ${lid} ${y}: ${z.id} bleibt in ${fort}, zeigt „${sicht}“`);
            else if (z.ziel != null) {
                const zl = await page.evaluate(l => App._archLevelOf(l), z.ziel);
                if (zl < lv[1]) soll(/^▲/.test(sicht), `${geraet} ${lid} ${y}: ${z.id} geht hoch nach ${z.ziel}, zeigt „${sicht}“`);
            }
        }
        if (!SELBST && geraet === 'handy' && lid === liste[0][0]) await page.screenshot({ path: `${OUT}handy-${lid}-${y.replace('/', '-')}.png`, fullPage: true });
        if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} ${lid} ${y}: Seite breiter als der Bildschirm`);
    }
    // Aufgelöste Liga: wer auf derselben Ebene unterkommt, ist für die neue Liga zugelassen (gelb ➔, Nutzer 30.10.2026);
    // DDR 1990/91: jede Zeile mit Ziel bekommt eine Angabe (vorher las die Ansicht nur DDR-Tabellen der Folgesaison = nichts)
    for (const [lid, y, ziel, muster] of [['h2-nord-regionalliga', '1973/74', '2', /^➔ Qualifiziert für 2\. Bundesliga Nord/],
                                          ['ddr1', '1990/91', '1', /^➔ Qualifiziert für 1\. Bundesliga/],
                                          ['ddr1', '1990/91', '2', /^➔ Qualifiziert für 2\. Bundesliga/],
                                          ['ddr1', '1990/91', 'h3-nordost-oberliga', /^➔ Oberliga Nordost/],
                                          ['h2d-ddrliga-ddrliga', '1990/91', 'h3-nordost-oberliga', /^➔ Oberliga Nordost/]]) {
        await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
        await page.waitForFunction(() => document.querySelector('.ltab tbody tr'), null, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(300);
        const r = await page.evaluate(([y]) => {
            const x = HistExt.loaded(), ny = App._nextSeasonStr(y), naechst = {};
            Object.values(x.byKey).filter(t => t.key.startsWith(ny + '|')).forEach(t => t.rows.forEach(q => { naechst[q.id] = t.key.split('|')[1]; }));
            return [...document.querySelectorAll('.ltab tbody tr')].map(tr => {
                const id = (tr.querySelector('.tmn').getAttribute('onclick').match(/'([^']+)'/) || [])[1];
                const a = tr.querySelector('.inf .iarr'), t = tr.querySelector('.inf .itxt');
                return { id, ziel: naechst[id] || (a && a.getAttribute('onclick') || '').match(/lid:'([^']+)'/)?.[1] || null, txt: t ? t.textContent.trim() : '', farbe: a ? a.style.color : '' };
            });
        }, [y]);
        // DDR-Liga: jeder Verein hat einen Verbleib; Chemie Guben qualifiziert, aber nicht angetreten (Wikipedia SV Chemie Guben) = rot
        if (lid === 'h2d-ddrliga-ddrliga') { const leer = r.filter(z => !z.txt).map(z => z.id);
            soll(!leer.length, `${geraet} ${lid} ${y}: ohne Verbleib ${leer.join(', ')}`);
            const g = r.find(z => z.id === 'hist_fa_chemieguben');
            soll(g && /^↘ Rückzug trotz Qualifikation für Oberliga Nordost/.test(g.txt) && /c-fix-down/.test(g.farbe), `${geraet} ${lid} ${y}: Chemie Guben zeigt ${JSON.stringify(g)}`);
            // Sonderfall Dynamo Dresden II als TSG Meißen: Hinweis in BEIDEN Steckbriefen (tools/hist_vermerk.json)
            for (const id of ['hist_fa_tsgmeissen', 'hist_fa_dynamodresdenii']) {
                await page.evaluate(id => App.showSteckbrief(id), id); await page.waitForTimeout(1200);
                const t = await page.evaluate(() => document.body.innerText);
                soll(/HINWEIS/.test(t) && /TSG Meißen/.test(t.slice(t.indexOf('HINWEIS'))) && /Dynamo Dresden/.test(t.slice(t.indexOf('HINWEIS'))), `${geraet}: Steckbrief ${id} ohne Hinweis zum Sonderfall`);
                if (!SELBST && geraet === 'handy' && id === 'hist_fa_dynamodresdenii') await page.screenshot({ path: `${OUT}handy-steckbrief-dynamo-ii.png`, fullPage: true });
                await page.keyboard.press('Escape'); await page.waitForTimeout(300);
                await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]); await page.waitForTimeout(1500);
            }
        }
        const treffer = r.filter(z => z.ziel === ziel);
        soll(treffer.length, `${geraet} ${lid} ${y}: kein Verein mit Ziel ${ziel} gefunden`);
        treffer.forEach(z => soll(muster.test(z.txt) && /c-gold/.test(z.farbe), `${geraet} ${lid} ${y}: ${z.id} → ${ziel} zeigt „${z.txt}“ (${z.farbe})`));
        if (lid === 'h2-nord-regionalliga') {   // Rückblick erzählt die Auflösung, nicht „Abstieg aus der Regionalliga Nord“
            const rb = await page.evaluate(() => [...document.querySelectorAll('#content div')].map(d => d.textContent).find(t => t.startsWith('📰')) || '');
            soll(/aufgelöst/.test(rb) && !/Abstieg aus/.test(rb), `${geraet} ${lid} ${y}: Rückblick „${rb.slice(0, 160)}“`);
        }
        if (!SELBST && geraet === 'handy' && lid === 'h2-nord-regionalliga') await page.screenshot({ path: `${OUT}handy-rl-nord-1973-74.png`, fullPage: true });
        if (!SELBST && geraet === 'desktop' && lid === 'ddr1') await page.screenshot({ path: `${OUT}desktop-ddr-oberliga-1990-91.png`, fullPage: true });
    }
    // Live: 2. Bundesliga Platz 3 = Relegation, Zusatz sichtbar
    await page.evaluate(() => { App.viewArchivedSeason = null; App.loadLeague('2'); });
    await page.waitForTimeout(1500);
    const rel = await page.evaluate(() => [...document.querySelectorAll('.ltab tbody tr')].map(tr => {
        const a = tr.querySelector('.inf .iarr'), t = tr.querySelector('.inf .itxt'); return a && /⇄/.test(a.textContent) ? { t: t.textContent, a: a.textContent } : null; }).filter(Boolean));
    soll(rel.length && rel.every(x => /\(Relegation\)$/.test(x.t) && /\(Rel\.\)$/.test(x.a)), `${geraet}: live Relegationsplatz ${JSON.stringify(rel)}`);
    if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-live-2bl.png` });
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 5).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: der alte Code fällt durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.slice(0, 40).forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : `Alles gruen (${FAELLE.length} Liga-Saisons).`);
process.exit(befund.length ? 1 : 0);
