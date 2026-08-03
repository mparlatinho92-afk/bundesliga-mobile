#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt app/map_regions.js – die Geometrie-Grundlage der Spielkarte.

ERSETZT die alten Hüllen (MAP_HULL_POLYS mit hull/seasonHull/fullHull/voronoiHull).
Statt vier Näherungen aus Vereinspunkten gibt es genau EINE Regel:

    Fläche einer Region = Vereinigung ihrer Landesverbände,
    und wo sich mehrere Regionen einen Verband teilen, schneidet Marching Squares.

Daraus folgt die Aufteilung der 64 Regionen aus team.regions[]:
  * 21 sind selbst ein Landesverband           -> amtliche Fläche, statisch
  *  8 sind Zusammenfassungen (Regionalverband,
       "Baden-Württemberg", "Rheinland-Pfalz/Saar")-> Vereinigung, statisch
  * 35 liegen unterhalb eines Verbands
       (Bayern Südost, Hammonia, Westpfalz …)   -> existieren real nicht,
                                                   werden zur Laufzeit gerechnet

Nur 15 (Verband, Ebene)-Paare müssen überhaupt geteilt werden; die übrigen 51
haben auf ihrer Ebene nur eine Region und bekommen den ganzen Verband.

Ausgabe (app/map_regions.js, wird von manage-v inliniert):
  MAP_VERBAND_POLYS  {Verbandsname: [[ring,…], …]}  – Ringe als [lat,lon] (Leaflet)
  MAP_REGIONS        [{id,label,stufe,whole,split,excelFilter}]
      whole = Verbände, die ganz zu dieser Region gehören
      split = Verbände, die sie sich mit Nachbarregionen teilt (Laufzeit-Rechnung)

Aufruf: python tools/gen_regions.py
"""
import os, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
import math, pickle
from shapely.geometry import shape, Point, Polygon as SPoly, LineString, mapping
from shapely.ops import unary_union, polygonize
from shapely.prepared import prep as prep_geom
from collections import defaultdict, Counter

# ── Marching Squares (Port aus tools/marching.cjs) ───────────────────────────
# Für die 15 (Verband, Ebene)-Paare, in denen sich mehrere Regionen einen Verband
# teilen. Diese Grenzen existieren real nicht – sie folgen der Vereinsverteilung.
CASES = {1:[('B','L')], 2:[('R','B')], 3:[('R','L')], 4:[('T','R')],
         5:[('T','R'),('B','L')], 6:[('T','B')], 7:[('T','L')], 8:[('L','T')],
         9:[('B','T')], 10:[('L','T'),('R','B')], 11:[('R','T')], 12:[('L','R')],
         13:[('B','R')], 14:[('L','B')]}

def _mid(code, x, y):
    return {'T':(x*2+1, y*2), 'R':(x*2+2, y*2+1), 'B':(x*2+1, y*2+2), 'L':(x*2, y*2+1)}[code]

def _contours(labels, target, w, h, box=None):
    """box=(x0,y0,x1,y1) beschraenkt den Suchlauf auf das Umfeld des Labels. Ohne box
    kostet jeder Aufruf das ganze Gitter - bei 5 Staffeln egal, bei 160 Vereinswaben
    (siehe waben_partition) der Unterschied zwischen Sekunden und Minuten."""
    segs = []
    def ins(x, y):
        return 1 if (0 <= x < w and 0 <= y < h and labels[y][x] == target) else 0
    x0, y0, x1, y1 = box or (-1, -1, w, h)
    for y in range(y0, y1):
        for x in range(x0, x1):
            code = ins(x,y)*8 + ins(x+1,y)*4 + ins(x+1,y+1)*2 + ins(x,y+1)
            for a, b in CASES.get(code, ()):
                segs.append((_mid(a,x,y), _mid(b,x,y)))
    if not segs: return []
    start = defaultdict(list)
    for i, sg in enumerate(segs): start[sg[0]].append(i)
    used, rings = [False]*len(segs), []
    for i in range(len(segs)):
        if used[i]: continue
        ring, cur, used[i] = [segs[i][0]], i, True
        for _ in range(len(segs)+5):
            end = segs[cur][1]; ring.append(end)
            nxt = [j for j in start.get(end, ()) if not used[j]]
            if not nxt: break
            cur = nxt[0]; used[cur] = True
        if len(ring) > 3: rings.append(ring)
    return rings

def _chaikin(ring, it=2):
    r = ring
    for _ in range(it):
        out = []
        for i in range(len(r)):
            p, q = r[i], r[(i+1) % len(r)]
            out.append((p[0]*0.75+q[0]*0.25, p[1]*0.75+q[1]*0.25))
            out.append((p[0]*0.25+q[0]*0.75, p[1]*0.25+q[1]*0.75))
        r = out
    return r

# ── Schnitt an den gezeichneten Staffellinien + Kreis-Mehrheit ───────────────
# Vorzugsweg gegenüber Marching Squares: Die Unterregionen folgen dann exakt den
# Kreisgrenzen statt einer Rasterlinie. Die schwarzen Linien aus dem Ordner
# "Staffeleinteilungen" sind die Schnittvorlage; sie sitzen nicht exakt auf den
# Grenzen, entscheiden aber, auf welcher Seite ein Kreis liegt (>50%-Regel).

def load_lines(kmz_path):
    import zipfile
    kml = zipfile.ZipFile(kmz_path).read('doc.kml').decode('utf-8', 'replace')
    out = []
    for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
        b = pm.group(1)
        if '<LineString>' not in b: continue
        co = re.search(r'<LineString>.*?<coordinates>(.*?)</coordinates>', b, re.DOTALL)
        if not co: continue
        pts = []
        for tok in co.group(1).split():
            p = tok.split(',')
            if len(p) >= 2:
                try: pts.append((float(p[0]), float(p[1])))
                except ValueError: pass
        if len(pts) >= 2: out.append(pts)
    return out

def verlaengern(pts, flaechen, max_km=400, schritt_km=2):
    """Endet eine Linie innerhalb einer Fläche, wird sie geradlinig in ihrer bisherigen
    Richtung fortgesetzt, bis sie draußen ist (+3 km Zugabe). Eine Linie zerteilt eine
    Fläche nur, wenn sie von Rand zu Rand geht – handgezeichnete Enden hören oft davor auf."""
    out = list(pts)
    for wo in (0, -1):
        a = out[1] if wo == 0 else out[-2]
        b = out[0] if wo == 0 else out[-1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        if n == 0: continue
        dx, dy = dx / n, dy / n
        rel = [g for g in flaechen if g.contains(Point(b))]
        if not rel: continue
        gefahren = 0.0
        while gefahren < max_km:
            gefahren += schritt_km
            k = schritt_km / 111.0
            b = (b[0] + dx * k / max(0.2, math.cos(math.radians(b[1]))), b[1] + dy * k)
            if not any(g.contains(Point(b)) for g in rel): break
        b = (b[0] + dx * 3 / 111.0, b[1] + dy * 3 / 111.0)
        out.insert(0, b) if wo == 0 else out.append(b)
    return out

def teile_nach_linien(parent, lines, points, kreise):
    """parent: Verbandsfläche · lines: LineStrings · points: [(lon,lat,label)]
    kreise: [shapely] Kreisflächen (bereits auf den Verband geschnitten)
    -> {label: Fläche} oder None, wenn der Schnitt nicht aufgeht."""
    rel = [l for l in lines if l.intersects(parent)]
    if not rel: return None
    faces = [f for f in polygonize(unary_union([parent.boundary] + rel))
             if f.representative_point().within(parent)]
    if len(faces) < 2: return None
    # Jede Teilfläche bekommt die Staffel ihrer Vereine; leere Flächen die des nächsten Vereins
    face_label = []
    for f in faces:
        drin = [lb for lo, la, lb in points if f.contains(Point(lo, la))]
        if drin:
            face_label.append(Counter(drin).most_common(1)[0][0])
        else:
            rp = f.representative_point()
            face_label.append(min(points, key=lambda p: (p[0]-rp.x)**2 + (p[1]-rp.y)**2)[2])
    labels = sorted(set(face_label))
    if len(labels) < 2: return None
    zonen = {lb: unary_union([f for f, l in zip(faces, face_label) if l == lb]).buffer(0)
             for lb in labels}
    # Kreis-Mehrheit: ein Kreis geht KOMPLETT an die Staffel, in der er überwiegend liegt
    teile = defaultdict(list)
    for K in kreise:
        if K.is_empty: continue
        best, bl = 0.0, None
        for lb, z in zonen.items():
            if not z.intersects(K): continue
            a = z.intersection(K).area
            if a > best: best, bl = a, lb
        if bl: teile[bl].append(K)
    if len(teile) < 2: return None
    erg = {lb: unary_union(ps).buffer(0) for lb, ps in teile.items()}
    # Güte-Schranke: Ganze Kreise zu verschmelzen heißt, dass einzelne Vereine in der
    # Nachbarstaffel landen können – das ist gewollt. Wo ein Verband aber aus so wenigen
    # Kreisen besteht, dass die Mehrheitsregel die halbe Stadt umkippt (Hamburg: Stadt +
    # Pinneberg = 2 Kreise für 2 Staffeln), ist das Ergebnis unbrauchbar. Dann lieber
    # Marching Squares, das jeden Verein per Konstruktion richtig einordnet.
    fehl = sum(1 for lo, la, lb in points
               if lb in erg and not erg[lb].contains(Point(lo, la)))
    if fehl > len(points) * MAX_FEHL: return None
    return erg


def teile_nach_kreisen(parent, points, kreise):
    """Staffeln aus GANZEN Kreisen zusammensetzen - ohne Staffellinien, allein ueber die
    Vereinsmehrheit je Kreis. Fuer Verbaende, deren Staffeln real den Kreisgrenzen folgen.

    Unterschied zu teile_nach_linien: dort schneiden erst die gezeichneten Linien den Verband
    in Zonen, und die Kreise werden diesen Zonen zugeschlagen. Hier gibt es keine Linien - der
    Kreis geht dorthin, wo die meisten seiner Vereine spielen. Im SWFV tragen 21 von 22 Kreisen
    diese Regel einstimmig.

    -> {label: Flaeche} oder None, wenn der Schnitt nicht aufgeht."""
    if not kreise: return None
    zuord, ohne = {}, []
    for i, K in enumerate(kreise):
        if K.is_empty: continue
        drin = [lb for lo, la, lb in points if K.contains(Point(lo, la))]
        if drin: zuord[i] = Counter(drin).most_common(1)[0][0]
        else: ohne.append(i)
    if len(set(zuord.values())) < 2: return None
    # Kreise ohne Verein: an die Staffel mit der laengsten gemeinsamen Grenze. Sortiert, damit
    # der Lauf reproduzierbar bleibt.
    for i in ohne:
        K = kreise[i]
        best, bl = -1.0, None
        for j, lb in sorted(zuord.items(), key=lambda x: (x[1], x[0])):
            l = K.intersection(kreise[j].buffer(1e-7)).length
            if l > best: best, bl = l, lb
        if bl is None:
            bl = min(points, key=lambda p: (p[0]-K.representative_point().x)**2
                                         + (p[1]-K.representative_point().y)**2)[2]
        zuord[i] = bl
    teile = defaultdict(list)
    for i, lb in zuord.items(): teile[lb].append(kreise[i])
    erg = {lb: unary_union(ps).buffer(0) for lb, ps in sorted(teile.items())}
    # Gleiche Guete-Schranke wie bei den Linien: ganze Kreise zu verschmelzen darf einzelne
    # Vereine in die Nachbarstaffel schieben, aber nicht die halbe Liga.
    fehl = sum(1 for lo, la, lb in points
               if lb in erg and not erg[lb].contains(Point(lo, la)))
    if fehl > len(points) * MAX_FEHL: return None
    return erg


def partition(parent, points, res=200):
    """parent: shapely-Fläche des Verbands · points: [(lon,lat,label)]
    -> {label: shapely-Fläche}. Lückenlos innerhalb von parent."""
    minx, miny, maxx, maxy = parent.bounds
    latm = (miny+maxy)/2.0
    kx = math.cos(math.radians(latm))
    wdeg, hdeg = (maxx-minx)*kx, (maxy-miny)
    w = max(8, int(round(res * wdeg/max(wdeg, hdeg))))
    h = max(8, int(round(res * hdeg/max(wdeg, hdeg))))
    sx, sy = (maxx-minx)/(w-1), (maxy-miny)/(h-1)
    prep = prep_geom(parent)
    labels = []
    for yi in range(h):
        lat = maxy - yi*sy
        row = [None]*w
        for xi in range(w):
            lon = minx + xi*sx
            if not prep.contains(Point(lon, lat)): continue
            best, bl = 1e18, None
            for plon, plat, lb in points:
                dx = (plon-lon)*kx; dy = plat-lat
                d = dx*dx + dy*dy
                if d < best: best, bl = d, lb
            row[xi] = bl
        labels.append(row)
    out = {}
    # sorted(): ohne feste Reihenfolge ist der ganze Lauf nicht reproduzierbar. Ein Python-set
    # iteriert wegen der Hash-Randomisierung in JEDEM Prozess anders; davon haengt ab, in
    # welcher Reihenfolge unten die Restschnipsel vergeben werden - zwei identische Laeufe
    # lieferten dadurch bei 4 von 64 Regionen verschiedene Flaechen. Das macht jeden Diff
    # unbrauchbar: man sieht nicht mehr, was die eigene Aenderung bewirkt hat.
    # Umfeld je Label einmal bestimmen, damit _contours nicht jedes Mal das ganze Gitter laeuft
    boxen = {}
    for yi in range(h):
        for xi in range(w):
            lb = labels[yi][xi]
            if lb is None: continue
            b = boxen.get(lb)
            if b is None: boxen[lb] = [xi, yi, xi, yi]
            else:
                if xi < b[0]: b[0] = xi
                if yi < b[1]: b[1] = yi
                if xi > b[2]: b[2] = xi
                if yi > b[3]: b[3] = yi
    for lb in sorted({p[2] for p in points}):
        polys = []
        b = boxen.get(lb)
        if b is None: continue
        box = (b[0] - 1, b[1] - 1, min(b[2] + 1, w), min(b[3] + 1, h))
        for ring in _contours(labels, lb, w, h, box):
            geo = [(minx + gx/2.0*sx, maxy - gy/2.0*sy) for gx, gy in _chaikin(ring)]
            if len(geo) < 4: continue
            try: p = SPoly(geo).buffer(0)
            except Exception: continue
            if not p.is_empty and p.area > 0: polys.append(p)
        if polys:
            g = unary_union(polys).intersection(parent).buffer(0)   # sauber am Verbandsrand abschneiden
            if not g.is_empty: out[lb] = g
    # Rest auffüllen: Glättung und Vereinfachung ziehen die Kontur nach innen, dadurch blieb
    # entlang der Verbandsgrenze ein schmaler Streifen unbesetzt (~0,6 % der Fläche) – auf der
    # Karte sichtbar als Spalt zwischen Staffel und Nachbarverband. Jedes Reststück geht an die
    # Staffel, an die es grenzt (längste gemeinsame Grenze); so decken die Staffeln den Verband
    # exakt ab, ohne dass eine Linie verschoben wird.
    if out:
        rest = parent.difference(unary_union(list(out.values()))).buffer(0)
        if not rest.is_empty:
            teile = list(rest.geoms) if rest.geom_type.startswith('Multi') else [rest]
            for st in teile:
                if st.is_empty or st.area <= 0: continue
                best, bl = -1.0, None
                # Nur Nachbarn pruefen, deren Huellrechteck das Reststueck beruehrt. Bei 5 Staffeln
                # war die volle Schleife billig, bei 160 Vereinswaben ist sie es nicht mehr.
                sb = st.bounds
                for lb, g in sorted(out.items()):
                    gb = g.bounds
                    if gb[0] > sb[2] + 1e-6 or gb[2] < sb[0] - 1e-6 or \
                       gb[1] > sb[3] + 1e-6 or gb[3] < sb[1] - 1e-6: continue
                    l = st.intersection(g.buffer(1e-7)).length
                    if l > best: best, bl = l, lb   # bei Gleichstand gewinnt der erste Name
                if bl is None:
                    bl = min(out, key=lambda k: out[k].distance(st))
                out[bl] = unary_union([out[bl], st]).buffer(0)
    return out


# ── Waben: eine Flaeche je Verein statt je Staffel ───────────────────────────
# Dieselbe Rechnung wie oben, nur mit dem Vereinsnamen als Label. Die Staffelflaeche
# ist dann die Vereinigung der Waben ihrer Vereine - und weil die App zur Laufzeit
# genau diese Vereinigung nachbildet, kann die gebaute Karte gar nicht von der
# gespielten abweichen. Sie sind per Konstruktion dieselbe Geometrie.
# Der Grund fuer den Umweg: die Staffelzugehoerigkeit aendert sich im Spiel (Geo-
# Balancierung schiebt Grenzvereine in die Nachbarstaffel), team.regions dagegen nie.
# Waben neu zu gruppieren kostet Millisekunden; Marching Squares im Browser laufen
# zu lassen kostete auf dem Handy Sekunden und braeuchte Polygon-Booleans, die es
# in JS nicht gibt.
def waben_partition(parent, teampunkte):
    """teampunkte: [(lon,lat,Vereinsname)] -> {Vereinsname: Flaeche}. Deckt parent exakt ab."""
    return partition(parent, teampunkte)


def _dp(pts, tol):
    """Douglas-Peucker auf einer offenen Punktfolge [(lat,lon)]; Enden bleiben."""
    if len(pts) < 3: return list(range(len(pts)))
    keep = [0, len(pts) - 1]
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        nn = dx*dx + dy*dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if nn == 0: d = (px-ax)**2 + (py-ay)**2
            else:
                t = ((px-ax)*dx + (py-ay)*dy) / nn
                t = 0.0 if t < 0 else (1.0 if t > 1 else t)
                d = (px - (ax + t*dx))**2 + (py - (ay + t*dy))**2
            if d > best: best, bi = d, i
        if best > tol * tol:
            keep.append(bi); stack.append((a, bi)); stack.append((bi, b))
    return sorted(keep)


def waben_export(waben, tol=None):
    """{Verband: {Verein: Flaeche}} -> {Verband: {pts:[[lat,lon],…], cells:{Verein:[[i,…],…]}}}
    Punkte kommen in einen gemeinsamen Pool je Verband: die Grenze zwischen zwei Waben
    gehoert beiden, ihre Stuetzpunkte wuerden sonst doppelt in der Datei stehen.
    Ringe werden orientiert (aussen gegen den Uhrzeigersinn, Loecher mit) - die Laufzeit
    unterscheidet Aussenring und Loch spaeter am Vorzeichen der Flaeche.

    Vereinfacht wird BOGENWEISE, nicht wabenweise: ein Bogen ist ein Stueck Rand, das
    immer denselben Waben gehoert, und endet dort, wo eine dritte Wabe dazustoesst.
    Jeder Bogen wird genau einmal ausgeduennt und beiden Nachbarn identisch zurueck-
    gegeben. Wuerde man jede Wabe fuer sich vereinfachen, liefen die gemeinsamen
    Grenzen auseinander - zur Laufzeit blieben Kanten uebrig, die sich nicht mehr
    ausloeschen, und zwischen den Staffeln klafften Spalte.
    Ohne das ist die Datei 5,8 MB: der Verbandsaussenrand steckt in voller Kreis-
    aufloesung in jeder Randwabe."""
    from shapely.geometry.polygon import orient
    out = {}
    for v, cells in sorted(waben.items()):
        pool, idx = [], {}
        def pi(x, y):
            k = (round(y, NDIGITS), round(x, NDIGITS))
            if k not in idx:
                idx[k] = len(pool); pool.append([k[0], k[1]])
            return idx[k]
        def ring_idx(coords):
            # Auf 110 m gerundet fallen Nachbarpunkte zusammen; solche Nullkanten muessen raus,
            # sonst findet die Kantenausloeschung zur Laufzeit Kanten, die keine Richtung haben.
            r = [pi(x, y) for x, y in coords]
            if len(r) > 1 and r[0] == r[-1]: r.pop()
            sauber = [i for k, i in enumerate(r) if i != r[k-1]]
            return sauber if len(sauber) >= 3 else None
        cs = {}
        for name, g in sorted(cells.items()):
            if g.is_empty: continue
            parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
            ringe = []
            for p in parts:
                if p.is_empty or p.area <= 0: continue
                p = orient(p, 1.0)
                for cc in [p.exterior.coords] + [hl.coords for hl in p.interiors]:
                    ri = ring_idx(cc)
                    if ri: ringe.append(ri)
            if ringe: cs[name] = ringe

        if tol:
            # 1) Wem gehoert welcher Punkt? Ein Bogen endet, wo sich diese Menge aendert.
            besitzer = defaultdict(set)
            for name, ringe in cs.items():
                for r in ringe:
                    for i in r: besitzer[i].add(name)
            schluessel = {i: frozenset(s) for i, s in besitzer.items()}
            # 2) Entschieden wird PUNKTWEISE, nicht ringweise: Douglas-Peucker laeuft ueber die
            # Boegen, haelt aber nur fest, WELCHE Punkte bleiben. Danach wird jeder Ring auf
            # diese Menge gefiltert. Ein Punkt faellt damit bei allen Nachbarn zugleich weg -
            # anders als beim bogenweisen Neubau, wo zwei Nachbarn denselben Bogen verschieden
            # zerlegen koennen (gemessen: die Kantenausloeschung fiel dadurch von 62 auf 29 %).
            behalten = set()
            gesehen = set()
            for name, ringe in cs.items():
                for r in ringe:
                    n = len(r)
                    knoten = [k for k in range(n) if schluessel[r[k]] != schluessel[r[k-1]]]
                    if not knoten:
                        for i in _dp([pool[i] for i in r] + [pool[r[0]]], tol):
                            behalten.add(r[i % n])
                        continue
                    rr = r[knoten[0]:] + r[:knoten[0]]
                    grenzen = [k for k in range(1, n) if schluessel[rr[k]] != schluessel[rr[k-1]]] + [n]
                    start = 0
                    for e in grenzen:
                        seq = rr[start:e] + [rr[e % n]]
                        start = e
                        behalten.add(seq[0]); behalten.add(seq[-1])
                        k = tuple(seq) if seq[0] < seq[-1] else tuple(reversed(seq))
                        if k in gesehen: continue
                        gesehen.add(k)
                        keep = _dp([pool[j] for j in k], tol)
                        # Ein Bogen, von dem nur die Enden uebrig bleiben, ist eine gerade
                        # Strecke - und zwei verschiedene Boegen zwischen denselben Knoten
                        # werden dann zur SELBEN Kante. Beim Vereinigen loeschen sich solche
                        # Kanten nicht mehr paarweise aus, sondern verschwinden zu zweit:
                        # in Hamburg fehlten der Staffel Hansa dadurch 44 % ihrer Flaeche.
                        # Ein festgehaltener Mittelpunkt haelt die beiden Boegen auseinander.
                        if len(keep) == 2 and len(k) > 2: keep.append(len(k) // 2)
                        for i in keep: behalten.add(k[i])
            neu = {}
            for name, ringe in cs.items():
                nr = []
                for r in ringe:
                    rr = [i for i in r if i in behalten]
                    sauber = [i for k, i in enumerate(rr) if i != rr[k-1]]
                    if len(sauber) >= 3: nr.append(sauber)
                if nr: neu[name] = nr
            cs = neu
            benutzt, um = {}, []
            for ringe in cs.values():
                for r in ringe:
                    for i in r:
                        if i not in benutzt: benutzt[i] = len(um); um.append(pool[i])
            cs = {n: [[benutzt[i] for i in r] for r in ringe] for n, ringe in cs.items()}
            pool = um
        # Selbstkontrolle der Topologie. Beim Ausduennen koennen zwei verschiedene Boegen auf
        # dieselbe Strecke fallen; dann kommt eine Kante zweimal in derselben Richtung vor.
        # Die Laufzeit faengt das ab, weil sie Kanten vorzeichenbehaftet ZAEHLT statt sie
        # paarweise zu loeschen - die Flaeche bleibt exakt (Green'scher Satz). Beim Loeschen
        # verschwand so eine Kante ersatzlos, der Staffel Hansa fehlten 44 %.
        # Die Zahl ist also kein Fehler, sondern ein Mass fuer zu duenn geratene Waben:
        # steigt sie sprunghaft, wurde zu stark vereinfacht (tol) oder das Gitter ist zu grob.
        gerichtet, ungerichtet = Counter(), Counter()
        for ringe in cs.values():
            for r in ringe:
                for k in range(len(r)):
                    a, b = r[k], r[(k+1) % len(r)]
                    gerichtet[(a, b)] += 1
                    ungerichtet[(a, b) if a < b else (b, a)] += 1
        dopp = sum(n-1 for n in gerichtet.values() if n > 1)
        drei = sum(1 for n in ungerichtet.values() if n > 2)
        if dopp or drei:
            print('   Waben-Topologie %-19s %4d Kanten doppelt gerichtet, %3d an >2 Waben '
                  '(von der Kantenzählung abgefangen)' % (v, dopp, drei))
        out[v] = {'pts': pool, 'cells': cs}
    return out


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(HERE, 'verbaende.geojson')
OUT  = os.path.join(ROOT, 'app', 'map_regions.js')

SIMPLIFY = 0.0015    # ~165 m - dieselbe Stufe wie die Kreis-Referenzebene (gen_admin.py).
                     # Bei 444 m verschluckte die Glaettung kleine Ausbuchtungen wie die
                     # Gemeinde Gorxheimertal (10,5 km2) - Vereine fielen dann scheinbar
                     # aus ihrer Region, obwohl die Flaeche sie enthaelt.
                     # den Verbandsumriss erneut, deshalb zaehlt hier jeder Stuetzpunkt dreifach
KREIS_STAFFELN = {'Niedersachsen'}   # Verbaende, deren Staffeln echten Kreisgrenzen folgen

# Verbaende, deren Staffeln aus GANZEN Kreisen bestehen sollen - ohne Staffellinien, allein
# ueber die Vereinsmehrheit je Kreis (teile_nach_kreisen). Anders als KREIS_STAFFELN, das die
# gezeichneten Linien als Schnittvorlage braucht.
# Der SWFV gehoert hierher: seine vier Bezirke folgen den Kreisgrenzen, 21 von 22 Kreisen sind
# einstimmig. Marching Squares zog dort eine freie Linie durch die Landschaft und zerschnitt
# 11 Kreise, teils 78/22. Nur eine Positivliste, keine allgemeine Regel - anderswo haben die
# Staffeln keine Verwaltungsentsprechung.
KREIS_MEHRHEIT = {'Südwest'}
MAX_FEHL = 0.15      # Anteil Vereine, die in der Nachbarstaffel landen duerfen, bevor
                     # die Kreis-Mehrheit verworfen und Marching Squares genommen wird
NDIGITS  = 3         # ~110 m Koordinaten-Raster – feiner als die Vereinfachung waere sinnlos

VERBAENDE = ['Baden','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen',
             'Mecklenburg-Vorpommern','Mittelrhein','Niederrhein','Niedersachsen','Rheinland',
             'Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Südbaden','Südwest',
             'Thüringen','Westfalen','Württemberg']
# 'Südwestdeutscher Fußballverband' ist NICHT der Landesverband, sondern der
# Regionalverband ueber RLP+Saarland - der Landesverband heisst schlicht 'Südwest'.
ALIAS = {'Fußballverband Rheinland':'Rheinland',
         'Fußball-Verband Mittelrhein':'Mittelrhein','Hamburger Fußball-Verband':'Hamburg',
         'Bremer Fußball-Verband':'Bremen','Saarländischer Fußballverband':'Saarland',
         'Schleswig-Holsteinischer Fußballverband':'Schleswig-Holstein'}

# Regionsname in game_data.js -> zusaetzlicher Name im Excel. Der Regionsfilter der Karte
# vergleicht excelFilter gegen MAP_TEAM_REGIONS, und das kommt aus dem Excel (gen_map.cjs).
# Wo beide Quellen denselben Verband verschieden schreiben, muessen beide Namen im Filter
# stehen, sonst trifft die Region keinen einzigen Verein. Aktuell genau ein Fall - Stand
# 02.08.2026 sind die 64 Labels sonst deckungsgleich.
EXCEL_ALIAS = {'Südwest': 'Südwestdeutscher Fußballverband'}


def load_teams():
    src = open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    m = re.search(r'"teams"\s*:\s*\{', src); i = m.end() - 1; d = 0
    for j in range(i, len(src)):
        if src[j] == '{': d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0: break
    return json.loads(src[i:j + 1])

def verband_of(regs):
    for r in regs or []:
        if r in VERBAENDE: return r
        if r in ALIAS: return ALIAS[r]
    return None

def slug(s):
    """Muss zeichengenau der ID-Bildung in gen_map.cjs entsprechen
    (v.replace(/[^a-z0-9]/gi,'_').toLowerCase()): JEDES Nicht-ASCII-Alnum wird zu genau
    einem '_', ohne Zusammenfassen. Sonst brechen MAP_HIER, gespeicherte Auswahlen und
    die Steckbrief-Verlinkung, die alle auf diesen IDs stehen."""
    return ''.join(c if (c.isascii() and c.isalnum()) else '_' for c in s).lower()


def main():
    teams = load_teams()

    # 1) Welche Region liegt auf welcher Ebene, und wie verteilen sich die Vereine
    #    eines Verbands auf die Regionen dieser Ebene?
    stufe_of = {}
    label_verb = defaultdict(set)                 # Region -> beteiligte Verbände
    per_vl = defaultdict(lambda: defaultdict(int))  # (Verband, Ebene) -> {Region: n}
    for t in teams.values():
        v = verband_of(t.get('regions'))
        for k, r in enumerate(t.get('regions') or []):
            stufe_of.setdefault(r, k + 1)
            stufe_of[r] = min(stufe_of[r], k + 1)
            if v:
                label_verb[r].add(v)
                per_vl[(v, k + 1)][r] += 1

    # 2) Region -> whole / split
    regions = []
    for r, vs in sorted(label_verb.items(), key=lambda x: (stufe_of[x[0]], x[0])):
        s = stufe_of[r]
        whole, split = [], []
        for v in sorted(vs):
            (whole if len(per_vl[(v, s)]) == 1 else split).append(v)
        regions.append(dict(id='hull_s%d_%s' % (s, slug(r)), label=r, stufe=s,
                            whole=whole, split=split,
                            excelFilter=[r] + ([EXCEL_ALIAS[r]] if r in EXCEL_ALIAS else [])))

    # KEIN Duplikat fuer den Suedwestdeutschen Fussballverband anlegen. Er fehlt nicht -
    # game_data.js fuehrt ihn unter dem kurzen Verbandsnamen 'Südwest' (Stufe 3, Geschwister
    # von 'Fußballverband Rheinland' und 'Saarland'), nur das Excel schreibt ihn aus. Ein
    # zweiter Eintrag erzeugte eine Stufe-2-Region mit der Flaeche von 'Rheinland-Pfalz/Saar'
    # und demselben excelFilter - die Label->ID-Zuordnung kollidierte, und die Hierarchie
    # haengte an der falschen Region.

    stat = defaultdict(int)
    for r in regions:
        stat['statisch' if not r['split'] else 'teil-dynamisch' if r['whole'] else 'dynamisch'] += 1
    print('Regionen: %d  (%s)' % (len(regions), ', '.join('%s %d' % (k, v) for k, v in sorted(stat.items()))))
    paare = [(v, l) for (v, l), rs in per_vl.items() if len(rs) > 1]
    print('(Verband, Ebene)-Paare mit Teilung: %d von %d' % (len(paare), len(per_vl)))

    # 3) Verbandsflächen laden
    fc = json.load(open(SRC, encoding='utf-8'))
    VG = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in fc['features']}
    fehlt = [v for v in VERBAENDE if v not in VG]
    if fehlt: print('  ⚠ Verband ohne Fläche:', ', '.join(fehlt))

    # 4) Die 15 nötigen Teilungen einmal rechnen (Marching Squares je Verband+Ebene)
    coords = {}
    for t in teams.values():
        if t.get('lat') is None: continue
        coords[t['name']] = (t['lon'], t['lat'])
    # Schnittvorlage: die gezeichneten Staffellinien, Enden geradlinig verlaengert
    KMZ = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Dokumente',
                       'Google Earth Orte', 'Tournament Manager.kmz')
    alleF = list(VG.values())
    lines = [LineString(verlaengern(p, alleF)) for p in load_lines(KMZ)] if os.path.exists(KMZ) else []
    print('   %d Staffellinien geladen (Enden verlaengert)' % len(lines))
    kcache = os.path.join(HERE, '_kreise_cache.pkl')
    kreise_v = defaultdict(list)
    if os.path.exists(kcache):
        K = pickle.load(open(kcache, 'rb'))
        byname = defaultdict(list)
        for k in K: byname[k['name']].append(k['geom'])
        pool = [unary_union(g).buffer(0) for g in byname.values()]
        for v, g in VG.items():
            for K2 in pool:
                if not K2.intersects(g): continue
                teil = K2.intersection(g).buffer(0)
                if not teil.is_empty and teil.area > g.area * 1e-5: kreise_v[v].append(teil)
        print('   Kreis-Teile gesamt: %d' % sum(len(x) for x in kreise_v.values()))

    # Ortsausnahmen innerhalb eines Verbands (tools/staffel_ausnahmen.py). Fehlt die Datei,
    # laeuft alles wie vorher.
    ausnahmen = []
    apfad = os.path.join(HERE, 'staffel_ausnahmen.json')
    if os.path.exists(apfad):
        ausnahmen = json.load(open(apfad, encoding='utf-8'))
        print('   %d Ortsausnahmen: %s'
              % (len(ausnahmen), ', '.join('%s->%s' % (a['name'], a['staffel']) for a in ausnahmen)))

    stuecke = {}
    waben = {}        # Verband -> {Vereinsname: Flaeche}, nur wo dynamisch geteilt wird
    waben_cache = {}  # gleiche Vereinsmenge (Bayern s2 und s3) -> nur einmal rechnen
    todo = [(v, l) for (v, l), rs in per_vl.items() if len(rs) > 1]
    for n, (v, l) in enumerate(sorted(todo), 1):
        pts, namen = [], []
        for t in teams.values():
            if t.get('lat') is None or verband_of(t.get('regions')) != v: continue
            regs = t.get('regions') or []
            if len(regs) >= l:
                pts.append((t['lon'], t['lat'], regs[l-1]))
                namen.append((t['lon'], t['lat'], t['name'], regs[l-1]))
        if v not in VG or len(pts) < 2: continue
        soll = len(per_vl[(v, l)])
        res, weg = None, ''
        # ENTSCHEIDUNG: Unterregionen laufen dynamisch (Marching Squares), nicht ueber
        # verschmolzene Kreise. Staffeln wie 'Bayern Mitte' haben keine reale Grenze -
        # sie SIND die Menge ihrer Vereine, nach Groesse balanciert (26/26/31 in Hessen,
        # 26/32/35/31/36 in Bayern). Eine Kreislinie dort ist erfundene Genauigkeit und
        # schob 44 Vereine auf die falsche Seite; dynamisch sind es 13, alle auf
        # Verbandsebene. Die Verbaende selbst bleiben kreisbasiert - dort gibt es echte
        # Grenzen. USE_LINES=1 schaltet zum Vergleich auf die Kreis-Variante zurueck.
        # Niedersachsen laeuft ueber Linien+KREISE statt dynamisch: seine vier Bezirke sind
        # schlicht die Kreise der alten Regierungsbezirke (Braunschweig, Hannover, Lueneburg,
        # Weser-Ems). Da reichen ganze Kreise zu 100%, und die schwarzen Staffellinien zeigen
        # zuverlaessig, welcher Kreis wohin gehoert - auch wenn sie selbst nicht metergenau sind.
        # Ueberall sonst haben die Staffeln keine Verwaltungsentsprechung -> dynamisch.
        if kreise_v.get(v) and lines and (v in KREIS_STAFFELN or os.environ.get('USE_LINES')):
            res = teile_nach_linien(VG[v], lines, pts, kreise_v[v])
            if res and len(res) == soll: weg = 'Linien+Kreise'
            else: res = None
        # Ohne Linien, allein ueber die Vereinsmehrheit je Kreis (SWFV).
        if res is None and kreise_v.get(v) and v in KREIS_MEHRHEIT:
            res = teile_nach_kreisen(VG[v], pts, kreise_v[v])
            if res and len(res) == soll: weg = 'Kreis-Mehrheit'
            else: res = None
        if res is None:
            # Waben statt Staffeln: eine Flaeche je Verein, die Staffel ist deren Vereinigung.
            # Ergebnis und Aufwand sind dieselben wie beim Schnitt nach Staffeln - nur bleibt
            # die feinere Zerlegung erhalten, damit die App zur Laufzeit neu gruppieren kann.
            schluessel = (v, tuple(sorted(n for _, _, n, _ in namen)))
            if schluessel not in waben_cache:
                waben_cache[schluessel] = waben_partition(VG[v], [(lo, la, nm) for lo, la, nm, _ in namen])
            wb = waben_cache[schluessel]
            waben[v] = wb
            gruppen = defaultdict(list)
            for _, _, nm, staffel in namen:
                if nm in wb: gruppen[staffel].append(nm)
            res = {st: unary_union([wb[nm] for nm in sorted(ns)]).buffer(0)
                   for st, ns in sorted(gruppen.items())}
            weg = 'Waben (%d Vereine)' % len(wb)
        # Ortsausnahmen: einzelne Gemeinden spielen im Nachbarbezirk. Ueber Kreise ist das
        # nicht abbildbar - die Gemeindegrenze wird aus der Nachbarstaffel herausgeschnitten
        # und der Zielstaffel zugeschlagen (tools/staffel_ausnahmen.py).
        for a in ausnahmen:
            if a['verband'] != v or stufe_of.get(a['staffel']) != l or a['staffel'] not in res:
                continue
            flaeche = SPoly([(x, y) for y, x in a['ring']]).buffer(0)
            for lb in list(res):
                if lb != a['staffel']:
                    res[lb] = res[lb].difference(flaeche).buffer(0)
            res[a['staffel']] = unary_union([res[a['staffel']], flaeche]).buffer(0)
            weg += ' +%s' % a['name']
            if v in waben:
                print('   ⚠ Ortsausnahme %s liegt in einem Waben-Verband - die Laufzeit-'
                      'Vereinigung kennt sie nicht, gebaute und gespielte Karte weichen ab' % a['name'])
        for lb, g in res.items(): stuecke[(v, l, lb)] = g
        print('   [%2d/%d] %-22s s%d -> %d/%d Teile  (%s)'
              % (n, len(todo), v, l, len(res), soll, weg))

    # 5) Fläche je Region zusammensetzen: ganze Verbände + ggf. Teilstücke
    npts = 0
    voll = {}
    for r in regions:
        gs = [VG[v] for v in r['whole'] if v in VG]
        gs += [stuecke[(v, r['stufe'], r['label'])] for v in r['split']
               if (v, r['stufe'], r['label']) in stuecke]
        if not gs:
            print('   ⚠ keine Fläche für %s' % r['label']); r['geo'] = []; continue
        g_voll = unary_union(gs).buffer(0)
        voll[r['label']] = g_voll
        g = g_voll.simplify(SIMPLIFY, preserve_topology=True)
        parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
        out = []
        for p in parts:
            if p.is_empty or p.area < 1e-6: continue
            rings = [[[round(y, NDIGITS), round(x, NDIGITS)] for x, y in p.exterior.coords]]
            for hI in p.interiors:
                rings.append([[round(y, NDIGITS), round(x, NDIGITS)] for x, y in hI.coords])
            out.append(rings); npts += sum(len(ri) for ri in rings)
        r['geo'] = out
    print('Regionsflächen: %d Stützpunkte gesamt (Vereinfachung %.0f m)' % (npts, SIMPLIFY * 111000))
    # Volle Auflösung separat ablegen: der KML-Export soll die Grenzen zeigen, wie sie
    # wirklich sind – dort ist die Kreisgrenze der Maßstab, keine Dateigröße.
    fc_voll = dict(type='FeatureCollection', features=[
        dict(type='Feature', properties=dict(name=k, split=bool(next((r for r in regions if r['label']==k), {}).get('split'))),
             geometry=mapping(g)) for k, g in voll.items()])
    pfad_voll = os.path.join(HERE, 'regionen_full.geojson')
    json.dump(fc_voll, open(pfad_voll, 'w', encoding='utf-8'), ensure_ascii=False)
    print('→ tools/regionen_full.geojson  %.2f MB (volle Auflösung, nur für den KML-Export)'
          % (os.path.getsize(pfad_voll) / 1e6))

    # 5b) Fehlzuordnungen festhalten: Vereine, die NICHT in einer ihrer eigenen Regionen liegen.
    # Unvermeidlich, sobald ganze Kreise verschmolzen werden – gehört ein Kreis mehrheitlich
    # zur Nachbarstaffel, wandert er komplett dorthin, auch wenn ein Verein dort anders spielt.
    # Wird gegen die FERTIG VEREINFACHTE Geometrie geprüft, damit die Karte genau das zeigt,
    # was hier gezählt wird. Die Karte färbt diese Vereine rot (MAP_MISFITS).
    geo_of = {r['label']: [[ [(p[1], p[0]) for p in ring] for ring in poly] for poly in r['geo']]
              for r in regions}
    def drin(lon, lat, polys):
        for poly in polys:
            if not SPoly(poly[0]).contains(Point(lon, lat)): continue
            if any(SPoly(h).contains(Point(lon, lat)) for h in poly[1:]): continue
            return True
        return False
    misfits = {}
    for t in teams.values():
        if t.get('lat') is None: continue
        schlecht = [rg for rg in (t.get('regions') or [])
                    if rg in geo_of and not drin(t['lon'], t['lat'], geo_of[rg])]
        if schlecht: misfits[t['name']] = schlecht
    print('Fehlzuordnungen: %d Vereine (%d Region-Treffer)'
          % (len(misfits), sum(len(v) for v in misfits.values())))

    # 5c) Hierarchie + Geschwister aus den Vereinsketten ableiten.
    # team['regions'] steht in Stufenreihenfolge (s1…s5), also ist jedes Paar aufeinander-
    # folgender Labels ein Eltern-Kind-Paar. Frueher standen beide Tabellen als Literale in
    # gen_map.cjs und trugen noch die alten Huellen-IDs (hull_nord, sg_wf12 …); von 54 IDs
    # loeste zuletzt genau eine auf, womit die Karten-Schalter Eltern/Kinder/Geschwister
    # wirkungslos waren. Hier abgeleitet koennen die IDs nicht mehr auseinanderlaufen.
    id_of    = {r['label']: r['id'] for r in regions}
    stufe_id = {r['id']: r['stufe'] for r in regions}
    hier = defaultdict(set)
    for t in teams.values():
        kette = [id_of[r] for r in (t.get('regions') or []) if r in id_of]
        for a, b in zip(kette, kette[1:]):
            # Stufen-Wache: einzelne Vereine stehen in zwei Staffeln derselben Ebene
            # (z.B. Hessen Nord + Hessen Mitte). Ohne die Wache wuerden Geschwister
            # zu Eltern und Kindern voneinander.
            if stufe_id[b] > stufe_id[a]:
                hier[a].add(b)
    # Geschwister = gleiche Eltern auf gleicher Stufe. Mehrfach-Eltern bleiben erhalten
    # (Bayern Mitte haengt unter Nord UND Sued, Sachsen-Anhalt unter Nordost-Nord und -Sued).
    sib = defaultdict(set)
    for kinder in hier.values():
        for a in kinder:
            for b in kinder:
                if a != b and stufe_id[a] == stufe_id[b]:
                    sib[a].add(b)
    hier_out = {k: sorted(v) for k, v in sorted(hier.items())}
    sib_out  = {k: sorted(v) for k, v in sorted(sib.items())}
    verwaist = [r['id'] for r in regions
                if r['stufe'] > 1 and not any(r['id'] in v for v in hier.values())]
    print('Hierarchie: %d Eltern, %d Geschwister-Eintraege, %d verwaiste Regionen%s'
          % (len(hier_out), len(sib_out), len(verwaist),
             (' ' + ', '.join(verwaist)) if verwaist else ''))

    # 6) Schreiben – eine Geometrie je Region, nichts sonst
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    NL = chr(10)
    kopf = NL.join([
        '// Automatisch generiert von tools/gen_regions.py – nicht manuell editieren.',
        '// Fläche einer Region = Vereinigung ihrer Landesverbände (amtliche Kreisgrenzen);',
        '// wo mehrere Regionen sich einen Verband teilen (15 Fälle), schneidet Marching',
        '// Squares entlang der Vereinsverteilung. Ersetzt die alten Hüllen',
        '// (hull/seasonHull/fullHull/voronoiHull) – eine Geometrie statt vier Näherungen.',
        '// geo = [[Außenring, Loch, …], …] als [lat,lon] (Leaflet-Konvention).',
        '// MAP_MISFITS = Vereine, die nicht in einer ihrer eigenen Regionen liegen –',
        '// Folge der Kreis-Mehrheitsregel; die Karte färbt sie rot.',
        '// MAP_HIER = Eltern → Kinder, MAP_SIBLING_MAP = Region → Geschwister derselben',
        '// Stufe. Beide aus team.regions abgeleitet, damit sie dieselben IDs tragen wie',
        '// MAP_REGIONS (früher Literale in gen_map.cjs, die auf alte Hüllen-IDs zeigten).',
        '// MAP_WABEN = die Zerlegung UNTER den dynamischen Staffeln: eine Fläche je Verein.',
        '// Eine Staffel ist die Vereinigung der Waben ihrer Vereine – so kann die App die',
        '// Grenzen zur aktuellen Saison neu gruppieren, ohne Marching Squares im Browser.',
        '// {Verband: {pts:[[lat,lon],…], cells:{Verein:[Ring,…]}}}, Ring = Punkt-Indizes;',
        '// gemeinsame Grenzpunkte stehen nur einmal im pts-Pool.', ''])
    wb_out = waben_export(waben, tol=SIMPLIFY)
    nz = sum(len(d['cells']) for d in wb_out.values())
    npkt = sum(len(d['pts']) for d in wb_out.values())
    nidx = sum(len(r) for d in wb_out.values() for ri in d['cells'].values() for r in ri)
    print('Waben: %d Vereine in %d Verbänden · %d Punkte im Pool · %d Ring-Indizes'
          % (nz, len(wb_out), npkt, nidx))
    with open(OUT, 'w', encoding='utf-8', newline=NL) as f:
        f.write(kopf)
        f.write('const MAP_REGIONS = %s;%s' % (j(regions), NL))
        f.write('const MAP_MISFITS = %s;%s' % (j(misfits), NL))
        f.write('const MAP_HIER = %s;%s' % (j(hier_out), NL))
        f.write('const MAP_SIBLING_MAP = %s;%s' % (j(sib_out), NL))
        f.write('const MAP_WABEN = %s;%s' % (j(wb_out), NL))
    print('→ app/map_regions.js  %.2f MB' % (os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
