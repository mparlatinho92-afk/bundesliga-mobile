const LEAGUE_LOGOS = {
    '1':'bundesliga.png','2':'bundesliga_2.png','3':'3_liga.png',
    '4-1':'regionalliga_suedwest.png','4-2':'regionalliga_nord.png','4-3':'regionalliga_nordost.png','4-4':'regionalliga_west.png','4-5':'regionalliga_bayern.png',
    '5-1':'suedwestdeutscher_fussballverband.png','5-2':'oberliga_baden_wuerttembergsvg.png','5-3':'hessischer_fussballverband.png',
    '5-4':'schleswig_holstein_flens_oberliga.png','5-5':'hamburger_fussball_verband_logosvg.png','5-6':'niedersachsen.png',
    '5-7':'bremen.png','5-8':'nofv_nordost.png','5-9':'nofv_nordost.png','5-10':'oberliga_westfalen.png',
    '5-11':'oberliga_niederrhein.png','5-12':'mittelrhein.png','5-13':'bayerischer_fussballverbandsvg.png','5-14':'bayerischer_fussballverbandsvg.png',
    '6-1':'oberliga_suedwest_fussball_regional_verband_suedwest.png','6-2':'rheinland.png','6-3':'saarlandliga.png',
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
    const el = document.getElementById('version-display');
    if (el) el.textContent = 'v' + VERSION;
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
    tableView: 'gesamt',
    pokalTab: 0,
    pokalMatchesOpen: true,

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
        this.loadLeague(first);
        this.updateStatus();
    },

    updateStatus: function() {
        const label = this.viewHistoryOffset !== null
            ? (Engine.history[this.viewHistoryOffset]?.year || '?')
            : Engine.getFormattedSeason();

        let status = label;
        if(this.viewHistoryOffset === null) {
            const md = Engine.currentMatchday;
            const tot = Engine.totalMatchdays;
            const leagueTot = Engine.leagues[this.activeLeague]?.seasonLength || tot;
            status += ` | Tag ${md}/${leagueTot}`;
            const finished = md >= tot;
            document.getElementById('btn-play').disabled = finished;
            document.getElementById('btn-sim').disabled = finished;
            document.getElementById('btn-finish').disabled = false;
            document.getElementById('btn-finish').style.opacity = finished ? 1 : 0.5;
            document.getElementById('btn-mega').disabled = false;
        } else {
            status += " (Archiv)";
            document.getElementById('btn-play').disabled = true;
            document.getElementById('btn-sim').disabled = true;
            document.getElementById('btn-finish').disabled = true;
            document.getElementById('btn-mega').disabled = true;
        }
        document.getElementById('season-info').innerText = status;
    },

    prevSeason: function() {
        if (this.viewHistoryOffset === null) {
            if (Engine.history.length > 0) this.viewHistoryOffset = Engine.history.length - 1;
            else return;
        } else if (this.viewHistoryOffset > 0) {
            this.viewHistoryOffset--;
        } else return;
        if (this.activeLeague === '__pokal__') this.showPokal();
        else this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    nextSeasonView: function() {
        if (this.viewHistoryOffset === null) return;
        if (this.viewHistoryOffset < Engine.history.length - 1) {
            this.viewHistoryOffset++;
        } else {
            this.viewHistoryOffset = null;
        }
        if (this.activeLeague === '__pokal__') this.showPokal();
        else this.loadLeague(this.activeLeague);
        this.updateStatus();
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
        pokalSep.style.cssText = 'border-top:1px solid #fff;margin:0;opacity:0.15;';
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
                sep.style.cssText = 'border-top:1px solid #fff;margin:0;opacity:0.25;';
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
    }
};
