#!/usr/bin/env node
/**
 * spiegel-fixes.cjs — FIXES_OFFEN.md als Google Sheet nach Drive spiegeln.
 *
 * Die Markdown-Datei im Projekt ist die Quelle. Drive haelt EIN festes Sheet
 * („Bundesliga Fixes – Ist-Stand", Ordner „Bundesliga HTML"), das bei jeder Aenderung
 * in place ueberschrieben wird — der Link bleibt gleich. Uebernommen aus dem F1-RPG
 * (dort seit 11.10.2026), Konzept: docs/fixes-sync/KONZEPT.md. Abweichungen hier:
 * VERSION aus template.html (index.html ist der Monolith), Changelog aus CHANGELOG.md.
 *
 *   Blatt „Fixes"    (sheetId 0): Status · Bereich · Punkt · Beleg — eine Zeile je Punkt
 *   Blatt „Konzepte" (sheetId 1): Thema · Text — Unterpunkte und Absaetze (lange Konzepttexte)
 *
 * Schreiben kann nur Claude ueber den Sheets-Connector; dieses Skript erzeugt
 * die Zellwerte und merkt sich den gespiegelten Stand. Formatierung (Statusfarben,
 * Filter, Spaltenbreiten) liegt fest im Sheet und wird nicht neu geschrieben.
 *
 *   node tools/spiegel-fixes.cjs            Status: ist das Sheet aktuell? Link
 *   node tools/spiegel-fixes.cjs --zeilen   Werte fuer batch_clear_values + update_values erzeugen, Pfad ausgeben
 *   node tools/spiegel-fixes.cjs --uebernehmen <datei.json>   Zeilen aus dem Sheet in FIXES_OFFEN.md uebernehmen
 *   node tools/spiegel-fixes.cjs --fertig [sheetId]   gespiegelten Stand eintragen
 *   node tools/spiegel-fixes.cjs --seit     Versionen seit dem letzten Abgleich mit Changelog-Punkten (manage-v Schritt 8)
 *   node tools/spiegel-fixes.cjs --geprueft   Abgleich gegen die aktuelle VERSION in FIXES_OFFEN.md eintragen
 *   node tools/spiegel-fixes.cjs --hook     Stop-Hook (.claude/settings.json)
 *
 * Pruefung je Version (Nutzer-Wunsch 14.10.2026: „bei jeder neuen Version auf Aenderungen pruefen"):
 * Merker ist die Kopfzeile „Abgeglichen gegen: vX" in FIXES_OFFEN.md selbst — kein zweiter Zustand,
 * der auseinanderlaufen kann. Steht VERSION in template.html hoeher, blockt der Stop-Hook einmal und
 * verlangt beide Richtungen: (a) Sheet-Eintraege des Nutzers abholen (Fixes!F:F), auch wenn die
 * Markdown-Datei unveraendert ist, (b) die Changelog-Punkte der neuen Versionen gegen die offenen
 * Punkte halten. --geprueft schreibt die Kopfzeile neu; das aendert den Hash, also spiegelt der
 * naechste Hook-Lauf automatisch.
 *
 * Eigene Zeilen im Sheet (Nutzer-Wunsch 11.10.2026: „mich weiter im Sheet eintragen
 * lassen, nichts darf verloren gehen"): Spalte E traegt je gespiegelter Zeile eine
 * Kennung (Status + Anfang des Punkts), Spalte F prueft per ARRAYFORMULA in F2
 * „neu" (keine Kennung) bzw. „geändert" (Kennung passt nicht mehr) — seit 14.10.2026 in F1, nicht F2
 * (siehe markierungVon). VOR jedem
 * Schreiben liest Claude Fixes!F:F; markierte Zeilen kommen per --uebernehmen in den
 * Abschnitt „✚ Aus dem Sheet – ungeprüft" der Markdown-Datei. Erst dann wird
 * ueberschrieben. Eine Aenderung nur hinten im Punkt-Text (nach Zeichen 30) oder
 * nur am Bereich erkennt die Formel nicht.
 * ⚠ Das Sheet steht auf de_DE: Formeln brauchen „;" als Trenner, auch ueber die API.
 *   Mit „," und Array-Literal {…} kam #ERROR! (gemessen 12.10.2026). F1/F2 schreibt
 *   Die Spiegelung schreibt F nie (sie leert nur A2:E). Formel in F1:
 *   =ARRAYFORMULA(IF(ROW(C1:C)=1;"Prüfen";IF(C1:C="";"";IF(E1:E="";"neu";IF(E1:E=A1:A&LEFT(C1:C;30);"";"geändert")))))
 *
 * ⚠ Der Connector kennt kein valueInputOption=RAW: update_values parst wie die
 *   Oberflaeche („0.9.21.3" → Datum). Deshalb jede Zelle mit fuehrendem Apostroph.
 *   (updateCells mit stringValue ginge auch, ist aber doppelt so gross: 30 statt 15 KB.)
 * ⚠ 4-Byte-Emoji (🟡) wurden schon beim Doc-Import zerlegt; 🟡 wird zu ◐.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const QUELLE = path.join(ROOT, 'FIXES_OFFEN.md');
const STAND = path.join(__dirname, 'fixes-spiegel.json');
const ZIEL = path.join(os.tmpdir(), 'fixes-offen-werte.json');
const SHEET_ABSCHNITT = '## ✚ Aus dem Sheet – ungeprüft';
const KENNUNG_LAENGE = 30;                   // muss zur Formel in Fixes!F2 passen: LEFT(C2:C;30)

const hashVon = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
const leseStand = () => { try { return JSON.parse(fs.readFileSync(STAND, 'utf8')); } catch (e) { return {}; } };
const sheetLink = id => `https://docs.google.com/spreadsheets/d/${id}/edit`;

// ---------------------------------------------------------------- Versionsabgleich
const TEMPLATE = path.join(ROOT, 'template.html');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const ABGLEICH = /\*\*Abgeglichen gegen:\*\* v([\d.]+), Prüfdatum \*\*([\d-]+)\*\*(?: \([^)]*\))?\./;
const vergleiche = (a, b) => {
    const x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
};
const aktuelleVersion = () => {
    const m = fs.readFileSync(TEMPLATE, 'utf8').match(/const VERSION = ['"]([\d.]+)['"]/);
    return m ? m[1] : null;
};
const abgeglichen = md => { const m = md.match(ABGLEICH); return m ? { version: m[1], datum: m[2] } : null; };

// Changelog-Bloecke aus CHANGELOG.md („## v0.8.213 (14.10.2026)" + „- "-Zeilen), neueste zuerst,
// bis zur bereits abgeglichenen Version (exklusiv)
function changelogSeit(seit) {
    const bloecke = [];
    for (const z of fs.readFileSync(CHANGELOG, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')) {
        const kopf = z.match(/^##\s+v([\d.]+)\s*\(([^)]*)\)/);
        if (kopf) {
            if (seit && vergleiche(kopf[1], seit) <= 0) break;
            bloecke.push({ version: kopf[1], datum: kopf[2], punkte: [] });
            continue;
        }
        const punkt = z.match(/^-\s+(.*)$/);
        if (punkt && bloecke.length) bloecke[bloecke.length - 1].punkte.push(punkt[1].trim());
    }
    return bloecke;
}

// ---------------------------------------------------------------- Markdown → Zeilen
const STATUS = /^([✅◐❌❔❓✚])\s*/;
const STATUS_FOLGE = ['✚', '❌', '◐', '❔', '–', '✅'];
const VERSION = /v\d+\.\d+\.\d+(?:\.\d+)?/g;
// Kurzname eines Punkts fuer die Thema-Spalte: bis zum ersten Doppelpunkt/Klammer, an Wortgrenze gekuerzt
const kurzVon = punkt => {
    const k = punkt.replace(/[:(—].*$/, '').trim();
    return k.length <= 50 ? k : k.slice(0, 50).replace(/\s+\S*$/, '') + ' …';
};

function klartext(s) {
    return s.replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
        .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
        .replace(/\s+/g, ' ').trim();
}

function zuZeilen(md) {
    const fixes = [];        // [status, bereich, punkt, beleg]
    const konzepte = [];     // [thema, text]
    let gruppe = '';         // Status der ##-Gruppe
    let bereich = 'Allgemein';
    let eltern = null;       // letzte Fixes-Zeile (fuer Unterpunkte)
    let block = null;        // offener Eintrag {art, tiefe, text}
    let erledigtTabelle = false;

    const thema = () => bereich + (eltern ? ' – ' + eltern.kurz : '');
    const zu = () => {
        if (!block) return;
        const text = klartext(block.text);
        if (block.art === 'absatz') {
            konzepte.push([bereich, text]);
            // offener Bereich, der nur als Absatz beschrieben ist (Fahrer-Stats): eigene Fixes-Zeile
            if (gruppe === '❌' && !fixes.some(f => f[1] === bereich))
                fixes.push(['❌', bereich, kurzVon(text) + '  → Details: Blatt Konzepte', '']);
        }
        else if (block.tiefe > 0 || !gruppe) konzepte.push([block.tiefe > 0 ? thema() : bereich, text]);
        else {
            const m = text.match(STATUS);
            const status = m ? m[1].replace('❓', '❔') : (gruppe === '◐' ? '–' : gruppe || '–');
            const punkt = m ? text.slice(m[0].length) : text;
            const beleg = [...new Set(punkt.match(VERSION) || [])].join(', ');
            const zeile = [status, bereich, punkt, beleg];
            fixes.push(zeile);
            eltern = { zeile, kurz: kurzVon(punkt) };
        }
        block = null;
    };

    for (const roh of md.replace(/\r/g, '').replace(/🟡/g, '◐').split('\n')) {
        const z = roh.trimEnd();
        const h = z.match(/^(#{2,3})\s+(.*)$/);
        if (h) {
            zu(); eltern = null; erledigtTabelle = false;
            const titel = klartext(h[2]);
            if (h[1] === '##') {
                const m = titel.match(STATUS);
                gruppe = m ? m[1] : '';
                bereich = m ? titel.slice(m[0].length) : titel;
                erledigtTabelle = gruppe === '✅';
            } else bereich = titel;
            continue;
        }
        if (/^\|/.test(z.trim())) {
            zu();
            if (/^\|[\s|:-]+\|$/.test(z.trim())) continue;
            const zellen = z.trim().replace(/^\||\|$/g, '').split('|').map(t => klartext(t));
            if (zellen[0] === 'Doc-Punkt' || zellen[0] === 'Punkt') continue;            // Kopfzeile
            if (erledigtTabelle) fixes.push(['✅', 'Erledigt', zellen[0], zellen[1] || '']);
            continue;
        }
        if (!z.trim() || /^---+$/.test(z.trim()) || /^#\s/.test(z)) { zu(); continue; }
        const li = z.match(/^(\s*)[-*]\s+(.*)$/);
        if (li) { zu(); block = { art: 'punkt', tiefe: li[1].length, text: li[2] }; continue; }
        if (block && (block.art === 'absatz' || /^\s+/.test(roh))) { block.text += ' ' + z.trim(); continue; }
        zu(); block = { art: 'absatz', text: z.trim() };
    }
    zu();
    // Unterpunkte zeigen auf das Konzepte-Blatt
    const mitKonzept = new Set(konzepte.map(k => k[0]));
    for (const f of fixes) {
        if (mitKonzept.has(f[1] + ' – ' + kurzVon(f[2]))) f[2] += '  → Details: Blatt Konzepte';
    }
    // Default-Sortierung nach Status (Nutzer-Wunsch 11.10.2026): Sortieren im Sheet ist einmalig und
    // geht bei jeder Spiegelung verloren, deshalb hier. Stabil: innerhalb eines Status bleibt die Listenfolge.
    const rang = s => { const i = STATUS_FOLGE.indexOf(s); return i < 0 ? STATUS_FOLGE.length : i; };
    fixes.sort((a, b) => rang(a[0]) - rang(b[0]));
    return { fixes, konzepte };
}

// ---------------------------------------------------------------- Werte
// Fuehrender Apostroph: Sheets speichert den Rest als Text, ohne ihn als Zahl/Datum/Formel zu lesen.
const alsText = rows => rows.map(r => r.map(t => t === '' ? '' : "'" + t));

// Kennung in Spalte E: dieselbe Rechnung wie die Formel in Fixes!F2 (A & LEFT(C;30))
const kennungVon = (status, punkt) => status + punkt.slice(0, KENNUNG_LAENGE);

function werte({ fixes, konzepte }) {
    return {
        // offene Bereiche: auch Zeilen, die der Nutzer unterhalb von Zeile 1000 angelegt hat
        leeren: ['Fixes!A2:E', 'Konzepte!A2:B'],
        fixes: {
            range: 'Fixes!A1',
            values: alsText([['Status', 'Bereich', 'Punkt', 'Beleg / Version', 'Kennung'],
                ...fixes.map(f => [...f, kennungVon(f[0], f[2])])])
        },
        konzepte: { range: 'Konzepte!A1', values: alsText([['Thema', 'Text'], ...konzepte]) }
    };
}

// Zeilen aus dem Sheet in den Abschnitt „✚ Aus dem Sheet – ungeprüft" schreiben.
// Erwartet ein JSON-Array aus [status, bereich, punkt, beleg, pruefen] (wie get_values A:F liefert).
// Ist die Datei der komplette Abzug Fixes!A:F (Kopfzeile „Status"), rechnet das Skript die Markierung
// selbst nach, statt Spalte F zu glauben. Anlass 14.10.2026: Die Formel stand in F2, der Nutzer fuegte
// darueber Zeilen ein, sie rutschte nach F8 — die neuen Zeilen 2–7 waren unmarkiert, F sah „sauber" aus.
// Seit dann steht sie in F1 (ROW()=1 → Kopf), das verschiebt sich nicht mehr; die Gegenrechnung bleibt.
function markierungVon(z) {
    const [status = '', , punkt = '', , kennung = ''] = z;
    if (!punkt.trim()) return '';
    if (!kennung) return 'neu';
    return kennung === status + punkt.slice(0, KENNUNG_LAENGE) ? '' : 'geändert';
}

function uebernehmen(datei) {
    let zeilen = JSON.parse(fs.readFileSync(datei, 'utf8'));
    if (zeilen.length && zeilen[0] && zeilen[0][0] === 'Status') {
        const daten = zeilen.slice(1);
        const abweichend = daten.filter(z => z && markierungVon(z) !== (z[5] || ''));
        if (abweichend.length) console.log('⚠ Spalte F weicht bei ' + abweichend.length
            + ' Zeile(n) von der Nachrechnung ab — Formel in Fixes!F1 pruefen. Uebernommen wird nach der Nachrechnung.');
        zeilen = daten.filter(z => z && markierungVon(z)).map(z => [0, 1, 2, 3].map(i => z[i] || '').concat(markierungVon(z)));
    }
    zeilen = zeilen.filter(z => z && (z[2] || '').trim());
    if (!zeilen.length) { console.log('Nichts zu übernehmen.'); return; }
    const punkte = zeilen.map(([status = '', bereich = '', punkt = '', beleg = '', pruefen = '']) => {
        const teile = [];
        if (bereich.trim()) teile.push('Bereich: ' + bereich.trim());
        if (status.trim() && status.trim() !== '✚') teile.push('Status im Sheet: ' + status.trim());
        if (beleg.trim()) teile.push('Beleg: ' + beleg.trim());
        if (pruefen.trim() === 'geändert') teile.push('im Sheet geändert, Original steht weiter in der Liste');
        return '- ✚ ' + punkt.trim() + (teile.length ? ' (' + teile.join('; ') + ')' : '');
    });
    let md = fs.readFileSync(QUELLE, 'utf8');
    const nl = md.includes('\r\n') ? '\r\n' : '\n';
    if (md.includes(SHEET_ABSCHNITT)) {
        // ans Ende des bestehenden Abschnitts haengen (vor der naechsten Trennlinie)
        const start = md.indexOf(SHEET_ABSCHNITT);
        const ende = md.indexOf(nl + '---', start);
        const vor = md.slice(0, ende).replace(/\s+$/, '');
        md = vor + nl + punkte.join(nl) + nl + nl + md.slice(ende).replace(/^\s+/, '');
    } else {
        // neuer Abschnitt direkt nach der ersten Trennlinie, also vor allen anderen Gruppen
        const erste = md.indexOf(nl + '---' + nl) + (nl + '---' + nl).length;
        md = md.slice(0, erste) + nl + SHEET_ABSCHNITT + nl + nl
            + 'Im Sheet von Hand eingetragen, noch nicht eingeordnet. Beim nächsten Abgleich prüfen und einsortieren.'
            + nl + nl + punkte.join(nl) + nl + nl + '---' + nl + md.slice(erste);
    }
    fs.writeFileSync(QUELLE, md, 'utf8');
    console.log('Übernommen: ' + punkte.length + ' Zeile(n) → „' + SHEET_ABSCHNITT.slice(3) + '"');
}

// ---------------------------------------------------------------- Modi
const arg = process.argv[2] || '';

if (arg === '--hook') {
    // Stop-Hook: scheitert immer still — ein Hook, der einen Task abbricht,
    // ist schlimmer als eine verspaetete Spiegelung.
    let ein = '';
    process.stdin.on('data', c => ein += c);
    process.stdin.on('end', () => {
        try {
            const daten = ein ? JSON.parse(ein) : {};
            if (daten.stop_hook_active) return;               // keine Schleife
            const stand = leseStand();
            const md = fs.readFileSync(QUELLE, 'utf8');
            const ab = abgeglichen(md), version = aktuelleVersion();
            if (ab && version && vergleiche(version, ab.version) > 0) {
                console.log(JSON.stringify({
                    decision: 'block',
                    reason: `Neue Version v${version}, FIXES_OFFEN.md ist zuletzt gegen v${ab.version} abgeglichen. `
                        + 'Pruefung je Version: (0) FIXES_OFFEN.md lesen. (1) Im Sheet '
                        + `${stand.sheetId || '<sheetId>'} mit get_values Fixes!A:F lesen, den kompletten Abzug (mit Kopfzeile) `
                        + 'als JSON-Array in eine Datei schreiben und `node tools/spiegel-fixes.cjs --uebernehmen <datei>` (rechnet neu/geändert selbst nach) — '
                        + 'auch wenn die Markdown-Datei sonst unveraendert ist. '
                        + '(2) `node tools/spiegel-fixes.cjs --seit` zeigt die Changelog-Punkte der neuen Versionen: '
                        + 'jeden gegen die offenen Punkte (❌ ◐ ❔ ✚) halten; nur mit Beleg im Code auf ✅ setzen und die Version dazuschreiben. '
                        + 'Manuelle Notizen und ✚-Zeilen nie loeschen oder umformulieren. '
                        + '(3) `node tools/spiegel-fixes.cjs --geprueft`. (4) Danach spiegeln (der Hook nennt die Schritte). '
                        + '(5) Dem Nutzer knapp sagen: was aus dem Sheet kam, welche Punkte sich geaendert haben — oder dass nichts betroffen war.'
                }));
                return;
            }
            if (hashVon(md) === stand.hash) return;
            console.log(JSON.stringify({
                decision: 'block',
                reason: 'FIXES_OFFEN.md wurde geaendert und ist noch nicht ins Google Sheet gespiegelt. '
                    + 'Ablauf: (0) ZUERST mit get_values Fixes!A:F lesen, den kompletten Abzug (mit Kopfzeile) als JSON-Array '
                    + 'in eine Datei schreiben und '
                    + '`node tools/spiegel-fixes.cjs --uebernehmen <datei>` ausfuehren — sonst gehen Eintraege des Nutzers verloren. '
                    + '(1) `node tools/spiegel-fixes.cjs --zeilen` ausfuehren, (2) im Sheet '
                    + `${stand.sheetId || '<sheetId>'} mit Google Sheets batch_clear_values die Bereiche "leeren" leeren, `
                    + 'dann update_values mit "fixes" und "konzepte" aus der erzeugten Datei, '
                    + '(3) mit get_values Fixes!A1:D5 und Konzepte!A1:B3 kurz pruefen, '
                    + '(4) `node tools/spiegel-fixes.cjs --fertig`, (5) dem Nutzer sagen, dass der Link gleich bleibt.'
            }));
        } catch (e) { /* still */ }
    });
} else if (arg === '--zeilen') {
    const daten = zuZeilen(fs.readFileSync(QUELLE, 'utf8'));
    const req = werte(daten);
    fs.writeFileSync(ZIEL, JSON.stringify(req), 'utf8');
    const rest = JSON.stringify(req).match(/[\u{10000}-\u{10FFFF}]/gu);
    console.log('Werte:     ' + ZIEL + '  (' + daten.fixes.length + ' Fixes, ' + daten.konzepte.length + ' Konzept-Zeilen)');
    console.log('Sheet:     ' + (leseStand().sheetId || '(noch keins)'));
    if (process.argv.includes('--zeigen')) {
        for (const f of daten.fixes) console.log(f.join(' | '));
        console.log('---');
        for (const k of daten.konzepte) console.log(k.join(' | '));
    }
    if (rest) console.log('⚠ 4-Byte-Zeichen: ' + [...new Set(rest)].join(' '));
} else if (arg === '--seit') {
    // Nur lesen, scheitert nie laut: laeuft am Ende von manage-v, der Push ist da schon durch.
    try {
        const ab = abgeglichen(fs.readFileSync(QUELLE, 'utf8'));
        const version = aktuelleVersion();
        if (!ab) { console.log('Fix-Liste: Kopfzeile „Abgeglichen gegen" fehlt in FIXES_OFFEN.md.'); process.exit(0); }
        const bloecke = changelogSeit(ab.version);
        if (!bloecke.length) { console.log(`Fix-Liste: abgeglichen gegen v${ab.version} (${ab.datum}) — aktuell.`); process.exit(0); }
        console.log(`Fix-Liste: abgeglichen gegen v${ab.version} (${ab.datum}), aktuell v${version} — ${bloecke.length} Version(en) ungeprüft:`);
        for (const b of bloecke) {
            console.log(`  v${b.version} (${b.datum})`);
            for (const p of b.punkte) console.log('     • ' + p);
        }
        console.log('Claude gleicht das am Ende der nächsten Antwort mit der Liste und dem Sheet ab (Stop-Hook).');
    } catch (e) { console.log('Fix-Liste: Prüfung übersprungen (' + e.message + ')'); }
} else if (arg === '--geprueft') {
    const md = fs.readFileSync(QUELLE, 'utf8');
    const ab = abgeglichen(md), version = aktuelleVersion();
    if (!ab || !version) { console.error('Kopfzeile „Abgeglichen gegen" oder VERSION nicht gefunden.'); process.exit(1); }
    if (vergleiche(version, ab.version) <= 0) { console.log(`Schon abgeglichen gegen v${ab.version}.`); process.exit(0); }
    const heute = new Date().toISOString().slice(0, 10);
    const zeile = `**Abgeglichen gegen:** v${version}, Prüfdatum **${heute}** (vorher ${ab.datum} @ v${ab.version}).`;
    fs.writeFileSync(QUELLE, md.replace(ABGLEICH, zeile), 'utf8');
    console.log('Eingetragen: ' + zeile);
} else if (arg === '--uebernehmen') {
    if (!process.argv[3]) { console.error('Aufruf: --uebernehmen <datei.json>'); process.exit(1); }
    uebernehmen(process.argv[3]);
} else if (arg === '--fertig') {
    const alt = leseStand();
    const id = process.argv[3] || alt.sheetId;
    if (!id) { console.error('Aufruf: --fertig <sheetId>'); process.exit(1); }
    const stand = {
        sheetId: id,
        link: sheetLink(id),
        hash: hashVon(fs.readFileSync(QUELLE, 'utf8')),
        gespiegelt: new Date().toISOString()
    };
    fs.writeFileSync(STAND, JSON.stringify(stand, null, 2) + '\n', 'utf8');
    console.log('Eingetragen: ' + stand.link);
} else {
    const stand = leseStand();
    const aktuell = hashVon(fs.readFileSync(QUELLE, 'utf8')) === stand.hash;
    console.log(aktuell ? '✅ Sheet ist aktuell.' : '❌ FIXES_OFFEN.md wurde seit der letzten Spiegelung geändert.');
    if (stand.link) console.log('Sheet: ' + stand.link + '  (gespiegelt ' + stand.gespiegelt + ')');
    if (!aktuell) console.log('Spiegeln kann nur Claude (Sheets-Connector) — der Stop-Hook stößt das am Ende der nächsten Antwort an,'
        + '\noder sag einfach „spiegeln".');
}
