#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Holt einzelne Gemeinden aus den amtlichen Level-8-Dateien und schreibt sie als
tools/gemeinde_transfers.json – Vorlage für verbaende_build.py.

Hintergrund: Ein paar Vereine gehören einem Verband an, liegen aber im Gebiet eines
anderen (Hamburger Verband in Niedersachsen/Schleswig-Holstein, Bremer Verband im
Kreis Diepholz, hessischer Verband im bayerischen Alzenau). Solche Exklaven lassen
sich nicht über Kreise abbilden – sie brauchen die Gemeindegrenze.

Gesucht wird zweigleisig, weil beides vorkommt:
  * über den VEREIN (Gemeinde, die seine Koordinate enthält) – trifft auch dann,
    wenn der Ort ein Ortsteil ist (Brinkum gehört zu Stuhr)
  * über den NAMEN – für Orte, zu denen es (noch) keinen Verein in game_data gibt

Aufruf: python tools/gemeinde_fix.py
"""
import os, re, sys, json, pickle
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import Point, Polygon as SPoly, mapping, shape
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEM_DIR = r"C:\Users\lyric\OneDrive\Dokumente\Google Earth Orte\2021 mygeodata\Gemeinden (Town Borders)"
KMLS = ['Süddeutschland (Baden-Württemberg   Bayern)_border_level8_polygon.kml',
        'Nordrhein-Westfalen   Hessen_border_level8_polygon.kml',
        'Norddeutschland_border_level8_polygon.kml',
        'Südwest_border_level8_polygon.kml',
        'Ostdeutschland_border_level8_polygon.kml']
OUT = os.path.join(HERE, 'gemeinde_transfers.json')

# Ziel-Verband je Fall. Punkt = Vereinskoordinate (Ortsteil-sicher), sonst Namenssuche.
TRANSFERS = [
    dict(label='Weyhe (SC Weyhe)',             ziel='Bremen',  punkt=(8.84956, 52.98213)),
    dict(label='Buchholz i.d.N. (TSV Buchholz 08)', ziel='Hamburg', punkt=(9.86489, 53.31469)),
    dict(label='Alzenau (FC Bayern Alzenau)',  ziel='Hessen',  punkt=(9.05901, 50.07977)),
    dict(label='Ellerau',                      ziel='Hamburg', name='Ellerau'),
    dict(label='Buxtehude',                    ziel='Hamburg', name='Buxtehude'),
    # Württemberg reisst aus Bayern heraus: drei Gemeinden in Schwaben, drei in Unterfranken.
    # Brinkum/Stuhr steht bewusst NICHT mehr hier - dort schneidet die Handzeichnung
    # ortsteilgenau, eine ganze Gemeinde zu verschieben waere zu grob.
    dict(label='Kettershausen (Schwaben)',     ziel='Württemberg', name='Kettershausen'),
    dict(label='Ebershausen (bei Krumbach)',   ziel='Württemberg', name='Ebershausen'),
    dict(label='Bibertal (Schwaben)',          ziel='Württemberg', name='Bibertal'),
    dict(label='Röttingen (Unterfranken)',     ziel='Württemberg', name='Röttingen'),
    dict(label='Bieberehren (Unterfranken)',   ziel='Württemberg', name='Bieberehren'),
    dict(label='Tauberrettersheim (Unterfr.)', ziel='Württemberg', name='Tauberrettersheim'),
    # Illertissen ist eine Insel des Bayerischen Verbands, aber NUR die Gemarkung des Ortes
    # selbst (097511): der FV Illertissen ist der einzige Verein dieses Ortes und der einzige,
    # der bayerisch spielt. Die Ortsteile Au/Betlinshausen/Jedesheim/Tiefenbach spielen
    # wuerttembergisch. Die ganze Gemeinde zu nehmen war 36,4 statt 14,7 km² – 2,5x zu gross.
    # Die Gemarkung kommt aus tools/gemarkung_illertissen.json (s. Block am Ende von main()).
    dict(label='Illertissen (nur Gemarkung 097511, FV Illertissen)', ziel='Bayern', name='Illertissen'),
    # Gleicher Fall: nur die gleichnamige Ortschaft, nicht Bergfelde/Borgsdorf/Stolpe.
    # 48,5 km² Gemeinde gegen 7,9 km² Gemarkung – hier war es 6x zu gross.
    dict(label='Hohen Neuendorf (nur Gemarkung 123647)', ziel='Berlin', name='Hohen Neuendorf'),
    # Bergisches Land: fuenf Gemeinden gehoeren zum Niederrhein, nicht zum Mittelrhein.
    dict(label='Leichlingen',                  ziel='Niederrhein', name='Leichlingen'),
    dict(label='Wermelskirchen',               ziel='Niederrhein', name='Wermelskirchen'),
    dict(label='Burscheid',                    ziel='Niederrhein', name='Burscheid'),
    dict(label='Hückeswagen',                  ziel='Niederrhein', name='Hückeswagen'),
    dict(label='Radevormwald',                 ziel='Niederrhein', name='Radevormwald'),
    # Ahrensburg komplett an Schleswig-Holstein: der Ahrensburger TSV ist ein einzelner
    # Hamburger Verein, der sich die Adresse (Klaus-Groth-Strasse, Nachbarspielfeld) mit
    # SH-Vereinen teilt - eine reine Mitgliedschaft ohne Flaechenentsprechung.
    dict(label='Ahrensburg',                   ziel='Schleswig-Holstein', name='Ahrensburg'),
    # Zwei Vereine lagen wenige hundert Meter neben ihrer Grenze - die Gemeinde loest es exakt.
    dict(label='Ahrensfelde (Grün-Weiß)',      ziel='Brandenburg', name='Ahrensfelde'),
    dict(label='Gorxheimertal (Unter-Flockenbach)', ziel='Hessen', name='Gorxheimertal'),
]


def parse_ring(s):
    out = []
    for tok in s.split():
        p = tok.split(',')
        if len(p) >= 2:
            try: out.append((float(p[0]), float(p[1])))
            except ValueError: pass
    return out

def polygons_of(body):
    parts = []
    for pg in re.findall(r'<Polygon>(.*?)</Polygon>', body, re.DOTALL):
        o = re.search(r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pg, re.DOTALL)
        if not o: continue
        outer = parse_ring(o.group(1))
        holes = [parse_ring(h) for h in
                 re.findall(r'<innerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pg, re.DOTALL)]
        holes = [h for h in holes if len(h) >= 3]
        if len(outer) >= 3:
            try: parts.append(SPoly(outer, holes))
            except Exception: pass
    return parts


def main():
    offen = list(TRANSFERS)
    gefunden = {}
    for fn in KMLS:
        if not offen: break
        p = os.path.join(GEM_DIR, fn)
        if not os.path.exists(p):
            print('  ⚠ fehlt: %s' % fn); continue
        print('durchsuche %s …' % fn[:46])
        kml = open(p, encoding='utf-8', errors='replace').read()
        for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
            if not offen: break
            b = pm.group(1)
            nm = re.search(r'<name>(.*?)</name>', b, re.DOTALL)
            if not nm: continue
            name = nm.group(1).strip()
            treffer = [t for t in offen if t.get('name') and t['name'].lower() == name.lower()]
            brauchtGeom = bool(treffer) or any(t.get('punkt') for t in offen)
            if not brauchtGeom: continue
            parts = polygons_of(b)
            if not parts: continue
            g = unary_union([x.buffer(0) for x in parts])
            if g.is_empty: continue
            for t in list(offen):
                hit = False
                if t.get('punkt') and g.contains(Point(*t['punkt'])): hit = True
                elif t.get('name') and t['name'].lower() == name.lower(): hit = True
                if not hit: continue
                gefunden[t['label']] = dict(label=t['label'], ziel=t['ziel'], gemeinde=name,
                                            geo=mapping(g))
                offen.remove(t)
                print('   ✓ %-34s → %-8s (Gemeinde: %s, %.1f km²)'
                      % (t['label'][:34], t['ziel'], name, g.area * 111 * 111 * 0.64))
    for t in offen:
        print('   ✗ NICHT GEFUNDEN: %s' % t['label'])

    # Gemarkung statt Gemeinde: wo eine Datei tools/gemarkung_<name>.json liegt, ersetzt deren
    # Polygon die Gemeindeflaeche. Die Level-8-KML kennen nur Gemeinden – reicht ein Verband
    # nur bis zur Gemarkungsgrenze (Illertissen), waere die ganze Gemeinde zu grob.
    for label, eintrag in gefunden.items():
        slug = eintrag['gemeinde'].lower().replace(' ', '_').replace('/', '_')
        p = os.path.join(HERE, 'gemarkung_%s.json' % slug)
        if not os.path.exists(p):
            continue
        gk = json.load(open(p, encoding='utf-8'))
        eintrag['geo'] = gk['geometry']
        # shape() statt Handarbeit: der Zuschnitt an der Gemeindegrenze kann ein MultiPolygon
        # liefern (Hohen Neuendorf), das eine Polygon-Annahme still als 0 km² ausgewiesen hätte.
        flaeche = shape(gk['geometry']).area * 111 * 111 * 0.64
        print('   ↳ %-34s Gemarkung %s statt ganzer Gemeinde (%.1f km²)'
              % (eintrag['gemeinde'][:34], gk.get('gemarkung', '?'), flaeche))

    json.dump(list(gefunden.values()), open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('→ %s  (%d Einträge, %.2f MB)' % (os.path.relpath(OUT, ROOT), len(gefunden),
                                            os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
