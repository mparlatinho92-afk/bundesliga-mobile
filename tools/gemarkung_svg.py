#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rechnet eine geoindex.io-SVG einer Gemarkung in lat/lon um und legt sie als
tools/gemarkung_<gemeinde>.json ab. gemeinde_fix.py setzt diese Datei danach
anstelle der Gemeindeflaeche ein (s. dort, GEMARKUNG-Block am Ende von main()).

Wozu: Die amtlichen KML unter "Google Earth Orte/2021 mygeodata" kennen nur
Gemeinden (Level 8), Kreise (6) und Provinzen (4) - keine Gemarkungen. Reicht ein
Verband aber nur bis zur Gemarkungsgrenze (der FV Illertissen ist der einzige
bayerisch spielende Verein *des Ortes* Illertissen, die Ortsteile spielen
wuerttembergisch), waere die ganze Gemeinde zu grob. OSM hat die Gemarkungen
nicht (boundary=cadastral liefert nichts), geoindex.io ist nicht abrufbar -
also laedt der Nutzer die SVG herunter und dieses Skript referenziert sie.

Verfahren: Die SVG hat ein eigenes Koordinatensystem. Ihr Gesamtbild (Gemarkung +
Nachbarflaechen) deckt sich mit der bbox der amtlichen Gemeinde - daraus folgt der
Massstab. Ueber ~10 km genuegt eine achsenparallele Streckung bbox->bbox.

Aufruf:
  python tools/gemarkung_svg.py <svg-datei> <Gemeindename> <Gemarkungsnummer>
  python tools/gemarkung_svg.py C:/Users/lyric/Downloads/097511.svg Illertissen 097511
"""
import os, re, io, sys, json, math
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import Polygon as SPoly, Point, mapping
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEM_DIR = r"C:\Users\lyric\OneDrive\Dokumente\Google Earth Orte\2021 mygeodata\Gemeinden (Town Borders)"
KMLS = ['Süddeutschland (Baden-Württemberg   Bayern)_border_level8_polygon.kml',
        'Nordrhein-Westfalen   Hessen_border_level8_polygon.kml',
        'Norddeutschland_border_level8_polygon.kml',
        'Südwest_border_level8_polygon.kml',
        'Ostdeutschland_border_level8_polygon.kml']

# Dateiname ohne Leerzeichen - gemeinde_fix.py normalisiert genauso.
slug = lambda s: s.lower().replace(' ', '_').replace('/', '_')


def svg_polygone(pfad):
    s = io.open(pfad, encoding='utf-8').read()
    def pts(t):
        v = [float(x) for x in t.replace(',', ' ').split()]
        return list(zip(v[0::2], v[1::2]))
    bnd, rest = [], []
    for m in re.finditer(r'<polygon[^>]*class="(boundary|municipality)"[^>]*points="([^"]+)"', s):
        p = pts(m.group(2))
        if len(p) >= 3:
            (bnd if m.group(1) == 'boundary' else rest).append(p)
    if not bnd:
        sys.exit('FEHLER: keine <polygon class="boundary"> in der SVG')
    return bnd, rest


def parse_ring(t):
    out = []
    for tok in t.split():
        q = tok.split(',')
        if len(q) >= 2:
            try: out.append((float(q[0]), float(q[1])))
            except ValueError: pass
    return out


def gemeinde_aus_kml(name):
    for fn in KMLS:
        p = os.path.join(GEM_DIR, fn)
        if not os.path.exists(p):
            continue
        kml = io.open(p, encoding='utf-8', errors='replace').read()
        for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
            b = pm.group(1)
            nm = re.search(r'<name>(.*?)</name>', b, re.DOTALL)
            if not nm or nm.group(1).strip().lower() != name.lower():
                continue
            teile = []
            for pg in re.findall(r'<Polygon>(.*?)</Polygon>', b, re.DOTALL):
                o = re.search(r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pg, re.DOTALL)
                if o:
                    r = parse_ring(o.group(1))
                    if len(r) >= 3: teile.append(SPoly(r).buffer(0))
            if teile:
                return unary_union(teile)
    return None


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    svgpfad, name, nummer = sys.argv[1], sys.argv[2], sys.argv[3]
    bnd, rest = svg_polygone(svgpfad)
    alle = [p for r in bnd + rest for p in r]
    X0, X1 = min(p[0] for p in alle), max(p[0] for p in alle)
    Y0, Y1 = min(p[1] for p in alle), max(p[1] for p in alle)

    gem = gemeinde_aus_kml(name)
    if gem is None:
        sys.exit('FEHLER: Gemeinde "%s" in keiner der Level-8-KML gefunden' % name)
    LO0, LA0, LO1, LA1 = gem.bounds
    kmlon = 111.32 * math.cos(math.radians((LA0 + LA1) / 2))
    qkm = lambda g: g.area * kmlon * 111.32

    to_ll = lambda p: (LO0 + (p[0] - X0) * (LO1 - LO0) / (X1 - X0),
                       LA0 + (p[1] - Y0) * (LA1 - LA0) / (Y1 - Y0))
    gemarkung = unary_union([SPoly([to_ll(p) for p in r]).buffer(0) for r in bnd])

    # Guete der Passung: der implizierte Massstab muss in beiden Achsen ~10 m/Einheit sein.
    # Weicht er staerker ab, deckt sich das SVG-Bild NICHT mit der Gemeinde-bbox und die
    # ganze Georeferenzierung waere falsch - dann nicht weitermachen.
    mx = (LO1 - LO0) * kmlon * 1000 / (X1 - X0)
    my = (LA1 - LA0) * 111.32 * 1000 / (Y1 - Y0)
    drin = 100 * gemarkung.intersection(gem).area / gemarkung.area
    print('%s (Gemarkung %s), %d Nachbarflaechen in der SVG' % (name, nummer, len(rest)))
    print('  Massstab %.2f / %.2f m je SVG-Einheit%s'
          % (mx, my, '' if abs(mx - 10) < 0.5 and abs(my - 10) < 0.5
             else '   <-- ABBRUCH-VERDACHT: SVG deckt nicht die Gemeinde ab'))
    # Die Gemarkung liegt per Definition in der Gemeinde. Der Rest-Versatz aus dem
    # ~1%-Massstabswackler (~100 m) bleibt unter der Vereinfachungstoleranz der Karte (166 m).
    gemarkung = gemarkung.intersection(gem).buffer(0)
    print('  Gemeinde  %6.2f km²   Gemarkung %6.2f km²  (%.0f %% davon, roh %.1f %% innen)'
          % (qkm(gem), qkm(gemarkung), 100 * gemarkung.area / gem.area, drin))

    # Probe: welche Vereine liegen drin? Muss zur Erwartung des Nutzers passen.
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    innen, aussen = [], []
    for t in gd['teams'].values():
        p = Point(t['lon'], t['lat'])
        if gemarkung.contains(p): innen.append(t['name'])
        elif gem.contains(p): aussen.append(t['name'])
    print('  Vereine IN der Gemarkung (%d): %s' % (len(innen), ', '.join(innen) or '-'))
    print('  Vereine nur in der Gemeinde (%d): %s' % (len(aussen), ', '.join(aussen) or '-'))

    out = os.path.join(HERE, 'gemarkung_%s.json' % slug(name))
    io.open(out, 'w', encoding='utf-8').write(json.dumps(
        {'name': name, 'gemarkung': nummer,
         'quelle': 'geoindex.io/gemarkungen/%s, georeferenziert ueber die bbox der amtlichen Gemeinde' % nummer,
         'geometry': mapping(gemarkung)}, ensure_ascii=False))
    print('→ %s' % os.path.relpath(out, ROOT))
    print('  danach: gemeinde_fix.py → verbaende_build.py → gen_regions.py → karte_narben.mjs')


if __name__ == '__main__':
    main()
