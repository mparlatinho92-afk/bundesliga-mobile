#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_ernte.py - liest per Drag&Drop gesammelte Google-Bilder-Links ein.

DER ABLAUF
Der Nutzer zieht aus der Google-Bildersuche die Treffer direkt in einen Ordner. Windows
legt dabei je Link eine `.url`-Datei an (INI-Format mit einer `URL=`-Zeile). Dieses Script
liest den Ordner, holt die Bilder und legt sie als Kandidaten fuer wappen_fm_review.py ab.

WARUM LINKS BESSER SIND ALS HERUNTERGELADENE BILDER
Eine gespeicherte Datei heisst "images.png" und sagt nichts darueber, zu welchem Verein
sie gehoert - der Nutzer muesste jede von Hand umbenennen. Der Google-Link dagegen traegt
die Zuordnung mit sich:

    imgurl=...lookaside.fbsbx.com/...media_id=100057408072058   <- nichtssagend
    imgrefurl=https://www.facebook.com/SVBuechelberg/           <- SV Buechelberg!

Zugeordnet wird deshalb ueber die GANZE Link-Zeile (Quellseite, Dateiname, Suchanfrage),
nicht ueber den Bildnamen. Die Bewertung uebernimmt dieselbe IDF-Logik wie der FM-Abgleich,
damit ein geteiltes "SV" nicht so viel zaehlt wie ein geteiltes "Buechelberg".

QUALITAET WIRD GEMESSEN, NICHT GEGLAUBT
Google meldet in `w=`/`h=` die Masse des Originals - das sagt aber nichts ueber echte
Schaerfe. Ein Facebook-Vorschaubild ist 1043x1043 und trotzdem matschig. Deshalb laeuft
nach dem Laden derselbe Rundtest wie in wappen_fm_apply (um k verkleinern und zurueck:
aendert sich nichts, war es hochskaliert) plus die Foto-Erkennung.

  python tools/wappen_ernte.py                       # Bericht ueber tools/_ernte
  python tools/wappen_ernte.py --ordner "C:/pfad"    # anderer Sammelordner
  python tools/wappen_ernte.py --apply               # Bilder holen + kandidaten.json
"""
import io, os, re, sys, csv, json, math, argparse, collections
import shutil, urllib.parse, urllib.request, importlib.util

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ERNTE = os.path.join(HERE, '_ernte')
CACHE = os.path.join(HERE, '_ernte_bilder')
OUT = os.path.join(HERE, '_ernte_kandidaten.json')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120 Safari/537.36')


BILD = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')


def links(ordner):
    """Alles aus dem Sammelordner: .url (Windows-Verknuepfung), .txt/.html mit URLs -
    UND fertig heruntergeladene BILDDATEIEN. Die sind der Normalfall geworden, seit
    Google die Vorschau-Links nicht mehr im Verlauf ablegt und der Nutzer die Wappen
    direkt speichert. Zugeordnet werden sie ueber den DATEINAMEN, und der traegt den
    Verein meist mit sich ("SV-Furpach-Wappen.jpg")."""
    raus = []
    for f in sorted(os.listdir(ordner)):
        p = os.path.join(ordner, f)
        if not os.path.isfile(p):
            continue
        if f.lower().endswith(BILD):
            raus.append((f, 'datei://' + p))
            continue
        try:
            txt = io.open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        if f.lower().endswith('.url'):
            m = re.search(r'^URL=(.+)$', txt, re.M)
            if m:
                raus.append((f, m.group(1).strip()))
        else:
            for u in re.findall(r'https?://[^\s"\'<>]+', txt):
                raus.append((f, u))
    return raus


def zerlege(url):
    """imgurl / imgrefurl / Suchanfrage aus einem Google-imgres-Link."""
    if url.startswith('datei://'):
        return url, '', '', ('', '')      # lokale Datei, nichts zu zerlegen
    p = urllib.parse.urlparse(url)
    q = urllib.parse.parse_qs(p.query)
    hol = lambda k: urllib.parse.unquote(q.get(k, [''])[0])
    bild = hol('imgurl')
    if not bild and re.search(r'\.(png|jpe?g|svg|webp|gif)(\?|$)', url, re.I):
        bild = url                      # direkter Bildlink, kein imgres
    return bild, hol('imgrefurl'), hol('q'), (hol('w'), hol('h'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ordner', default=ERNTE)
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--min-punkte', dest='minp', type=float, default=0.45,
                    help='wie sicher die Zuordnung sein muss')
    a = ap.parse_args()

    if not os.path.isdir(a.ordner):
        os.makedirs(a.ordner, exist_ok=True)
        print('Sammelordner angelegt: %s\nDort die Links aus Google Bilder hineinziehen.'
              % a.ordner)
        return

    sp = importlib.util.spec_from_file_location('rm', os.path.join(HERE, 'wappen_fm_rematch.py'))
    rm = importlib.util.module_from_spec(sp)
    merk, sys.argv = sys.argv, ['x']
    sp.loader.exec_module(rm)
    sys.argv = merk
    sp3 = importlib.util.spec_from_file_location('doc', os.path.join(HERE, 'wappen_doctor.py'))
    doc = importlib.util.module_from_spec(sp3)
    merk, sys.argv = sys.argv, ['x']
    sp3.loader.exec_module(doc)
    sys.argv = merk
    sp2 = importlib.util.spec_from_file_location('ap2', os.path.join(HERE, 'wappen_fm_apply.py'))
    apm = importlib.util.module_from_spec(sp2)
    merk, sys.argv = sys.argv, ['x']
    sp2.loader.exec_module(apm)
    sys.argv = merk

    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams = gd['teams']
    eff = {r['id']: float(r['eff']) for r in
           csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}

    df = collections.Counter()
    for t in teams.values():
        df.update(set(rm.kern(t['name'])))
    N = len(teams)
    gew = lambda w: max(0.3, math.log(N / (1.0 + df.get(w, 0))))

    def zuordnen(text):
        """Welcher Verein steckt in der Link-Zeile?

        Wortgrenzen helfen hier nicht: Quellseiten schreiben zusammen ("SVBuechelberg",
        "tus-hoppstaedten"), und "SVBuechelberg" laesst sich nicht am Wechsel der
        Gross-/Kleinschreibung trennen, weil zwischen V und B kein Kleinbuchstabe steht.
        Deshalb wird der ganze Link auf eine Buchstabenkette eingedampft und geprueft,
        welche Namenstokens darin VORKOMMEN. Gewichtet wird wie ueberall nach IDF, damit
        ein enthaltenes "sv" nichts zaehlt und ein "buechelberg" alles.
        """
        flach = re.sub(r'[^a-z0-9]', '', urllib.parse.unquote(text).lower().translate(rm.UML))
        best, bw = None, 0.0
        for t, v in teams.items():
            K = [w for w in set(rm.kern(v['name'])) if len(w) >= 4]
            if not K:
                continue
            g = sum(gew(w) for w in K if w in flach) / sum(gew(w) for w in K)
            if g > bw:
                best, bw = t, g
        return best, bw

    gefunden = links(a.ordner)
    print('%d Link(s) im Ordner %s\n' % (len(gefunden), a.ordner))
    os.makedirs(CACHE, exist_ok=True)
    kand, unklar = {}, []
    for datei, url in gefunden:
        bild, ref, frage, wh = zerlege(url)
        if not bild:
            unklar.append((datei, 'keine Bild-URL im Link')); continue
        # Die Suchanfrage enthaelt ALLE Vereine des Blocks - sie taugt nicht zur Zuordnung.
        tid, punkte = zuordnen(ref + ' ' + ('' if bild.startswith('datei://') else bild) + ' ' + datei)
        if not tid or punkte < a.minp:
            unklar.append((datei, 'Verein nicht erkannt (%.2f) %s' % (punkte, ref[:50]))); continue
        nm = teams[tid]['name']
        if not a.apply:
            print('  %-28s <- %-34s  (%.2f, Google meldet %sx%s)'
                  % (nm[:28], (ref or bild)[:34], punkte, wh[0] or '?', wh[1] or '?'))
            continue
        ziel = os.path.join(CACHE, tid + os.path.splitext(bild.split('?')[0])[1][:5].lower())
        if not ziel.lower().endswith(BILD):
            ziel += '.png'
        try:
            if bild.startswith('datei://'):
                shutil.copyfile(bild[8:], ziel)          # schon da, nur einsortieren
            else:
                r = urllib.request.Request(bild, headers={'User-Agent': UA})
                with urllib.request.urlopen(r, timeout=30) as f, open(ziel, 'wb') as g:
                    g.write(f.read())
        except Exception as e:
            unklar.append((datei, 'Laden: %s' % str(e)[:60])); continue
        # Bildersuche liefert fast immer JPG auf WEISS - im Dunkelmodus ein weisser
        # Kasten. wappen_doctor kennt den Fall ("bg"); hier gleich anwenden, sonst
        # muesste man es fuer jedes eingesammelte Bild von Hand nachholen.
        try:
            from PIL import Image as _I
            import numpy as _np
            arr = _np.asarray(_I.open(ziel).convert('RGBA'))
            empf, _inf = doc.analyze(arr)
            if empf == 'bg':
                png = os.path.splitext(ziel)[0] + '.png'
                _I.fromarray(doc.strat_bg(arr.copy())).save(png)
                if png != ziel:
                    os.remove(ziel)
                ziel = png
                print('     (weisser Hintergrund entfernt)')
        except Exception as e:
            print('     Freistellen fehlgeschlagen: %s' % str(e)[:50])
        echt = apm.eff_von(ziel)
        alt = eff.get(tid, 0)
        marke = 'ok' if echt and echt > alt else 'NICHT BESSER'
        print('  %-26s unseres %3.0f -> %4s px  %s' % (nm[:26], alt, int(echt or 0), marke))
        kand[tid] = {'datei': ziel, 'quelle': 'Bildersuche: ' + (urllib.parse.urlparse(ref).netloc or '?')}

    if unklar:
        print('\n%d nicht verwertbar:' % len(unklar))
        for d, w in unklar:
            print('   %-40s %s' % (d[:40], w))
    if a.apply:
        # NIE stumpf ueberschreiben. Diese Datei ist auch eine SAMMELDATEI - der Nutzer
        # traegt dort selbst Links ein. Ein Lauf hat genau so eine von Hand gepflegte
        # Sammlung geloescht; weder Papierkorb noch Schattenkopie hatten sie. Deshalb:
        # vorhandenen Stand einlesen, ergaenzen, und vorher eine Sicherung anlegen.
        vorher = {}
        if os.path.exists(OUT):
            try:
                vorher = json.load(io.open(OUT, encoding='utf-8'))
            except Exception:
                vorher = {}
            sich, n = OUT + '.bak', 1
            while os.path.exists(sich):
                sich = '%s.bak%d' % (OUT, n)
                n += 1
            io.open(sich, 'w', encoding='utf-8').write(io.open(OUT, encoding='utf-8').read())
            print('\nvorheriger Stand gesichert -> %s' % os.path.basename(sich))
        neu_dazu = [t for t in kand if t not in vorher]
        vorher.update(kand)
        kand = vorher
        json.dump(kand, io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('%d Kandidaten (%d neu) -> %s' % (len(kand), len(neu_dazu), os.path.relpath(OUT, ROOT)))
        print('weiter mit: python tools/wappen_fm_review.py --kandidaten tools/_ernte_kandidaten.json')
    else:
        print('\nProbelauf - nichts geladen. Mit --apply ausfuehren.')


if __name__ == '__main__':
    main()
