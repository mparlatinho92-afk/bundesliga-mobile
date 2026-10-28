// Deutsche Amateurmeisterschaft 1951–1998 im Steckbrief (Nutzer 28.10.2026: „kommt nach ganz unten, da nicht mehr aktiv“).
// Daten: app/amateur_dm_data.js (ERZEUGT von tools/amateur_dm_einbau.mjs), s. docs/AMATEURMEISTERSCHAFT.md. Ohne Daten bleibt der Abschnitt leer.
Object.assign(App, {

_AMDM_STUFE: { M: 'Meister', F: 'Finale', E: 'Endrunde', HF: 'Halbfinale', VF: 'Viertelfinale', AF: 'Achtelfinale', G: 'Gruppenphase', VR: 'Vorrunde', Q: 'Ausscheidungsspiel' },

// Teilnahmen eines Vereins, neueste zuerst: [{ y, st, nm (damaliger Name), geg (Finalgegner), erg (aus eigener Sicht) }]
_amDmTeilnahmen: function(teamId) {
    if (typeof AMATEUR_DM === 'undefined' || !AMATEUR_DM.jahre) return [];
    const aus = [];
    Object.keys(AMATEUR_DM.jahre).forEach(y => {
        const j = AMATEUR_DM.jahre[y], e = j.t.find(x => x[0] === teamId);
        if (!e) return;
        const f = j.f || [], istM = f[0] === teamId;
        const geg = (e[1] === 'M' || e[1] === 'F') ? (istM ? f[1] : f[0]) : null;
        // Ergebnis steht aus Sicht des Meisters – für den Finalverlierer jedes Paar umdrehen
        const erg = geg ? (istM ? f[2] : String(f[2] || '').replace(/(\d+):(\d+)/g, '$2:$1')) : '';
        aus.push({ y, st: e[1], nm: e[2], geg, erg });
    });
    return aus.reverse();
},

_amDmName: function(id) {
    return (GAME_DATA.teams[id] || {}).name || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id])
        || (typeof AMATEUR_DM !== 'undefined' && AMATEUR_DM.namen[id]) || id;
},

_sbAmateurDM: function(teamId) {
    const L = this._amDmTeilnahmen(teamId);
    if (!L.length) return '';
    const titel = L.filter(x => x.st === 'M').length, finals = L.filter(x => x.st === 'M' || x.st === 'F').length;
    const jetzt = this._amDmName(teamId);
    // Gegner nur verlinken, wenn er einen Steckbrief hat (neue hist_am_/hist_pk_-Vereine haben keinen)
    const link = id => (GAME_DATA.teams[id] || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]))
        ? `<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;color:var(--c-link)">${this._amDmName(id)}</span>` : this._amDmName(id);
    let h = `<div id="sb-amdm" style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px">`
        + `<div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:2px">DEUTSCHE AMATEURMEISTERSCHAFT</div>`
        + `<div style="font-size:10px;color:var(--muted);margin-bottom:4px">1951–1998, seitdem nicht mehr ausgespielt · ${L.length} Teilnahme${L.length === 1 ? '' : 'n'}`
        + `${titel ? ` · <span style="color:var(--c-gold);font-weight:bold;white-space:nowrap">🏆 ${titel}× Meister</span>` : ''}${finals - titel ? ` · <span style="white-space:nowrap">${finals - titel}× Finale</span>` : ''}</div>`;
    L.forEach(x => {
        const col = x.st === 'M' ? 'var(--c-gold)' : x.st === 'F' ? 'var(--text)' : 'var(--muted)';
        // "als …" nur bei echtem Namenswechsel – "Hannover 96 Amateure" / "(Amateure)" / "Am." gegen "Hannover 96 II" ist dieselbe Reserve
        const ohneRes = s => String(s || '').replace(/\s*(\((A|Am\.?|Amateure)\)|\/?\s*Amateure|\sAm(at)?\.?|\sII)\s*$/i, '').trim();
        const als = x.nm && ohneRes(x.nm) !== ohneRes(jetzt) ? `<span style="opacity:0.7"> als ${x.nm}</span>` : '';
        const fin = x.geg ? `<span style="flex-shrink:0;font-weight:bold">${x.erg}</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">gg. ${link(x.geg)}</span>` : '';
        h += `<div style="display:flex;gap:6px;align-items:baseline;font-size:11px;padding:1px 0">`
            + `<b style="flex:0 0 32px">${x.y}</b><span style="flex-shrink:0;color:${col};${x.st === 'M' ? 'font-weight:bold' : ''}">${x.st === 'M' ? '🏆 ' : ''}${this._AMDM_STUFE[x.st] || x.st}</span>`
            + `${fin}${!fin && als ? `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:10px">${als}</span>` : ''}</div>`
            + (fin && als ? `<div style="font-size:10px;color:var(--muted);padding:0 0 1px 38px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${als}</div>` : '');
    });
    return h + '</div>';
}

});
