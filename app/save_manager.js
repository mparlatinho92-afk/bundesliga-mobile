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

    // Speicher-Diagnose: WEM gehoeren die Zeilen im Langzeit-Archiv? Liest bewusst ROH aus
    // IndexedDB, nicht ueber IDBStore - dessen Lesepfade filtern ja gerade auf den eigenen
    // Spielstand, und genau die ausgeblendeten Zeilen sind hier die Frage.
    //
    // Zwei Befunde zaehlen: mehrere Kennungen (Daten aus mehreren Spielstaenden) und - der harte
    // Beweis - WIDERSPRUCH: fuer dieselbe Liga und Saison stehen zwei verschiedene Meister drin.
    // Das kann kein einzelner Durchlauf erzeugt haben.
    showSpeicherDiagnose: function() {
        this.openModal('\u{1F9EA} Speicher-Diagnose', '<div style="padding:18px;font-size:12px;color:var(--muted)">Lese Langzeit-Archiv \u2026</div>', false);
        const alle = (db, store) => new Promise(res => {
            try {
                const q = db.transaction(store, 'readonly').objectStore(store).getAll();
                q.onsuccess = () => res(q.result || []);
                q.onerror = () => res([]);
            } catch (e) { res([]); }
        });
        new Promise((res, rej) => {
            const r = indexedDB.open('ba_archive_v1');
            r.onsuccess = e => res(e.target.result);
            r.onerror = () => rej(r.error);
        }).then(db => Promise.all([alle(db, 'champions'), alle(db, 'season_tables'), alle(db, 'relegation')]))
        .then(([ch, tb, rl]) => {
            const sids = {};
            [].concat(ch, tb, rl).forEach(r => { const k = r.sid || null; sids[k] = (sids[k] || 0) + 1; });
            // NUR selbst gespielte Saisons vergleichen. Die historischen Seed-Meister sind hier
            // untauglich: die 2. Bundesliga hatte bis 1981 ZWEI Staffeln (Nord/Sued) unter derselben
            // Liga-ID, ebenso die DDR-Ligen - dort sind zwei Meister im selben Jahr korrekt und
            // haetten jeden sauberen Spielstand als "vermischt" gemeldet.
            const abJahr = Engine.startYear || 2025;
            const seen = {}, kon = [];
            let dop = 0;
            ch.filter(c => parseInt(c.y) >= abJahr).forEach(c => {
                const k = c.lid + '|' + c.y;
                if (seen[k] === undefined) seen[k] = c.id;
                else if (seen[k] !== c.id) kon.push(c.y + ' \u00b7 ' + (this._leagueName ? this._leagueName(c.lid) : c.lid) + ': ' + this._recTeamName(seen[k]) + ' / ' + this._recTeamName(c.id));
                else dop++;
            });
            const eigene = Engine.saveId;
            const fremde = Object.keys(sids).filter(k => k !== 'null' && k !== eigene);
            const zeile = (k, n) => {
                const label = k === 'null' ? 'ohne Kennung (vor v0.8.132 geschrieben)' : k;
                const tag = k === 'null' ? (Engine.idbLegacy ? '\u2192 geh\u00f6rt diesem Spielstand' : '\u2192 wird ausgeblendet')
                          : (k === eigene ? '\u2192 dieser Spielstand' : '\u2192 FREMD, wird ausgeblendet');
                const col = (k === eigene || (k === 'null' && Engine.idbLegacy)) ? 'var(--text)' : 'var(--c-fix-down)';
                return `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--border);font-size:11px">
                    <span style="flex:1;min-width:0;color:${col};overflow:hidden;text-overflow:ellipsis">${label}<br><span style="opacity:.6">${tag}</span></span>
                    <span style="flex:0 0 auto;font-weight:bold;color:var(--c-gold)">${n}</span></div>`;
            };
            const sauber = !fremde.length && !kon.length;
            const fazit = sauber
                ? '<div style="padding:8px 10px;border-radius:5px;background:var(--panel-2);border-left:3px solid var(--c-win);font-size:12px">'
                  + '<b>Sauber.</b> Alle Zeilen geh\u00f6ren zu diesem Spielstand \u2013 keine Vermischung.</div>'
                : '<div style="padding:8px 10px;border-radius:5px;background:var(--panel-2);border-left:3px solid var(--c-fix-down);font-size:12px">'
                  + '<b>Vermischt.</b> Im Archiv liegen Daten aus mehreren Spielst\u00e4nden. Sie werden seit v0.8.132 '
                  + 'ausgeblendet, sind aber noch da \u2013 \u201eAlles l\u00f6schen\u201c im Reset-Center r\u00e4umt sie weg.</div>';
            this.openModal('\u{1F9EA} Speicher-Diagnose', fazit
                + `<div style="margin-top:10px;font-size:11px;font-weight:bold;color:var(--muted)">ZEILEN JE SPIELSTAND</div>`
                + Object.keys(sids).map(k => zeile(k, sids[k])).join('')
                + `<div style="margin-top:10px;font-size:11px;color:var(--muted)">Bestand: ${ch.length} Meister \u00b7 ${tb.length} Saisontabellen \u00b7 ${rl.length} Relegationen</div>`
                + `<div style="margin-top:8px;font-size:12px">Widerspr\u00fcchliche Meister: <b style="color:${kon.length ? 'var(--c-fix-down)' : 'var(--c-win)'}">${kon.length}</b>`
                + (dop ? ` <span style="font-size:11px;color:var(--muted)">(dazu ${dop} exakte Doppel \u2013 meist ein zweimal gelaufener Seed)</span>` : '') + '</div>'
                + (kon.length ? `<div style="margin-top:6px;font-size:11px;color:var(--muted);line-height:1.5">${kon.slice(0, 10).join('<br>')}</div>` : '')
                + `<div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">Eigene Kennung: ${eigene || '\u2013'}`
                + `<br>Zwei verschiedene Meister f\u00fcr dieselbe Liga und Saison kann ein einzelner Durchlauf nicht erzeugen \u2013 das ist der harte Beweis.</div>`, false);
        }, () => {
            this.openModal('\u{1F9EA} Speicher-Diagnose', '<div style="padding:18px;font-size:12px;color:var(--muted)">IndexedDB ist nicht verf\u00fcgbar (Privatmodus oder blockiert).</div>', false);
        });
    },

    // ================= TAB-SPERRE =================
    // Zwei Tabs derselben Seite teilen sich localStorage UND IndexedDB. Zwei laufende Engines
    // schreiben denselben Schluesselraum - der zuletzt speichernde Tab gewinnt, und der Nutzer
    // verliert die Spieltage des anderen, ohne dass irgendwo ein Fehler erscheint.
    // Verfahren: ein Herzschlag in localStorage. Wer den Schluessel haelt und ihn regelmaessig
    // erneuert, darf schreiben. Ein Tab, der eine FRISCHE fremde Sperre vorfindet, geht in den
    // Nur-Lese-Modus (Engine.writeBlocked) und bietet die Uebernahme an. Ist die Sperre veraltet
    // (Tab abgestuerzt, Rechner zugeklappt), wird sie uebernommen - deshalb der Zeitstempel.
    _TAB_LOCK_KEY: 'ba_tab_lock',
    _LOCK_TTL: 15000,      // aelter = verwaist, darf uebernommen werden
    _LOCK_BEAT: 5000,      // Erneuerung, deutlich kuerzer als TTL
    _tabId: null,

    initTabLock: function() {
        if (this._tabId) return;
        this._tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const cur = this._readLock();
        if (cur && cur.tab !== this._tabId && Date.now() - cur.ts < this._LOCK_TTL) {
            this._setReadOnly(true);
        } else {
            this._claimLock();
        }
        // Der Herzschlag entscheidet in BEIDE Richtungen und prueft dabei jedes Mal, wem die Sperre
        // gehoert. Frueher holte ein freier Tab sie sich blind zurueck - dann haette ein verpasstes
        // storage-Ereignis (gedrosselter Hintergrund-Tab, Listener nie angelaufen) gereicht, damit
        // zwei Tabs gleichzeitig schreiben. So korrigiert sich der Zustand von selbst.
        setInterval(() => {
            const l = this._readLock();
            const fremd  = l && l.tab !== this._tabId;
            const frisch = l && Date.now() - l.ts < this._LOCK_TTL;
            if (fremd && frisch) { this._setReadOnly(true); return; }
            this._claimLock();
            this._setReadOnly(false);
        }, this._LOCK_BEAT);
        // Ein anderer Tab hat die Sperre an sich gezogen -> sofort still werden, nicht erst beim
        // naechsten Herzschlag. Das storage-Event feuert nur in den ANDEREN Tabs.
        window.addEventListener('storage', e => {
            if (e.key !== this._TAB_LOCK_KEY) return;
            const l = this._readLock();
            if (l && l.tab !== this._tabId && Date.now() - l.ts < this._LOCK_TTL) this._setReadOnly(true);
        });
        window.addEventListener('pagehide', () => {
            const l = this._readLock();
            if (l && l.tab === this._tabId) { try { localStorage.removeItem(this._TAB_LOCK_KEY); } catch(e) {} }
        });
    },

    _readLock: function() {
        try { return JSON.parse(localStorage.getItem(this._TAB_LOCK_KEY) || 'null'); } catch(e) { return null; }
    },

    _claimLock: function() {
        try { localStorage.setItem(this._TAB_LOCK_KEY, JSON.stringify({ tab: this._tabId, ts: Date.now() })); } catch(e) {}
    },

    _setReadOnly: function(on) {
        if (Engine.writeBlocked === on) return;
        Engine.writeBlocked = on;
        let bar = document.getElementById('tab-lock-bar');
        if (!on) { if (bar) bar.remove(); this.updateSaveStatus('✅ Schreibzugriff'); return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'tab-lock-bar';
            bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b3261e;color:#fff;'
                + 'font-size:12px;padding:6px 12px;display:flex;align-items:center;gap:10px;justify-content:center;';
            bar.innerHTML = '<span>🔒 Nur-Lese-Modus – dieses Spiel läuft bereits in einem anderen Tab.</span>'
                + '<button onclick="App.takeTabLock()" style="background:var(--panel-2);color:#b3261e;border:0;border-radius:4px;'
                + 'padding:3px 10px;font-size:12px;font-weight:bold;cursor:pointer;">Hier übernehmen</button>';
            document.body.appendChild(bar);
        }
        this.updateSaveStatus('🔒 Nur-Lese-Modus (anderer Tab)');
    },

    // Steuerung in DIESEN Tab holen. Danach neu laden: der andere Tab hat womoeglich gespeichert,
    // und unser Arbeitsspeicher waere sonst aelter als die Platte.
    takeTabLock: function() {
        if (!confirm('Steuerung in diesen Tab holen?\n\nDer andere Tab geht in den Nur-Lese-Modus. Diese Seite wird neu geladen.')) return;
        this._claimLock();
        location.reload();
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
        this.amateurTab = -1;
        if (!this.activeLeague || (this.activeLeague !== '__pokal__' && this.activeLeague !== '__amateur__' && !Engine.leagues[this.activeLeague])) {
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
        Engine.rollbackAmateurToMatchday(Engine.currentMatchday);
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
