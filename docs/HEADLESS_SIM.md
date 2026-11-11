# Spiellogik headless testen + Ligagrößen-Bänder

> Ausgelagert aus CLAUDE.md am 11.11.2026 (wörtlich).

## Spiellogik testen: headless in Node (ohne Browser)

Die Engine ist **DOM-frei** bis auf wenige `localStorage`/`document`-Zugriffe. Für alles, was nur
Spiellogik über viele Saisons prüft (Ligagrößen, Auf-/Abstiegsbilanzen, Balancierung), ist Node
der richtige Weg: **~0,5 s pro Saison**, kein Server, kein Playwright.

```bash
node tools/sim_headless.cjs drift  60 4            # alle Ligen gegen ihr min/max-Band
node tools/sim_headless.cjs trend  120 3 6-6       # wächst die Liga oder pendelt sie?
node tools/sim_headless.cjs bands  60 4 6-6 7-8    # Größenverteilung + Band-Varianten
```

Eigene Analyse aufsetzen – die Shims sind das ganze Geheimnis:
```js
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16:s=>s, decompressFromUTF16:s=>s };
['game_data.js','app/history_data.js','game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
Engine.init();
for (…) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
```
> `const` → `var` ist nötig, sonst erzeugt `eval` im globalen Scope keine globalen Bindings.

**Grenze:** Sobald `App.*`, Layout oder Mobilansicht im Spiel sind, reicht das nicht – dann die
**run-Skill** (Playwright) benutzen, und zwar gegen **`template.html`**. `index.html` ist der von
`manage-v` gebaute Monolith und enthält Modul-Änderungen erst nach dem nächsten Build.

## Ligagrößen-Bänder ändern (Reihenfolge einhalten)
1. `trend` über **≥100 Saisons** – eine breite Verteilung kann bloß die Einlaufphase sein (Liga
   springt einmalig vom Startwert auf ihr Niveau). Steht dort „WÄCHST WEITER", ist ein breiteres
   Band nur eine Vertagung; dann Ursache suchen, nicht die Zahl anheben.
2. Erst bei „stabil, pendelt" die Verteilung aus `bands` als Grundlage nehmen – **Modus, nicht Ø**.
3. `min` ist der SCHRUMPF-Schutz (cancelt Abstiege). Ihn anzuheben *drückt die Liga aktiv nach
   oben*, statt sie nur zu deckeln – im Zweifel niedrig lassen und nur `max`/`target` bewegen.
4. Nachher `drift` gegenrechnen. Die **Gesamtzahl** driftender Ligen schwankt stark je Zufallsseed
   – vergleichbar sind nur die Einzelliga-Werte.
