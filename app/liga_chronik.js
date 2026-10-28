// Ligen-Chronik (Sheet 28.10.2026): alle Ligen mit Daten, sortiert nach der frühesten Saison, daneben das Gründungsjahr laut
// de.wikipedia (LIGA_CHRONIK aus app/liga_chronik_data.js, erzeugt von tools/liga_chronik.mjs). „Vorlauf“ = Jahre zwischen
// Gründung und erster Saison in den Daten – dort fehlen Tabellen. Klick auf eine Liga = ihre erste Saison.
Object.assign(App, {

_ligaChronikSort: { k: 'ab', d: 1 },

showLigaChronik: function(k) {
    if (typeof LIGA_CHRONIK === 'undefined') return;
    const S = this._ligaChronikSort;
    if (k) { if (S.k === k) S.d = -S.d; else { S.k = k; S.d = k === 'vorlauf' ? -1 : 1; } }
    const lvl = lid => (Engine.leagues[lid] || GAME_DATA.leagues[lid] || (this._histLeague && this._histLeague(lid)) || {}).level || 9;
    const zeilen = LIGA_CHRONIK.l.map(([lid, ab, bis, n, seit, quelle, fund, luecken, abA]) =>
        // Vorlauf ab der frühesten Saison aller Ligen DESSELBEN Artikels (abA): eine Liga unter früherem Namen zählt mit
        ({ lid, ab, bis, n, seit, quelle, fund, luecken, abA: abA || ab, name: this._leagueName(lid), ebene: lvl(lid), spiel: !!GAME_DATA.leagues[lid], vorlauf: seit && seit < (abA || ab) ? (abA || ab) - seit : 0 }));
    const wert = (z, k) => k === 'name' ? z.name : k === 'seit' ? (z.seit || 9999) : z[k];
    zeilen.sort((a, b) => { const va = wert(a, S.k), vb = wert(b, S.k);
        return (typeof va === 'string' ? va.localeCompare(vb, 'de') : va - vb) * S.d || a.ab - b.ab || a.ebene - b.ebene || a.name.localeCompare(b.name, 'de'); });
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const th = (key, txt, cls, tip) => `<th class="${cls || ''}" onclick="App.showLigaChronik('${key}')" style="cursor:pointer;white-space:nowrap"${tip ? ` title="${tip}"` : ''}>${txt}${S.k === key ? (S.d > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    const mitJahr = zeilen.filter(z => z.seit).length, mitVorlauf = zeilen.filter(z => z.vorlauf).length;
    const rows = zeilen.map(z => {
        const saison = this._seasonStrOf(z.ab);
        const lu = (z.luecken || []).map(([a, b]) => a === b ? this._seasonStrOf(a) : this._seasonStrOf(a) + '–' + this._seasonStrOf(b)).join(', ');
        const seit = z.seit ? (z.quelle ? `<a href="${esc(z.quelle)}" target="_blank" rel="noopener" title="${esc(z.fund)}" style="color:inherit">${z.seit}</a>` : `<span title="${esc(z.fund)}">${z.seit}</span>`) : '<span style="color:var(--muted)" title="Gründung nicht belegt (kein passender Wikipedia-Artikel)">?</span>';
        const vl = z.vorlauf ? `<span style="color:var(--c-fix-down)" title="Gründung ${z.seit}, Daten erst ab ${this._seasonStrOf(z.abA)}${z.abA < z.ab ? ' (unter früherem Namen)' : ''}">${z.vorlauf} J.</span>`
            : z.seit ? '<span style="color:var(--c-fix-up)" title="Gründung und erste Saison in den Daten fallen zusammen">✓</span>'
            : '<span style="color:var(--muted)" title="Gründung nicht belegt">?</span>';
        return `<tr>
            <td class="lc-name"><span onclick="App._sbSaisonGo('${z.lid}','${saison}')" style="cursor:pointer;color:var(--c-link)">${esc(z.name)}</span>${z.spiel ? '' : ' <span style="font-size:10px;color:var(--muted)">hist.</span>'}${lu ? `<div style="font-size:10px;color:var(--muted)">Lücke ${lu}</div>` : ''}</td>
            <td class="pc-md" style="text-align:center">${z.ebene}</td>
            <td style="white-space:nowrap">${saison}</td>
            <td class="pc-md" style="white-space:nowrap;color:var(--muted)">${this._seasonStrOf(z.bis)}</td>
            <td class="pc-lg" style="text-align:right">${z.n}</td>
            <td style="text-align:center">${seit}</td>
            <td style="text-align:right;white-space:nowrap">${vl}</td>
        </tr>`;
    }).join('');
    this.openModal('📜 Ligen-Chronik', `<style>
        .lc-tab{width:100%;border-collapse:collapse;font-size:12px}.lc-tab th,.lc-tab td{padding:4px 5px;border-bottom:1px solid var(--border)}
        .lc-tab th{position:sticky;top:0;background:var(--panel-2);font-size:11px;color:var(--muted);text-align:left}
        .lc-tab .lc-name{min-width:0;word-break:break-word}
        .lc-tab .pc-md,.lc-tab .pc-lg{display:none}
        @media(min-width:520px){.lc-tab .pc-md{display:table-cell}} @media(min-width:700px){.lc-tab .pc-lg{display:table-cell}}
        </style>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.4">${zeilen.length} Ligen mit Daten, sortiert nach der ersten Saison.
        „Gegründet“ laut de.wikipedia (${mitJahr} gefunden, Zahl antippen = Artikel). „Vorlauf“ = Jahre zwischen Gründung und erster Saison in den Daten, auch unter früherem Namen (${mitVorlauf} Ligen), ✓ = Daten ab Gründung, ? = Gründung nicht belegt.</div>
        <div style="max-height:68vh;overflow:auto"><table class="lc-tab"><thead><tr>
            ${th('name', 'Liga')}${th('ebene', 'E', 'pc-md', 'Ebene')}${th('ab', 'Daten ab')}${th('bis', 'bis', 'pc-md')}${th('n', 'Sais.', 'pc-lg', 'Saisons in den Daten')}${th('seit', 'Gegründet')}${th('vorlauf', 'Vorlauf', '', 'Jahre zwischen Gründung und erster Saison in den Daten')}
        </tr></thead><tbody>${rows}</tbody></table></div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Stand ${LIGA_CHRONIK.stand} · Gründung aus Infobox oder Einleitung des Artikels. „?“: kein passender Artikel – meist Ligen ohne eigenen Wikipedia-Eintrag.</div>`, false);
    const mc = document.querySelector('.modal-content'); if (mc) mc.style.maxWidth = '760px';
},
});
