---
name: run
description: Launch the Bundesliga Fußballsimulation app in a headless Chromium browser via Playwright, take screenshots, inspect localStorage (ba_save_v66), and check for JS errors. Requires a local HTTP server (npx serve . --listen 3333).
---

# run skill — Bundesliga Fußballsimulation

Launches a Playwright REPL driver against the local dev server.

## Quick start

```bash
# 1. Start server (if not already running)
python -m http.server 3334 &

# 2. Run a session
printf "launch\nss start\nerrors\nquit\n" | node .claude/skills/run/driver.mjs 2>&1
```

## Commands

| Command | Description |
|---|---|
| `launch [port]` | Auto-detect server on 3333/3000/5000/8080, open app |
| `ss [name]` | Screenshot viewport → `%LOCALAPPDATA%\Temp\bundesliga-shots\` |
| `ss-full [name]` | Full-page screenshot |
| `ss-el <css>` | Screenshot single element |
| `click <css>` | Click element by CSS selector |
| `click-text <text>` | Click button/tab containing text |
| `nav [path]` | Navigate to URL or path |
| `wait <css>` | Wait for selector (10s timeout) |
| `eval <js>` | Evaluate JS in page, print JSON result |
| `text [css]` | Print innerText (first 3000 chars) |
| `errors` | Show captured JS console errors |
| `save-dump [name]` | Dump Engine state / ba_save_v66 to JSON |
| `ls-storage` | List all localStorage keys + sizes |
| `reload` | Reload page |
| `quit` | Close browser |

## App-specific details

- **localStorage save key:** `ba_save_v66`
- **Global state object:** `Engine` (currentSeason, currentMatchday, currentSeasonOffset, …)
- **Theme key:** `theme` (light/dark)
- **Last league key:** `ba_lastLeague`
- **Screenshot dir:** `C:\Users\lyric\AppData\Local\Temp\bundesliga-shots\`
