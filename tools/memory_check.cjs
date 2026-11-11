#!/usr/bin/env node
// Memory-Hygiene (SessionStart-Hook). Gibt nur etwas aus, wenn es einen Befund gibt;
// die Ausgabe landet im Kontext von Claude, der den Nutzer dann darauf anspricht.
//   node tools/memory_check.cjs            -> Hook-Modus (Statuspruefung hoechstens alle 30 Tage)
//   node tools/memory_check.cjs --alles    -> alles sofort zeigen, Stempel ignorieren
//   node tools/memory_check.cjs --selbsttest -> prueft die Pruefung gegen einen kaputten Index
const fs = require('fs'), path = require('path'), os = require('os');

const MAX_BYTES = 9000, MAX_ZEILE = 160, STATUS_TAGE = 30;
// Grossschreibung bei OFFEN/GELOEST gewollt: „offen fragen“ ist keine Statusmarke.
const STATUS_RE = /\bOFFEN\b|GEL(Ö|OE)ST|\bausstehend\b|[Zz]ur(ü|ue)ckgestellt|\b[Hh]istorisch\b|(ü|ue|Ü)berholt/;

function memDir(projectDir) {
    const mangled = path.resolve(projectDir).replace(/[:\\/ ]/g, '-');
    return path.join(os.homedir(), '.claude', 'projects', mangled, 'memory');
}

function pruefe(dir, { statusFaellig }) {
    const idx = path.join(dir, 'MEMORY.md');
    if (!fs.existsSync(idx)) return [];
    const text = fs.readFileSync(idx, 'utf8');
    const befunde = [];
    const bytes = Buffer.byteLength(text);
    if (bytes > MAX_BYTES) befunde.push(`MEMORY.md hat ${bytes} Bytes (> ${MAX_BYTES}) – Einträge kürzen oder Abgeschlossenes nach _archiv/.`);
    const lang = text.split('\n').filter(z => z.length > MAX_ZEILE);
    if (lang.length) befunde.push(`${lang.length} Indexzeile(n) über ${MAX_ZEILE} Zeichen – Index sagt nur, WANN ein Eintrag relevant ist.`);
    const verlinkt = [...text.matchAll(/\]\(([^)]+\.md)\)/g)].map(m => m[1]);
    const fehlt = verlinkt.filter(f => !fs.existsSync(path.join(dir, f)));
    if (fehlt.length) befunde.push(`Index verweist auf fehlende Datei(en): ${fehlt.join(', ')}`);
    const dateien = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
    const verwaist = dateien.filter(f => !verlinkt.includes(f));
    if (verwaist.length) befunde.push(`Datei(en) ohne Indexzeile: ${verwaist.join(', ')}`);
    if (statusFaellig) {
        const alt = Date.now() - STATUS_TAGE * 864e5;
        const kandidaten = text.split('\n').filter(z => STATUS_RE.test(z)).map(z => {
            const m = z.match(/\]\(([^)]+\.md)\)/); if (!m) return null;
            const p = path.join(dir, m[1]);
            return fs.existsSync(p) && fs.statSync(p).mtimeMs < alt ? m[1] : null;
        }).filter(Boolean);
        if (kandidaten.length) befunde.push(`Status-Einträge seit > ${STATUS_TAGE} Tagen unverändert (noch offen? sonst _archiv/): ${kandidaten.join(', ')}`);
    }
    return befunde;
}

function selbsttest() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memchk-'));
    fs.writeFileSync(path.join(tmp, 'MEMORY.md'), '- [A](a.md) — ' + 'x'.repeat(200) + '\n- [B](fehlt.md) — offen\n');
    fs.writeFileSync(path.join(tmp, 'a.md'), 'a'); fs.writeFileSync(path.join(tmp, 'waise.md'), 'w');
    const kaputt = pruefe(tmp, { statusFaellig: true });
    fs.writeFileSync(path.join(tmp, 'MEMORY.md'), '- [A](a.md) — kurz\n- [W](waise.md) — kurz\n');
    const sauber = pruefe(tmp, { statusFaellig: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    const ok = kaputt.length === 3 && sauber.length === 0;
    console.log(ok ? 'selbsttest OK (kaputt: 3 Befunde, sauber: 0)' : `selbsttest FEHLER kaputt=${kaputt.length} sauber=${sauber.length}`);
    process.exit(ok ? 0 : 1);
}

if (process.argv.includes('--selbsttest')) selbsttest();
const alles = process.argv.includes('--alles');
const dir = memDir(process.env.CLAUDE_PROJECT_DIR || process.cwd());
if (!fs.existsSync(dir)) process.exit(0);
const stempel = path.join(dir, '.status_geprueft');
const statusFaellig = alles || !fs.existsSync(stempel) || Date.now() - fs.statSync(stempel).mtimeMs > STATUS_TAGE * 864e5;
const befunde = pruefe(dir, { statusFaellig });
if (statusFaellig && !alles) fs.writeFileSync(stempel, new Date().toISOString());
if (befunde.length) {
    console.log('MEMORY-HYGIENE (tools/memory_check.cjs) – sprich den Nutzer zu Beginn kurz darauf an und schlage die Bereinigung vor:');
    befunde.forEach(b => console.log('- ' + b));
}
