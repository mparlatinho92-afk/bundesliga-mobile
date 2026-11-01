// Plauen (31.10.2026): RSSF und fussball-ddr.de widersprechen sich nicht.
//   RSSF / de.wikipedia VFC Plauen: Motor WEMA 1962–76 → „Am 1. Juni 1976 … Motor WEMA/Aufbau Plauen“ → 1990 VFC = EINE Linie (Umbenennung)
//   fussball-ddr.de: die BSG Aufbau Plauen (1974/75) ging 1976 darin auf = Fusion
// Bisher hingen „WEMA/Aufbau Plauen“-Schreibungen per hist_schreibweise an einer eigenen ID (1976–88), und die Fusion zeigte auf sie →
// die VFC-Linie war gespalten (vier falsche „↘ Rückzug“). Jetzt: Schreibungen → richtig geschriebener Name (Alias → vfcplauen_837),
// Fusion Aufbau → VFC Plauen 1976 (Nachfolger steht 1976/77 zuerst in den Daten).
//   node tools/_dryrun/plauen_zuordnung.cjs [--schreiben]
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const SCHREIB = {
    'WEMA/Aufbau Plauen': 'Motor WEMA/Aufbau Plauen',
    'WEMA/Auf bau Plauen': 'Motor WEMA/Aufbau Plauen',
};   // „Wema/…“ (1976, 1977, 1983) fängt der Einbau ohne Eintrag: Großschreibung gleich
const ALT = 'hist_fa_wemaaufbauplauen', NEU = 'vfcplauen_837';
const lies = f => { const p = path.join(T, f), t = fs.readFileSync(p, 'utf8'); return { p, t, o: JSON.parse(t) }; };
const schreib = ({ p, t }, o) => { let s = JSON.stringify(o, null, 2); if (t.includes('\r\n')) s = s.replace(/\n/g, '\r\n'); if (/\n$/.test(t)) s += t.includes('\r\n') ? '\r\n' : '\n'; fs.writeFileSync(p, s); };
const sw = lies('hist_schreibweise.json'), fu = lies('hist_fusion.json'), al = lies('hist_alias.json');
if (al.o['Motor WEMA/Aufbau Plauen'] !== NEU) throw new Error('Alias Motor WEMA/Aufbau Plauen fehlt');
if (!fu.o[ALT] || fu.o[NEU] || JSON.stringify(fu.o[ALT].vorgaenger) !== '["hist_fa_aufbauplauen"]') throw new Error('Fusion-Anker');
console.log('Fusion alt:', ALT, JSON.stringify(fu.o[ALT]));
if (process.argv.includes('--schreiben')) {
    let n = 0; for (const [k, v] of Object.entries(SCHREIB)) if (sw.o[k] !== v) { sw.o[k] = v; n++; }
    schreib(sw, sw.o);
    const neu = {}; for (const [k, v] of Object.entries(fu.o)) neu[k === ALT ? NEU : k] = v;
    schreib(fu, neu);
    console.log('hist_schreibweise.json', n, 'gesetzt, hist_fusion.json', ALT, '→', NEU);
}
