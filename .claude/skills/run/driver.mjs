// Playwright REPL driver for Bundesliga Fußballsimulation
// Usage: node .claude/skills/run/driver.mjs [--port 3333]
import { chromium } from 'playwright';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT_DIR = process.env.SCREENSHOT_DIR || 'C:\\Users\\lyric\\AppData\\Local\\Temp\\bundesliga-shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let browser = null;
let page = null;
let activePort = null;

// Check if a port serves the Bundesliga app
async function checkPort(port) {
  const http = await import('node:http');
  return new Promise(resolve => {
    let body = '';
    let resolved = false;
    const done = val => { if (!resolved) { resolved = true; resolve(val); } };
    const req = http.get(`http://localhost:${port}/`, r => {
      if (r.statusCode !== 200) { r.resume(); done(false); return; }
      r.on('data', d => {
        body += d;
        if (body.includes('Bundesliga') || body.includes('bundesliga') || body.includes('ba_save')) {
          r.destroy(); done(true);
        } else if (body.length > 8000) { r.destroy(); done(false); }
      });
      r.on('end', () => done(body.includes('Bundesliga') || body.includes('bundesliga') || body.includes('ba_save')));
      r.on('error', () => done(false));
    });
    req.on('error', () => done(false));
    req.setTimeout(3000, () => done(false));
  });
}

async function ensureServer(requestedPort) {
  const candidates = requestedPort
    ? [requestedPort, 3334, 3333, 3000, 5000, 8080]
    : [3334, 3333, 3000, 5000, 8080];

  for (const port of [...new Set(candidates)]) {
    if (await checkPort(port)) {
      console.log(`Bundesliga server found at port ${port}`);
      return port;
    }
  }

  console.log('No Bundesliga server found on ports 3334, 3333, 3000, 5000, 8080.');
  console.log('Run first:  python -m http.server 3334');
  throw new Error('No server running');
}

const COMMANDS = {
  async launch(portArg) {
    if (browser) { console.log('already launched at port', activePort); return; }
    activePort = await ensureServer(portArg ? parseInt(portArg) : null);
    const baseUrl = `http://localhost:${activePort}`;
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    page = await ctx.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.evaluate(t => {
          window.__claudeErrors = window.__claudeErrors || [];
          window.__claudeErrors.push(t);
        }, msg.text());
      }
    });

    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    console.log(`launched at port ${activePort}. title: ${title}`);
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f, fullPage: false });
    console.log('screenshot:', f);
  },

  async 'ss-full'(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f, fullPage: true });
    console.log('screenshot:', f);
  },

  async 'ss-el'(sel) {
    if (!page) return console.log('ERROR: launch first');
    const el = await page.$(sel);
    if (!el) return console.log('NOT_FOUND:', sel);
    const f = path.join(SHOT_DIR, `el-${Date.now()}.png`);
    await el.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK';
    }, sel);
    console.log('click', sel, '->', r);
    await page.waitForTimeout(300);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, [role="button"], .tab, .nav-item, li')];
      const el = els.find(e => e.textContent?.trim() === t)
              ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName + ' "' + el.textContent.trim().slice(0, 40) + '"';
    }, text);
    console.log('click-text', JSON.stringify(text), '->', r);
    await page.waitForTimeout(500);
  },

  async nav(url) {
    if (!page) return console.log('ERROR: launch first');
    const base = `http://localhost:${activePort}`;
    const target = url.startsWith('http') ? url : `${base}${url}`;
    await page.goto(target, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('navigated:', await page.title());
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForSelector(sel, { timeout: 10000 });
      console.log('found:', sel);
    } catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    const t = await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null);
    console.log(t.slice(0, 3000));
  },

  async errors() {
    if (!page) return console.log('ERROR: launch first');
    const errs = await page.evaluate(() => window.__claudeErrors || []);
    console.log('console errors:', errs.length ? errs.join('\n') : 'none');
  },

  // Dump Engine state + localStorage save to JSON
  async 'save-dump'(name) {
    if (!page) return console.log('ERROR: launch first');
    const data = await page.evaluate(() => {
      // Try global Engine object first, then localStorage save key
      try {
        if (typeof Engine !== 'undefined') {
          return JSON.stringify({
            source: 'Engine',
            currentSeason: Engine.currentSeason,
            currentMatchday: Engine.currentMatchday,
            currentSeasonOffset: Engine.currentSeasonOffset,
          }, null, 2);
        }
      } catch {}
      const key = 'ba_save_v66';
      const val = localStorage.getItem(key);
      if (val) return val;
      return JSON.stringify(Object.fromEntries(Object.entries(localStorage)));
    });
    const f = path.join(SHOT_DIR, (name || `save-${Date.now()}`) + '.json');
    fs.writeFileSync(f, data || '{}');
    console.log('save-dump:', f, `(${((data?.length || 0) / 1024).toFixed(1)} KB)`);
  },

  // List all localStorage keys + sizes
  async 'ls-storage'() {
    if (!page) return console.log('ERROR: launch first');
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).map(k => `${k} (${localStorage.getItem(k)?.length || 0} chars)`)
    );
    console.log(keys.length ? keys.join('\n') : 'localStorage empty');
  },

  async reload() {
    if (!page) return console.log('ERROR: launch first');
    await page.reload({ waitUntil: 'networkidle' });
    console.log('reloaded:', await page.title());
  },

  async quit() {
    if (browser) await browser.close().catch(() => {});
    browser = null; page = null;
    console.log('quit.');
  },

  help() {
    console.log([
      'launch [port]        — auto-detect server (3333/3000/5000/8080); open app',
      'ss [name]            — screenshot viewport → ' + SHOT_DIR,
      'ss-full [name]       — full-page screenshot',
      'ss-el <css>          — screenshot single element',
      'click <css>          — click element by CSS selector',
      'click-text <text>    — click button/tab containing text',
      'nav [path]           — navigate to URL or path',
      'wait <css>           — wait for selector (10s)',
      'eval <js>            — evaluate JS in page, print JSON',
      'text [css]           — print innerText (3000 chars)',
      'errors               — show captured JS console errors',
      'save-dump [name]     — dump Engine/ba_save_v66 to JSON file',
      'ls-storage           — list all localStorage keys',
      'reload               — reload page',
      'quit                 — close browser',
    ].join('\n'));
  },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'bundesliga> ' });
console.log('Bundesliga driver — "help" for commands, "launch" to start');
rl.prompt();

let queue = Promise.resolve();
let rlClosed = false;
const prompt = () => { if (!rlClosed) rl.prompt(); };

rl.on('line', line => {
  queue = queue.then(async () => {
    const [cmd, ...rest] = line.trim().split(/\s+/);
    if (!cmd) return prompt();
    const fn = COMMANDS[cmd];
    if (!fn) { console.log('unknown:', cmd); return prompt(); }
    try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
    if (cmd === 'quit') { rlClosed = true; rl.close(); process.exit(0); }
    prompt();
  });
});

rl.on('close', () => {
  rlClosed = true;
  queue.then(async () => { await COMMANDS.quit(); process.exit(0); });
});
