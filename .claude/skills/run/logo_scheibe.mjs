// Logo mit durchsichtigem Hintergrund auf eine weiße Scheibe setzen (dunkles Theme), Ergebnis 240 px PNG.
//   node .claude/skills/run/logo_scheibe.mjs <eingabe.png> <ausgabe.png>
import { chromium } from 'playwright';
import fs from 'fs';
const [ein, aus] = process.argv.slice(2);
const b64 = fs.readFileSync(ein).toString('base64');
const browser = await chromium.launch();
const p = await browser.newPage();
const r = await p.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let durch = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 20) durch++;
    const anteil = durch / (d.length / 4);
    const N = 240, o = document.createElement('canvas'); o.width = o.height = N;
    const y = o.getContext('2d');
    y.fillStyle = '#fff'; y.beginPath(); y.arc(N / 2, N / 2, N / 2 - 1, 0, Math.PI * 2); y.fill();
    const s = (N - 8) / Math.max(img.width, img.height);
    y.drawImage(img, (N - img.width * s) / 2, (N - img.height * s) / 2, img.width * s, img.height * s);
    return { anteil, png: o.toDataURL('image/png').split(',')[1] };
}, 'data:image/png;base64,' + b64);
fs.writeFileSync(aus, Buffer.from(r.png, 'base64'));
console.log('durchsichtig:', Math.round(r.anteil * 100) + ' %', '→', aus);
await browser.close();
