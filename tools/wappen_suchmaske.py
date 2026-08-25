#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_suchmaske.py - fertige Google-Bilder-Suchen fuer die verbliebenen Wappen.

Wenn die automatischen Quellen durch sind (FM, Wikipedia, Wikidata, Vereinsseiten),
bleibt die Bildersuche von Hand. Diese Seite nimmt einem das Tippen ab: sie baut
Sammelabfragen, in denen mehrere Vereine mit OR verknuepft sind, und haengt den Filter
fuer GROSSE Bilder an (`tbs=isz:l`).

WARUM IN HAEPPCHEN UND NICHT ALLES IN EINER ABFRAGE
Google wertet nur die ersten ~32 Woerter einer Anfrage aus, alles danach faellt still
weg. Ein Vereinsname belegt 2-4 Woerter, jedes OR eines dazu - mehr als acht Vereine
pro Abfrage sind also nicht drin, ohne dass die letzten unbemerkt ignoriert werden.
Deshalb Bloecke zu acht statt einer Riesenzeile, die nur so aussieht, als wuerde sie
alles abdecken.

Die Anfuehrungszeichen sind wichtig: ohne sie zerlegt Google "SV Horchheim" in zwei
Woerter und mischt Treffer zu beliebigen SV-Vereinen darunter.

Sortiert wird wie in wappen_uebersicht.py - das schlechteste Wappen zuerst.

  python tools/wappen_suchmaske.py                 # alle unter 90 px
  python tools/wappen_suchmaske.py --pro-block 6
  python tools/wappen_suchmaske.py --zusatz "Logo"
"""
import io, os, csv, sys, json, argparse, urllib.parse

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.expanduser('~'), 'Downloads', 'wappen-suche.html')
# isz:l = nur grosse Bilder. Genau das, was hier gebraucht wird - die vorhandenen
# Wappen scheitern ja an der Aufloesung, nicht am Motiv.
BASIS = 'https://www.google.com/search?tbm=isch&tbs=isz:l&q='


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grenze', type=float, default=90.0)
    ap.add_argument('--pro-block', dest='pro', type=int, default=8,
                    help='Vereine je Sammelabfrage (Google wertet ~32 Woerter aus)')
    ap.add_argument('--zusatz', default='Wappen', help='Wort, das jede Abfrage anhaengt')
    a = ap.parse_args()

    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    eff = {r['id']: float(r['eff']) for r in
           csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}

    wahl = sorted([t for t in teams if eff.get(t, 999) < a.grenze], key=lambda t: eff.get(t, 0))
    bloecke = [wahl[i:i + a.pro] for i in range(0, len(wahl), a.pro)]

    tr = []
    for nr, blk in enumerate(bloecke, 1):
        frage = ' OR '.join('"%s"' % teams[t]['name'] for t in blk)
        if a.zusatz:
            frage += ' ' + a.zusatz
        url = BASIS + urllib.parse.quote(frage)
        woerter = len(frage.split())
        namen = ''.join(
            '<li><a href="%s%s" target="_blank">%s</a> <span class="e">%d px &middot; %s</span></li>'
            % (BASIS, urllib.parse.quote('"%s" %s' % (teams[t]['name'], a.zusatz)),
               teams[t]['name'],
               eff.get(t, 0),
               leagues.get(teams[t].get('leagueId') or '', {}).get('name', 'ligalos'))
            for t in blk)
        tr.append(
            '<div class="b"><div class="kopf"><b>Block %d</b> &middot; %d Vereine &middot; '
            '%d W&ouml;rter <a class="go" href="%s" target="_blank">in Google Bilder &ouml;ffnen &rarr;</a></div>'
            '<textarea readonly onclick="this.select()">%s</textarea>'
            '<ul>%s</ul></div>' % (nr, len(blk), woerter, url, frage, namen))

    io.open(OUT, 'w', encoding='utf-8').write(
        TPL.replace('__N__', str(len(wahl))).replace('__B__', str(len(bloecke)))
           .replace('__PRO__', str(a.pro)).replace('__BLOECKE__', '\n'.join(tr)))
    print('%d Vereine in %d Bloecken -> %s' % (len(wahl), len(bloecke), OUT))


TPL = """<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Wappen-Suche</title><style>
:root{--bg:#f2f2f5;--fg:#1a1a1a;--line:#dcdce2;--card:#fff}
*{box-sizing:border-box}body{margin:0;padding:18px 22px 60px;background:var(--bg);color:var(--fg);
 font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
h1{font-size:19px;margin:0 0 4px}p.sub{margin:0 0 16px;opacity:.75;font-size:13px;max-width:880px}
.b{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.kopf{font-size:13px;margin-bottom:8px}
a.go{margin-left:10px;text-decoration:none;background:#1a73e8;color:#fff;padding:3px 10px;border-radius:6px;font-size:12px}
textarea{width:100%;height:58px;font:12px/1.4 ui-monospace,Consolas,monospace;padding:7px;
 border:1px solid var(--line);border-radius:6px;background:#fafafa;resize:vertical}
ul{margin:8px 0 0;padding-left:18px;columns:2;font-size:12px}
li{margin:1px 0}li a{color:#1a5fb4;text-decoration:none}li a:hover{text-decoration:underline}
.e{opacity:.45;font-size:11px}
</style></head><body>
<h1>Google-Bilder-Suche f&uuml;r __N__ Wappen</h1>
<p class="sub">__B__ Bl&ouml;cke zu je __PRO__ Vereinen, mit <code>OR</code> verkn&uuml;pft und auf
<b>gro&szlig;e Bilder</b> gefiltert (<code>tbs=isz:l</code>). Warum nicht alles in einer Zeile:
<b>Google wertet nur die ersten rund 32 W&ouml;rter aus</b> &ndash; alles danach f&auml;llt still weg, die
Abfrage s&auml;he nur vollst&auml;ndig aus. Die Anf&uuml;hrungszeichen sind ebenfalls n&ouml;tig,
sonst zerlegt Google &bdquo;SV Horchheim&ldquo; und mischt beliebige SV-Vereine darunter.<br>
Klick in ein Feld markiert es zum Kopieren; der blaue Knopf &ouml;ffnet den Block direkt.
Sortiert: schlechtestes Wappen zuerst.</p>
__BLOECKE__
</body></html>"""


if __name__ == '__main__':
    main()
