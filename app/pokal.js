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
    const ewigeTabBtn = `<button onclick="App.switchPokalTab(-2)" class="pokal-tab-btn${this.pokalTab===-2?' active':''}">🏆 Ewige Tabelle</button>`;
    const siegTabBtn  = `<button onclick="App.switchPokalTab(-3)" class="pokal-tab-btn${this.pokalTab===-3?' active':''}">🥇 Sieger</button>`;
    const _extraRoundTabs = p => p ? `<button onclick="App.switchPokalTab(-1)" class="pokal-tab-btn">Teilnehmerfeld</button>` + p.rounds.map((r,i)=>`<button onclick="App.switchPokalTab(${i})" class="pokal-tab-btn">${r.name}</button>`).join('') : '';
    if (this.pokalTab === -2) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${_extraRoundTabs(pokal)}</div>` + this._renderEwigePokalTabelle();
        return;
    }
    if (this.pokalTab === -3) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${_extraRoundTabs(pokal)}</div>` + this._renderPokalSiegerliste();
        return;
    }
    if (!pokal) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}</div><div style="padding:20px;opacity:0.5;">Kein Pokal aktiv. Starte eine neue Saison via Reset.</div>`;
        return;
    }
    const pThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const pImg = (t, size) => { const s = pThumb(t); return s ? `<img src="${s}" width="${size}" height="${size}" style="vertical-align:middle;margin-right:4px;flex-shrink:0;">` : ''; };
    const pLiga = t => Engine.leagues[t?.leagueId]?.name || '';
    const teilnehmerBtn = `<button onclick="App.switchPokalTab(-1)" class="pokal-tab-btn${this.pokalTab === -1 ? ' active' : ''}">Teilnehmerfeld</button>`;
    const tabsHtml = ewigeTabBtn + siegTabBtn + teilnehmerBtn + pokal.rounds.map((r, i) => {
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
                matchHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;">${rankStr}${pImg(t, 18)}<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t?.name || id}</span><span style="font-size:11px;opacity:0.45;">${t?.strength != null ? `(${t.strength})` : ''}</span></div>`;
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
                    <div class="pm-team pm-home ${hCls}">${pImg(h,18)}<span onclick="App.showSteckbrief('${m.hId}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${h?.name || m.hId}</span><span style="font-size:11px;opacity:0.45;">${h?.strength != null ? ` (${h.strength})` : ''}</span><span class="pm-liga">${pLiga(h)}</span></div>
                    <div class="pm-score">${score}</div>
                    <div class="pm-team pm-away ${aCls}">${pImg(a,18)}<span onclick="App.showSteckbrief('${m.aId}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${a?.name || m.aId}</span><span style="font-size:11px;opacity:0.45;">${a?.strength != null ? ` (${a.strength})` : ''}</span><span class="pm-liga">${pLiga(a)}</span></div>
                </div>`;
            });
            matchHtml += '</div>';
        }
    }
    const winnerHtml = pokal.winner ? (() => {
        const wt = Engine.teams[pokal.winner];
        return `<div style="margin:16px;padding:16px;background:#2a1a00;border:2px solid gold;border-radius:8px;font-size:18px;font-weight:bold;text-align:center;">🏆 Pokalsieger: <span onclick="App.showSteckbrief('${pokal.winner}')" style="cursor:pointer;text-decoration:underline">${wt?.name || pokal.winner}</span>${wt?.strength != null ? `<span style="font-size:14px;opacity:0.5;"> (${wt.strength})</span>` : ''}</div>`;
    })() : '';
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

_pokalSortBy: function(col) {
    if (!this._pokalSort) this._pokalSort = { col: 'wins', dir: 1 };
    if (this._pokalSort.col === col) this._pokalSort.dir *= -1;
    else { this._pokalSort.col = col; this._pokalSort.dir = 1; }
    this.showPokal();
},

_renderEwigePokalTabelle: function() {
    const history = Engine.history || [];
    const seasonSync = this.viewHistoryOffset !== null;
    const idx = seasonSync ? this.viewHistoryOffset : this.ewigeSeasonIdx;
    const sort = this._pokalSort || { col: 'wins', dir: 1 };

    const computeTable = upToIdx => {
        const et = {};
        const mk = id => { if (!et[id]) et[id] = { wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 }; };
        const addPokal = p => {
            if (!p) return;
            const part = new Set();
            (p.rounds[0]?.matches || []).forEach(m => { part.add(m.hId); part.add(m.aId); });
            part.forEach(id => { mk(id); et[id].seasons++; });
            p.rounds.forEach(round => {
                if (!round.played) return;
                round.matches.forEach(m => {
                    mk(m.hId); mk(m.aId);
                    const draw = m.hGoals === m.aGoals;
                    const hWon = m.winnerId === m.hId;
                    et[m.hId].sp++; et[m.aId].sp++;
                    if (draw)      { et[m.hId].d++; et[m.aId].d++; }
                    else if (hWon) { et[m.hId].w++; et[m.aId].l++; }
                    else           { et[m.aId].w++; et[m.hId].l++; }
                });
            });
            if (p.winner) { mk(p.winner); et[p.winner].wins++; }
        };
        const limit = upToIdx === null ? history.length : Math.min(upToIdx + 1, history.length);
        for (let i = 0; i < limit; i++) addPokal(history[i].pokal);
        if (upToIdx === null) addPokal(Engine.pokal);
        const rows = Object.entries(et).map(([id, e]) => {
            const t = Engine.teams[id] || GAME_DATA.teams[id];
            const pts = e.w * 3 + e.d;
            return { id, name: t?.name || id, ...e, pts, pps: e.sp > 0 ? pts / e.sp : 0 };
        });
        rows.sort((a, b) => b.wins - a.wins || b.pts - a.pts);
        const ranks = {};
        rows.forEach((e, i) => ranks[e.id] = i + 1);
        return { rows, ranks };
    };

    const { rows, ranks } = computeTable(idx);
    const prevIdx = idx === null ? (history.length > 0 ? history.length - 1 : null) : idx - 1;
    const prevRanks = prevIdx !== null && prevIdx >= 0 ? computeTable(prevIdx).ranks : null;

    // Anwenden der Nutzersortierung
    const fns = {
        wins:    (a,b) => b.wins - a.wins || b.pts - a.pts,
        pts:     (a,b) => b.pts - a.pts,
        pps:     (a,b) => b.pps - a.pps,
        w:       (a,b) => b.w - a.w,
        d:       (a,b) => b.d - a.d,
        l:       (a,b) => b.l - a.l,
        sp:      (a,b) => b.sp - a.sp,
        seasons: (a,b) => b.seasons - a.seasons,
        name:    (a,b) => a.name.localeCompare(b.name),
    };
    rows.sort((a, b) => sort.dir * (fns[sort.col] || fns.wins)(a, b));

    const seasonLabel = i => i === null ? 'Aktuell' : (history[i] ? history[i].year : `Saison ${i + 1}`);
    let out = `<style>
.ptbl .pc-md{display:none}.ptbl .pc-lg{display:none}
@media(min-width:500px){.ptbl .pc-md{display:table-cell}}
@media(min-width:720px){.ptbl .pc-lg{display:table-cell}}
</style>`;

    if (seasonSync) {
        out += `<div style="padding:8px 15px;background:#1a1a1a;border-bottom:1px solid #333;font-size:13px;text-align:center;">
            <span style="opacity:0.85;font-weight:bold;">Stand nach Saison ${seasonLabel(idx)}</span>
            <span style="opacity:0.4;font-size:11px;margin-left:8px;">(folgt Saisonansicht)</span>
        </div>`;
    } else {
        const noPrev = (idx === null && history.length === 0) || idx === 0;
        const noNext = idx === null;
        const db = dis => dis ? ' disabled style="opacity:0.35;cursor:default;"' : '';
        out += `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:#1a1a1a;border-bottom:1px solid #333;font-size:13px;">
            <button onclick="App._ewigeNav(-1)" class="btn" style="padding:3px 10px;"${db(noPrev)}>◀</button>
            <span style="flex:1;text-align:center;opacity:0.85;font-weight:bold;">${seasonLabel(idx)}</span>
            <button onclick="App._ewigeNav(1)" class="btn" style="padding:3px 10px;"${db(noNext)}>▶</button>
        </div>`;
    }

    if (!rows.length) return out + '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Pokaldaten vorhanden.</div>';

    const th = (col, label, cls='') => {
        const active = sort.col === col;
        const arrow = active ? (sort.dir === 1 ? ' ▼' : ' ▲') : '';
        return `<th onclick="App._pokalSortBy('${col}')" class="${cls}" style="cursor:pointer;${active?'color:#90caf9;':''}">${label}${arrow}</th>`;
    };
    out += `<table class="ptbl"><thead><tr>
        <th>Pl.</th><th style="width:28px;"></th>
        ${th('name','Mannschaft')}
        ${th('wins','🏆')}
        ${th('pts','Pkt.')}
        ${th('w','S','pc-md')}
        ${th('d','U','pc-md')}
        ${th('l','N','pc-md')}
        ${th('pps','Pkt./Sp.','pc-md')}
        ${th('sp','Sp.','pc-lg')}
        ${th('seasons','Sais.','pc-lg')}
    </tr></thead><tbody>`;

    rows.forEach((e, i) => {
        const t = Engine.teams[e.id] || GAME_DATA.teams[e.id];
        const thumb = t?.thumb || null;
        let arrow = '';
        if (prevRanks) {
            const rk = ranks[e.id];
            const pr = prevRanks[e.id];
            if (pr != null) {
                const diff = pr - rk;
                if      (diff > 0) arrow = `<span style="color:#4caf50;font-size:11px;font-weight:bold;">▲${diff}</span>`;
                else if (diff < 0) arrow = `<span style="color:#f44336;font-size:11px;font-weight:bold;">▼${Math.abs(diff)}</span>`;
                else               arrow = `<span style="opacity:0.25;font-size:11px;">—</span>`;
            } else {
                arrow = `<span style="color:#ffd700;font-size:10px;font-weight:bold;">NEU</span>`;
            }
        }
        const winsHtml = e.wins > 0 ? `<span style="color:#ffd700;font-weight:bold;">${e.wins}</span>` : `<span style="opacity:0.3;">—</span>`;
        out += `<tr>
            <td style="text-align:center;font-weight:bold;">${i + 1}.</td>
            <td style="text-align:center;">${arrow}</td>
            <td style="display:flex;align-items:center;gap:10px;">${thumb ? `<img src="${thumb}" width="32" height="32" style="object-fit:contain;">` : ''}<span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
            <td style="text-align:center;">${winsHtml}</td>
            <td><b>${e.pts}</b></td>
            <td class="pc-md">${e.w}</td>
            <td class="pc-md">${e.d}</td>
            <td class="pc-md">${e.l}</td>
            <td class="pc-md" style="opacity:0.7;">${e.pps > 0 ? e.pps.toFixed(2) : '—'}</td>
            <td class="pc-lg">${e.sp}</td>
            <td class="pc-lg">${e.seasons}</td>
        </tr>`;
    });
    return out + '</tbody></table>';
},

_renderPokalSiegerliste: function() {
    const sort = this._siegerSort || 'desc';
    const entries = [];

    Engine.history.forEach(snap => {
        if (!snap.pokal?.winner) return;
        const id = snap.pokal.winner;
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        entries.push({ season: snap.year, id, name: t?.name || id, thumb: t?.thumb || null });
    });
    if (Engine.pokal?.winner) {
        const id = Engine.pokal.winner;
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        entries.push({ season: Engine.getFormattedSeason(), id, name: t?.name || id, thumb: t?.thumb || null });
    }

    const yr = s => parseInt((s || '').split('/')[0]) || 0;
    entries.sort((a, b) => sort === 'desc' ? yr(b.season) - yr(a.season) : yr(a.season) - yr(b.season));

    const counts = {};
    entries.forEach(e => { if (!counts[e.id]) counts[e.id] = { id: e.id, count: 0, name: e.name, thumb: e.thumb }; counts[e.id].count++; });
    const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 7);

    const sortBtn = `<button onclick="App._toggleSiegerSort()" class="btn" style="padding:3px 10px;font-size:12px;">${sort === 'desc' ? '▼ Neueste zuerst' : '▲ Älteste zuerst'}</button>`;
    const header = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:#1a1a1a;border-bottom:1px solid #333;"><span style="opacity:0.5;font-size:12px;">${entries.length} Einträge</span><div style="flex:1;"></div>${sortBtn}</div>`;

    if (!entries.length) return header + '<div style="padding:20px;opacity:0.5;">Noch kein Pokalsieger vorhanden.</div>';

    const rowsHtml = entries.map(e => `<tr>
        <td style="opacity:0.6;white-space:nowrap;">${e.season}</td>
        <td style="display:flex;align-items:center;gap:8px;">${e.thumb?`<img src="${e.thumb}" width="24" height="24" style="object-fit:contain;">`:''}<span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
    </tr>`).join('');

    const rankHtml = top.map((v, i) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
        <span style="opacity:0.4;width:14px;text-align:right;flex-shrink:0;">${i+1}.</span>
        ${v.thumb?`<img src="${v.thumb}" width="16" height="16" style="object-fit:contain;flex-shrink:0;">`:''}
        <span onclick="App.showSteckbrief('${v.id}')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${v.name}</span>
        <span style="color:#ffd700;font-weight:bold;flex-shrink:0;">${v.count}×</span>
    </div>`).join('');

    return header + `<div style="display:flex;align-items:flex-start;">
        <div style="flex:1;overflow:hidden;min-width:0;"><table><thead><tr><th>Saison</th><th>Pokalsieger</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
        <div style="width:170px;flex-shrink:0;padding:12px;border-left:1px solid #2a2a2a;background:#111;">
            <div style="font-size:10px;opacity:0.4;letter-spacing:1px;margin-bottom:8px;">REKORDSIEGER</div>
            ${rankHtml}
        </div>
    </div>`;
},

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
            const teamRow = (t, id, won, goals) => {
                const nameStyle = won ? 'font-weight:bold;color:#4caf50;' : played ? 'opacity:0.38;' : '';
                const score = played && goals !== null ? ` <b>${goals}</b>` : '';
                const league = t ? lShort(t.leagueId) : '';
                const str = t?.strength != null ? `<span style="font-size:9px;opacity:0.38;"> (${t.strength})</span>` : '';
                return `<div style="display:flex;align-items:center;gap:2px;white-space:nowrap;overflow:hidden;">
                    ${bImg(t)}<span onclick="App.showSteckbrief('${id}')" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;cursor:pointer;${nameStyle}">${t?.name || (m ? '?' : '')}${score}</span>${str}
                </div>
                <div style="font-size:9px;opacity:0.32;padding-left:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${league}</div>`;
            };
            html += `<div style="position:absolute;top:${top}px;left:2px;right:2px;height:${MATCH_H}px;background:#202020;border-radius:3px;border-left:2px solid ${borderCol};padding:4px 5px;box-sizing:border-box;overflow:hidden;">`;
            html += teamRow(h, m?.hId, hWon, m?.hGoals ?? null);
            html += `<div style="height:4px;"></div>`;
            html += teamRow(a, m?.aId, aWon, m?.aGoals ?? null);
            html += '</div>';
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

});
