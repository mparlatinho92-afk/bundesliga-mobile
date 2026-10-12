# Ebene 4 vor 1994: f-archiv-Abschlusstabellen gegen den Wikipedia-Abzug des Nutzers (Gegenprobe, KEIN Einbau).
#
#   python tools/ebene4_wiki_abgleich.py [farchiv.csv] [wikipedia/tabellen.csv]
#
# Je Verband und Saison werden alle Zeilen beider Quellen ueber (Tore, Gegentore, Pluspunkte) gepaart - Namen
# schreiben die Quellen verschieden, die Zahlen nicht. Gemeldet wird: gleiche Zeilen, Abweichungen, Zeilen nur in
# einer Quelle, wie viele f-archiv-Zeilen S/U/N aus Wikipedia bekaemen und ob Wikipedia die Staffeln trennt, die
# f-archiv in eine Tabelle zusammenwirft (Verbandsliga Westfalen ab 1978).
# Ausgabe: Konsole + tools/_dryrun/ebene4_abgleich.txt
import csv, os, re, sys, collections

HIER = os.path.dirname(os.path.abspath(__file__))
FA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'farchiv_output', 'alle_tabellen_final.csv')
WI = sys.argv[2] if len(sys.argv) > 2 else r'G:\Meine Ablage\fussball.de\wikipedia\tabellen.csv'

# (Verband, f-archiv-Liganame als Regex, Wikipedia-Spielklasse als Regex, von, bis[, f-archiv-URL muss enthalten]) - Saison-Startjahr,
# nur Ebene 4. Drei Namensfallen, gemessen: Bremen ab 1974 tauschen die Quellen Landes-/Verbandsliga; Hamburg 1978-81 steht im
# f-archiv-Ordner landesliga/ die Ebene 5 als "Verbandsliga Hamburg"; Wikipedias "Landesliga Niedersachsen" 1964-73 ist die
# Amateurliga (Ebene 3) - fuer die vier Verbandsligen darunter hat Wikipedia nichts.
PAARE = [
    ('Westfalen',          r'Verbandsliga Westfalen',                      r'Verbandsliga Westfalen',           1978, 1993),
    ('Niederrhein',        r'Verbandsliga Niederrhein',                    r'Verbandsliga Niederrhein',         1978, 1993),
    ('Mittelrhein',        r'Verbandsliga Mittelrhein',                    r'Verbandsliga Mittelrhein',         1978, 1993),
    ('Hamburg',            r'Landesliga Hamburg',                          r'Landesliga Hamburg',               1974, 1977),
    ('Hamburg',            r'Verbandsliga Hamburg',                        r'Verbandsliga Hamburg',             1978, 1993, '/hamburg/verbandsliga/'),
    ('Bremen',             r'(Landes|Verbands)liga Bremen',                r'Verbandsliga Bremen',              1974, 1993),
    ('Schleswig-Holstein', r'Landesliga Schleswig-Holstein',               r'Landesliga Schleswig-Holstein',    1974, 1977),
    ('Schleswig-Holstein', r'Verbandsliga Schleswig-Holstein',             r'Verbandsliga Schleswig-Holstein',  1978, 1993),
    ('Niedersachsen',      r'Landesliga Niedersachsen',                    r'Landesliga Niedersachsen',         1974, 1978),
    ('Niedersachsen',      r'Verbandsliga Niedersachsen',                  r'Verbandsliga Niedersachsen',       1979, 1993),
    ('Rheinland',          r'Amateurliga Rheinland',                       r'Verbandsliga Rheinland',           1978, 1993),
    ('Berlin',             r'(?!)',                                        r'(Landes|Verbands)liga Berlin',     1991, 1993),
]
PAARE = [(x[0], re.compile('^(?:' + x[1] + ')$'), re.compile('^(?:' + x[2] + ')$'), x[3], x[4], x[5] if len(x) > 5 else '') for x in PAARE]

def jahr(s):
    m = re.match(r'(\d{2,4})', s or '')
    if not m: return None
    y = int(m.group(1))
    return y if y > 1000 else (1900 + y if y > 50 else 2000 + y)
def zahl(s):
    try: return int(s)
    except (TypeError, ValueError): return None
def paar(s):
    m = re.match(r'\s*(\d+)\s*:\s*(\d+)', s or '')
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)

fa = collections.defaultdict(dict)   # (verband, y) -> {(url, platz, verein): zeile}
with open(FA, encoding='utf-8', errors='replace') as f:
    for z in csv.DictReader(f):
        y = jahr(z['season']); liga = re.sub(r'\s+', ' ', z['league'] or '').strip()
        for v, rf, rw, a, b, u in PAARE:
            if y and a <= y <= b and rf.match(liga) and u in z['url']:
                gf, ga = paar(z['tore']); pp, pm = paar(z['punkte'])
                fa[(v, y)][(z['url'], z['platz'], z['verein'])] = {
                    'url': z['url'], 'platz': zahl(z['platz']), 'verein': z['verein'], 'sp': zahl(z['spiele']),
                    's': zahl(z['siege']), 'gf': gf, 'ga': ga, 'pp': pp}
                break
wi = collections.defaultdict(list)
with open(WI, encoding='utf-8-sig') as f:
    for z in csv.DictReader(f, delimiter=';'):
        y = jahr(z['saison']); k = z['spielklasse']
        if z['phase'] != 'Hauptrunde' or 'Aufstieg' in z['staffel']: continue   # Aufstiegsrunden sind keine Ligatabelle
        for v, rf, rw, a, b, u in PAARE:
            if y and a <= y <= b and rw.match(k):
                wi[(v, y)].append({'staffel': z['staffel'], 'platz': zahl(z['platz']), 'verein': z['mannschaft'],
                                   'sp': zahl(z['spiele']), 's': zahl(z['g']), 'u': zahl(z['u']), 'n': zahl(z['v']),
                                   'gf': zahl(z['tore']), 'ga': zahl(z['gegentore']), 'pp': zahl(z['punkte'])})
                break

aus = []
def p(*x): aus.append(' '.join(str(s) for s in x))
summe = collections.Counter()
je_verband = collections.defaultdict(collections.Counter)
abw_bsp, trenn, ohne, tore_bsp = [], {}, {}, []
for key in sorted(set(fa) | set(wi)):
    v, y = key
    F = list(fa.get(key, {}).values()); W = wi.get(key, [])
    c = je_verband[v]
    c['saisons'] += 1
    if F and W: c['beide'] += 1
    elif F: c['nur_farchiv'] += 1; c['zeilen_nur_f'] += len(F); continue
    else: c['nur_wiki'] += 1; c['zeilen_nur_w'] += len(W); continue
    # Mehrere f-archiv-Tabellen derselben Saison (Bremen: Landes- und Verbandsliga, die Namen wechseln je nach Jahr):
    # behalten wird, was zur Wikipedia-Tabelle passt (mind. die Haelfte der Zeilen mit gleichem Torverhaeltnis).
    urls = collections.Counter(r['url'] for r in F)
    if len(urls) > 1:
        tv = {(w['gf'], w['ga']) for w in W}
        gut = {u for u in urls if sum((r['gf'], r['ga']) in tv for r in F if r['url'] == u) >= urls[u] / 2}
        c['f_andere_ebene'] += sum(1 for r in F if r['url'] not in gut)
        F = [r for r in F if r['url'] in gut]
    frei = list(W)
    for r in F:
        t = next((w for w in frei if (w['gf'], w['ga'], w['pp']) == (r['gf'], r['ga'], r['pp'])), None)
        if t is None:   # zweiter Versuch: gleiches Torverhaeltnis, Punkte weichen ab
            t = next((w for w in frei if (w['gf'], w['ga']) == (r['gf'], r['ga'])), None)
            if t: c['tore_gleich_punkte_anders'] += 1; abw_bsp.append(f'{v} {y}/{(y+1)%100:02d}: {r["verein"]} {r["pp"]} Pkt (f) / {t["verein"]} {t["pp"]} (w)')
            else:   # dritter Versuch: gleicher Platz, gleiche Punkte, Tore weichen ab (Tippfehler einer Quelle)
                t = next((w for w in frei if (w['platz'], w['pp']) == (r['platz'], r['pp'])), None)
                if t: c['tore_anders'] += 1; tore_bsp.append(f'{v} {y}/{(y+1)%100:02d} Pl {r["platz"]}: {r["verein"]} {r["gf"]}:{r["ga"]} (f) / {t["gf"]}:{t["ga"]} (w)')
            if not t:
                c['f_ohne_partner'] += 1
                ohne.setdefault(v, []).append(f'{y}/{(y+1)%100:02d} f  Pl {r["platz"]} {r["verein"]} {r["sp"]} Sp {r["gf"]}:{r["ga"]} {r["pp"]} Pkt')
                continue
        else: c['gleich'] += 1
        frei.remove(t)
        if r['s'] is None and t['s'] is not None: c['sun_neu'] += 1
        if r['platz'] != t['platz']: c['platz_anders'] += 1
        trenn.setdefault(key, collections.defaultdict(set))[r['url']].add(t['staffel'])
    c['w_ohne_partner'] += len(frei)
    for w in frei: ohne.setdefault(v, []).append(f'{y}/{(y+1)%100:02d}  w Pl {w["platz"]} {w["verein"]} {w["sp"]} Sp {w["gf"]}:{w["ga"]} {w["pp"]} Pkt [{w["staffel"]}]')
    c['zeilen_f'] += len(F)

p('Ebene 4 vor 1994: f-archiv gegen Wikipedia-Abzug  (Paarung ueber Tore + Gegentore + Pluspunkte)')
p('')
p(f'{"Verband":20} {"Saisons":>7} {"beide":>5} {"nur f":>5} {"nur w":>5} | {"Zeilen f":>8} {"gleich":>6} {"Pkt≠":>4} {"Tore≠":>5} {"f allein":>8} {"w allein":>8} {"Platz≠":>6} {"S/U/N neu":>9}')
for v, c in je_verband.items():
    p(f'{v:20} {c["saisons"]:7} {c["beide"]:5} {c["nur_farchiv"]:5} {c["nur_wiki"]:5} | {c["zeilen_f"]:8} {c["gleich"]:6} {c["tore_gleich_punkte_anders"]:4} {c["tore_anders"]:5} {c["f_ohne_partner"]:8} {c["w_ohne_partner"]:8} {c["platz_anders"]:6} {c["sun_neu"]:9}')
    summe.update(c)
c = summe
p(f'{"SUMME":20} {c["saisons"]:7} {c["beide"]:5} {c["nur_farchiv"]:5} {c["nur_wiki"]:5} | {c["zeilen_f"]:8} {c["gleich"]:6} {c["tore_gleich_punkte_anders"]:4} {c["tore_anders"]:5} {c["f_ohne_partner"]:8} {c["w_ohne_partner"]:8} {c["platz_anders"]:6} {c["sun_neu"]:9}')
p('')
p('Saisons nur in einer Quelle:')
for key in sorted(set(fa) | set(wi)):
    if not fa.get(key): p(f'   nur Wikipedia: {key[0]} {key[1]}/{(key[1]+1)%100:02d} ({len(wi[key])} Zeilen)')
    elif not wi.get(key): p(f'   nur f-archiv:  {key[0]} {key[1]}/{(key[1]+1)%100:02d} ({len(fa[key])} Zeilen)')
p('')
p('Staffeltrennung: f-archiv-Tabellen, deren Zeilen in Wikipedia auf mehrere Staffeln fallen')
for key, urls in sorted(trenn.items()):
    for url, st in urls.items():
        if len(st) > 1: p(f'   {key[0]} {key[1]}/{(key[1]+1)%100:02d}: 1 f-archiv-Tabelle -> {len(st)} Wikipedia-Staffeln')
p('')
p(f'Punkte weichen ab bei gleichem Torverhaeltnis ({len(abw_bsp)}), erste 25:')
for b in abw_bsp[:25]: p('   ' + b)
p('')
p(f'Tore weichen ab bei gleichem Platz und gleichen Punkten ({len(tore_bsp)}), erste 15:')
for b in tore_bsp[:15]: p('   ' + b)
p('')
p('Zeilen ohne Partner, je Verband die ersten 12 (sortiert, f = f-archiv, w = Wikipedia):')
for v, l in ohne.items():
    p(f'  {v} ({len(l)}):')
    for b in sorted(l)[:12]: p('     ' + b)

os.makedirs(os.path.join(HIER, '_dryrun'), exist_ok=True)
open(os.path.join(HIER, '_dryrun', 'ebene4_abgleich.txt'), 'w', encoding='utf-8').write('\n'.join(aus) + '\n')
print('\n'.join(aus))
