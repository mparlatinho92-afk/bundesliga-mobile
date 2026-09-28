// Fenster-Verlauf: ‹ › in jeder Kopfzeile + Zurück-Geste (Android-PWA schloss sonst die ganze App).
// Ein Schritt = anderes FENSTER (Hauptansicht, Karte, Modal) – Reiter und Saison-Blättern innerhalb
// einer Ansicht zählen bewusst nicht (Nutzerentscheidung 28.09.2026). Saison-Blättern zählt dagegen
// (Nachtrag desselben Tages): << >>, Saisonauswahl, Pyramiden-Jahr. Die LAUFENDE Saison steht als null,
// nicht als Jahreszahl – sonst würde jeder Saisonwechsel beim Simulieren ein Schritt.
// Aufgezeichnet wird der BEOBACHTETE Zustand nach jeder Navigation, nicht der Klick: Modals werden an
// vielen Stellen direkt per style.display geschlossen, das sieht ein MutationObserver trotzdem.
Object.assign(App, {
    _navStack: [],        // Stationen { main, saison, layer }  saison: Jahr "1985/86" | null = laufend  layer: null | 'map' | { fn, args }
    _navIdx: -1,
    _navReplay: false,
    _navAktiv: false,     // erst ab der ersten Nutzereingabe: davor ersetzt jeder Stand die Ausgangsstation
    _navModal: null,      // Aufruf, der das offene Modal erzeugt hat (null = nicht wiederherstellbar)

    // Aktuellen Fensterzustand ablesen
    _navIst: function() {
        const sichtbar = id => { const e = document.getElementById(id); return !!e && e.style.display !== 'none' && e.style.display !== ''; };
        let layer = null;
        if (sichtbar('map-overlay')) layer = 'map';
        else if (sichtbar('modal') && this._navModal) layer = this._navModal;
        return { main: this.activeLeague, saison: this._navSaison(), layer };
    },

    // Angezeigte Saison als Jahr (null = laufende). Jahr statt history-Index: der Index verschiebt sich je Saisonwechsel
    _navSaison: function() {
        if (this.activeLeague === '__pyramide__') {
            const live = this._pyrLiveJahr ? this._pyrLiveJahr() : null;
            return this.pyrJahr && this.pyrJahr !== live ? this.pyrJahr : null;
        }
        if (this.viewArchivedSeason) return this.viewArchivedSeason.y;
        if (this.viewHistoryOffset !== null && this.viewHistoryOffset !== undefined) return (Engine.history[this.viewHistoryOffset] || {}).year || null;
        return null;
    },

    // Saison einer Station für Liga/Pokal einstellen (wie _gotoSeason, aber über das Jahr aufgelöst)
    _navSaisonSetzen: function(y, lid) {
        this.matchdayViewIdx = null; this.zonesCache = null; this.tsView = null;
        const i = y ? Engine.history.findIndex(h => h.year === y) : -1;
        const live = Engine.getFormattedSeason ? Engine.getFormattedSeason() : null;
        if (!y || y === live) { this.viewHistoryOffset = null; this.viewArchivedSeason = null; }
        else if (i >= 0) { this.viewHistoryOffset = i; this.viewArchivedSeason = null; }
        else { this.viewHistoryOffset = null; this.viewArchivedSeason = { y, lid }; }
    },

    _navGleich: function(a, b) {
        return !!a && !!b && a.main === b.main && (a.saison || null) === (b.saison || null) && JSON.stringify(a.layer) === JSON.stringify(b.layer);
    },

    // Nach jeder Navigation (gebündelt) den Stand mit dem Verlauf abgleichen
    _navMerken: function() {
        if (this._navTimer) return;
        this._navTimer = setTimeout(() => {
            this._navTimer = null;
            if (this._navReplay || !this.activeLeague) return;
            const s = this._navIst(), st = this._navStack;
            if (!this._navAktiv || !st.length) { this._navStack = [s]; this._navIdx = 0; this._navKnoepfe(); return; }
            if (this._navGleich(s, st[this._navIdx])) return;
            // Schließen = zurück zur Station davor: Vorwärts bleibt erhalten, statt einen Doppelgänger anzuhängen
            if (this._navIdx > 0 && this._navGleich(s, st[this._navIdx - 1])) { this._navIdx--; this._navKnoepfe(); return; }
            st.length = this._navIdx + 1;          // neuer Weg nach einem Zurück verwirft das Vorwärts
            st.push(s);
            if (st.length > 100) st.shift();
            this._navIdx = st.length - 1;
            this._navKnoepfe();
        }, 0);
    },

    navBack: function() { if (this._navIdx > 0) this._navGehe(this._navIdx - 1); },
    navForward: function() { if (this._navIdx < this._navStack.length - 1) this._navGehe(this._navIdx + 1); },

    _navGehe: function(i) {
        const s = this._navStack[i];
        if (!s) return;
        this._navReplay = true;
        try {
            if (s.main !== this.activeLeague || (s.saison || null) !== this._navSaison()) {
                const m = s.main;
                if (m === '__pyramide__') this.showPyramide(s.saison || (this._pyrLiveJahr ? this._pyrLiveJahr() : null));
                else if (m === '__amateur__') this.showAmateurpokal();
                else if (m === '__aufstieg__') this.showAufstieg();
                else {
                    this._navSaisonSetzen(s.saison, m);
                    if (m === '__pokal__') this.showPokal(); else this.loadLeague(m);
                    if (this.updateStatus) this.updateStatus();
                }
            }
            const map = document.getElementById('map-overlay');
            const mapOffen = map && map.style.display === 'flex';
            if (s.layer === 'map') {
                document.getElementById('modal').style.display = 'none';
                if (!mapOffen) this.showMap();
            } else {
                if (mapOffen) this.closeMap();
                if (s.layer && typeof this[s.layer.fn] === 'function') this[s.layer.fn].apply(this, s.layer.args);
                else document.getElementById('modal').style.display = 'none';
            }
        } catch (e) { console.warn('Verlauf: Station nicht wiederherstellbar', s, e); }
        this._navIdx = i;
        this._navKnoepfe();
        // Die Beobachter-Rückrufe der Wiederherstellung laufen noch an – erst danach wieder aufzeichnen
        setTimeout(() => { this._navReplay = false; }, 0);
    },

    _navKnoepfe: function() {
        const zur = this._navIdx <= 0, vor = this._navIdx >= this._navStack.length - 1;
        document.querySelectorAll('.nav-vz-back').forEach(b => { b.disabled = zur; });
        document.querySelectorAll('.nav-vz-fwd').forEach(b => { b.disabled = vor; });
    },

    // Zurück-Geste / Browser-Zurück: ein Pufferentrag über der Ausgangsseite fängt sie ab.
    // Am Ausgangszustand passiert nichts (Nutzer: nicht schließen, einfach stehen bleiben).
    _navGeste: function() {
        if (window.top !== window) return;          // Stil-Vorschau im Rahmen: nicht eingreifen
        const scharf = () => { try { history.pushState({ baNav: 1 }, ''); } catch (e) {} };
        try { history.replaceState({ baNav: 0 }, ''); } catch (e) { return; }
        scharf();
        window.addEventListener('popstate', ev => {
            if (ev.state && ev.state.baNav === 1) return;   // Vorwärts auf den eigenen Puffer
            scharf();
            this.navBack();
        });
    },
});

(function() {
    // Hauptansichten
    ['loadLeague', 'showPokal', 'showAmateurpokal', 'showAufstieg', 'showPyramide', 'showMap', 'closeMap', '_gotoSeason', '_pyrGeheZu'].forEach(fn => {
        const orig = App[fn];
        if (typeof orig !== 'function') return;
        App[fn] = function() { const r = orig.apply(this, arguments); App._navMerken(); return r; };
    });
    // Modal-Fenster, die sich per Aufruf wiederherstellen lassen
    const FENSTER = ['showSteckbrief', 'showTeamRecords', 'showRegionClubs', 'showChangelog', 'showRules',
        'showLeagueSizes', 'showGeoCheck', 'showTagCheck', 'showDebugLog', 'showSpeicherDiagnose'];
    // Dialoge und Berichte, die man nicht erneut aufrufen will (Einstellungen, Saisonende, Reset)
    const BLIND = ['showSeasonEnd', 'openResetCenter', 'openActionSettings'];
    FENSTER.concat(BLIND).forEach(fn => {
        const orig = App[fn];
        if (typeof orig !== 'function') return;
        App[fn] = function() {
            App._navModal = BLIND.includes(fn) ? null : { fn, args: Array.from(arguments).filter(a => typeof a !== 'object' || a === null) };
            const r = orig.apply(this, arguments);
            App._navMerken();
            return r;
        };
    });
    // Import / Laden: alte Stationen könnten auf Ligen und Vereine zeigen, die es nicht mehr gibt
    const san = App._sanitizeAppState;
    if (typeof san === 'function') App._sanitizeAppState = function() {
        const r = san.apply(this, arguments);
        App._navStack = []; App._navIdx = -1; App._navMerken();
        return r;
    };

    document.addEventListener('DOMContentLoaded', () => {
        const beob = new MutationObserver(() => App._navMerken());
        ['modal', 'map-overlay'].forEach(id => {
            const e = document.getElementById(id);
            if (e) beob.observe(e, { attributes: true, attributeFilter: ['style'] });
        });
        // Ab der ersten echten Eingabe zählt jeder Wechsel als Schritt; der Puffereintrag entsteht
        // ebenfalls erst dann, weil Chrome Einträge ohne Nutzeraktivierung bei „Zurück“ überspringt.
        const start = () => {
            ['pointerdown', 'keydown'].forEach(t => document.removeEventListener(t, start, true));
            // Ausgangsstation SOFORT festhalten: der Klick, der gerade beginnt, ist schon der erste Schritt
            if (App.activeLeague) { App._navStack = [App._navIst()]; App._navIdx = 0; }
            App._navAktiv = true;
            App._navGeste();
            App._navKnoepfe();
        };
        ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, start, true));
        App._navKnoepfe();
    });
})();
