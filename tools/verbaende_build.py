#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Baut aus der handgezeichneten Google-Earth-Datei die 21 Landesverbands-Flächen.

MODELL (Vorgabe des Users)
  Die AMTLICHEN KREISE sind das Baumaterial: ein Landesverband ist die Vereinigung
  seiner Kreise. Damit sitzen alle Ränder exakt auf der echten Verwaltungsgrenze, und
  zwischen Nachbarverbänden gibt es bauartbedingt weder Lücken noch Überlappungen.
  Die handgezeichneten Google-Earth-Polygone bestimmen NICHT die Ränder, sondern nur
  die ZUGEHÖRIGKEIT – und sie haben VETO, wo eine Verbandsgrenze mitten durch einen
  Kreis läuft (Hamburger Umland, Rheinhessen/Südwest …): dort wird der Kreis entlang
  der gezeichneten Linie geteilt statt komplett zugeschlagen.

Quellen
  1. "Tournament Manager.kmz" (User, Google Earth) – 15 Verbände auf oberster Ebene,
     6 weitere als Kreis-Bausteine in Unterordnern (werden je Ordner vereinigt).
  2. "Deutschland_border_level6_polygon.kml" (OSM admin_level 6) – die Kreise selbst.

Regeln
  * Deckt EIN Verband >= SPLIT_MIN des Kreises ab, bekommt er ihn ganz (exakte Ränder).
  * Sonst gilt der Kreis als geteilt: jeder beteiligte Verband erhält genau sein
    gezeichnetes Teilstück (Veto der Handzeichnung).
  * Kreisreste, die kein Verband beansprucht, gehen an den flächenmäßig stärksten
    Anlieger – sonst entstünden Löcher im Bundesgebiet.
  * Selbstüberschneidungen werden per buffer(0) repariert.

Ausgabe
  tools/verbaende.geojson          volle Auflösung – für Punkt-in-Polygon/Berechnung
  tools/verbaende_display.geojson  vereinfacht – fürs Zeichnen (map_data.js bleibt schlank)
  tools/_verbaende.svg             Sichtprüfung
Aufruf: python tools/verbaende_build.py
"""
import os, re, sys, json, zipfile, pickle
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import Polygon as SPoly, Point, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Flaechen-Quelle: Flächen.kmz im Projektordner - die vom Nutzer gepflegte Fassung.
# Dort stecken auch die feinen Ortsteil-Schnitte (Korb, Unterkessach, Brinkum,
# Niederwenigern); solche Stellen duerfen NICHT auf ganze Gemeinden gerundet werden.
KMZ = os.path.join(ROOT, 'Flächen.kmz')
if not os.path.exists(KMZ):
    KMZ = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Dokumente',
                       'Google Earth Orte', 'Tournament Manager.kmz')
KREISE = r"C:\Users\lyric\OneDrive\Dokumente\Google Earth Orte\2021 mygeodata\Kreise (District Borders)\Deutschland_border_level6_polygon.kml"
KREIS_CACHE = os.path.join(HERE, '_kreise_cache.pkl')      # regenerierbar, nicht committen

SPLIT_MIN = 0.90       # deckt ein Verband so viel eines Kreises, bekommt er ihn ganz –
                       # ABER nur, wenn kein anderer Verband mitzeichnet (s. CLAIM_MIN)
CLAIM_MIN = 0.02       # ab diesem Anteil ist ein Anspruch ernst gemeint und wird NIE verschluckt.
                       # Ohne das gingen kleine, absichtlich gezeichnete Zipfel verloren:
                       # Württemberg östlich von Neu-Ulm (Günzburg 5%, Unterallgäu 2%), Bremen im
                       # Kreis Diepholz, Hessen im Kreis Aschaffenburg, Niederrhein im Ennepe-Ruhr-Kreis.
SIMPLIFY  = 0.0012     # ~100 m – Anzeige (Zeichnen)
SIMP_GRID = 0.0003     # ~25 m  – Rechnen (Raster/Punkt-in-Polygon); grober schneidet
                       #          Grenzvereine wie Wacker Burghausen (Salzach) weg

# Landesverband-Namen wie sie in game_data.js in team.regions[] vorkommen
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
# Ordnername im KMZ -> Verbandsname
FOLDER_AS_VERBAND = {'Hamburg':'Hamburg','Mittelrhein':'Mittelrhein','Rheinland':'Rheinland',
                     'Schleswig-Holstein':'Schleswig-Holstein','Südwest':'Südwest','Westfalen':'Westfalen'}
# Handzeichnungs-Name (oberste Ebene) -> Verbandsname
TOP_AS_VERBAND = {'Westfalen (heute)':'Westfalen'}


# ── Einlesen ────────────────────────────────────────────────────────────────
def parse_ring(s):
    out = []
    for tok in s.split():
        p = tok.split(',')
        if len(p) >= 2:
            try: out.append((float(p[0]), float(p[1])))
            except ValueError: pass
    return out

def polygons_of(body):
    """Alle <Polygon> eines Placemarks mit korrekt zugeordneten Löchern."""
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

def read_kmz(path):
    with zipfile.ZipFile(path) as z:
        kml = z.read('doc.kml').decode('utf-8', 'replace')
    stack, pending, out = [], None, []
    for t in re.finditer(r'<(Folder|Document)>|</(Folder|Document)>|<name>(.*?)</name>|<Placemark>(.*?)</Placemark>',
                         kml, re.DOTALL):
        if t.group(1): stack.append('?'); pending = len(stack) - 1
        elif t.group(2):
            if stack: stack.pop()
        elif t.group(3) is not None:
            if pending is not None and pending < len(stack):
                stack[pending] = t.group(3).strip(); pending = None
        elif t.group(4) is not None:
            body = t.group(4)
            parts = polygons_of(body)
            if not parts: continue
            nm = re.search(r'<name>(.*?)</name>', body, re.DOTALL)
            valid = all(p.is_valid for p in parts)
            geom = unary_union([p.buffer(0) for p in parts])
            out.append(dict(name=(nm.group(1).strip() if nm else ''), folder=stack[-1] if stack else '',
                            geom=geom, valid=valid))
    return out

def read_kreise(path):
    if os.path.exists(KREIS_CACHE):
        with open(KREIS_CACHE, 'rb') as f: return pickle.load(f)
    print('  … amtliche Kreise werden geparst (einmalig, ~40 s)')
    kml = open(path, encoding='utf-8', errors='replace').read()
    out = []
    for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
        b = pm.group(1)
        nm = re.search(r'<name>(.*?)</name>', b, re.DOTALL)
        if not nm: continue
        parts = polygons_of(b)
        if not parts: continue
        g = unary_union([p.buffer(0) for p in parts])
        if not g.is_empty: out.append(dict(name=nm.group(1).strip(), geom=g))
    with open(KREIS_CACHE, 'wb') as f: pickle.dump(out, f)
    return out

def load_teams():
    src = open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    m = re.search(r'"teams"\s*:\s*\{', src); i = m.end() - 1; d = 0
    for j in range(i, len(src)):
        if src[j] == '{': d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0: break
    T = json.loads(src[i:j + 1])
    out = []
    for t in T.values():
        if t.get('lat') is None or t.get('lon') is None: continue
        v = None
        for r in (t.get('regions') or []):
            if r in VERBAENDE: v = r; break
            if r in ALIAS: v = ALIAS[r]; break
        out.append(dict(name=t['name'], verband=v, pt=Point(t['lon'], t['lat'])))
    return out


# ── Bauen ───────────────────────────────────────────────────────────────────
def main():
    print('1) Google-Earth-Datei lesen')
    rows = read_kmz(KMZ)
    print('   %d Flächen-Placemarks' % len(rows))

    print('2) Amtliche Kreise laden')
    kreise = read_kreise(KREISE)
    kgeoms = [k['geom'] for k in kreise]
    tree = STRtree(kgeoms)
    print('   %d Kreise' % len(kreise))

    print('3) Gezeichnete Verbandsflächen sammeln (nur für die ZUGEHÖRIGKEIT)')
    verband = {}
    for r in rows:
        if r['folder'] in FOLDER_AS_VERBAND:
            verband.setdefault(FOLDER_AS_VERBAND[r['folder']], []).append(r['geom'])
        else:
            name = TOP_AS_VERBAND.get(r['name'], r['name'])
            if name in VERBAENDE: verband.setdefault(name, []).append(r['geom'])
            else: print('     ohne Verbandsbezug (ignoriert): %-24s [%s]' % (r['name'][:24] or '(ohne Namen)', r['folder']))
    hand = {k: unary_union(v).buffer(0) for k, v in verband.items()}
    fehlt = [v for v in VERBAENDE if v not in hand]
    print('   %d/21 gezeichnete Verbände' % len(hand) + ('  ⚠ fehlt: ' + ', '.join(fehlt) if fehlt else ''))

    print('4) Kreis-Pool bauen')
    gebiet = unary_union(list(hand.values())).buffer(0)
    inland = [i for i in range(len(kreise))
              if kgeoms[i].intersects(gebiet) and kgeoms[i].intersection(gebiet).area > kgeoms[i].area * 0.5]
    # Mehrteilige Kreise stehen im KML als getrennte Placemarks (Harburg x4 = Festland + Inseln)
    byname = defaultdict(list)
    for i in inland: byname[kreise[i]['name']].append(kgeoms[i])
    pool = [dict(name=n, geom=unary_union(gs).buffer(0)) for n, gs in byname.items()]
    print('   %d Kreis-Placemarks → %d Kreise (nach Namen vereinigt)' % (len(inland), len(pool)))
    # Stadtstaaten fehlen in der Kreisdatei (admin_level 4). Ihre gezeichnete Fläche IST der Kreis;
    # sie wird aus den umliegenden Kreisen herausgeschnitten, damit nichts doppelt vergeben wird.
    for stadt in ('Berlin', 'Hamburg'):
        if stadt in hand and not any(p['name'] == stadt for p in pool):
            g = hand[stadt]
            for p in pool:
                if p['geom'].intersects(g): p['geom'] = p['geom'].difference(g).buffer(0)
            # Auch die Ansprüche der Nachbarn zurückziehen: Brandenburg umschließt Berlin und
            # beansprucht dessen Fläche sonst zu 100% – wer gewinnt, entschiede die Zufallsreihenfolge
            for v in list(hand):
                if v != stadt and hand[v].intersects(g):
                    hand[v] = hand[v].difference(g).buffer(0)
            pool.append(dict(name=stadt, geom=g))
            print('   + Stadtstaat %s als eigener Kreis (aus der Zeichnung)' % stadt)
    pool = [p for p in pool if not p['geom'].is_empty]

    print('5) Kreise den Verbänden zuordnen – der Kreis ist das Baumaterial')
    parts = defaultdict(list)
    ganz = geteilt = rest_zu = 0
    geteilte = []
    for p in pool:
        K = p['geom']
        anteil = {}
        for v, g in hand.items():
            if not g.intersects(K): continue
            a = g.intersection(K).area / K.area
            if a > 0.002: anteil[v] = a
        if not anteil: continue
        best = max(anteil, key=anteil.get)
        mit = [v for v, a in anteil.items() if v != best and a >= CLAIM_MIN]
        if anteil[best] >= SPLIT_MIN and not mit:
            parts[best].append(K); ganz += 1                       # ganzer Kreis, exakte Ränder
        else:
            # Veto der Handzeichnung: Kreis entlang der gezeichneten Linien teilen.
            # Der Reihe nach vergeben, aber KLEINSTER Anspruch zuerst: Überlappen sich zwei
            # gezeichnete Flächen, ist der kleine Zipfel die bewusste Ausnahme und der große
            # Nachbar die Regel. Andersherum verschluckt der Große die Ausnahme – so ging
            # Brinkum an Niedersachsen, obwohl es in beiden Zeichnungen liegt und zu Bremen soll.
            claimed = None
            for v, a in sorted(anteil.items(), key=lambda x: x[1]):
                if a < CLAIM_MIN: continue
                piece = hand[v].intersection(K)
                if claimed is not None: piece = piece.difference(claimed)
                piece = piece.buffer(0)
                if piece.is_empty: continue
                parts[v].append(piece)
                claimed = piece if claimed is None else unary_union([claimed, piece]).buffer(0)
            rest = K.difference(claimed).buffer(0) if claimed is not None else K
            if not rest.is_empty and rest.area > K.area * 0.005:
                parts[best].append(rest); rest_zu += 1              # Rest an den stärksten Anlieger
            geteilt += 1
            geteilte.append((p['name'], sorted(anteil.items(), key=lambda x: -x[1])))
    print('   %d Kreise ganz zugeordnet · %d geteilt (Veto) · %d Reste angehängt' % (ganz, geteilt, rest_zu))
    for nm, an in geteilte:
        print('     geteilt: %-30s %s' % (nm[:30], ' / '.join('%s %.0f%%' % (v, a * 100) for v, a in an)))

    geo = {v: unary_union(ps).buffer(0) for v, ps in parts.items()}
    fehlt = [v for v in VERBAENDE if v not in geo]
    if fehlt: print('   ⚠ ohne Fläche: ' + ', '.join(fehlt))

    print('6) Gemeinde-Exklaven umhängen (tools/gemeinde_transfers.json)')
    # Manche Vereine gehören einem Verband an, liegen aber im Gebiet eines anderen
    # (Hamburger Verband in Niedersachsen/Schleswig-Holstein, Bremer im Kreis Diepholz,
    # hessischer im bayerischen Alzenau). Über Kreise ist das nicht abbildbar – diese
    # Gemeinden werden aus ihrem bisherigen Verband geschnitten und dem richtigen
    # zugeschlagen. Quelle: tools/gemeinde_fix.py (amtliche Level-8-Grenzen).
    tf = os.path.join(HERE, 'gemeinde_transfers.json')
    if not os.path.exists(tf):
        print('   (keine Datei – python tools/gemeinde_fix.py erzeugt sie)')
    else:
        for e in json.load(open(tf, encoding='utf-8')):
            g = shape(e['geo']).buffer(0)
            ziel = e['ziel']
            if ziel not in geo: continue
            # AUS ALLEN Nachbarn herausschneiden, nicht nur aus stark betroffenen: bleibt auch
            # nur ein Zipfel Ueberlappung stehen, dreht ihn die Splitter-Nachraeumung unten
            # wieder um (dort gewinnt der kleinere Verband) - und die Umhaengung waere umsonst.
            weg = [v for v in geo if v != ziel and geo[v].intersects(g)
                   and geo[v].intersection(g).area > 0]
            for v in weg: geo[v] = geo[v].difference(g).buffer(0)
            geo[ziel] = geo[ziel].union(g).buffer(0)
            print('   %-32s → %-8s (aus %s)' % (e['label'][:32], ziel, ', '.join(weg) or '—'))

    # Nachräumen: Die Gemeinde-Umhängungen schneiden nur dort ab, wo der Nachbar spürbar
    # betroffen ist (>5% der Gemeinde). Kleine Reste bleiben als Splitter liegen – die
    # gehen an den kleineren Verband, damit die bewusste Ausnahme gewinnt.
    ks = sorted(geo, key=lambda k: geo[k].area)
    for a_i, a in enumerate(ks):
        for b in ks[a_i + 1:]:
            if not geo[a].intersects(geo[b]): continue
            ue = geo[a].intersection(geo[b])
            if ue.is_empty or ue.area <= 1e-12: continue
            geo[b] = geo[b].difference(geo[a]).buffer(0)
            print('   Splitter %.2f km² aus %s entfernt (bleibt bei %s)'
                  % (ue.area * 111 * 111 * 0.66, b, a))

    print('7) Prüfen auf Überlappungen (dürfen bauartbedingt nicht auftreten)')
    keys0 = list(geo)
    ov = [(a, b, geo[a].intersection(geo[b]).area) for i, a in enumerate(keys0) for b in keys0[i+1:]
          if geo[a].intersects(geo[b]) and geo[a].intersection(geo[b]).area > 1e-9]
    print('   %d Überlappung(en)' % len(ov))
    for a, b, x in sorted(ov, key=lambda t: -t[2])[:8]:
        print('     %-22s ∩ %-22s %.4f%% von %s' % (a, b, 100 * x / geo[b].area, b))

    teams = load_teams()
    print('7) Prüfen')
    tree2 = STRtree([geo[k] for k in geo]); keys = list(geo)
    ok = 0; wrong = []; outside = []
    for t in teams:
        hits = [keys[i] for i in tree2.query(t['pt']) if geo[keys[i]].contains(t['pt'])]
        if not hits: outside.append(t)
        elif t['verband'] in hits: ok += 1
        else: wrong.append((t['name'], t['verband'], hits))
    print('   Vereine, deren Verband zur Fläche passt: %d/%d (%.2f%%)' % (ok, len(teams), 100 * ok / len(teams)))
    print('   außerhalb aller Flächen: %d' % len(outside))
    for t in outside: print('      %-34s soll: %s' % (t['name'][:34], t['verband']))
    # Kein Fehler: Verbandsmitgliedschaft folgt nicht der Fläche. Alzenau (bayerischer Ort,
    # hessischer Verband), Brinkum/Weyhe (Bremer Verband im Kreis Diepholz), Buchholz, Ahrensburg …
    # sind echte Exklaven. Die Liste dient der Sichtprüfung, nicht als Fehlerzähler.
    print('   Verbandsmitgliedschaft weicht von der Fläche ab (Exklaven, erwartet): %d' % len(wrong))
    for n, soll, ist in wrong[:20]: print('      %-34s soll: %-20s liegt in: %s' % (n[:34], soll, ', '.join(ist)))
    rest = [(a, b) for i, a in enumerate(keys) for b in keys[i+1:]
            if geo[a].intersects(geo[b]) and geo[a].intersection(geo[b]).area > 1e-9]
    print('   verbleibende Überlappungen: %d' % len(rest))

    print('8) Schreiben')
    def fc(gdict, simp=None):
        feats = []
        for k, g in gdict.items():
            gg = g.simplify(simp, preserve_topology=True) if simp else g
            feats.append(dict(type='Feature', properties=dict(name=k, verband=k), geometry=mapping(gg)))
        return dict(type='FeatureCollection', features=feats)
    full = os.path.join(HERE, 'verbaende.geojson')
    disp = os.path.join(HERE, 'verbaende_display.geojson')
    grid = os.path.join(HERE, 'verbaende_grid.geojson')
    json.dump(fc(geo), open(full, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(fc(geo, SIMPLIFY), open(disp, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(fc(geo, SIMP_GRID), open(grid, 'w', encoding='utf-8'), ensure_ascii=False)
    npts = lambda g: sum(len(p.exterior.coords) for p in (g.geoms if g.geom_type == 'MultiPolygon' else [g]))
    print('   %-30s %8.2f MB  %7d Punkte' % ('verbaende.geojson', os.path.getsize(full)/1e6, sum(npts(g) for g in geo.values())))
    print('   %-30s %8.2f MB  %7d Punkte' % ('verbaende_grid.geojson', os.path.getsize(grid)/1e6,
          sum(npts(g.simplify(SIMP_GRID, preserve_topology=True)) for g in geo.values())))
    print('   %-30s %8.2f MB  %7d Punkte' % ('verbaende_display.geojson', os.path.getsize(disp)/1e6,
          sum(npts(g.simplify(SIMPLIFY, preserve_topology=True)) for g in geo.values())))
    write_svg(geo, teams, os.path.join(HERE, '_verbaende.svg'))
    print('   _verbaende.svg')

def write_svg(geo, teams, path):
    PAL = ['#e15759','#4e79a7','#59a14f','#edc949','#af7aa1','#ff9da7','#76b7b2','#9c755f',
           '#bab0ac','#d37295','#8cd17d','#b6992d','#86bcb6','#f1ce63','#a0cbe8','#ffbe7d',
           '#499894','#fabfd2','#79706e','#d7b5a6','#59a14f']
    minx=miny=1e9; maxx=maxy=-1e9
    for g in geo.values():
        x0,y0,x1,y1 = g.bounds
        minx=min(minx,x0); miny=min(miny,y0); maxx=max(maxx,x1); maxy=max(maxy,y1)
    W=1000; kx=0.63
    scale=(W-60)/((maxx-minx)*kx); H=int((maxy-miny)*scale+60)
    px=lambda x,y: ((30+(x-minx)*kx*scale), (30+(maxy-y)*scale))
    def path_of(g):
        out=[]
        for p in (g.geoms if g.geom_type=='MultiPolygon' else [g]):
            for ring in [p.exterior]+list(p.interiors):
                pts=[px(*c) for c in ring.coords]
                out.append('M'+'L'.join('%.1f,%.1f'%q for q in pts)+'Z')
        return ' '.join(out)
    body=''
    for i,(k,g) in enumerate(sorted(geo.items())):
        c=PAL[i%len(PAL)]
        body+='<path d="%s" fill="%s" fill-opacity="0.55" stroke="#fff" stroke-width="0.8" fill-rule="evenodd"/>\n'%(path_of(g.simplify(0.002,True)),c)
    for t in teams:
        x,y=px(t['pt'].x,t['pt'].y)
        body+='<circle cx="%.1f" cy="%.1f" r="1.6" fill="#111" fill-opacity="0.65"/>\n'%(x,y)
    leg=''
    for i,k in enumerate(sorted(geo)):
        c=PAL[i%len(PAL)]; row=i%11; col=i//11
        x=30+col*170; y=H-30+14+row*0  # Legende rechts oben statt unten
        leg+='<rect x="%d" y="%d" width="10" height="10" fill="%s" fill-opacity="0.7"/><text x="%d" y="%d" font-family="sans-serif" font-size="10">%s</text>\n'%(
            W-330+col*165, 40+row*15-8, c, W-315+col*165, 40+row*15, k)
    open(path,'w',encoding='utf-8').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/>\n%s%s</svg>'%(W,H,W,H,body,leg))

if __name__ == '__main__':
    main()
