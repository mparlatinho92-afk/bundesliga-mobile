#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Holt einzelne Gemeinden aus den amtlichen Level-8-Dateien und schreibt sie als
tools/staffel_ausnahmen.json – Ortsausnahmen INNERHALB eines Verbands.

Abgrenzung zu gemeinde_fix.py / gemeinde_transfers.json: das regelt, welchem LANDESVERBAND
eine Gemeinde zufaellt. Hier geht es eine Ebene tiefer – welcher STAFFEL innerhalb des
Verbands. Anlass ist der SWFV: seine vier Bezirke folgen den Kreisgrenzen, aber ein paar
Orte spielen im Nachbarbezirk. Eisenberg liegt amtlich im Donnersbergkreis (Kreis-Mehrheit
Westpfalz), gehoert fussballerisch aber zum Kreis Rhein-Pfalz und damit nach Vorderpfalz.

Gesucht wird ueber eine KOORDINATE, nicht ueber den Namen: es gibt Eisenberg und Stetten
mehrfach in Deutschland. Die Koordinaten stammen aus europlan (dem Verein am Ort).

Aufruf: python tools/staffel_ausnahmen.py
"""
import os, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import Polygon as SPoly, Point

HERE = os.path.dirname(os.path.abspath(__file__))
GEM_DIR = r"C:\Users\lyric\OneDrive\Dokumente\Google Earth Orte\2021 mygeodata\Gemeinden (Town Borders)"
KMLS = ['Südwest_border_level8_polygon.kml',
        'Süddeutschland (Baden-Württemberg   Bayern)_border_level8_polygon.kml',
        'Nordrhein-Westfalen   Hessen_border_level8_polygon.kml',
        'Norddeutschland_border_level8_polygon.kml',
        'Ostdeutschland_border_level8_polygon.kml']

# Ort -> wohin er gehoert. Die Koordinate ist die des dortigen Vereins laut europlan,
# der Grund steht daneben und ist die reale Ligazugehoerigkeit.
AUSNAHMEN = [
    dict(name='Eisenberg', verband='Südwest', staffel='Vorderpfalz',
         lat=49.5542, lon=8.0577,
         grund='TSG 78/51 Eisenberg spielt in der A-Klasse Rhein-Pfalz -> Vorderpfalz, '
               'amtlich liegt der Ort im Donnersbergkreis (Kreis-Mehrheit Westpfalz)'),
    dict(name='Stetten', verband='Südwest', staffel='Rheinhessen',
         lat=49.6695, lon=8.0856,
         grund='TuS 1860 Stetten spielt in der A-Klasse Alzey-Worms -> Rheinhessen, '
               'amtlich Donnersbergkreis'),
]


def gemeinde_an(lat, lon):
    """Kleinste Gemeindeflaeche, die den Punkt enthaelt (Ortsteile schlagen die Grossgemeinde)."""
    p = Point(lon, lat)
    treffer = []
    for datei in KMLS:
        pfad = os.path.join(GEM_DIR, datei)
        if not os.path.exists(pfad):
            continue
        kml = open(pfad, encoding='utf-8', errors='replace').read()
        for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
            b = pm.group(1)
            nm = re.search(r'<name>(.*?)</name>', b, re.DOTALL)
            for co in re.finditer(r'<coordinates>(.*?)</coordinates>', b, re.DOTALL):
                pts = []
                for tok in co.group(1).split():
                    q = tok.split(',')
                    if len(q) >= 2:
                        try: pts.append((float(q[0]), float(q[1])))
                        except ValueError: pass
                if len(pts) < 4:
                    continue
                try: poly = SPoly(pts).buffer(0)
                except Exception: continue
                if poly.contains(p):
                    treffer.append(((nm.group(1) if nm else '?'), poly))
        if treffer:
            break
    if not treffer:
        return None, None
    treffer.sort(key=lambda x: x[1].area)
    return treffer[0]


def main():
    out = []
    for a in AUSNAHMEN:
        name, poly = gemeinde_an(a['lat'], a['lon'])
        if poly is None:
            print('   ⚠ keine Gemeinde gefunden fuer %s (%.4f, %.4f)' % (a['name'], a['lat'], a['lon']))
            continue
        ring = [[round(y, 5), round(x, 5)] for x, y in poly.exterior.coords]
        print('   %-14s -> %-14s amtlich "%s", %.1f km²'
              % (a['name'], a['staffel'], name, poly.area * 111 * 111 * 0.66))
        out.append(dict(name=a['name'], amtlich=name, verband=a['verband'],
                        staffel=a['staffel'], grund=a['grund'], ring=ring))
    pfad = os.path.join(HERE, 'staffel_ausnahmen.json')
    json.dump(out, open(pfad, 'w', encoding='utf-8'), ensure_ascii=False)
    print('→ tools/staffel_ausnahmen.json  (%d Orte)' % len(out))


if __name__ == '__main__':
    main()
