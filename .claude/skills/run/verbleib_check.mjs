// Browser-Pruefung: Spalte „Verbleib“ der Ewigen Tabelle (Sheet: rechts, standardmaessig eingeklappt, nach Wikipedia-Vorbild).
//   - eingeklappt: keine Spalte, Schalter „Verbleib ▸“; aufgeklappt: Spalte rechts, Merker ueberlebt Neuaufbau
//   - Spielverein -> heutige Liga, Fusions-Vorgaenger -> „Fusion JAHR → Nachfolger“, Nachfolger ausserhalb -> Text aus hist_nachfolger.json
//   - Handy: Tabelle scrollt waagerecht im Rahmen, die Seite selbst nicht
// Ausserdem: Anteil „?“ je Liga (Spuren fuer fehlende Verbindungen) -> docs/verbleib/unbekannt.txt
// node .claude/skills/run/verbleib_check.mjs   (--selbsttest: Verbleib immer „?“ -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/verbleib', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
let bericht = '';
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    if (SELBST) await p.addInitScript(() => {
        const t = setInterval(() => { if (typeof App !== 'undefined' && App._ewVerbleib) { App._ewVerbleib = () => ({ k: 'unbekannt', t: '?', tip: '' }); clearInterval(t); } }, 5);
    });
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && typeof HIST_EXT !== 'undefined' && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    const zeige = lid => p.evaluate(lid => { App._ewSort = null; App._ewSuche = null; App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.loadLeague(lid); App.setTableView('ewige'); }, lid);
    const spalten = () => p.$$eval('#ew-tab thead th', ths => ths.map(t => t.innerText.trim()));

    // 1. eingeklappt ist Standard
    await zeige('2'); await p.waitForTimeout(400);
    if ((await spalten()).some(s => /Verbleib/.test(s))) B('Spalte Verbleib ist ohne Klick schon offen');
    const knopf = p.locator('button', { hasText: 'Verbleib' });
    if (!(await knopf.count())) { B('Schalter Verbleib fehlt'); await ctx.close(); continue; }
    if (!/▸/.test(await knopf.first().innerText())) B('Schalter zeigt nicht ▸');
    // 2. aufklappen: Spalte ganz rechts
    await knopf.first().click(); await p.waitForTimeout(400);
    const sp = await spalten();
    if (!/Verbleib/.test(sp[sp.length - 1])) B('Verbleib ist nicht die letzte Spalte: ' + sp.slice(-2).join(' | '));
    // 3. Inhalte: Spielverein -> Liga, Fusions-Vorgaenger und externer Nachfolger
    const proben = await p.evaluate(() => {
        const out = {};
        const spiel = Object.values(Engine.teams).find(t => t.leagueId === '1');
        out.spiel = { erw: App._ligaShort(spiel.leagueId), ist: App._ewVerbleib(spiel.id).t };
        const F = HIST_EXT.fusion || {}; const nf = Object.keys(F).find(k => Engine.teams[k]);
        if (nf) { const v = F[nf].vorgaenger[0]; out.fusion = { erw: Engine.teams[nf].name, ist: App._ewVerbleib(v).t }; }
        const X = HIST_EXT.nachfolgerExtern || {}; const x = Object.keys(X).find(k => X[k].name && !Engine.teams[k]);
        if (x) out.extern = { erw: X[x].name, ist: App._ewVerbleib(x).t };
        // alle Fusions-Vorgaenger: nie eine rohe ID als Nachfolger (Sheet 24.10.2026 „Fusion 2000 → hist_fb_svleiwenkoewerich“)
        out.rohId = Object.values(F).flatMap(f => f.vorgaenger).map(v => App._ewVerbleib(v).t).filter(t => /hist_|_\d+\b/.test(t));
        out.rohIdN = Object.values(F).reduce((n, f) => n + f.vorgaenger.length, 0);
        return out;
    });
    if (proben.rohId.length) B(`${proben.rohId.length} von ${proben.rohIdN} Fusions-Vorgaengern zeigen eine rohe ID, z. B. „${proben.rohId[0]}“`);
    if (proben.spiel.ist !== proben.spiel.erw) B(`Spielverein zeigt „${proben.spiel.ist}“ statt „${proben.spiel.erw}“`);
    if (!proben.fusion || !proben.fusion.ist.includes(proben.fusion.erw) || !/^Fusion/.test(proben.fusion.ist)) B('Fusions-Vorgaenger: ' + JSON.stringify(proben.fusion));
    if (!proben.extern || !proben.extern.ist.includes(proben.extern.erw)) B('Nachfolger ausserhalb: ' + JSON.stringify(proben.extern));
    // 4. Tabelle selbst: Zellen gefuellt, Sortierung nach Verbleib laeuft
    const zellen = await p.$$eval('#ew-tab tbody tr td.ew-vb', tds => tds.map(t => t.innerText.trim()));
    if (!zellen.length) B('keine Verbleib-Zellen');
    if (zellen.filter(z => z !== '?').length < zellen.length / 2) B(`2. BL: nur ${zellen.filter(z => z !== '?').length} von ${zellen.length} mit Verbleib`);
    await p.locator('#ew-tab thead th', { hasText: 'Verbleib' }).click(); await p.waitForTimeout(400);
    if (!/Verbleib ▲/.test((await spalten()).pop())) B('Sortierung nach Verbleib greift nicht');
    await p.evaluate(() => { App._ewSort = null; App.loadLeague(App.activeLeague); });
    // 4b. Link der Liga fuehrt in deren laufende Saison (geklickt, nicht nur das Attribut gesucht); Fusion: Liga des Nachfolgers
    const links = await p.$$eval('#ew-tab td.ew-vb a.ew-vb-go', as => as.length);
    if (!links) B('keine Liga-Links in der Spalte Verbleib');
    else {
        const ziel = await p.$eval('#ew-tab tbody tr:nth-child(4) td.ew-vb a.ew-vb-go', a => a.getAttribute('data-short')).catch(() => null);
        const zielLid = await p.evaluate(kurz => Object.keys(Engine.leagues).find(l => App._ligaShort(l) === kurz), ziel);
        await p.locator('#ew-tab tbody tr:nth-child(4) td.ew-vb a.ew-vb-go').click(); await p.waitForTimeout(500);
        const st = await p.evaluate(() => ({ lid: App.activeLeague, tv: App.tableView, hist: App.viewHistoryOffset, arch: App.viewArchivedSeason }));
        if (st.lid !== zielLid || st.tv !== 'gesamt' || st.hist !== null || st.arch) B(`Link „${ziel}“ fuehrt nach ${JSON.stringify(st)} statt ${zielLid}/gesamt/laufend`);
        const fusionLink = await p.evaluate(() => {
            const F = HIST_EXT.fusion || {}; const nf = Object.keys(F).find(k => Engine.teams[k] && Engine.teams[k].leagueId);
            return nf ? { td: App._ewVerbleibTd(F[nf].vorgaenger[0]), lid: Engine.teams[nf].leagueId } : null;
        });
        if (!fusionLink || !fusionLink.td.includes(`'${fusionLink.lid}')`)) B('Fusion ohne Link zur Liga des Nachfolgers');
        await zeige('2'); await p.waitForTimeout(300);
    }
    // 4c. Sheet 24.10.2026: „?“ links wie alle anderen, Ligen ausgeschrieben, Kürzel nur ohne Platz (Tabelle breiter als ihr Rahmen)
    const form = await p.evaluate(() => {
        const tab = document.getElementById('ew-tab'), a = [...tab.querySelectorAll('a.ew-vb-go[data-full]')];
        const frage = [...tab.querySelectorAll('td.ew-vb')].filter(t => t.innerText.trim() === '?').map(t => getComputedStyle(t).textAlign);
        return { voll: a.filter(x => x.textContent === x.dataset.full).length, kurz: a.filter(x => x.textContent === x.dataset.short).length, n: a.length,
            zuBreit: tab.getBoundingClientRect().width > tab.parentElement.clientWidth + 1, frage };
    });
    if (form.frage.some(t => t !== 'left' && t !== 'start')) B('„?“ nicht linksbündig: ' + [...new Set(form.frage)].join(','));
    if (!form.frage.length) B('kein „?“ in der Tabelle – Ausrichtung ungeprueft');
    if (art === 'desktop' && (form.zuBreit || form.voll !== form.n)) B(`Desktop: ${form.voll} von ${form.n} Ligen ausgeschrieben, Tabelle zu breit: ${form.zuBreit}`);
    if (art === 'handy' && form.zuBreit !== false && form.kurz !== form.n) B(`Handy: Tabelle breiter als der Rahmen, aber nur ${form.kurz} von ${form.n} Ligen gekuerzt`);
    // 5. Handy: Seite scrollt nicht waagerecht
    if (art === 'handy') {
        const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (w > 2) B(`Seite ${w}px breiter als der Bildschirm`);
    }
    await p.screenshot({ path: `docs/verbleib/2bl-${art}${SELBST ? '-selbsttest' : ''}.png` });
    // 6. Merker: neu laden -> bleibt offen; danach wieder einklappen
    await p.reload({ waitUntil: 'load' });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await zeige('2'); await p.waitForTimeout(400);
    if (!(await spalten()).some(s => /Verbleib/.test(s))) B('nach Neuladen wieder eingeklappt (Merker)');
    // Bericht „?“ je Liga (nur einmal)
    if (art === 'desktop' && !SELBST) bericht = await p.evaluate(() => {
        const z = [];
        const lids = Object.keys(Engine.archive.ewige || {});
        for (const lid of lids) {
            const ids = Object.keys(Engine.archive.ewige[lid]); if (!ids.length) continue;
            const offen = ids.filter(id => App._ewVerbleib(id).k === 'unbekannt');
            const nm = (Engine.leagues[lid] || App._histLeague(lid) || {}).name || lid;
            z.push([offen.length, `${String(offen.length).padStart(4)} / ${String(ids.length).padStart(4)}  ${nm} (${lid})\n      ` + offen.slice(0, 12).map(id => Engine.archive.ewige[lid][id].name || id).join(', ') + (offen.length > 12 ? ' …' : '')]);
        }
        return z.sort((a, b) => b[0] - a[0]).map(x => x[1]).join('\n');
    });
    await p.evaluate(() => App._ewigeVerbleibToggle());
    await ctx.close();
}
await b.close();
if (bericht) fs.writeFileSync('docs/verbleib/unbekannt.txt', 'Vereine ohne bekannten Verbleib („?“) je Liga – Spuren fuer fehlende Verbindungen\n\n' + bericht + '\n');
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
