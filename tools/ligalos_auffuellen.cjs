// Vorschläge aus docs/ligalos-kandidaten/liste.txt (tools/ligalos_kandidaten.cjs) als Einträge für tools/kader_neu.json vorbereiten
// (Nutzer 14.11.2026: dünne Amateurpokal-Regionen auf mindestens 8 Ligalose auffüllen). Je Verein: Ort (von Hand, ORT unten),
// Spielstätte per OSM Nominatim (erst Vereinsname, dann Ort), regionsVon = nächster Spielverein derselben Bodenliga.
// Ergebnis zum Prüfen: tools/_dryrun/ligalos_auffuellen.json – erst nach Sichtung in tools/kader_neu.json übernehmen (--uebernehmen).
//   node tools/ligalos_auffuellen.cjs               Nominatim fragen (1 s Pause je Anfrage, Zwischenspeicher tools/_dryrun/nominatim_cache.json)
//   node tools/ligalos_auffuellen.cjs --uebernehmen  geprüfte Datei an tools/kader_neu.json anhängen
const fs = require('fs'), path = require('path'), https = require('https');
const R = path.join(__dirname, '..') + '/', DRY = R + 'tools/_dryrun/';
const ld = f => eval.call(global, fs.readFileSync(R + f, 'utf8').replace(/^const /gm, 'var '));
ld('game_data.js');
const AUS = DRY + 'ligalos_auffuellen.json', CACHE = DRY + 'nominatim_cache.json';
if (process.argv.includes('--uebernehmen')) {
    const neu = JSON.parse(fs.readFileSync(AUS, 'utf8')).vereine.map(({ ort_osm, treffer, ...v }) => v);
    const K = JSON.parse(fs.readFileSync(R + 'tools/kader_neu.json', 'utf8'));
    const da = new Set(K.vereine.map(v => v.id));
    K.vereine.push(...neu.filter(v => !da.has(v.id)));
    fs.writeFileSync(R + 'tools/kader_neu.json', JSON.stringify(K, null, 1) + '\n');
    console.log(`${neu.filter(v => !da.has(v.id)).length} Einträge an tools/kader_neu.json angehängt`);
    process.exit(0);
}
// Ort je Verein (Gemeinde, ggf. mit Ortsteil) – von Hand nach Vereinsname und Verband
const ORT = {
    hist_fb_vflwildeshausen: 'Wildeshausen', hist_fb_wscfrisiawilhelmshaven: 'Wilhelmshaven', hist_fa_vfrvoxtrup: 'Voxtrup, Osnabrück',
    hist_fb_bscacosta: 'Braunschweig', hist_fb_tsgbadharzburg: 'Bad Harzburg',
    hist_fa_tsvmelchiorshausen: 'Melchiorshausen, Weyhe', hist_fa_tsvgrolland: 'Grolland, Bremen', hist_wk_otbremen: 'Tenever, Bremen',
    hist_fb_djkgermaniablumenthal: 'Blumenthal, Bremen', hist_fb_tsvhasenbueren: 'Hasenbüren, Bremen', hist_fb_svtuerkspor: 'Bremen',
    hist_fb_svpenzliner: 'Penzlin', hist_fa_aufbauboizenburg: 'Boizenburg/Elbe', hist_fb_tsvbuetzow: 'Bützow', hist_fb_svgoermin: 'Görmin', hist_fb_fsvmalchin_nv: 'Malchin',
    hist_wk_svaltluedersdorf: 'Altlüdersdorf, Gransee', hist_fa_svfalkenseefinkenkrug: 'Finkenkrug, Falkensee', hist_fb_svfrankoniawernsdorf: 'Wernsdorf, Königs Wusterhausen',
    hist_fb_sceintrachtmiersdorfzeuthen: 'Zeuthen',
    hist_fb_sveintrachteisenberg: 'Eisenberg, Saale-Holzland-Kreis', hist_fa_fcerfurtnord: 'Erfurt', hist_fb_svblauweissbadfrankenhausen: 'Bad Frankenhausen', hist_fb_sgtsvgerawestvororte: 'Gera',
    hist_fa_olympiakirrlach: 'Kirrlach, Waghäusel', hist_fb_svlangensteinbach: 'Langensteinbach, Karlsbad', hist_fb_tsmosbach: 'Mosbach', hist_fa_fortunakirchfeld: 'Kirchfeld, Karlsruhe',
    hist_fb_fcwaldkirch_nv: 'Waldkirch, Emmendingen', hist_fa_kehlerfv: 'Kehl',
    hist_fa_vflsindelfingen: 'Sindelfingen', hist_fa_fcwangen: 'Wangen im Allgäu',
    hist_fb_sgjohannesberg: 'Johannesberg, Fulda', hist_fb_sgehrenberg: 'Ehrenberg (Rhön)',
    hist_fb_sgkinzenbach: 'Kinzenbach, Heuchelheim', hist_fa_spvggeltville: 'Eltville am Rhein',
    hist_fa_fvbadvilbel: 'Bad Vilbel', hist_wk_vfbginsheim: 'Ginsheim, Ginsheim-Gustavsburg', hist_fa_svmuenster: 'Münster (Hessen)',
    hist_fb_tusframersheim: 'Framersheim',
    hist_fb_tuspfaffenschwabenheim: 'Pfaffen-Schwabenheim', hist_fb_sgalsenztal: 'Alsenztal', hist_fb_karadenizbadkreuznach: 'Bad Kreuznach',   // Nominatim-Treffer 1 = Landkreis (Frei-Laubersheim), korrigiert auf die Stadt 49.84316/7.86577
    hist_fb_scweselberg: 'Weselberg', hist_fb_asvwinnweiler: 'Winnweiler',
};
// Korrekturen nach Sichtung (14.11.2026): q = Suchanfrage statt ORT, sonst Felder, die das Ergebnis überschreiben.
// Belege: SV Türkspor Bremen-Nord, Blumenthal, Burgwall-Stadion (en.wikipedia); SG Alsenztal = Alsenz/Niedermoschel/Hochstätten,
// Berichte aus Hochstätten (Rheinpfalz, Wochenblatt); SV Münster bei Dieburg, Gruppenliga Darmstadt (hessenschau)
const OVR = {
    hist_fb_svtuerkspor: { name: 'SV Türkspor Bremen-Nord', q: 'Blumenthal, Bremen', stadName: 'Burgwall-Stadion', ort: 'Bremen-Blumenthal' },
    hist_fb_sgalsenztal: { q: 'Hochstätten', ort: 'Hochstätten' },
    hist_fa_svmuenster: { q: 'Münster, Landkreis Darmstadt-Dieburg', ort: 'Münster (Hessen)', stadName: '' },
    hist_fb_vflwildeshausen: { stadName: '' },        // OSM: „Vereinsheim“, kein Platzname
    hist_fa_vflsindelfingen: { stadName: '' },        // OSM: Tennisplatz
    hist_fb_sveintrachteisenberg: { ort: 'Eisenberg' },
    hist_fb_fcwaldkirch_nv: { ort: 'Waldkirch' },
    hist_fa_aufbauboizenburg: { ort: 'Boizenburg/Elbe' },
    hist_wk_vfbginsheim: { ort: 'Ginsheim-Gustavsburg' },
};
// Reserven: Spielstätte der Ersten (docs/VEREINSBESTAND.md)
const ERSTE = { hist_fb_tsvgauodernheimii: 'tsvgauodernheim_311' };
// Vorschläge aus der Kandidatenliste lesen
const txt = fs.readFileSync(R + 'docs/ligalos-kandidaten/liste.txt', 'utf8').split('\n');
const vor = []; let liga = '', mode = 0;
for (const l of txt) {
    const k = l.match(/^═ (.+?) \(\d{4}/); if (k) { liga = k[1]; mode = 0; continue; }
    if (/Vorschlag/.test(l)) { mode = 1; continue; }
    if (/weitere:|ausgeschlossen|unsicher \(/.test(l) || !l.trim()) { mode = 0; continue; }
    if (mode && !/\? verschwunden/.test(l)) { const m = l.match(/^\s+[▲ ]\s(.+?)\s+Sz .*\[([^\]]+)\]/); if (m) vor.push({ id: m[2], name: m[1].trim(), liga }); }
}
const lidVon = name => Object.values(GAME_DATA.leagues).find(l => l.name === name.split(' + ')[0]).id;
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const frage = q => new Promise((ok, nein) => {
    if (cache[q]) return ok(cache[q]);
    https.get({ hostname: 'nominatim.openstreetmap.org', path: `/search?q=${encodeURIComponent(q)}&format=json&limit=3&countrycodes=de&addressdetails=1`,
        headers: { 'User-Agent': 'BundesligaSimulation-Vereinsbestand/1.0' } }, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => { try { cache[q] = JSON.parse(d); ok(cache[q]); } catch (e) { nein(e); } });
    }).on('error', nein);
});
const pause = ms => new Promise(r => setTimeout(r, ms));
const km = (a, b) => { const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r; return 6371 * Math.hypot(x, y); };
(async () => {
    const out = [];
    for (const v of vor) {
        const lid = lidVon(v.liga);
        const e = { id: v.id, name: v.name, quelle: `${v.liga} (echte Tabellen bis 2024/25, docs/ligalos-kandidaten/liste.txt)` };
        if (ERSTE[v.id]) { e.parentId = ERSTE[v.id]; out.push(e); continue; }
        const ort = ORT[v.id]; if (!ort) { console.log('⚠ kein Ort für', v.id, v.name); continue; }
        const stadt = ort.split(',').pop().trim().replace(/ \(.*\)$/, '').split('/')[0];
        let treffer = null, art = '';
        const o = OVR[v.id] || {};
        const a = o.q ? [] : await frage(`${v.name}`); if (!o.q) await pause(1100);
        const sport = (a || []).find(x => /pitch|stadium|sports_centre|sports_hall|recreation_ground|club/.test(x.type + ' ' + x.class) && JSON.stringify(x.address || {}).includes(stadt));
        if (sport) { treffer = sport; art = 'Verein'; }
        else { const b = await frage(o.q || ort); await pause(1100); treffer = (b || [])[0]; art = 'Ort'; }
        if (!treffer) { console.log('⚠ kein Treffer', v.id, ort); continue; }
        const lat = +(+treffer.lat).toFixed(5), lon = +(+treffer.lon).toFixed(5);
        const nachbar = Object.values(GAME_DATA.teams).filter(t => t.leagueId === lid && !t.isReserve && t.lat).sort((p, q) => km({ lat, lon }, p) - km({ lat, lon }, q))[0];
        e.regionsVon = nachbar.id;
        e.venue = { stadName: art === 'Verein' && treffer.name ? treffer.name : '', ort: ort.split(',')[0].replace(/ \(.*\)$/, '') === stadt ? stadt : `${stadt}-${ort.split(',')[0]}`, lat, lon };
        if (o.name) e.name = o.name;
        if (o.stadName != null) e.venue.stadName = o.stadName;
        if (o.ort) e.venue.ort = o.ort;
        e.ort_osm = `${art}: ${treffer.display_name}`; e.treffer = `${km({ lat, lon }, nachbar).toFixed(0)} km zu ${nachbar.name}`;
        out.push(e);
        fs.writeFileSync(CACHE, JSON.stringify(cache));
    }
    fs.writeFileSync(AUS, JSON.stringify({ _hinweis: 'Vorschlag aus tools/ligalos_auffuellen.cjs – prüfen, dann --uebernehmen', vereine: out }, null, 1));
    console.log(`${out.length} von ${vor.length} vorbereitet → ${AUS}`);
    out.forEach(e => console.log(`${e.name.padEnd(32)} ${e.parentId ? 'Reserve von ' + e.parentId : (e.venue.stadName || '(Ort)') + ' · ' + e.venue.ort + ' · ' + e.treffer}`));
})();
