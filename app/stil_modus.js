// ── STIL-MODUS ───────────────────────────────────────────────────────────────
// Namen (voll / mittel / kurz) und Schrift der Liga-Navigation und der Seitenleiste direkt am echten Spiel einstellen
// (Nutzerwunsch 26.09.2026: „so kann ich direkt sehen, wie es im Spiel aussehen würde, anstatt dir ständig das und das zu
// sagen“). Ersetzt den alten tools/liga-kuerzel-editor.html, der das Spiel nur NACHBAUTE.
//
//   template.html?stil          Editor: Bedienleiste + Einstellungen + das Spiel in einem Rahmen in Gerätebreite
//   template.html?stilvorschau  das Spiel im Rahmen – EINGEFROREN: nur Hover, keine Klicks; schreibt nichts (Wächter im
//                               <head> von template.html, in idb_store.js writeTx und initTabLock)
//
// Einstellungen: je Liga mittel/kurz; je Geschwisterblock (alle Ligen mit derselben Liga darüber, „p:<Liga darüber>“)
// Schrift für Handy und Desktop, nur Handy „…“ und ↑/↓-Pfeile; Seitenleiste eine Schrift je Gerät. Der ungespeicherte
// Entwurf liegt in localStorage 'ba_stil_entwurf'; „Speichern“ schreibt app/nav_stil.js – danach baut Claude.
Object.assign(App, {

STIL_GERAETE: [
    { name: 'Handy 360', b: 360, h: 760 }, { name: 'Handy XL 430', b: 430, h: 900 }, { name: 'Tablet 820', b: 820, h: 1100 },
    { name: 'Desktop 1280', b: 1280, h: 800 }, { name: 'Desktop 1560', b: 1560, h: 900 }],

// Aus dem Spiel (··· → 🎨 Stil-Modus): eigener Tab, das Spiel bleibt offen
stilModusOeffnen: function() { window.open(location.pathname + '?stil', '_blank'); },

_stilEntwurfLaden: function() { try { return JSON.parse(localStorage.getItem('ba_stil_entwurf') || 'null') || {}; } catch (e) { return {}; } },
_stilEntwurfSichern: function() { try { localStorage.setItem('ba_stil_entwurf', JSON.stringify(this._stilEntwurf)); } catch (e) {} },

// ---------- Vorschau (im Rahmen) ----------
_stilVorschauStart: function() {
    this._stilEntwurf = this._stilEntwurfLaden(); this._navStilCache = null;
    // Einfrieren: Eingaben abfangen, bevor sie ein onclick erreichen – Hover bleibt, Mausrad scrollt weiter. Die Vorschau wird
    // nur per Nachricht aus dem Editor gesteuert (App-Aufrufe, keine Ereignisse).
    // jedes Ereignis – echte wie künstliche; nur der Griff der Seitenleiste bleibt ziehbar (Breite gilt nur hier:
    // localStorage ist in der Vorschau schreibgeschützt, das Spiel behält seine eigene Breite)
    const sperre = e => { if (e.target && e.target.closest && e.target.closest('#sidebar-resizer')) return; e.stopPropagation(); e.preventDefault(); };
    ['click', 'dblclick', 'pointerdown', 'mousedown', 'keydown', 'contextmenu', 'submit'].forEach(t => document.addEventListener(t, sperre, true));
    window.addEventListener('message', e => this._stilNachricht(e.data));
    if (window.parent !== window) window.parent.postMessage({ typ: 'stil-bereit' }, '*');
},
_stilNachricht: function(d) {
    if (!d || !d.typ) return;
    if (d.typ === 'entwurf') { this._stilEntwurf = d.entwurf || {}; this._navStilCache = null; this.renderSidebar(); this._stilNeuZeichnen(); }
    if (d.typ === 'zeige') { this._stilZiel = { lid: d.lid, y: d.y }; this._stilNeuZeichnen(); }
    if (d.typ === 'seitenleiste') {
        const sb = document.getElementById('sidebar'), ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.toggle('open', !!d.offen); if (ov) ov.classList.toggle('visible', !!d.offen);
        this._stilBericht();
    }
},
_stilNeuZeichnen: function() {
    const z = this._stilZiel;
    if (z && z.lid) {
        this.tableView = 'gesamt'; this.viewHistoryOffset = null;
        this.viewArchivedSeason = (!z.y || z.y === 'live') ? null : { y: z.y, lid: z.lid };
        this.loadLeague(z.lid);
    } else if (this.activeLeague) this.loadLeague(this.activeLeague);
},
// Welche Form zeigt jeder Knopf / jeder Seitenleisten-Eintrag gerade? → an den Editor (nach jedem _navFit/_fitSidebarLabels)
_stilBericht: function() {
    if (!window.STIL_VORSCHAU || window.parent === window) return;
    clearTimeout(this._stilBerichtT);
    this._stilBerichtT = setTimeout(() => {
        const reihen = [...document.querySelectorAll('.navleiste .navrow[data-block]')].map(r => {
            const kn = [...r.querySelectorAll('[data-lid]')];
            return { block: r.dataset.block, ids: kn.map(b => b.dataset.lid), formen: Object.fromEntries(kn.map(b => [b.dataset.lid, b.dataset.form || ''])),
                zeilen: new Set([...r.querySelectorAll('.btn')].map(b => b.offsetTop)).size, eng: r.classList.contains('eng') };
        });
        const sb = {};
        document.querySelectorAll('#league-list .league-item[data-lid]').forEach(it => { sb[it.dataset.lid] = it.dataset.form || ''; });
        window.parent.postMessage({ typ: 'stil-bericht', geraet: this._navGeraet(), reihen, seitenleiste: sb }, '*');
    }, 80);
},

// ---------- Editor ----------
_stilEditorStart: function() {
    this._stilEntwurf = this._stilEntwurfLaden(); this._navStilCache = null;
    let z = null; try { z = JSON.parse(localStorage.getItem('ba_stil_ansicht') || 'null'); } catch (e) {}
    this._stilZ = Object.assign({ lid: '5-2', y: 'live', geraet: 0, sb: false }, z || {});
    ['sidebar', 'main', 'sidebar-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.title = 'Stil-Modus – Bundesliga Mobile';
    const css = document.createElement('style');
    css.textContent = `
        #stil-shell { position: fixed; inset: 0; display: flex; flex-direction: column; background: #0e0e0e; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; z-index: 1000; }
        .stil-kopf { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; background: #181818; border-bottom: 1px solid #333; font-size: 13px; }
        .stil-kopf b { font-size: 15px; margin-right: 6px; }
        .stil-kopf button, .stil-kopf select { background: #232323; color: #e0e0e0; border: 1px solid #3a3a3a; border-radius: 5px; padding: 4px 9px; font-size: 12px; cursor: pointer; }
        .stil-kopf button.an { background: #90caf9; color: #000; border-color: #90caf9; }
        .stil-kopf .stil-trenn { width: 1px; height: 20px; background: #333; }
        .stil-kopf .stil-speichern { background: #2e7d32; border-color: #43a047; color: #fff; font-weight: bold; }
        .stil-kopf .stil-meldung { color: #9ccc65; font-size: 12px; }
        .stil-koerper { flex: 1; display: flex; min-height: 0; }
        .stil-buehne { flex: 1; min-width: 0; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; padding: 12px; background: repeating-conic-gradient(#141414 0 25%, #111 0 50%) 0 0/24px 24px; }
        .stil-rahmen { position: relative; box-shadow: 0 0 0 1px #444, 0 8px 30px rgba(0,0,0,.6); background: #121212; }
        .stil-rahmen iframe { position: absolute; left: 0; top: 0; border: 0; transform-origin: 0 0; background: #121212; }
        .stil-rahmen .stil-mass { position: absolute; top: -18px; left: 0; font-size: 11px; color: #888; white-space: nowrap; }
        .stil-griff { position: absolute; top: 0; right: -14px; width: 14px; height: 100%; cursor: ew-resize; display: flex; align-items: center; justify-content: center; touch-action: none; }
        .stil-griff::before { content: ''; width: 4px; height: 60px; border-radius: 2px; background: #90caf9; opacity: .7; }
        .stil-griff:hover::before, .stil-griff.zieht::before { opacity: 1; }
        .stil-zieht iframe { pointer-events: none; }
        .stil-panel { width: 520px; flex-shrink: 0; overflow-y: auto; border-left: 1px solid #333; background: #141414; padding: 10px 12px 60px; font-size: 13px; }
        .stil-panel h3 { font-size: 13px; color: #90caf9; margin: 14px 0 6px; font-weight: 600; }
        .stil-block { border: 1px solid #2c2c2c; border-radius: 6px; margin-bottom: 10px; background: #181818; }
        .stil-block-kopf { padding: 6px 8px; border-bottom: 1px solid #262626; display: flex; justify-content: space-between; gap: 8px; }
        .stil-block-kopf span { color: #888; font-size: 11px; }
        .stil-regler { padding: 6px 8px; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; font-size: 12px; color: #bbb; border-bottom: 1px solid #262626; }
        .stil-regler input[type=number] { width: 58px; background: #1d1d1d; color: #fff; border: 1px solid #3a3a3a; border-radius: 4px; padding: 2px 4px; }
        .stil-block table { width: 100%; border-collapse: collapse; }
        .stil-block td { padding: 3px 6px; border-top: 1px solid #202020; vertical-align: middle; }
        .stil-block td.voll { color: #bbb; font-size: 12px; width: 36%; } .stil-block td.voll small { color: #555; margin-left: 4px; font-size: 10px; }
        .stil-block td input[type=text] { width: 100%; box-sizing: border-box; background: #1d1d1d; color: #fff; border: 1px solid #333; border-radius: 4px; padding: 3px 6px; font-size: 12px; }
        .stil-block td input.unnoetig { opacity: .35; }
        .stil-form { font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
        .stil-form.voll { background: #1b5e20; } .stil-form.mittel { background: #0d47a1; } .stil-form.kurz { background: #8a6d00; } .stil-form.zulang { background: #b71c1c; }
        .stil-hinweis { color: #888; font-size: 11px; line-height: 1.4; }`;
    document.head.appendChild(css);
    const G = this.STIL_GERAETE;
    const wrap = document.createElement('div'); wrap.id = 'stil-shell';
    wrap.innerHTML = `
        <div class="stil-kopf">
            <b>🎨 Stil-Modus</b>
            ${G.map((g, i) => `<button data-geraet="${i}">${g.name}</button>`).join('')}
            <span class="stil-trenn"></span>
            <label>Liga <select id="stil-liga"></select></label>
            <label>Saison <select id="stil-saison"></select></label>
            <label title="Auf dem Handy liegt die Seitenleiste als Schublade über dem Spiel"><input type="checkbox" id="stil-sb"> Seitenleiste zeigen (Handy/Tablet)</label>
            <span class="stil-trenn"></span>
            <button class="stil-speichern" id="stil-speichern">💾 Speichern (app/nav_stil.js)</button>
            <button id="stil-verwerfen">Entwurf verwerfen</button>
            <button id="stil-zurueck">Zurück zum Spiel</button>
            <span class="stil-meldung" id="stil-meldung"></span>
        </div>
        <div class="stil-koerper">
            <div class="stil-buehne" id="stil-buehne"><div class="stil-rahmen" id="stil-rahmen"><span class="stil-mass" id="stil-mass"></span><iframe id="stil-vorschau" src="${location.pathname}?stilvorschau"></iframe><div class="stil-griff" id="stil-griff" title="Ziehen: Breite frei einstellen"></div></div></div>
            <div class="stil-panel" id="stil-panel"><div class="stil-hinweis">Vorschau lädt …</div></div>
        </div>`;
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-geraet]').forEach(b => b.onclick = () => { this._stilZ.geraet = +b.dataset.geraet; this._stilZ.breite = null; this._stilAnsichtSichern(); this._stilGeraet(); });
    this._stilGriff();
    document.getElementById('stil-liga').onchange = e => { this._stilZ.lid = e.target.value; this._stilZ.y = null; this._stilSaisons(); };
    document.getElementById('stil-saison').onchange = e => { this._stilZ.y = e.target.value; this._stilAnsichtSichern(); this._stilSende('zeige'); };
    const sb = document.getElementById('stil-sb'); sb.checked = !!this._stilZ.sb;
    sb.onchange = () => { this._stilZ.sb = sb.checked; this._stilAnsichtSichern(); this._stilSende('seitenleiste'); };
    document.getElementById('stil-speichern').onclick = () => this._stilSpeichern();
    document.getElementById('stil-verwerfen').onclick = () => { if (!confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
        this._stilEntwurf = {}; this._navStilCache = null; this._stilEntwurfSichern(); this._stilPanelSig = null; this._stilSende('entwurf'); };
    document.getElementById('stil-zurueck').onclick = () => { location.href = location.pathname; };
    const panel = document.getElementById('stil-panel');
    panel.addEventListener('input', e => this._stilEingabe(e.target));
    panel.addEventListener('change', e => { if (e.target.type === 'checkbox') this._stilEingabe(e.target); });
    window.addEventListener('message', e => { const d = e.data || {};
        if (d.typ === 'stil-bereit') { this._stilSende('entwurf'); this._stilSende('zeige'); this._stilSende('seitenleiste'); }
        if (d.typ === 'stil-bericht') { this._stilB = d; this._stilPanel(); } });
    window.addEventListener('resize', () => this._stilGeraet());
    this._stilLigen(); this._stilGeraet();
},
_stilAnsichtSichern: function() { try { localStorage.setItem('ba_stil_ansicht', JSON.stringify(this._stilZ)); } catch (e) {} },

// Gerät: Rahmen in echter Breite, auf die Bühne verkleinert (nie vergrößert)
// Höhe zur frei gezogenen Breite: handyhoch, tablethoch oder Bildschirm
_stilHoehe: function(b) { return b <= 500 ? 760 : b <= 1000 ? 1000 : 850; },
_stilMass: function() {
    const frei = this._stilZ.breite;
    if (frei) return { name: 'frei', b: frei, h: this._stilHoehe(frei) };
    return this.STIL_GERAETE[this._stilZ.geraet] || this.STIL_GERAETE[0];
},
_stilGeraet: function(festerMassstab) {
    const g = this._stilMass();
    document.querySelectorAll('#stil-shell [data-geraet]').forEach(b => b.classList.toggle('an', !this._stilZ.breite && +b.dataset.geraet === this._stilZ.geraet));
    const buehne = document.getElementById('stil-buehne'), rahmen = document.getElementById('stil-rahmen'), fr = document.getElementById('stil-vorschau');
    if (!buehne || !fr) return;
    // Beim Ziehen bleibt der Maßstab stehen (sonst liefe der Griff der Maus davon); danach wird neu eingepasst
    const s = festerMassstab || Math.min(1, (buehne.clientWidth - 40) / g.b, (buehne.clientHeight - 40) / g.h);
    this._stilMassstab = s;
    fr.style.width = g.b + 'px'; fr.style.height = g.h + 'px'; fr.style.transform = `scale(${s})`;
    rahmen.style.width = Math.round(g.b * s) + 'px'; rahmen.style.height = Math.round(g.h * s) + 'px'; rahmen.style.marginTop = '20px';
    document.getElementById('stil-mass').textContent = `${g.name === 'frei' ? 'frei gezogen' : g.name} · ${g.b}×${g.h} px · ${g.b <= 768 ? 'Handy-Darstellung' : 'Desktop-Darstellung'}${s < 1 ? ` · verkleinert auf ${Math.round(s * 100)} %` : ''}`;
    this._stilPanelSig = null;   // Gerät gewechselt → Panel neu (andere Formen, andere Schrift-Felder)
},

// Freies Ziehen der Breite (Nutzerwunsch 27.09.2026): alle drei Namen je nach Breite in Aktion sehen. 300–1800 px;
// die Vorschau misst dabei live nach (ihr eigener resize-Handler), das Panel folgt über den Bericht.
_stilGriff: function() {
    const griff = document.getElementById('stil-griff'); if (!griff) return;
    griff.addEventListener('pointerdown', e => {
        e.preventDefault(); griff.setPointerCapture(e.pointerId);
        const start = e.clientX, b0 = this._stilMass().b, s = this._stilMassstab || 1;
        griff.classList.add('zieht'); document.getElementById('stil-shell').classList.add('stil-zieht');
        const bewege = ev => { this._stilZ.breite = Math.round(Math.max(300, Math.min(1800, b0 + (ev.clientX - start) / s))); this._stilGeraet(s); };
        const los = () => { griff.onpointermove = null; griff.onpointerup = null; griff.classList.remove('zieht');
            document.getElementById('stil-shell').classList.remove('stil-zieht'); this._stilAnsichtSichern(); this._stilGeraet(); };
        griff.onpointermove = bewege; griff.onpointerup = los;
    });
},

// Liga-Auswahl: Spielligen, dann historische Ligen; Saison-Auswahl je Liga (Tabellen aus Seed + HistExt)
_stilLigen: function() {
    const sel = document.getElementById('stil-liga');
    const spiel = Object.values(GAME_DATA.leagues).sort((a, b) => a.level - b.level || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const hist = typeof HIST_ARCHIVE_LEAGUES !== 'undefined' ? Object.values(HIST_ARCHIVE_LEAGUES).sort((a, b) => (a.gebiet === 'DDR') - (b.gebiet === 'DDR') || a.firstYear - b.firstYear || a.level - b.level || (a.ord || 0) - (b.ord || 0)) : [];
    sel.innerHTML = `<optgroup label="Spielligen">${spiel.map(l => `<option value="${l.id}">${l.id} · ${l.name}</option>`).join('')}</optgroup>`
        + `<optgroup label="Historische Ligen">${hist.map(h => `<option value="${h.id}">${h.name} (${h.firstYear}–${h.lastYear})</option>`).join('')}</optgroup>`;
    sel.value = this._stilZ.lid;
    this._stilSaisons();
},
_stilSaisons: function() {
    const lid = this._stilZ.lid, sel = document.getElementById('stil-saison');
    const jahre = new Set();
    if (typeof HISTORY_SEED !== 'undefined') HISTORY_SEED.seasons.forEach(s => { if (s.lid === lid) jahre.add(s.y); });
    const fertig = () => {
        const liste = [...jahre].sort((a, b) => parseInt(b) - parseInt(a));
        const live = !this._histLeague(lid);
        sel.innerHTML = (live ? '<option value="live">laufende Saison</option>' : '') + liste.map(y => `<option value="${y}">${y}</option>`).join('');
        if (!this._stilZ.y || ![...sel.options].some(o => o.value === this._stilZ.y)) this._stilZ.y = sel.options[0] ? sel.options[0].value : 'live';
        sel.value = this._stilZ.y; this._stilAnsichtSichern(); this._stilSende('zeige');
    };
    if (typeof HistExt === 'undefined') return fertig();
    HistExt.load().then(idx => { ((idx && idx.byLid[lid]) || []).forEach(r => jahre.add(r.y)); fertig(); }, fertig);
},

_stilSende: function(was) {
    const fr = document.getElementById('stil-vorschau'); if (!fr || !fr.contentWindow) return;
    const w = fr.contentWindow;
    if (was === 'entwurf') w.postMessage({ typ: 'entwurf', entwurf: this._stilEntwurf }, '*');
    if (was === 'zeige') w.postMessage({ typ: 'zeige', lid: this._stilZ.lid, y: this._stilZ.y }, '*');
    if (was === 'seitenleiste') w.postMessage({ typ: 'seitenleiste', offen: !!this._stilZ.sb }, '*');
},

_stilBlockName: function(key) {
    const k = String(key || '').slice(2); if (!k || k === '-') return 'oberste Ebene';
    const [lid, g] = k.split('#');
    const l = (typeof HIST_ARCHIVE_LEAGUES !== 'undefined' && HIST_ARCHIVE_LEAGUES[lid]) || GAME_DATA.leagues[lid];
    const n = (l && l.name) || { '1': '1. Bundesliga', '2': '2. Bundesliga', '3': '3. Liga' }[lid] || lid;
    return 'unter ' + n + (g ? (/^[A-Z0-9]$/.test(g) ? ' Staffel ' + g : ' ' + g) : '');
},
_stilLigaName: function(lid) {
    const l = (typeof HIST_ARCHIVE_LEAGUES !== 'undefined' && HIST_ARCHIVE_LEAGUES[lid]) || GAME_DATA.leagues[lid];
    return (l && l.name) || { '1': '1. Bundesliga', '2': '2. Bundesliga', '3': '3. Liga' }[lid] || lid;
},
_stilForm: function(f) {
    if (!f) return '';
    if (f.includes('✂')) return '<span class="stil-form zulang" title="Selbst die Kurzform ist zu lang – wird mit … abgeschnitten">zu lang</span>';
    return `<span class="stil-form ${f}">${f}</span>`;
},

// Panel: Blöcke der aktuellen Ansicht + Seitenleiste. Beim Tippen NICHT neu aufbauen (Fokus), nur die Formen auffrischen.
_stilPanel: function() {
    const b = this._stilB, el = document.getElementById('stil-panel'); if (!b || !el) return;
    const geraet = b.geraet, st = this._navStil();
    const bloecke = []; const idx = {};
    b.reihen.forEach(r => { let x = idx[r.block]; if (!x) { x = idx[r.block] = { block: r.block, ids: [], formen: {}, zeilen: 0, eng: false }; bloecke.push(x); }
        r.ids.forEach(id => { if (!x.ids.includes(id)) x.ids.push(id); }); Object.assign(x.formen, r.formen); x.zeilen = Math.max(x.zeilen, r.zeilen); x.eng = x.eng || r.eng; });
    const sbKurz = Object.keys(b.seitenleiste).filter(id => b.seitenleiste[id] && b.seitenleiste[id] !== 'voll');
    const sig = geraet + '|' + bloecke.map(x => x.block + ':' + x.ids.join(',')).join(';') + '|' + sbKurz.join(',');
    if (sig === this._stilPanelSig) { this._stilFormenAuffrischen(bloecke, b.seitenleiste); return; }
    this._stilPanelSig = sig;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const namenZeile = (id, form) => {
        const m = (st.mittel || {})[id] || '', k = (st.kurz || {})[id] || '', unn = form === 'voll' ? ' unnoetig' : '';
        return `<tr data-lid="${id}"><td class="voll">${esc(this._stilLigaName(id))}<small>${esc(id)}</small></td>`
            + `<td><input type="text" data-name="mittel" data-lid="${id}" class="${unn}" value="${esc(m)}" placeholder="${esc(this._nameMittelAuto(id))}" title="mittel – leer = automatisch"></td>`
            + `<td><input type="text" data-name="kurz" data-lid="${id}" class="${unn}" value="${esc(k)}" placeholder="${esc(this._nameKurzAuto(id))}" title="kurz – leer = automatisch"></td>`
            + `<td class="form" data-form-lid="${id}">${this._stilForm(form)}</td></tr>`;
    };
    const wert = (blk, gr, feld) => ((((st.bloecke || {})[blk] || {})[gr] || {})[feld]);
    const standard = gr => gr === 'handy' ? 10 : 13;
    let h = `<div class="stil-hinweis">Gerät: <b>${geraet === 'handy' ? 'Handy' : 'Desktop'}</b> · Formen: <span class="stil-form voll">voll</span> <span class="stil-form mittel">mittel</span> <span class="stil-form kurz">kurz</span> <span class="stil-form zulang">zu lang</span> · blasse Felder = auf diesem Gerät nicht nötig. Leeres Feld = automatische Form (grau).</div>`;
    h += `<h3>Liga-Navigation – Geschwisterblöcke in dieser Ansicht</h3>`;
    bloecke.forEach(x => {
        const pf = wert(x.block, 'handy', 'pfeile') !== false, pu = wert(x.block, 'handy', 'punkte') !== false;
        h += `<div class="stil-block"><div class="stil-block-kopf"><b>${esc(this._stilBlockName(x.block))}</b><span>${x.ids.length} Liga${x.ids.length === 1 ? '' : 'en'}${x.zeilen > 1 ? ` · ${x.zeilen} Zeilen` : ''}${x.eng ? ' · automatisch verkleinert' : ''}</span></div>`
            + `<div class="stil-regler">Schrift Handy <input type="number" min="6" max="20" step="0.5" data-block="${esc(x.block)}" data-feld="handy.schrift" value="${wert(x.block, 'handy', 'schrift') || ''}" placeholder="auto ${standard('handy')}"> px`
            + ` · Desktop <input type="number" min="6" max="24" step="0.5" data-block="${esc(x.block)}" data-feld="desktop.schrift" value="${wert(x.block, 'desktop', 'schrift') || ''}" placeholder="auto ${standard('desktop')}"> px`
            + ` · Handy: <label><input type="checkbox" data-block="${esc(x.block)}" data-feld="handy.punkte" ${pu ? 'checked' : ''}> „…“</label>`
            + ` <label><input type="checkbox" data-block="${esc(x.block)}" data-feld="handy.pfeile" ${pf ? 'checked' : ''}> ↑↓</label></div>`
            + `<table>${x.ids.map(id => namenZeile(id, x.formen[id])).join('')}</table></div>`;
    });
    const sbw = gr => (st.seitenleiste || {})[gr] || '';
    h += `<h3>Seitenleiste</h3><div class="stil-block"><div class="stil-regler">Schrift (alle Einträge gleich) Handy <input type="number" min="8" max="22" step="0.5" data-sb="handy" value="${sbw('handy')}" placeholder="auto 14"> px`
        + ` · Desktop <input type="number" min="8" max="22" step="0.5" data-sb="desktop" value="${sbw('desktop')}" placeholder="auto 14"> px</div>`
        + (sbKurz.length ? `<table>${sbKurz.map(id => namenZeile(id, b.seitenleiste[id])).join('')}</table>`
            : `<div class="stil-hinweis" style="padding:6px 8px">Alle sichtbaren Einträge stehen ausgeschrieben.</div>`) + `</div>`;
    h += `<div class="stil-hinweis">Die Seitenleiste listet nur Einträge, die auf diesem Gerät nicht voll passen. Historische Ligen erscheinen dort erst, wenn ihre Gruppe im Spiel aufgeklappt ist.</div>`;
    el.innerHTML = h;
},
_stilFormenAuffrischen: function(bloecke, sb) {
    const formen = {}; bloecke.forEach(x => Object.assign(formen, x.formen));
    document.querySelectorAll('#stil-panel [data-form-lid]').forEach(td => {
        const id = td.dataset.formLid, inBlock = td.closest('.stil-block') && td.closest('.stil-block').querySelector('[data-block]');
        const f = inBlock ? formen[id] : sb[id]; td.innerHTML = this._stilForm(f);
        td.parentElement.querySelectorAll('input[type=text]').forEach(i => i.classList.toggle('unnoetig', f === 'voll'));
    });
},

// Eingabe → Entwurf → Vorschau (verzögert, damit nicht jeder Tastendruck neu zeichnet)
_stilEingabe: function(t) {
    const e = this._stilEntwurf;
    if (t.dataset.name) {
        const art = t.dataset.name, lid = t.dataset.lid, v = t.value.trim();
        e[art] = e[art] || {};
        if (v) e[art][lid] = v; else delete e[art][lid];
        // leeres Feld heißt „automatisch“ – auch ein gespeicherter Eintrag muss dann weichen
        if (!v && typeof NAV_STIL !== 'undefined' && (NAV_STIL[art] || {})[lid]) e[art][lid] = '';
    } else if (t.dataset.feld) {
        const [gr, feld] = t.dataset.feld.split('.'), blk = t.dataset.block;
        e.bloecke = e.bloecke || {}; e.bloecke[blk] = e.bloecke[blk] || {}; e.bloecke[blk][gr] = e.bloecke[blk][gr] || {};
        const ziel = e.bloecke[blk][gr];
        if (t.type === 'checkbox') { if (t.checked) ziel[feld] = true; else ziel[feld] = false; }
        else { const n = parseFloat(t.value); if (n > 0) ziel[feld] = n; else ziel[feld] = null; }
    } else if (t.dataset.sb) {
        e.seitenleiste = e.seitenleiste || {}; const n = parseFloat(t.value);
        e.seitenleiste[t.dataset.sb] = n > 0 ? n : null;
    } else return;
    this._navStilCache = null; this._stilEntwurfSichern();
    clearTimeout(this._stilSendeT); this._stilSendeT = setTimeout(() => this._stilSende('entwurf'), 150);
},

// Speichern: vollständige app/nav_stil.js (Spielstand + Entwurf), bereinigt um leere Werte
_stilDateiText: function() {
    const s = this._navStil(), sauber = o => { const r = {}; Object.keys(o || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(k => { if (o[k]) r[k] = o[k]; }); return r; };
    const bl = {};
    Object.keys(s.bloecke || {}).sort().forEach(k => { const b = s.bloecke[k], x = {};
        ['handy', 'desktop'].forEach(gr => { const g = b[gr] || {}, y = {};
            if (g.schrift) y.schrift = g.schrift;
            if (gr === 'handy' && g.punkte === false) y.punkte = false;
            if (gr === 'handy' && g.pfeile === false) y.pfeile = false;
            if (Object.keys(y).length) x[gr] = y; });
        if (Object.keys(x).length) bl[k] = x; });
    const sl = {}; ['handy', 'desktop'].forEach(gr => { if ((s.seitenleiste || {})[gr]) sl[gr] = s.seitenleiste[gr]; });
    const daten = { version: 1, mittel: sauber(s.mittel), kurz: sauber(s.kurz), bloecke: bl, seitenleiste: sl };
    return '// Namen und Schrift der Liga-Navigation und der Seitenleiste (drei Namen je Liga: voll = offiziell, mittel, kurz).\n'
        + '// GESCHRIEBEN VOM STIL-MODUS (··· → 🎨 Stil-Modus → Speichern) – nicht von Hand ändern. Aufbau:\n'
        + '//   mittel / kurz   {Liga-ID: Name}; fehlt ein Eintrag, gilt die automatische Form (Ligatyp + Region)\n'
        + '//   bloecke         {"p:<Liga darüber>": {handy: {schrift, punkte, pfeile}, desktop: {schrift}}} – je Geschwisterblock\n'
        + '//   seitenleiste    {handy: px, desktop: px} – eine einheitliche Schrift für die ganze Seitenleiste\n'
        + 'const NAV_STIL = ' + JSON.stringify(daten, null, 1) + ';\n';
},
_stilSpeichern: async function() {
    const text = this._stilDateiText(), meld = t => { const m = document.getElementById('stil-meldung'); if (m) m.textContent = t; };
    if (window.showSaveFilePicker) {
        try {
            const h = await window.showSaveFilePicker({ suggestedName: 'nav_stil.js', types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }] });
            const w = await h.createWritable(); await w.write(text); await w.close();
            meld('✓ Gespeichert – sag Claude „ok“, dann wird gebaut.'); return;
        } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = 'nav_stil.js';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    meld('✓ nav_stil.js heruntergeladen – nach app/ legen (oder Claude sagen, wo sie liegt).');
},

});
