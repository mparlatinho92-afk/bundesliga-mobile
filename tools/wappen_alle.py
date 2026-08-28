#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_alle.py - alle Wappen so, wie sie in der App aussehen.

Gegenstueck zu wappen_uebersicht.py: dort geht es um MAENGEL der schlechtesten, hier um
den Gesamteindruck. Gezeigt wird jedes Wappen in App-Groesse, nach Liga gruppiert, auf
hellem UND dunklem Grund - die App hat beide Themes, und ein Wappen kann in einem davon
verschwinden (weisse Logos) oder auffliegen (eingebrannter Kasten).

  python tools/wappen_alle.py                # alle 1263
  python tools/wappen_alle.py --ebene 6      # nur bis Oberliga
"""
import io, os, sys, csv, json, base64, argparse

sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.expanduser('~'), 'Downloads', 'wappen-alle.html')


def uri(p, box=56):
    if p.lower().endswith('.svg'):
        import cairosvg
        im = Image.open(io.BytesIO(cairosvg.svg2png(url=p, output_height=240)))
    else:
        im = Image.open(p)
    im = im.convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    im.thumbnail((box, box), Image.LANCZOS)
    # Vorschau quantisieren: bei 1263 Wappen entscheidet das ueber 33 MB oder 8 MB
    # Seitengroesse, und bei 56 px sieht man den Unterschied ohnehin nicht.
    im = im.quantize(colors=64, method=Image.FASTOCTREE).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ebene', type=int, default=0)
    a = ap.parse_args()
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    eff = {r['id']: float(r['eff']) for r in
           csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}
    lvl = lambda t: leagues.get(teams[t].get('leagueId') or '', {}).get('level', 99)
    lname = lambda t: leagues.get(teams[t].get('leagueId') or '', {}).get('name', 'ohne Liga')

    grp = {}
    for t in teams:
        if a.ebene and lvl(t) > a.ebene:
            continue
        p = os.path.join(ROOT, teams[t]['thumb'].replace('/', os.sep))
        if os.path.exists(p):
            grp.setdefault((lvl(t), lname(t)), []).append(t)

    teile, n = [], 0
    for (l, nm), ts in sorted(grp.items()):
        karten = []
        for t in sorted(ts, key=lambda x: teams[x]['name']):
            p = os.path.join(ROOT, teams[t]['thumb'].replace('/', os.sep))
            try:
                u = uri(p)
            except Exception:
                continue
            e = eff.get(t, 0)
            karten.append('<div class="k%s"><div class="h"><img src="%s"></div>'
                          '<div class="d"><img src="%s"></div><span>%s</span></div>'
                          % (' grob' if e < 90 else '', u, u, teams[t]['name']))
            n += 1
        teile.append('<h2>%s <em>%d</em></h2><div class="r">%s</div>' % (nm, len(karten), ''.join(karten)))
    io.open(OUT, 'w', encoding='utf-8').write(TPL.replace('__N__', str(n)).replace('__I__', '\n'.join(teile)))
    print('%d Wappen -> %s (%.1f MB)' % (n, OUT, os.path.getsize(OUT) / 1e6))


TPL = """<!doctype html><html lang=de><meta charset=utf-8><title>Alle Wappen</title><style>
body{margin:0;padding:16px 20px 50px;background:#f2f2f5;color:#1a1a1a;font:13px/1.4 system-ui,sans-serif}
h1{font-size:19px;margin:0 0 4px}p.s{margin:0 0 6px;opacity:.7;max-width:860px}
h2{font-size:14px;margin:20px 0 7px;padding-bottom:3px;border-bottom:1px solid #dcdce2}
h2 em{font-style:normal;opacity:.4;font-weight:400;font-size:12px}
.r{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(82px,1fr))}
.k{background:#fff;border:1px solid #e2e2e8;border-radius:8px;padding:5px;text-align:center}
.k.grob{border-color:#e0a34a;background:#fffaf2}
.h,.d{height:48px;display:flex;align-items:center;justify-content:center;border-radius:5px}
.h{background:#fff}.d{background:#23232a;margin-top:3px}
.h img,.d img{max-width:100%;max-height:44px;object-fit:contain}
.k span{display:block;font-size:9px;line-height:1.25;margin-top:4px;opacity:.7;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style><h1>Alle Wappen &ndash; __N__ St&uuml;ck</h1>
<p class="s">Jedes in App-Gr&ouml;&szlig;e, oben auf hellem, darunter auf dunklem Grund &ndash; die App hat
beide Themes. Orange umrandet: unter 90&nbsp;px effektiv.</p>
__I__"""


if __name__ == '__main__':
    main()
