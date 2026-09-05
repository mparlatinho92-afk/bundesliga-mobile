#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exportiert ALLE Naht-Luecken zwischen benachbarten Verbandsflaechen als KMZ.

Hintergrund: die Verbandsflaechen entstehen aus der Handzeichnung (Flaechen.kmz) plus
den amtlichen Kreisen. Wo die Verbandsgrenze mitten durch einen Kreis laeuft, hat die
Zeichnung das Veto - treffen sich dort zwei gezeichnete Flaechen nicht exakt, bleibt
zwischen ihnen ein Streifen ohne Besitzer. Die Kreisebene selbst ist an diesen Stellen
lueckenlos; es ist also ein Zeichen-, kein Datenfehler.

Wem so ein Streifen gehoert, sagen die Daten NICHT. Das entscheidet der Nutzer je Paar
am Bild - fuer Baden/Wuerttemberg lautete die Ansage: Baden stimmt, Wuerttemberg war
nicht ganz ausgefuellt, alle Luecken gehoeren Wuerttemberg (steht als NAHT_ZU in
tools/verbaende_build.py). Dieses Skript liefert dieselbe Ansicht fuer die restlichen
Paare.

Aufbau des KMZ (jeder Fetzen ist ein EIGENES Polygon, damit man die Ansicht darauf
filtern kann):
  Naht <A> / <B>     ein Ordner je Paar, nach Gesamtflaeche sortiert, je Luecke ein
                     Placemark mit Flaeche und mittlerer Breite im Namen
  Dreiecke           Luecken, an denen drei oder mehr Verbaende anliegen
  Keine Naht         Loecher mit nur EINEM Anlieger - Seen, Bodden, Auslandszipfel,
                     Bremen. Das sind echte Luecken, sie sollen offen bleiben.
  Verbaende          die Flaechen selbst als Kontext (anfangs ausgeblendet)

Aufruf: python tools/export_naht_kmz.py   ->   tools/naehte.kmz
"""
import os, sys, json, math, zipfile
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import shape, Polygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'naehte.kmz')
SIMP = 0.0002          # ~22 m fuer die Verbandsflaechen; die Fetzen bleiben unveraendert
KM = 111.32
FARBEN = ('1744ff', '00a5ff', '20c997', 'ff7f0e', 'c000c0',
          '4444ff', '00cccc', '888800', '0088ff', '8800ff')


def km2(g):
    return abs(g.area) * KM * KM * math.cos(math.radians(g.centroid.y))


def breite_m(g):
    """mittlere Breite = 2*Flaeche/Umfang, metrisch (cos-Breitengrad-korrigiert)"""
    lat = g.centroid.y
    flaeche = km2(g) * 1e6
    umfang = 0.0
    for ring in [g.exterior] + list(g.interiors):
        c = list(ring.coords)
        for a, b in zip(c, c[1:]):
            umfang += math.hypot((b[0] - a[0]) * KM * math.cos(math.radians(lat)) * 1000,
                                 (b[1] - a[1]) * KM * 1000)
    return 2 * flaeche / umfang if umfang else 0.0


def ring_txt(coords):
    return ' '.join('%.6f,%.6f,0' % (x, y) for x, y in coords)


def poly_kml(g):
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    teile = []
    for p in parts:
        if p.is_empty:
            continue
        inner = ''.join('<innerBoundaryIs><LinearRing><coordinates>%s</coordinates>'
                        '</LinearRing></innerBoundaryIs>' % ring_txt(h.coords) for h in p.interiors)
        teile.append('<Polygon><outerBoundaryIs><LinearRing><coordinates>%s</coordinates>'
                     '</LinearRing></outerBoundaryIs>%s</Polygon>'
                     % (ring_txt(p.exterior.coords), inner))
    if not teile:
        return ''
    return '<MultiGeometry>%s</MultiGeometry>' % ''.join(teile) if len(teile) > 1 else teile[0]


def pm(name, stil, g, beschr=''):
    return ('<Placemark><name>%s</name>%s<styleUrl>#%s</styleUrl>%s</Placemark>'
            % (name, '<description>%s</description>' % beschr if beschr else '', stil, poly_kml(g)))


def main():
    fc = json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))
    V = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in fc['features']}
    print('%d Verbandsflaechen' % len(V))

    U = unary_union(list(V.values())).buffer(0)
    teile = list(U.geoms) if U.geom_type == 'MultiPolygon' else [U]
    loecher = [Polygon(h).buffer(0) for p in teile for h in p.interiors]
    loecher = [h for h in loecher if not h.is_empty]
    print('%d Loecher im Verbandsgebiet (%.2f km2)' % (len(loecher), sum(km2(h) for h in loecher)))

    gruppen = {}
    for h in loecher:
        anlieger = tuple(sorted(v for v, g in V.items() if g.intersects(h.buffer(1e-6))))
        gruppen.setdefault(anlieger, []).append(h)

    paare = {k: v for k, v in gruppen.items() if len(k) == 2}
    drei = {k: v for k, v in gruppen.items() if len(k) >= 3}
    allein = {k: v for k, v in gruppen.items() if len(k) == 1}
    reihe = sorted(paare, key=lambda k: -sum(km2(h) for h in paare[k]))

    print()
    print('%-46s %6s %10s %11s' % ('Naht', 'Stueck', 'km2', 'max Breite'))
    for k in reihe:
        hs = paare[k]
        print('%-46s %6d %10.3f %8.0f m'
              % (' / '.join(k)[:46], len(hs), sum(km2(h) for h in hs),
                 max(breite_m(h) for h in hs)))
    print('%-46s %6d %10.3f' % ('Dreiecke (3+ Anlieger)',
                                sum(len(v) for v in drei.values()),
                                sum(km2(h) for v in drei.values() for h in v)))
    print('%-46s %6d %10.3f' % ('Keine Naht (1 Anlieger, echte Luecken)',
                                sum(len(v) for v in allein.values()),
                                sum(km2(h) for v in allein.values() for h in v)))

    stile = ['<Style id="l%d"><LineStyle><color>ff%s</color><width>2</width></LineStyle>'
             '<PolyStyle><color>99%s</color></PolyStyle></Style>' % (i, c, c)
             for i, c in enumerate(FARBEN)]
    stile.append('<Style id="vb"><LineStyle><color>ff000000</color><width>2</width></LineStyle>'
                 '<PolyStyle><color>22999999</color></PolyStyle></Style>')

    ordner = []
    for i, k in enumerate(reihe):
        hs = sorted(paare[k], key=lambda h: -h.area)
        ordner.append('<Folder><name>%s (%d Stueck, %.2f km2)</name>%s</Folder>'
                      % (' / '.join(k), len(hs), sum(km2(h) for h in hs),
                         ''.join(pm('%.3f km2 - %.0f m breit' % (km2(h), breite_m(h)),
                                    'l%d' % (i % len(FARBEN)), h) for h in hs)))
    if drei:
        inhalt = ''.join(pm('%.3f km2 - %s' % (km2(h), ' / '.join(k)), 'l0', h)
                         for k, v in drei.items() for h in v)
        ordner.append('<Folder><name>Dreiecke (3+ Anlieger)</name>%s</Folder>' % inhalt)
    if allein:
        inhalt = ''.join(pm('%.2f km2 - %s' % (km2(h), k[0]), 'l1', h)
                         for k, v in allein.items() for h in sorted(v, key=lambda h: -h.area))
        ordner.append('<Folder><name>Keine Naht - echte Luecken (Seen, Bodden, Bremen, Ausland)'
                      '</name><visibility>0</visibility>%s</Folder>' % inhalt)
    beteiligt = sorted({v for k in list(paare) + list(drei) for v in k})
    ordner.append('<Folder><name>Verbaende (Kontext)</name><visibility>0</visibility>%s</Folder>'
                  % ''.join(pm(v, 'vb', V[v].simplify(SIMP, preserve_topology=True),
                               '%.0f km2' % km2(V[v])) for v in beteiligt))

    kml = ('<?xml version="1.0" encoding="UTF-8"?>' + chr(10) +
           '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
           '<name>Naht-Luecken zwischen den Verbandsflaechen</name>'
           + ''.join(stile) + ''.join(ordner) + '</Document></kml>')
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('doc.kml', kml)
    print()
    print('-> %s  %.2f MB' % (OUT, os.path.getsize(OUT) / 1e6))


main()
