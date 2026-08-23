#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_fm_rematch.py - baut tools/_fm_match.json neu auf.

WARUM ES DIESES WERKZEUG BRAUCHT
Der bisherige Abgleich lief ueber den Namen und vergab jede FM-ID an den ERSTEN
passenden Verein. FM fuehrt die Spitzenvereine aber unter dem nackten ORTSNAMEN
("Hamburg", "Kaiserslautern", "Magdeburg", "Union Berlin") - und diese Eintraege
schnappte sich jeweils ein kleiner Verein derselben Stadt:

    FM 947 "Hamburg"          -> Wandsbeker TSV Concordia Hamburg (statt HSV)
    FM 945 "Kaiserslautern"   -> VfR Kaiserslautern              (statt 1. FCK)
    FM 121182 "Union Berlin"  -> FC Viktoria 1889 Berlin         (statt Union)
    FM 892778 "Dueren"        -> Sportfreunde Dueren  ) beide Paare
    FM 91149241 "SF Dueren"   -> 1. FC Dueren         ) schlicht vertauscht

Der Spitzenverein blieb dadurch ohne Zuordnung und landete als "keine FM-Zuordnung"
in der Einkaufsliste - 52 Profivereine unter 90 px, obwohl ihr Logo im Paket lag.

DIE VIER REGELN
1. FM-Kuerzel ausschreiben: "Arm." = Arminia, "Fort." = Fortuna, "RW" = Rot-Weiss,
   "SW"/"BW"/"GW" analog, "SF" = Sportfreunde. Ohne das findet "Arm. Hannover"
   nie unser "Arminia Hannover". Dazu die Ableitung auf -er: "Hamburger" -> hamburg,
   sonst trifft "Hamburger SV" FMs "Hamburg" nicht.
2. Ein nackter Ortsname in FM ("Kiel", "Magdeburg") meint den GROESSTEN Verein des
   Ortes. Das ist kein Bonuspunkt, sondern ein TOR: nur der hoechstklassige unserer
   Vereine dieses Ortes darf sich bewerben, die anderen sind gesperrt.
3. Geteilte Tokens werden nach IDF gewichtet. "Muenchen" teilen sich 20 Vereine und
   beweist nichts - "Altglienicke" teilt sich keiner und beweist alles. Ohne das
   bekommt der FC Bayern "Hellas Muenchen", weil beide "muenchen" enthalten.
4. Zuweisung ist 1:1 und global, aber KEIN Zwang: wer keinen belastbaren Partner
   hat, bleibt ohne. Ein erzwungenes Paar kostet mehr als eine Luecke - es
   ueberschreibt ein richtiges Wappen mit dem eines fremden Vereins.

Die Mannschaftsstufe (I/II) muss auf BEIDEN Seiten uebereinstimmen - sonst passt
"SC Wiedenbrueck" auf FMs "Wiedenbrueck II".

Das Werkzeug ENTSCHEIDET NICHTS. Es schlaegt Paare vor; das letzte Wort hat der
Bildvergleich in wappen_fm_review.py. Bereits per Bild bestaetigte Uebernahmen
(Status "uebernommen") behalten ihre ID unangetastet.

  python tools/wappen_fm_rematch.py            # Probelauf: nur Bericht
  python tools/wappen_fm_rematch.py --apply    # _fm_match.json neu schreiben
"""
import io, os, re, sys, json, csv, math, argparse, collections

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
J = lambda p: json.load(io.open(os.path.join(ROOT, p), encoding='utf-8'))

UML = str.maketrans({'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss', 'é': 'e', 'è': 'e',
                     'á': 'a', 'à': 'a', 'ó': 'o', 'ò': 'o', 'í': 'i', 'ú': 'u',
                     'â': 'a', 'ô': 'o', 'ç': 'c', 'ñ': 'n', 'å': 'a', 'ø': 'o'})
# FM kuerzt, unsere Namen schreiben aus. Ohne diese Bruecke bleibt jedes Paar ungefunden.
ABK = {'arm': 'arminia', 'fort': 'fortuna', 'sf': 'sportfreunde', 'sfr': 'sportfreunde',
       'vikt': 'viktoria', 'vict': 'viktoria', 'victoria': 'viktoria',
       'eintr': 'eintracht', 'germ': 'germania', 'alem': 'alemannia',
       'conc': 'concordia', 'teut': 'teutonia', 'preuss': 'preussen',
       # Farbkuerzel in ihre Einzelteile, denn wir schreiben "Rot-Weiss" und der
       # Bindestrich zerfaellt beim Tokenisieren ohnehin in zwei Woerter.
       'rw': 'rot weiss', 'sw': 'schwarz weiss', 'bw': 'blau weiss', 'gw': 'gruen weiss',
       'rws': 'rot weiss', 'rwd': 'rot weiss', 'rot-weiss': 'rot weiss'}
# Rechtsform- und Sparten-Kuerzel tragen keine Ortsinformation.
STOP = set(('fc sv sc tsv vfl vfb vfr tus tsg sg sgv spvgg spvg fsv msv ssv ssvg bsv bsc '
            'psv asv etsv rsv sus svg fv tv tsc bv stv sf ac vf skv fcr djk vsg ksv ksc '
            'dsc sgm fsg sportverein sportclub sportfreunde sportgemeinschaft '
            'ballspielverein turnverein turnerschaft turn und der die den von am im ii').split())
JAHR = re.compile(r'^(1[89]\d\d|20[0-2]\d|0\d)$')
FARBE = {'rot', 'weiss', 'blau', 'schwarz', 'gruen', 'gelb',
         'rotweiss', 'blauweiss', 'schwarzweiss', 'gruenweiss'}


def stamm(w):
    """Ableitung auf -er zurueckbilden: hamburger -> hamburg, wuerzburger -> wuerzburg.
    Nur wo ein Ortsname uebrig bleibt (>=5 Zeichen), sonst wird "bayer" aus "bayern"."""
    if len(w) >= 8 and w.endswith('er'):
        return w[:-2]
    return w


def toks(s):
    s = s.lower().translate(UML)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return [x for w in s.split() for x in ABK.get(w, w).split()]


def kern(s):
    return [stamm(w) for w in toks(s) if not JAHR.match(w) and w not in STOP]


def stufe(name):
    return 'II' if re.search(r'\bII\b|\bII$', name) else 'I'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--min', type=float, default=0.5, help='Mindest-Anteil der geteilten Namensmasse')
    ap.add_argument('--masse', type=float, default=6.0,
                    help='Mindest-IDF-Masse der geteilten Tokens - die absolute Beweislast')
    a = ap.parse_args()

    alt = J('tools/_fm_match.json')
    ger = J('tools/_fm_ger.json')
    st = J('tools/wappen_fm_uebernommen.json')
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    lvl = lambda t: leagues.get(teams[t].get('leagueId') or '', {}).get('level', 99)

    # Per Bild bestaetigte Uebernahmen sind gesetzt - weder Verein noch ID neu vergeben.
    fest = {t: str(alt[t]) for t in st.get('uebernommen', {}) if t in alt}
    belegt = set(fest.values())

    # Vom Nutzer am Bild verworfene PAARE (Verein x FM-ID). Der Verein bleibt im Rennen -
    # nur dieses eine Logo kommt fuer ihn nicht mehr in Frage, damit der naechstbeste
    # Kandidat nachruecken kann. Das ist die Gegenrichtung zu "uebernommen": dort steht
    # fest, was passt, hier, was nicht passt.
    p = os.path.join(HERE, 'wappen_fm_sperre.json')
    sperre = {t: set(v) for t, v in J('tools/wappen_fm_sperre.json').items()} \
        if os.path.exists(p) else {}
    if sperre:
        print('%d Vereine mit gesperrten Paaren (%d Paare)'
              % (len(sperre), sum(len(v) for v in sperre.values())))

    fmk = {i: kern(n) for i, n in ger.items()}
    fmst = {i: stufe(n) for i, n in ger.items()}
    unsk = {t: kern(tm['name']) for t, tm in teams.items()}
    unsst = {t: ('II' if tm.get('parentId') else stufe(tm['name'])) for t, tm in teams.items()}

    # Regel 3: IDF ueber BEIDE Namenslisten. Ein Token, das in 20 Vereinsnamen steckt,
    # unterscheidet nichts; eines, das in genau zweien steckt, identifiziert das Paar.
    df = collections.Counter()
    for ks in list(fmk.values()) + list(unsk.values()):
        df.update(set(ks))
    N = len(fmk) + len(unsk)
    idf = {w: math.log(N / (1.0 + c)) for w, c in df.items()}
    gew = lambda w: (0.4 if w in FARBE else 1.0) * max(0.1, idf.get(w, 6.0))

    def score(A, B):
        A, B = set(A), set(B)
        inter = A & B
        if not A or not B or not inter:
            return 0.0, 0.0
        masse = sum(gew(w) for w in inter)
        return masse / max(sum(gew(w) for w in A), sum(gew(w) for w in B)), masse

    neu, vergeben = dict(fest), set(belegt)

    # --- Durchgang 1: Regel 2, die nackten Ortsnamen ---------------------------------
    # "Kiel", "Magdeburg", "Aue" tragen keinerlei Vereinsmerkmal. Die IDF-Huerde von
    # Durchgang 2 wirft sie deshalb zwangslaeufig weg (ein Ortstoken allein wiegt zu
    # wenig) - genau die Faelle, in denen der Ortsname der Beweis IST. Hier entscheidet
    # stattdessen die Ligastufe: FMs "Kiel" ist Holstein Kiel, nicht der FC Kilia.
    nackt = [i for i, n in ger.items()
             if fmk[i] and len(fmk[i]) == len(toks(n)) and len(fmk[i]) <= 2
             and not (set(fmk[i]) & FARBE) and i not in belegt]
    for i in sorted(nackt, key=lambda x: ger[x]):
        bewerber = [t for t in teams
                    if t not in neu and set(fmk[i]) <= set(unsk[t]) and unsst[t] == fmst[i]
                    and i not in sperre.get(t, ())]
        if not bewerber:
            continue
        # Bei Gleichstand der Liga der namentlich naehere - "Velbert 02" vor "SC Velbert".
        bester = min(bewerber, key=lambda t: (lvl(t), -score(unsk[t], fmk[i])[0], teams[t]['name']))
        neu[bester] = i
        vergeben.add(i)

    # --- Durchgang 2: alles Uebrige nach IDF-Masse -----------------------------------
    paare = []
    for t in teams:
        if t in neu:
            continue
        K, S = unsk[t], unsst[t]
        for i, fk in fmk.items():
            if i in vergeben or fmst[i] != S or i in sperre.get(t, ()):
                continue
            s, masse = score(K, fk)
            # Regel 4: Anteil UND absolute Beweismasse muessen reichen. Der Anteil allein
            # laesst "Hellas Muenchen" auf "FC Bayern Muenchen" passen (beide 0,5).
            # Ausnahme: sind die Kerne IDENTISCH, tragen beide Namen nichts Weiteres -
            # "SF Dueren" und "Sportfreunde Dueren" bleiben beide auf ['dueren'] uebrig.
            # Ohne die Ausnahme verliert der kleine Verein seinen Eintrag ersatzlos an
            # das Flaggschiff aus Durchgang 1.
            if s < a.min or (masse < a.masse and set(K) != set(fk)):
                continue
            paare.append((s, masse, t, i))

    paare.sort(key=lambda p: (-p[0] * p[1], p[2]))
    for s, masse, t, i in paare:
        if t in neu or i in vergeben:
            continue
        neu[t] = i
        vergeben.add(i)

    dazu = {t: i for t, i in neu.items() if t not in alt}
    weg = [t for t in alt if t not in neu]
    anders = {t: (str(alt[t]), i) for t, i in neu.items() if t in alt and str(alt[t]) != i}
    nm = lambda t: teams[t]['name']
    print('alt %d Zuordnungen  ->  neu %d  (%d gesetzt aus "uebernommen")'
          % (len(alt), len(neu), len(fest)))
    print('  neu zugeordnet: %d   geaendert: %d   entfallen: %d' % (len(dazu), len(anders), len(weg)))

    eff = {}
    p = os.path.join(HERE, 'wappen_quality.csv')
    if os.path.exists(p):
        eff = {r['id']: float(r['eff']) for r in csv.DictReader(io.open(p, encoding='utf-8'))}

    print('\n=== GEAENDERT (nach Ligastufe) ===')
    for t in sorted(anders, key=lambda x: (lvl(x), nm(x))):
        o, n = anders[t]
        print('  L%-2s %-34s  %-26s -> %-26s  eff %s'
              % (lvl(t), nm(t)[:34], ger.get(o, '?')[:26], ger.get(n, '?')[:26], int(eff.get(t, 0))))
    print('\n=== NEU ZUGEORDNET, Wappen noch grob (eff < 90) ===')
    for t in sorted(dazu, key=lambda x: (lvl(x), nm(x))):
        if eff.get(t, 999) >= 90:
            continue
        print('  L%-2s %-34s  -> %-28s  eff %s'
              % (lvl(t), nm(t)[:34], ger.get(dazu[t], '?')[:28], int(eff.get(t, 0))))

    zu_pruefen = sorted(set(anders) | {t for t in dazu if eff.get(t, 999) < 90})
    out = os.path.join(HERE, '_fm_rematch_ids.json')
    if a.apply:
        json.dump(neu, io.open(os.path.join(ROOT, 'tools/_fm_match.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=0)
        json.dump([{'id': t, 'name': nm(t)} for t in zu_pruefen],
                  io.open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('\n_fm_match.json geschrieben. %d Faelle zur Sichtpruefung -> %s' % (len(zu_pruefen), out))
        print('weiter mit: python tools/wappen_fm_review.py --ids tools/_fm_rematch_ids.json')
    else:
        print('\nProbelauf - nichts geschrieben. %d Faelle waeren zu pruefen.' % len(zu_pruefen))


if __name__ == '__main__':
    main()
