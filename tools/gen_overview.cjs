const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'game_data.js'), 'utf8');
eval(src.replace('const GAME_DATA', 'var GAME_DATA'));

const leagues = GAME_DATA.leagues;
const teams = Object.values(GAME_DATA.teams);

const rows = teams.map(t => {
  const liga = leagues[t.leagueId];
  const hasCoord = !(t.lat === 0 && t.lon === 0);
  return {
    name: t.name,
    liga: liga ? liga.name : (t.leagueId || 'Unbekannt'),
    level: liga ? liga.level : 99,
    lat: hasCoord ? t.lat : null,
    lon: hasCoord ? t.lon : null,
    ok: hasCoord,
    isReserve: t.isReserve || false
  };
}).sort((a, b) => {
  if (a.level !== b.level) return a.level - b.level;
  return (a.liga || '').localeCompare(b.liga || '', 'de') || (a.name || '').localeCompare(b.name || '', 'de');
});

const withCoord = rows.filter(r => r.ok).length;
const without = rows.filter(r => !r.ok).length;

const byLiga = {};
for (const r of rows) {
  if (!byLiga[r.liga]) byLiga[r.liga] = { level: r.level, teams: [] };
  byLiga[r.liga].teams.push(r);
}

let tableRows = '';
const ligasSorted = Object.entries(byLiga).sort((a, b) =>
  a[1].level - b[1].level || (a[0] || '').localeCompare(b[0] || '', 'de'));

for (const [liga, data] of ligasSorted) {
  const ok = data.teams.filter(t => t.ok).length;
  const total = data.teams.length;
  const cls = ok === total ? 'liga-ok' : ok === 0 ? 'liga-none' : 'liga-partial';
  tableRows += `<tr class="liga-row ${cls}"><td colspan="4"><b>Level ${data.level} – ${liga}</b> (${ok}/${total})</td></tr>\n`;
  for (const t of data.teams) {
    const coord = t.ok
      ? `${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}`
      : '<span class="missing">fehlt</span>';
    const res = t.isReserve ? ' <span class="reserve">Res</span>' : '';
    tableRows += `<tr class="${t.ok ? 'ok' : 'nok'}"><td>${t.name}${res}</td><td>${t.liga}</td><td class="coord">${coord}</td><td>${t.ok ? '✓' : '✗'}</td></tr>\n`;
  }
}

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
  <div class="stat"><b>${without}</b>fehlend</div>
  <div class="stat"><b>${rows.length}</b>Teams gesamt</div>
  <div class="stat"><b>${Math.round(withCoord / rows.length * 100)}%</b>Abdeckung</div>
  <div class="stat" style="font-size:11px;color:#666;align-self:center">Stand: ${new Date().toLocaleDateString('de-DE')}<br>Quelle: europlan-online.de</div>
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
<tbody>${tableRows}</tbody>
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

fs.writeFileSync(path.join(__dirname, 'koordinaten_uebersicht.html'), html);
console.log(`Erstellt: tools/koordinaten_uebersicht.html (${rows.length} Teams, ${withCoord} mit Koordinaten)`);
