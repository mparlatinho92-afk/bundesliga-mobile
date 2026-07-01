Object.assign(App, {
    _AUTOSAVE_KEY: 'ba_autosave_v66',

    quickSave: function() {
        Engine.saveGame();
        this.updateSaveStatus('⚡ Quick-Save: ' + new Date().toLocaleTimeString('de-DE'));
        alert('⚡ Quick-Save gespeichert!');
    },

    // Self-contained Klartext-JSON (Altformat): schlanker Save + history (h) + Archiv (ar) zusammengeführt.
    // (h+ar liegen seit v0.8.29 im eigenen Key ba_arch_v66 als {h,ar}) → ein File, von alt & neu importierbar.
    _mergedSaveJson: function(storedLean) {
        let raw = Engine._decodeSave(storedLean);
        try {
            const obj = JSON.parse(raw);
            if (obj.h == null || obj.ar == null) {
                const ad = localStorage.getItem('ba_arch_v66');
                if (ad != null) { try { const a = JSON.parse(Engine._decodeSave(ad)); if (a) { if (obj.h == null) obj.h = a.h || []; if (obj.ar == null) obj.ar = a.ar || null; } } catch(eA) {} }
                else { if (obj.h == null) obj.h = Engine.history || []; if (obj.ar == null) obj.ar = Engine.archive || null; }
                raw = JSON.stringify(obj);
            }
        } catch(e) {}
        return raw;
    },

    exportGameState: function() {
        const stored = localStorage.getItem('ba_save_v66');
        if (!stored) { alert('Kein Spielstand zum Exportieren.'); return; }
        const blob = new Blob([this._mergedSaveJson(stored)], { type: 'application/json' });
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
                const prev = localStorage.getItem('ba_save_v66');
                const msg = prev
                    ? 'Spielstand laden?\n\nAktueller Stand wird vorher als Backup heruntergeladen.'
                    : 'Spielstand laden?';
                if (!confirm(msg)) { event.target.value = ''; return; }
                if (prev) {
                    // Backup als self-contained Klartext-JSON (inkl. history+Archiv aus eigenem Key)
                    const blob = new Blob([this._mergedSaveJson(prev)], { type: 'application/json' });
                    const a = document.createElement('a');
                    document.body.appendChild(a);
                    a.href = URL.createObjectURL(blob);
                    a.download = 'backup_' + new Date().toISOString().slice(0, 10) + '.json';
                    a.click();
                    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
                }
                // Importierte Klartext-Datei komprimiert ablegen (spart Quota); altes LZ1 unverändert übernehmen
                const stored = raw.slice(0, 3) === 'LZ1' ? raw : Engine._encodeSave(raw);
                sessionStorage.removeItem(this._AUTOSAVE_KEY);
                // Alten Archiv-Key entfernen → loadGame nimmt das 'ar' aus der Importdatei (Migrationspfad);
                // beim nächsten Speichern wandert das Archiv wieder in den eigenen Key ba_arch_v66.
                localStorage.removeItem('ba_arch_v66');
                try {
                    localStorage.setItem('ba_save_v66', stored);
                } catch(eq) {
                    localStorage.removeItem('ba_save_v66');
                    try { localStorage.setItem('ba_save_v66', stored); }
                    catch(eq2) { alert('Speicher voll. Bitte Browser-Daten für diese Seite leeren und erneut versuchen.'); event.target.value = ''; return; }
                }
                if (Engine.loadGame()) {
                    App._sanitizeAppState();
                    App.renderSidebar();
                    App.activeLeague === '__pokal__' ? App.showPokal() : App.loadLeague(App.activeLeague);
                    App.updateStatus();
                    App.updateSaveStatus('📂 Importiert: ' + file.name);
                } else {
                    alert('Import fehlgeschlagen. Datei möglicherweise beschädigt oder veraltet.');
                }
            } catch(err) { alert('Ungültige Datei: ' + err.message); }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    importVerbandspokalPlan: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const plan = JSON.parse(e.target.result);
                if (!plan._meta || plan._meta.schema !== 'verbandspokal-plan-v1') {
                    alert('Kein gültiger Verbandspokal-Plan (schema: verbandspokal-plan-v1 erwartet).');
                    event.target.value = '';
                    return;
                }
                Engine.setVerbandspokalPlan(plan);
                const info = Engine.getVerbandspokalPlanInfo();
                const active = info && info.applies ? ' — aktiv für diese Saison' : ' — gilt ab ' + (plan._meta.planAppliesFromSeason || '?');
                this.updateSaveStatus('🛡 VP-Plan: ' + (plan._meta.planAppliesFromSeason || '?') + active);
                alert('Verbandspokal-Plan geladen.\nGilt ab Saison: ' + (plan._meta.planAppliesFromSeason || '?') + '\n' +
                    (info && info.applies ? 'Plan ist für die LAUFENDE Saison aktiv (initPokal beim nächsten ST1).' : 'Plan wird ab der genannten Saison bei initPokal genutzt.'));
            } catch (err) { alert('Ungültige Plan-Datei: ' + err.message); }
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    clearVerbandspokalPlan: function() {
        if (!confirm('Verbandspokal-Plan aus localStorage entfernen? initPokal nutzt wieder Legacy-VP.')) return;
        Engine.setVerbandspokalPlan(null);
        this.updateSaveStatus('🛡 VP-Plan entfernt (Legacy-VP)');
    },

    restoreAutoSave: function() {
        const raw = sessionStorage.getItem(this._AUTOSAVE_KEY);
        if (!raw) { alert('Kein Auto-Save vorhanden.'); return; }
        try {
            const snap = JSON.parse(raw);
            const ts = new Date(snap.savedAt).toLocaleString('de-DE');
            if (!confirm('Auto-Save laden?\n📅 ' + ts + '\nSpielwoche: ' + (snap.matchday || '?') + '\n\n⚠️ Aktueller Stand wird überschrieben!')) return;
            localStorage.setItem('ba_save_v66', snap.raw != null ? snap.raw : JSON.stringify(snap.state));
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
            // raw ist bereits (komprimiert) kodiert → direkt ablegen, kein parse (kompakt, spart sessionStorage-Quota)
            sessionStorage.setItem(this._AUTOSAVE_KEY, JSON.stringify({
                savedAt: new Date().toISOString(),
                matchday: Engine.currentMatchday,
                raw: raw
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
        this.tsView = null;
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
        this.tsView = null;
        this.zonesCache = null;
    },

    undoLastMatchday: function() {
        if (Engine.currentMatchday === 0) { alert('Kein Spieltag zum Rückgängigmachen.'); return; }
        if (App.viewHistoryOffset !== null) { alert('Im Archiv kann kein Spieltag rückgängig gemacht werden.'); return; }
        if (Engine.actionState) { alert('Laufenden Action-Spieltag erst zu Ende spielen.'); return; }
        if (!confirm('Spieltag ' + Engine.currentMatchday + ' rückgängig machen? Die Ergebnisse werden gelöscht.')) return;
        const lastMd = Engine.matchdayHistory[Engine.matchdayHistory.length - 1];
        const removeCount = lastMd ? lastMd.results.length : 0;
        // Letzten Spieltag aus seasonResults + matchdayHistory entfernen
        Engine.seasonResults = Engine.seasonResults.slice(0, Engine.seasonResults.length - removeCount);
        Engine.matchdayHistory.pop();
        Engine.currentMatchday--;
        // Pokal-Runden zurückrollen die nach dem neuen Spieltag lägen (Pokal läuft asynchron zur Liga)
        Engine.rollbackPokalToMatchday(Engine.currentMatchday);
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
        document.getElementById('modal').style.display = 'none';
        App._captureScroll(); // sauberer Undo: Position erhalten, kein Sprung; Pokal-Ansicht korrekt refreshen
        App.activeLeague === '__pokal__' ? App.showPokal() : App.loadLeague(App.activeLeague);
        App.updateStatus();
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
            <p style="opacity:0.45;margin:0;font-size:12px;">Einzelnen Spieltag rückgängig: ↩-Pfeil oben im Kopf neben „Tag ${md}".</p>
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
    },

    _saveBarToggle: function() {
        const bar = document.getElementById('save-bar');
        const lbl = document.getElementById('savebar-toggle-lbl');
        if (!bar) return;
        const collapsed = bar.classList.toggle('collapsed');
        localStorage.setItem('ba_savebar_c', collapsed ? '1' : '0');
        if (lbl) lbl.textContent = collapsed ? '▾' : '▴';
    }
});
