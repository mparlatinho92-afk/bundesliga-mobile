Object.assign(App, {
showPokal: function() {
    this.activeLeague = '__pokal__';
    localStorage.setItem('ba_lastLeague', '__pokal__');
    // Aus History lesen wenn Archiv-Modus, sonst aktuellen Pokal
    const histEntry = this.viewHistoryOffset !== null ? Engine.history[this.viewHistoryOffset] : null;
    const pokal = (histEntry?.pokal) || Engine.pokal;
    if (this.viewHistoryOffset === null && Engine.pokal) { Engine.pokal.hasNewResults = false; Engine.saveGame(); }
    this.renderSidebar();
    document.getElementById('league-title').innerHTML = `<img src="${DFB_POKAL_BASE64}">DFB-Pokal`;
    if (!pokal) {
        document.getElementById('content').innerHTML = '<div style="padding:20px;opacity:0.5;">Kein Pokal aktiv. Starte eine neue Saison via Reset.</div>';
        return;
    }
    const pThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const pImg = (t, size) => { const s = pThumb(t); return s ? `<img src="${s}" width="${size}" height="${size}" style="vertical-align:middle;margin-right:4px;flex-shrink:0;">` : ''; };
    const pLiga = t => Engine.leagues[t?.leagueId]?.name || '';
    const teilnehmerBtn = `<button onclick="App.switchPokalTab(-1)" class="pokal-tab-btn${this.pokalTab === -1 ? ' active' : ''}">Teilnehmerfeld</button>`;
    const tabsHtml = teilnehmerBtn + pokal.rounds.map((r, i) => {
        const disabled = !r.played && !r.matches.length;
        return `<button onclick="App.switchPokalTab(${i})" class="pokal-tab-btn${this.pokalTab === i ? ' active' : ''}"${disabled ? ' disabled' : ''}>${r.name}</button>`;
    }).join('');
    let matchHtml = '';
    if (this.pokalTab === -1) {
        // Teilnehmerfeld: alle Teams aus 1. Runde, gruppiert nach Liga
        const allIds = [];
        (pokal.rounds[0]?.matches || []).forEach(m => { allIds.push(m.hId, m.aId); });
        const byLeague = {};
        allIds.forEach(id => {
            const t = Engine.teams[id] || GAME_DATA.teams[id];
            const lid = t?.leagueId || '?';
            if (!byLeague[lid]) byLeague[lid] = [];
            byLeague[lid].push({ id, t });
        });
        // Vorsaison-Tabelle für Sortierung innerhalb jeder Liga
        const prevHistIdx = this.viewHistoryOffset !== null ? this.viewHistoryOffset - 1 : Engine.history.length - 1;
        const prevTeams = Engine.history[prevHistIdx]?.teams || {};
        const prevRank = id => prevTeams[id]?.rank ?? 999;
        const ligaOrder = Object.keys(byLeague).sort((a, b) => {
            const la = Engine.leagues[a]?.level ?? 99, lb = Engine.leagues[b]?.level ?? 99;
            return la - lb;
        });
        matchHtml = '<div class="pokal-teiln">';
        ligaOrder.forEach(lid => {
            const ligaName = Engine.leagues[lid]?.name || lid;
            const entries = byLeague[lid].sort((a, b) => prevRank(a.id) - prevRank(b.id));
            matchHtml += `<div class="pokal-teiln-liga">
                <div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:8px 0 6px;border-bottom:1px solid #333;margin-bottom:4px;">${ligaName} <span style="opacity:0.5;">(${entries.length})</span></div>`;
            entries.forEach(({ id, t }, idx) => {
                const rank = prevRank(id);
                const rankStr = rank < 999 ? `<span style="font-size:11px;opacity:0.35;width:18px;display:inline-block;">${rank}.</span>` : '';
                matchHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;">${rankStr}${pImg(t, 18)}${t?.name || id}</div>`;
            });
            matchHtml += '</div>';
        });
        matchHtml += '</div>';
    } else {
        const round = pokal.rounds[this.pokalTab];
        if (!round || (!round.played && !round.matches.length)) {
            matchHtml = '<div style="padding:20px;opacity:0.5;">Diese Runde wurde noch nicht gespielt.</div>';
        } else {
            matchHtml = '<div class="pokal-matches"><div class="pm-header"><span class="pm-home">Heim</span><span class="pm-score"></span><span class="pm-away">Auswärts</span></div>';
            round.matches.forEach(m => {
                const h = Engine.teams[m.hId], a = Engine.teams[m.aId];
                const hWon = m.winnerId === m.hId, aWon = m.winnerId === m.aId;
                const hCls = round.played ? (hWon ? 'winner' : 'loser') : '';
                const aCls = round.played ? (aWon ? 'winner' : 'loser') : '';
                const score = round.played ? `${m.hGoals} : ${m.aGoals}` : '– : –';
                matchHtml += `<div class="pokal-match">
                    <div class="pm-team pm-home ${hCls}">${pImg(h,18)}${h?.name || m.hId}<span class="pm-liga">${pLiga(h)}</span></div>
                    <div class="pm-score">${score}</div>
                    <div class="pm-team pm-away ${aCls}">${pImg(a,18)}${a?.name || m.aId}<span class="pm-liga">${pLiga(a)}</span></div>
                </div>`;
            });
            matchHtml += '</div>';
        }
    }
    const winnerHtml = pokal.winner
        ? `<div style="margin:16px;padding:16px;background:#2a1a00;border:2px solid gold;border-radius:8px;font-size:18px;font-weight:bold;text-align:center;">🏆 Pokalsieger: ${Engine.teams[pokal.winner]?.name || pokal.winner}</div>`
        : '';
    const roundStatus = (() => {
        if (this.pokalTab < 0) return '';
        const r = pokal.rounds[this.pokalTab];
        if (!r || (!r.played && !r.matches.length)) return '';
        const statusStr = r.played ? '✓ Abgeschlossen' : 'Ausstehend';
        return `<div class="pm-status">${r.name} · ${r.matches.length} Partien · ${statusStr}</div>`;
    })();
    const matchSection = this.pokalTab < 0
        ? `<div style="padding:16px;">${matchHtml}</div>`
        : `<div class="pm-toggle" onclick="App.togglePokalMatches()">
            <span>Ergebnisse (${pokal.rounds[this.pokalTab]?.matches.length || 0} Partien)</span>
            <span class="pm-toggle-arrow ${this.pokalMatchesOpen ? 'open' : ''}">▼</span>
           </div>
           ${this.pokalMatchesOpen ? `<div style="padding:0 16px 16px;">${matchHtml}</div>` : ''}`;
    document.getElementById('content').innerHTML = `
        <div class="pokal-tabs">${tabsHtml}</div>
        ${roundStatus}
        ${matchSection}
        ${winnerHtml}
        <div style="border-top:1px solid #2a2a2a;padding:16px;">
            <div style="font-size:12px;opacity:0.5;margin-bottom:10px;letter-spacing:1px;">BRACKET</div>
            ${this.renderPokalBracket(pokal)}
        </div>`;
},

switchPokalTab: function(i) { this.pokalTab = i; this.pokalMatchesOpen = true; this.showPokal(); },
togglePokalMatches: function() { this.pokalMatchesOpen = !this.pokalMatchesOpen; this.showPokal(); },

renderPokalBracket: function(pokal) {
    const MATCH_H = 62, R1 = 32;
    const CONTAINER_H = R1 * (MATCH_H + 6);
    const bThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const bImg = t => { const s = bThumb(t); return s ? `<img src="${s}" width="13" height="13" style="vertical-align:middle;margin-right:2px;flex-shrink:0;">` : ''; };
    const lShort = lid => (Engine.leagues[lid]?.name || '').replace('1. Bundesliga','1.BL').replace('2. Bundesliga','2.BL').replace('3. Liga','3.Liga').replace('Regionalliga','RL').replace('Oberliga','OL').replace('liga','L.').replace('Liga','L.');
    let html = `<div style="display:flex;gap:6px;overflow-x:auto;height:${CONTAINER_H}px;padding-bottom:8px;">`;
    pokal.rounds.forEach((round, ri) => {
        const n = Math.pow(2, 5 - ri);
        const spacing = CONTAINER_H / n;
        html += `<div style="flex:0 0 230px;position:relative;height:${CONTAINER_H}px;">`;
        html += `<div style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:10px;opacity:0.45;padding:2px 0;">${round.name}</div>`;
        for (let i = 0; i < n; i++) {
            const top = Math.round(i * spacing + (spacing - MATCH_H) / 2);
            const m = round.matches[i];
            const h = m ? Engine.teams[m.hId] : null;
            const a = m ? Engine.teams[m.aId] : null;
            const played = round.played;
            const hWon = played && m?.winnerId === m?.hId;
            const aWon = played && m?.winnerId === m?.aId;
            const borderCol = played ? '#4caf50' : (m ? '#444' : '#2a2a2a');
            const teamRow = (t, won, goals) => {
                const nameStyle = won ? 'font-weight:bold;color:#4caf50;' : played ? 'opacity:0.38;' : '';
                const score = played && goals !== null ? ` <b>${goals}</b>` : '';
                const league = t ? lShort(t.leagueId) : '';
                return `<div style="display:flex;align-items:center;gap:2px;white-space:nowrap;overflow:hidden;">
                    ${bImg(t)}<span style="font-size:10px;overflow:hidden;text-overflow:ellipsis;${nameStyle}">${t?.name || (m ? '?' : '')}${score}</span>
                </div>
                <div style="font-size:9px;opacity:0.32;padding-left:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${league}</div>`;
            };
            html += `<div style="position:absolute;top:${top}px;left:2px;right:2px;height:${MATCH_H}px;background:#202020;border-radius:3px;border-left:2px solid ${borderCol};padding:4px 5px;box-sizing:border-box;overflow:hidden;">`;
            html += teamRow(h, hWon, m?.hGoals ?? null);
            html += `<div style="height:4px;"></div>`;
            html += teamRow(a, aWon, m?.aGoals ?? null);
            html += '</div>';
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

});
