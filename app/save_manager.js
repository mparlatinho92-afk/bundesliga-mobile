Object.assign(App, {
    _AUTOSAVE_KEY: 'ba_autosave_v66',

    quickSave: function() {
        Engine.saveGame();
        this.updateSaveStatus('⚡ Quick-Save: ' + new Date().toLocaleTimeString('de-DE'));
        alert('⚡ Quick-Save gespeichert!');
    },

    exportGameState: function() {
        const raw = localStorage.getItem('ba_save_v66');
        if (!raw) { alert('Kein Spielstand zum Exportieren.'); return; }
        const blob = new Blob([raw], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'bundesliga_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        this.updateSaveStatus('💾 Exportiert: ' + new Date().toLocaleTimeString('de-DE'));
    },

    importGameState: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const raw = e.target.result;
                JSON.parse(raw);
                if (!confirm('Spielstand laden? Aktueller Stand wird überschrieben.')) { event.target.value = ''; return; }
                localStorage.setItem('ba_save_v66', raw);
                if (Engine.loadGame()) {
                    App._sanitizeAppState();
                    App.renderSidebar();
                    App.activeLeague === '__pokal__' ? App.showPokal() : App.loadLeague(App.activeLeague);
                    App.updateStatus();
                    App.updateSaveStatus('📂 Importiert: ' + file.name);
                }
            } catch(err) { alert('Ungültige Datei: ' + err.message); }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    restoreAutoSave: function() {
        const raw = localStorage.getItem(this._AUTOSAVE_KEY);
        if (!raw) { alert('Kein Auto-Save vorhanden.'); return; }
        try {
            const snap = JSON.parse(raw);
            const ts = new Date(snap.savedAt).toLocaleString('de-DE');
            if (!confirm('Auto-Save laden?\n📅 ' + ts + '\nSpielwoche: ' + (snap.matchday || '?') + '\n\n⚠️ Aktueller Stand wird überschrieben!')) return;
            localStorage.setItem('ba_save_v66', JSON.stringify(snap.state));
            if (Engine.loadGame()) {
                App._sanitizeAppState();
                App.renderSidebar();
                App.activeLeague === '__pokal__' ? App.showPokal() : App.loadLeague(App.activeLeague);
                App.updateStatus();
                App.updateSaveStatus('↩️ Auto-Save geladen (' + ts + ')');
            }
        } catch(e) { alert('Auto-Save fehlerhaft: ' + e.message); }
    },

    triggerAutoSave: function() {
        try {
            const raw = localStorage.getItem('ba_save_v66');
            if (!raw) return;
            localStorage.setItem(this._AUTOSAVE_KEY, JSON.stringify({
                savedAt: new Date().toISOString(),
                matchday: Engine.currentMatchday,
                state: JSON.parse(raw)
            }));
            this.updateSaveStatus('🔄 Auto-Save: ' + new Date().toLocaleTimeString('de-DE'));
        } catch(e) {}
    },

    updateSaveStatus: function(msg) {
        const el = document.getElementById('saveStatus');
        if (el) el.textContent = msg;
    },

    // Nach Import/Load: alle App-Navigationsvariablen auf sichere Defaults zurücksetzen
    _sanitizeAppState: function() {
        this.viewHistoryOffset = null;
        this.matchdayViewIdx = null;
        this.ewigeSeasonIdx = null;
        this.pokalTab = 0;
        this.pokalMatchesOpen = true;
        this.tableView = 'gesamt';
        this.zonesCache = null;
        if (!this.activeLeague || (this.activeLeague !== '__pokal__' && !Engine.leagues[this.activeLeague])) {
            const first = Object.keys(Engine.leagues).sort((a, b) => Engine.leagues[a].level - Engine.leagues[b].level)[0];
            this.activeLeague = first || '1';
        }
    },

    // Setzt ewigeSeasonIdx + viewHistoryOffset zurück → Ewige Tabelle zeigt "Aktuell"
    _resetEwigeState: function() {
        this.ewigeSeasonIdx = null;
        this.viewHistoryOffset = null;
        this.matchdayViewIdx = null;
        this.zonesCache = null;
    },

    undoLastMatchday: function() {
        if (Engine.currentMatchday === 0) { alert('Kein Spieltag zum Rückgängigmachen.'); return; }
        const lastMd = Engine.matchdayHistory[Engine.matchdayHistory.length - 1];
        const removeCount = lastMd ? lastMd.results.length : 0;
        // Letzten Spieltag aus seasonResults + matchdayHistory entfernen
        Engine.seasonResults = Engine.seasonResults.slice(0, Engine.seasonResults.length - removeCount);
        Engine.matchdayHistory.pop();
        Engine.currentMatchday--;
        // Team-Stats komplett aus verbleibenden seasonResults neu berechnen
        const applyTo = (s, gf, ga) => {
            s.p++; s.gf += gf; s.ga += ga;
            if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) s.l++; else { s.d++; s.pts += 1; }
        };
        Object.values(Engine.teams).forEach(t => {
            t.stats     = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, awayGf:0 };
            t.homeStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
            t.awayStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
        });
        Engine.seasonResults.forEach(r => {
            const h = Engine.teams[r.hId], a = Engine.teams[r.aId];
            if (!h || !a) return;
            applyTo(h.stats, r.s1, r.s2);
            applyTo(a.stats, r.s2, r.s1);
            applyTo(h.homeStats, r.s1, r.s2);
            applyTo(a.awayStats, r.s2, r.s1);
            a.stats.awayGf = (a.stats.awayGf || 0) + r.s2;
        });
        Engine.sortTables();
        Engine.saveGame();
        this._resetEwigeState();
        App.renderSidebar();
        App.loadLeague(App.activeLeague);
        App.updateStatus();
        document.getElementById('modal').style.display = 'none';
        App.updateSaveStatus('↩️ Spieltag ' + (Engine.currentMatchday + 1) + ' rückgängig gemacht');
    },

    deleteCurrentSeason: function() {
        if (!Engine.history || Engine.history.length === 0) {
            alert('Keine vorherige Saison vorhanden – Löschen nicht möglich.');
            return;
        }
        const curSeason = Engine.getFormattedSeason();
        const snap = Engine.history[Engine.history.length - 1];
        const hasMd = Engine.currentMatchday > 0;
        const msg = 'Saison ' + curSeason + ' löschen?\n\n' +
            (hasMd ? '⚠️ Spieltag ' + Engine.currentMatchday + ' wird verworfen.\n\n' : '') +
            'Zurück zu Saison ' + snap.year + ' (abgeschlossen).';
        if (!confirm(msg)) return;

        Engine.history.pop();
        Engine.currentSeasonOffset--;

        // Teams auf Endstand der Vorsaison zurücksetzen
        Object.entries(snap.teams).forEach(([id, ht]) => {
            const t = Engine.teams[id];
            if (!t) return;
            t.leagueId = ht.leagueId;
            t.rank = ht.rank || 1;
            t.stats = ht.stats ? { ...ht.stats } : { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,awayGf:0 };
            t.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
            t.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
        });

        // matchdayHistory aus Snapshot wiederherstellen (lean oder voll)
        Engine.matchdayHistory = snap.matchdayHistory
            ? snap.matchdayHistory.slice()
            : (snap.mdH || []).map(mh => ({
                md: mh.md,
                results: (mh.r || []).map(x => ({ leagueId: x.l, home: x.h, away: x.a, score1: x.s1, score2: x.s2 }))
            }));
        Engine.currentMatchday = Engine.totalMatchdays;
        Engine.seasonResults = [];
        Engine.relegationResults = [];
        if (snap.pokal) Engine.pokal = JSON.parse(JSON.stringify(snap.pokal));

        Engine.sortTables();
        this._resetEwigeState();
        Engine.saveGame();
        App.renderSidebar();
        App.loadLeague(App.activeLeague);
        App.updateStatus();
        document.getElementById('modal').style.display = 'none';
        App.updateSaveStatus('🗑️ Saison ' + curSeason + ' gelöscht → zurück zu ' + snap.year);
    },

    openResetCenter: function() {
        const md = Engine.currentMatchday;
        const curSeason = Engine.getFormattedSeason();
        const canDelete = Engine.history && Engine.history.length > 0;
        const html = `<div style="display:flex;flex-direction:column;gap:12px;padding:8px;">
            <p style="opacity:0.6;margin:0 0 4px;font-size:13px;">Laufend: ${curSeason} · Spieltag ${md}/${Engine.totalMatchdays}</p>
            <button class="btn" style="background:#2196f3;" onclick="App.undoLastMatchday()" ${md === 0 ? 'disabled' : ''}>
                ↩️ Spieltag rückgängig (Tag ${md})</button>
            <button class="btn" style="background:#f59e0b;color:#000;"
                onclick="if(confirm('Saison ${curSeason} zurücksetzen? Alle ${md} Spieltage werden gelöscht.')){Engine.resetSeason();App._resetEwigeState();App.renderSidebar();App.loadLeague(App.activeLeague);App.updateStatus();document.getElementById('modal').style.display='none';}">
                🔄 Saison zurücksetzen (${curSeason})</button>
            <button class="btn" style="background:#e53935;" onclick="App.deleteCurrentSeason()" ${!canDelete ? 'disabled' : ''}>
                🗑️ Saison löschen (${curSeason})</button>
            <button class="btn" style="background:#dc2626;" onclick="App.reset()">
                💥 Alles löschen (kompletter Neustart)</button>
        </div>`;
        App.openModal('🔧 Reset-Center', html, false);
    },

    openDatasetManager: function() {
        alert('📂 Datensätze – noch nicht implementiert');
    }
});
