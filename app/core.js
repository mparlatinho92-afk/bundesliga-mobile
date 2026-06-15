const LEAGUE_LOGOS = {
    '1':'bundesliga.png','2':'bundesliga_2.png','3':'3_liga.png',
    '4-1':'regionalliga_suedwest.png','4-2':'regionalliga_nord.png','4-3':'regionalliga_nordost.png','4-4':'regionalliga_west.png','4-5':'regionalliga_bayern.png',
    '5-1':'oberliga_suedwest_fussball_regional_verband_suedwest.png','5-2':'oberliga_baden_wuerttembergsvg.png','5-3':'hessischer_fussballverband.png',
    '5-4':'schleswig_holstein_flens_oberliga.png','5-5':'hamburger_fussball_verband_logosvg.png','5-6':'niedersachsen.png',
    '5-7':'bremen.png','5-8':'nofv_nordost.png','5-9':'nofv_nordost.png','5-10':'oberliga_westfalen.png',
    '5-11':'oberliga_niederrhein.png','5-12':'mittelrhein.png','5-13':'bayerischer_fussballverbandsvg.png','5-14':'bayerischer_fussballverbandsvg.png',
    '6-1':'suedwestdeutscher_fussballverband.png','6-2':'rheinland.png','6-3':'saarlandliga.png',
    '6-4':'badischer_fussballverband.png','6-5':'suedbaden.png','6-6':'wuerttemberg.png',
    '6-7':'hessischer_fussballverband.png','6-8':'hessischer_fussballverband.png','6-9':'hessischer_fussballverband.png',
    '6-10':'schleswig_holsteinischer_fussbalvlerband.png','6-11':'schleswig_holsteinischer_fussbalvlerband.png',
    '6-12':'hamburger_fussball_verband_logosvg.png','6-13':'hamburger_fussball_verband_logosvg.png',
    '6-14':'niedersachsen.png','6-15':'niedersachsen.png','6-16':'niedersachsen.png','6-17':'niedersachsen.png',
    '6-18':'bremen.png','6-19':'mecklenburg_vorpommern.png','6-20':'brandenburg.png','6-21':'berlin.png',
    '6-22':'fussballverband_sachsen_anhalt_logosvg.png','6-23':'thueringer_fussball_verbandsvg.png','6-24':'sachsen.png',
    '6-25':'westfaelischer_fussballverband.png','6-26':'westfaelischer_fussballverband.png',
    '6-27':'oberliga_niederrhein.png','6-28':'oberliga_niederrhein.png',
    '6-29':'mittelrhein.png','6-30':'mittelrhein.png',
    '6-31':'bayerischer_fussballverbandsvg.png','6-32':'bayerischer_fussballverbandsvg.png','6-33':'bayerischer_fussballverbandsvg.png','6-34':'bayerischer_fussballverbandsvg.png','6-35':'bayerischer_fussballverbandsvg.png',
    '7-1':'suedwestdeutscher_fussballverband.png','7-2':'suedwestdeutscher_fussballverband.png',
    '7-3':'rheinland.png','7-4':'rheinland.png','7-5':'rheinland.png',
    '7-6':'saarlaendischer_fussball_verbandsvg.png','7-7':'saarlaendischer_fussball_verbandsvg.png',
    '7-8':'berlin.png','7-9':'berlin.png',
    '8-1':'suedwestdeutscher_fussballverband.png','8-2':'suedwestdeutscher_fussballverband.png','8-3':'suedwestdeutscher_fussballverband.png','8-4':'suedwestdeutscher_fussballverband.png'
};
const leagueLogo = id => { const f = LEAGUE_LOGOS[id]; return f ? `Wappen/Ligen- und Verbandswappen/${f}` : null; };
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('btn-changelog');
    if (el) el.textContent = '📋 v' + VERSION;
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light');
        const btn = document.getElementById('btn-theme');
        if (btn) btn.textContent = '🌙';
    }
    App.init();
    // Mobile sidebar drawer + touch swipe
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btnMenu = document.getElementById('btn-menu');
    function openDrawer()  { sidebar.classList.add('open');    overlay.classList.add('visible'); }
    function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }
    btnMenu.addEventListener('click', () => sidebar.classList.contains('open') ? closeDrawer() : openDrawer());
    overlay.addEventListener('click', closeDrawer);
    document.getElementById('league-list').addEventListener('click', () => { if (window.innerWidth <= 768) closeDrawer(); });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#gs-wrap'))   App._gsClose();
        if (!e.target.closest('#dots-wrap')) App._dotsClose();
        if (!e.target.closest('#spicker') && !e.target.closest('#season-info')) { const p = document.getElementById('spicker'); if (p) p.style.display = 'none'; }
    });
    let sx = 0, sy = 0;
    document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = Math.abs(e.changedTouches[0].clientY - sy);
        if (dy > Math.abs(dx) || Math.abs(dx) < 50) return;
        if (dx > 50 && sx < 50) openDrawer();
        if (dx < -50 && sidebar.classList.contains('open')) closeDrawer();
    }, { passive: true });
});
const App = {
    activeLeague: null,
    viewHistoryOffset: null,
    matchdayViewIdx: null,
    tsView: null,
    tableView: 'gesamt',
    resultsCollapsed: false,
    ewigeSeasonIdx: null,
    navCollapsed: false,
    pokalTab: 0,
    pokalMatchesOpen: true,
    zonesCache: null,
    _gsActiveTypes: new Set(['liga', 'verein']),

    toggleTheme: function() {
        const isLight = document.body.classList.toggle('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        const btn = document.getElementById('btn-theme');
        if (btn) btn.textContent = isLight ? '🌙' : '☀️';
    },

    init: function() {
        if(!Engine.init()) return;
        this.renderSidebar();
        const first = Object.keys(Engine.leagues).sort((a,b) => Engine.leagues[a].level - Engine.leagues[b].level)[0];
        const saved = localStorage.getItem('ba_lastLeague');
        if (saved === '__pokal__') { this.showPokal(); }
        else if (saved && Engine.leagues[saved]) { this.loadLeague(saved); }
        else { this.loadLeague(first); }
        this.updateStatus();
        if (localStorage.getItem('ba_savebar_c') === '1') {
            const bar = document.getElementById('save-bar');
            const lbl = document.getElementById('savebar-toggle-lbl');
            if (bar) bar.classList.add('collapsed');
            if (lbl) lbl.textContent = '▾';
        }
    },

    updateStatus: function() {
        const el = document.getElementById('season-info');
        const label = this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.year || '?')
            : Engine.getFormattedSeason();
        const sS = `onclick="App._openSeasonPicker(event)" style="cursor:pointer;border-bottom:1px dotted rgba(200,200,200,0.4);"`;
        const mS = `onclick="App._openMatchdayPicker(event)" style="cursor:pointer;border-bottom:1px dotted rgba(200,200,200,0.4);"`;

        if (this.viewHistoryOffset === null) {
            const tot = Engine.totalMatchdays;
            const leagueTot = Engine.leagues[this.activeLeague]?.seasonLength || tot;
            if (this.tsView) {
                if (el) el.innerHTML = `<span ${sS}>${label}</span> | <span ${mS}>⚽ Testspiele ${this.tsView === 'pre' ? 'Sommer' : 'Winter'}</span>`;
            } else {
                const md = this.matchdayViewIdx !== null
                    ? (Engine.matchdayHistory[this.matchdayViewIdx]?.md ?? '?')
                    : Engine.currentMatchday;
                if (el) el.innerHTML = `<span ${sS}>${label}</span> | <span ${mS}>Tag ${md}/${leagueTot}</span>`;
            }
            const finished = Engine.currentMatchday >= tot;
            document.getElementById('btn-play').disabled = finished;
            const btnS = document.getElementById('btn-saison');
            if (btnS) { btnS.disabled = false; btnS.textContent = finished ? 'Abschluss' : 'Saison'; }
            document.getElementById('btn-mega').disabled = false;
        } else {
            const archMdHist = Engine.history[this.viewHistoryOffset]?.matchdayHistory || [];
            const archMd = this.matchdayViewIdx !== null ? archMdHist[this.matchdayViewIdx]?.md : null;
            const mdPart = this.tsView
                ? ` | <span ${mS}>⚽ Testspiele ${this.tsView === 'pre' ? 'Sommer' : 'Winter'}</span>`
                : (archMd != null ? ` | <span ${mS}>Tag ${archMd}/${archMdHist.length}</span>` : (archMdHist.length ? ` | <span ${mS}>Tag ?/${archMdHist.length}</span>` : ''));
            if (el) el.innerHTML = `<span ${sS}>${label}</span>${mdPart} <span style="opacity:0.45;font-size:0.88em;">(Archiv)</span>`;
            document.getElementById('btn-play').disabled = true;
            const btnS = document.getElementById('btn-saison');
            if (btnS) { btnS.disabled = true; btnS.textContent = 'Saison'; }
            document.getElementById('btn-mega').disabled = true;
        }
    },

    prevSeason: function() {
        this.matchdayViewIdx = null;
        this.zonesCache = null;
        if (this.viewHistoryOffset === null) {
            if (Engine.history.length > 0) this.viewHistoryOffset = Engine.history.length - 1;
            else return;
        } else if (this.viewHistoryOffset > 0) {
            this.viewHistoryOffset--;
        } else return;
        this.tsView = null;
        if (this.activeLeague === '__pokal__') this.showPokal();
        else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    nextSeasonView: function() {
        this.matchdayViewIdx = null;
        this.zonesCache = null;
        if (this.viewHistoryOffset === null) return;
        if (this.viewHistoryOffset < Engine.history.length - 1) {
            this.viewHistoryOffset++;
        } else {
            this.viewHistoryOffset = null;
        }
        this.tsView = null;
        if (this.activeLeague === '__pokal__') this.showPokal();
        else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    _mdHist: function() {
        return this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.matchdayHistory || [])
            : Engine.matchdayHistory;
    },

    // Saison der aktuellen Ansicht (laufend oder Archiv) als String
    _viewedSeason: function() {
        return this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.year || null)
            : (Engine.getFormattedSeason ? Engine.getFormattedSeason() : null);
    },

    // Chronologische Token-Liste: [Testspiele Sommer?] · Spieltag 1..17 · [Testspiele Winter?] · 18.. · Aktuell
    _navTokens: function() {
        const hist = this._mdHist() || [];
        const season = this._viewedSeason();
        const tsGen = w => typeof Engine.friendliesGenerated === 'function' && season && Engine.friendliesGenerated(w, season);
        const preOn = tsGen('pre');
        const winOn = tsGen('winter');
        const toks = [];
        if (preOn) toks.push({ ts: 'pre' });
        let winAdded = false;
        for (let i = 0; i < hist.length; i++) {
            toks.push({ md: i });
            if (winOn && (hist[i]?.md ?? (i + 1)) === 17) { toks.push({ ts: 'winter' }); winAdded = true; }
        }
        if (winOn && !winAdded) toks.push({ ts: 'winter' });
        toks.push({ live: true });
        return toks;
    },
    _navCurrentIdx: function(toks) {
        if (this.tsView === 'pre')    return toks.findIndex(t => t.ts === 'pre');
        if (this.tsView === 'winter') return toks.findIndex(t => t.ts === 'winter');
        if (this.matchdayViewIdx === null) return toks.findIndex(t => t.live);
        return toks.findIndex(t => t.md === this.matchdayViewIdx);
    },
    _navApply: function(tok) {
        if (!tok) return;
        if (tok.ts) { this.tsView = tok.ts; this.matchdayViewIdx = null; }
        else if (tok.live) { this.tsView = null; this.matchdayViewIdx = null; }
        else { this.tsView = null; this.matchdayViewIdx = tok.md; }
        this.zonesCache = null;
        const p = document.getElementById('spicker'); if (p) p.style.display = 'none';
        if (this.activeLeague === '__pokal__') this.showPokal(); else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    prevMatchday: function() {
        const toks = this._navTokens();
        let idx = this._navCurrentIdx(toks);
        if (idx < 0) idx = toks.length - 1;
        if (idx > 0) this._navApply(toks[idx - 1]);
    },

    nextMatchday: function() {
        const toks = this._navTokens();
        let idx = this._navCurrentIdx(toks);
        if (idx < 0) idx = toks.length - 1;
        if (idx < toks.length - 1) this._navApply(toks[idx + 1]);
    },

    renderSidebar: function() {
        const list = document.getElementById('league-list');
        list.innerHTML = "";
        // DFB-Pokal Eintrag
        const pokalDiv = document.createElement('div');
        pokalDiv.className = 'pokal-item' + (this.activeLeague === '__pokal__' ? ' active' : '');
        const badge = Engine.pokal?.hasNewResults ? '<span class="pokal-badge">NEU</span>' : '';
        pokalDiv.innerHTML = `<img src="${DFB_POKAL_BASE64}" class="league-logo-mini"> DFB-Pokal ${badge}`;
        pokalDiv.onclick = () => this.showPokal();
        list.appendChild(pokalDiv);
        const pokalSep = document.createElement('div');
        pokalSep.style.cssText = 'border-top:1px solid var(--border);margin:0;opacity:0.15;';
        list.appendChild(pokalSep);
        const LEVEL_COLORS = ['#FFD700','#FF8C00','#FF4500','#CC2255','#9922AA','#5544DD','#2277FF','#00AACC'];
        const parseId = id => id.split('-').map(Number);
        const sorted = Object.values(Engine.leagues).sort((a,b) => {
            const pa = parseId(a.id), pb = parseId(b.id);
            for(let i=0;i<Math.max(pa.length,pb.length);i++){
                const d=(pa[i]||0)-(pb[i]||0);
                if(d) return d;
            }
            return 0;
        });
        let prevLevel = null;
        sorted.forEach(l => {
            if(prevLevel !== null && l.level !== prevLevel) {
                const sep = document.createElement('div');
                sep.style.cssText = 'border-top:1px solid var(--border);margin:0;opacity:0.25;';
                list.appendChild(sep);
            }
            prevLevel = l.level;
            const div = document.createElement('div');
            div.className = `league-item ${this.activeLeague === l.id ? 'active' : ''}`;
            const c = LEVEL_COLORS[(l.level-1) % LEVEL_COLORS.length];
            const logo = leagueLogo(l.id);
            const logoHtml = logo ? `<img src="${logo}" class="league-logo-mini">` : '';
            div.innerHTML = `<span class="league-level" style="background:${c}">${l.level}</span><span class="league-id">(${l.id})</span>${logoHtml} ${l.name}`;
            div.onclick = () => this.loadLeague(l.id);
            list.appendChild(div);
        });
    },

    // ── Globale Suche ─────────────────────────────────────────────────────────
    // ── ··· Overflow-Dropdown ─────────────────────────────────────────────────
    _dotsToggle: function() {
        const m = document.getElementById('dots-menu');
        if (!m) return;
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
    },
    _dotsClose: function() {
        const m = document.getElementById('dots-menu');
        if (m) m.style.display = 'none';
    },
    _seasonAction: function() {
        const finished = Engine.currentMatchday >= Engine.totalMatchdays;
        if (finished) { this.showSeasonEnd(); return; }
        const rem = Engine.totalMatchdays - Engine.currentMatchday;
        if (!confirm(`Saison komplett simulieren?\n\nNoch ${rem} Spieltag${rem !== 1 ? 'e' : ''} ausstehend.\nDies kann nicht rückgängig gemacht werden.`)) return;
        this.simRest();
    },

    _openSeasonPicker: function(evt) {
        evt.stopPropagation();
        const p = document.getElementById('spicker');
        if (!p) return;
        if (p.dataset.mode === 'season' && p.style.display !== 'none') { p.style.display = 'none'; return; }
        const cur = this.viewHistoryOffset;
        const rows = Engine.history.map((h, i) => ({ label: h.year, offset: i })).reverse();
        rows.unshift({ label: Engine.getFormattedSeason() + ' ✓', offset: null });
        p.innerHTML = rows.map(s => `<div class="dots-item${s.offset === cur ? ' picker-active' : ''}" onclick="App._selectSeason(${s.offset === null ? 'null' : s.offset})">${s.label}</div>`).join('');
        p.dataset.mode = 'season';
        const r = evt.target.getBoundingClientRect();
        p.style.display = 'block'; p.style.top = (r.bottom + 4) + 'px'; p.style.left = Math.max(4, r.left - 20) + 'px';
    },

    _selectSeason: function(offset) {
        const p = document.getElementById('spicker'); if (p) p.style.display = 'none';
        this.viewHistoryOffset = offset; this.matchdayViewIdx = null; this.zonesCache = null; this.tsView = null;
        if (this.activeLeague === '__pokal__') this.showPokal(); else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    _openMatchdayPicker: function(evt) {
        evt.stopPropagation();
        const p = document.getElementById('spicker');
        if (!p) return;
        if (p.dataset.mode === 'matchday' && p.style.display !== 'none') { p.style.display = 'none'; return; }
        const hist = this._mdHist() || [];
        const toks = this._navTokens();
        if (!hist.length && toks.length <= 1) return; // nur {live} → nichts auszuwählen
        const curIdx = this._navCurrentIdx(toks);
        // Neueste zuerst (Aktuell oben → Testspiele Sommer unten)
        const html = toks.map((t, i) => {
            const active = i === curIdx ? ' picker-active' : '';
            if (t.live)            return `<div class="dots-item${active}" onclick="App._selectMatchday(null)">Aktuell</div>`;
            if (t.ts === 'winter') return `<div class="dots-item${active}" onclick="App._selectTsView('winter')">⚽ Testspiele (Winter)</div>`;
            if (t.ts === 'pre')    return `<div class="dots-item${active}" onclick="App._selectTsView('pre')">⚽ Testspiele (Sommer)</div>`;
            const md = hist[t.md]?.md ?? (t.md + 1);
            return `<div class="dots-item${active}" onclick="App._selectMatchday(${t.md})">Spieltag ${md}</div>`;
        }).reverse().join('');
        p.innerHTML = html; p.dataset.mode = 'matchday';
        const r = evt.target.getBoundingClientRect();
        p.style.display = 'block'; p.style.top = (r.bottom + 4) + 'px'; p.style.left = Math.max(4, r.left - 20) + 'px';
    },

    _selectMatchday: function(idx) {
        const p = document.getElementById('spicker'); if (p) p.style.display = 'none';
        this.matchdayViewIdx = idx; this.zonesCache = null; this.tsView = null;
        if (this.activeLeague === '__pokal__') this.showPokal(); else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    // Testspiel-Pseudo-Spieltag wählen ('pre' = Sommer vor 1. Spieltag, 'winter' = nach Spieltag 17)
    _selectTsView: function(window) {
        const p = document.getElementById('spicker'); if (p) p.style.display = 'none';
        this.tsView = window; this.matchdayViewIdx = null; this.zonesCache = null;
        if (this.activeLeague !== '__pokal__') this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    _gsOpen: function() {
        const wrap = document.getElementById('gs-wrap');
        if (!wrap) return;
        if (wrap.classList.contains('open')) { this._gsClose(); return; }
        wrap.classList.add('open');
        setTimeout(() => document.getElementById('gs-input')?.focus(), 210);
    },

    _gsClose: function() {
        const wrap = document.getElementById('gs-wrap');
        const inp  = document.getElementById('gs-input');
        const dl   = document.getElementById('gs-list');
        if (wrap) wrap.classList.remove('open');
        if (inp)  { inp.value = ''; inp.blur(); }
        if (dl)   dl.style.display = 'none';
    },

    _gsShow: function() {
        const inp = document.getElementById('gs-input');
        const dl  = document.getElementById('gs-list');
        if (!dl || !inp) return;
        const q = inp.value.toLowerCase().trim();
        if (!q) { dl.style.display = 'none'; return; }

        const types = this._gsActiveTypes;
        const results = [];

        if (types.has('liga')) {
            for (const l of Object.values(GAME_DATA.leagues)) {
                if (l.name.toLowerCase().includes(q))
                    results.push({ type:'liga', id:l.id, label:l.name, sub:'Liga – Ebene ' + l.level, logo:leagueLogo(l.id) });
            }
        }
        if (types.has('verein')) {
            const eng = typeof Engine !== 'undefined' ? Engine.teams : null;
            for (const t of Object.values(GAME_DATA.teams)) {
                if (!t.name.toLowerCase().includes(q)) continue;
                const lid  = eng?.[t.id]?.leagueId || t.leagueId;
                const liga = GAME_DATA.leagues[lid];
                results.push({ type:'verein', id:t.id, label:t.name, sub:liga?.name || lid, leagueId:lid, logo:t.thumb || null });
            }
        }

        results.sort((a, b) => {
            const aP = a.label.toLowerCase().startsWith(q), bP = b.label.toLowerCase().startsWith(q);
            if (aP !== bP) return aP ? -1 : 1;
            return a.label.localeCompare(b.label, 'de');
        });

        const shown = results.slice(0, 20);
        const chipDef = [{ key:'liga', label:'Liga', col:'#1a4fa8' }, { key:'verein', label:'Verein', col:'#1a7a35' }];
        const chips = chipDef.map(c => {
            const sel = types.has(c.key);
            const bg  = sel ? c.col : 'var(--panel-2)';
            const brd = sel ? c.col : 'var(--border)';
            const txt = sel ? '#fff' : 'var(--text)';
            return `<span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:bold;color:${txt};background:${bg};border:1px solid ${brd};cursor:pointer;user-select:none" onclick="App._gsToggle('${c.key}')">${c.label}</span>`;
        }).join(' ');

        const filterBar = `<div style="padding:6px 10px;display:flex;gap:4px;border-bottom:1px solid var(--border)">${chips}</div>`;
        const TC = { liga:'#1a4fa8', verein:'#1a7a35' };
        const TL = { liga:'Liga', verein:'Verein' };

        const rows = shown.length
            ? shown.map(r => {
                const col  = TC[r.type], tl = TL[r.type];
                const logo = r.logo ? `<img src="${r.logo}" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;opacity:0.9" onerror="this.style.display='none'">` : '';
                return `<div style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px" onmousedown="event.preventDefault()" onclick="App._gsSelect('${r.type}','${r.id.replace(/'/g,"\\'")}')">` +
                    `<span style="font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;background:${col};flex-shrink:0">${tl}</span>` +
                    `<div style="min-width:0;flex:1"><div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.label}</div>` +
                    `<div style="font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.sub}</div></div>` +
                    logo + `</div>`;
            }).join('')
            : '<div style="padding:8px 10px;color:var(--muted);font-size:12px">Keine Treffer</div>';

        dl.innerHTML = filterBar + rows;
        dl.style.display = 'block';
    },

    _gsToggle: function(type) {
        if (this._gsActiveTypes.has(type)) this._gsActiveTypes.delete(type);
        else this._gsActiveTypes.add(type);
        this._gsShow();
    },

    _gsSelect: function(type, id) {
        const dl  = document.getElementById('gs-list');
        const inp = document.getElementById('gs-input');
        if (dl)  dl.style.display = 'none';
        if (inp) inp.value = '';
        if (type === 'liga') {
            App.loadLeague(id);
        } else if (type === 'verein') {
            const t   = GAME_DATA.teams[id];
            const lid = (typeof Engine !== 'undefined' ? Engine.teams?.[id]?.leagueId : null) || t?.leagueId;
            if (lid) App.loadLeague(lid);
        }
    }
};
