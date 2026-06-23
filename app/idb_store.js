// IndexedDB-Speicher für die VOLLE Langzeit-Chronik (champions/relegation) – Gegenstück zur
// gekappten localStorage-Chronik in Engine.archive. Append-only, asynchron, geräte-lokal.
// Bei fehlendem/defektem IndexedDB werfen die Methoden → UI fällt auf die gekappte Chronik zurück.
var IDBStore = (function () {
    var DB_NAME = 'ba_archive_v1';
    var _dbPromise = null;

    function open() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise(function (resolve, reject) {
            if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('no indexedDB')); return; }
            var req;
            try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('champions')) {
                    var cs = db.createObjectStore('champions', { keyPath: 'k', autoIncrement: true });
                    cs.createIndex('lid', 'lid', { unique: false });
                }
                if (!db.objectStoreNames.contains('relegation')) {
                    db.createObjectStore('relegation', { keyPath: 'y' });
                }
            };
            req.onsuccess = function (e) { resolve(e.target.result); };
            req.onerror = function () { reject(req.error || new Error('idb open failed')); };
        });
        return _dbPromise;
    }

    function writeTx(storeNames, fn) {
        return open().then(function (db) {
            return new Promise(function (resolve, reject) {
                var t = db.transaction(storeNames, 'readwrite');
                fn(t);
                t.oncomplete = function () { resolve(); };
                t.onerror = function () { reject(t.error); };
                t.onabort = function () { reject(t.error || new Error('tx abort')); };
            });
        });
    }

    return {
        ready: function () { return open(); },

        // champRecords: [{lid,y,id}], relRecords: [{y,results}]
        appendSeason: function (champRecords, relRecords) {
            return writeTx(['champions', 'relegation'], function (t) {
                var cs = t.objectStore('champions');
                (champRecords || []).forEach(function (r) { cs.add({ lid: r.lid, y: r.y, id: r.id }); });
                var rs = t.objectStore('relegation');
                (relRecords || []).forEach(function (r) { rs.put(r); }); // put = idempotent je Saison (keyPath y)
            });
        },

        // Alle Meister einer Liga (chronologisch nach Einfügereihenfolge): [{y,id}]
        getChampions: function (lid) {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var out = [];
                    var idx = db.transaction('champions', 'readonly').objectStore('champions').index('lid');
                    var req = idx.openCursor(IDBKeyRange.only(lid));
                    req.onsuccess = function (e) {
                        var c = e.target.result;
                        if (c) { out.push({ y: c.value.y, id: c.value.id }); c.continue(); }
                        else resolve(out);
                    };
                    req.onerror = function () { reject(req.error); };
                });
            });
        },

        // Alle Relegations-Saisons [{y,results}] – Filterung nach Liga im UI
        getRelegation: function () {
            return open().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var req = db.transaction('relegation', 'readonly').objectStore('relegation').getAll();
                    req.onsuccess = function () { resolve(req.result || []); };
                    req.onerror = function () { reject(req.error); };
                });
            });
        },

        clear: function () {
            return writeTx(['champions', 'relegation'], function (t) {
                t.objectStore('champions').clear();
                t.objectStore('relegation').clear();
            });
        }
    };
})();
