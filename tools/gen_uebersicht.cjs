/**
 * Generiert tools/koordinaten_uebersicht.html aus dem aktuellen game_data.js.
 * Nutzung: node tools/gen_uebersicht.cjs
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname,'..','game_data.js'),'utf8');
eval(src.replace('const GAME_DATA','var GAME_DATA'));

// ── Teams nach Liga gruppieren, Liga nach Level sortieren ─────────────────────
const leagueOrder = Object.values(GAME_DATA.leagues)
  .sort((a,b) => a.level - b.level || a.name.localeCompare(b.name,'de'));

const teamsByLeague = {};
const noLeagueTeams = [];

for (const t of Object.values(GAME_DATA.teams)) {
  if (t.leagueId && GAME_DATA.leagues[t.leagueId]) {
    (teamsByLeague[t.leagueId] = teamsByLeague[t.leagueId] || []).push(t);
  } else {
    noLeagueTeams.push(t);
  }
}

// Teams innerhalb Liga alphabetisch sortieren
for (const lid of Object.keys(teamsByLeague))
  teamsByLeague[lid].sort((a,b) => a.name.localeCompare(b.name,'de'));
noLeagueTeams.sort((a,b) => a.name.localeCompare(b.name,'de'));

// ── Statistiken ───────────────────────────────────────────────────────────────
const allTeams  = Object.values(GAME_DATA.teams);
const total     = allTeams.length;
const withCoord = allTeams.filter(t => !(t.lat===0 && t.lon===0)).length;
const missing   = total - withCoord;
const pct       = Math.round(withCoord / total * 100);
const today     = new Date().toLocaleDateString('de-DE');

// ── HTML-Zeilen bauen ─────────────────────────────────────────────────────────
function teamRow(t, ligaName) {
  const hasCoord = !(t.lat===0 && t.lon===0);
  const cls   = hasCoord ? 'ok' : 'nok';
  const coord = hasCoord
    ? `${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}`
    : '<span class="missing">fehlt</span>';
  const icon  = hasCoord ? '✓' : '✗';
  const res   = (t.isReserve || t.parentId) ? ' <span class="reserve">Res</span>' : '';
  const name  = t.name.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<tr class="${cls}"><td>${name}${res}</td><td>${ligaName}</td><td class="coord">${coord}</td><td>${icon}</td></tr>`;
}

function ligaClass(teams) {
  const n = teams.filter(t => !(t.lat===0 && t.lon===0)).length;
  if (n === teams.length) return 'liga-ok';
  if (n === 0) return 'liga-none';
  return 'liga-partial';
}

let rows = '';
for (const liga of leagueOrder) {
  const teams = teamsByLeague[liga.id] || [];
  if (!teams.length) continue;
  const ok  = teams.filter(t => !(t.lat===0&&t.lon===0)).length;
  const lc  = ligaClass(teams);
  rows += `<tr class="liga-row ${lc}"><td colspan="4"><b>Level ${liga.level} – ${liga.name}</b> (${ok}/${teams.length})</td></tr>\n`;
  rows += teams.map(t => teamRow(t, liga.name)).join('\n') + '\n';
}
if (noLeagueTeams.length) {
  const ok = noLeagueTeams.filter(t => !(t.lat===0&&t.lon===0)).length;
  const lc = ligaClass(noLeagueTeams);
  rows += `<tr class="liga-row ${lc}"><td colspan="4"><b>Ohne Liga / Reserve</b> (${ok}/${noLeagueTeams.length})</td></tr>\n`;
  rows += noLeagueTeams.map(t => teamRow(t,'–')).join('\n') + '\n';
}

// ── Vollständige HTML-Datei ───────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Team-Koordinaten Übersicht</title>
<style>
body{font-family:Arial,sans-serif;font-size:13px;margin:20px;background:#1a1a2e;color:#eee}
h1{color:#f0c040;margin-bottom:8px}
.stats{background:#252540;padding:12px 20px;border-radius:8px;margin-bottom:16px;display:flex;gap:30px;flex-wrap:wrap}
.stat{text-align:center}
.stat b{display:block;font-size:22px;color:#4fc3f7}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
input,select{padding:8px 12px;border-radius:6px;border:1px solid #555;background:#252540;color:#eee;font-size:13px}
input{width:280px}
table{border-collapse:collapse;width:100%}
th{background:#2a2a4a;padding:8px;text-align:left;position:sticky;top:0;z-index:1}
td{padding:3px 8px;border-bottom:1px solid #333}
tr.liga-row td{background:#1e2a3a;color:#90caf9;padding:6px 8px;font-size:12px}
tr.liga-ok td{border-left:3px solid #4caf50}
tr.liga-partial td{border-left:3px solid #ff9800}
tr.liga-none td{border-left:3px solid #f44336}
tr.ok{background:#1a2a1a}
tr.nok{background:#2a1a1a}
tr:hover td{background:#2a2a3a!important}
.coord{font-family:monospace;font-size:11px;color:#aaa}
.missing{color:#f44336;font-weight:bold}
.reserve{background:#333;color:#aaa;font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px}
</style>
</head>
<body>
<h1>Team-Koordinaten Übersicht</h1>
<div class="stats">
  <div class="stat"><b>${withCoord}</b>mit Koordinaten</div>
  <div class="stat"><b>${missing}</b>fehlend</div>
  <div class="stat"><b>${total}</b>Teams gesamt</div>
  <div class="stat"><b>${pct}%</b>Abdeckung</div>
  <div class="stat" style="font-size:11px;color:#888;align-self:center">Stand: ${today}<br>Quelle: europlan + Nominatim</div>
</div>
<div class="controls">
  <input id="s" type="text" placeholder="Vereinsname suchen…" oninput="f()">
  <select id="st" onchange="f()">
    <option value="all">Alle anzeigen</option>
    <option value="ok">Nur mit Koordinaten</option>
    <option value="nok">Nur fehlende</option>
  </select>
</div>
<table id="t">
<thead><tr><th>Verein</th><th>Liga</th><th>lat, lon</th><th></th></tr></thead>
<tbody>
${rows}</tbody>
</table>
<script>
function f() {
  const q = document.getElementById('s').value.toLowerCase();
  const st = document.getElementById('st').value;
  let lastLiga = null;
  document.querySelectorAll('#t tbody tr').forEach(tr => {
    if (tr.classList.contains('liga-row')) { lastLiga = tr; tr.style.display = ''; return; }
    const name = (tr.children[0]?.textContent || '').toLowerCase();
    const ok = tr.classList.contains('ok');
    const show = (!q || name.includes(q)) && (st === 'all' || (st === 'ok' && ok) || (st === 'nok' && !ok));
    tr.style.display = show ? '' : 'none';
  });
}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname,'koordinaten_uebersicht.html'), html, 'utf8');
console.log(`Übersicht: tools/koordinaten_uebersicht.html`);
console.log(`Teams: ${total} | Mit Koord: ${withCoord} | Fehlend: ${missing} | ${pct}%`);
