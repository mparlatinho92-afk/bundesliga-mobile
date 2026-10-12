#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sagt der STANDORT eines Vereins etwas ueber seine Liga? Analyse, kein Einbau.

Je Verein (erste Mannschaften, Spiel-Ligen Ebene 1-8):
  ew       Einwohner der Gemeinde des Hauptstadions (gem/ew aus game_data.js, tools/stadion_gemeinden.py)
  umkreis  Einwohner im Umkreis R km (alle 10.956 Gemeinden aus BKG VG250-EW; grosse Gemeinden in Rasterpunkte
           zerlegt, sonst saesse ganz Berlin auf einem Punkt)
  vereine  andere erste Mannschaften im Umkreis R km (aus game_data.js, also nur Ebene 1-8)
  einzug   umkreis / (1 + vereine)  = Einwohner je Verein in der Gegend ("Konkurrenz in der Jugendarbeit")

Ausgabe: Rangkorrelation (Spearman) jeder Groesse mit der echten Ebene 2025/26, daneben die Stadionkapazitaet
als Vergleich; Mittelwerte je Ebene; Beispiele (Ruhrgebiet, Berlin, Doerfer).
  python tools/standort_analyse.py [R_km ...]        Standard: 10 20
"""
import os, sys, json, glob, math, sqlite3, subprocess
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import stadion_gemeinden as SG

RADIEN = [float(x) for x in sys.argv[1:]] or [10.0, 20.0]
RASTER_KM = 3.0   # Gemeinden groesser als ein solches Feld werden in Rasterpunkte zerlegt


def bevoelkerungspunkte():
    """(x_km, y_km, einwohner) in UTM32. Grosse Gemeinden: Einwohner gleichmaessig auf ein Punktraster."""
    gem, _ = SG.lade_gemeinden()
    from shapely.geometry import Point
    pts = []
    for g in gem:
        geo, ew = g['geom'], g['ew'] or 0
        if ew <= 0: continue
        fl = geo.area / 1e6
        if fl <= RASTER_KM ** 2 * 2:
            c = geo.representative_point(); pts.append((c.x / 1000, c.y / 1000, ew)); continue
        x0, y0, x1, y1 = geo.bounds; s = RASTER_KM * 1000
        raster = []
        y = y0 + s / 2
        while y < y1:
            x = x0 + s / 2
            while x < x1:
                if geo.contains(Point(x, y)): raster.append((x / 1000, y / 1000))
                x += s
            y += s
        if not raster:
            c = geo.representative_point(); raster = [(c.x / 1000, c.y / 1000)]
        for x, y in raster: pts.append((x, y, ew / len(raster)))
    return pts


def spearman(a, b):
    def rang(v):
        o = sorted(range(len(v)), key=lambda i: v[i]); r = [0] * len(v); i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
            for k in range(i, j + 1): r[o[k]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = rang(a), rang(b); n = len(a)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return cov / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))


def main():
    js = "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');" \
         "process.stdout.write(JSON.stringify(JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))))"
    D = json.loads(subprocess.run(['node', '-e', js, os.path.join(ROOT, 'game_data.js')], capture_output=True, check=True).stdout.decode('utf-8'))
    L = D['leagues']
    vereine = []
    for t in D['teams'].values():
        if t.get('isReserve') or t.get('leagueId') not in L: continue
        vs = [v for v in t.get('venues') or [] if v.get('ew')]
        if not vs: continue
        v = max(vs, key=lambda v: v.get('kapazitaet') or 0)
        x, y = SG.utm32(v['lat'], v['lon'])
        vereine.append(dict(name=t['name'], lvl=L[t['leagueId']]['level'], ew=v['ew'], gem=v['gem'],
                            kap=v.get('kapazitaet') or 0, x=x / 1000, y=y / 1000))
    pts = bevoelkerungspunkte()
    print('%d Vereine (erste Mannschaften mit Gemeinde), %d Bevoelkerungspunkte, Summe %.1f Mio.'
          % (len(vereine), len(pts), sum(p[2] for p in pts) / 1e6))
    for R in RADIEN:
        R2 = R * R
        for v in vereine:
            v['um%g' % R] = sum(p[2] for p in pts if (p[0] - v['x']) ** 2 + (p[1] - v['y']) ** 2 <= R2)
            v['nv%g' % R] = sum(1 for w in vereine if w is not v and (w['x'] - v['x']) ** 2 + (w['y'] - v['y']) ** 2 <= R2)
            v['ez%g' % R] = v['um%g' % R] / (1 + v['nv%g' % R])
    hoehe = [-v['lvl'] for v in vereine]     # hoeher = besser
    print('\nRangkorrelation mit der Liga (positiv = je groesser, desto hoeher gespielt):')
    print('  %-34s %6.3f' % ('Stadionkapazitaet (Vergleich)', spearman([v['kap'] for v in vereine], hoehe)))
    print('  %-34s %6.3f' % ('Einwohner der Gemeinde', spearman([v['ew'] for v in vereine], hoehe)))
    for R in RADIEN:
        print('  %-34s %6.3f' % ('Einwohner im Umkreis %g km' % R, spearman([v['um%g' % R] for v in vereine], hoehe)))
        print('  %-34s %6.3f' % ('Vereine im Umkreis %g km' % R, spearman([v['nv%g' % R] for v in vereine], hoehe)))
        print('  %-34s %6.3f' % ('Einwohner je Verein %g km' % R, spearman([v['ez%g' % R] for v in vereine], hoehe)))
    # Teilkorrelation: haelt der Standort etwas, was das Stadion nicht schon sagt? Rang-Residuen gegen Kapazitaet.
    print('\nMedian je Ebene:')
    R = RADIEN[-1]
    print('  Ebene  n    Gemeinde-EW   Umkreis%gkm   Vereine   EW/Verein   Kapazitaet' % R)
    for lv in sorted({v['lvl'] for v in vereine}):
        g = [v for v in vereine if v['lvl'] == lv]
        med = lambda k: sorted(w[k] for w in g)[len(g) // 2]
        print('  %3d  %4d  %11s  %12s  %8d  %10s  %10s' % (lv, len(g), f"{med('ew'):,}".replace(',', '.'),
              f"{round(med('um%g' % R)):,}".replace(',', '.'), med('nv%g' % R),
              f"{round(med('ez%g' % R)):,}".replace(',', '.'), f"{med('kap'):,}".replace(',', '.')))
    json.dump(vereine, open(os.path.join(HERE, '_standort_analyse.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('\nKleinste Einzugsgebiete je Verein (%g km):' % R)
    for v in sorted(vereine, key=lambda v: v['ez%g' % R])[:8]:
        print('  E%d %-30s %-22s EW %7d  Vereine %3d  EW/Verein %7d' % (v['lvl'], v['name'][:30], v['gem'][:22], v['ew'], v['nv%g' % R], v['ez%g' % R]))
    print('Groesste:')
    for v in sorted(vereine, key=lambda v: -v['ez%g' % R])[:8]:
        print('  E%d %-30s %-22s EW %7d  Vereine %3d  EW/Verein %7d' % (v['lvl'], v['name'][:30], v['gem'][:22], v['ew'], v['nv%g' % R], v['ez%g' % R]))
    print('Dichteste Gegenden (Vereine im Umkreis):')
    for v in sorted(vereine, key=lambda v: -v['nv%g' % R])[:6]:
        print('  E%d %-30s %-22s Vereine %3d  EW/Verein %7d' % (v['lvl'], v['name'][:30], v['gem'][:22], v['nv%g' % R], v['ez%g' % R]))


if __name__ == '__main__':
    main()
