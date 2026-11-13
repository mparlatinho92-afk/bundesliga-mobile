// Karten-Steckbrief (rechtes Panel der Karte) in beiden Themes: Kontrast der Chips/Zeilen + Regionalverband-Chip.
//   node .claude/skills/run/karte_steckbrief_bild.mjs [port] [vereinsname] → docs/pokal-ansicht/karte-sb-{dunkel,hell}.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 3334, NAME = process.argv[3] || 'SG Alfbachtal';
const browser = await chromium.launch();
// Kontrast nach WCAG aus berechneten Farben (Hintergrund = erster nicht transparenter Vorfahre)
const messen = () => {
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor, a = rgb(c); if (a.length && (a.length < 4 || a[3] > 0.5)) return a; } return [255, 255, 255]; };
    const kontrast = el => { const a = lum(rgb(getComputedStyle(el).color)), b = lum(bgOf(el)); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); };
    const chips = [...document.querySelectorAll('#sb-regionen span')];
    const hist = [...document.querySelectorAll('#sb-hist div[style*="font-size:11px"]')];
    return { chips: chips.map(c => c.textContent), chipKontrast: Math.min(...chips.map(kontrast)), histKontrast: hist.length ? Math.min(...hist.map(kontrast)) : null,
        name: kontrast(document.getElementById('sb-name')), stadion: Math.min(...[...document.querySelectorAll('#sb-stadion *')].filter(e => e.children.length === 0 && e.textContent.trim()).map(kontrast)) };
};
for (const theme of ['dark', 'light']) {
    const p = await (await browser.newContext({ viewport: { width: 1000, height: 780 } })).newPage();
    const fehler = []; p.on('pageerror', e => fehler.push(e.message));
    await p.addInitScript(t => localStorage.setItem('theme', t), theme);
    await p.goto(`http://localhost:${PORT}/template.html`);
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && App.showMap, null, { timeout: 90000 });
    await p.evaluate(n => { App.showMap(); const t = Object.values(GAME_DATA.teams).find(x => x.name === n); App._mapOpenSteckbrief(t.id); }, NAME);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(messen);
    console.log(theme, JSON.stringify(r), fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : '');
    await p.locator('#map-steckbrief').screenshot({ path: `docs/pokal-ansicht/karte-sb-${theme === 'dark' ? 'dunkel' : 'hell'}.png` });
    await p.context().close();
}
await browser.close();
