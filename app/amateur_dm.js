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
        aus.push({ y, st: e[1], nm: e[2], geg, erg, grund: e[3] || '' });
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
            + `<b onclick="document.getElementById('modal').style.display='none';App.showAmateurDM('runden','${x.y}')" title="${x.grund ? 'Teilnahme: ' + x.grund.replace(/"/g, '&quot;') + ' · ' : ''}Runden ${x.y} anzeigen" style="flex:0 0 32px;cursor:pointer;color:var(--c-link)">${x.y}</b><span style="flex-shrink:0;color:${col};${x.st === 'M' ? 'font-weight:bold' : ''}">${x.st === 'M' ? '🏆 ' : ''}${this._AMDM_STUFE[x.st] || x.st}</span>`
            + `${fin}${!fin && als ? `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:10px">${als}</span>` : ''}</div>`
            + (fin && als ? `<div style="font-size:10px;color:var(--muted);padding:0 0 1px 38px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${als}</div>` : '');
    });
    return h + '</div>';
},

// ── Eigener Einstieg ganz unten in der Seitenleiste (Nutzer 28.10.2026: „ja eben unten. ohne ewige tabelle. wobei die anzahl der
// teilnahmen doch interessant wäre. teilnehmer-reiter wie beim dfb-pokal mit der begründung“). activeLeague '__amdm__'.
// Reiter: Sieger (+ Rekordsieger) · Teilnahmen (Anzahl je Verein) · Teilnehmer (je Jahr mit Grund) · Runden (je Jahr alle Spiele).
_AMDM_TABS: [['sieger', 'Sieger'], ['teilnahmen', 'Teilnahmen'], ['teilnehmer', 'Teilnehmer'], ['runden', 'Runden']],

showAmateurDM: function(tab, y) {
    this.activeLeague = '__amdm__';
    this.viewArchivedSeason = null;
    this.viewHistoryOffset = null;
    try { localStorage.setItem('ba_lastLeague', '__amdm__'); } catch (e) {}
    if (tab) this.amDmTab = tab;
    if (!this.amDmTab) this.amDmTab = 'sieger';
    const J = typeof AMATEUR_DM !== 'undefined' ? AMATEUR_DM.jahre : null;
    const ys = J ? Object.keys(J) : [];
    if (y && J && J[y]) this.amDmY = String(y);
    if (!this.amDmY || !J || !J[this.amDmY]) this.amDmY = ys[ys.length - 1];
    this.renderSidebar();
    const t = document.getElementById('league-title');
    if (t) t.innerHTML = '<span class="lt-name">🥇 Deutsche Amateurmeisterschaft</span>';
    const el = document.getElementById('content');
    if (!el) return;
    const tabs = `<div class="pokal-tabs">${this._AMDM_TABS.map(([v, n]) => `<button onclick="App.showAmateurDM('${v}')" class="pokal-tab-btn${this.amDmTab === v ? ' active' : ''}">${n}</button>`).join('')}</div>`;
    if (!J || !ys.length) { el.innerHTML = tabs + '<div style="padding:20px;opacity:0.5;">Keine Daten zur Amateurmeisterschaft geladen.</div>'; return; }
    const hinweis = `<div style="font-size:11px;color:var(--muted);margin:6px 0 8px">1951–1998, danach nicht mehr ausgespielt. Quelle: de.wikipedia, Saisonartikel.</div>`;
    const inhalt = this.amDmTab === 'teilnahmen' ? this._amDmTeilnahmenListe()
        : this.amDmTab === 'teilnehmer' ? this._amDmJahrKopf() + this._amDmTeilnehmerJahr(this.amDmY)
        : this.amDmTab === 'runden' ? this._amDmJahrKopf() + this._amDmRundenJahr(this.amDmY)
        : this._amDmSiegerListe();
    el.innerHTML = tabs + `<div id="amdm-inhalt" style="padding:0 4px">${hinweis}${inhalt}</div>`;
    if (this._applyScroll) this._applyScroll();
},

// ◀ Jahr ▶ für Teilnehmer und Runden
_amDmJahrKopf: function() {
    const ys = Object.keys(AMATEUR_DM.jahre), i = ys.indexOf(this.amDmY);
    const b = (j, z) => j >= 0 && j < ys.length ? `<button class="btn" onclick="App.showAmateurDM(null,'${ys[j]}')" style="padding:2px 10px">${z}</button>` : `<button class="btn" disabled style="padding:2px 10px;opacity:0.3">${z}</button>`;
    const opts = ys.map(y => `<option value="${y}"${y === this.amDmY ? ' selected' : ''}>${y}</option>`).join('');
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">${b(i - 1, '◀')}<select onchange="App.showAmateurDM(null,this.value)" style="font-size:14px;font-weight:bold;padding:2px 4px">${opts}</select>${b(i + 1, '▶')}</div>`;
},

// Damaliger Name eines Vereins in einem Jahr (Teilnehmerliste/Spiel), sonst heutiger
_amDmNameIn: function(id, y) { const e = (AMATEUR_DM.jahre[y] || { t: [] }).t.find(x => x[0] === id); return (e && e[2]) || this._amDmName(id); },
_amDmLink: function(id, text) {
    const da = GAME_DATA.teams[id] || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]);
    const th = (GAME_DATA.teams[id] || {}).thumb;
    const img = th ? `<img src="${th}" width="16" height="16" loading="lazy" style="object-fit:contain;flex-shrink:0">` : '';
    return `<span${da ? ` onclick="App.showSteckbrief('${id}')"` : ''} style="display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:100%;${da ? 'cursor:pointer' : ''}">${img}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${text || this._amDmName(id)}</span></span>`;
},

_amDmSiegerListe: function() {
    const J = AMATEUR_DM.jahre, titel = {};
    let rows = '';
    Object.keys(J).slice().reverse().forEach(y => {
        const f = J[y].f || [];
        if (!f[0]) return;
        (titel[f[0]] = titel[f[0]] || []).push(y);
        rows += `<tr><td class="sg-saison" onclick="App.showAmateurDM('runden','${y}')" title="Runden ${y}" style="cursor:pointer;color:var(--c-link)">${y}</td>`
            + `<td style="max-width:0;width:45%">${this._amDmLink(f[0], this._amDmNameIn(f[0], y))}</td>`
            + `<td style="white-space:nowrap;font-size:12px">${f[2] || (f[1] ? '' : 'Endrunde')}</td>`
            + `<td style="max-width:0;width:40%;color:var(--muted)">${f[1] ? this._amDmLink(f[1], this._amDmNameIn(f[1], y)) : ''}</td></tr>`;
    });
    const rek = Object.entries(titel).sort((a, b) => b[1].length - a[1].length || a[1][0] - b[1][0]);
    const rekHtml = rek.map(([id, L]) => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;min-width:0"><b style="flex:0 0 22px;text-align:right">${L.length}×</b>${this._amDmLink(id)}<span style="margin-left:auto;flex-shrink:0;font-size:11px;color:var(--muted)">${L.slice().sort().join(', ')}</span></div>`).join('');
    return `<table class="ltab" style="width:100%;table-layout:fixed"><thead><tr><th style="width:44px">Jahr</th><th>Meister</th><th style="width:92px">Finale</th><th>Finalgegner</th></tr></thead><tbody>${rows}</tbody></table>`
        + `<div style="font-size:11px;font-weight:bold;color:var(--muted);letter-spacing:1px;margin:14px 0 4px">REKORDSIEGER</div>${rekHtml}`;
},

// Anzahl der Teilnahmen je Verein (keine Ewige Tabelle – die Formate wechseln zu stark), dazu Titel, Finals, beste Runde, Zeitraum
_amDmTeilnahmenListe: function() {
    const J = AMATEUR_DM.jahre, V = {};
    Object.keys(J).forEach(y => J[y].t.forEach(([id, st]) => {
        const v = V[id] = V[id] || { id, n: 0, m: 0, f: 0, ys: [] };
        v.n++; v.ys.push(y); if (st === 'M') v.m++; if (st === 'M' || st === 'F') v.f++;
    }));
    const L = Object.values(V).sort((a, b) => b.n - a.n || b.m - a.m || b.f - a.f || this._amDmName(a.id).localeCompare(this._amDmName(b.id), 'de'));
    let platz = 0, vorher = null;
    const rows = L.map((v, i) => {
        if (v.n !== vorher) { platz = i + 1; vorher = v.n; }
        return `<tr><td style="text-align:right">${platz}.</td><td style="max-width:0">${this._amDmLink(v.id)}</td><td style="text-align:right;font-weight:bold">${v.n}</td>`
            + `<td style="text-align:right">${v.m || ''}</td><td style="text-align:right">${v.f || ''}</td><td class="amdm-zeit" style="white-space:nowrap;font-size:11px;color:var(--muted)">${v.ys[0]}${v.ys.length > 1 ? '–' + v.ys[v.ys.length - 1] : ''}</td></tr>`;
    }).join('');
    return `<div style="font-size:11px;color:var(--muted);margin-bottom:6px">${L.length} Vereine · Teilnahmen, davon Titel 🏆 und Finals (Titel mitgezählt)</div>`
        + `<table class="ltab" style="width:100%;table-layout:fixed"><thead><tr><th style="width:34px">#</th><th>Verein</th><th style="width:40px;text-align:right">Teiln.</th><th style="width:30px;text-align:right">🏆</th><th style="width:40px;text-align:right">Fin.</th><th style="width:76px">Zeitraum</th></tr></thead><tbody>${rows}</tbody></table>`;
},

// Teilnehmer eines Jahres mit Teilnahmegrund (Verband/Liga bzw. Platz laut Artikel) und erreichter Runde; darüber die Regel des Jahrgangs
_amDmTeilnehmerJahr: function(y) {
    const j = AMATEUR_DM.jahre[y];
    const rows = j.t.map(([id, st, nm, grund]) => {
        const col = st === 'M' ? 'var(--c-gold)' : st === 'F' ? 'var(--text)' : 'var(--muted)';
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;min-width:0">`
            + `<span style="flex:1 1 auto;min-width:0;display:flex">${this._amDmLink(id, nm)}</span>`
            + `<span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--muted);text-align:right" title="${(grund || '').replace(/"/g, '&quot;')}">${grund || '–'}</span>`
            + `<span style="flex:0 0 auto;font-size:11px;color:${col};${st === 'M' ? 'font-weight:bold' : ''}">${st === 'M' ? '🏆 ' : ''}${this._AMDM_STUFE[st] || st}</span></div>`;
    }).join('');
    return (j.e ? `<div style="font-size:12px;line-height:1.45;margin-bottom:8px">${j.e}</div>` : '')
        + `<div style="display:flex;font-size:10px;color:var(--muted);letter-spacing:1px;padding-bottom:2px;border-bottom:1px solid var(--border)"><span style="flex:1">VEREIN (${j.t.length})</span><span>TEILNAHME ALS · ERREICHT</span></div>${rows}`;
},

// Alle Spiele eines Jahres, je Runde; Gruppentabellen (1953–55, 1991–94, 1998) als Tabelle darüber
_amDmRundenJahr: function(y) {
    const j = AMATEUR_DM.jahre[y], ids = AMATEUR_DM.ids;
    const nm = i => this._amDmNameIn(ids[i], y);
    let h = '';
    j.r.forEach(r => {
        h += `<div style="font-size:11px;font-weight:bold;color:var(--muted);letter-spacing:1px;margin:12px 0 4px;border-bottom:1px solid var(--border);padding-bottom:2px">${r.n.toUpperCase()}</div>`;
        if (r.tab) h += `<table class="ltab" style="width:100%;table-layout:fixed;margin-bottom:6px"><thead><tr><th style="width:28px">Pl</th><th>Verein</th><th style="width:28px">S</th><th style="width:28px">U</th><th style="width:28px">N</th><th style="width:52px">Tore</th></tr></thead><tbody>`
            + r.tab.map(([i, rang, s, u, n, et, gt]) => `<tr><td>${rang || ''}</td><td style="max-width:0">${this._amDmLink(ids[i], nm(i))}</td><td>${s}</td><td>${u}</td><td>${n}</td><td style="white-space:nowrap">${et}:${gt}</td></tr>`).join('') + `</tbody></table>`;
        r.s.forEach(([hi, ai, hg, ag, f, ie]) => {
            // fett = kommt weiter; im Hinspiel steht das noch nicht fest (1977: Wanne-Eickel gewinnt 1:0, weiter kommt Hassia Bingen)
            const weiter = f & (64 | 8) ? null : (f & 32 ? 'a' : 'h');
            const zus = [f & 8 ? 'Hinspiel' : '', f & 16 ? 'Rückspiel' : '', f & 4 ? 'Wiederholung' : '', f & 2 && ie ? `i.E. ${ie[0]}:${ie[1]}` : f & 1 ? 'n.V.' : ''].filter(Boolean).join(' · ');
            const seite = (i, w, rechts) => `<span style="flex:1 1 0;min-width:0;display:flex;${rechts ? '' : 'justify-content:flex-end;'}${w ? 'font-weight:bold' : ''}">${this._amDmLink(ids[i], nm(i))}</span>`;
            h += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px">${seite(hi, weiter === 'h' && !r.tab, false)}`
                + `<span style="flex:0 0 auto;text-align:center;min-width:44px"><b>${hg}:${ag}</b>${zus ? `<div style="font-size:9px;color:var(--muted);white-space:nowrap">${zus}</div>` : ''}</span>${seite(ai, weiter === 'a' && !r.tab, true)}</div>`;
        });
    });
    const f = j.f || [];
    if (f[0]) h += `<div style="margin:14px 0 6px;padding:10px;border:2px solid var(--c-gold);border-radius:8px;text-align:center;font-weight:bold">🏆 Deutscher Amateurmeister ${y}: ${this._amDmLink(f[0], this._amDmNameIn(f[0], y))}</div>`;
    return h;
}

});
