# Bestandsfilter fuer den fussball.de-Scraper (Colab "cookie cutter").
# Liest fussballde_bestand.json.gz (erzeugt von tools/fussballde_bestand.mjs) und sagt je Menue-Staffel,
# ob wir die Tabelle schon haben. In Colab: Datei in MyDrive/fussball.de/bestand/ legen, diesen Block als
# eigene Zelle zwischen Koch 1 und Koch 2 einfuegen (Aenderung an koch2 steht ganz unten).
import gzip, json, os, re

LAUT = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
FUELL = {"herren", "staffel", "gruppe", "st", "der", "die", "und"}
ABK = {"bzl", "ll", "vl", "ol", "kl", "kk"}   # Kuerzel im Staffelnamen ("BZL 01") tragen nichts bei

def toks(s):
    """MUSS identisch zu toks() in tools/fussballde_bestand.mjs bleiben."""
    s = re.sub("[äöüß]", lambda m: LAUT[m.group()], s.lower())
    s = re.sub(r"-(staffel|gruppe)\b", " ", s)
    s = re.sub(r"([a-z])[-/]([a-z])", r"\1\2", s)
    out = []
    for t in re.split(r"[^a-z0-9]+", s):
        if not t: continue
        if t.isdigit(): t = str(int(t))
        if t not in FUELL and t not in out: out.append(t)
    return set(out)

def lade_bestand(pfad):
    if not os.path.exists(pfad): return {"ids_tab": set(), "ids_kreuz": set(), "tab": {}}
    j = json.load((gzip.open if pfad.endswith(".gz") else open)(pfad, "rt", encoding="utf-8"))
    return {"ids_tab": set(j["staffel_ids"]["tabellen"]), "ids_kreuz": set(j["staffel_ids"]["kreuz"]),
            "tab": {s: [(set(e["t"]), e) for e in l] for s, l in j["tabellen"].items()}}

def schon_da(bestand, verband, st):
    """Eintrag aus fussballde_bestand.json, falls diese Staffel dort schon steht, sonst None.
    Treffer nur, wenn ALLE Tokens unserer Liga im fussball.de-Namen stehen UND der Staffelname
    nichts Zusaetzliches traegt ("Oberliga Hamburg 1" ist nicht "Oberliga Hamburg")."""
    if st.get("relegation"): return None
    rahmen = toks(verband) | toks(st["gebiet"]) | toks(st["spielklasse"])
    alle = rahmen | toks(st["staffel"])
    for t, e in bestand["tab"].get(st["saison"], []):
        if t <= alle and not (toks(st["staffel"]) - rahmen - ABK - t):
            return e
    return None

# --- in Colab: ---------------------------------------------------------------------------------------
# BESTAND_JSON = lade_bestand(os.path.join(BESTAND, "fussballde_bestand.json.gz"))
# und in koch2() die Zeile  will_tab = TABELLEN and sid not in b_tab and sid not in f_tab  ersetzen durch:
#     will_tab = (TABELLEN and sid not in b_tab and sid not in f_tab
#                 and sid not in BESTAND_JSON["ids_tab"] and not schon_da(BESTAND_JSON, VERBAND, st))
# (Kreuztabellen bleiben unberuehrt: Einzelergebnisse haben wir aus keiner der anderen Quellen.)
