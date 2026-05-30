/**
 * BUNDESLIGA ARCHITECT - ENGINE V66 (THE FINAL CUT)
 * - FORMAT: Vollständig expandierter Code (keine versteckten Einzeiler).
 * - FIX: Explizite Routing-Regeln für Salmrohr, Engers & Co (Vorrang vor Regionen).
 * - LOGIK: Two-Pass Kaskade (Vorausberechnung + Ausführung) für exakte 18/20er Ligen.
 * - SAFETY: Anti-Teleportation (Nur 1 Level Sprung erlaubt).
 * - SORTING: Tie-Breaker nach Stärke verhindert Zufalls-Tabellen bei Saisonstart.
 */

const Engine = {
    startYear: 2025,
    currentSeasonOffset: 0, // 0 = 2025/26
    currentMatchday: 0,
    totalMatchdays: 34,
    
    leagues: {},
    teams: {},
    history: [], 
    
    migrations: [],
    relegationResults: [],
    leagueStats: {},
    matchdayResults: [],
    seasonResults: [],
    schedule: {}, // Spielplan (in-memory, nicht gespeichert)

    HARD_LINKS: {
        "3": ["4-1", "4-2", "4-3", "4-4", "4-5"],
        "4-1": ["5-1", "5-2", "5-3"],
        "4-2": ["5-4", "5-5", "5-6", "5-7"],
        "4-3": ["5-8", "5-9"],
        "4-4": ["5-10", "5-11", "5-12"],
        "4-5": ["5-13", "5-14"],
        "5-1": ["6-1", "6-2", "6-3"],
        "5-2": ["6-4", "6-5", "6-6"],
        "5-3": ["6-7", "6-8", "6-9"],
        "5-4": ["6-10", "6-11"],
        "5-5": ["6-12", "6-13"],
        "5-6": ["6-14", "6-15", "6-16", "6-17"],
        "5-7": ["6-18"],
        "5-8": ["6-19", "6-20", "6-21"],
        "5-9": ["6-22", "6-23", "6-24"],
        "5-10": ["6-25", "6-26"],
        "5-11": ["6-27", "6-28"],
        "5-12": ["6-29", "6-30"],
        "5-13": ["6-31", "6-32"],
        "5-14": ["6-33", "6-34", "6-35"],
        "6-1": ["7-1", "7-2"],
        "6-2": ["7-3", "7-4", "7-5"],
        "6-3": ["7-6", "7-7"],
        "6-21": ["7-8", "7-9"],
        "7-1": ["8-1", "8-2"],
        "7-2": ["8-3", "8-4"]
    },

    // Ligen die gemeinsam geo-balanciert werden
    // axis: "geo" = Zentroid-basierte 2D-Zuweisung via LEAGUE_CENTERS
    // axis: "lat" = einfache Nord→Süd-Sortierung (gleichmäßige Aufteilung)
    SIBLING_GROUPS: [
        { ids: ["5-8", "5-9"], axis: "geo" },
        { ids: ["5-13", "5-14"], axis: "lat" },
        { ids: ["6-10", "6-11"], axis: "geo" },
        { ids: ["6-12", "6-13"], axis: "geo" },
        { ids: ["6-25", "6-26"], axis: "geo" },
        { ids: ["6-27", "6-28"], axis: "geo" },
        { ids: ["6-29", "6-30"], axis: "geo" },
        { ids: ["6-31", "6-32"], axis: "geo" },
        { ids: ["6-33", "6-34", "6-35"], axis: "geo" },
        { ids: ["7-3", "7-4", "7-5"], axis: "geo" },
        { ids: ["7-6", "7-7"], axis: "geo" },
        { ids: ["7-8", "7-9"], axis: "lat" }
    ],

    // Mapping: Regions-String (aus team.regions) → Liga-ID
    // Iteration von hinten (spezifischster Eintrag zuerst)
    REGION_TO_LEAGUE_ID: {
        "Rheinhessen": "8-1", "Vorderpfalz": "8-2", "Nahe": "8-3", "Westpfalz": "8-4",
        "Südwest Ost": "7-1", "Südwest West": "7-2",
        "Rheinland West": "7-3", "Rheinland Mitte": "7-4", "Rheinland Ost": "7-5",
        "Saarland Nord-Ost": "7-6", "Saarland Süd-West": "7-7",
        "Südwestdeutscher Fußballverband": "6-1", "Fußballverband Rheinland": "6-2", "Saarland": "6-3",
        "Baden": "6-4", "Südbaden": "6-5", "Württemberg": "6-6",
        "Hessen Nord": "6-7", "Hessen Mitte": "6-8", "Hessen Süd": "6-9",
        "Schleswig": "6-10", "Holstein": "6-11", "Hammonia": "6-12", "Hansa": "6-13",
        "Weser-Ems": "6-14", "Lüneburg": "6-15", "Hannover": "6-16", "Braunschweig": "6-17",
        "Bremen": "6-18",
        "Mecklenburg-Vorpommern": "6-19", "Brandenburg": "6-20", "Berlin": "6-21",
        "Sachsen-Anhalt": "6-22", "Thüringen": "6-23", "Sachsen": "6-24",
        "Westfalen 1 (Münsterland/OWL)": "6-25", "Westfalen 2 (Südwestfalen)": "6-26",
        "Niederrhein 1 (Süd)": "6-27", "Niederrhein 2 (Nord)": "6-28",
        "Mittelrhein 1 (Ost)": "6-29", "Mittelrhein 2 (West)": "6-30",
        "Bayern Nordwest": "6-31", "Bayern Nordost": "6-32", "Bayern Mitte": "6-33",
        "Bayern Südwest": "6-34", "Bayern Südost": "6-35"
    },

    // Geografische Schwerpunkte der Sibling-Ligen für axis:'geo'-Balancierung
    LEAGUE_CENTERS: {
        "5-8":  { lat: 52.8, lon: 13.1 },  "5-9":  { lat: 51.0, lon: 12.0 },
        "5-13": { lat: 49.5, lon: 11.0 }, "5-14": { lat: 48.3, lon: 11.5 },
        "6-10": { lat: 54.5, lon: 9.2 },  "6-11": { lat: 54.1, lon: 10.3 },
        "6-12": { lat: 53.65, lon: 9.9 }, "6-13": { lat: 53.5, lon: 10.15 },
        "6-25": { lat: 51.7, lon: 8.1 },  "6-26": { lat: 51.1, lon: 7.9 },
        "6-27": { lat: 51.2, lon: 6.7 },  "6-28": { lat: 51.6, lon: 6.6 },
        "6-29": { lat: 50.7, lon: 7.1 },  "6-30": { lat: 50.7, lon: 6.5 },
        "6-31": { lat: 49.5, lon: 10.6 }, "6-32": { lat: 49.7, lon: 12.8 },
        "6-33": { lat: 48.7, lon: 11.4 }, "6-34": { lat: 47.9, lon: 10.8 }, "6-35": { lat: 47.9, lon: 12.3 },
        "7-3":  { lat: 50.1, lon: 6.6 },  "7-4":  { lat: 50.3, lon: 7.0 },  "7-5":  { lat: 50.6, lon: 7.5 },
        "7-6":  { lat: 49.5, lon: 7.0 },  "7-7":  { lat: 49.2, lon: 6.8 },
        "7-8":  { lat: 52.52, lon: 13.4 },"7-9":  { lat: 52.52, lon: 13.4 }
    },

    DOWN_MAP: {}, 
    UP_MAP: {},

    // --- ROUTER V66 (Explizit + Verband) ---
    ROUTING_RULES: [
        // 1. HARDCODED FIXES (Die "Salmrohr-Klausel")
        // Diese Teams werden namentlich abgefangen, egal was in den Regionen steht.
        { 
            keys: ["Salmrohr", "Engers", "Karbach", "Koblenz", "Trier", "Mülheim-Kärlich", "Eisbachtal", "Ahrweiler"], 
            target: "Rheinlandliga" 
        },
        { 
            keys: ["Elversberg", "Saarbrücken", "Homburg", "Neunkirchen", "Völklingen", "Wiesbach", "Auersmacher"], 
            target: "Saarlandliga" 
        },
        
        // 2. VERBANDS-ZUWEISUNG (Daten-Basis)
        { keys: ["Fußballverband Rheinland"], target: "Rheinlandliga" },
        { keys: ["Südwestdeutscher Fußballverband"], target: "Verbandsliga Südwest" },
        { keys: ["Saarländischer Fußballverband"], target: "Saarlandliga" },

        // 3. REGIONALE FALLBACKS
        { keys: ["Saarland", "Saar"], target: "Saarlandliga" },
        { keys: ["Rheinland"], not: ["Pfalz", "Südwest", "Hessen"], target: "Rheinlandliga" },
        { keys: ["Südwest", "Pfalz", "Rheinhessen", "Nahe"], target: "Verbandsliga Südwest" },
        
        // 4. HAMBURG EXKLAVE
        { keys: ["Hamburg", "Altona", "Eimsbüttel"], target: "Oberliga Hamburg" }
    ],

    REGION_MAPPING: {
        "Regionalliga West": ["Westfalen", "Niederrhein", "Mittelrhein", "Nordrhein-Westfalen"],
        "Regionalliga Nordost": ["Berlin", "Brandenburg", "Mecklenburg-Vorpommern", "Sachsen", "Sachsen-Anhalt", "Thüringen"],
        "NOFV-Oberliga Nord": ["Berlin", "Brandenburg", "Mecklenburg-Vorpommern"],
        "NOFV-Oberliga Süd": ["Sachsen", "Sachsen-Anhalt", "Thüringen"],
        "Oberliga Niedersachsen": ["Niedersachsen"]
    },

    GEO_BLOCKED: ["Hamburg", "Saarland", "Berlin", "Bremen", "Hessen", "Südwest", "Baden", "Südbaden", "Württemberg", "Schleswig", "Niedersachsen", "Weser-Ems", "Lüneburg", "Hannover", "Braunschweig"],

    init: function() {
        if (typeof GAME_DATA === 'undefined') { alert("Daten fehlen!"); return false; }
        if (this.loadGame()) {
            console.log("Spielstand geladen.");
            const needsRebuild = Object.values(this.teams).some(t => !t.homeStats);
            if (needsRebuild && this.seasonResults.length > 0) {
                // homeStats/awayStats aus seasonResults rekonstruieren (alter Save ohne gespeicherte Stats)
                const apply = (s, gf, ga) => {
                    s.p++; s.gf += gf; s.ga += ga;
                    if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) s.l++; else { s.d++; s.pts += 1; }
                };
                Object.values(this.teams).forEach(t => {
                    if(GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb;
                    t.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                    t.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                });
                this.seasonResults.forEach(r => {
                    const h = this.teams[r.hId], a = this.teams[r.aId];
                    if (!h || !a) return;
                    apply(h.homeStats, r.s1, r.s2);
                    apply(a.awayStats, r.s2, r.s1);
                });
            } else {
                Object.values(this.teams).forEach(t => {
                    if(GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb;
                    if(!t.homeStats) t.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                    if(!t.awayStats) t.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                });
            }
            this.generateSchedule(); // Spielplan für verbleibende Spieltage neu erstellen
        } 
        else {
            try {
                this.leagues = JSON.parse(JSON.stringify(GAME_DATA.leagues));
                const rawTeams = {};
                Object.entries(GAME_DATA.teams).forEach(([id, t]) => {
                    rawTeams[id] = { id: t.id, name: t.name, leagueId: t.leagueId, regions: t.regions, lat: t.lat, lon: t.lon, isReserve: t.isReserve, parentId: t.parentId };
                });
                this.teams = rawTeams;
                const activeTeams = {};
                Object.values(this.teams).forEach(t => { 
                    if (t.leagueId) {
                        if(GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb;
                        activeTeams[t.id] = t; 
                    }
                });
                this.teams = activeTeams;
                this.calculateStrengths();
                this.generateDynamicTree(); 
                this.resetSeason();
                this.sortTables(); // Wichtig: Initiale Sortierung nach Stärke
            } catch (e) { console.error('Engine.init:', e); const el = document.getElementById('league-title'); if (el) el.innerText = 'Init-Fehler: ' + e.message; return false; }
        }
        this.generateDynamicTree(); 
        return true;
    },

    generateDynamicTree: function() {
        this.DOWN_MAP = JSON.parse(JSON.stringify(this.HARD_LINKS));
        this.UP_MAP = {};
        Object.keys(this.DOWN_MAP).forEach(p => this.DOWN_MAP[p].forEach(c => this.UP_MAP[c] = p));
    },

    getKeywords: function(name) {
        return name.replace(/(Liga|Verband|Landes|Bezirks|Kreis|Klasse|Staffel|Gruppe|Region|Ober|Nord|Süd|West|Ost|Mitte|1|2|3|\d+)/gi, "").split(/[\s\/-]+/).filter(w => w.length > 3);
    },

    resetSeason: function() {
        this.currentMatchday = 0;
        this.relegationResults = [];
        this.seasonResults = [];
        Object.values(this.teams).forEach(t => {
            t.stats     = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, awayGf:0 };
            t.homeStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
            t.awayStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
        });
        this.generateSchedule();
        this.sortTables();
        this.saveGame();
    },

    generateSchedule: function() {
        this.schedule = {};
        let maxMd = 0;
        Object.keys(this.leagues).forEach(lid => {
            const teams = Object.values(this.teams).filter(t => t.leagueId === lid);
            if (teams.length < 2) return;
            // Zufälliges Bracket für Saisonvarietät
            for (let i = teams.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [teams[i], teams[j]] = [teams[j], teams[i]];
            }
            const arr = [...teams];
            if (arr.length % 2 !== 0) arr.push(null); // Freilos bei ungerader Anzahl
            const n = arr.length;
            // Berger-Paarungen: wer gegen wen (ohne H/A), inkl. Spielfrei (null)
            const halfPairs = [];
            for (let r = 0; r < n - 1; r++) {
                const roundPairs = [];
                const rot = [arr[0]];
                for (let k = 1; k < n; k++) rot.push(arr[1 + ((r + k - 1) % (n - 1))]);
                for (let k = 0; k < n / 2; k++) {
                    const t1 = rot[k], t2 = rot[n - 1 - k];
                    if (t1 && t2) roundPairs.push([t1, t2, k]);
                }
                halfPairs.push(roundPairs);
            }
            // Greedy H/A-Zuweisung: wer zuletzt auswärts war, spielt jetzt heim
            const lastWasHome = {}, homeGames = {};
            const firstHalf = halfPairs.map((roundPairs, r) => roundPairs.map(([t1, t2, k]) => {
                const p1 = lastWasHome[t1.id] === false ? 2 : lastWasHome[t1.id] === undefined ? 1 : 0;
                const p2 = lastWasHome[t2.id] === false ? 2 : lastWasHome[t2.id] === undefined ? 1 : 0;
                let h, a;
                if (p1 !== p2) { [h, a] = p1 > p2 ? [t1, t2] : [t2, t1]; }
                else if (p1 === 1) { [h, a] = k % 2 === 0 ? [t1, t2] : [t2, t1]; }
                else {
                    const hc1 = homeGames[t1.id] || 0, hc2 = homeGames[t2.id] || 0;
                    if (hc1 !== hc2) [h, a] = hc1 < hc2 ? [t1, t2] : [t2, t1];
                    else [h, a] = k % 2 === 0 ? [t1, t2] : [t2, t1];
                }
                lastWasHome[h.id] = true; lastWasHome[a.id] = false;
                homeGames[h.id] = (homeGames[h.id] || 0) + 1;
                return { hId: h.id, aId: a.id, lid };
            }));
            // Rückrunde: exakt gleiche Paarungen, Heimrecht getauscht
            const secondHalf = firstHalf.map(r => r.map(m => ({ hId: m.aId, aId: m.hId, lid })));
            const allRounds = [...firstHalf, ...secondHalf];
            this.leagues[lid].seasonLength = allRounds.length; // Liga-spezifische Spieltagzahl
            // Kein Modulo: jede Liga bekommt exakt ihre (n-1)*2 Runden, kein Looping
            for (let md = 1; md <= allRounds.length; md++) {
                if (!this.schedule[md]) this.schedule[md] = [];
                this.schedule[md].push(...allRounds[md - 1]);
            }
            if (allRounds.length > maxMd) maxMd = allRounds.length;
        });
        // totalMatchdays = längste Liga (z.B. 20 Teams → 38, 18 Teams → 34)
        if (maxMd > 0) this.totalMatchdays = maxMd;
    },

    calculateStrengths: function() {
        Object.values(this.teams).forEach(t => {
            if (!t.leagueId || !this.leagues[t.leagueId]) { t.strength = 40; return; }
            const lvl = this.leagues[t.leagueId].level;
            let base = 100 - (lvl * 10);
            if (!t.strength) t.strength = base;
            t.strength = (t.strength * 0.7) + (base * 0.3);
        });
    },

    getFormattedSeason: function(offset) {
        if(offset === undefined) offset = this.currentSeasonOffset;
        const y = this.startYear + offset;
        return `${y}/${(y+1).toString().substr(2)}`;
    },

    playNextMatchday: function() {
        if (this.currentMatchday >= this.totalMatchdays) return false;
        this.currentMatchday++;
        this.matchdayResults = [];
        if (!this.schedule[this.currentMatchday]) this.generateSchedule();
        const applyTo = (s, gf, ga) => {
            s.p++; s.gf += gf; s.ga += ga;
            if (gf > ga) { s.w++; s.pts += 3; }
            else if (gf < ga) { s.l++; }
            else { s.d++; s.pts += 1; }
        };
        (this.schedule[this.currentMatchday] || []).forEach(m => {
            const h = this.teams[m.hId], a = this.teams[m.aId];
            if (!h || !a) return;
            const res = this.simulateMatch(h, a);
            applyTo(h.stats, res.score1, res.score2);
            applyTo(a.stats, res.score2, res.score1);
            if (!h.homeStats) h.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
            if (!a.awayStats) a.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
            applyTo(h.homeStats, res.score1, res.score2);
            applyTo(a.awayStats, res.score2, res.score1);
            a.stats.awayGf = (a.stats.awayGf || 0) + res.score2;
            this.matchdayResults.push({ leagueId: m.lid, home: h.name, away: a.name, score1: res.score1, score2: res.score2 });
            this.seasonResults.push({ lid: m.lid, hId: m.hId, aId: m.aId, s1: res.score1, s2: res.score2 });
        });
        this.sortTables();
        this.saveGame();
        return true;
    },

    simulateFullSeason: function() {
        while(this.currentMatchday < this.totalMatchdays) { this.playNextMatchday(); }
    },

    sortTables: function() {
        const buckets = {};
        Object.values(this.teams).forEach(t => {
            if(!t.leagueId) return;
            if(!buckets[t.leagueId]) buckets[t.leagueId] = [];
            buckets[t.leagueId].push(t);
        });
        Object.keys(buckets).forEach(lid => {
            const arr = buckets[lid];
            arr.sort((a,b) => {
                if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
                const da = a.stats.gf - a.stats.ga, db = b.stats.gf - b.stats.ga;
                if (db !== da) return db - da;
                if (b.stats.gf !== a.stats.gf) return b.stats.gf - a.stats.gf;
                return 0;
            });
            // H2H-Tiebreaker innerhalb punktgleicher Gruppen (DFL Kriterien 3-5)
            const basicKey = t => `${t.stats.pts}_${t.stats.gf - t.stats.ga}_${t.stats.gf}`;
            let i = 0;
            while (i < arr.length) {
                let j = i + 1;
                while (j < arr.length && basicKey(arr[j]) === basicKey(arr[i])) j++;
                if (j - i > 1) {
                    const sorted = this.h2hTiebreak(arr.slice(i, j), lid);
                    arr.splice(i, j - i, ...sorted);
                }
                i = j;
            }
            arr.forEach((t, i) => t.rank = i + 1);
        });
    },

    h2hTiebreak: function(group, lid) {
        const ids = new Set(group.map(t => t.id));
        const h2h = {};
        group.forEach(t => { h2h[t.id] = { pts: 0, gd: 0, gf: 0, away: 0 }; });
        (this.seasonResults || []).forEach(r => {
            if (r.lid !== lid || !ids.has(r.hId) || !ids.has(r.aId)) return;
            h2h[r.hId].gf += r.s1; h2h[r.hId].gd += r.s1 - r.s2;
            h2h[r.aId].gf += r.s2; h2h[r.aId].gd += r.s2 - r.s1;
            h2h[r.aId].away += r.s2;
            if (r.s1 > r.s2) h2h[r.hId].pts += 3;
            else if (r.s1 < r.s2) h2h[r.aId].pts += 3;
            else { h2h[r.hId].pts++; h2h[r.aId].pts++; }
        });
        return [...group].sort((a, b) => {
            const ha = h2h[a.id], hb = h2h[b.id];
            if (hb.pts  !== ha.pts)  return hb.pts  - ha.pts;   // 3. H2H Punkte
            if (hb.gd   !== ha.gd)   return hb.gd   - ha.gd;    // 3. H2H Tordiff
            if (hb.gf   !== ha.gf)   return hb.gf   - ha.gf;    // 3. H2H Tore
            if (hb.away !== ha.away) return hb.away - ha.away;   // 4. H2H Auswärtstore
            const awa = a.stats.awayGf || 0, awb = b.stats.awayGf || 0;
            if (awb !== awa) return awb - awa;                    // 5. Alle Auswärtstore
            return (b.strength || 0) - (a.strength || 0);        // → geteilter Platz
        });
    },

    simulateMatch: function(t1, t2) {
        const s1 = t1.strength || 50;
        const s2 = t2.strength || 50;
        const p1 = s1 + Math.random() * 40 - 20 + 3; // leichter Heimvorteil
        const p2 = s2 + Math.random() * 40 - 20;
        const margin = p1 - p2;
        if (Math.abs(margin) < 6) {
            const g = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2;
            return { score1: g, score2: g };
        }
        const homeWins = margin > 0;
        const abs = Math.abs(margin);
        // Torzahl des Siegers skaliert mit dem Leistungsvorsprung
        const maxWg = abs > 28 ? 4 : abs > 16 ? 3 : 2;
        const wg = Math.floor(Math.random() * maxWg) + 1;
        const lg = Math.floor(Math.random() * wg); // 0 bis wg-1
        return homeWins ? { score1: wg, score2: lg } : { score1: lg, score2: wg };
    },

    getPromotionInfo: function() {
        const year = this.currentSeasonOffset % 3; 
        let direct = ["Regionalliga West", "Regionalliga Südwest"];
        let playoff = [];
        if(year === 0) { direct.push("Regionalliga Nord"); playoff = ["Regionalliga Nordost", "Regionalliga Bayern"]; }
        else if(year === 1) { direct.push("Regionalliga Nordost"); playoff = ["Regionalliga Nord", "Regionalliga Bayern"]; }
        else { direct.push("Regionalliga Bayern"); playoff = ["Regionalliga Nord", "Regionalliga Nordost"]; }
        return { direct: direct, playoff: playoff, year: year };
    },

    // --- TWO-PASS KASKADE (Vorausberechnung + Ausführung) ---
    processSeasonTransition: function() {
        // 1. History Snapshot
        this.history.push({ year: this.getFormattedSeason(), teams: JSON.parse(JSON.stringify(this.teams)) });
        
        this.migrations = [];
        this.relegationResults = [];
        this.leagueStats = {};
        
        Object.keys(this.leagues).forEach(lid => {
            this.leagueStats[lid] = { 
                name: this.leagues[lid].name, target: this.leagues[lid].target, 
                old: Object.values(this.teams).filter(t => t.leagueId === lid).length,
                pending_incoming: 0, moveIn: 0, moveOut: 0
            };
        });

        // 2. Relegation & Playoffs simulieren
        const promoInfo = this.getPromotionInfo();
        let topReleResult = 'stay';
        let thirdReleResult = 'stay';
        let regioWinnerId = null;

        // A) 1. BL vs 2. BL
        const l1 = Object.values(this.leagues).find(l => l.level === 1);
        const l2 = Object.values(this.leagues).find(l => l.level === 2);
        if(l1 && l2) {
            const t1 = this.getTeamByRank(l1.id, 16);
            const t2 = this.getTeamByRank(l2.id, 3);
            if(t1 && t2) {
                const res = this.simulateMatch(t1, t2);
                const winner = res.score1 >= res.score2 ? t1 : t2;
                this.relegationResults.push({ match: `1.BL/2.BL: ${t1.name} vs ${t2.name}`, result: `${res.score1}:${res.score2}`, winner: winner.name, color: "gold" });
                topReleResult = (winner === t2) ? 'swap' : 'stay';
            }
        }

        // B) 2. BL vs 3. Liga
        const l3 = Object.values(this.leagues).find(l => l.level === 3);
        if(l2 && l3) {
            const t1 = this.getTeamByRank(l2.id, 16);
            const t2 = this.getTeamByRank(l3.id, 3);
            if(t1 && t2) {
                const res = this.simulateMatch(t1, t2);
                const winner = res.score1 >= res.score2 ? t1 : t2;
                this.relegationResults.push({ match: `2.BL/3.L: ${t1.name} vs ${t2.name}`, result: `${res.score1}:${res.score2}`, winner: winner.name, color: "silver" });
                thirdReleResult = (winner === t2) ? 'swap' : 'stay';
            }
        }

        // C) Regionalliga Playoffs
        let playoffTeams = [];
        Object.values(this.leagues).forEach(l => {
            if (promoInfo.playoff.includes(l.name)) {
                const t = this.getTeamByRank(l.id, 1);
                if(t) playoffTeams.push({ team: t, leagueId: l.id });
            }
        });
        if (playoffTeams.length === 2) {
            const t1 = playoffTeams[0];
            const t2 = playoffTeams[1];
            const res = this.simulateMatch(t1.team, t2.team);
            this.relegationResults.push({ match: `Aufstieg 3.L: ${t1.team.name} vs ${t2.team.name}`, result: `${res.score1}:${res.score2}`, winner: res.score1 >= res.score2 ? t1.team.name : t2.team.name, color: "#cd7f32" });
            regioWinnerId = (res.score1 >= res.score2) ? t1.leagueId : t2.leagueId;
        }
        // Direktaufsteiger der Regionalliga ins Relegations-Log
        Object.values(this.leagues).forEach(l => {
            if (promoInfo.direct.includes(l.name)) {
                const t = this.getTeamByRank(l.id, 1);
                if (t) this.relegationResults.push({ match: l.name, result: '▲ Direktaufstieg', winner: t.name, color: '#4CAF50' });
            }
        });

        const sortedLeagues = Object.values(this.leagues).sort((a,b) => a.level - b.level);
        let plannedMoves = []; 

        // 3. PHASE 1: PRE-FLIGHT (Alle Transfers planen & zählen)
        for (const l of sortedLeagues) {
            const teams = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b)=>a.rank-b.rank);
            let upSlots = 0, baseDownSlots = 0;

            if (l.level === 1) { 
                baseDownSlots = 2; 
                if(topReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:1});
            }
            else if (l.level === 2) { 
                upSlots = 2; baseDownSlots = 2; 
                if(topReleResult === 'swap') plannedMoves.push({t:teams[2], type:'up_rele', oldId:l.id, fromLvl:2});
                if(thirdReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:2});
            }
            else if (l.level === 3) {
                baseDownSlots = 4; upSlots = 2; 
                if(thirdReleResult === 'swap') plannedMoves.push({t:teams[2], type:'up_rele', oldId:l.id, fromLvl:3});
            }
            else if (l.level === 4) {
                const isDirect = promoInfo.direct.includes(l.name);
                const isWinner = (l.id === regioWinnerId);
                if (isDirect || isWinner) upSlots = 1; else upSlots = 0;
                baseDownSlots = Math.min(3, this.DOWN_MAP[l.id].length);
            }
            else { upSlots = 1; baseDownSlots = this.DOWN_MAP[l.id] ? Math.min(3, this.DOWN_MAP[l.id].length) : 0; }

            // Fixe Transfers
            for(let i=0; i<upSlots; i++) if(teams[i]) plannedMoves.push({t:teams[i], type:'up', oldId:l.id, fromLvl:l.level});
            for(let i=0; i<baseDownSlots; i++) {
                const team = teams[teams.length - 1 - i];
                if(team) plannedMoves.push({t:team, type:'down', oldId:l.id, fromLvl:l.level});
            }
        }

        // PRE-FLIGHT AUSWERTUNG
        // Alle geplanten Moves (auf & ab) in pending_incoming des Ziels eintragen,
        // damit PHASE 2 und SCHRUMPF-SCHUTZ korrekte Prognosen rechnen können.
        plannedMoves.forEach(m => {
            const targetLvl = m.type.includes('up') ? m.fromLvl - 1 : m.fromLvl + 1;
            const target = this.findTarget(m.t, targetLvl, m.oldId);
            if(target && this.leagueStats[target.id]) {
                this.leagueStats[target.id].pending_incoming++;
            }
        });

        // 4. PHASE 2: VARIABLE KASKADE BERECHNEN & AUSFÜHREN
        for (const l of sortedLeagues) {
            const teams = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b)=>a.rank-b.rank);
            const stats = this.leagueStats[l.id];
            
            // Bereits geplante Abgänge
            const leavingUp = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('up')).length;
            const leavingDownFix = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('down')).length;
            
            // Zugänge von oben UND unten (beide in pending_incoming seit PRE-FLIGHT)
            const incoming = stats.pending_incoming;
            
            const projectedSize = stats.old - leavingUp - leavingDownFix + incoming;
            
            // HARTE LIMITS
            let maxLimit = 18;
            if (l.level === 3) maxLimit = 20;
            else if (l.level === 4) maxLimit = 18; 
            else if (this.DOWN_MAP[l.id]) maxLimit = (stats.old > (l.target || 18)) ? (l.target || 18) : 20;
            else maxLimit = 999;
            if(l.level <= 2) maxLimit = 18;

            let variableDownCount = Math.max(0, projectedSize - maxLimit);
            if (!this.DOWN_MAP[l.id]) variableDownCount = 0;

            // Variable Absteiger hinzufügen
            for(let i=0; i<variableDownCount; i++) {
                const idx = teams.length - 1 - leavingDownFix - i;
                if(idx >= 0) {
                    const team = teams[idx];
                    if(!plannedMoves.find(m => m.t.id === team.id)) {
                        const move = {t:team, type:'down_var', oldId:l.id, fromLvl:l.level};
                        plannedMoves.push(move);
                        
                        // Kaskade weitergeben!
                        const target = this.findTarget(team, l.level+1, l.id);
                        if(target && this.leagueStats[target.id]) this.leagueStats[target.id].pending_incoming++;
                    }
                }
            }
        }

        // 4b. SCHRUMPF-SCHUTZ: Fixe Abstiege kürzen wenn Liga unter Mindestgröße fällt
        for (const l of sortedLeagues) {
            let minSize;
            if      (l.level === 3)                        minSize = 20;
            else if (l.level === 4)                        minSize = 18;
            else if (l.level >= 5 && this.DOWN_MAP[l.id]) minSize = 14;
            else continue; // Level 1/2 und unterste Ligen: kein Schutz, die bremsen nichts
            const stats = this.leagueStats[l.id];
            const leavingUp   = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('up')).length;
            const leavingDown = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('down')).length;
            // pending_incoming enthält jetzt alle Zu-/Abgänge aus PRE-FLIGHT (up & down)
            const realProjected = stats.old - leavingUp - leavingDown + stats.pending_incoming;
            if (realProjected < minSize) {
                const deficit = minSize - realProjected;
                // Nur fixe Abstiege (nicht Relegations-Abstiege) sind entfernbar
                const removable = plannedMoves.filter(m => m.oldId === l.id && m.type === 'down');
                // Zuletzt gepushte = best-platzierte Absteiger → die bleiben zuerst
                const toRemove = removable.slice(-Math.min(removable.length, deficit));
                toRemove.forEach(move => {
                    plannedMoves.splice(plannedMoves.indexOf(move), 1);
                    // Phantom-Fix: gestrichener Move → Zielliga-pending_incoming korrigieren
                    const tgt = this.findTarget(move.t, move.fromLvl + 1, move.oldId);
                    if (tgt && this.leagueStats[tgt.id]) {
                        this.leagueStats[tgt.id].pending_incoming = Math.max(0, this.leagueStats[tgt.id].pending_incoming - 1);
                    }
                });
            }
        }

        // 5. EXECUTE & SAFETY CHECK
        plannedMoves.forEach(m => {
            const targetLvl = m.type.includes('up') ? m.fromLvl - 1 : m.fromLvl + 1;
            
            // ANTI-TELEPORTATION: Kein Sprung über >1 Level
            if (Math.abs(targetLvl - m.fromLvl) !== 1) return;

            const target = this.findTarget(m.t, targetLvl, m.oldId);
            
            // SAFETY: Ziel-Level muss stimmen
            if (target && Math.abs(target.level - m.fromLvl) === 1 && target.id !== m.t.leagueId) {
                if(this.leagueStats[m.oldId]) this.leagueStats[m.oldId].moveOut++;
                if(this.leagueStats[target.id]) this.leagueStats[target.id].moveIn++;
                m.t.leagueId = target.id;
                this.logMigration(m.t, m.oldId, target.id, m.type);
                
                if (m.type.includes('up')) m.t.strength -= 8; else m.t.strength += 6;
            }
        });

        this.balanceDynamicGroups();
        Object.keys(this.leagues).forEach(lid => {
            this.leagueStats[lid].new = Object.values(this.teams).filter(t => t.leagueId === lid).length;
        });

        const finalRelegation = this.relegationResults.slice();
        this.currentSeasonOffset++;
        this.resetSeason(); // Sortiert neu!
        return { migrations: this.migrations, stats: this.leagueStats, relegation: finalRelegation };
    },

    getTeamByRank: function(lid, rank) {
        return Object.values(this.teams).filter(t => t.leagueId === lid).sort((a,b)=>a.rank-b.rank)[rank-1];
    },

    balanceDynamicGroups: function() {
        const siblingCovered = new Set();
        this.SIBLING_GROUPS.forEach(g => (g.ids||g).forEach(id => siblingCovered.add(id)));
        const groups = {};
        Object.values(this.leagues).forEach(l => {
            if (this.isGeoBlocked(l.name)) return;
            if (siblingCovered.has(l.id)) return;
            if (l.level >= 4) {
                const regionKey = l.region || 'misc';
                const nameKey = this.getKeywords(l.name).join('_');
                const key = `${l.level}_${regionKey}_${nameKey}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(l.id);
            }
        });
        Object.values(groups).forEach(ids => { if (ids.length > 1) this.balanceGroup(ids); });
        this.SIBLING_GROUPS.forEach(g => { const ids = g.ids||g; if (ids.length > 1) this.balanceGroup(ids, g.axis); });
    },

    isGeoBlocked: function(name) { return this.GEO_BLOCKED.some(k => name.includes(k)); },

    dist2D: function(team, center) {
        const dlat = (team.lat || 0) - center.lat;
        const dlon = ((team.lon || 0) - center.lon) * 0.7;
        return Math.sqrt(dlat * dlat + dlon * dlon);
    },

    balanceGroup: function(ids, axis) {
        if (axis === 'geo') {
            // Zentroid-basierte Zuweisung: jedes Team zum nächsten Liga-Zentrum
            let allTeams = [];
            ids.forEach(lid => Object.values(this.teams).filter(t => t.leagueId === lid).forEach(t => allTeams.push(t)));
            const mobile = allTeams.filter(t => t.lat && t.lon && t.lat !== 0 && t.lon !== 0);
            const fixed  = allTeams.filter(t => !mobile.includes(t));
            if (mobile.length === 0) return;

            const totalTeams = allTeams.length;
            const targets = {};
            ids.forEach(lid => {
                targets[lid] = (this.leagues[lid] && this.leagues[lid].target) || Math.ceil(totalTeams / ids.length);
            });
            const slots = {};
            ids.forEach(lid => { slots[lid] = Math.max(0, targets[lid] - fixed.filter(f => f.leagueId === lid).length); });

            // Sortiere nach Stärke der Präferenz (Teams mit klarer erster Wahl zuerst)
            mobile.sort((a, b) => {
                const da = Math.min(...ids.map(lid => this.LEAGUE_CENTERS[lid] ? this.dist2D(a, this.LEAGUE_CENTERS[lid]) : Infinity));
                const db = Math.min(...ids.map(lid => this.LEAGUE_CENTERS[lid] ? this.dist2D(b, this.LEAGUE_CENTERS[lid]) : Infinity));
                return da - db;
            });

            const assigned = {};
            ids.forEach(lid => { assigned[lid] = 0; });

            mobile.forEach(t => {
                const ranked = [...ids].sort((a, b) => {
                    const ca = this.LEAGUE_CENTERS[a], cb = this.LEAGUE_CENTERS[b];
                    const da = ca ? this.dist2D(t, ca) : Infinity;
                    const db = cb ? this.dist2D(t, cb) : Infinity;
                    return da - db;
                });
                for (const lid of ranked) {
                    if (assigned[lid] < slots[lid]) {
                        assigned[lid]++;
                        if (t.leagueId !== lid) {
                            if (this.leagueStats[t.leagueId]) this.leagueStats[t.leagueId].moveOut++;
                            if (this.leagueStats[lid]) this.leagueStats[lid].moveIn++;
                            t.leagueId = lid;
                            this.logMigration(t, lid, lid, 'geo');
                        }
                        break;
                    }
                }
            });
            return;
        }

        // Einfache lat/lon-Sortierung (axis: 'lat' oder undefined)
        let fixedTeams = [], mobileTeams = [];
        ids.forEach(lid => {
            Object.values(this.teams).filter(t => t.leagueId === lid).forEach(t => {
                if (t.lat && t.lat !== 0) mobileTeams.push(t); else fixedTeams.push(t);
            });
        });
        if (mobileTeams.length === 0) return;
        mobileTeams.sort((a, b) => b.lat - a.lat);
        const totalTeamsLat = mobileTeams.length + fixedTeams.length;
        const fallbackPerLeague = Math.ceil(totalTeamsLat / ids.length);
        let mobileIdx = 0;
        ids.forEach(lid => {
            const tgt = (this.leagues[lid] && this.leagues[lid].target) || fallbackPerLeague;
            const slots = Math.max(0, tgt - fixedTeams.filter(t => t.leagueId === lid).length);
            mobileTeams.slice(mobileIdx, mobileIdx + slots).forEach(t => {
                if (t.leagueId !== lid) {
                    if (this.leagueStats[t.leagueId]) this.leagueStats[t.leagueId].moveOut++;
                    if (this.leagueStats[lid]) this.leagueStats[lid].moveIn++;
                    t.leagueId = lid;
                    this.logMigration(t, lid, lid, 'geo');
                }
            });
            mobileIdx += slots;
        });
    },

    resolveHomeLeagueId: function(team) {
        const regions = team.regions || [];
        for (let i = regions.length - 1; i >= 0; i--) {
            const id = this.REGION_TO_LEAGUE_ID[regions[i]];
            if (id && this.leagues[id]) return id;
        }
        return null;
    },

    findTarget: function(team, targetLevel, currentLeagueId) {
        const candidates = Object.values(this.leagues).filter(l => l.level === targetLevel);
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // 1. ID-ROUTING (Prio A): homeLeagueId via REGION_TO_LEAGUE_ID + UP_MAP
        const homeId = this.resolveHomeLeagueId(team);
        if (homeId && this.leagues[homeId]) {
            const homeLevel = this.leagues[homeId].level;
            if (homeLevel === targetLevel) return this.leagues[homeId];
            if (homeLevel > targetLevel) {
                let id = homeId;
                while (id && this.leagues[id] && this.leagues[id].level > targetLevel) {
                    id = this.UP_MAP[id];
                }
                if (id && this.leagues[id] && this.leagues[id].level === targetLevel) return this.leagues[id];
            }
        }

        // 2. ROUTER FALLBACK (Prio B)
        let searchRegions = [...(team.regions || [])];
        if (searchRegions.length === 0 && team.leagueId && this.leagues[team.leagueId]) {
            searchRegions = this.getKeywords(this.leagues[team.leagueId].name);
        }
        searchRegions.push(team.name);

        for (const route of this.ROUTING_RULES) {
            const matchesKey = searchRegions.some(r => route.keys.some(k => r.includes(k)));
            const matchesNot = route.not ? !searchRegions.some(r => route.not.some(n => r.includes(n))) : true;
            if (matchesKey && matchesNot) {
                const target = candidates.find(c => c.name.includes(route.target));
                if (target) return target;
            }
        }

        // 3. REGION MAPPING (Prio C)
        for (const candidate of candidates) {
            for (const [mapKey, mapValues] of Object.entries(this.REGION_MAPPING)) {
                if (candidate.name.includes(mapKey)) {
                    if (searchRegions.some(r => mapValues.some(v => r.includes(v)))) return candidate;
                }
            }
        }

        // 4. NAME MATCH (Prio D)
        const matches = candidates.filter(l => searchRegions.some(r => {
            if (r.includes("Rheinland-Pfalz") && l.name.includes("Rheinland")) return l.name.includes("Rheinland-Pfalz");
            return l.name.includes(r);
        }));
        if (matches.length > 0) {
            if (matches.length === 1) return matches[0];
            // Nur Regionalliga Südwest als Südwest-Priorität – Verbandsliga Südwest soll nicht zu breit matchen
            if (searchRegions.some(r => r.includes("Südwest"))) {
                const rlMatch = matches.find(l => l.name === "Regionalliga Südwest");
                if (rlMatch) return rlMatch;
                const specific = matches.find(l => !l.name.includes("Südwest"));
                if (specific) return specific;
            }
            const hash = team.name.split("").reduce((a,b)=>a+b.charCodeAt(0),0);
            return matches[hash % matches.length];
        }

        const currentLiga = this.leagues[team.leagueId];
        if (currentLiga) {
            const keywords = this.getKeywords(currentLiga.name);
            const nameMatch = candidates.find(l => keywords.some(k => l.name.includes(k)));
            if (nameMatch) return nameMatch;
        }
        return candidates.sort((a,b) =>
            Object.values(this.teams).filter(t=>t.leagueId===a.id).length -
            Object.values(this.teams).filter(t=>t.leagueId===b.id).length
        )[0] || null;
    },

    logMigration: function(t, f_id, to_id, typ) { 
        if (f_id === to_id) return; 
        const fromName = this.leagues[f_id] ? this.leagues[f_id].name : "Unbekannt";
        const toName   = this.leagues[to_id] ? this.leagues[to_id].name : "Unbekannt";
        this.migrations.push({ team: t.name, from: fromName, to: toName, toId: to_id, type: typ, sortId: f_id }); 
    },

    saveGame: function() {
        const leanTeams = {};
        Object.values(this.teams).forEach(t => { if(t.leagueId) leanTeams[t.id] = { ...t, thumb: null, img_path: null }; });
        // History auf letzte 10 Saisons begrenzen + thumb/img/lat/regions entfernen
        const leanHistory = this.history.slice(-10).map(h => ({
            year: h.year,
            teams: Object.fromEntries(Object.entries(h.teams).map(([id, t]) => [id, {
                leagueId: t.leagueId, rank: t.rank, stats: t.stats, name: t.name
            }]))
        }));
        try { localStorage.setItem('ba_save_v66', JSON.stringify({y: this.currentSeasonOffset, s:this.currentSeason, m:this.currentMatchday, t:leanTeams, h:leanHistory, r:this.seasonResults})); }
        catch(e) { console.error("Save limit"); }
    },
    
    loadGame: function() { 
        const d = localStorage.getItem('ba_save_v66'); 
        if(!d) return false; 
        try { 
            const s = JSON.parse(d); this.currentSeasonOffset = s.y || 0; this.currentMatchday = s.m; this.teams = s.t; this.history = s.h || []; this.seasonResults = s.r || [];
            Object.values(this.teams).forEach(t => { if(GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb; });
            this.leagues = JSON.parse(JSON.stringify(GAME_DATA.leagues));
            return true; 
        } catch(e) { return false; } 
    }
};