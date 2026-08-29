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

    _recStore: function() {
        const A = (typeof Engine !== 'undefined' && Engine.archive) || null;
        return (A && A.records) || null;
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
    _recSaison: function(y, lid, sp) {
        const parts = [y];
        if (lid) parts.push(this._leagueName ? this._leagueName(lid) : lid);
        if (sp) parts.push(sp + ' Spiele');
        return parts.filter(Boolean).join(' · ');
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
        const saison = [], spiele = [], serien = [], pokal = [];
        const push = (arr, c, titel, wert, beleg) => { if (c) arr.push({ titel, wert, beleg }); };

        let c;
        if ((c = g('pts')))  push(saison, c, 'Meiste Punkte in einer Saison', c[0] + ' Pkt', this._recSaison(c[1], c[2], c[3]));
        if ((c = g('ppg')))  push(saison, c, 'Beste Punkte je Spiel', c[0].toFixed(2), this._recSaison(c[1], c[2], c[3]));
        if ((c = g('ptsL'))) push(saison, c, 'Wenigste Punkte in einer Saison', c[0] + ' Pkt', this._recSaison(c[1], c[2], c[3]));
        if ((c = g('w')))    push(saison, c, 'Meiste Siege in einer Saison', c[0], this._recSaison(c[1], c[2], c[3]));
        if ((c = g('gf')))   push(saison, c, 'Meiste Tore in einer Saison', c[0], this._recSaison(c[1], c[2], c[3]));
        if ((c = g('ga')))   push(saison, c, 'Wenigste Gegentore in einer Saison', c[0], this._recSaison(c[1], c[2], c[3]));
        if ((c = g('dif')))  push(saison, c, 'Beste Torbilanz', (c[0] > 0 ? '+' : '') + c[0], this._recSaison(c[1], c[2]));
        if ((c = g('lvl')))  push(saison, c, 'Höchste erreichte Ebene', 'Ebene ' + c[0], this._recSaison(c[1], c[2]));

        if ((c = g('hs')))   push(spiele, c, 'Höchster Sieg', c[1] + ':' + c[2], `${c[3]} · gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('hn')))   push(spiele, c, 'Höchste Niederlage', c[2] + ':' + c[1], `${c[3]} · gegen ${this._recTeamLink(c[4])}`);
        if ((c = g('mg')))   push(spiele, c, 'Torreichstes Spiel', c[1] + ':' + c[2], `${c[0]} Tore · ${c[3]} · gegen ${this._recTeamLink(c[4])}`);

        if ((c = g('unb')) && c[0] > 1) push(serien, c, 'Längste Serie ohne Niederlage', c[0] + ' Spiele', 'zuletzt ' + c[1]);
        if ((c = g('win')) && c[0] > 1) push(serien, c, 'Längste Siegesserie', c[0] + ' Spiele', 'zuletzt ' + c[1]);
        if ((c = g('sameL')) && c[0] > 1) push(serien, c, 'Meiste Saisons in Folge in einer Liga', c[0], this._recSaison(c[1], c[2]));
        if ((c = g('tit')) && c[0] > 1) push(serien, c, 'Meisterschaften in Folge', c[0], this._recSaison(c[1], c[2]));

        if ((c = g('cup')))  {
            const rn = this._recRounds();
            push(pokal, c, 'Weiteste DFB-Pokal-Runde', c[0] >= rn.length ? '🏆 Sieger' : (rn[c[0]] || ('Runde ' + (c[0] + 1))), c[1]);
        }

        const hinweis = `<div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">
            Saisonrekorde reichen so weit zurück wie das Saisonarchiv. Spiel- und Serienrekorde zählen
            ab Einbau dieser Funktion – Einzelergebnisse älterer Saisons existieren nicht mehr.</div>`;

        this.openModal('📏 Rekorde · ' + name, zurueck +
            this._recBox('SAISON', saison) + this._recBox('EINZELSPIELE', spiele) +
            this._recBox('SERIEN', serien) + this._recBox('POKAL', pokal) + hinweis, false);
        const mc = document.querySelector('.modal-content');
        if (mc) mc.style.maxWidth = '440px';
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
        if ((c = g('cPts')))  push('Meiste Punkte eines Meisters', c[0] + ' Pkt', `${c[1]} · ${this._recTeamLink(c[2])}${c[3] ? ' · ' + c[3] + ' Spiele' : ''}`);
        if ((c = g('cPtsL'))) push('Wenigste Punkte eines Meisters', c[0] + ' Pkt', `${c[1]} · ${this._recTeamLink(c[2])}${c[3] ? ' · ' + c[3] + ' Spiele' : ''}`);
        if ((c = g('lead')))  push('Größter Vorsprung des Meisters', (c[0] > 0 ? '+' : '') + c[0] + ' Pkt', `${c[1]} · ${this._recTeamLink(c[2])}`);
        if ((c = g('cRow')) && c[0] > 1) push('Längste Meisterserie', c[0] + ' Titel', `bis ${c[1]} · ${this._recTeamLink(c[2])}`);
        if ((c = g('gfS')))   push('Torreichste Saison (Liga gesamt)', c[0] + ' Tore', c[1]);
        if ((c = g('hs')))    push('Höchster Sieg', c[1] + ':' + c[2], `${c[3]} · ${this._recTeamLink(c[4])} gegen ${this._recTeamLink(c[5])}`);

        return `<div style="padding:6px 10px 14px;max-width:680px">
            ${this._recBox('LIGAREKORDE', rows)}
            <div style="margin-top:10px;font-size:10px;color:var(--muted);line-height:1.4">
                Punkte sind für alle Epochen auf drei Punkte je Sieg normalisiert – deshalb steht die
                Spielzahl daneben. Der höchste Sieg zählt ab Einbau dieser Funktion.</div>
        </div>`;
    }
});
