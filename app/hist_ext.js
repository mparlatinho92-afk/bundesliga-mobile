// Historische Ligen Ebene 2–3 vor dem Sim-Start (HIST_EXT aus app/history_ext.js, erzeugt von tools/historie_einbau.mjs).
// Vereins- und Era-Namen werden SOFORT gemischt (Suche, Namensanzeige). Die Tabellen liegen gzip+base64 im Monolithen
// und werden erst entpackt, wenn eine Ansicht oder die Engine sie braucht – keine Kopie in IndexedDB.
// Ohne HIST_EXT (headless-Werkzeuge laden nur drei Dateien) oder ohne DecompressionStream liefert load() null.
(function () {
    if (typeof HIST_EXT === 'undefined') return;
    if (typeof HISTORIC_CLUBS !== 'undefined')
        for (var id in HIST_EXT.vereine) if (!HISTORIC_CLUBS[id]) HISTORIC_CLUBS[id] = HIST_EXT.vereine[id];
    // bestehende Einträge bleiben vorn – App._histClubName nimmt den ersten passenden Zeitraum
    if (typeof HISTORIC_NAMES !== 'undefined')
        for (var nid in HIST_EXT.namen) HISTORIC_NAMES[nid] = (HISTORIC_NAMES[nid] || []).concat(HIST_EXT.namen[nid]);
})();

var HistExt = (function () {
    var _p = null, _idx = null;
    var da = function () { return typeof HIST_EXT !== 'undefined' && !!HIST_EXT.gz; };

    function entpacken() {
        if (typeof DecompressionStream === 'undefined' || typeof Blob === 'undefined' || typeof Response === 'undefined')
            return Promise.reject(new Error('kein DecompressionStream'));
        var bin = atob(HIST_EXT.gz), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        var strom = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Response(strom).text().then(function (t) { return JSON.parse(t); });
    }

    // Index: byKey "y|lid" -> Datensatz (Form wie IndexedDB season_tables), byLid lid -> [Datensatz],
    // bySeason y -> {lid: Datensatz}, champs lid -> [{y,id}] (Platz 1 JEDER Staffel, wie der Seed).
    function indexieren(tabellen) {
        var idx = { byKey: {}, byLid: {}, bySeason: {}, champs: {} };
        tabellen.forEach(function (t) {
            var rec = { key: t.y + '|' + t.lid, y: t.y, lid: t.lid, rows: t.rows, ext: true };
            if (t.vr) { rec.vr = t.vr; rec.kumS = !!t.kumS; rec.kumT = !!t.kumT; }   // Covid-Modus: Vorrunde + Platzierungsrunden
            if (t.abbruch) rec.abbruch = true;   // abgebrochen, Wertung nach Quotient (Punkte je Spiel)
            if (t.doppel) rec.doppel = t.doppel; // Doppelsaison (Bayern 2019–21), steht unter dem ersten Jahr
            idx.byKey[rec.key] = rec;
            (idx.byLid[t.lid] = idx.byLid[t.lid] || []).push(rec);
            (idx.bySeason[t.y] = idx.bySeason[t.y] || {})[t.lid] = rec;
            // Meister zählen auch beim heutigen Nachfolger (ligaNachfolger: Oberliga Westfalen 1978–2008 -> 5-10)
            var nf = HIST_EXT.ligaNachfolger && HIST_EXT.ligaNachfolger[t.lid];
            t.rows.forEach(function (r) { if (r.rank !== 1) return;
                (idx.champs[t.lid] = idx.champs[t.lid] || []).push({ y: t.y, id: r.id });
                if (nf) (idx.champs[nf] = idx.champs[nf] || []).push({ y: t.y, id: r.id }); });
        });
        return idx;
    }

    return {
        available: da,
        version: function () { return da() ? HIST_EXT.version : null; },
        remap: function () { return (typeof HIST_EXT !== 'undefined' && HIST_EXT.remap) || {}; },
        // Fusionen (tools/hist_fusion.json): Vorgaenger behalten ihre IDs; Steckbrief und Ligaverlauf verbinden sie
        vorgaenger: function (id) { var f = typeof HIST_EXT !== 'undefined' && HIST_EXT.fusion && HIST_EXT.fusion[id]; return f ? { jahr: f.jahr, ids: f.vorgaenger.slice() } : null; },
        nachfolger: function (id) {
            var F = (typeof HIST_EXT !== 'undefined' && HIST_EXT.fusion) || {};
            for (var nf in F) if (F[nf].vorgaenger.indexOf(id) >= 0) return { id: nf, jahr: F[nf].jahr };
            return null;
        },
        // Heutige Liga einer historischen Liga (eindeutiger Nachfolger, sonst null) bzw. deren historische Vorgänger
        ligaNachfolger: function (lid) { var m = typeof HIST_EXT !== 'undefined' && HIST_EXT.ligaNachfolger; return (m && m[lid]) || null; },
        ligaVorgaenger: function (lid) { var m = (typeof HIST_EXT !== 'undefined' && HIST_EXT.ligaNachfolger) || {}; return Object.keys(m).filter(function (h) { return m[h] === lid; }); },
        // bereits entpackt? (synchron, sonst null)
        loaded: function () { return _idx; },
        // einmal entpacken, danach aus dem Speicher; Fehler -> null (Ansichten zeigen dann nur IndexedDB)
        load: function () {
            if (!da()) return Promise.resolve(null);
            if (!_p) _p = entpacken().then(function (tab) {
                _idx = indexieren(tab);
                if (typeof App !== 'undefined' && App._staffelIdx) App._staffelIdx = null; // Staffeln der Erweiterung mit einlesen
                return _idx;
            }).catch(function (e) { if (typeof console !== 'undefined') console.warn('HistExt: ' + e.message); return null; });
            return _p;
        }
    };
})();
