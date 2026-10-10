// Rekord-Ansichten: Vereins-Rekordfenster (aus dem Steckbrief) + Liga-Reiter "Rekorde".
// Diese Datei RENDERT nur. Gemessen wird ausschliesslich in Engine._recordSeason bzw. einmalig
// rueckwirkend in Engine._recordBackfill; Datenquelle ist Engine.archive.records ({t:{}, l:{}}).
// Slot-Layout siehe REKORDE-Block in game_engine.js - hier wird es NUR gelesen.
Object.assign(App, {

    // Rundennamen des DFB-Pokals; Index == Slot-Wert, rounds.length == Sieger.
    _REC_ROUNDS: ['1. Runde', '2. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'],

    _recRounds: function() {
        const r = (typeof Engine !== 'undefined' && Engine.pokal && Engine.pokal.rounds) || null;
        return r && r.length ? r.map(x => x.name) : this._REC_ROUNDS;
    },

    _recAmaRounds: function() {
        const r = (typeof Engine !== 'undefined' && Engine.AMATEUR_ROUNDS) || null;
        return r ? r.map(x => x.name) : [];
    },

    _recStore: function() {
        const A = (typeof Engine !== 'undefined' && Engine.archive) || null;
        return (A && A.records) || null;
    },

    // Zusatz fuer die Fusszeile JEDER Rekordansicht - aber nur, wenn es ihn wirklich braucht.
    // Ein Dauerhinweis waere Laerm: geloeschte Saisons sind der Ausnahmefall. Steht eine in
    // archive.delSeasons, wird sie beim Namen genannt statt allgemein gewarnt.
    _recDelHinweis: function() {
        const d = (typeof Engine !== 'undefined' && Engine.archive && Engine.archive.delSeasons) || [];
        if (!d.length) return '';
        return ' Gel\u00f6schte Saison' + (d.length > 1 ? 'en' : '') + ': ' + d.join(', ')
             + ' \u2013 aus den ewigen Tabellen herausgerechnet, in den Bestwerten hier aber noch enthalten'
             + ' (ein H\u00f6chstwert l\u00e4sst sich nicht zur\u00fccknehmen).';
    },

    _recTeamName: function(id) {
        if (!id) return '?';
        const g = (typeof GAME_DATA !== 'undefined' && GAME_DATA.teams[id]) || null;
        const e = (typeof Engine !== 'undefined' && Engine.teams[id]) || null;
        const h = (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || null;
        return (e && e.name) || (g && g.name) || h || id;
    },

    // Ein Verein als klickbarer Name (fuehrt in seinen Steckbrief), sonst nur Text
    _recTeamLink: function(id) {
        if (!id) return '';
        const n = this._recTeamName(id);
        return `<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;color:var(--c-link)">${n}</span>`;
    },

    // Eine Rekordzeile: links Titel + Beleg, rechts der Wert. Bricht auf schmalen Spalten nicht um,
    // weil der Titel schrumpfbar ist (min-width:0) und der Wert flex:0 0 auto bleibt.
    _recRow: function(r) {
        return `<div style="display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <div style="min-width:0;flex:1">
                <div style="font-size:12px;color:var(--text)">${r.titel}</div>
                ${r.beleg ? `<div style="font-size:10px;color:var(--muted);margin-top:1px">${r.beleg}</div>` : ''}
            </div>
            <div style="flex:0 0 auto;font-size:15px;font-weight:bold;color:var(--c-gold);white-space:nowrap">${r.wert}</div>
        </div>`;
    },

    _recBox: function(titel, rows) {
        if (!rows.length) return '';
        return `<div style="margin-top:10px">
            <div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:2px">${titel}</div>
            ${rows.map(r => this._recRow(r)).join('')}
        </div>`;
    },

    // Beleg-Bausteine
    _recSaison: function(y, lid, sp, teamId) {
        const parts = [y];
        if (lid) parts.push(this._staffelName ? this._staffelName(lid, y, teamId) : lid);
        if (sp) parts.push(sp + ' Spiele');
        return parts.filter(Boolean).join(' · ');
    },

    // Abdeckung der historischen Einzelspiele (EINZELSPIELE_SEED.cov) für die genannten Ligen als Text:
    // "1. Bundesliga 1963/64–2002/03, 2010/11–2024/25 · …", teilweise erfasste Saisons mit "(teilweise …)". Leer ohne Daten.
    // Mit teamId nur die Saisons, in denen der Verein dort spielte – sonst stünde bei Bayern "Regionalliga Süd 1971/72".
    _recAbdeckung: function(lids, teamId) {
        const cov = (typeof EINZELSPIELE_SEED !== 'undefined' && EINZELSPIELE_SEED.cov) || {};
        const s = j => j === 1999 ? '1999/2000' : j + '/' + String((j + 1) % 100).padStart(2, '0');
        const br = b => b.map(([a, z]) => a === z ? s(a) : s(a) + '–' + s(z)).join(', ');
        const lv = l => (this._archLevelOf && this._archLevelOf(l)) || 99;
        const x = teamId && typeof HistExt !== 'undefined' && HistExt.loaded ? HistExt.loaded() : null;
        const jahreIn = l => {                                        // Startjahre des Vereins in Liga l vor dem Sim-Start
            const j = new Set(), mit = (y, rows) => { if ((rows || []).some(r => r.id === teamId)) j.add(parseInt(y)); };
            ((typeof HISTORY_SEED !== 'undefined' && HISTORY_SEED.seasons) || []).forEach(q => { if (q.lid === l) mit(q.y, q.table); });
            if (x && x.byLid && x.byLid[l]) x.byLid[l].forEach(q => mit(q.y, q.rows));
            return j;
        };
        const schnitt = (b, j) => {                                   // Bereiche auf die Jahre des Vereins einschränken
            const out = [];
            b.forEach(([a, z]) => { for (let k = a; k <= z; k++) if (j.has(k)) { const o = out[out.length - 1]; if (o && o[1] === k - 1) o[1] = k; else out.push([k, k]); } });
            return out;
        };
        return lids.filter(l => cov[l]).sort((a, b) => lv(a) - lv(b)).map(l => {
            let v = cov[l].v, t = cov[l].t;
            if (teamId) { const j = jahreIn(l); v = schnitt(v, j); t = schnitt(t, j); }
            if (!v.length && !t.length) return '';
            return this._leagueName(l) + ' ' + [v.length ? br(v) : '', t.length ? '(teilweise ' + br(t) + ')' : ''].filter(Boolean).join(' ');
        }).filter(Boolean).join(' · ');
    },

    // ---- VEREINSREKORDE ----------------------------------------------------------------
    showTeamRecords: function(teamId) {
        const R = this._recStore();
        const rec = (R && R.t && R.t[teamId]) || null;
        const name = this._recTeamName(teamId);
        const zurueck = `<div onclick="App.showSteckbrief('${teamId}')" style="cursor:pointer;font-size:11px;color:var(--c-link);margin-bottom:4px">← Steckbrief</div>`;
        if (!rec || !Object.keys(rec).filter(k => k !== '_r').length) {
            this.openModal('📏 ' + name, zurueck +
                '<div style="padding:16px 4px;font-size:12px;color:var(--muted)">Noch keine Rekorde. Sie entstehen beim ersten Saisonwechsel – Saisonrekorde werden zusätzlich einmalig aus dem Saisonarchiv rückwirkend gefüllt.</div>', false);
            return;
        }
        const g = (k) => rec[k] || null;
        const saison = [], spiele = [], serien = [], pokal = [], pspiele = [];
        const WB = k => k === 'a' ? 'Amateurpokal' : 'DFB-Pokal';
        const push = (arr, c, titel, wert, beleg) => { if (c) arr.push({ titel, wert, beleg }); };

        let c;
        if ((c = g('pts')))  push(saison, c, 'Meiste Punkte in einer Saison', c[0] + ' Pkt', this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('ppg')))  push(saison, c, 'Beste Punkte je Spiel', c[0].toFixed(2), this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('ptsL'))) push(saison, c, 'Wenigste Punkte in einer Saison', c[0] + ' Pkt', this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('w')))    push(saison, c, 'Meiste Siege in einer Saison', c[0], this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('gf')))   push(saison, c, 'Meiste Tore in einer Saison', c[0], this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('ga')))   push(saison, c, 'Wenigste Gegentore in einer Saison', c[0], this._recSaison(c[1], c[2], c[3], teamId));
        if ((c = g('dif')))  push(saison, c, 'Beste Torbilanz', (c[0] > 0 ? '+' : '') + c[0], this._recSaison(c[1], c[2], 0, teamId));
        if ((c = g('lvl')))  push(saison, c, 'Höchste erreichte Ebene', 'Ebene ' + c[0], this._recSaison(c[1], c[2], 0, teamId));

        if ((c = g('hs')))   push(spiele, c, 'Höchster Sieg', c[1] + ':' + c[2], `${c[3]} · gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('hn')))   push(spiele, c, 'Höchste Niederlage', c[2] + ':' + c[1], `${c[3]} · gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('mg')))   push(spiele, c, 'Torreichstes Spiel', c[1] + ':' + c[2], `${c[0]} Tore · ${c[3]} · gegen ${this._recTeamLink(c[4])}`);

        if ((c = g('unb')) && c[0] > 1) push(serien, c, 'Längste Serie ohne Niederlage', c[0] + ' Spiele', 'zuletzt ' + c[1]);
        if ((c = g('win')) && c[0] > 1) push(serien, c, 'Längste Siegesserie', c[0] + ' Spiele', 'zuletzt ' + c[1]);
        if ((c = g('sameL')) && c[0] > 1) push(serien, c, 'Meiste Saisons in Folge in einer Liga', c[0], this._recSaison(c[1], c[2], 0, teamId));
        if ((c = g('tit')) && c[0] > 1) push(serien, c, 'Meisterschaften in Folge', c[0], this._recSaison(c[1], c[2], 0, teamId));

        if ((c = g('cup')))  {
            const rn = this._recRounds();
            push(pokal, c, 'Weiteste DFB-Pokal-Runde', c[0] >= rn.length ? '🏆 Sieger' : (rn[c[0]] || ('Runde ' + (c[0] + 1))), c[1]);
        }
        if ((c = g('acup'))) {
            const an = this._recAmaRounds();
            push(pokal, c, 'Weiteste Amateurpokal-Runde', c[0] >= an.length ? '🏅 Sieger' : (an[c[0]] || ('Runde ' + (c[0] + 1))), c[1]);
        }
        if ((c = g('chs'))) push(pspiele, c, 'H\u00f6chster Sieg im Pokal', c[1] + ':' + c[2], `${c[3]} \u00b7 ${WB(c[5])} \u00b7 gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('chn'))) push(pspiele, c, 'H\u00f6chste Niederlage im Pokal', c[2] + ':' + c[1], `${c[3]} \u00b7 ${WB(c[5])} \u00b7 gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('cmg'))) push(pspiele, c, 'Torreichstes Pokalspiel', c[1] + ':' + c[2], `${c[0]} Tore \u00b7 ${c[3]} \u00b7 ${WB(c[5])} \u00b7 gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('vp')))    push(pokal, c, 'Verbandspokalsiege', c[0], 'zuletzt ' + c[1] + (c[2] ? ' \u00b7 ' + c[2] : ''));
        if ((c = g('vpRow')) && c[0] > 1) push(pokal, c, 'Verbandspokalsiege in Folge', c[0], 'bis ' + c[1]);
        if ((c = g('apUp')))  push(pokal, c, 'Aufstiege aus dem Amateurpokal', c[0], 'zuletzt ' + c[1]);
        if ((c = g('apRow'))) push(pokal, c, 'L\u00e4ngste Durststrecke im Amateurpokal', c[0] + (c[0] === 1 ? ' Saison' : ' Saisons'), 'bis ' + c[1]);

        const ew = (typeof Engine !== 'undefined' && Engine.archive && Engine.archive.ewige) || {};
        const abd = this._recAbdeckung(Object.keys(ew).filter(l => ew[l][teamId]), teamId);
        const hinweis = `<div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">
            Saisonrekorde reichen so weit zurück wie das Saisonarchiv. Einzelspielrekorde vor dem Sim-Start
            ${abd ? 'enthalten historische Spiele aus: ' + abd + '.' : 'gibt es für die Ligen dieses Vereins nicht.'}
            Serien zählen erst ab den gespielten Saisons – historische Quellen kennen keine Spieltagsreihenfolge.${this._recDelHinweis()}</div>`;

        this.openModal('📏 Rekorde · ' + name, zurueck +
            this._recBox('SAISON', saison) + this._recJeLiga(rec, teamId) + this._recBox('EINZELSPIELE', spiele) +
            this._recBox('SERIEN', serien) + this._recBox('POKAL', pokal) +
            this._recBox('POKALSPIELE', pspiele) + hinweis, false);
        const mc = document.querySelector('.modal-content');
        if (mc) mc.style.maxWidth = '440px';
    },

    // Saisonrekorde JE LIGA (Engine._recLigaSlots): je Liga ein aufklappbarer Block, höchste Liga zuerst und offen.
    // Kopfzeile: Saisons und Titel aus der Ewigen Tabelle – dieselbe Quelle wie Steckbrief und Ligazugehörigkeit.
    _recJeLiga: function(rec, teamId) {
        const L = rec && rec.L;
        if (!L || !Object.keys(L).length) return '';
        const ew = (typeof Engine !== 'undefined' && Engine.archive && Engine.archive.ewige) || {};
        const lv = l => (this._archLevelOf && this._archLevelOf(l)) || (GAME_DATA.leagues[l] || {}).level || 99;
        const ej = l => (ew[l] && ew[l][teamId]) || {};
        const lids = Object.keys(L).sort((a, b) => lv(a) - lv(b) || (ej(b).years || 0) - (ej(a).years || 0));
        const beleg = (lid, y, sp) => {
            const st = this._staffelOf ? this._staffelOf(lid, y, teamId) : '';
            return [y, st, sp ? sp + ' Spiele' : ''].filter(Boolean).join(' · ');
        };
        const bloecke = lids.map((lid, i) => {
            const x = L[lid], e = ej(lid), rows = [];
            const push = (c, titel, wert, sp) => { if (c) rows.push({ titel, wert, beleg: beleg(lid, c[1], sp ? c[2] : 0) }); };
            push(x.rk, 'Beste Platzierung', x.rk && (x.rk[0] === 1 ? '🏆 Meister' : x.rk[0] + '.'), false);
            push(x.pts, 'Meiste Punkte', x.pts && x.pts[0] + ' Pkt', true);
            push(x.ppg, 'Beste Punkte je Spiel', x.ppg && x.ppg[0].toFixed(2), true);
            push(x.w, 'Meiste Siege', x.w && x.w[0], true);
            push(x.gf, 'Meiste Tore', x.gf && x.gf[0], true);
            push(x.ga, 'Wenigste Gegentore', x.ga && x.ga[0], true);
            const kopf = [e.years ? e.years + (e.years === 1 ? ' Saison' : ' Saisons') : '', e.titles ? '🏆 ' + e.titles : ''].filter(Boolean).join(' · ');
            return `<details class="rec-liga"${i === 0 ? ' open' : ''} style="border-bottom:1px solid var(--border)">
                <summary style="cursor:pointer;display:flex;align-items:baseline;gap:8px;padding:5px 0;font-size:12px">
                    <span style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:bold">${this._leagueName(lid)}</span>
                    <span style="flex:0 0 auto;font-size:10px;color:var(--muted)">${kopf}</span>
                </summary>
                <div style="padding-left:8px">${rows.map(r => this._recRow(r)).join('')}</div>
            </details>`;
        }).join('');
        return `<div style="margin-top:10px">
            <div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:2px">JE LIGA</div>${bloecke}</div>`;
    },

    // ---- LIGAREKORDE (Reiter in der Ligaansicht) ---------------------------------------
    _renderLeagueRecords: function(lid) {
        const R = this._recStore();
        const rec = (R && R.l && R.l[lid]) || null;
        if (!rec || !Object.keys(rec).filter(k => k !== '_r').length) {
            return '<div style="padding:20px;font-size:12px;color:var(--muted)">Für diese Liga sind noch keine Rekorde erfasst. Sie entstehen beim Saisonwechsel – Saisonrekorde werden zusätzlich einmalig aus dem Saisonarchiv rückwirkend gefüllt.</div>';
        }
        const g = k => rec[k] || null;
        const rows = [];
        const push = (titel, wert, beleg) => rows.push({ titel, wert, beleg });
        let c;
        // Staffel mitnennen: die 2. Bundesliga 1974–81 und 1991/92 hatte zwei Meister je Saison
        const st = (y, id) => { const s = this._staffelOf ? this._staffelOf(lid, y, id) : ''; return s ? ' · ' + s : ''; };
        if ((c = g('cPts')))  push('Meiste Punkte eines Meisters', c[0] + ' Pkt', `${c[1]}${st(c[1], c[2])} · ${this._recTeamLink(c[2])}${c[3] ? ' · ' + c[3] + ' Spiele' : ''}`);
        if ((c = g('cPtsL'))) push('Wenigste Punkte eines Meisters', c[0] + ' Pkt', `${c[1]}${st(c[1], c[2])} · ${this._recTeamLink(c[2])}${c[3] ? ' · ' + c[3] + ' Spiele' : ''}`);
        if ((c = g('lead')))  push('Größter Vorsprung des Meisters', (c[0] > 0 ? '+' : '') + c[0] + ' Pkt', `${c[1]}${st(c[1], c[2])} · ${this._recTeamLink(c[2])}`);
        if ((c = g('cRow')) && c[0] > 1) push('Längste Meisterserie', c[0] + ' Titel', `bis ${c[1]} · ${this._recTeamLink(c[2])}`);
        if ((c = g('gfS')))   push('Torreichste Saison (Liga gesamt)', c[0] + ' Tore', c[1] + (c[2] ? ' · Staffel ' + c[2] : ''));
        if ((c = g('hs')))    push('Höchster Sieg', c[1] + ':' + c[2], `${c[3]} · ${this._recTeamLink(c[4])} gegen ${this._recTeamLink(c[5])}`);

        return `<div style="padding:6px 10px 14px;max-width:680px">
            ${this._recBox('LIGAREKORDE', rows)}
            <div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">
                Punkte sind für alle Epochen auf drei Punkte je Sieg normalisiert – deshalb steht die
                Spielzahl daneben. Der höchste Sieg ${this._recAbdeckung([lid]) ? 'enthält historische Einzelspiele aus ' + this._recAbdeckung([lid]) + ', sonst zählt er' : 'zählt'} ab den gespielten Saisons.${this._recDelHinweis()}</div>
        </div>`;
    },

    // ---- POKALREKORDE (Reiter im DFB-Pokal) --------------------------------------------
    // Eigene Rekordklasse: im Pokal treffen Ebenen aufeinander, die sich in der Liga nie sehen -
    // deshalb "groesste Ueberraschung" (Levelabstand) und "tiefstklassiger Finalist" statt
    // Punkterekorden. Quelle: Engine.archive.records.p
    _renderPokalRecords: function(key) {
        const K = key === 'a' ? 'a' : 'p', ama = K === 'a';
        const R = this._recStore();
        const rec = (R && R[K]) || null;
        if (!rec || !Object.keys(rec).filter(k => k !== '_r').length) {
            return '<div style="padding:20px;font-size:12px;color:var(--muted)">Noch keine ' + (ama ? 'Amateurpokal-Rekorde' : 'Pokalrekorde') + '. Sie entstehen beim Saisonwechsel \u2013 zus\u00e4tzlich wird r\u00fcckwirkend gef\u00fcllt, was der Spielstand noch hergibt.</div>';
        }
        const g = k => rec[k] || null;
        const rows = [];
        const push = (titel, wert, beleg) => rows.push({ titel, wert, beleg });
        let c;
        if ((c = g('hs')))   push('H\u00f6chster Sieg', c[1] + ':' + c[2], `${c[3]} \u00b7 ${this._recTeamLink(c[4])} gegen ${this._recTeamLink(c[5])}`);
        if ((c = g('mg')))   push('Torreichstes Spiel', c[1] + ':' + c[2], `${c[0]} Tore \u00b7 ${c[3]} \u00b7 ${this._recTeamLink(c[4])} gegen ${this._recTeamLink(c[5])}`);
        if ((c = g('sens'))) push('Gr\u00f6\u00dfte \u00dcberraschung', c[0] + (c[0] === 1 ? ' Ebene' : ' Ebenen'), `${c[1]} \u00b7 ${this._recTeamLink(c[2])} (Ebene ${c[4]}) schl\u00e4gt ${this._recTeamLink(c[3])} (Ebene ${c[5]})`);
        if ((c = g('low')))  push('Tiefstklassiger Finalist', 'Ebene ' + c[0], `${c[1]} \u00b7 ${this._recTeamLink(c[2])}`);
        if ((c = g('tRow')) && c[0] > 1) push('Titel in Folge', c[0], `bis ${c[1]} \u00b7 ${this._recTeamLink(c[2])}`);
        if ((c = g('gfS')))  push('Torreichste Pokalsaison', c[0] + ' Tore', c[1]);
        // Aufstiege und Durststrecke liegen je VEREIN (records.t) - der Wettbewerbsrekord ist das
        // Maximum daraus. Kein eigener Speicher: 1262 Eintraege einmal durchsehen kostet nichts.
        if (ama && R && R.t) {
            let bU = null, bR = null;
            for (const id in R.t) {
                const t = R.t[id];
                if (t.apUp  && (!bU || t.apUp[0]  > bU[1][0])) bU = [id, t.apUp];
                if (t.apRow && (!bR || t.apRow[0] > bR[1][0])) bR = [id, t.apRow];
            }
            if (bU) push('Meiste Aufstiege', bU[1][0], `zuletzt ${bU[1][1]} \u00b7 ${this._recTeamLink(bU[0])}`);
            if (bR) push('L\u00e4ngste Durststrecke', bR[1][0] + (bR[1][0] === 1 ? ' Saison' : ' Saisons'), `bis ${bR[1][1]} \u00b7 ${this._recTeamLink(bR[0])}`);
        }
        if ((c = g('pen')))  push('Meiste Elfmeterschie\u00dfen in einer Saison', c[0], c[1]);

        const fuss = ama
            ? 'Der Amateurpokal kennt keine Ligaebenen \u2013 \u00dcberraschung und tiefstklassiger Finalist gibt es hier nicht. R\u00fcckwirkend reicht alles so weit wie das Pokal-Fenster im Spielstand (bis zu 50 Saisons); Elfmeterschie\u00dfen z\u00e4hlen erst ab Einbau, weil der gek\u00fcrzte Spielstand sie nicht mitspeichert.'
            : 'Spielrekorde reichen so weit zur\u00fcck wie das Pokal-Fenster im Spielstand (bis zu 50 Saisons); Titelserien zus\u00e4tzlich \u00fcber die historische Siegerliste ab 1935.';
        return `<div style="padding:6px 10px 14px;max-width:680px">
            ${this._recBox(ama ? 'AMATEURPOKAL-REKORDE' : 'POKALREKORDE', rows)}
            <div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">${fuss}${this._recDelHinweis()}</div>
        </div>`;
    }
});
