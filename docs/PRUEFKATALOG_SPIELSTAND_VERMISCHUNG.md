> ## Herkunft dieser Datei
>
> Dieser Pruefkatalog stammt aus einem **anderen Projekt** und wurde hier unveraendert uebernommen.
> Die Schilderungen im Abschnitt „Was uns das gekostet hat" — drei Durchlaeufe in einem Spielstand,
> ueber eine Woche Fehlersuche, die Parallelwelt am Rundenzaehler — beschreiben **nicht** die
> Bundesliga-Simulation. Sie sind der Anlass, aus dem der Katalog entstand.
>
> **Was er hier bewirkt hat:** die Pruefung der sechs Fragen fuehrte zu v0.8.132 bis v0.8.135 —
> Spielstand-Kennung fuer jede IndexedDB-Zeile, Tab-Sperre die dem Vordergrund folgt,
> Speicher-Diagnose im Menue und das Zurueckrollen des Archivs beim Loeschen einer Saison.
> Befund und Begruendungen stehen im Code an Ort und Stelle; die beiden Regeln daraus in CLAUDE.md.
>
> **Wofuer er hier bleibt:** als Checkliste fuer das naechste Mal, wenn etwas dauerhaft gespeichert
> wird. Die sechs Fragen sind projektunabhaengig formuliert und passen auf jeden neuen Store.

# Prompt zum Weitergeben: Vermischte Spielstände

Unverändert in ein anderes Claude-Code-Projekt kippbar. Nennt keine Dateinamen, keine
Versionsnummern und keine projektspezifischen Begriffe — nur Muster, die in jedem Projekt
mit dauerhaftem Speicher gleich aussehen.

---

Zwei Dinge, unabhängig voneinander.

## 1. Prüfen, ob mehrere Spielstände sich vermischen können

Dieses Projekt speichert dauerhaft — IndexedDB, localStorage, Dateien, egal was. Prüfe
folgende sechs Fragen und antworte mit Fakten aus dem Code, nicht mit Einschätzungen.

**a) Trägt jeder gespeicherte Datensatz die Identität des Spielstands, der ihn geschrieben
hat?** Der typische Fehler: der Schlüssel ist eine reine Fachgröße — Saison, Spieltag,
Jahr, Runde. Zwei Durchläufe schreiben dann unter denselben Schlüssel, und der zweite
liest, was der erste hinterlassen hat. Zeig mir den Schlüssel jedes Stores.

**b) Was passiert beim „Neues Spiel"?** Such alle Einstiegspunkte, die ein neues Spiel
beginnen — es sind fast immer mehr als einer (Neustart, Jahr wählen, Vorlage wechseln,
Notfall-Pfad beim Laden). Prüfe für **jeden** einzeln, ob er den dauerhaften Speicher
wirklich leert oder nur den Zustand im Arbeitsspeicher zurücksetzt. Ein `state = []`
löscht nichts auf der Platte.

**c) Gibt es eine Merkliste „schon gespeichert"?** Viele Projekte führen eine Menge von
Schlüsseln, die bereits geschrieben wurden, um doppelte Schreibvorgänge zu sparen.
Überlebt diese Liste den Start eines neuen Spiels, dann schreibt das neue Spiel seine
Daten **gar nicht** — und der Leser bekommt weiterhin die alten. Das ist die perfideste
Variante, weil nichts abstürzt und nichts leer ist.

**d) Gibt es einen Split zwischen „leichten" und „schweren" Feldern?** Wenn Übersichten
getrennt von Details gespeichert werden, kann eine Hälfte aus dem alten Spiel kommen und
die andere aus dem neuen. Prüfe, ob ein Nachlade-Pfad fehlende leichte Felder aus dem
Arbeitsspeicher ergänzt — dann entsteht ein Zwitter: aktuelle Tabelle über fremden
Ergebnissen.

**e) Der Auto-Save.** Prüfe, ob er schreiben kann, während im Vordergrund ein **anderer**
Spielstand geladen ist. Ein Auto-Save, der im Hintergrund weiterläuft, während der Nutzer
etwas anderes geöffnet hat, überschreibt fremde Daten.

Zwei Anforderungen gelten dabei **gleichzeitig**, und die zweite wird gern vergessen:
der Auto-Save darf nie den Stand eines anderen Spiels zerstören — **und** er muss für den
Stand, der gerade gespielt wird, immer laufen. Ein Riegel, der das Schreiben unterbindet,
solange ein fremder Stand aktiv ist, klingt sicher, nimmt dem laufenden Spiel aber genau
den Schutz, für den es den Auto-Save gibt. Der Kernzweck darf nicht der Sauberkeit geopfert
werden. Der brauchbare Weg ist: jeden Wechsel des aktiven Spiels den alten Auto-Save löschen
lassen, und jeden Snapshot mit der Kennung seines Spiels stempeln.

**f) Was gar nicht gespeichert wird, kann auch nicht veralten.** Die eleganteste Antwort auf
diese ganze Fragenklasse ist, den Zwischenstand nicht zu persistieren, sondern ihn aus dem
Spielzustand plus einem festen Seed **abzuleiten**. Prüfe, ob es in diesem Projekt Daten
gibt, die mitgeschrieben werden, obwohl sie reproduzierbar wären. Bei uns hängt eine ganze
Parallelwelt am Rundenzähler der Hauptserie und wird bei jedem Zugriff neu berechnet: Wird
eine Runde zurückgerollt, rollt sie automatisch mit — es gibt schlicht nichts zu löschen und
nichts, was auseinanderlaufen könnte. Das ist kein Trick, sondern erspart eine ganze Klasse
von Fehlern.

Zeig mir zu jedem Punkt die Fundstelle. Erst danach reden wir über Änderungen.

## 2. Wenn ein behobener Fehler zurückkommt

Diese Regel in die CLAUDE.md aufnehmen:

---
### Ein „behobener" Fehler, der wiederkommt, ist meist alter Datenbestand

Meldet der Nutzer, ein bereits behobener Fehler sei zurück — besonders in einem **neu
angelegten** Spielstand —, dann **zuerst die Daten prüfen, nicht die Logik.**

Der Reflex, den Code erneut zu lesen, ist fast immer falsch. Häufiger ist: der Speicher
enthält noch Datensätze aus einem früheren Durchlauf, und die Anzeige serviert sie
weiterhin. Der Fix greift, er kommt nur nicht zum Zug.

**Wie man das in Minuten statt in Tagen feststellt:** Tragen die erzeugten Kennungen einen
Zeitstempel (viele Generatoren bauen `Date.now()` ein), dann verrät ein Blick auf die
Kennungen eines Datensatzes, **welcher Durchlauf ihn geschrieben hat**. Liegen in einem
Spielstand mehrere Zeitstempel-Generationen nebeneinander, ist die Sache entschieden,
bevor man eine einzige Zeile Logik gelesen hat.

**Nie ohne Beleg entwarnen.** „Sollte jetzt gehen" ist keine Aussage. Entweder man kann
zeigen, aus welchem Durchlauf ein Datensatz stammt, oder man weiß es nicht.

**Alte Spielstände heilt ein Quell-Fix nicht.** Wer an der Quelle repariert, repariert
neue Daten. Für bestehende Stände braucht es entweder eine Auflösung bei der Anzeige oder
die klare Ansage an den Nutzer, dass dieser Stand betroffen bleibt.
---

## Was uns das gekostet hat

Über eine Woche Fehlersuche an der falschen Stelle, bis die Sitzung entnervt abgebrochen
wurde. Der Nutzer legte extra einen **neuen** Spielstand an und die Fehler waren immer
noch da — was jeden Verdacht auf die Logik lenkte. Tatsächlich war der dauerhafte Speicher
nie geleert worden: Eine Merkliste „schon gespeichert" überlebte den Neustart, das neue
Spiel schrieb seine Jahre deshalb gar nicht erst, und ein Nachlade-Pfad ergänzte die
fehlenden Übersichtsdaten aus dem Arbeitsspeicher. Ergebnis: die Tabelle des neuen Spiels
über den Ergebnissen des alten.

Am Ende standen in **einem** Spielstand Daten aus **drei** verschiedenen Durchläufen. Zu
sehen war das an den Zeitstempeln in den Kennungen — drei Generationen, sauber getrennt
nach Zeitspannen. Diese eine Abfrage hätte die Woche gespart.

Die dauerhafte Lösung war zweiteilig, und beide Teile werden gebraucht:

1. **Beim Start eines neuen Spiels wirklich leeren** — an *allen* Einstiegspunkten, und
   auch die Merklisten im Arbeitsspeicher zurücksetzen, nicht nur die Stores.
2. **Jeder Datensatz bekommt beim Schreiben die Kennung seines Spielstands**, und beim
   Lesen wird danach gefiltert. Damit kann selbst ein übersehener Rest nicht mehr in einen
   fremden Spielstand durchschlagen. Der Gürtel allein genügt nicht, es braucht auch die
   Hosenträger.

## Ein Nachtrag zum Prüfen selbst

Beim Nachmessen dieser Punkte im eigenen Projekt sind uns an einem Tag drei Fehlmessungen
unterlaufen, alle derselben Sorte — sie meldeten **Entwarnung**, wo keine war, oder einen
Fehler, wo keiner war:

- **Eine Funktion nachbauen statt aufrufen.** Wir haben eine Löschung von Hand nachgestellt
  statt die echte Funktion zu rufen — und dabei genau den Schritt übersprungen, um den es
  ging. Ergebnis war ein Fehlalarm über einen Store, der in Wahrheit sauber geräumt wurde.
  **Immer die echte Funktion aufrufen, auch wenn der Aufbau umständlicher ist.**
- **Eine Funktion isoliert lesen.** Wir sahen, dass eine Löschfunktion nur einen von zwei
  Speichern räumt, und meldeten einen Fehler. Den Rest erledigte der **Aufrufer**. Wenn
  Aufräumarbeit auf mehrere Ebenen verteilt ist, genügt es nicht, die unterste zu lesen.
- **Eine Prüfung, die gegen das Falsche lief.** Ein Testlauf sollte gegen einen alten Stand
  prüfen, landete durch eine Pfad-Umwandlung aber auf dem aktuellen — und meldete alles grün.
  **Ein Testlauf, der gegen den falschen Stand grün ist, ist schlimmer als gar keiner.**
  Jede Prüfung muss einmal gegen einen Stand laufen, von dem man weiß, dass sie durchfallen
  MUSS. Tut sie es nicht, prüft sie nichts.
