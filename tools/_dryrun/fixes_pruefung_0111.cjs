// FIXES_OFFEN.md: offene Punkte gegen den heutigen Stand geprüft (01.11.2026, Nutzer: „gibt es noch fix-punkte, die eventuell
// mittlerweile veraltet sind“) – Messwerte erneuert, ein Punkt erledigt.
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../FIXES_OFFEN.md');
const t = fs.readFileSync(P, 'utf8'), nl = t.includes('\r\n') ? '\r\n' : '\n'; let L = t.split(nl);
const finde = start => { const i = L.findIndex(l => l.startsWith(start)); if (i < 0 || L.filter(l => l.startsWith(start)).length !== 1) throw new Error('Anker: ' + start); return i; };
// 1) Reserve in der Liga der Ersten – neu gemessen
L[finde('- II in derselben Liga wie die Erste')] = '- II in derselben Liga wie die Erste, wenn die Erste in eine Bodenliga absteigt, in der die II schon spielt – darunter gibt es keine Liga, die Reserve-Kaskade (5b) bricht ab. Neu gemessen 01.11.2026 (node tools/reserve_gleiche_liga_mess.cjs 30 3): 197 Reserve-Saisons in 90 Saisons, 19 Mannschaften – Idar-Oberstein II (Bezirksliga Nahe) 29, Concordia Hamburg II 26, SV Eichede II 20, Rot-Weiss Walldorf II 19, FC 08 Villingen II 17, Eintracht Mahlsdorf II 14 (vorher 21.10.2026 dieselben Spitzenreiter). Lösung offen (Amateurpokal? Pause der II?)';
// 2) Drift der Bodenligen – neu gemessen, Lage schlechter
L[finde('- Drift der Bodenligen')] = '- Drift der Bodenligen (neu gemessen 01.11.2026, node tools/sim_headless.cjs drift 60 4, Anteil der Zeit außerhalb des Bandes): Verbandsliga Hessen Süd 62 % zu groß (August 38 %), Bezirksliga Rheinhessen 58 % zu klein (34 %), Landesliga Lüneburg 57 % zu groß (51 %), Verbandsliga Sachsen-Anhalt 50 % zu klein (neu), Landesliga Bremen 42 % zu klein (neu), Landesliga Bayern Nordost 41 % zu klein (38 %); Bayern Mitte (August 40 %) jetzt unter 5 %. Vor jeder Band-Änderung Trend über ≥ 100 Saisons (CLAUDE.md)';
// 3) Browser-Handouts P3 – Stand jetzt bekannt
L[finde('- Browser-Handouts P3')] = '- Browser-Handouts P3: Stadien für 7 Vereine – Stand 01.11.2026: 6 haben weiterhin kein Stadion in game_data (venues leer: Sportfreunde Hamborn 07, HEBC Hamburg, ETSV Hamburg, SVGO Bremen, CFC Hertha 06, SV Wermelskirchen; „HNT“ nicht eindeutig zugeordnet) – ohne Stadion fehlt ihnen die Vereinsgröße aus der Kapazität. Dazu 4 Entscheidungen (Stand unklar)';
// 4) Badges M/P mobil – geprüft, erledigt
const b = finde('- Mobil-Check Historie (Badges M/P');
L.splice(b, 1);
const e = L.findIndex((l, i) => i > L.findIndex(x => x.startsWith('## ✅ Erledigt')) && /^\|---/.test(l));
L.splice(e + 1, 0, '| Mobil-Check Historie (Badges M/P am Vereinsnamen in der .ltab-Tabelle) – vermutlich längst erledigt, im Spiel prüfen | 01.11.2026 geprüft, stand schon so (kein Build nötig): Handy 412 px, Archiv Bundesliga 1991/92 „(M)“ Kaiserslautern und „(P)“ Werder sichtbar und nicht abgeschnitten, ebenso live nach einer Sim-Saison; Pkt-Spalte im Bild, keine waagerechte Verschiebung. Prüfung .claude/skills/run/badges_mobil_check.mjs (--selbsttest blendet die Abzeichen aus – fällt durch). Bilder docs/badges-mobil/ |');
fs.writeFileSync(P, L.join(nl)); console.log('ok');
