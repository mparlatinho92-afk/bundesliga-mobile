#!/usr/bin/env node
/*
 * karte_narben.mjs – findet Mini-Polygone ("Narben") in der Kartendarstellung.
 *
 * Eine Narbe ist ein Polygon, das nichts abdeckt, aber einen Haarstrich in eine Fläche
 * zeichnet. Erkennbar an seiner BREITE, nicht an seiner Fläche: ein 5 km langes, 5 m
 * schmales Band hat 0,025 km² und überlebt jede Flächenschwelle.
 *
 *     breite = 2 · Fläche / Umfang        (metrisch, cos-Breitengrad-korrigiert)
 *
 * WARUM IM BROWSER GEMESSEN WIRD: die Regionen-Ebene speist sich aus DREI Quellen –
 *   1. Waben (Voronoi je Verein)      tools/gen_regions.py -> waben_export
 *   2. statische Regionsflächen       tools/gen_regions.py -> Ausgabe-Schleife
 *   3. Laufzeit-Vereinigung           app/map_saison.js    -> _wabenUnion
 * Wer nur die Daten auf der Platte prüft, sieht (3) nie. Dieses Skript misst, was
 * tatsächlich gezeichnet wird, und nennt über das Tooltip-Label die Region.
 *
 * Alle drei Erzeuger benutzen dieselbe Schwelle (MINI_BREITE_M = 166 m, entspricht der
 * Vereinfachungstoleranz SIMPLIFY). Weichen sie ab, verwirft der Generator Splitter,
 * die die Laufzeit gleich wieder erzeugt.
 *
 * VORGEHEN bei Befund:
 *   1. dieses Skript laufen lassen -> Liste der Narben mit Region
 *   2. Schwelle NICHT einzeln anpassen, sondern MINI_BREITE_M an allen drei Stellen gleich halten
 *   3. python tools/gen_regions.py   (erzeugt app/map_regions.js neu, meldet die Zahl)
 *   4. dieses Skript erneut laufen lassen -> muss 0 melden
 *
 * Aufruf:  python -m http.server 3334        (im Projektordner, in einer zweiten Konsole)
 *          node tools/karte_narben.mjs [breite_m] [datei]
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const pw = (await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.js')).href)).default;

const GRENZE = parseFloat(process.argv[2] || '166');
const DATEI  = process.argv[3] || 'template.html';
const URL    = 'http://localhost:3334/' + DATEI;

const browser = await pw.chromium.launch();
const seite = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
const fehler = [];
seite.on('pageerror', e => fehler.push(String(e)));
try {
    await seite.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
} catch (e) {
    console.error('Server nicht erreichbar: ' + URL + '\n  -> vorher "python -m http.server 3334" starten');
    await browser.close(); process.exit(1);
}
await seite.waitForSelector('#content');
await seite.evaluate(() => { App.showMap(); return 1; });
await seite.waitForTimeout(2500);

const ringe = await seite.evaluate(() => {
    const out = [];
    const messe = ring => {
        const lat = ring.reduce((s, q) => s + q.lat, 0) / ring.length;
        const kx = Math.cos(lat * Math.PI / 180) * 111320, ky = 110570;
        let a = 0, u = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const px = ring[j].lng * kx, py = ring[j].lat * ky;
            const qx = ring[i].lng * kx, qy = ring[i].lat * ky;
            a += px * qy - qx * py; u += Math.hypot(qx - px, qy - py);
        }
        return { km2: Math.abs(a) / 2 / 1e6, breite: u > 0 ? Math.abs(a) / u : 0, n: ring.length };
    };
    // _hullLyr = Regionen-Ebene (Staffel-/Regionsflächen). _geoLyr wäre die Grenzen-Ebene.
    App._hullLyr.eachLayer(l => {
        if (!l.getLatLngs) return;
        const tip = l.getTooltip && l.getTooltip();
        const label = tip ? String(tip.getContent()).replace(/<[^>]*>/g, '').slice(0, 38) : '?';
        const teile = l.getLatLngs();
        (Array.isArray(teile[0]) ? teile : [teile]).forEach(t => {
            const r = Array.isArray(t[0]) ? t[0] : t;
            if (r && r.length >= 3) out.push({ label, ...messe(r) });
        });
    });
    return out;
});
await browser.close();

const narben = ringe.filter(r => r.breite < GRENZE).sort((a, b) => a.breite - b.breite);
console.log(`Gezeichnete Polygone: ${ringe.length}`);
console.log(`Schmaler als ${GRENZE} m: ${narben.length}`);
if (narben.length) {
    console.log('\nRegion                                  Pkt      km²   Breite');
    console.log('-'.repeat(66));
    narben.slice(0, 30).forEach(r => console.log(
        '  ' + r.label.padEnd(38) + String(r.n).padStart(3) +
        r.km2.toFixed(3).padStart(9) + r.breite.toFixed(0).padStart(8) + ' m'));
    if (narben.length > 30) console.log(`  … und ${narben.length - 30} weitere`);
    console.log('\n-> MINI_BREITE_M in tools/gen_regions.py UND app/map_saison.js pruefen,');
    console.log('   dann "python tools/gen_regions.py" und dieses Skript erneut laufen lassen.');
} else {
    console.log('\nKeine Narben. Schmalstes Polygon: ' +
        Math.min(...ringe.map(r => r.breite)).toFixed(0) + ' m');
}
if (fehler.length) console.log('\nJS-Fehler: ' + fehler.slice(0, 3).join(' | '));
process.exit(narben.length ? 1 : 0);
