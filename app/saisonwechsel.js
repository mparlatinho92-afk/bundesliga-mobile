// Saisonwechsel-Bericht (Sheet: „Off-Season Ligabewegungen übersichtlicher, keine Sortierung“ + „Off-Season-Fenster
// pro Saison im Nachhinein einsehbar“, 07.11.2026).
// Die Bewegungen werden NICHT gespeichert, sondern aus den Saison-Schnappschüssen abgeleitet: Liga eines Vereins in
// history[i] gegen history[i+1] (die jüngste Saison gegen Engine.teams). Kostet keinen Speicher und gilt rückwirkend
// für das ganze 50-Saisons-Fenster, auch in alten Spielständen. Ligalose fehlen im Schnappschuss = Amateurpokal.
// Grenze: „zusätzlicher Absteiger“ (down_var) ist von einem normalen Abstieg nicht zu unterscheiden – beide ▼.
Object.assign(App, {

// zu: eingeklappte Gruppen je Sortierung (Schlüssel = Liga-ID bzw. Art) – bleibt beim Blättern durch die Saisons
_swOpt: { sort: 'liga', zu: { liga: {}, art: {}, meister: {}, vp: {}, gr: {} } },

// Bewegungen nach Saison y (Format „2025/26“) → { y, next, moves[] } oder null, wenn y nicht im Fenster liegt
_swBewegungen: function(y) {
    const H = Engine.history || [];
    const i = H.findIndex(h => h.year === y);
    if (i < 0) return null;
    const vor = H[i].teams || {};
    const nachH = H[i + 1];
    const next = nachH ? nachH.year : (Engine.getFormattedSeason ? Engine.getFormattedSeason() : '');
    const ligaNach = id => {
        if (nachH) { const t = nachH.teams && nachH.teams[id]; return t ? t.leagueId : null; }
        const t = Engine.teams[id]; return t ? (t.leagueId || null) : null;
    };
    const nachIds = nachH ? Object.keys(nachH.teams || {}) : Object.keys(Engine.teams).filter(id => Engine.teams[id].leagueId);
    const rel = new Set();
    ((Engine.archive && Engine.archive.relegation) || []).filter(r => r.y === y)
        .forEach(r => (r.results || []).forEach(x => { if (x.hId) rel.add(x.hId); if (x.aId) rel.add(x.aId); }));
    const lvl = lid => (Engine.leagues[lid] && Engine.leagues[lid].level) || 99;
    // Zwangsabstieg / Rückzug nach der Saison (Engine 1b/5a, archive.strafen): eigene Art statt „Absteiger“/„In den Amateurpokal“
    // „Die Zweite wird zur Ersten“: Erste mit tausch -> zwang_tausch, die Reserve, die den Platz abgibt -> platz (Nutzer 08.11.2026)
    const zwS = (((Engine.archive && Engine.archive.strafen) || {})[y] || []);
    const zw = new Map(zwS.filter(s => s.art === 'zwang' || s.art === 'platz').map(s => [s.id, s.art === 'platz' ? 'platz' : s.tausch ? 'zwang_tausch' : 'zwang']));
    const moves = [];
    const add = (id, von, nach, rang, snap) => {
        const t = snap || Engine.teams[id] || {};
        let art;
        if (von && zw.has(id)) art = zw.get(id);
        else if (!von) art = 'ama_up';
        else if (!nach) art = 'ama_down';
        else if (lvl(nach) < lvl(von)) art = rel.has(id) ? 'rele_up' : 'up';
        else if (lvl(nach) > lvl(von)) art = rel.has(id) ? 'rele_down' : 'down';
        else art = 'staffel';
        moves.push({ id, name: t.name || (Engine.teams[id] && Engine.teams[id].name) || id,
            thumb: t.thumb || (Engine.teams[id] && Engine.teams[id].thumb) || null, von, nach, rang: von ? rang : null, art });
    };
    for (const id in vor) {
        const von = vor[id].leagueId, nach = ligaNach(id);
        if (von !== nach) add(id, von, nach, vor[id].rank, vor[id]);
    }
    for (const id of nachIds) if (!vor[id]) add(id, null, ligaNach(id), null, nachH && nachH.teams[id]);
    // Meister: Platz 1 jeder Liga der Saison y
    const meister = Object.values(vor).filter(t => t.rank === 1 && t.leagueId).map(t => ({ id: t.id, name: t.name, thumb: t.thumb || null, lid: t.leagueId }));
    // Verbandspokal: die VP-Qualifikanten des DFB-Pokals der Folgesaison (entrants type 'VP'). Der Verbandspokal selbst wird
    // nicht ausgespielt, nur seine Sieger entstehen bei der Auslosung. Bayern, Niedersachsen und Westfalen haben zwei Plätze –
    // der erste je Verband ist der Sieger, der zweite der 2. Startplatz (Reihenfolge der Auslosung, s. _legacyVerbandCupWinners).
    const pk = nachH ? nachH.pokal : Engine.pokal;
    const vp = [];
    if (pk && pk.entrants && (!pk.y || pk.y === next)) {
        const gesehen = {};
        Object.entries(pk.entrants).forEach(([id, e]) => {
            if (!e || e.type !== 'VP') return;
            const t = vor[id] || (nachH && nachH.teams[id]) || Engine.teams[id] || {};
            vp.push({ id, name: t.name || id, thumb: t.thumb || (Engine.teams[id] && Engine.teams[id].thumb) || null,
                lv: e.verband || '?', zweit: !!gesehen[e.verband], lid: vor[id] ? vor[id].leagueId : null });
            gesehen[e.verband] = 1;
        });
    }
    // Ligagrößen vorher (Schnappschuss y) und nachher (Folge-Schnappschuss bzw. laufende Saison)
    const vorN = {}, nachN = {};
    for (const id in vor) if (vor[id].leagueId) vorN[vor[id].leagueId] = (vorN[vor[id].leagueId] || 0) + 1;
    for (const id of nachIds) { const l = ligaNach(id); if (l) nachN[l] = (nachN[l] || 0) + 1; }
    return { y, next, moves, meister, vp, vorN, nachN, pokalDa: !!(pk && pk.entrants && (!pk.y || pk.y === next)) };
},

_SW_ART: {
    up:        { t: 'Aufsteiger',              ic: '▲', c: 'var(--c-fix-up)' },
    rele_up:   { t: 'Aufstieg über Relegation', ic: '⇄', c: '#00bcd4' },
    down:      { t: 'Absteiger',               ic: '▼', c: 'var(--c-fix-down)' },
    rele_down: { t: 'Abstieg über Relegation',  ic: '⇄', c: '#00bcd4' },
    ama_up:    { t: 'Aus dem Amateurpokal',     ic: '▲', c: 'var(--c-fix-up)' },
    ama_down:  { t: 'In den Amateurpokal',      ic: '▼', c: 'var(--c-fix-down)' },
    zwang:     { t: 'Zwangsabstieg / Rückzug',  ic: '⛔', c: 'var(--c-fix-down)' },
    zwang_tausch: { t: 'Zwangsabstieg – die Zweite wird zur Ersten', ic: '⛔', c: 'var(--c-fix-down)' },
    platz:     { t: 'Reserve gibt ihren Platz an die Erste ab', ic: '⇅', c: 'var(--muted)' },
    staffel:   { t: 'Staffelwechsel',           ic: '⇆', c: 'var(--muted)' }
},

// Inhalt (ohne Modal-Rahmen) – auch im Saisonabschlussbericht benutzt
_swHtml: function(y, sortFest, fest) {
    const H = Engine.history || [];
    if (!H.length) return '<div style="padding:16px 4px;color:var(--muted);font-size:12px">Noch kein Saisonwechsel gespielt.</div>';
    if (!y || !H.some(h => h.year === y)) y = H[H.length - 1].year;
    const d = this._swBewegungen(y);
    const i = H.findIndex(h => h.year === y);
    const L = lid => Engine.leagues[lid];
    const lvl = lid => (L(lid) && L(lid).level) || 99;
    const lname = lid => lid ? ((L(lid) && L(lid).name) || lid) : 'Amateurpokal';
    const A = this._SW_ART, sort = sortFest || this._swOpt.sort;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const zielLink = lid => lid
        ? `<a onclick="event.stopPropagation();document.getElementById('modal').style.display='none';App._pyrOeffne('${lid}','${d.next}')" style="color:var(--c-link);cursor:pointer" title="${this._attr(lname(lid))} ${d.next}">${esc(lname(lid))}</a>`
        : 'Amateurpokal';
    const zeile = (m, mitHerkunft) => {
        const a = A[m.art];
        const img = m.thumb ? `<img src="${m.thumb}" width="18" height="18" style="object-fit:contain;flex-shrink:0">` : '<span style="width:18px;flex-shrink:0"></span>';
        const rang = m.rang ? `${m.rang}.` : '';
        const ziel = mitHerkunft
            ? `<span class="sw-von">${esc(lname(m.von))}${m.rang ? ' (' + m.rang + '.)' : ''}</span> <span style="color:${a.c}">${a.ic}</span> ${zielLink(m.nach)}`
            : `<span style="color:${a.c}">${a.ic}</span> ${zielLink(m.nach)}`;
        return `<div class="sw-zeile" onclick="App.showSteckbrief('${m.id}')">`
            + (mitHerkunft ? '' : `<span class="sw-rang">${rang}</span>`)
            + `${img}<span class="sw-name" title="${this._attr(m.name)}">${esc(m.name)}</span><span class="sw-ziel">${ziel}</span></div>`;
    };
    const zu = this._swOpt.zu[sort], keys = [];
    const gruppe = (key, txt, n, inhalt) => { keys.push(key); const k = this._attr(key || '-'), z = !!zu[key || '-'];
        return `<div class="sw-gruppe${z ? ' zu' : ''}" data-k="${k}" data-s="${sort}"><div class="sw-kopf" onclick="App._swKlapp(this)"><span class="sw-klapp">${z ? '▸' : '▾'}</span> ${txt} <span style="color:var(--muted);font-weight:normal">(${n})</span></div><div class="sw-inhalt">${inhalt}</div></div>`; };
    let body = '';
    const nachRang = (a, b) => (a.rang || 999) - (b.rang || 999) || a.name.localeCompare(b.name);
    if (sort === 'liga') {
        const g = {};
        d.moves.forEach(m => (g[m.von || ''] = g[m.von || ''] || []).push(m));
        Object.keys(g).sort((a, b) => (a ? lvl(a) : 100) - (b ? lvl(b) : 100) || lname(a).localeCompare(lname(b)))
            .forEach(lid => { body += gruppe(lid, esc(lname(lid)), g[lid].length, g[lid].sort(nachRang).map(m => zeile(m, false)).join('')); });
    } else if (sort === 'gr') {
        // je Liga: vorher → nachher, Zufluss/Abfluss nach Richtung (▼ von oben / ▲ von unten / ⇆ Staffel), Band; antippen = Vereine
        const lids = [...new Set([...Object.keys(d.vorN), ...Object.keys(d.nachN)])].filter(l => L(l));
        const g = {};
        lids.forEach(l => (g[lvl(l)] = g[lvl(l)] || []).push(l));
        const richt = (von, nach, rein) => { const a = von ? lvl(von) : 100, b = nach ? lvl(nach) : 100; return a === b ? '⇆' : (rein ? (a < b ? '▼' : '▲') : (b < a ? '▲' : '▼')); };
        const farbe = r => r === '▲' ? 'var(--c-fix-up)' : r === '▼' ? 'var(--c-fix-down)' : 'var(--muted)';
        const fluss = list => { const n = { '▼': 0, '▲': 0, '⇆': 0 }; list.forEach(x => n[x.r]++); return ['▼', '▲', '⇆'].filter(k => n[k]).map(k => `<span style="color:${farbe(k)}">${k}${n[k]}</span>`).join(' ') || '–'; };
        Object.keys(g).sort((a, b) => a - b).forEach(e => {
            let rausE = 0, reinE = 0;
            const rows = g[e].sort((a, b) => lname(a).localeCompare(lname(b))).map(l => {
                const lg = L(l), v = d.vorN[l] || 0, n = d.nachN[l] || 0, diff = n - v;
                const rein = d.moves.filter(m => m.nach === l).map(m => ({ m, r: richt(m.von, l, true) }));
                const raus = d.moves.filter(m => m.von === l).map(m => ({ m, r: richt(l, m.nach, false) }));
                reinE += rein.length; rausE += raus.length;
                const mn = lg.min != null ? lg.min : lg.target, mx = lg.max != null ? lg.max : lg.target;
                const aus = n < mn || n > mx;
                const nCol = aus ? 'var(--c-var-down,#ff9800)' : n === lg.target ? 'var(--c-fix-up)' : 'var(--text)';
                const dTxt = diff ? `<span style="color:${diff > 0 ? 'var(--c-fix-up)' : 'var(--c-fix-down)'}">${diff > 0 ? '+' : '−'}${Math.abs(diff)}</span>` : '<span style="color:var(--muted)">±0</span>';
                const vz = (x, rein) => `<div class="sw-gr-v" onclick="event.stopPropagation();App.showSteckbrief('${x.m.id}')"><span style="color:${farbe(x.r)}">${x.r}</span> <b>${esc(x.m.name)}</b> <span style="color:var(--muted)">${rein ? '← ' + esc(lname(x.m.von)) + (x.m.rang ? ' (' + x.m.rang + '.)' : '') : '→ ' + esc(lname(x.m.nach))}</span></div>`;
                const liste = (rein.length ? '<div class="sw-gr-ue">rein</div>' + rein.sort((a, b) => a.r.localeCompare(b.r)).map(x => vz(x, true)).join('') : '')
                    + (raus.length ? '<div class="sw-gr-ue">raus</div>' + raus.sort((a, b) => a.r.localeCompare(b.r) || (a.m.rang || 99) - (b.m.rang || 99)).map(x => vz(x, false)).join('') : '');
                return `<div class="sw-gr${aus ? ' aus' : ''}" onclick="this.classList.toggle('offen')">`
                    + `<div class="sw-gr-kopf"><span class="sw-name" title="${this._attr(lname(l))}">${esc(lname(l))}</span>`
                    + `<span class="sw-gr-zahl">${v} → <b style="color:${nCol}">${n}</b> ${dTxt}</span>`
                    + `<span class="sw-gr-band" title="Soll ${lg.target}, Band ${mn}–${mx}">${mn === mx ? mn : mn + '–' + mx}${aus ? ' ⚠' : ''}</span></div>`
                    + `<div class="sw-gr-fluss">rein ${fluss(rein)} · raus ${fluss(raus)}</div>`
                    + `<div class="sw-gr-liste">${liste || '<div class="sw-gr-v" style="color:var(--muted)">keine Bewegung</div>'}</div></div>`;
            }).join('');
            const ausN = g[e].filter(l => { const lg = L(l), n = d.nachN[l] || 0, mn = lg.min != null ? lg.min : lg.target, mx = lg.max != null ? lg.max : lg.target; return n < mn || n > mx; }).length;
            body += gruppe('g' + e, `Ebene ${e}${ausN ? ` <span style="color:var(--c-var-down,#ff9800);font-weight:normal">⚠ ${ausN} außerhalb</span>` : ''}`, g[e].length, rows);
        });
    } else if (sort === 'meister') {
        const wohin = {}; d.moves.forEach(m => wohin[m.id] = m);
        const g = {};
        d.meister.forEach(m => (g[lvl(m.lid)] = g[lvl(m.lid)] || []).push(m));
        Object.keys(g).sort((a, b) => a - b).forEach(e => {
            const rows = g[e].sort((a, b) => lname(a.lid).localeCompare(lname(b.lid))).map(m => {
                const w = wohin[m.id], a = w && A[w.art];
                const ziel = w ? `<span style="color:${a.c}">${a.ic}</span> ${zielLink(w.nach)}` : '<span title="bleibt in der Liga (höchste Liga, Reserve-Sperre oder Verzicht)">– bleibt</span>';
                const img = m.thumb ? `<img src="${m.thumb}" width="18" height="18" style="object-fit:contain;flex-shrink:0">` : '<span style="width:18px;flex-shrink:0"></span>';
                return `<div class="sw-zeile" onclick="App.showSteckbrief('${m.id}')"><span class="sw-liga" title="${this._attr(lname(m.lid))}">${esc(lname(m.lid))}</span>${img}<span class="sw-name" title="${this._attr(m.name)}">${esc(m.name)}</span><span class="sw-ziel">${ziel}</span></div>`;
            }).join('');
            body += gruppe('e' + e, e == 1 ? 'Ebene 1 – Deutscher Meister' : 'Ebene ' + e, g[e].length, rows);
        });
    } else if (sort === 'vp') {
        const RV = this._REGIONALVERBAND || {}, RVO = ['Norddeutscher Fußball-Verband', 'Nordostdeutscher Fußballverband', 'Westdeutscher Fußballverband', 'Fußball-Regional-Verband Südwest', 'Süddeutscher Fußball-Verband'];
        const g = {};
        d.vp.forEach(m => { const r = RV[m.lv] || 'Sonstige'; (g[r] = g[r] || []).push(m); });
        Object.keys(g).sort((a, b) => (RVO.indexOf(a) + 1 || 99) - (RVO.indexOf(b) + 1 || 99)).forEach(r => {
            const rows = g[r].sort((a, b) => a.lv.localeCompare(b.lv) || a.zweit - b.zweit).map(m => {
                const img = m.thumb ? `<img src="${m.thumb}" width="18" height="18" style="object-fit:contain;flex-shrink:0">` : '<span style="width:18px;flex-shrink:0"></span>';
                const platz = m.zweit ? '<span class="sw-vp2" title="zweiter DFB-Pokal-Startplatz des Landesverbands">2. Startplatz</span>' : '<span style="color:var(--c-gold,#f0c040)">🏆 Pokalsieger</span>';
                return `<div class="sw-zeile" onclick="App.showSteckbrief('${m.id}')"><span class="sw-liga">${esc(m.lv)}</span>${img}<span class="sw-name" title="${this._attr(m.name)}">${esc(m.name)}</span><span class="sw-ziel">${platz} · ${esc(lname(m.lid))}</span></div>`;
            }).join('');
            body += gruppe(r, `${this._rvLogo ? this._rvLogo(r, 16) : ''}${esc(r)}`, g[r].length, rows);
        });
    } else {
        const g = {};
        d.moves.forEach(m => (g[m.art] = g[m.art] || []).push(m));
        Object.keys(A).filter(k => g[k]).forEach(k => {
            const s = g[k].sort((a, b) => (a.von ? lvl(a.von) : 100) - (b.von ? lvl(b.von) : 100)
                || lname(a.von).localeCompare(lname(b.von)) || nachRang(a, b));
            body += gruppe(k, `<span style="color:${A[k].c}">${A[k].ic}</span> ${A[k].t}`, s.length, s.map(m => zeile(m, true)).join(''));
        });
    }
    const zahl = k => d.moves.filter(m => k.includes(m.art)).length;
    const summe = `▲ ${zahl(['up', 'rele_up'])} auf · ▼ ${zahl(['down', 'rele_down'])} ab · Amateurpokal ${zahl(['ama_up'])} rein / ${zahl(['ama_down'])} raus`
        + (zahl(['staffel']) ? ` · ⇆ ${zahl(['staffel'])} Staffel` : '');
    const pfeil = (j, ic) => j >= 0 && j < H.length
        ? `<button class="btn sw-pfeil" onclick="App._swZeige('${H[j].year}')">${ic}</button>`
        : `<button class="btn sw-pfeil" disabled style="opacity:.35">${ic}</button>`;
    const sBtn = (k, t) => `<button class="btn sw-sort${sort === k ? ' aktiv' : ''}" onclick="App._swOpt.sort='${k}';App._swZeige('${y}')">${t}</button>`;
    const alleBtn = `<button class="btn sw-sort sw-alle" style="margin-left:auto" onclick="App._swAlle('${y}', this)">${keys.length && keys.every(k => zu[k || '-']) ? '▾ Alle auf' : '▸ Alle zu'}</button>`;
    const grInfo = () => { const ls = Object.keys(Engine.leagues).filter(l => d.vorN[l] || d.nachN[l]);
        const aus = ls.filter(l => { const lg = L(l), n = d.nachN[l] || 0, mn = lg.min != null ? lg.min : lg.target, mx = lg.max != null ? lg.max : lg.target; return n < mn || n > mx; }).length;
        return `<div class="sw-summe" style="text-align:left;margin:4px 0">Größe vor → nach dem Wechsel ${y} → ${d.next}, rein/raus nach Richtung (<span style="color:var(--c-fix-down)">▼</span> von oben, <span style="color:var(--c-fix-up)">▲</span> von unten, ⇆ Staffel), rechts das Band der Liga. ${aus ? `<b style="color:var(--c-var-down,#ff9800)">${aus} von ${ls.length} Ligen außerhalb ihres Bandes.</b>` : `Alle ${ls.length} Ligen im Band.`} Liga antippen = Vereine.</div>`; };
    if (fest) return `<div class="sw-reiter">${alleBtn}</div>` + (sort === 'gr' ? grInfo() : '') + body;
    return `<div class="sw-leiste">${pfeil(i - 1, '◀')}<b class="sw-titel">${y} → ${d.next}</b>${pfeil(i + 1, '▶')}</div>`
        + `<div class="sw-summe">${summe}</div>`
        + `<div class="sw-reiter">${sBtn('liga', 'Nach Liga')}${sBtn('art', 'Nach Art')}${sBtn('gr', 'Ligagrößen')}${sBtn('meister', 'Meister')}${sBtn('vp', 'Verbandspokal')}`
        + `<button class="btn sw-sort sw-alle" style="margin-left:auto" onclick="App._swAlle('${y}', this)">${keys.length && keys.every(k => zu[k || '-']) ? '▾ Alle auf' : '▸ Alle zu'}</button></div>`
        + (sort === 'vp' ? `<div class="sw-summe" style="text-align:left;margin:4px 0">Qualifiziert für den DFB-Pokal ${d.next}: ${d.vp.length} Verbandspokal-Startplätze (Bayern, Niedersachsen und Westfalen je zwei). Der Verbandspokal selbst wird nicht ausgespielt, nur seine Sieger.</div>` : '')
        + (sort === 'gr' ? grInfo() : '')
        + (sort === 'meister' ? `<div class="sw-summe" style="text-align:left;margin:4px 0">${d.meister.length} Meister der Saison ${y}, daneben ihr Weg in die Saison ${d.next}.</div>` : '')
        + (body || `<div style="padding:12px 4px;color:var(--muted);font-size:12px">${sort === 'vp' ? (d.pokalDa ? 'Keine Verbandspokal-Qualifikanten.' : 'Für diese Saison ist keine Pokal-Auslosung gespeichert.') : sort === 'meister' ? 'Keine Meister im Schnappschuss.' : 'Keine Ligabewegungen.'}</div>`);
},

// Eine Gruppe auf-/zuklappen (Kopf angetippt) – ohne Neuzeichnen, Zustand in _swOpt.zu
_swKlapp: function(kopf) {
    const g = kopf.parentNode, k = g.dataset.k, zu = this._swOpt.zu[g.dataset.s || this._swOpt.sort];
    const z = !g.classList.contains('zu');
    g.classList.toggle('zu', z); kopf.querySelector('.sw-klapp').textContent = z ? '▸' : '▾';
    if (z) zu[k] = 1; else delete zu[k];
    const box = kopf.closest('.sw-box') || document.getElementById('sw-box'), alle = [...box.querySelectorAll('.sw-gruppe')];
    const b = box.querySelector('.sw-alle'); if (b) b.textContent = alle.every(x => x.classList.contains('zu')) ? '▾ Alle auf' : '▸ Alle zu';
},

// Alle Gruppen zu (wenn eine offen ist) bzw. alle auf
_swAlle: function(y, btn) {
    const box = (btn && btn.closest('.sw-box')) || document.getElementById('sw-box'); if (!box) return;
    const gs = [...box.querySelectorAll('.sw-gruppe')], zu = {};
    if (!gs.every(x => x.classList.contains('zu'))) gs.forEach(x => zu[x.dataset.k] = 1);
    const fest = box.dataset.fest;
    this._swOpt.zu[fest || this._swOpt.sort] = zu;
    if (fest) box.innerHTML = this._swHtml(y, fest, true); else this._swZeige(y);
},

// Neu zeichnen im offenen Bericht (#sw-box) – Saisonwähler und Sortierung
_swZeige: function(y) {
    const box = document.getElementById('sw-box');
    if (box) box.innerHTML = this._swHtml(y);
},

// Eigenständiger Bericht (···-Menü, Knopf in der Ligaleiste). y = Saison, NACH der gewechselt wurde; ohne y die jüngste
showSaisonwechsel: function(y) {
    this.openModal('🔁 Saisonwechsel', `<div id="sw-box" class="sw-box">${this._swHtml(y)}</div>`, false);
},

// Knopf für die Ligaleiste: Archiv-Saison y → Wechsel danach; laufende Saison → der Wechsel, der in sie führte
_swNavBtn: function(y) {
    const H = Engine.history || [];
    if (!H.length) return '';
    const live = Engine.getFormattedSeason ? Engine.getFormattedSeason() : null;
    const ziel = (!y || y === live) ? H[H.length - 1].year : y;
    if (!H.some(h => h.year === ziel)) return '';
    return `<button onclick="App.showSaisonwechsel('${ziel}')" class="btn" title="Ligabewegungen nach der Saison ${ziel}" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:1px 6px;border-radius:3px;">🔁 Wechsel</button>`;
}

});
