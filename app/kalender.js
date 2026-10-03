// Saisonkalender: Datumsfeld in der Kopfzeile (#kal-chip) + Wochenraster darunter (#kal-panel).
// Konzept docs/kalender-konzept/. Daten: Engine.kalender {y, slots[ISO], liga{lid:[Termin 1..]}, pokal[6], ama[9], winter}.
// Ein Termin ist NICHT der Liga-Spieltag (App._kalInfo). Nur laufende Saison – Archiv und Altstand: Chip aus.
Object.assign(App, {
    _kalOffen: false,
    _kalEbeneAuf: null,   // Set der aufgeklappten Ebenen (ba_kal_auf), Standard: alle zu

    _kalD: function(a) { return new Date(a + 'T12:00:00'); },
    _kalKurz: function(a) { const d = this._kalD(a); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`; },
    _kalWt: function(a) { return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][this._kalD(a).getDay()]; },

    // Laenderspielpausen: Samstage zwischen erstem und letztem BL-Termin, an denen die BL frei hat
    // (ohne Pokal und Jahreswechsel). Die Engine kennt die Fenster nur in der Regel, nicht im Plan.
    _kalLsp: function() {
        const K = Engine.kalender;
        if (this._kalLspC && this._kalLspC.k === K) return this._kalLspC.s;
        const bl = K.liga['1'] || [], s = new Set();
        K.slots.forEach((a, i) => {
            const t = i + 1;
            if (this._kalD(a).getDay() !== 6 || !bl.length || t < bl[0] || t > bl[bl.length - 1]) return;
            if (bl.includes(t) || K.pokal.includes(t) || /-12-2|-12-3|-01-0/.test(a)) return;
            s.add(t);
        });
        this._kalLspC = { k: K, s };
        return s;
    },
    // Warum spielt Liga lid an Termin t nicht?
    _kalGrund: function(lid, t) {
        const K = Engine.kalender, L = K.liga[lid] || [], lv = (Engine.leagues[lid] || {}).level || 9;
        if (!L.length) return 'kein Spielplan';
        if (t < L[0]) return 'Saison beginnt erst';
        if (t > L[L.length - 1]) return 'Saison beendet';
        if (K.pokal.includes(t) && lv <= 3) return 'DFB-Pokal';
        if (this._kalLsp().has(t)) return 'Länderspielpause';
        const a = K.slots[t - 1], m = +a.slice(5, 7);
        if ((m === 12 && +a.slice(8) >= 15) || m === 1 || (m === 2 && lv >= 4)) return 'Winterpause';
        return 'spielfrei';
    },

    // Termin der aktuellen Ansicht (laufend oder per Spieltag-Auswahl) – null, wenn kein Kalender gilt
    _kalTermin: function() {
        if (this.viewHistoryOffset !== null || this.viewArchivedSeason || !Engine._kalAktiv()) return null;
        if (this.matchdayViewIdx === null) return Engine.currentMatchday;
        const e = Engine.matchdayHistory[this.matchdayViewIdx];
        return e && e.k ? e.md : null;
    },

    // Chip in der Kopfzeile; von updateStatus bei jedem Zustandswechsel gerufen
    _kalChip: function() {
        const c = document.getElementById('kal-chip');
        if (!c) return;
        const t = this._kalTermin();
        if (t === null) { c.style.display = 'none'; this._kalZu(); return; }
        const K = Engine.kalender, lid = this.activeLeague, L = K.liga[lid];
        let haupt, neben = '', aus = false;
        if (t === 0) {
            haupt = 'Saisonstart';
            const a1 = L ? K.slots[L[0] - 1] : K.slots[0];
            neben = `${L ? 'erster Spieltag' : 'erster Termin'} ${this._kalWt(a1)} ${this._kalKurz(a1)}`;
        } else {
            const a = K.slots[t - 1];
            haupt = `${this._kalWt(a)} ${this._kalKurz(a)}`;
            if (L && !L.includes(t)) {
                aus = true;
                const nx = L.find(x => x > t);
                neben = this._kalGrund(lid, t) + (nx ? ` · weiter ${this._kalWt(K.slots[nx - 1])} ${this._kalKurz(K.slots[nx - 1])}` : '');
            } else if (this._kalD(a).getDay() === 3) neben = 'englische Woche';
        }
        c.className = aus ? 'kal-aus' : '';
        c.classList.toggle('kal-auf', this._kalOffen);
        c.title = 'Saisonkalender' + (neben ? ` – ${haupt} · ${neben}` : '');
        c.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="12" rx="2"/><path d="M1.5 6h13M5 1v3M11 1v3"/></svg><b>${haupt}</b>${neben ? `<small class="kal-lang">${neben}</small>` : ''}${aus ? '<small class="kal-kurz">frei</small>' : ''}`;   // Handy: nur "frei"
        c.style.display = '';
        if (this._kalOffen) this._kalRender();
    },

    kalToggle: function(evt) {
        if (evt) evt.stopPropagation();
        this._kalOffen = !this._kalOffen;
        const p = document.getElementById('kal-panel');
        if (p) p.style.display = this._kalOffen ? 'block' : 'none';
        if (this._kalOffen) { this._kalRender(); this._kalZumTermin(); }
        const c = document.getElementById('kal-chip'); if (c) c.classList.toggle('kal-auf', this._kalOffen);
    },
    _kalZu: function() {
        this._kalOffen = false;
        const p = document.getElementById('kal-panel'); if (p) p.style.display = 'none';
    },
    // aktuellen Termin ins Bild scrollen (Raster ist breiter als der Bildschirm)
    _kalZumTermin: function() {
        const box = document.getElementById('kal-box'), th = box && box.querySelector('th.kal-cur');
        if (!box || !th) return;
        const name = box.querySelector('thead th.kal-name');
        box.scrollLeft = Math.max(0, th.offsetLeft - (name ? name.offsetWidth : 0) - box.clientWidth * 0.3);
    },

    _kalAufSet: function() {
        if (!this._kalEbeneAuf) {
            let a = [];
            try { a = JSON.parse(localStorage.getItem('ba_kal_auf') || '[]'); } catch (e) {}
            this._kalEbeneAuf = new Set(a);
        }
        return this._kalEbeneAuf;
    },
    kalEbene: function(lv) {
        const s = this._kalAufSet();
        s.has(lv) ? s.delete(lv) : s.add(lv);
        try { localStorage.setItem('ba_kal_auf', JSON.stringify([...s])); } catch (e) {}
        this._kalRender();
    },

    _kalRender: function() {
        const p = document.getElementById('kal-panel');
        const t0 = this._kalTermin();
        if (!p || t0 === null) return;
        const box0 = document.getElementById('kal-box'), sl = box0 ? box0.scrollLeft : null;
        const K = Engine.kalender, S = K.slots.length, cur = Engine.currentMatchday, sel = this.activeLeague;
        const lsp = this._kalLsp();
        const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        // Winterpause als schmale Lueckenspalte: Abstand > 14 Tage zwischen zwei Terminen
        const gapNach = new Set();
        for (let i = 1; i < S; i++) if (this._kalD(K.slots[i]) - this._kalD(K.slots[i - 1]) > 14 * 864e5) gapNach.add(i);
        const colCls = t => (this._kalD(K.slots[t - 1]).getDay() === 3 ? ' kal-mw' : '') + (lsp.has(t) ? ' kal-lsp' : '') + (t === t0 ? ' kal-cur' : '');
        const gap = '<td class="kal-gap"></td>';
        const zellen = f => { let h = ''; for (let t = 1; t <= S; t++) { h += f(t); if (gapNach.has(t)) h += gap; } return h; };
        // Kopf: Monate + Tage
        const mh = []; let last = -1;
        for (let t = 1; t <= S; t++) {
            const m = this._kalD(K.slots[t - 1]).getMonth();
            if (m !== last) { mh.push([MON[m], 0]); last = m; }
            mh[mh.length - 1][1] += 1 + (gapNach.has(t) ? 1 : 0);
        }
        const tage = zellen(t => { const a = K.slots[t - 1];
            return `<th class="${colCls(t)}" title="${this._kalWt(a)} ${this._kalKurz(a)}${lsp.has(t) ? ' · Länderspielpause' : ''}">${+a.slice(8)}<small>${this._kalD(a).getDay() === 3 ? 'Mi' : ''}</small></th>`; })
            .replace(/<td class="kal-gap"><\/td>/g, '<th class="kal-gap" title="Winterpause"></th>');
        // Liga-Zeile: Zahl = Liga-Spieltag, gespielt / naechster / geplant
        const ligaZeile = (lid, cls) => {
            const L = K.liga[lid] || [], nx = L.find(x => x > cur);
            const z = zellen(t => {
                const k = L.indexOf(t) + 1;
                let c = 'kal-c' + colCls(t);
                if (k) c += t <= cur ? ' kal-gesp' : t === nx ? ' kal-next' : ' kal-plan';
                return `<td class="${c}" data-t="${t}"><span>${k || ''}</span></td>`;
            });
            return `<tr class="${cls}${lid === sel ? ' kal-sel' : ''}" data-l="${lid}"><td class="kal-name" title="${this._attr(this._leagueName(lid))}">${this._leagueName(lid)}</td>${z}</tr>`;
        };
        const pokalZeile = (name, T, K2, key, cls) => {
            const nx = T.find(x => x > cur);
            const z = zellen(t => { const k = T.indexOf(t); let c = 'kal-c' + colCls(t);
                if (k >= 0) c += ' kal-cup' + (t <= cur ? ' kal-gesp' : t === nx ? ' kal-next' : '');
                return `<td class="${c}" data-t="${t}"><span>${k >= 0 ? K2[k] || (k + 1) : ''}</span></td>`; });
            return `<tr class="${cls}" data-c="${key}"><td class="kal-name">${name}</td>${z}</tr>`;
        };
        const ebenen = {};
        Object.keys(K.liga).forEach(lid => { const lv = (Engine.leagues[lid] || {}).level; if (lv) (ebenen[lv] = ebenen[lv] || []).push(lid); });
        const top = ['1', '2', '3'].filter(l => K.liga[l]);
        // Text in eigenem Sticky-Span: die Zelle selbst spannt die ganze Breite und scrollt sonst mit weg
        const grp = txt => `<tr class="kal-grp"><th colspan="${S + gapNach.size + 1}"><span>${txt}</span></th></tr>`;
        let body = grp('Im Blick');
        top.forEach(l => body += ligaZeile(l, 'kal-top'));
        body += pokalZeile('DFB-Pokal', K.pokal, ['1', '2', 'AF', 'VF', 'HF', 'F'], 'dfb', 'kal-top kal-pokal');
        if (K.liga[sel] && !top.includes(sel)) body += ligaZeile(sel, '');
        body += grp('Weitere Wettbewerbe');
        body += pokalZeile('Amateurpokal', K.ama || [], [], 'ama', 'kal-pokal');
        const auf = this._kalAufSet();
        Object.keys(ebenen).map(Number).filter(lv => lv >= 4).sort((a, b) => a - b).forEach(lv => {
            const ids = ebenen[lv], offen = auf.has(lv);
            // Sammelzeile: wie viele Ligen der Ebene an diesem Termin spielen
            const z = zellen(t => { const n = ids.filter(l => K.liga[l].includes(t)).length;
                return `<td class="kal-c kal-sum${colCls(t)}${n ? (t <= cur ? ' kal-gesp' : ' kal-plan') : ''}" data-t="${t}" title="${n} von ${ids.length} Ligen"><span>${n || ''}</span></td>`; });
            body += `<tr class="kal-ebene" data-e="${lv}"><td class="kal-name" onclick="App.kalEbene(${lv})">${offen ? '▾' : '▸'} Ebene ${lv} <small>${ids.length} Ligen</small></td>${z}</tr>`;
            if (offen) ids.forEach(l => body += ligaZeile(l, 'kal-sub'));
        });
        // Kopfzeile des Panels: Termin + Lage der gewaehlten Liga
        let wann;
        if (t0 === 0) wann = `Saisonstart <small>erster Termin ${this._kalWt(K.slots[0])} ${this._kalKurz(K.slots[0])}</small>`;
        else {
            const a = K.slots[t0 - 1], L = K.liga[sel], k = L ? L.indexOf(t0) + 1 : 0, nx = L && L.find(x => x > t0);
            wann = `${this._kalWt(a)} ${this._kalKurz(a)} <small>${L ? `${this._leagueName(sel)}: ${k ? k + '. Spieltag' : this._kalGrund(sel, t0) + (nx ? ` · weiter ${this._kalWt(K.slots[nx - 1])} ${this._kalKurz(K.slots[nx - 1])}` : '')}` : `Termin ${t0} von ${S}`}</small>`;
        }
        p.innerHTML = `<div class="kal-hd"><span class="kal-wann">${wann}</span><span class="kal-titel">Kalender ${Engine.getFormattedSeason()}</span><button class="kal-x" onclick="App.kalToggle(event)" title="Schließen">✕</button></div>
            <div class="kal-box" id="kal-box"><table class="kal"><thead><tr class="kal-m"><th class="kal-name"></th>${mh.map(([m, n]) => `<th colspan="${n}">${m}</th>`).join('')}</tr><tr class="kal-d"><th class="kal-name"></th>${tage}</tr></thead><tbody>${body}</tbody></table></div>
            <div class="kal-info" id="kal-info">Feld antippen: Spieltag öffnen · Liganame: Liga wählen</div>
            <div class="kal-leg"><span><i class="kal-sw kal-sw-g"></i>gespielt</span><span><i class="kal-sw kal-sw-n"></i>nächster Spieltag</span><span><i class="kal-sw kal-sw-p"></i>geplant</span><span><i class="kal-sw kal-sw-c"></i>Pokalrunde</span><span><i class="kal-sw kal-sw-l"></i>Länderspielpause</span><span><i class="kal-sw kal-sw-m"></i>Mittwoch</span></div>`;
        const box = document.getElementById('kal-box');
        box.onclick = e => this._kalKlick(e);
        if (sl !== null) box.scrollLeft = sl;
    },

    // Klick ins Raster: Liganame waehlt die Liga, gespieltes Feld oeffnet den Spieltag, Pokal den Pokal
    _kalKlick: function(e) {
        const tr = e.target.closest('tr'), td = e.target.closest('td');
        if (!tr || !td) return;
        const K = Engine.kalender, info = document.getElementById('kal-info');
        if (td.classList.contains('kal-name')) {
            if (tr.dataset.l) { this.matchdayViewIdx = null; this.tsView = null; this.loadLeague(tr.dataset.l); this.updateStatus(); }
            else if (tr.dataset.c === 'dfb') { this.showPokal(); this.updateStatus(); }
            else if (tr.dataset.c === 'ama') { this.showAmateurpokal(); this.updateStatus(); }
            return;
        }
        const t = +td.dataset.t;
        if (!t) return;
        const a = K.slots[t - 1], wann = `${this._kalWt(a)} ${this._kalKurz(a)}${this._kalD(a).getDay() === 3 ? ' (englische Woche)' : ''}`;
        const idx = Engine.matchdayHistory.findIndex(x => x && x.k && x.md === t);
        if (tr.dataset.l) {
            const lid = tr.dataset.l, k = (K.liga[lid] || []).indexOf(t) + 1;
            if (k && t <= Engine.currentMatchday && idx >= 0) {
                this.tsView = null; this.zonesCache = null;
                if (this.activeLeague !== lid) this.loadLeague(lid);
                this._selectMatchday(idx);
                return;
            }
            if (info) info.innerHTML = `<b>${this._leagueName(lid)}</b> · ${k ? `${k}. Spieltag · ${wann} · ${t <= Engine.currentMatchday ? 'gespielt' : 'geplant'}` : `${wann} · ${this._kalGrund(lid, t)}`}`;
            return;
        }
        if (tr.dataset.c) {
            const dfb = tr.dataset.c === 'dfb', T = dfb ? K.pokal : (K.ama || []), k = T.indexOf(t);
            const R = dfb ? (Engine.pokal && Engine.pokal.rounds) : (Engine.amateurpokal && Engine.amateurpokal.rounds);
            if (k >= 0 && t <= Engine.currentMatchday) { dfb ? this.showPokal() : this.showAmateurpokal(); this.updateStatus(); return; }
            if (info) info.innerHTML = `<b>${dfb ? 'DFB-Pokal' : 'Amateurpokal'}</b> · ${wann} · ${k >= 0 ? `${(R && R[k] && R[k].name) || (k + 1) + '. Runde'} · geplant` : 'keine Runde'}`;
            return;
        }
        if (tr.dataset.e) {
            const ids = Object.keys(K.liga).filter(l => (Engine.leagues[l] || {}).level === +tr.dataset.e);
            const n = ids.filter(l => K.liga[l].includes(t)).length;
            if (info) info.innerHTML = `<b>Ebene ${tr.dataset.e}</b> · ${wann} · ${n} von ${ids.length} Ligen spielen`;
        }
    },
});
