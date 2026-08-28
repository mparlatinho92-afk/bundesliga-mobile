#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_uebersicht.py - eine Seite mit ALLEN groben Wappen, nach Qualitaet sortiert.

Gegenstueck zu wappen_fm_review.py: dort steht immer ein Kandidat daneben und man
entscheidet zwischen zweien. Hier gibt es keinen Kandidaten mehr - die Quellen sind
durch. Diese Seite beantwortet die andere Frage: WELCHE der verbliebenen Wappen sind
eigentlich wie schlecht, und woran genau?

Denn "grob" ist nicht gleich "grob". Vier verschiedene Maengel stecken darin:
  * zu klein          - effektive Aufloesung (wappen_quality: entlarvt Hochskaliertes)
  * eingebrannter Rand- opaker Bildrand, also ein weisser/farbiger Kasten statt Freistellung
  * loechrig          - transparente Flaechen INNERHALB der Silhouette; im Dunkelmodus
                        scheint der App-Hintergrund durch
  * hell              - fast weisses Wappen, verschwindet im Hellmodus
  * Foto/Scan         - viele Farben und keine Transparenz, meist ein abfotografiertes
                        Trikot oder Vereinsheim statt eines Wappens
  * Dublett           - dasselbe BILD wie ein ANDERER Verein; einer der beiden traegt
                        also ein fremdes Wappen (Reserven ausgenommen, die teilen es
                        absichtlich). Fand auf Anhieb zwei Paare: TSC/VB Zweibruecken und
                        FSV/Phoenix Schifferstadt.

Die Rangfolge gewichtet all das zu einer Note, damit oben steht, was am dringendsten
ersetzt gehoert - und nicht bloss, was die kleinste Kantenlaenge hat.

Angezeigt wird auf kariertem Grund, hell UND dunkel nebeneinander: nur so sieht man
weisse Wappen und durchscheinende Loecher ueberhaupt.

  python tools/wappen_uebersicht.py              # alle unter 90 px
  python tools/wappen_uebersicht.py --grenze 140
  python tools/wappen_uebersicht.py --alle       # wirklich alle 1263
"""
import io, os, csv, sys, json, base64, hashlib, argparse, collections, importlib.util

sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.expanduser('~'), 'Downloads', 'wappen-uebersicht.html')


def lade(name, datei):
    sp = importlib.util.spec_from_file_location(name, os.path.join(HERE, datei))
    m = importlib.util.module_from_spec(sp)
    merk, sys.argv = sys.argv, ['x']
    sp.loader.exec_module(m)
    sys.argv = merk
    return m


def uri(p, box=150):
    with Image.open(p) as i:
        i = i.convert('RGBA')
        i.thumbnail((box, box), Image.LANCZOS)
        b = io.BytesIO()
        i.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def befund(pfad, doc):
    """Alle Messwerte eines Wappens + eine Note. Klein ist der Hauptmangel, aber ein
    Wappen mit eingebranntem Kasten oder Loechern ist auch bei guter Aufloesung kaputt."""
    im = Image.open(pfad).convert('RGBA')
    arr = np.asarray(im)
    bb = im.getbbox() or (0, 0, im.width, im.height)
    inhalt = (bb[2] - bb[0], bb[3] - bb[1])
    farben = len(np.unique(arr.reshape(-1, 4), axis=0))
    transp = float((arr[..., 3] < 250).mean())
    empf, infos = doc.analyze(arr)
    maengel = []
    if infos.get('border_opaque_pct', 0) > 60:
        maengel.append('Kasten')            # eingebrannter Hintergrund
    if infos.get('inner_transp_pct', 0) > 1.5:
        maengel.append('löchrig')
    if infos.get('lum', 0) > 205:
        maengel.append('sehr hell')
    if farben > 8000 and transp < 0.02:
        maengel.append('Foto?')
    return dict(inhalt='%dx%d' % inhalt, farben=farben, transp=100 * transp,
                rand=infos.get('border_opaque_pct', 0), loch=infos.get('inner_transp_pct', 0),
                lum=infos.get('lum', 0), maengel=maengel)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grenze', type=float, default=90.0)
    ap.add_argument('--alle', action='store_true')
    a = ap.parse_args()

    doc = lade('doc', 'wappen_doctor.py')
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    eff = {r['id']: float(r['eff']) for r in
           csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}
    st = json.load(io.open(os.path.join(HERE, 'wappen_fm_uebernommen.json'), encoding='utf-8'))

    def herkunft(t):
        if t in st.get('uebernommen', {}):
            return 'FM-Logo übernommen'
        if t in st.get('offen_gelassen', {}):
            return 'weder unseres noch FM überzeugte'
        if t in st.get('extern', {}):
            return 'FM zeigt fremden Verein'
        if t in st.get('behalten', {}):
            return 'unseres ist richtig, nur klein'
        return 'nie eine Quelle gefunden'

    # Dasselbe Wappen bei ZWEI Vereinen heisst: einer davon traegt ein fremdes.
    # Reserven zaehlen nicht - die teilen es per Familienregel absichtlich.
    #
    # NICHT ueber Pruefsummen vergleichen: VB Zweibruecken trug das TSC-Wappen als
    # verkleinerte Kopie (64x64 gegen 98x98) - andere Datei, gleiches Bild, MD5 blind.
    # Stattdessen jedes Wappen auf ein 24x24-FARBraster bringen (auf Weiss gelegt, damit
    # Transparenz nicht als Schwarz zaehlt) und die mittlere Abweichung vergleichen.
    # Ein Schwarzweiss-Fingerabdruck reicht nicht: bei 16x16 in Graustufen sehen alle
    # runden Wappen gleich aus, das lieferte 25 Fehltreffer und den echten Fall nicht.
    N = 24
    def raster(pfad):
        try:
            im = Image.open(pfad).convert('RGBA')
            bb = im.getbbox()
            if bb:
                im = im.crop(bb)
            u = Image.new('RGBA', im.size, (255, 255, 255, 255))
            u.alpha_composite(im)
            return np.asarray(u.convert('RGB').resize((N, N), Image.LANCZOS),
                              np.float32).reshape(-1)
        except Exception:
            return None
    wurzel = lambda t: teams[t].get('parentId') or t
    ids_, V = [], []
    for t, v in teams.items():
        p_ = os.path.join(ROOT, v['thumb'].replace('/', os.sep))
        if os.path.exists(p_):
            x = raster(p_)
            if x is not None:
                ids_.append(t); V.append(x)
    dublett = {}
    if V:
        V = np.stack(V)
        for i in range(len(ids_)):
            d = np.abs(V[i + 1:] - V[i]).mean(axis=1)
            for j in np.where(d < 12)[0]:
                t1, t2 = ids_[i], ids_[i + 1 + j]
                if wurzel(t1) == wurzel(t2):
                    continue
                dublett.setdefault(t1, []).append(teams[t2]['name'])
                dublett.setdefault(t2, []).append(teams[t1]['name'])

    wahl = [t for t in teams if a.alle or eff.get(t, 999) < a.grenze]
    zeilen = []
    for t in wahl:
        p = os.path.join(ROOT, teams[t]['thumb'].replace('/', os.sep))
        if not os.path.exists(p):
            continue
        b = befund(p, doc)
        if t in dublett:
            b['maengel'].append('Dublett')
        e = eff.get(t, 0)
        # Note: 0 = hoffnungslos, 100 = tadellos. Aufloesung traegt am meisten, jeder
        # zusaetzliche Mangel kostet fest - ein 240px-Wappen im weissen Kasten ist
        # schlechter als ein sauber freigestelltes mit 120px.
        note = min(100.0, e / 2.4)
        note -= 25 * ('Kasten' in b['maengel'])
        note -= 15 * ('löchrig' in b['maengel'])
        note -= 10 * ('sehr hell' in b['maengel'])
        note -= 20 * ('Foto?' in b['maengel'])
        note -= 30 * ('Dublett' in b['maengel'])   # einer der beiden ist definitiv falsch
        b.update(id=t, name=teams[t]['name'], eff=e, note=max(0.0, note),
                 liga=leagues.get(teams[t].get('leagueId') or '', {}).get('name', 'ligalos'),
                 quelle=herkunft(t), bild=uri(p))
        zeilen.append(b)
    zeilen.sort(key=lambda z: z['note'])

    tr = []
    for i, z in enumerate(zeilen, 1):
        flags = ''.join('<span class="m">%s</span>' % m for m in z['maengel'])
        tr.append(
            '<div class="k"><div class="nr">%d</div>'
            '<div class="bilder"><div class="hellgrund"><img src="%s"></div>'
            '<div class="dunkelgrund"><img src="%s"></div></div>'
            '<div class="n">%s</div><div class="l">%s</div>'
            '<div class="werte"><b>%.0f</b> Note &middot; %d px &middot; %s &middot; %d Farben</div>'
            '<div class="flags">%s</div><div class="q">%s</div></div>'
            % (i, z['bild'], z['bild'], z['name'], z['liga'], z['note'], z['eff'],
               z['inhalt'], z['farben'], flags,
               ('gleiches Bild wie: ' + ', '.join(dublett[z['id']])) if z['id'] in dublett
               else z['quelle']))

    zus = {}
    for z in zeilen:
        for m in (z['maengel'] or ['nur zu klein']):
            zus[m] = zus.get(m, 0) + 1
    kopf = ' &middot; '.join('%s: <b>%d</b>' % (k, v) for k, v in sorted(zus.items(), key=lambda x: -x[1]))

    io.open(OUT, 'w', encoding='utf-8').write(
        TPL.replace('__N__', str(len(zeilen))).replace('__ZUS__', kopf).replace('__KARTEN__', '\n'.join(tr)))
    print('%d Wappen -> %s (%.1f MB)' % (len(zeilen), OUT, os.path.getsize(OUT) / 1e6))
    for k, v in sorted(zus.items(), key=lambda x: -x[1]):
        print('   %-14s %d' % (k, v))


TPL = """<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Wappen-&Uuml;bersicht</title><style>
:root{--bg:#f2f2f5;--fg:#1a1a1a;--line:#dcdce2;--card:#fff}
body.dark{--bg:#15161a;--fg:#e8e8ea;--line:#33343c;--card:#1e1f25}
*{box-sizing:border-box}body{margin:0;padding:18px 22px 60px;background:var(--bg);color:var(--fg);
 font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
h1{font-size:19px;margin:0 0 4px}p.sub{margin:0 0 14px;opacity:.75;font-size:13px;max-width:900px}
button{font:inherit;padding:6px 12px;border:1px solid var(--line);background:var(--card);
 color:var(--fg);border-radius:6px;cursor:pointer}
#raster{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));margin-top:14px}
.k{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px;position:relative}
.nr{position:absolute;top:5px;right:8px;font-size:10px;opacity:.35}
.bilder{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:7px}
.hellgrund,.dunkelgrund{border-radius:7px;padding:5px;display:flex;align-items:center;justify-content:center;height:92px}
.hellgrund{background:#fff;background-image:linear-gradient(45deg,#eaeaea 25%,transparent 25%),
 linear-gradient(-45deg,#eaeaea 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eaeaea 75%),
 linear-gradient(-45deg,transparent 75%,#eaeaea 75%);background-size:12px 12px;
 background-position:0 0,0 6px,6px -6px,-6px 0}
.dunkelgrund{background:#24242a;background-image:linear-gradient(45deg,#1c1c22 25%,transparent 25%),
 linear-gradient(-45deg,#1c1c22 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1c1c22 75%),
 linear-gradient(-45deg,transparent 75%,#1c1c22 75%);background-size:12px 12px;
 background-position:0 0,0 6px,6px -6px,-6px 0}
.bilder img{max-width:100%;max-height:82px;object-fit:contain}
.n{font-weight:600;font-size:13px;line-height:1.25}
.l{font-size:11px;opacity:.5;margin-top:1px}
.werte{font-size:11px;opacity:.7;margin-top:5px;font-variant-numeric:tabular-nums}
.flags{margin-top:5px;min-height:19px}
.m{display:inline-block;font-size:10px;padding:1px 6px;border-radius:9px;margin:0 4px 3px 0;
 background:rgba(200,90,20,.16);color:#b4670e;font-weight:600}
body.dark .m{color:#e79a3c;background:rgba(231,154,60,.16)}
.q{font-size:10px;opacity:.45;margin-top:3px}
</style></head><body>
<h1>Wappen-&Uuml;bersicht &ndash; __N__ St&uuml;ck, schlechteste zuerst</h1>
<p class="sub">Keine Alternativen mehr im Angebot &ndash; die Quellen sind durch. Diese Seite sortiert danach,
<b>wie</b> schlecht ein Wappen ist. Jedes wird auf hellem UND dunklem kariertem Grund gezeigt: nur so
sieht man wei&szlig;e Wappen und durchscheinende L&ouml;cher. Die Note gewichtet die Aufl&ouml;sung und zieht
f&uuml;r jeden Mangel ab &ndash; ein 240-px-Wappen im wei&szlig;en Kasten ist schlechter als ein sauber
freigestelltes mit 120&nbsp;px.<br>__ZUS__</p>
<p><button onclick="document.body.classList.toggle('dark')">Hell/Dunkel</button></p>
<div id="raster">__KARTEN__</div>
</body></html>"""


if __name__ == '__main__':
    main()
