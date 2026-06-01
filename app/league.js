Object.assign(App, {
loadLeague: function(lid) {
    this.activeLeague = lid;
    this.renderSidebar();
    const l = Engine.leagues[lid];
    const logo = leagueLogo(lid);
    document.getElementById('league-title').innerHTML = (logo ? `<img src="${logo}">` : '') + l.name;
    
    let teamData = Engine.teams;
    if (this.viewHistoryOffset !== null && Engine.history[this.viewHistoryOffset]) {
        teamData = Engine.history[this.viewHistoryOffset].teams;
    }

    const teams = Object.values(teamData).filter(t => t.leagueId === lid);
    // NOTFALL-SORTIERUNG FALLS RANG FEHLT (Bayern nach oben, Daleiden nach unten)
    teams.sort((a,b) => (a.rank||99) - (b.rank||99) || (b.strength||0) - (a.strength||0));

    const dayResults = this.viewHistoryOffset === null
        ? (Engine.matchdayResults || []).filter(r => r.leagueId === lid)
        : [];
    let html = '';
    if (dayResults.length > 0) {
        html += `<div style="padding:8px 15px 6px; background:#1a1a1a; border-bottom:1px solid #333; font-size:13px;">
            <span style="opacity:0.5; margin-right:10px;">Spieltag ${Engine.currentMatchday}</span>
            ${dayResults.map(r => {
                const hw = r.score1 > r.score2, aw = r.score2 > r.score1;
                return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;margin-bottom:2px;">
                    <span style="color:${hw?'#4caf50':aw?'#f44336':'#ccc'}">${r.home}</span>
                    <b>${r.score1}:${r.score2}</b>
                    <span style="color:${aw?'#4caf50':hw?'#f44336':'#ccc'}">${r.away}</span>
                </span>`;
            }).join('')}
        </div>`;
    }
    const tv = this.tableView;
    const btn = (v, label) => `<button onclick="App.setTableView('${v}')" class="btn" style="padding:4px 12px;font-size:12px;background:${tv===v?'#555':'#333'};margin-right:4px;">${label}</button>`;
    html += `<div style="padding:6px 15px;background:#1a1a1a;border-bottom:1px solid #333;">
        ${btn('gesamt','Gesamt')}${btn('heim','Heim')}${btn('auswaerts','Auswärts')}
    </div>`;
    html += `<table><thead><tr><th>Pl.</th><th>Mannschaft</th><th>Sp.</th><th>G.</th><th>U.</th><th>V.</th><th>Tore</th><th>Diff.</th><th>Pkt.</th><th></th></tr></thead><tbody>`;

    let fixUp=0, varUp=0, fixDown=0, varDown=0;
    const count = teams.length;
    const overflow = count - l.target;

    if (l.level === 1) { fixDown=2; varDown=1; }
    else if (l.level === 2) { fixUp=2; varUp=1; fixDown=2; varDown=1; }
    else if (l.level === 3) { fixUp=2; varUp=1; fixDown=4; }
    else if (l.level === 4) {
        const info = Engine.getPromotionInfo();
        if(info.direct.some(n => l.name.includes(n))) fixUp=1; else varUp=1;
        fixDown=3; if(overflow>0) varDown=overflow;
    }
    else if (l.level > 4 && Engine.DOWN_MAP[l.id]) { fixUp=1; fixDown=3; if(overflow>0) varDown=overflow; }

    // Für Heim/Auswärts: neu sortieren (nur Display, t.rank bleibt für Logik)
    let displayTeams = [...teams];
    if (tv !== 'gesamt') {
        displayTeams.sort((a, b) => {
            const sa = (tv==='heim' ? a.homeStats : a.awayStats) || {pts:0,gf:0,ga:0};
            const sb = (tv==='heim' ? b.homeStats : b.awayStats) || {pts:0,gf:0,ga:0};
            if (sb.pts !== sa.pts) return sb.pts - sa.pts;
            const da = sa.gf-sa.ga, db = sb.gf-sb.ga;
            if (db !== da) return db - da;
            return sb.gf - sa.gf;
        });
    }

    let displayRank = 1;
    displayTeams.forEach((t, i) => {
        const rank = t.rank; // echte Logikposition für Zonen
        if (i > 0) {
            const p = displayTeams[i-1];
            const ps = (tv==='heim' ? p.homeStats : tv==='auswaerts' ? p.awayStats : p.stats) || p.stats;
            const ts = (tv==='heim' ? t.homeStats : tv==='auswaerts' ? t.awayStats : t.stats) || t.stats;
            const tied = ts.pts === ps.pts &&
                (ts.gf - ts.ga) === (ps.gf - ps.ga) &&
                ts.gf === ps.gf;
            if (!tied) displayRank = i + 1;
        }
        const s = (tv==='heim' ? t.homeStats : tv==='auswaerts' ? t.awayStats : t.stats) || t.stats;
        const revRank = count - teams.indexOf(t); // revRank nach Gesamtrang
        let rowClass = "", infoText = "";

        if (l.level === 1) {
            if(rank <= 4) { rowClass = "row-cl"; infoText = "Champions League"; }
            else if(rank === 5) { rowClass = "row-el"; infoText = "Europa League"; }
            else if(rank === 6) { rowClass = "row-ecl"; infoText = "Conference League"; }
        }

        if (l.level > 1) {
            if (rank <= fixUp) {
                rowClass = "row-fix-up";
                infoText = l.level === 4 ? "▲ Direktaufstieg" : "▲ Aufstieg";
            } else if (rank <= fixUp + varUp) {
                rowClass = "row-var-up";
                infoText = l.level === 3 ? "⇄ Rele 2.BL" : l.level === 4 ? "⇄ Playoff" : "⇄ Relegation";
            }
        }

        if (revRank <= fixDown) { rowClass = "row-fix-down"; infoText = "▼ Abstieg"; }
        else if (revRank <= fixDown + varDown) { rowClass = "row-var-down"; infoText = "▼ Variabler Abstieg"; }

        html += `<tr class="${tv==='gesamt' ? rowClass : ''}">
            <td style="text-align:center;font-weight:bold;">${displayRank}.</td>
            <td style="display:flex;align-items:center;gap:10px;">
                ${(t.thumb || GAME_DATA.teams[t.id]?.thumb) ? `<img src="${t.thumb || GAME_DATA.teams[t.id].thumb}" width="24">` : ''}
                ${t.name} <span style="font-size:11px;opacity:0.45;">${t.strength != null ? `(${t.strength})` : ''}</span>
            </td>
            <td>${s.p}</td>
            <td>${s.w}</td>
            <td>${s.d}</td>
            <td>${s.l}</td>
            <td>${s.gf}:${s.ga}</td>
            <td>${s.gf - s.ga}</td>
            <td><b>${s.pts}</b></td>
            <td style="font-size:12px;opacity:0.7;">${tv==='gesamt' ? infoText : ''}</td>
        </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById('content').innerHTML = html;
},

nextStep: function() {
    if(Engine.playNextMatchday()) { this.loadLeague(this.activeLeague); this.updateStatus(); }
    else { alert("Saisonende erreicht."); }
},

simRest: function() {
    Engine.simulateFullSeason();
    this.loadLeague(this.activeLeague);
    this.updateStatus();
}

});
