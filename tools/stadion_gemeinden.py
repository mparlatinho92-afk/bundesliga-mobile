#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ordnet jede Spielstaette (team.venues[] in game_data.js) ihrer Gemeinde zu - mit Einwohnerzahl.

Quelle: BKG VG250-EW (amtliche Gemeindegrenzen + Einwohner, Ebene GF=4 = Landflaeche), GeoPackage
in UTM32. Download einmalig nach tools/_vg250/ (gitignored):
  https://daten.gdz.bkg.bund.de/produkte/vg/vg250-ew_ebenen_1231/aktuell/vg250-ew_12-31.utm32s.gpkg.ebenen.zip

Punkt-in-Polygon. Liegt ein Stadion ausserhalb jeder Gemeinde-Landflaeche (Ufer, Grenzlinie,
Rundung der Koordinate), gilt die naechste Gemeinde, wenn sie hoechstens MAX_ABSTAND_M entfernt
ist - sonst steht das Stadion als "ausland/ohne Gemeinde" im Bericht und bekommt nichts.

Ausgabe: tools/stadion_gemeinden.json  (je Verein + Spielstaette: Gemeinde, AGS, Einwohner, Kreis,
         Land, Abstand bei Randfaellen) und Bericht auf der Konsole.
Danach:  node tools/stadion_gemeinden_einbau.cjs   -> schreibt gem/ags/ew in game_data.js
Pruefung: node tools/stadion_gemeinden_test.cjs    (--selbsttest muss durchfallen)

Aufruf: python tools/stadion_gemeinden.py
"""
import os, sys, json, glob, math, struct, sqlite3, subprocess
sys.stdout.reconfigure(encoding='utf-8')
from shapely import wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'stadion_gemeinden.json')
MAX_ABSTAND_M = 1500
ORT_KORREKTUR_M = 300


def _norm(s):
    return ''.join(ch for ch in (s or '').lower().replace('ß', 'ss') if ch.isalnum())


def passt(ort, gen):
    """europlan-Ort nennt diese Gemeinde: gleich, oder Ort beginnt mit dem Gemeindenamen
    ("Stahlberg-Neubau" -> Stahlberg). Gemeindezusaetze (", Stadt", " a.d. X") zaehlen nicht."""
    o = _norm(ort); k = _norm(gen.split(',')[0].split(' (')[0])
    return bool(o and k) and (o == k or (len(k) >= 5 and o.startswith(k)))


def utm32(lat, lon):
    """WGS84/ETRS89 -> UTM Zone 32N (EPSG:25832), Krueger-Reihe nach Karney (mm-genau)."""
    a, f = 6378137.0, 1 / 298.257222101
    k0, lon0, FE = 0.9996, math.radians(9.0), 500000.0
    n = f / (2 - f)
    A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64)
    al = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16,
          13 * n * n / 48 - 3 * n ** 3 / 5,
          61 * n ** 3 / 240]
    phi, lam = math.radians(lat), math.radians(lon) - lon0
    e = math.sqrt(f * (2 - f))
    t = math.sinh(math.atanh(math.sin(phi)) - e * math.atanh(e * math.sin(phi)))
    xi = math.atan2(t, math.cos(lam))
    eta = math.atanh(math.sin(lam) / math.sqrt(1 + t * t))
    x = eta + sum(al[j] * math.cos(2 * (j + 1) * xi) * math.sinh(2 * (j + 1) * eta) for j in range(3))
    y = xi + sum(al[j] * math.sin(2 * (j + 1) * xi) * math.cosh(2 * (j + 1) * eta) for j in range(3))
    return FE + k0 * A * x, k0 * A * y


def gpkg_geom(blob):
    """GeoPackage-Binary -> shapely (Kopf + Envelope abschneiden, Rest ist WKB)."""
    flags = blob[3]
    env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(flags >> 1) & 7]
    return wkb.loads(bytes(blob[8 + env:]))


def lade_gemeinden():
    p = glob.glob(os.path.join(HERE, '_vg250', '**', 'DE_VG250.gpkg'), recursive=True)
    if not p: sys.exit('VG250-EW fehlt in tools/_vg250/ - Download-Adresse steht im Kopf dieses Skripts.')
    c = sqlite3.connect(p[0])
    krs = {r[0][:5]: r[1] + (' (' + r[2] + ')' if r[2] in ('Kreisfreie Stadt', 'Stadtkreis') else '')
           for r in c.execute("select AGS, GEN, BEZ from vg250_krs where GF=4")}
    lan = {r[0][:2]: r[1] for r in c.execute("select AGS, GEN from vg250_lan where GF=4")}
    stand = open(glob.glob(os.path.join(HERE, '_vg250', '**', 'aktualitaet.txt'), recursive=True)[0]).read().strip()
    gem = []
    for gen, bez, ags, ewz, g in c.execute("select GEN, BEZ, AGS, EWZ, geom from vg250_gem where GF=4"):
        gem.append(dict(gen=gen, bez=bez, ags=ags, ew=ewz, krs=krs.get(ags[:5], ''), land=lan.get(ags[:2], ''),
                        geom=gpkg_geom(g)))
    return gem, stand


def lade_teams():
    js = "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');" \
         "process.stdout.write(JSON.stringify(JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1)).teams))"
    out = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'game_data.js')], capture_output=True, check=True)
    return json.loads(out.stdout.decode('utf-8'))


def main():
    gem, stand = lade_gemeinden()
    tree = STRtree([g['geom'] for g in gem])
    teams = lade_teams()
    erg, rand, ohne, korr = {}, [], [], []
    n = 0
    for tid, t in teams.items():
        for i, v in enumerate(t.get('venues') or []):
            if v.get('lat') is None: continue
            n += 1
            x, y = utm32(v['lat'], v['lon'])
            pt = Point(x, y)
            treffer = [gem[k] for k in tree.query(pt, predicate='intersects')]
            d = 0
            if not treffer:
                k = tree.nearest(pt)
                d = round(gem[k]['geom'].distance(pt))
                if d > MAX_ABSTAND_M:
                    ohne.append((tid, t['name'], v.get('stadName'), v.get('ort'), d, gem[k]['gen']))
                    continue
                treffer = [gem[k]]
                rand.append((t['name'], v.get('stadName'), gem[k]['gen'], d))
            g = treffer[0]
            # Koordinate knapp hinter der Grenze, europlan nennt aber die Nachbargemeinde als Ort:
            # dann gilt die genannte (Werner-Kalle-Arena 157 m vor Zeltingen-Rachtig).
            if not passt(v.get('ort'), g['gen']):
                for k in tree.query(pt.buffer(ORT_KORREKTUR_M)):
                    h = gem[k]
                    if h is not g and passt(v.get('ort'), h['gen']) and h['geom'].distance(pt) <= ORT_KORREKTUR_M:
                        korr.append((t['name'], v.get('stadName'), g['gen'], h['gen'], round(h['geom'].distance(pt))))
                        g = h; break
            e = dict(stadName=v.get('stadName'), ort=v.get('ort'), gem=g['gen'], bez=g['bez'], ags=g['ags'],
                     ew=g['ew'], kreis=g['krs'], land=g['land'])
            if d: e['abstand_m'] = d
            if korr and korr[-1][1] == v.get('stadName') and korr[-1][3] == g['gen']: e['ortskorrektur'] = 1
            erg.setdefault(tid, {})[str(i)] = e
    json.dump(dict(quelle='BKG VG250-EW, Gebietsstand ' + stand, stand=stand, venues=erg),
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    zug = sum(len(x) for x in erg.values())
    print('Quelle: VG250-EW, Gebietsstand %s, %d Gemeinden' % (stand, len(gem)))
    print('%d Spielstaetten, %d zugeordnet (%d davon am Rand <= %d m, %d per Ortsname <= %d m), %d ohne Gemeinde'
          % (n, zug, len(rand), MAX_ABSTAND_M, len(korr), ORT_KORREKTUR_M, len(ohne)))
    for r in rand: print('  Rand  %-30s %-34s -> %s (%d m)' % (r[0][:30], (r[1] or '')[:34], r[2], r[3]))
    for r in korr: print('  Ort   %-30s %-34s %s -> %s (%d m)' % (r[0][:30], (r[1] or '')[:34], r[2], r[3], r[4]))
    for o in ohne: print('  OHNE  %-30s %-34s ort=%s  naechste %s in %d m' % (o[1][:30], (o[2] or '')[:34], o[3], o[5], o[4]))
    # Plausibilitaet: europlan-Ort gegen Gemeindename (nur Hinweis, Ortsteile sind normal)
    abw = []
    for tid, vs in erg.items():
        for e in vs.values():
            o = (e['ort'] or '').lower(); gname = e['gem'].lower()
            kern = gname.split(',')[0].split(' (')[0].split(' i.')[0].split(' a.')[0].split(' an ')[0].split(' am ')[0]
            if o and kern[:5] not in o and o[:5] not in gname: abw.append((teams[tid]['name'], e['ort'], e['gem']))
    print('%d Spielstaetten: europlan-Ort nennt die Gemeinde nicht (meist Ortsteil) - Stichprobe:' % len(abw))
    for a in abw[:25]: print('  %-32s ort=%-28s gem=%s' % (a[0][:32], (a[1] or '')[:28], a[2]))
    ver = len({e['ags'] for vs in erg.values() for e in vs.values()})
    print('%d verschiedene Gemeinden' % ver)
    print('-> %s' % os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
