// Bildschirmfotos zur Liga-Lücke 1990/91 (Handy): Bezirksliga Erfurt 1989/90 („➔ Qualifiziert für …“) und Landesliga Thüringen 1990/91
//   node .claude/skills/run/wende9091_bilder.mjs   → docs/wende9091/*.png
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('docs/wende9091', { recursive: true });
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
for (const [lid, y, datei] of [['h3d-erfurt-bezirksliga', '1989/90', 'bezirksliga-erfurt-1989-90'], ['h3d-thueringen-landesliga', '1990/91', 'landesliga-thueringen-1990-91'],
                               ['h3d-cottbus-bezirksliga', '1990/91', 'bezirksliga-cottbus-1990-91']]) {
    await p.evaluate(([l, s]) => App._sbSaisonGo(l, s), [lid, y]); await p.waitForTimeout(1500);
    await p.screenshot({ path: `docs/wende9091/${datei}-handy.png`, fullPage: true });
    console.log(`docs/wende9091/${datei}-handy.png`);
}
await b.close();
