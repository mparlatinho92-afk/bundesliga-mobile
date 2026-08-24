#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_fm_review.py - baut eine Pruefseite fuer die FM-Wappen-Uebernahme.

Warum nicht einfach importieren: der Abgleich unserer Vereine gegen die FM-Datenbank
laeuft ueber den NAMEN, und FMs deutsche Datenbank reicht nicht so tief wie unser Set.
Gleichnamige Orte treffen dadurch den falschen Verein (SV Horchheim/Worms gegen FMs
Horchheim, Geinsheim/Vorderpfalz gegen Geinsheim am Rhein). Umgekehrt hat UNSER Set
teils das falsche Wappen (SV Reichensachsen, VfB Durach, SV Stadelhofen) - dort ist
das FM-Logo das richtige. Beides sieht man nur im direkten Vergleich.

Vorsortiert wird nach dem Farbabstand beider Bilder (Bhattacharyya ueber ein grobes
4x4x4-Histogramm der sichtbaren Pixel). Er misst UNEINIGKEIT, nicht wer recht hat -
genau das, was zur Vorlage gehoert. Selbsttest: die fuenf bekannten Faelle landen
auf den Plaetzen 37-172 von 723, ein sicherer Treffer (Dortmund) auf 511.

Aufruf:
  python tools/wappen_fm_review.py               # Top 200 nach Farbabstand
  python tools/wappen_fm_review.py --n 400
  python tools/wappen_fm_review.py --min 0.35    # alle ueber dieser Schwelle
"""
import io, os, json, base64, argparse, sys
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(os.path.expanduser('~'), 'Downloads', 'wappen-fm-review.html')
# Die Pakete liegen ausserhalb des Repos (mehrere GB) - Pfad hier zentral.
FMG = r'C:\Users\lyric\OneDrive\Pictures\FMG Standard Logos 2026.00\FMG Standard Logos 2026.00\Clubs'
BINS = 4
# Beschriftung der rechten Spalte: das Paket heisst FM, eine externe Datei nicht.
QUELLE = ['FM']


def pack_index():
    idx = {}
    for root, _, fs in os.walk(FMG):
        for f in fs:
            if f.endswith('_club.png') and f[:-9].isdigit():
                idx.setdefault(f[:-9], os.path.join(root, f))
    return idx


def hist(p, cache={}):
    if p in cache: return cache[p]
    try:
        im = Image.open(p).convert('RGBA')
    except Exception:
        cache[p] = None; return None
    im.thumbnail((96, 96), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    px = a[..., :3][a[..., 3] > 40]
    if len(px) < 30:
        cache[p] = None; return None
    q = np.clip((px / 256.0 * BINS).astype(int), 0, BINS - 1)
    h = np.zeros(BINS ** 3, np.float32)
    np.add.at(h, q[:, 0] * BINS * BINS + q[:, 1] * BINS + q[:, 2], 1.0)
    cache[p] = h / h.sum()
    return cache[p]


def uri(p, box=170):
    with Image.open(p) as i:
        i = i.convert('RGBA'); i.thumbnail((box, box), Image.LANCZOS)
        b = io.BytesIO(); i.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=200)
    ap.add_argument('--min', type=float, default=None)
    ap.add_argument('--offen', action='store_true',
                    help='bereits Entschiedenes aus wappen_fm_uebernommen.json weglassen')
    ap.add_argument('--nach-qualitaet', dest='qual', action='store_true',
                    help='nach UNSERER effektiver Aufloesung sortieren (schlechteste zuerst) statt '
                         'nach Farbabstand. Der Abstand findet Fehlzuordnungen, uebersieht aber den '
                         'Normalfall - dasselbe Wappen in grob und in scharf unterscheidet sich '
                         'farblich kaum. So blieben 45 von 52 Profivereinen unentdeckt.')
    ap.add_argument('--kandidaten', default='',
                    help='JSON {teamId: "pfad/zum/bild.png"} oder {teamId: {"datei":..,'
                         '"quelle":".."}} - legt BELIEBIGE Kandidaten vor statt der '
                         'FM-Zuordnung. Noetig, seit die Wappen nicht mehr nur aus dem '
                         'FM-Paket kommen: die restlichen Vereine holen wir von '
                         'Wikipedia/Commons oder der Vereinsseite, und auch die gehoeren '
                         'vor dem Uebernehmen ins Bild gestellt statt blind kopiert.')
    ap.add_argument('--ids', default='',
                    help='feste Auswahl: JSON-Datei mit ID-Liste oder id1,id2,... '
                         'Noetig, weil sich die Rangfolge nach jeder Uebernahme verschiebt - '
                         'ein uebernommenes Wappen ist mit dem FM-Logo identisch und faellt '
                         'auf Abstand 0, wodurch andere Paare nachruecken.')
    a = ap.parse_args()

    nur = set()
    if a.ids:
        if os.path.exists(a.ids):
            v = json.load(io.open(a.ids, encoding='utf-8'))
            nur = set(x['id'] if isinstance(x, dict) else x for x in
                      (v if isinstance(v, list) else v.get('ids', [])))
        else:
            nur = set(x.strip() for x in a.ids.split(',') if x.strip())

    # Schon geklaerte Vereine nicht erneut vorlegen - sonst waechst die Seite mit jeder
    # Runde wieder auf dieselbe Laenge und man sucht die offenen Faelle von Hand.
    erledigt = set()
    if a.offen:
        p = os.path.join(HERE, 'wappen_fm_uebernommen.json')
        if os.path.exists(p):
            st = json.load(io.open(p, encoding='utf-8'))
            erledigt = (set(st.get('uebernommen', {})) | set(st.get('behalten', {}))
                    | set(st.get('extern', {})))

    fmg = pack_index()
    j = lambda p: json.load(io.open(os.path.join(ROOT, p), encoding='utf-8'))
    m, ger = j('tools/_fm_match.json'), j('tools/_fm_ger.json')
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']

    # Freie Kandidaten: dieselbe Seite, nur kommt das rechte Bild aus einer Datei statt
    # aus dem FM-Paket. Alles danach (Familien, Speicher, Export) bleibt unveraendert.
    if a.kandidaten:
        kand = json.load(io.open(a.kandidaten, encoding='utf-8'))
        rows = []
        for tid, v in kand.items():
            t = teams.get(tid)
            if not t:
                print('unbekannter Verein: %s' % tid); continue
            datei = v if isinstance(v, str) else v.get('datei', '')
            quelle = '' if isinstance(v, str) else v.get('quelle', '')
            our = os.path.join(ROOT, t['thumb'])
            if not (os.path.exists(datei) and os.path.exists(our)):
                print('Datei fehlt: %s' % (datei if not os.path.exists(datei) else our)); continue
            ha, hb = hist(our), hist(datei)
            d = 0.0 if (ha is None or hb is None) else                 float(np.sqrt(max(0.0, 1.0 - np.sum(np.sqrt(ha * hb)))))
            rows.append((d, tid, t, quelle or os.path.basename(datei), datei))
        rows.sort(reverse=True)
        ger = {r[3]: r[3] for r in rows}     # Label steht schon drin, keine FM-Namen noetig
        nur, erledigt = set(), set()
        a.n, a.min = len(rows), None
        QUELLE[0] = 'extern'

    if not a.kandidaten:
      rows = []
      for tid, fid in m.items():
        t = teams.get(tid)
        if not t or str(fid) not in fmg: continue
        our = os.path.join(ROOT, t['thumb'])
        if not os.path.exists(our): continue
        ha, hb = hist(our), hist(fmg[str(fid)])
        if ha is None or hb is None: continue
        d = float(np.sqrt(max(0.0, 1.0 - np.sum(np.sqrt(ha * hb)))))
        rows.append((d, tid, t, str(fid), fmg[str(fid)]))
    if a.qual:
        # eff aus wappen_quality.csv; fehlt sie, vorher einmal "python tools/wappen_quality.py --csv"
        p = os.path.join(HERE, 'wappen_quality.csv')
        eff = {}
        if os.path.exists(p):
            import csv as _csv
            eff = {r['id']: float(r['eff']) for r in _csv.DictReader(io.open(p, encoding='utf-8'))}
        else:
            print('WARNUNG: tools/wappen_quality.csv fehlt - erst "wappen_quality.py --csv" laufen lassen')
        rows.sort(key=lambda r: eff.get(r[1], 9e9))
    else:
        rows.sort(reverse=True)
    # Erst deckeln, DANN Erledigtes rauswerfen: so bleibt "die 200 uneinigsten" der
    # feste Bezugsrahmen und die Seite zeigt genau den offenen Rest daraus.
    # Eine Vereinsfamilie ist EIN Fall: die Entscheidung wird ohnehin auf alle Mannschaften
    # angewandt (wappen_familie.py laeuft nach jeder Uebernahme). Sie einzeln vorzulegen
    # kostet nur doppelte Klicks - Barockstadt Fulda-Lehnerz stand zweimal in der Liste.
    # Gezeigt wird der Elternverein; die Reserve wird im Kopf mitgenannt.
    elternvon = {}
    for tid, t in teams.items():
        elternvon.setdefault(t.get('parentId') or tid, []).append(tid)
    vertritt = {}
    for wurzel, mit in elternvon.items():
        for tid in mit:
            vertritt[tid] = wurzel if wurzel in teams else sorted(mit)[0]
    gesehen = set()
    entdoppelt = []
    for r in rows:
        v = vertritt.get(r[1], r[1])
        if v in gesehen:
            continue
        gesehen.add(v)
        entdoppelt.append(r if r[1] == v else next((x for x in rows if x[1] == v), r))
    rows_fam = entdoppelt

    if nur:
        # Bei fester Auswahl auch deren Familienmitglieder als erledigt behandeln
        nur = {vertritt.get(x, x) for x in nur} | nur
        wahl = [r for r in rows_fam if r[1] in nur]
    elif a.min is not None:
        wahl = [r for r in rows_fam if r[0] >= a.min]
    else:
        wahl = rows_fam[:a.n]
    if erledigt:
        vorher = len(wahl)
        wahl = [r for r in wahl if r[1] not in erledigt]
        print('%d von %d bereits geklaert, %d offen' % (vorher - len(wahl), vorher, len(wahl)))

    tr = []
    for i, (d, tid, t, fid, fpath) in enumerate(wahl, 1):
        lg = leagues.get(t.get('leagueId') or '', {}).get('name', 'ligalos')
        weitere = [teams[x]['name'] for x in elternvon.get(tid, []) if x != tid]
        if weitere:
            lg += ' &middot; gilt auch f&uuml;r ' + ', '.join(weitere)
        tr.append(
            '<div class="k" data-id="%s"><div class="kopf"><span class="n">%s</span>'
            '<span class="l">%s &middot; %s: %s</span></div><div class="paar">'
            '<figure onclick="setz(this,\'wir\')"><img src="%s"><figcaption>unseres</figcaption></figure>'
            '<figure onclick="setz(this,\'fm\')"><img src="%s"><figcaption>%s</figcaption></figure>'
            '</div><button class="falsch" onclick="setzK(this,\'falsch\')">'
            '%s ist besser, geh&ouml;rt aber einem anderen Verein</button>'
            '<div class="rang">%d &middot; %.2f</div></div>'
            % (tid, t['name'], lg, QUELLE[0], ger.get(fid, '?'),
               uri(os.path.join(ROOT, t['thumb'])), uri(fpath), QUELLE[0], QUELLE[0], i, d))
    # Namen mit in die Seite geben: eine Ergebnisliste aus reinen IDs kann der Nutzer
    # nicht gegenlesen - und sie entscheidet immerhin, welche Dateien ueberschrieben werden.
    namen = {tid: t['name'] for _, tid, t, _, _ in wahl}

    html = (TPL.replace('__N__', str(len(wahl))).replace('__GES__', str(len(rows)))
            .replace('__KARTEN__', '\n'.join(tr))
            .replace('__NAMEN__', json.dumps(namen, ensure_ascii=False))
            .replace('__SORT__', 'sortiert nach unserer Aufl&ouml;sung &ndash; oben die gr&ouml;bsten'
                     if a.qual else 'sortiert nach Farbabstand &ndash; oben die uneinigsten'))
    io.open(OUT, 'w', encoding='utf-8').write(html)
    print('%d von %d Paaren zur Pruefung -> %s (%.1f MB)'
          % (len(wahl), len(rows), OUT, os.path.getsize(OUT) / 1e6))
    print('Entscheidungen liegen im Browser unter einem Schluessel FUER DIESE RUNDE; '
          'der Export enthaelt nur die hier gezeigten Faelle. Unten "Ergebnis kopieren".')


TPL = """<!doctype html><html lang="de"><head><meta charset="utf-8"><title>FM-Wappen pr&uuml;fen</title><style>
:root{--bg:#f2f2f5;--fg:#1a1a1a;--line:#dcdce2;--card:#fff;--wahl:#1f7a3d;--warn:#b4670e;--schat:0 1px 3px rgba(0,0,0,.08)}
body.dark{--bg:#15161a;--fg:#e8e8ea;--line:#33343c;--card:#1e1f25;--warn:#e79a3c;--schat:0 1px 3px rgba(0,0,0,.5)}
*{box-sizing:border-box}
body{margin:0;padding:18px 22px 84px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,Segoe UI,sans-serif}
h1{font-size:19px;margin:0 0 4px}p.sub{margin:0 0 12px;opacity:.72;font-size:13px;max-width:820px}
button{font:inherit;padding:6px 12px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:6px;cursor:pointer}
#raster{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-top:14px}
.k{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 10px 6px;box-shadow:var(--schat);position:relative}
.kopf{text-align:center;margin-bottom:8px;min-height:38px}
.n{display:block;font-weight:600;font-size:14px;line-height:1.25}
.l{display:block;font-size:11px;opacity:.55;margin-top:2px}
.paar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
figure{margin:0;cursor:pointer;border:2px solid transparent;border-radius:9px;padding:5px;transition:border-color .1s,background .1s}
figure:hover{background:rgba(127,127,127,.10)}
figure img{width:100%;height:96px;object-fit:contain;display:block}
figcaption{text-align:center;font-size:11px;opacity:.5;margin-top:3px}
figure.aktiv{border-color:var(--wahl);background:rgba(31,122,61,.10)}
figure.aktiv figcaption{opacity:1;color:var(--wahl);font-weight:600}
.k.fertig{opacity:.62}
.rang{position:absolute;top:6px;right:9px;font-size:10px;opacity:.35;font-variant-numeric:tabular-nums}
/* Dritter Zustand: FM-Logo ist das bessere Bild, gehoert aber einem anderen Verein.
   Ohne ihn sah die Auswertung nur "unentschieden" und verwarf die Beobachtung. */
button.falsch{width:100%;margin-top:7px;padding:4px 6px;font-size:11px;opacity:.6;border-style:dashed}
button.falsch:hover{opacity:1}
.k.falschzu button.falsch{opacity:1;border-style:solid;border-color:var(--warn);color:var(--warn);font-weight:600}
.k.falschzu{outline:2px solid var(--warn);outline-offset:-1px}
#bar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);
 padding:9px 22px;display:flex;gap:12px;align-items:center;font-size:13px;z-index:5}
#out{position:fixed;inset:8% 8%;background:var(--card);border:1px solid var(--line);border-radius:10px;
 padding:16px;display:none;overflow:auto;z-index:10;box-shadow:0 8px 40px rgba(0,0,0,.3)}
textarea{width:100%;height:72%;font:12px monospace}
</style></head><body>
<h1>FM-Wappen pr&uuml;fen</h1>
<p class="sub">__N__ von __GES__ Zuordnungen, __SORT__.
<b>Klick auf das richtige Wappen.</b> Nochmal klicken hebt die Wahl wieder auf. Der Abstand sagt nur,
dass sich die Bilder unterscheiden, nicht wer recht hat: mal ist unseres falsch (Reichensachsen,
Durach), mal zeigt FM einen fremden Verein gleichen Ortsnamens (Horchheim, Geinsheim).
<br><b>Der dritte Knopf ist kein Ausweichen:</b> &bdquo;FM ist besser, geh&ouml;rt aber einem anderen
Verein&ldquo; hei&szlig;t, dass es im Paket sehr wahrscheinlich ein gutes Wappen f&uuml;r diesen Verein
gibt &ndash; nur unter einer anderen ID. Das Paar wird gesperrt und der Abgleich sucht beim
n&auml;chsten Lauf den zweitbesten Kandidaten. Einfach nichts anzuklicken w&uuml;rde diese
Beobachtung verlieren.
Entscheidungen bleiben im Browser gespeichert &ndash; getrennt je Runde.</p>
<p><button onclick="document.body.classList.toggle('dark')">Hell/Dunkel</button>
<button onclick="filt(1)">nur Unentschiedene</button>
<button onclick="filt(0)">alle zeigen</button></p>
<div id="raster">__KARTEN__</div>
<div id="bar"><span id="stat"></span><button onclick="zeigErgebnis()">Ergebnis kopieren</button><button onclick="verwirf()">Auswahl verwerfen</button></div>
<div id="out"><p><b>Ergebnis</b> &ndash; an Claude zur&uuml;ckgeben:</p>
<textarea id="ta" readonly></textarea><p><button onclick="document.getElementById('out').style.display='none'">schlie&szlig;en</button></p></div>
<script>
const NAMEN=__NAMEN__;
// Der Speicher gehoert der RUNDE, nicht dem Werkzeug. Frueher lief alles unter dem
// einen Schluessel "fmreview": eine zweite Runde erbte damit die Entscheidungen der
// ersten, und "Ergebnis kopieren" gab sie alle wieder aus - zuletzt 83 Alt-Eintraege,
// die auf der Seite gar nicht standen (im Export als "name":"?" erkennbar).
// Der Schluessel haengt jetzt an den gezeigten Karten: dieselbe Seite neu geoeffnet
// findet ihren Stand wieder, eine neue Runde faengt leer an.
const IDS=Object.keys(NAMEN);
const K='fmreview:' + (function(a){let h=0;for(const c of a.slice().sort().join(','))
 h=(h*31+c.charCodeAt(0))>>>0;return a.length+'-'+h.toString(36);})(IDS);
// Nur die alte Sammel-Ablage ohne Rundenkennung raeumen. Die Rundenschluessel
// bleiben stehen: wer eine frueher gebaute Seite noch einmal oeffnet, findet
// seinen Stand wieder - und schaden koennen sie nicht mehr, seit der Export
// nach IDS filtert.
localStorage.removeItem('fmreview');
let S=JSON.parse(localStorage.getItem(K)||'{}'),nurOffen=0;
const karten=()=>document.querySelectorAll('#raster .k');
function mal(){karten().forEach(k=>{const v=S[k.dataset.id];
 k.classList.toggle('fertig',!!v);
 k.classList.toggle('falschzu',v==='falsch');
 const f=k.querySelectorAll('figure');
 f[0].classList.toggle('aktiv',v==='wir');f[1].classList.toggle('aktiv',v==='fm');
 k.style.display=(nurOffen&&v)?'none':'';});
 // Nur die Karten DIESER Seite zaehlen - sonst meldet der Balken mehr Entscheidungen
 // als Karten da sind.
 const w=IDS.map(id=>S[id]);
 const a=w.filter(v=>v==='fm').length,b=w.filter(v=>v==='wir').length,c=w.filter(v=>v==='falsch').length;
 document.getElementById('stat').textContent=
  a+' x FM, '+b+' x unseres, '+c+' x falsch zugeordnet, '+(karten().length-a-b-c)+' offen';}
function setzK(el,v){const k=el.closest('.k');
 if(S[k.dataset.id]===v)delete S[k.dataset.id];else S[k.dataset.id]=v;
 localStorage.setItem(K,JSON.stringify(S));mal();}
function setz(el,v){setzK(el,v);}
function filt(v){nurOffen=v;mal();}
function verwirf(){if(!confirm('Alle Entscheidungen dieser Seite verwerfen?'))return;
 S={};localStorage.removeItem(K);mal();}
function zeigErgebnis(){const fm=[],wir=[],falsch=[],leer=[];
 // Ausgegeben wird nur, was auf dieser Seite steht - und zwar VOLLSTAENDIG:
 // wer nichts anklickt, sagt "keines von beiden passt", und auch das gehoert
 // dokumentiert. Frueher fiel diese Aussage unter den Tisch und dasselbe Paar
 // wurde in der naechsten Runde wieder vorgelegt.
 for(const k of IDS){if(S[k])({fm:fm,wir:wir,falsch:falsch})[S[k]].push(k);else leer.push(k);}
 const mitNamen=a=>a.map(id=>({id:id,name:NAMEN[id]||'?'})).sort((x,y)=>x.name.localeCompare(y.name,'de'));
 document.getElementById('ta').value=JSON.stringify(
  {uebernehmen:mitNamen(fm),behalten:mitNamen(wir),falsch_zugeordnet:mitNamen(falsch),
   nicht_entschieden:mitNamen(leer)},null,1);
 document.getElementById('out').style.display='block';
 document.getElementById('ta').select();try{document.execCommand('copy')}catch(e){}}
mal();
</script></body></html>"""


if __name__ == '__main__':
    main()
