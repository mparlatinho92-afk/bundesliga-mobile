// Prüfung Saisonwechsel-Bericht (07.11.2026) – klickt: Menü, Sortierung, Saisonwähler, Ziellink, Knopf in der Ligaleiste,
// Abschlussbericht. Handy + Desktop.   node .claude/skills/run/saisonwechsel_check.mjs [port] [saisons] → docs/saisonwechsel/*.png
import { chromium } from 'playwright';
import fs from 'fs';
const args = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const PORT = args[0] || 3334, SAISONS = +(args[1] || 4), OUT = 'docs/saisonwechsel/';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const fehler = [], ergebnis = [];
const ok = (name, bed, info = '') => ergebnis.push(`${bed ? 'OK  ' : 'FEHL'} ${name}${info ? ' – ' + info : ''}`);
for (const [tag, opt] of [['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
    const ctx = await browser.newContext(opt);
    const page = await ctx.newPage();
    page.on('pageerror', e => fehler.push(tag + ': ' + e.message)); page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/${process.env.SEITE || "template.html"}`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    await page.evaluate(n => { Engine.fastMode = true; for (let i = 0; i < n; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } Engine.fastMode = false; App.loadLeague('1'); }, SAISONS);
    if (process.env.KLAPP_KAPUTT) await page.addStyleTag({ content: '.sw-gruppe.zu .sw-inhalt{display:block!important}' });   // Gegenprobe
    const H = await page.evaluate(() => Engine.history.map(h => h.year));
    const live = await page.evaluate(() => Engine.getFormattedSeason());

    // 1 Menü öffnen (echter Klick auf den ···-Eintrag)
    await page.evaluate(() => { const m = [...document.querySelectorAll('.dots-item')].find(e => e.textContent.includes('Saisonwechsel')); m.closest('[id]') && (m.closest('[id]').style.display = 'block'); });
    await page.locator('.dots-item', { hasText: 'Saisonwechsel' }).click();
    await page.waitForTimeout(200);
    let d = await page.evaluate(() => ({ offen: document.getElementById('modal').style.display === 'flex', titel: document.querySelector('.sw-titel')?.textContent, zeilen: document.querySelectorAll('.sw-zeile').length, koepfe: [...document.querySelectorAll('.sw-kopf')].map(k => k.textContent.replace(/^[▾▸] */, '')) }));
    ok(`${tag}: Menü öffnet jüngsten Wechsel`, d.offen && d.titel === `${H[H.length - 1]} → ${live}` && d.zeilen > 100, `${d.titel}, ${d.zeilen} Zeilen`);
    ok(`${tag}: nach Liga beginnt mit 1. Bundesliga`, /^1\. Bundesliga/.test(d.koepfe[0] || ''), d.koepfe.slice(0, 3).join(' | '));
    // Ränge innerhalb der ersten Gruppe aufsteigend
    const raenge = await page.evaluate(() => [...document.querySelectorAll('.sw-gruppe')[0].querySelectorAll('.sw-rang')].map(r => parseInt(r.textContent)));
    ok(`${tag}: Ränge der Gruppe aufsteigend`, raenge.length > 0 && raenge.every((r, i) => !i || r >= raenge[i - 1]), raenge.join(','));
    await page.screenshot({ path: OUT + tag + '-liga.png' });

    // 1b Einklappen: „Alle zu“ → nur Köpfe, Kopf antippen → genau diese Gruppe auf, „Alle auf“
    const sichtbar = () => page.evaluate(() => [...document.querySelectorAll('.sw-zeile')].filter(z => z.offsetParent).length);
    const nGr = await page.evaluate(() => document.querySelectorAll('.sw-gruppe').length);
    await page.locator('.sw-alle').click(); await page.waitForTimeout(100);
    d = await page.evaluate(() => ({ zu: document.querySelectorAll('.sw-gruppe.zu').length, knopf: document.querySelector('.sw-alle').textContent }));
    ok(`${tag}: Alle zu klappt jede Gruppe ein`, d.zu === nGr && await sichtbar() === 0 && /Alle auf/.test(d.knopf), `${d.zu}/${nGr} zu, Knopf ${d.knopf}`);
    await page.screenshot({ path: OUT + tag + '-alle-zu.png' });
    const dritte = page.locator('.sw-gruppe').nth(2);
    const n3 = await dritte.locator('.sw-zeile').count();
    await dritte.locator('.sw-kopf').click(); await page.waitForTimeout(100);
    d = await page.evaluate(() => ({ zu: document.querySelectorAll('.sw-gruppe.zu').length, knopf: document.querySelector('.sw-alle').textContent }));
    ok(`${tag}: Kopf antippen öffnet genau diese Gruppe`, d.zu === nGr - 1 && await sichtbar() === n3 && /Alle zu/.test(d.knopf), `${await sichtbar()} sichtbar, erwartet ${n3}`);
    await page.locator('.sw-pfeil', { hasText: '◀' }).click(); await page.waitForTimeout(100);
    const zuNachBlaettern = await page.evaluate(() => document.querySelectorAll('.sw-gruppe.zu').length);
    ok(`${tag}: Klappzustand bleibt beim Blättern`, zuNachBlaettern >= nGr - 3 && zuNachBlaettern > 0, zuNachBlaettern + ' zu');
    await page.locator('.sw-pfeil', { hasText: '▶' }).click(); await page.waitForTimeout(100);
    await page.locator('.sw-alle').click(); await page.waitForTimeout(100);
    await page.locator('.sw-alle').click(); await page.waitForTimeout(100);
    d = await page.evaluate(() => ({ zu: document.querySelectorAll('.sw-gruppe.zu').length }));
    ok(`${tag}: Alle auf öffnet wieder alles`, d.zu === 0 && await sichtbar() > 100, `${d.zu} zu, ${await sichtbar()} sichtbar`);

    // 2 Sortierung „Nach Art“
    await page.locator('.sw-sort', { hasText: 'Nach Art' }).click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => [...document.querySelectorAll('.sw-kopf')].map(k => k.textContent.replace(/^[▾▸] */, '').trim()));
    ok(`${tag}: Nach Art – Gruppen Auf-/Absteiger/Amateurpokal`, /Aufsteiger/.test(d[0]) && d.some(k => /Absteiger/.test(k)) && d.some(k => /Amateurpokal/.test(k)), d.join(' | '));
    await page.screenshot({ path: OUT + tag + '-art.png' });

    // 2b Reiter Meister + Verbandspokal
    await page.locator('.sw-sort', { hasText: /^Meister$/ }).click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => ({ koepfe: [...document.querySelectorAll('.sw-kopf')].map(k => k.textContent.replace(/^[▾▸] */, '').trim()), n: document.querySelectorAll('.sw-zeile').length,
        erste: document.querySelector('.sw-zeile')?.innerText, ligen: new Set(Object.values(Engine.history[Engine.history.length - 1].teams).map(t => t.leagueId)).size }));
    ok(`${tag}: Reiter Meister – je Liga einer, Ebene 1 zuerst`, d.n === d.ligen && /^Ebene 1/.test(d.koepfe[0]) && /1\. Bundesliga/.test(d.erste), `${d.n}/${d.ligen}, ${d.koepfe.slice(0, 2).join(' | ')}, erste: ${d.erste.replace(/\s+/g, ' ')}`);
    await page.screenshot({ path: OUT + tag + '-meister.png' });
    await page.locator('.sw-sort', { hasText: 'Verbandspokal' }).click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => ({ koepfe: [...document.querySelectorAll('.sw-kopf')].map(k => k.textContent.replace(/^[▾▸] */, '').trim()), n: document.querySelectorAll('.sw-zeile').length,
        zweit: [...document.querySelectorAll('.sw-zeile')].filter(z => z.querySelector('.sw-vp2')).map(z => z.querySelector('.sw-liga').textContent),
        soll: Object.values(Engine.pokal.entrants).filter(e => e.type === 'VP').length }));
    ok(`${tag}: Reiter Verbandspokal – alle VP-Qualifikanten, 5 Regionalverbände`, d.n === d.soll && d.n > 0 && d.koepfe.length === 5, `${d.n}/${d.soll}, ${d.koepfe.join(' | ')}`);
    ok(`${tag}: 2. Startplatz Bayern, Niedersachsen, Westfalen`, d.zweit.sort().join(',') === 'Bayern,Niedersachsen,Westfalen', d.zweit.join(','));
    const breitVp = await page.evaluate(() => { const b = document.getElementById('modal-body'); return [...document.querySelectorAll('.sw-zeile')].filter(z => z.getBoundingClientRect().right > b.getBoundingClientRect().right + 1).length; });
    ok(`${tag}: Verbandspokal-Zeilen passen ins Fenster`, breitVp === 0, breitVp + ' zu breit');
    await page.screenshot({ path: OUT + tag + '-verbandspokal.png' });
    // 2c Reiter Ligagrößen: vorher → nachher je Liga, aufklappen zeigt die Vereine
    await page.locator('.sw-sort', { hasText: 'Ligagrößen' }).click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.sw-gr')];
        const h = Engine.history[Engine.history.length - 1].teams, vor = {}, nach = {};
        Object.values(h).forEach(t => vor[t.leagueId] = (vor[t.leagueId] || 0) + 1);
        Object.values(Engine.teams).forEach(t => { if (t.leagueId) nach[t.leagueId] = (nach[t.leagueId] || 0) + 1; });
        const name2lid = {}; Object.values(Engine.leagues).forEach(l => name2lid[l.name] = l.id);
        let falsch = 0;
        rows.forEach(r => { const lid = name2lid[r.querySelector('.sw-name').textContent], m = r.querySelector('.sw-gr-zahl').textContent.match(/(\d+) → (\d+)/);
            if (!m || +m[1] !== (vor[lid] || 0) || +m[2] !== (nach[lid] || 0)) falsch++; });
        return { n: rows.length, falsch, kopf: document.querySelector('.sw-kopf')?.textContent.replace(/^[▾▸] */, '') };
    });
    ok(`${tag}: Reiter Ligagrößen – alle Ligen, Zahlen = Schnappschuss/Spielstand`, d.n >= 60 && d.falsch === 0 && /^Ebene 1/.test(d.kopf), `${d.n} Ligen, ${d.falsch} falsch, ${d.kopf}`);
    const zweite = page.locator('.sw-gr').nth(1);
    await zweite.click(); await page.waitForTimeout(100);
    d = await page.evaluate(() => { const r = document.querySelectorAll('.sw-gr')[1]; return { offen: r.classList.contains('offen'), vereine: [...r.querySelectorAll('.sw-gr-v')].filter(v => v.offsetParent).length, ue: [...r.querySelectorAll('.sw-gr-ue')].map(x => x.textContent).join('/') }; });
    ok(`${tag}: Liga antippen zeigt Zu- und Abgänge`, d.offen && d.vereine > 0 && /rein/.test(d.ue) && /raus/.test(d.ue), JSON.stringify(d));
    const breitGr = await page.evaluate(() => { const b = document.getElementById('modal-body'); return [...document.querySelectorAll('.sw-gr')].filter(z => z.getBoundingClientRect().right > b.getBoundingClientRect().right + 1).length; });
    ok(`${tag}: Ligagrößen-Zeilen passen ins Fenster`, breitGr === 0, breitGr + ' zu breit');
    await page.screenshot({ path: OUT + tag + '-ligagroessen.png' });
    await page.locator('.sw-sort', { hasText: 'Nach Art' }).click(); await page.waitForTimeout(150);

    // 3 Saisonwähler ◀
    await page.locator('.sw-pfeil', { hasText: '◀' }).click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => document.querySelector('.sw-titel')?.textContent);
    ok(`${tag}: ◀ zeigt Vorsaison`, d === `${H[H.length - 2]} → ${H[H.length - 1]}`, d);
    const arch = await page.evaluate(() => App._swOpt.sort);
    ok(`${tag}: Sortierung bleibt beim Blättern`, arch === 'art');

    // 4 Ziellink: springt in die Zielliga der Folgesaison
    const z = page.locator('.sw-zeile a').first();
    const zielTxt = await z.textContent();
    await z.click(); await page.waitForTimeout(400);
    d = await page.evaluate(() => ({ zu: document.getElementById('modal').style.display === 'none', liga: Engine.leagues[App.activeLeague]?.name, saison: App._viewedSeason() }));
    ok(`${tag}: Ziellink öffnet Liga der Folgesaison`, d.zu && d.liga === zielTxt && d.saison === H[H.length - 1], JSON.stringify(d) + ' Ziel ' + zielTxt);

    // 5 Knopf „🔁 Wechsel“ in der Ligaleiste der Archivsaison → genau diese Saison
    const knopf = page.locator('button', { hasText: '🔁 Wechsel' }).first();
    ok(`${tag}: Knopf in der Ligaleiste`, await knopf.count() > 0);
    if (await knopf.count()) {
        await knopf.click(); await page.waitForTimeout(200);
        d = await page.evaluate(() => document.querySelector('.sw-titel')?.textContent);
        ok(`${tag}: Knopf zeigt Wechsel nach der angezeigten Saison`, d === `${H[H.length - 1]} → ${live}`, d);
    }
    // 6 Handy: Zeile läuft nicht über den Rand
    const breit = await page.evaluate(() => { const b = document.getElementById('modal-body'); return [...document.querySelectorAll('.sw-zeile')].filter(z => z.getBoundingClientRect().right > b.getBoundingClientRect().right + 1).length; });
    ok(`${tag}: keine Zeile breiter als das Fenster`, breit === 0, breit + ' zu breit');
    await page.evaluate(() => document.getElementById('modal').style.display = 'none');

    // 7 Abschlussbericht: Reiter Ligabewegungen nutzt dieselbe Ansicht
    await page.evaluate(() => { App._gotoSeason(null, 'live', null, '1'); Engine.fastMode = true; Engine.simulateFullSeason(); Engine.fastMode = false; App.showSeasonEnd(); });
    await page.locator('#modal-tabs .tab', { hasText: 'Ligabewegungen' }).click(); await page.waitForTimeout(200);
    d = await page.evaluate(() => ({ sicht: getComputedStyle(document.getElementById('view-log')).display, titel: document.querySelector('#view-log .sw-titel')?.textContent, n: document.querySelectorAll('#view-log .sw-zeile').length, live: Engine.getFormattedSeason() }));
    ok(`${tag}: Abschlussbericht zeigt den gerade gespielten Wechsel`, d.sicht === 'block' && d.titel === `${live} → ${d.live}` && d.n > 100, JSON.stringify(d));
    await page.screenshot({ path: OUT + tag + '-abschluss.png' });
    // Abschlussbericht-Reiter Ligagrößen: dieselbe Ansicht, Alle zu / Kopf antippen funktionieren auch dort
    await page.locator('#modal-tabs .tab', { hasText: 'Ligagrößen' }).click(); await page.waitForTimeout(200);
    d = await page.evaluate(() => ({ n: document.querySelectorAll('#view-stats .sw-gr').length, export: !!document.querySelector('#view-stats button[onclick*="exportSeasonReport"]') }));
    ok(`${tag}: Abschlussbericht Ligagrößen mit Zu-/Abfluss`, d.n >= 60 && d.export, JSON.stringify(d));
    await page.locator('#view-stats .sw-alle').click(); await page.waitForTimeout(150);
    d = await page.evaluate(() => ({ zu: document.querySelectorAll('#view-stats .sw-gruppe.zu').length, alle: document.querySelectorAll('#view-stats .sw-gruppe').length, sicht: [...document.querySelectorAll('#view-stats .sw-gr')].filter(r => r.offsetParent).length }));
    ok(`${tag}: Abschlussbericht Ligagrößen – Alle zu`, d.zu === d.alle && d.alle > 0 && d.sicht === 0, JSON.stringify(d));
    await page.locator('#view-stats .sw-kopf').first().click(); await page.waitForTimeout(100);
    d = await page.evaluate(() => [...document.querySelectorAll('#view-stats .sw-gr')].filter(r => r.offsetParent).length);
    ok(`${tag}: Abschlussbericht Ligagrößen – Kopf öffnet Ebene 1`, d >= 1, d + ' sichtbar');
    await page.screenshot({ path: OUT + tag + '-abschluss-ligagroessen.png' });
    await ctx.close();
}
await browser.close();
console.log(ergebnis.join('\n'));
console.log(fehler.length ? 'JS-FEHLER:\n' + fehler.join('\n') : 'keine JS-Fehler');
process.exit(ergebnis.some(e => e.startsWith('FEHL')) || fehler.length ? 1 : 0);
