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
const leagueLogo = id => { const f = LEAGUE_LOGOS[id]; return f ? `Wappen/Ligen, Verbände und Pokale/${f}` : null; };
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
    viewArchivedSeason: null, // {y, lid} – Saison außerhalb des 50er-history-Fensters (aus IndexedDB), read-only Tabelle
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
        this.initTabLock();   // vor dem ersten Rendern: ein zweiter Tab darf nichts schreiben
        this.renderSidebar();
        this._initSidebarResize();
        const first = Object.keys(Engine.leagues).sort((a,b) => Engine.leagues[a].level - Engine.leagues[b].level)[0];
        const saved = localStorage.getItem('ba_lastLeague');
        if (saved === '__pokal__') { this.showPokal(); }
        else if (saved === '__amateur__' || saved === '__ligalos__') { this.showAmateurpokal(); }  // __ligalos__ = Altstand
        else if (saved === '__aufstieg__') { this.showAufstieg(); }
        else if (saved && (Engine.leagues[saved] || this._histLeague(saved))) { this.loadLeague(saved); }
        else { this.loadLeague(first); }
        this.updateStatus();
        // Reload mitten in einer Live-Konferenz (depth 4): mit denselben vorsimulierten Daten neu öffnen
        const st = Engine.actionState;
        const cd = st && st.days && st.days[st.cursor];
        if (cd && cd.conf === 'running' && !cd.played && this.startConference) this.startConference(cd);
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

        // Archivierte Saison (read-only Abschlusstabelle aus IndexedDB) – kein Spieltag-Picker/Aktionen
        if (this.viewArchivedSeason) {
            if (el) el.innerHTML = `<span ${sS}>${this.viewArchivedSeason.y}</span> <span style="opacity:0.45;font-size:0.88em;">(Archiv)</span>`;
            const pB = document.getElementById('btn-play'); if (pB) { pB.textContent = 'Woche'; pB.disabled = true; }
            const sB = document.getElementById('btn-saison'); if (sB) { sB.disabled = true; sB.textContent = 'Saison'; }
            const mB = document.getElementById('btn-mega'); if (mB) mB.disabled = true;
            const uB = document.getElementById('btn-undo'); if (uB) uB.disabled = true;
            return;
        }

        if (this.viewHistoryOffset === null) {
            const tot = Engine.totalMatchdays;
            const leagueTot = Engine.leagues[this.activeLeague]?.seasonLength || tot;
            if (this.tsView) {
                if (el) el.innerHTML = `<span ${sS}>${label}</span> | <span ${mS}>⚽ Testspiele ${this.tsView === 'pre' ? 'Sommer' : 'Winter'}</span>`;
            } else {
                const md = this.matchdayViewIdx !== null
                    ? (Engine.matchdayHistory[this.matchdayViewIdx]?.md ?? '?')
                    : Engine.currentMatchday;
                const aDay = (this.matchdayViewIdx === null && this.actionActive()) ? this._actionDayLabel() : null;
                const span = (typeof md === 'number') ? this._matchdaySpan(md || 1, this.activeLeague, Engine.currentSeasonOffset) : '';
                const mdTxt = (typeof md === 'number' && md >= 1) ? `${md}. ST${span ? ` · ${span}` : ''}` : (span ? `Start · ${span}` : `Tag ${md}/${leagueTot}`);
                if (el) el.innerHTML = `<span ${sS}>${label}</span> | <span ${mS}>${mdTxt}${aDay ? ` · ${aDay}` : ''}</span>`;
            }
            const finished = Engine.currentMatchday >= tot;
            const playBtn = document.getElementById('btn-play');
            if (playBtn) playBtn.textContent = this.actionActive() ? 'Nächster Tag' : 'Woche';
            playBtn.disabled = finished;
            const btnS = document.getElementById('btn-saison');
            if (btnS) { btnS.disabled = false; btnS.textContent = finished ? 'Abschluss' : 'Saison'; }
            document.getElementById('btn-mega').disabled = false;
            const btnU = document.getElementById('btn-undo');
            if (btnU) btnU.disabled = !(Engine.currentMatchday > 0 && !Engine.actionState && !this.tsView);
        } else {
            const archMdHist = Engine.history[this.viewHistoryOffset]?.matchdayHistory || [];
            const archMd = this.matchdayViewIdx !== null ? archMdHist[this.matchdayViewIdx]?.md : null;
            const archSpan = archMd != null ? this._matchdaySpan(archMd, this.activeLeague, this.viewHistoryOffset) : '';
            const mdPart = this.tsView
                ? ` | <span ${mS}>⚽ Testspiele ${this.tsView === 'pre' ? 'Sommer' : 'Winter'}</span>`
                : (archMd != null ? ` | <span ${mS}>${archMd}. ST${archSpan ? ` · ${archSpan}` : ''}</span>` : (archMdHist.length ? ` | <span ${mS}>Tag ?/${archMdHist.length}</span>` : ''));
            if (el) el.innerHTML = `<span ${sS}>${label}</span>${mdPart} <span style="opacity:0.45;font-size:0.88em;">(Archiv)</span>`;
            const playBtn = document.getElementById('btn-play');
            if (playBtn) { playBtn.textContent = 'Woche'; playBtn.disabled = true; }
            const btnS = document.getElementById('btn-saison');
            if (btnS) { btnS.disabled = true; btnS.textContent = 'Saison'; }
            document.getElementById('btn-mega').disabled = true;
            const btnU = document.getElementById('btn-undo');
            if (btnU) btnU.disabled = true; // im Archiv kein Undo
        }
    },

    // Scroll-Position über ein Re-Render hinweg erhalten (flüssige Button-Klicks: Spieltag/Action/Undo
    // springen nicht mehr nach oben). Nur gesetzt, wenn dieselbe Ansicht neu gerendert wird (nicht bei Navigation).
    _captureScroll: function() {
        const c = document.getElementById('content'), f = document.getElementById('md-feed');
        this._pendingScroll = { y: c ? c.scrollTop : 0, fy: f ? f.scrollTop : 0 };
    },
    _applyScroll: function() {
        this._flashResults = null; this._rankBefore = null; // Live-Konferenz-Flash einmalig konsumiert
        const s = this._pendingScroll;
        if (!s) return;
        this._pendingScroll = null;
        const c = document.getElementById('content'); if (c) c.scrollTop = s.y;
        const f = document.getElementById('md-feed'); if (f) f.scrollTop = s.fy;
    },

    // Zurückblättern = ältere Saison (über die GESAMTE Liste: history-Fenster + Archiv)
    prevSeason: function() {
        this._allSeasonsList().then(list => {
            const curY = this._viewedSeason();
            let idx = list.findIndex(e => e.y === curY);
            if (idx === -1) idx = list.length - 1;
            if (idx > 0) { const e = list[idx - 1]; this._gotoSeason(e.y, e.kind, e.offset, e.lid); }
        });
    },

    nextSeasonView: function() {
        this._allSeasonsList().then(list => {
            const curY = this._viewedSeason();
            let idx = list.findIndex(e => e.y === curY);
            if (idx === -1) idx = list.length - 1;
            if (idx >= 0 && idx < list.length - 1) { const e = list[idx + 1]; this._gotoSeason(e.y, e.kind, e.offset, e.lid); }
        });
    },

    _mdHist: function() {
        return this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.matchdayHistory || [])
            : Engine.matchdayHistory;
    },

    // Saison der aktuellen Ansicht (laufend oder Archiv) als String
    _viewedSeason: function() {
        if (this.viewArchivedSeason) return this.viewArchivedSeason.y;
        return this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.year || null)
            : (Engine.getFormattedSeason ? Engine.getFormattedSeason() : null);
    },

    // Heutige Liga + ihre historischen Vorgänger (HIST_EXT.ligaNachfolger, z. B. Oberliga Westfalen Ebene 3/4 → 5-10):
    // {haupt, vorg:[lid]} oder null. Gilt von beiden Seiten – auch in einer Vorgänger-Saison ist es "dieselbe Liga".
    _ligaFamilie: function(lid) {
        if (typeof HistExt === 'undefined' || !HistExt.ligaNachfolger || !lid) return null;
        const haupt = HistExt.ligaNachfolger(lid) || lid, vorg = HistExt.ligaVorgaenger(haupt);
        return vorg.length ? { haupt, vorg } : null;
    },
    // Welches Familienmitglied hat die Saison y? (Vorgänger nach firstYear/lastYear, sonst die heutige Liga)
    _ligaFuerJahr: function(lid, y) {
        const fam = this._ligaFamilie(lid), sy = parseInt(String(y || '')) || 0;
        if (!fam || !sy) return lid;
        const h = fam.vorg.find(v => { const l = HIST_EXT.ligen[v]; return l && sy >= l.firstYear && sy <= l.lastYear; });
        return h || fam.haupt;
    },

    // Geordnete Liste ALLER Saisons der aktiven Liga (alt→neu): archiviert (IDB) ∪ history-Fenster ∪ laufend.
    // Mit historischen Vorgängern (_ligaFamilie) EINE durchgehende Liste; deren Einträge tragen lid + ebene (damals).
    _allSeasonsList: function() {
        const yr = s => parseInt((s || '').split('/')[0]) || 0;
        const fam = this._ligaFamilie(this.activeLeague);
        const lid0 = fam ? fam.haupt : this.activeLeague;
        const histLeague = this._histLeague && this._histLeague(lid0);
        const histYears = new Set(Engine.history.map(h => h.year));
        const curY = Engine.getFormattedSeason ? Engine.getFormattedSeason() : null;
        const build = (archYears, vorgYears) => {
            const out = [], mit = fam ? { lid: lid0 } : {};
            // Archiv-only-Liga (DDR): nur archivierte Saisons, kein history-Fenster / keine laufende Saison.
            (archYears || []).forEach(y => { if (histLeague || (!histYears.has(y) && y !== curY)) out.push({ y, kind: 'arch', offset: null, ...mit }); });
            if (!histLeague) {
                Engine.history.forEach((h, i) => out.push({ y: h.year, kind: 'hist', offset: i, ...mit }));
                if (curY) out.push({ y: curY, kind: 'live', offset: null, ...mit });
            }
            (vorgYears || []).forEach((ys, i) => { const v = fam.vorg[i]; ys.forEach(y => out.push({ y, kind: 'arch', offset: null, lid: v, ebene: HIST_EXT.ligen[v].level })); });
            out.sort((a, b) => yr(a.y) - yr(b.y) || (a.kind === 'live' ? 1 : b.kind === 'live' ? -1 : 0));
            return out;
        };
        if (lid0 && lid0 !== '__pokal__' && typeof IDBStore !== 'undefined') {
            const keys = l => IDBStore.listSeasonKeys(l).catch(() => []);
            return Promise.all([keys(lid0), ...(fam ? fam.vorg.map(keys) : [])]).then(([own, ...vorg]) => build(own, vorg), () => build([]));
        }
        return Promise.resolve(build([]));
    },

    // Zu einer beliebigen Saison springen (live / history-Fenster / Archiv); lid = Liga des Eintrags (Vorgänger-Saison)
    _gotoSeason: function(y, kind, offset, lid) {
        const p = document.getElementById('spicker'); if (p) p.style.display = 'none';
        this.matchdayViewIdx = null; this.zonesCache = null; this.tsView = null;
        const ziel = lid || this.activeLeague;
        // In eine Vorgänger-Saison: deren Abschlusstabelle zeigen (Ewige Tabelle/Meister gibt es nur durchgehend bei der heutigen Liga)
        if (ziel !== this.activeLeague && this._histLeague && this._histLeague(ziel) && (this.tableView === 'ewige' || this.tableView === 'sieger')) this.tableView = 'gesamt';
        if (kind === 'live') { this.viewHistoryOffset = null; this.viewArchivedSeason = null; }
        else if (kind === 'arch') { this.viewHistoryOffset = null; this.viewArchivedSeason = { y: y, lid: ziel }; }
        else { this.viewHistoryOffset = offset; this.viewArchivedSeason = null; }
        if (this.activeLeague === '__pokal__') this.showPokal(); else this.loadLeague(ziel);
        this.updateStatus();
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
            // In einer Vorgänger-Saison (historische ID) bleibt die heutige Liga markiert – es ist dieselbe Liga
            const aktiv = this.activeLeague === l.id || (typeof HistExt !== 'undefined' && HistExt.ligaNachfolger && HistExt.ligaNachfolger(this.activeLeague) === l.id);
            div.className = `league-item ${aktiv ? 'active' : ''}`;
            div.dataset.level = l.level;
            const c = LEVEL_COLORS[(l.level-1) % LEVEL_COLORS.length];
            const logo = leagueLogo(l.id);
            const logoHtml = logo ? `<img src="${logo}" class="league-logo-mini" loading="lazy">` : '';
            div.innerHTML = `<span class="league-level" style="background:${c}">${l.id}</span>${logoHtml} <span class="league-name" data-full="${l.name}" data-mid="${this._sidebarMid(l)}" data-short="${this._sidebarShort(l)}">${l.name}</span>`;
            div.onclick = () => this.loadLeague(l.id);
            list.appendChild(div);
        });
        // Historische Ligen (nur Archiv, kein Live-Betrieb): EINE aufklappbare Gruppe, darin Epochen → Ebene → Region
        if (typeof HIST_ARCHIVE_LEAGUES !== 'undefined' && Object.keys(HIST_ARCHIVE_LEAGUES).length) {
            const haSep = document.createElement('div');
            haSep.style.cssText = 'border-top:1px solid var(--border);margin:0;opacity:0.25;';
            list.appendChild(haSep);
            this._renderHistSidebar(list, LEVEL_COLORS);
        }
        // Amateurpokal – der Wettbewerb der ligalosen Vereine, ihr Ersatz für den Ligabetrieb
        const llSep = document.createElement('div');
        llSep.style.cssText = 'border-top:1px solid var(--border);margin:0;opacity:0.25;';
        list.appendChild(llSep);
        const llCount = (Engine.ligalosTeams ? Engine.ligalosTeams() : Object.values(GAME_DATA.teams).filter(t => !t.leagueId)).length;
        const llDiv = document.createElement('div');
        llDiv.className = `league-item ${this.activeLeague === '__amateur__' ? 'active' : ''}`;
        llDiv.innerHTML = `<span class="league-level" style="background:var(--panel-2)">&#127949;</span> <span class="league-name" data-full="Amateurpokal (${llCount})" data-mid="Amateurpokal (${llCount})" data-short="Amateurp. (${llCount})">Amateurpokal (${llCount})</span>`;
        llDiv.onclick = () => this.showAmateurpokal();
        list.appendChild(llDiv);
        // Aufstiegsrunden – historische Entscheidungen zwischen den Ligen, eigener Wettbewerb wie die Pokale
        if (typeof AUFSTIEG_SEED !== 'undefined') {
            const auDiv = document.createElement('div');
            const auN = (AUFSTIEG_SEED.runden || []).length;
            auDiv.className = `league-item ${this.activeLeague === '__aufstieg__' ? 'active' : ''}`;
            auDiv.innerHTML = `<span class="league-level" style="background:var(--panel-2)">&#11014;</span> <span class="league-name" data-full="Aufstiegsrunden (${auN})" data-mid="Aufstiegsrunden (${auN})" data-short="Aufstiegsr. (${auN})">Aufstiegsrunden (${auN})</span>`;
            auDiv.onclick = () => this.showAufstieg();
            list.appendChild(auDiv);
        }
        this._fitSidebarLabels();
    },

    // Aufklapp-Zustand der Historien-Gruppe: 'all' = Gruppe selbst, Epochen-IDs darunter (localStorage ba_sb_hist).
    _histSbOffen: function() {
        let o = [];
        try { o = JSON.parse(localStorage.getItem('ba_sb_hist') || '[]'); } catch (e) {}
        return new Set(Array.isArray(o) ? o : []);
    },
    _histSbToggle: function(key) {
        const o = this._histSbOffen();
        o.has(key) ? o.delete(key) : o.add(key);
        try { localStorage.setItem('ba_sb_hist', JSON.stringify([...o])); } catch (e) {}
        this.renderSidebar();
    },
    // Gruppe "Historische Ligen": Kopf → Epochen (BRD 1963–1978 …, DDR) → Ligen nach Ebene und Region.
    // Die Epoche der gerade angezeigten Liga ist immer offen, damit die Markierung sichtbar bleibt.
    _renderHistSidebar: function(list, LEVEL_COLORS) {
        // Ligen mit heutigem Nachfolger (Oberliga Westfalen 1978–2008 …) stehen nicht hier, sondern unter der heutigen Liga
        const nf = id => typeof HistExt !== 'undefined' && HistExt.ligaNachfolger && HistExt.ligaNachfolger(id);
        const alle = Object.values(HIST_ARCHIVE_LEAGUES).filter(h => !nf(h.id));
        const offen = this._histSbOffen();
        const aktiv = (!nf(this.activeLeague) && HIST_ARCHIVE_LEAGUES[this.activeLeague]) || null;
        const auf = key => offen.has(key) || (aktiv && (key === 'all' || key === aktiv.epoche));
        const kopf = (cls, pfeil, text, zahl, onclick) => {
            const d = document.createElement('div');
            d.className = 'hist-sb ' + cls;
            d.innerHTML = `<span class="hist-sb-pfeil">${pfeil}</span><span class="hist-sb-txt">${text}</span><span class="hist-sb-zahl">${zahl}</span>`;
            d.onclick = onclick;
            list.appendChild(d);
        };
        const gAuf = auf('all');
        kopf('hist-sb-kopf', gAuf ? '▾' : '▸', '📜 Historische Ligen', alle.length, () => this._histSbToggle('all'));
        if (!gAuf) return;
        const epochen = typeof HIST_EPOCHEN !== 'undefined' ? HIST_EPOCHEN : [{ id: 'ddr', name: 'DDR' }];
        epochen.forEach(ep => {
            const ligen = alle.filter(h => (h.epoche || 'ddr') === ep.id)
                .sort((a, b) => a.level - b.level || (a.ord || 0) - (b.ord || 0) || a.name.localeCompare(b.name, 'de'));
            if (!ligen.length) return;
            const eAuf = auf(ep.id);
            kopf('hist-sb-epoche', eAuf ? '▾' : '▸', `${ep.name}${ep.sub ? `<small>${ep.sub}</small>` : ''}`, ligen.length, () => this._histSbToggle(ep.id));
            if (!eAuf) return;
            let lv = null, reg = null;
            ligen.forEach(h => {
                if (h.level !== lv) {
                    lv = h.level; reg = null;
                    const t = document.createElement('div');
                    t.className = 'hist-sb-ebene';
                    t.textContent = `Ebene ${h.level}`;
                    list.appendChild(t);
                }
                // Region nur benennen, wo es auf dieser Ebene mehrere gibt (DDR: Bezirke stehen in amtlicher Reihenfolge)
                if (h.region && h.region !== reg && ligen.filter(x => x.level === lv && x.region !== h.region).length && h.gebiet !== 'DDR') {
                    reg = h.region;
                    const t = document.createElement('div');
                    t.className = 'hist-sb-region';
                    t.textContent = h.region;
                    list.appendChild(t);
                }
                const c = LEVEL_COLORS[(h.level - 1) % LEVEL_COLORS.length];
                const div = document.createElement('div');
                div.className = `league-item hist-sb-liga ${this.activeLeague === h.id ? 'active' : ''}`;
                div.dataset.level = 'h' + h.level;
                const jahre = `${h.firstYear}–${String(h.lastYear + 1).slice(-2)}`;
                const kurz = this._histKurzName ? this._histKurzName(h.id) : h.name;
                div.title = `${h.name} · ${jahre}`;
                div.innerHTML = `<span class="league-level" style="background:${c}">${h.kurz || h.id.toUpperCase()}</span> <span class="league-name" data-full="${h.name}" data-mid="${kurz}" data-short="${kurz}">${h.name}</span><span class="hist-sb-jahre">${jahre}</span>`;
                div.onclick = () => this.loadLeague(h.id);
                list.appendChild(div);
            });
        });
    },

    // Sidebar-eigene Kürzung (NICHT der Baum), 3-stufig & voll algorithmisch:
    //   full = voller Name | mid = nur Typ-Tag + Struktur (Region BLEIBT voll) | short = + Region kürzen.
    _TYPE_TAGS: { "Regionalliga": "RL", "Landesliga": "LL", "Bezirksliga": "BZL", "Verbandsliga": "VL", "Oberliga": "OL" },
    // mid: Liga-Typ → Tag (Regionalliga→RL …), NOFV-Oberliga→NOFV-OL, Gruppe→Gr., Staffel→St.; Region voll.
    _sidebarMid: function(l) {
        const full = l.name, fw = full.split(' ')[0], tag = this._TYPE_TAGS[fw];
        let s = tag ? tag + full.slice(fw.length) : full;
        return s.replace(/NOFV-Oberliga/g, 'NOFV-OL').replace(/\bGruppe\b/g, 'Gr.').replace(/\bStaffel\b/g, 'St.');
    },
    // short: mid + Region-/Wort-Kürzung (letzte Stufe vor Ellipsis). Mehrwortregionen zuerst.
    _sidebarShort: function(l) {
        let s = this._sidebarMid(l)
            .replace(/Rheinland-Pfalz/g, 'RLP').replace(/Baden-Württemberg/g, 'Baden-W.')
            .replace(/Schleswig-Holstein/g, 'S-H').replace(/Mecklenburg-Vorpommern/g, 'Meckl.-Vpom.')
            .replace(/Sachsen-Anhalt/g, 'Sachsen-A.')
            .replace(/\bRheinland\b/g, 'Rhld.').replace(/\bBraunschweig\b/g, 'Braunschw.')
            .replace(/\bHamburg\b/g, 'HH').replace(/\bNiedersachsen\b/g, 'NS');
        // Himmelsrichtung nur als QUALIFIER (Position >=2, nicht direkt hinter dem Tag):
        // "RL/VL Südwest" bleiben ausgeschrieben, "LL Bayern NW"/"VL Saarland NO" kürzen.
        return s.split(' ').map((tok, i) => {
            const m = i >= 2 && tok.match(/^(Nord|Süd)-?(Ost|West)$/i);
            return m ? m[1][0].toUpperCase() + m[2][0].toUpperCase() : tok;
        }).join(' ');
    },

    // Sidebar-Labels responsiv, 3-stufig: Typ-Stufe GRUPPENWEISE pro Level (Einheitlichkeit unter
    // Nachbarn), Region-Stufe PRO VEREIN (individuelle Namen so voll wie möglich).
    _fitSidebarLabels: function() {
        const groups = {};
        document.querySelectorAll('#league-list .league-item').forEach(it => {
            if (!it.querySelector('.league-name')) return;
            (groups[it.dataset.level || '0'] = groups[it.dataset.level || '0'] || []).push(it);
        });
        const set = (it, attr) => { it.querySelector('.league-name').textContent = it.querySelector('.league-name').getAttribute(attr); };
        // Flex-Einträge (Historien-Gruppe) kürzen den Namen selbst per Ellipsis – dort am Namen messen
        const over = it => { const n = it.querySelector('.league-name'); return it.scrollWidth > it.clientWidth + 1 || n.scrollWidth > n.clientWidth + 1; };
        Object.values(groups).forEach(group => {
            group.forEach(it => set(it, 'data-full'));            // 1) alle voll
            if (group.some(over)) {
                group.forEach(it => set(it, 'data-mid'));         // 2) Typ-Stufe gruppenweise
                group.forEach(it => { if (over(it)) set(it, 'data-short'); }); // 3) Region pro Verein
            }
        });
    },

    // Sidebar-Breite per Drag-Griff frei einstellbar (Pointer-Events = Maus + Touch),
    // persistiert in localStorage 'ba_sidebar_w'; Clamp gegen zu schmal/zu breit.
    _initSidebarResize: function() {
        const sb = document.getElementById('sidebar');
        const rez = document.getElementById('sidebar-resizer');
        if (!sb || !rez) return;
        const MIN = 150, maxW = () => Math.min(560, Math.round(window.innerWidth * 0.85));
        const apply = w => { sb.style.width = Math.max(MIN, Math.min(maxW(), w)) + 'px'; };
        const saved = parseInt(localStorage.getItem('ba_sidebar_w') || '', 10);
        if (saved) { apply(saved); this._fitSidebarLabels(); }
        window.addEventListener('resize', () => {
            clearTimeout(this._sbFitTimer);
            this._sbFitTimer = setTimeout(() => App._fitSidebarLabels(), 120);
        });
        let startX = 0, startW = 0, active = false, raf = 0;
        const onMove = e => {
            if (!active) return;
            apply(startW + (e.clientX - startX));
            if (!raf) raf = requestAnimationFrame(() => { raf = 0; App._fitSidebarLabels(); });
            e.preventDefault();
        };
        const onUp = () => {
            if (!active) return;
            active = false;
            document.body.style.userSelect = '';
            localStorage.setItem('ba_sidebar_w', parseInt(sb.style.width, 10));
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        rez.addEventListener('pointerdown', e => {
            active = true;
            startX = e.clientX;
            startW = sb.getBoundingClientRect().width;
            document.body.style.userSelect = 'none';
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            e.preventDefault();
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
        const r = evt.target.getBoundingClientRect();
        p.dataset.mode = 'season';
        p.innerHTML = '<div class="dots-item" style="opacity:0.5">lädt…</div>';
        p.style.display = 'block'; p.style.top = (r.bottom + 4) + 'px'; p.style.left = Math.max(4, r.left - 20) + 'px';
        // Gesamtliste (inkl. Archiv aus IndexedDB) async aufbauen, neueste zuerst
        this._allSeasonsList().then(list => {
            if (p.dataset.mode !== 'season' || p.style.display === 'none') return;
            const curY = this._viewedSeason();
            // Vorgänger-Saisons (andere Ebene, anderer Ligenbaum): Trenner mit Ebene + Zeitraum, je Saison ein Kürzel "E4"
            const rev = list.slice().reverse();
            p.innerHTML = rev.map((e, i) => {
                const active = e.y === curY ? ' picker-active' : '';
                const tag = e.kind === 'live' ? ' ✓' : e.ebene ? ` <span class="spicker-ebene">E${e.ebene}</span>` : (e.kind === 'arch' ? ' <span style="opacity:0.4;font-size:10px">Archiv</span>' : '');
                const vor = rev[i - 1];
                let sep = '';
                if (e.ebene && (!vor || vor.lid !== e.lid)) {
                    const gl = rev.filter(x => x.lid === e.lid), von = gl[gl.length - 1].y.split('/')[0], bis = String(parseInt(gl[0].y) + 1);
                    sep = `<div class="spicker-sep">damals Ebene ${e.ebene} · ${von}–${bis}</div>`;
                }
                return `${sep}<div class="dots-item${active}" onclick="App._gotoSeason('${e.y}','${e.kind}',${e.offset == null ? 'null' : e.offset}${e.lid ? `,'${e.lid}'` : ''})">${e.y}${tag}</div>`;
            }).join('');
        });
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
        const pkOff = this.viewHistoryOffset !== null ? this.viewHistoryOffset : Engine.currentSeasonOffset;
        // Neueste zuerst (Aktuell oben → Testspiele Sommer unten)
        const html = toks.map((t, i) => {
            const active = i === curIdx ? ' picker-active' : '';
            if (t.live)            return `<div class="dots-item${active}" onclick="App._selectMatchday(null)">Aktuell</div>`;
            if (t.ts === 'winter') return `<div class="dots-item${active}" onclick="App._selectTsView('winter')">⚽ Testspiele (Winter)</div>`;
            if (t.ts === 'pre')    return `<div class="dots-item${active}" onclick="App._selectTsView('pre')">⚽ Testspiele (Sommer)</div>`;
            const md = hist[t.md]?.md ?? (t.md + 1);
            const sp = this._matchdaySpan(md, this.activeLeague, pkOff);
            return `<div class="dots-item${active}" onclick="App._selectMatchday(${t.md})">Spieltag ${md}${sp ? ` · ${sp}` : ''}</div>`;
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

    // Spieltag → echtes Spielwochenende als "Fr.–So."-Spanne (Phase 2 Kalender). Leerstring wenn n/a.
    _matchdaySpan: function(md, leagueId, offset) {
        if (!md || md < 1) return '';
        const sat = Engine.matchdayWeekend(leagueId, md, offset);
        if (!sat) return '';
        const fri = new Date(sat); fri.setDate(fri.getDate() - 1);
        const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
        const p = n => String(n).padStart(2, '0');
        return fri.getMonth() === sun.getMonth()
            ? `${p(fri.getDate())}.–${p(sun.getDate())}.${p(sun.getMonth() + 1)}.`
            : `${p(fri.getDate())}.${p(fri.getMonth() + 1)}.–${p(sun.getDate())}.${p(sun.getMonth() + 1)}.`;
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
                results.push({ type:'verein', id:t.id, label:t.name, sub:liga?.name || lid || 'ligalos', leagueId:lid, logo:t.thumb || null });
            }
            // Aufgelöste/historische Vereine (nur HISTORIC_CLUBS) – Steckbrief zeigt Archiv-Historie
            if (typeof HISTORIC_CLUBS !== 'undefined') {
                for (const [id, name] of Object.entries(HISTORIC_CLUBS)) {
                    if (name.toLowerCase().includes(q))
                        results.push({ type:'verein', id, label:name, sub:'ehemaliger Verein', leagueId:null, logo:null });
                }
            }
            // Era-/Altnamen aktiver Vereine (HISTORIC_NAMES) suchbar → JEDE passende Namensform sichtbar
            // (z.B. "Empor" → "BSG Empor Lauter" UND "SC Empor Rostock"; "Vorwärts" → Berlin UND Frankfurt).
            if (typeof HISTORIC_NAMES !== 'undefined') {
                for (const [id, eras] of Object.entries(HISTORIC_NAMES)) {
                    const cur = (eng?.[id] || GAME_DATA.teams[id] || {}).name
                        || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || '';
                    const seen = new Set([cur.toLowerCase()]);                 // aktueller Name nicht als "früher" doppeln
                    for (const e of (eras || [])) {
                        if (!e.name || !e.name.toLowerCase().includes(q)) continue;
                        if (seen.has(e.name.toLowerCase())) continue;          // Dublette / = aktueller Name
                        seen.add(e.name.toLowerCase());
                        results.push({ type:'verein', id, label:e.name, sub:'früher · ' + (cur || id), leagueId:null, logo:(GAME_DATA.teams[id] || {}).thumb || null });
                    }
                }
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
            App.showSteckbrief(id);   // Verein → Steckbrief (auch ligalose/historische Vereine ohne Liga)
        }
    }
};
