#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_wiki.py - sucht Vereinswappen auf Wikipedia und legt sie zur Pruefung bereit.

WARUM WIKIPEDIA NACH DEM FM-PAKET
FMs deutsche Datenbank deckt andere Vereine ab als unsere 1263 - von 596 freien nackten
Ortsnamen kannten wir 568 gar nicht. Wikipedia dagegen hat zu fast jedem deutschen Verein
bis in die Landesliga einen Artikel, und der Artikeltitel IST der volle Vereinsname.
Damit wird der Namensabgleich hier ungleich verlaesslicher als bei FM:

    FM:        "Arm. Hannover", "TeBe Berlin", "Hamburg"   -> raten noetig
    Wikipedia: "Arminia Hannover", "Tennis Borussia Berlin" -> exakter Titel

Das Wappen liefert die API als `pageimages` - das Hauptbild des Artikels, meist ein
960px-Rendering aus einer SVG-Quelle, also besser als alles bisher Vorhandene.

DER ABGLEICH IN DREI STUFEN, streng nach abnehmender Sicherheit
1. EXAKTER TITEL (mit Weiterleitungen). Trifft er, ist der Verein zweifelsfrei.
2. SUCHE + Titelbewertung. Die Trefferliste wird gegen unseren Namen gewichtet - nach
   derselben IDF-Logik wie in wappen_fm_rematch.py, damit ein geteiltes "Muenchen" nicht
   so viel zaehlt wie ein geteiltes "Altglienicke".
3. Was beides nicht klaert, bleibt liegen. Ein erzwungener Treffer kostet mehr als eine
   Luecke, das gilt hier wie beim FM-Abgleich.

Ein Fund ist ein VORSCHLAG. Ausgegeben wird eine kandidaten.json fuer
`wappen_fm_review.py --kandidaten` - entschieden wird am Bild.

FALLE, die den Nutzer schon einmal korrigieren liess: bei Mehrspartenvereinen kann die
FUSSBALLABTEILUNG ein eigenes Wappen fuehren (TSV 1860 Muenchen: Gesamtverein = Loewe,
Fussballabteilung seit 07/2026 ein gruenes Oval). Das Artikel-Hauptbild zeigt das
Vereinswappen; nach einem Abteilungswappen muss man im Artikel selbst schauen.

  python tools/wappen_wiki.py                    # Bericht, laedt nichts
  python tools/wappen_wiki.py --apply            # Bilder holen + kandidaten.json
  python tools/wappen_wiki.py --apply --max 20   # erst einmal eine kleine Charge
"""
import io, os, re, sys, csv, json, time, math, argparse, collections
import urllib.parse, urllib.request

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, '_wiki_wappen')
OUT = os.path.join(HERE, '_wiki_kandidaten.json')
API = 'https://de.wikipedia.org/w/api.php'
# Andere Sprachversionen sind eine eigene Quelle: die englische Wikipedia laesst
# Vereinslogos als Fair Use zu, die deutsche nicht. Ein Verein ohne Bild in de kann in
# en durchaus eines haben - die Artikeltitel sind bei deutschen Vereinen meist identisch.
# Wikimedia verlangt einen aussagekraeftigen User-Agent; ohne den drohen 403.
UA = 'BundesligaArchitect/0.8 (Wappen-Abgleich fuer ein privates Simulationsprojekt)'
# Titel, die nie ein Verein sind - die Volltextsuche wirft sie sonst nach oben.
ORTSWAPPEN = re.compile(r'^(DEU|Wappen)[_ ]|COA|Coat[_ ]of|[_ ]in[_ ][A-Z]{2,3}\.|Karte|Lage(karte)?[_ ]|Locator|Municipality', re.I)
KEIN_VEREIN = ('gymnasium', 'schule', 'liste ', 'stadion', 'sportanlage', 'bahnhof',
               'kirche', 'burg (', 'gemeinde', 'landkreis', 'ortsteil', 'wappen ')


def api(**p):
    """Mit Backoff: Wikimedia antwortet bei zu dichten Anfragen mit 429 und erwartet,
    dass man wartet statt stur zu wiederholen."""
    p.setdefault('format', 'json')
    url = API + '?' + urllib.parse.urlencode(p)
    for versuch in range(5):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or versuch == 4:
                raise
            warte = float(e.headers.get('Retry-After') or 0) or (2 ** versuch)
            print('   ... %d, warte %.0fs' % (e.code, warte))
            time.sleep(warte)


def hole(url, ziel):
    """Auch upload.wikimedia.org drosselt - derselbe Backoff wie bei der API. Bereits
    geladene Dateien werden uebersprungen, damit ein zweiter Lauf nur die Luecken holt."""
    if os.path.exists(ziel) and os.path.getsize(ziel) > 500:
        return
    for versuch in range(5):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r, open(ziel, 'wb') as f:
                f.write(r.read())
            return
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or versuch == 4:
                raise
            time.sleep(float(e.headers.get('Retry-After') or 0) or (3 * (versuch + 1)))


def seiten(titelliste, breite=960):
    """Bis zu 50 Artikel in EINER Anfrage - so verlangt es die API und so bleibt man
    unter dem Ratenlimit. Gibt {angefragter Titel: (Zieltitel, Bild-URL)}.
    Der Umweg ueber `normalized`/`redirects` ist noetig, weil die Antwort unter dem
    aufgeloesten Titel steht, wir aber nach dem angefragten suchen."""
    raus = {}
    titelliste = list(titelliste)
    for i in range(0, len(titelliste), 50):
        teil = titelliste[i:i + 50]
        d = api(action='query', titles='|'.join(teil), prop='pageimages',
                redirects='1', pithumbsize=str(breite), pilicense='any')
        q = d.get('query', {})
        weiter = {}
        for gruppe in ('normalized', 'redirects'):
            for x in q.get(gruppe, []):
                weiter[x['from']] = x['to']
        aufgeloest = {}
        for v in q.get('pages', {}).values():
            aufgeloest[v.get('title')] = (
                (v.get('title'), (v.get('thumbnail') or {}).get('source'), v.get('pageimage') or '')
                if 'missing' not in v else (None, None, ''))
        for t in teil:
            ziel = t
            for _ in range(3):
                ziel = weiter.get(ziel, ziel)
            raus[t] = aufgeloest.get(ziel, (None, None, ''))
        time.sleep(1.0)
    return raus


def seite(titel, breite=960):
    return seiten([titel], breite)[titel]


def suche(text, n=6):
    d = api(action='query', list='search', srsearch=text, srlimit=str(n))
    return [x['title'] for x in d.get('query', {}).get('search', [])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--grenze', type=float, default=90.0)
    ap.add_argument('--max', type=int, default=0, help='nur die ersten N bearbeiten')
    ap.add_argument('--ebene', type=int, default=0,
                    help='nur bis zu dieser Ligastufe (5 = Oberliga). Weiter unten hat '
                         'Wikipedia kaum noch Artikel.')
    ap.add_argument('--pause', type=float, default=0.4, help='Sekunden zwischen Anfragen')
    ap.add_argument('--sprache', default='de', help='Wikipedia-Sprachversion (de, en, ...)')
    a = ap.parse_args()

    global API, OUT
    API = 'https://%s.wikipedia.org/w/api.php' % a.sprache
    if a.sprache != 'de':
        OUT = OUT.replace('.json', '_%s.json' % a.sprache)

    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    eff = {r['id']: float(r['eff']) for r in
           csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}

    # Namensbewertung wie im FM-Abgleich, damit "gleicher Verein" hier dasselbe heisst.
    import importlib.util
    sp = importlib.util.spec_from_file_location('rm', os.path.join(HERE, 'wappen_fm_rematch.py'))
    rm = importlib.util.module_from_spec(sp)
    sys_argv, sys.argv = sys.argv, ['x']
    sp.loader.exec_module(rm)
    sys.argv = sys_argv

    # Nach LIGASTUFE sortieren, nicht nach Grobheit. Die groebsten Wappen gehoeren den
    # kleinsten Vereinen - und genau die hat Wikipedia auch nicht. Ein erster Lauf ueber
    # die 12 groebsten fand 1 brauchbares Wappen; oben in der Tabelle ist die Ausbeute
    # ungleich hoeher.
    lvl = lambda t: leagues.get(teams[t].get('leagueId') or '', {}).get('level', 99)
    grob = sorted([t for t in teams if eff.get(t, 999) < a.grenze],
                  key=lambda t: (lvl(t), eff.get(t, 0)))
    if a.ebene:
        grob = [t for t in grob if lvl(t) <= a.ebene]
    if a.max:
        grob = grob[:a.max]
    df = collections.Counter()
    for t in teams.values():
        df.update(set(rm.kern(t['name'])))
    N = len(teams)
    idf = lambda w: math.log(N / (1.0 + df.get(w, 0)))

    def naehe(unser, titel):
        A, B = set(rm.kern(unser)), set(rm.kern(titel))
        if not A or not B or not (A & B):
            return 0.0
        g = lambda S: sum(max(0.3, idf(w)) for w in S)
        return g(A & B) / max(g(A), g(B))

    os.makedirs(CACHE, exist_ok=True)
    kand, ohne, unsicher = {}, [], []
    # Stufe 1 fuer ALLE auf einmal: 84 Einzelanfragen liefen ins Ratenlimit (HTTP 429),
    # 50 Titel pro Anfrage sind der von der API vorgesehene Weg.
    stufe1 = seiten([teams[t]['name'] for t in grob])
    print('Stufe 1 (exakter Titel): %d von %d getroffen\n'
          % (sum(1 for v in stufe1.values() if v[1]), len(grob)))
    for i, tid in enumerate(grob, 1):
        nm = teams[tid]['name']
        titel, bild, bilddatei = stufe1.get(nm, (None, None, ''))
        stufe = 'Titel'
        if not bild:
            stufe = 'Suche'
            beste, bwert = None, 0.0
            for kandidat in suche(nm + ' Fußball Verein'):
                # Die Suche liefert auch Schulen, Stadien und Listen - "Gymnasium
                # Nieder-Olm" kam auf 0,73, weil der Ortsname allein schon reicht.
                if any(w in kandidat.lower() for w in KEIN_VEREIN):
                    continue
                w = naehe(nm, kandidat)
                if w > bwert:
                    beste, bwert = kandidat, w
            if beste and bwert >= 0.6:
                titel, bild, bilddatei = seite(beste)
                if bild and bwert < 0.85:
                    unsicher.append((nm, titel, bwert))
            else:
                titel = beste
        # Ortsartikel fuehren als Hauptbild das GEMEINDEwappen, nicht das Vereinswappen.
        # "TSV Wetschen" -> Artikel "Wetschen" lieferte so das Ortswappen. Auf Commons
        # heissen die Dateien nach einem festen Muster; daran sind sie zu erkennen.
        if bild and ORTSWAPPEN.search(bilddatei or ''):
            ohne.append((nm, 'kein Vereinswappen (Ort/Karte): %s' % bilddatei)); continue
        if bild:
            ziel = os.path.join(CACHE, tid + '.png')
            def istfoto(pfad):
                """Wappen sind Flaechengrafiken mit transparentem Rand, Fotos nicht.
                Der Artikel "Oppenheim" lieferte ein Stadtfoto mit 140 970 Farben und
                0 % Transparenz - am Dateinamen war das nicht zu erkennen."""
                try:
                    from PIL import Image
                    import numpy as np
                    a_ = np.asarray(Image.open(pfad).convert('RGBA'))
                    return (len(np.unique(a_.reshape(-1, 4), axis=0)) > 5000
                            and (a_[..., 3] < 250).mean() < 0.02)
                except Exception:
                    return False
            if a.apply:
                try:
                    hole(bild.split('?')[0], ziel)
                except Exception as e:
                    ohne.append((nm, 'Download fehlgeschlagen: %s' % e)); continue
            if a.apply and istfoto(ziel):
                os.remove(ziel)
                ohne.append((nm, 'Foto statt Wappen (Ortsartikel?)')); continue
            kand[tid] = {'datei': ziel, 'quelle': 'Wikipedia: ' + (titel or '?')}
            print('  %-34s %-6s -> %s' % (nm[:34], stufe, titel))
        else:
            ohne.append((nm, 'kein Artikelbild' + (' (naechster Treffer: %s)' % titel if titel else '')))
        if stufe == 'Suche':
            time.sleep(a.pause)

    print('\n%d von %d Vereinen mit Wappen-Kandidat' % (len(kand), len(grob)))
    if unsicher:
        print('%d davon ueber die SUCHE gefunden und nicht eindeutig - besonders pruefen:' % len(unsicher))
        for nm, t, w in unsicher:
            print('   %-34s -> %-34s (%.2f)' % (nm[:34], (t or '?')[:34], w))
    if ohne:
        print('\n%d ohne Fund:' % len(ohne))
        for nm, why in ohne:
            print('   %-34s %s' % (nm[:34], why))
    if a.apply:
        json.dump(kand, io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('\n-> %s' % os.path.relpath(OUT, ROOT))
        print('weiter mit: python tools/wappen_fm_review.py --kandidaten tools/_wiki_kandidaten.json')
    else:
        print('\nProbelauf - nichts geladen. Mit --apply ausfuehren.')


if __name__ == '__main__':
    main()
