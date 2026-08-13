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
    a = ap.parse_args()

    fmg = pack_index()
    j = lambda p: json.load(io.open(os.path.join(ROOT, p), encoding='utf-8'))
    m, ger = j('tools/_fm_match.json'), j('tools/_fm_ger.json')
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']

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
    rows.sort(reverse=True)
    wahl = [r for r in rows if r[0] >= a.min] if a.min is not None else rows[:a.n]

    tr = []
    for i, (d, tid, t, fid, fpath) in enumerate(wahl, 1):
        lg = leagues.get(t.get('leagueId') or '', {}).get('name', 'ligalos')
        tr.append(
            '<div class="k" data-id="%s"><div class="kopf"><span class="n">%s</span>'
            '<span class="l">%s &middot; FM: %s</span></div><div class="paar">'
            '<figure onclick="setz(this,\'wir\')"><img src="%s"><figcaption>unseres</figcaption></figure>'
            '<figure onclick="setz(this,\'fm\')"><img src="%s"><figcaption>FM</figcaption></figure>'
            '</div><div class="rang">%d &middot; %.2f</div></div>'
            % (tid, t['name'], lg, ger.get(fid, '?'),
               uri(os.path.join(ROOT, t['thumb'])), uri(fpath), i, d))
    # Namen mit in die Seite geben: eine Ergebnisliste aus reinen IDs kann der Nutzer
    # nicht gegenlesen - und sie entscheidet immerhin, welche Dateien ueberschrieben werden.
    namen = {tid: t['name'] for _, tid, t, _, _ in wahl}

    html = (TPL.replace('__N__', str(len(wahl))).replace('__GES__', str(len(rows)))
            .replace('__KARTEN__', '\n'.join(tr))
            .replace('__NAMEN__', json.dumps(namen, ensure_ascii=False)))
    io.open(OUT, 'w', encoding='utf-8').write(html)
    print('%d von %d Paaren zur Pruefung -> %s (%.1f MB)'
          % (len(wahl), len(rows), OUT, os.path.getsize(OUT) / 1e6))
    print('Entscheidungen bleiben im Browser gespeichert; unten "Ergebnis kopieren".')


TPL = """<!doctype html><html lang="de"><head><meta charset="utf-8"><title>FM-Wappen pr&uuml;fen</title><style>
:root{--bg:#f2f2f5;--fg:#1a1a1a;--line:#dcdce2;--card:#fff;--wahl:#1f7a3d;--schat:0 1px 3px rgba(0,0,0,.08)}
body.dark{--bg:#15161a;--fg:#e8e8ea;--line:#33343c;--card:#1e1f25;--schat:0 1px 3px rgba(0,0,0,.5)}
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
#bar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);
 padding:9px 22px;display:flex;gap:12px;align-items:center;font-size:13px;z-index:5}
#out{position:fixed;inset:8% 8%;background:var(--card);border:1px solid var(--line);border-radius:10px;
 padding:16px;display:none;overflow:auto;z-index:10;box-shadow:0 8px 40px rgba(0,0,0,.3)}
textarea{width:100%;height:72%;font:12px monospace}
</style></head><body>
<h1>FM-Wappen pr&uuml;fen</h1>
<p class="sub">__N__ von __GES__ Zuordnungen, sortiert nach Farbabstand &ndash; oben die uneinigsten.
<b>Klick auf das richtige Wappen.</b> Nochmal klicken hebt die Wahl wieder auf. Der Abstand sagt nur,
dass sich die Bilder unterscheiden, nicht wer recht hat: mal ist unseres falsch (Reichensachsen,
Durach), mal zeigt FM einen fremden Verein gleichen Ortsnamens (Horchheim, Geinsheim).
Entscheidungen bleiben im Browser gespeichert.</p>
<p><button onclick="document.body.classList.toggle('dark')">Hell/Dunkel</button>
<button onclick="filt(1)">nur Unentschiedene</button>
<button onclick="filt(0)">alle zeigen</button></p>
<div id="raster">__KARTEN__</div>
<div id="bar"><span id="stat"></span><button onclick="zeigErgebnis()">Ergebnis kopieren</button></div>
<div id="out"><p><b>Ergebnis</b> &ndash; an Claude zur&uuml;ckgeben:</p>
<textarea id="ta" readonly></textarea><p><button onclick="document.getElementById('out').style.display='none'">schlie&szlig;en</button></p></div>
<script>
const K='fmreview';let S=JSON.parse(localStorage.getItem(K)||'{}'),nurOffen=0;
const karten=()=>document.querySelectorAll('#raster .k');
function mal(){karten().forEach(k=>{const v=S[k.dataset.id];
 k.classList.toggle('fertig',!!v);
 const f=k.querySelectorAll('figure');
 f[0].classList.toggle('aktiv',v==='wir');f[1].classList.toggle('aktiv',v==='fm');
 k.style.display=(nurOffen&&v)?'none':'';});
 const a=Object.values(S).filter(v=>v==='fm').length,b=Object.values(S).filter(v=>v==='wir').length;
 document.getElementById('stat').textContent=a+' x FM, '+b+' x unseres, '+(karten().length-a-b)+' offen';}
function setz(el,v){const k=el.closest('.k');
 if(S[k.dataset.id]===v)delete S[k.dataset.id];else S[k.dataset.id]=v;
 localStorage.setItem(K,JSON.stringify(S));mal();}
function filt(v){nurOffen=v;mal();}
const NAMEN=__NAMEN__;
function zeigErgebnis(){const fm=[],wir=[];for(const k in S)(S[k]==='fm'?fm:wir).push(k);
 const mitNamen=a=>a.map(id=>({id:id,name:NAMEN[id]||'?'})).sort((x,y)=>x.name.localeCompare(y.name,'de'));
 document.getElementById('ta').value=JSON.stringify({uebernehmen:mitNamen(fm),behalten:mitNamen(wir)},null,1);
 document.getElementById('out').style.display='block';
 document.getElementById('ta').select();try{document.execCommand('copy')}catch(e){}}
mal();
</script></body></html>"""


if __name__ == '__main__':
    main()
