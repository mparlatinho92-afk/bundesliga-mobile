#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crawlt Abschlusstabellen der Fußball-Bundesliga / 2. Bundesliga von de.wikipedia,
mappt Vereine via tools/club_map.json -> teamId, validiert (S+U+N, Rang-Eindeutigkeit)
und schreibt tools/history_seasons.json (Array {y, lid, table:[{id,rank,s,u,n,gf,ga}]}).

Spart Tokens: das gesamte Holen/Parsen/Mappen läuft hier; ins Spiel integriert wird am Schluss.

Aufruf:
  python tools/histcrawl.py 1 1987 2024          # 1. Bundesliga 1987/88 .. 2024/25
  python tools/histcrawl.py 2 1981 1990          # 2. Bundesliga (eingleisig) 1981/82 ..
  python tools/histcrawl.py 1 1987 1990 --append # an bestehende history_seasons.json anhängen
Mehrgleisige 2. BL (Nord/Süd 1974-1981, 3-gleisig 1991/92) müssen separat behandelt werden.
"""
import sys, os, json, re, urllib.request, urllib.parse, html, time
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def load_map():
    with open(os.path.join(HERE, "club_map.json"), encoding="utf-8") as f:
        m = json.load(f)
    return {k: v for k, v in m.items() if not k.startswith("_")}

def load_gamedata():
    """(id-Set, name->id) aus game_data.js. Reserveteams (II/III/U..) ausgeschlossen für name->id."""
    try:
        with open(os.path.join(ROOT, "game_data.js"), encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return None, {}
    ids = set(re.findall(r'"id":"([^"]+)"', txt))
    name2id = {}
    RES = re.compile(r"\b(II|III|IV|U\s?\d+)\b|u\d+$|ii$|iii$")
    for cid, nm in re.findall(r'"id":"([^"]+)","name":"([^"]+)"', txt):
        if RES.search(cid) or RES.search(nm):
            continue
        name2id.setdefault(nm, cid)  # erster Treffer (Hauptteam)
    return ids, name2id

class TableParser(HTMLParser):
    """Sammelt alle <table>…</table> als Liste von Zeilen (jede Zeile = Liste Zellentexte)."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.cur, self.row = [], None, None
        self.cell, self.depth, self.skip = None, 0, 0
    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "sup"):  # sup = Fußnoten-Marker
            self.skip += 1; return
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.cur = []
        elif tag == "tr" and self.cur is not None and self.depth == 1:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []
    def handle_endtag(self, tag):
        if tag in ("style", "script", "sup"):
            self.skip = max(0, self.skip - 1); return
        if tag == "table":
            if self.depth == 1 and self.cur is not None:
                self.tables.append(self.cur); self.cur = None
            self.depth -= 1
        elif tag == "tr" and self.row is not None and self.depth == 1:
            self.cur.append(self.row); self.row = None
        elif tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split())); self.cell = None
    def handle_data(self, data):
        if self.cell is not None and not self.skip:
            self.cell.append(data)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ba-histcrawl/1.0 (offline football archive)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

NUM = re.compile(r"^-?\d+$")
RANK = re.compile(r"^(\d+)\.?$")               # "1" oder "1." (de.wikipedia)
TORE = re.compile(r"^(\d+)\s*[:–-]\s*(\d+)$")  # "78:40"

def parse_standings(rows):
    """Findet die Abschlusstabelle und liefert [{rank, club, s, u, n, gf, ga}] oder None."""
    best = None
    for tbl in rows:
        data = [r for r in tbl if len(r) >= 7]
        if len(data) < 14:
            continue
        parsed = []
        for r in data:
            # Tore-Zelle "gf:ga" finden
            tore_i = next((i for i, c in enumerate(r) if TORE.match(c)), None)
            if tore_i is None:
                continue
            gf, ga = map(int, TORE.match(r[tore_i]).groups())
            # vor der Tore-Spalte: Sp S U N (die letzten 4 reinen Zahlen vor tore_i)
            nums = [(i, int(c)) for i, c in enumerate(r[:tore_i]) if NUM.match(c)]
            if len(nums) < 4:
                continue
            sp, s, u, n = [v for _, v in nums[-4:]]
            if s + u + n != sp:
                continue
            # Rang = erste Zelle "1"/"1."; Verein = längste nicht-numerische Zelle
            rank = next((int(RANK.match(c).group(1)) for c in r if RANK.match(c)), None)
            club_cells = [c for c in r if c and not RANK.match(c) and not NUM.match(c) and not TORE.match(c) and len(c) > 2]
            club = max(club_cells, key=len) if club_cells else None
            if rank is None or not club:
                continue
            parsed.append({"rank": rank, "club": club, "s": s, "u": u, "n": n, "gf": gf, "ga": ga})
        if 14 <= len(parsed) <= 24 and (best is None or len(parsed) > len(best)):
            best = parsed
    return best

def clean_club(name):
    # Klammerzusätze / Markierungen entfernen ("(M)", "(N)", "(P)", Fußnoten)
    name = re.sub(r"\s*\([^)]*\)", "", name)
    name = re.sub(r"\s*\[[^\]]*\]", "", name)
    return name.strip()

def main():
    if len(sys.argv) < 4:
        print(__doc__); sys.exit(1)
    lid = sys.argv[1]
    y0, y1 = int(sys.argv[2]), int(sys.argv[3])
    append = "--append" in sys.argv
    cmap = load_map()
    gd_ids, gd_name2id = load_gamedata()
    auto = {}
    base = "Fußball-Bundesliga" if lid == "1" else "2._Fußball-Bundesliga"

    def sstr(y):  # Saisonlabel; Sonderfall Jahrtausendwende: "1999/2000"
        return f"{y}/2000" if y == 1999 else f"{y}/{str(y+1)[-2:]}"
    out, unmapped, problems = [], {}, []
    for y in range(y0, y1 + 1):
        season = sstr(y)
        page = f"{base}_{season}"
        url = "https://de.wikipedia.org/wiki/" + urllib.parse.quote(page)
        try:
            htmltext = fetch(url)
        except Exception as e:
            problems.append(f"{season}: FETCH {e}"); continue
        p = TableParser(); p.feed(htmltext)
        st = parse_standings(p.tables)
        if not st:
            problems.append(f"{season}: keine Abschlusstabelle erkannt"); continue
        games = (len(st) - 1) * 2
        ranks = set(); rows = []
        ok = True
        for r in st:
            club = clean_club(r["club"])
            cid = cmap.get(club)
            if not cid and club in gd_name2id:   # Auto: exakter Name in game_data.js (Hauptteam)
                cid = gd_name2id[club]; auto[club] = cid
            if not cid:
                unmapped[club] = unmapped.get(club, 0) + 1; ok = False; continue
            if gd_ids is not None and not cid.startswith("hist_") and cid not in gd_ids:
                problems.append(f"{season}: id '{cid}' ({club}) NICHT in game_data.js"); ok = False
            if r["rank"] in ranks:
                problems.append(f"{season}: doppelter Rang {r['rank']}"); ok = False
            ranks.add(r["rank"])
            if r["s"] + r["u"] + r["n"] != games:
                problems.append(f"{season} {club}: S+U+N != {games}"); ok = False
            rows.append({"id": cid, "rank": r["rank"], "s": r["s"], "u": r["u"], "n": r["n"], "gf": r["gf"], "ga": r["ga"]})
        for k in range(1, len(st) + 1):
            if k not in ranks: problems.append(f"{season}: Rang {k} fehlt"); ok = False
        if ok:
            rows.sort(key=lambda x: x["rank"])
            out.append({"y": season, "lid": lid, "table": rows})
            print(f"  OK {season}: {len(rows)} Vereine")
        else:
            print(f"  -- {season}: unvollständig (siehe unten)")
        time.sleep(0.3)

    outpath = os.path.join(HERE, "history_seasons.json")
    existing = []
    if append and os.path.exists(outpath):
        with open(outpath, encoding="utf-8") as f: existing = json.load(f)
        have = {s["y"] + "|" + s["lid"] for s in existing}
        out = [s for s in out if s["y"] + "|" + s["lid"] not in have]
        existing += out
        out = existing
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)

    print(f"\n>>> {len(out)} Saisons in tools/history_seasons.json")
    if auto:
        print(f"\nAUTO-gemappt via game_data.js ({len(auto)} – bitte spot-checken):")
        for k, v in sorted(auto.items()): print(f'    "{k}": "{v}"')
    if unmapped:
        print("\nUNGEMAPPTE Vereine (in tools/club_map.json ergänzen):")
        for k, v in sorted(unmapped.items()): print(f'    "{k}": "",   # {v}x')
    if problems:
        print("\nPROBLEME:")
        for pr in problems: print("    " + pr)
    if not unmapped and not problems:
        print("Alles sauber.")

if __name__ == "__main__":
    main()
