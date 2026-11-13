// „Statt Rückzug soll stehen, dass die Mannschaft anders heißt – außer bei ständigen Rechtschreibänderungen wie Elmshorn oder
// Hettstedt“ (Nutzer 31.10.2026). Archivtabelle in template.html, Desktop + Handy:
//   soll „✎ umbenannt in …“: Motor Robur → Robur Zittau 1975/76 (RSSF 1976), Vorwärts/Motor → Motor Teltow 1976/77, Traktor → 1919 Irxleben 1989/90
//   soll leer (kein ↘, kein ✎): Rasensport Elmshorn 2001/02 (Raspo), Walzwerk Hettstedt 1967/68, Lok Eberswalde 1964/65,
//   Jahn Regensburg II 2002/03 (II/Amateure/II springt in der Quelle)
//   node .claude/skills/run/umbenannt_check.mjs [port]
//   node .claude/skills/run/umbenannt_check.mjs --selbsttest    league.js + history_ext.js aus git HEAD – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/liga-schicksal/';
const git = f => execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 });
const FAELLE = [
    ['h3d-dresden-bezirksliga', '1975/76', 'hist_fa_motorroburzittau', /^✎ umbenannt in Robur Zittau$/],
    ['h3d-potsdam-bezirksliga', '1976/77', 'hist_fa_motorteltow', /^✎ umbenannt in Motor Teltow$/],
    ['h3d-magdeburg-bezirksliga', '1989/90', 'hist_fa_traktorirxleben', /^✎ umbenannt in 1919 Irxleben$/],
    ['h4-nord-oberliga', '2001/02', 'hist_fa_rasensportelmshorn', /^$/],
    ['h3d-halle-bezirksliga', '1967/68', 'hist_fa_stahlwalzwerkhettstedt', /^$/],
    ['h3d-frankfurtoder-bezirksliga', '1964/65', 'hist_fa_lokomotiveeberswalde', /^$/],
    ['h4-bayern-oberliga', '2002/03', 'ssvjahnregensburgii_27', /^$/],
    // Runde 2 (rueckzug_zuordnung2.cjs): Wende 1990 Lok → ESV (RSSF), Tippfehler Komet/Comet Kiel ohne Hinweis
    ['h3d-rostock-bezirksliga', '1989/90', 'hist_fa_lokgreifswald', /^✎ umbenannt in ESV Greifswald$/],
    ['h5-schleswigholstein-verbandsliga', '1998/99', 'hist_fa_sccometkiel', /^$/],
    // Runde 3 (rueckzug_zuordnung3.cjs): Fusion statt Rückzug (Wikipedia: 1. Juli 1971 Sportfreunde + RSV Höh → Rot-Weiß Lüdenscheid)
    ['h3-westfalen-verbandsliga', '1970/71', 'hist_fa_rsvluedenscheidhoeh', /^⇢ Fusion: Rot-Weiß Lüdenscheid$/],
    // Runde 4 (rueckzug_zuordnung4.cjs): Schreibweise „Empor Geußen“ umging den Alias (FIX), Trägerwechsel Stahl → Mansfeldkombinat 1970,
    // Fusion LFC Berlin + BFC Viktoria 2013 (Wikipedia) auch für die zweite Mannschaft
    ['h3d-erfurt-bezirksliga', '1964/65', 'hist_fa_blauweissgreussen', /^$/],   // heißt 1965/66 noch Empor → kein Hinweis (vorher ↘ Rückzug)
    ['h3d-halle-bezirksliga', '1969/70', 'hist_fa_stahlhelbra', /^✎ umbenannt in Mansfeldkombinat Helbra$/],
    ['7-8', '2012/13', 'hist_fb_lfcberlinii', /^⇢ Fusion: .*Viktoria/],
    // Runde 5 (rueckzug_zuordnung5.cjs): Großstadt mit Beleg – de.wikipedia: 1988 Motor Rostock → BSG Motor Neptunwerft
    ['h3d-rostock-bezirksliga', '1987/88', 'hist_fa_motorrostock', /^✎ umbenannt in Neptunwerft Rostock$/],
    // Plauen (plauen_zuordnung.cjs): eine VFC-Linie (Wikipedia: 1. Juni 1976 Umbenennung), Aufbau Plauen geht 1976 darin auf (fussball-ddr.de)
    ['h3d-karlmarxstadt-bezirksliga', '1975/76', 'vfcplauen_837', /^✎ umbenannt in .*WEMA\/Aufbau Plauen$/],
    ['h3d-karlmarxstadt-bezirksliga', '1975/76', 'hist_fa_aufbauplauen', /^⇢ Fusion: .*Plauen$/],
    // Runde 6 (rueckzug_zuordnung6.cjs): Meister stieg auf, die höhere Liga schrieb den Namen anders → stand als „↘ Rückzug“
    ['h4-bayern-landesliga', '1977/78', 'hist_wk_sbdjkrosenheim', /^▲/],
    ['h4-hessen-landesliga', '1984/85', 'hist_fa_hessenbadhersfeld', /^▲/],
    // Verschwundener Meister (01.11.2026): SG Post/Süd Regensburg verzichtete 2002 auf den Aufstieg, Fußballabteilung → Jahn Regensburg II (en.wikipedia)
    ['h5-bayernmitte-landesliga', '2001/02', 'hist_fa_sgpostsuedregensburg', /^⇢ Fusion: .*Jahn Regensburg II$/],
    // Ligawechsel + neuer Name (Nutzer 31.10.2026 „AB“): ▲/▼ bleibt, dazu Fußnote ¹ unter der Tabelle und antippbares ✎ mit Sprechblase
    ['h4-badenwuerttemberg-oberliga', '2004/05', 'karlsruherscii_985', /^▲ Regionalliga Süd1$/, /^1 Karlsruher SC Amateure: ab 2005\/06 als Karlsruher SC II$/],
    ['h4-nordost-oberliga', '2003/04', 'hist_fa_lichterfelderfc', /^▼ Verbandsliga Berlin1$/, /^1 .+: ab 2004\/05 als .+$/],
];
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const page = await (await browser.newContext(opt)).newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    if (SELBST) for (const f of ['app/league.js', 'app/history_ext.js'])
        await page.route('**/' + f, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: git(f) }));
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    for (const [lid, y, id, muster, fnMuster] of FAELLE) {
        await page.evaluate(() => document.querySelectorAll('.ltab').forEach(t => t.dataset.alt = '1'));
        await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
        await page.waitForFunction(() => document.querySelector('.ltab:not([data-alt]) tbody tr'), null, { timeout: 15000 }).catch(() => {});
        const z = await page.evaluate(id => {
            const tr = [...document.querySelectorAll('.ltab:not([data-alt]) tbody tr')].find(tr => (tr.querySelector('.tmn') || { getAttribute: () => '' }).getAttribute('onclick').includes(`'${id}'`));
            if (!tr) return null;
            const t = tr.querySelector('.inf .itxt'), a = tr.querySelector('.inf .iarr');
            return { txt: t ? t.textContent.trim() : '', arr: a ? a.textContent.trim() : '', sichtbar: a ? getComputedStyle(a).display !== 'none' : false };
        }, id);
        if (!z) { befund.push(`${geraet} ${lid} ${y}: ${id} nicht in der Tabelle`); continue; }
        soll(muster.test(z.txt), `${geraet} ${lid} ${y} ${id}: „${z.txt}“ statt ${muster}`);
        if (geraet === 'handy' && /✎/.test(muster.source) && !fnMuster) soll(z.arr === '✎' && z.sichtbar, `handy ${lid} ${y} ${id}: Kürzel „${z.arr}“ (sichtbar ${z.sichtbar}) statt ✎`);
        if (fnMuster) {
            const f = await page.evaluate(() => [...document.querySelectorAll('.ifn')].map(d => d.textContent.trim()).join(' | '));
            soll(fnMuster.test(f), `${geraet} ${lid} ${y}: Fußnote „${f}“ statt ${fnMuster}`);
            if (geraet === 'handy') {
                soll(/^[▲▼]/.test(z.arr) && /1$/.test(z.arr) && z.sichtbar, `handy ${lid} ${y} ${id}: Kürzel „${z.arr}“ ohne Pfeil + ¹`);
                // ✎ ANTIPPEN (nicht nur suchen): Sprechblase muss aufgehen, zweites Tippen schließt sie
                const mk = page.locator('.ltab:not([data-alt]) tbody tr .imk').first();
                if (!(await mk.count())) { befund.push(`handy ${lid} ${y}: kein ✎ zum Antippen`); continue; }
                await mk.tap();
                const tip = await page.evaluate(() => { const t = document.getElementById('inf-tip'); return t && t.style.display === 'block' ? t.textContent : ''; });
                soll(/^ab \d{4}\/\d{2} als /.test(tip), `handy ${lid} ${y}: Sprechblase nach Tipp auf ✎ „${tip}“`);
                await mk.tap();
                const zu = await page.evaluate(() => { const t = document.getElementById('inf-tip'); return !t || t.style.display !== 'block'; });
                soll(zu, `handy ${lid} ${y}: zweiter Tipp auf ✎ schließt die Sprechblase nicht`);
                if (!SELBST && id === 'karlsruherscii_985') { await mk.tap(); await page.screenshot({ path: `${OUT}handy-fussnote-ksc-2004-05.png` }); await mk.tap(); }
            }
        }
        if (!SELBST && geraet === 'handy' && id === 'hist_fa_motorroburzittau') await page.screenshot({ path: `${OUT}handy-umbenannt-zittau-1975-76.png`, fullPage: true });
        if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} ${lid} ${y}: Seite breiter als der Bildschirm`);
    }
    // Mehrere Fußnoten (echte Daten haben höchstens eine je Tabelle): ab 2005/06 heißt künstlich JEDER Verein anders →
    // Oberliga BW 2004/05 muss Meister (▲) + vier Absteiger (▼) als ¹ … ⁵ in Tabellenreihenfolge zeigen
    if (geraet === 'desktop') {
        await page.evaluate(() => { const o = App._archClubName; App._archClubNameOrig = o; App._archClubName = function(id, s) { return s >= '2005/06' ? 'Kunstname ' + id.replace(/[^a-z]/g, 'x') : o.call(this, id, s); }; });
        await page.evaluate(() => document.querySelectorAll('.ltab').forEach(t => t.dataset.alt = '1'));
        await page.evaluate(() => App._sbSaisonGo('h4-badenwuerttemberg-oberliga', '2004/05'));
        await page.waitForFunction(() => document.querySelector('.ltab:not([data-alt]) tbody tr'), null, { timeout: 15000 }).catch(() => {});
        const m = await page.evaluate(() => ({ sup: [...document.querySelectorAll('.ltab:not([data-alt]) tbody .itxt sup')].map(s => s.textContent).join(','),
            fn: [...document.querySelectorAll('.ifn sup')].map(s => s.textContent).join(',') }));
        soll(m.sup === '1,2,3,4,5' && m.fn === '1,2,3,4,5', `desktop mehrere Fußnoten: Zeilen „${m.sup}“, Liste „${m.fn}“ statt 1,2,3,4,5`);
        await page.evaluate(() => { App._archClubName = App._archClubNameOrig; });
    }
    fehler.forEach(e => befund.push(`${geraet} JS-Fehler: ${e}`));
}
await browser.close();
if (befund.length) { console.log('BEFUND\n  ' + befund.join('\n  ')); process.exit(1); }
console.log(`Alles gruen (${FAELLE.length} Fälle, Desktop + Handy)`);
