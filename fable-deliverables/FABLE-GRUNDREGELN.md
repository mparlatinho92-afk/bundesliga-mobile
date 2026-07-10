# Fable-Grundregeln — verbindlich für ALLE Erzähl-/Text-Pakete

Dieses Dokument gilt für jedes Fable-Paket in diesem Projekt (Schlagzeilen, Pressestimmen,
Saison-Rückblick, Vereins-/Spieler-Lore, Vorschau-Anrisse, Serien-Texte …). Ein paket-eigener
Spec liefert nur noch das **Delta**: Kontextfelder, Kategorien, Mengen, Fallstricke.
Die folgenden acht Regeln stehen darüber und werden im Delta NICHT wiederholt.

---

## 1. Passiv & deterministisch — nie aktiv in die Sim eingreifen
Fable liefert **Lookup-/Phrasen-Bänke**, keinen Steuerungs-Code. Der Text greift nur,
wenn die Engine den Fall **emergent** erzeugt (Kantersieg, Überraschung, Abstieg, Meistertitel …).
Nichts wird geskriptet, nichts herbeigeführt. Eine Bank darf ein Ergebnis, eine Tabelle oder
eine Saison **niemals verändern** — sie beschreibt nur, was ohnehin passiert ist. Die Auswahl
(z.B. „Spiel des Tages") trifft Opus-Code (`_matchInterest`); Fable liefert nur die Worte.

## 2. NIE reale Erfolge oder Fakten behaupten  ← häufigster Fehler
Die Sim-Zeitlinie weicht von der echten Historie ab. Der FC Bayern kann in der Sim absteigen,
ein Dorfverein Meister werden. Deshalb: **nur Stadt/Region, Vereinscharakter, Tradition, Ära,
Rivalität, Fankultur.** Verboten sind reale Meistertitel, DFB-Pokal-Siege, Europapokal-Historie,
reale Auf-/Abstiege, „ihr erster Titel", „nach dem Zwangsabstieg 19XX", „Rekordmeister".
Alles Zahlenhafte/Tabellarische kommt **ausschließlich** aus den State-Feldern, die der
Delta-Spec benennt. Erfinde nie eine Ursache, die der State nicht hergibt (kein „nach dem
Trainerwechsel", keine Verletzungen, keine Transfers, die nicht übergeben wurden).
> „Traditionsklub" ist erlaubt (kommt aus `ewige[lid].pts`, einem State-Feld) — „7-facher
> Meister" ist verboten (reale Behauptung).

## 3. Ära-Register statt Einheitston
Wo ein Paket historische Saisons betextet (Delta sagt es), muss der Ton zur Dekade passen.
Fünf Register (Bundesliga ab 1963; DDR-Oberliga ist ein separater Archiv-Track):
- **e63** 1963–1970 — Gründerjahre, formell, Reporter-Pathos
- **e71** 1971–1982 — klassische Bundesliga, sachlich-respektvoll
- **e83** 1983–1994 — TV-Zeitalter, griffiger
- **e95** 1995–2009 — moderne Bezahlsender-Ära, technischer
- **e10** 2010+ — heutiges Broadcast-/Social-Deutsch, schneller

Ein 2010er-Satz darf nicht in einer 1965er-Saison erscheinen und umgekehrt. Vereinsnamen
era-echt behandeln (der State liefert den Era-Namen; nie den heutigen aufzwingen).

## 4. Reine Datenstruktur, einbau-fertig
Liefere JS-Objekte/Arrays (Phrasen-Pools, ggf. Register-Wortlisten + Assembler). In DIESEM
Projekt ist die Konvention eine **eigene `data_*.js`** (bzw. Bank in `app/reports.js`), die
`manage-v` beim Bauen automatisch in `index.html` inliniert — analog `data_reports.js`
(`window.REPORTS`). Keine Prosa-Absätze, die Opus erst zerlegen muss. Platzhalter-Slots klar
und einheitlich benannt: `{heim}`, `{gast}`, `{sieger}`, `{verlierer}`, `{score}` usw. — der
Delta-Spec legt die exakte Slot-Liste je Paket fest.

## 5. Grammatik-Disziplin bei Slots (Deutsch)
- **Kasus-Tokens nie mischen.** Zahl-/Nominalphrasen kommen fertig im richtigen Kasus vom
  Assembler (`{score}` ist z.B. bei Sieg IMMER aus Siegersicht montiert) — nie nackte Zahl +
  „Tor(e)/Punkt(e)" im Template selbst bilden.
- **Verb-Kongruenz-Fallen** vermeiden: keine Konstruktionen, deren Verb-Numerus vom Zahlwert
  abhängt („trennte(n) …") — auf invariante Formen umbauen.
- **Vereins-/Personennamen** (`{heim}`, `{sieger}`) nicht deklinieren — Templates so bauen,
  dass der Name im Nominativ oder als unveränderliches Objekt steht („Sieg für {sieger}",
  nicht „{sieger}s Sieg"). Vereinsnamen haben Artikel-Chaos (der FC, die Eintracht, Bayern) →
  artikellose Konstruktionen bevorzugen.
- **Ära-Wort-Tokens** (falls das Paket sie nutzt) haben feste grammatische Rollen; der
  Delta-Spec kommentiert sie. Neue Phrasen müssen die Rolle respektieren.

## 6. Volumen gegen Monotonie
Je häufiger ein Baustein feuert, desto mehr Varianten braucht er (eine Schlagzeile pro
Spieltag × 50 Saisons × viele Ligen → hoher Wiederholungsdruck). Der Delta-Spec nennt pro
Kategorie eine Mindestzahl. Optional Gewichte für seltene/pointierte Varianten. Zwei
aufeinanderfolgende identische Zeilen sollen unwahrscheinlich sein.

## 7. Deutsch — und tonneutral wo nötig
Spielsprache ist Deutsch. Bausteine, die in mehreren Kontexten wiederverwendet werden
(z.B. eine Zeile, die für Ergebnis UND Vorschau taugt), müssen in allen davon funktionieren —
also keine Formulierung, die nur zu einem der Fälle passt.

## 8. Speicher: 0 Bytes gespeicherter Text
Text wird zur **Laufzeit** aus leichten State-Feldern regeneriert, nicht im Save abgelegt.
Fable nutzt nur die Kontextfelder, die der Delta-Spec als „verfügbar" markiert. Wo ein Paket
determinismus-pflichtig ist (Schlagzeile muss beim Re-Render/Reload identisch bleiben), liefert
Opus einen Seed (z.B. `_reportSeed` aus `home|away|score`) — der Delta-Spec sagt es; sonst
genügt einfacher Zufall.

---

### Aufgabenteilung (zur Erinnerung)
- **Opus** definiert das Interface (verfügbare State-/Event-Felder, Slot-Namen, Einbau-Ort),
  liefert nötige Hilfs-/Übersetzungsmaps und verdrahtet die Bank chirurgisch.
- **Fable** füllt ausschließlich die **Sprache** (Pools, Register, Varianz, Ton).
- **Nicht an Fable:** die Score-Gewichte (`_REPORT_W`), Auswahl-/Klassifikator-Logik
  (`_matchInterest`, `_reportCategory`), Geo-/Zonen-Schwellen, Liga-Balancing — alles mit
  statistischen/mechanischen Ankern.
