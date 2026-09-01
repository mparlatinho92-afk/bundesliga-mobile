// IndexedDB-Speicher für die VOLLE Langzeit-Chronik (champions/relegation) – Gegenstück zur
// gekappten localStorage-Chronik in Engine.archive. Append-only, asynchron, geräte-lokal.
//
// ROBUSTHEIT: Ist IndexedDB blockiert/nicht verfügbar (z.B. Firefox-Privatmodus, strenger
// Tracking-Schutz) ODER hängt das Öffnen, lösen ALLE Methoden mit sicheren Leerwerten auf
// (statt zu werfen/hängen). Die UI fällt dann automatisch auf die gekappte localStorage-Chronik
// (Engine.archive) zurück – nichts bricht, nichts hängt.
var IDBStore = (function () {
    var DB_NAME = 'ba_archive_v1';
    var _dbPromise = null;

    // GELTUNGSBEREICH: welchem Spielstand gehoert eine Zeile? Die Schluessel der Stores sind reine
    // Fachgroessen ("y|lid", y) - zwei Spielstaende schreiben also in denselben Schluesselraum. Ohne
    // Filter serviert die Anzeige eines neuen Spiels die Chronik des alten (Ewige Tabellen,
    // Siegerlisten, Saison-Archiv, Rekord-Backfill). Deshalb traegt jede geschriebene Zeile ab
    // v0.8.131 die Kennung ihres Spielstands, und gelesen wird nur, was zum aktuellen gehoert.
    //
    // _legacy = Zeilen OHNE Kennung (von vor dieser Aenderung) mitlesen. Das darf genau der
    // Spielstand, der beim Update schon existierte - ein NEU begonnenes Spiel sieht sie nie.
    var _scope = { sid: null, legacy: true };
    function _mine(row) {
        if (!row) return false;
        if (row.sid == null) return !!_scope.legacy;
        return row.sid === _scope.sid;
    }

    // Kein Wall-Clock-Timeout: ein überfälliger Timer würde nach langer synchroner Simulation
    // VOR dem IDB-onsuccess feuern (False-Negative). Blockiertes IDB (Firefox-Privat etc.) feuert
    // onerror oder wirft synchron → beides hier behandelt → reject → UI-Fallback auf localStorage-Cap.
    function open() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise(function (resolve, reject) {
            if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('no indexedDB')); return; }
            var req;
            try { req = indexedDB.open(DB_NAME, 2); } catch (e) { reject(e); return; }
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('champions')) {
                    var cs = db.createObjectStore('champions', { keyPath: 'k', autoIncrement: true });
                    cs.createIndex('lid', 'lid', { unique: false });
                }
                if (!db.objectStoreNames.contains('relegation')) db.createObjectStore('relegation', { keyPath: 'y' });
                if (!db.objectStoreNames.contains('season_tables')) {
                    var st = db.createObjectStore('season_tables', { keyPath: 'key' }); // key = "y|lid"
                    st.createIndex('lid', 'lid', { unique: false });
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function () { reject(req.error || new Error('idb open failed')); };
        });
        return _dbPromise;
    }

    function writeTx(db, storeNames, fn) {
        return new Promise(function (resolve, reject) {
            var t = db.transaction(storeNames, 'readwrite');
            fn(t);
            t.oncomplete = function () { resolve(); };
            t.onerror = function () { reject(t.error); };
            t.onabort = function () { reject(t.error || new Error('tx abort')); };
        });
    }

    return {
        // Setzt der Engine nach jedem Laden / Neustart (Engine._applyIdbScope).
        setScope: function (sid, legacy) { _scope = { sid: sid || null, legacy: !!legacy }; },
        getScope: function () { return { sid: _scope.sid, legacy: _scope.legacy }; },

        // true/false ob IndexedDB nutzbar ist (gecacht über open())
        available: function () { return open().then(function () { return true; }, function () { return false; }); },

        // champRecords: [{lid,y,id}], relRecords: [{y,results}] – no-op bei blockiertem IDB
        appendSeason: function (champRecords, relRecords) {
            return open().then(function (db) {
                return writeTx(db, ['champions', 'relegation'], function (t) {
                    var cs = t.objectStore('champions');
                    (champRecords || []).forEach(function (r) { cs.add({ lid: r.lid, y: r.y, id: r.id, sid: _scope.sid }); });
                    var rs = t.objectStore('relegation');
                    // Der Schluessel bleibt die Saison (put = idempotent), die Kennung kommt als FELD
                    // dazu: zwei Spielstaende ueberschreiben sich damit zwar, aber keiner SIEHT den anderen.
                    (relRecords || []).forEach(function (r) { r.sid = _scope.sid; rs.put(r); });
                });
            }).catch(function () { /* blockiert/Fehler → localStorage-Cap bleibt Fallback */ });
        },

        // Alle Meister einer Liga (chronologisch): [{y,id}] – [] bei blockiertem IDB
        getChampions: function (lid) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var out = [];
                    var idx = db.transaction('champions', 'readonly').objectStore('champions').index('lid');
                    var req = idx.openCursor(IDBKeyRange.only(lid));
                    req.onsuccess = function (e) { var c = e.target.result; if (c) { if (_mine(c.value)) out.push({ y: c.value.y, id: c.value.id }); c.continue(); } else resolve(out); };
                    req.onerror = function () { reject(req.error); };
                });
            }).catch(function () { return []; });
        },

        // Alle Relegations-Saisons [{y,results}] – [] bei blockiertem IDB
        getRelegation: function () {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var req = db.transaction('relegation', 'readonly').objectStore('relegation').getAll();
                    req.onsuccess = function () { resolve((req.result || []).filter(_mine)); };
                    req.onerror = function () { reject(req.error); };
                });
            }).catch(function () { return []; });
        },

        // Volle Abschlusstabellen je Saison/Liga (Season-Archiv-Browser).
        // records: [{key:"y|lid", y, lid, rows:[{id,rank,s,u,n,gf,ga}]}] – put = idempotent
        putSeasonTables: function (records) {
            return open().then(function (db) {
                return writeTx(db, ['season_tables'], function (t) {
                    var s = t.objectStore('season_tables');
                    (records || []).forEach(function (r) { r.sid = _scope.sid; s.put(r); });
                });
            }).catch(function () {});
        },
        getSeasonTable: function (y, lid) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var req = db.transaction('season_tables', 'readonly').objectStore('season_tables').get(y + '|' + lid);
                    req.onsuccess = function () { resolve(_mine(req.result) ? req.result : null); };
                    req.onerror = function () { reject(req.error); };
                });
            }).catch(function () { return null; });
        },
        // ALLE Ligatabellen EINER Saison in einem Rutsch – Grundlage fuer Auf-/Abstiegs-Markierungen
        // im Archiv: erst wenn man jede Liga der Folgesaison kennt, weiss man, WOHIN ein Verein ging.
        // Der keyPath ist "y|lid", also holt eine Prefix-Range genau die Saison (ein Cursor statt 70 gets).
        // Liefert {lid: record} – {} bei blockiertem IDB.
        getSeasonAll: function (y) {
            if (!y) return Promise.resolve({});
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var out = {};
                    var range = IDBKeyRange.bound(y + '|', y + '|￿');
                    var req = db.transaction('season_tables', 'readonly').objectStore('season_tables').openCursor(range);
                    req.onsuccess = function (e) { var c = e.target.result; if (c) { if (_mine(c.value)) out[c.value.lid] = c.value; c.continue(); } else resolve(out); };
                    req.onerror = function () { reject(req.error); };
                });
            }).catch(function () { return {}; });
        },
        // Volle Saison-für-Saison-Historie EINES Vereins (für Steckbrief). leagueIds = Ligen, in denen
        // der Verein je spielte (aus archive.ewige) → begrenzt den Scan auf relevante Ligen.
        // Liefert [{y, lid, rank}] über alle archivierten Saisons.
        getTeamSeasons: function (teamId, leagueIds) {
            return open().then(function (db) {
                return Promise.all((leagueIds || []).map(function (lid) {
                    return new Promise(function (resolve, reject) {
                        var out = [];
                        var idx = db.transaction('season_tables', 'readonly').objectStore('season_tables').index('lid');
                        var req = idx.openCursor(IDBKeyRange.only(lid));
                        req.onsuccess = function (e) {
                            var c = e.target.result;
                            if (c) { var row = _mine(c.value) ? (c.value.rows || []).find(function (r) { return r.id === teamId; }) : null; if (row) out.push({ y: c.value.y, lid: lid, rank: row.rank }); c.continue(); }
                            else resolve(out);
                        };
                        req.onerror = function () { reject(req.error); };
                    });
                })).then(function (arrs) { return [].concat.apply([], arrs); });
            }).catch(function () { return []; });
        },

        // Jahre, für die diese Liga eine archivierte Tabelle hat (für den Picker)
        listSeasonKeys: function (lid) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var out = [];
                    var idx = db.transaction('season_tables', 'readonly').objectStore('season_tables').index('lid');
                    var req = idx.openCursor(IDBKeyRange.only(lid));
                    req.onsuccess = function (e) { var c = e.target.result; if (c) { if (_mine(c.value)) out.push(c.value.y); c.continue(); } else resolve(out); };
                    req.onerror = function () { reject(req.error); };
                });
            }).catch(function () { return []; });
        },

        // ALLE archivierten Abschlusstabellen streamen (Cursor über den ganzen Store, keine
        // Zwischenliste in der DB-Transaktion). Basis für den einmaligen Rekord-Backfill
        // (Engine._recordBackfill) - der Aufrufer entscheidet, was er sich merkt.
        scanSeasonTables: function (onRow) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var req = db.transaction('season_tables', 'readonly').objectStore('season_tables').openCursor();
                    req.onsuccess = function (e) {
                        var c = e.target.result;
                        if (c) { if (_mine(c.value)) { try { onRow(c.value); } catch (err) {} } c.continue(); } else resolve();
                    };
                    req.onerror = function () { reject(req.error); };
                });
            });
        },

        // Alle Zeilen EINER Saison entfernen (Gegenstueck zum Archivieren, s. Engine._unarchiveSeason).
        // Nur eigene Zeilen: _mine haelt fremde Spielstaende raus, ein Loeschlauf darf nicht ueber
        // den Tellerrand des aktuellen Stands hinausgreifen.
        deleteSeason: function (y) {
            if (!y) return Promise.resolve(0);
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var t = db.transaction(['champions', 'season_tables', 'relegation'], 'readwrite');
                    var weg = 0;
                    var cur = function (store, pruef) {
                        var req = t.objectStore(store).openCursor();
                        req.onsuccess = function (e) {
                            var c = e.target.result;
                            if (!c) return;
                            if (_mine(c.value) && pruef(c.value)) { c.delete(); weg++; }
                            c.continue();
                        };
                    };
                    cur('champions',    function (r) { return r.y === y; });
                    cur('season_tables', function (r) { return r.y === y; });
                    cur('relegation',   function (r) { return r.y === y; });
                    t.oncomplete = function () { resolve(weg); };
                    t.onerror = function () { reject(t.error); };
                    t.onabort = function () { reject(t.error); };
                });
            }).catch(function () { return 0; });
        },

        clear: function () {
            return open().then(function (db) {
                return writeTx(db, ['champions', 'relegation', 'season_tables'], function (t) {
                    t.objectStore('champions').clear();
                    t.objectStore('relegation').clear();
                    t.objectStore('season_tables').clear();
                });
            }).catch(function () {});
        }
    };
})();
