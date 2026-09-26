---
name: live-qa
description: Browser verification for Physics Atlas via npm run smoke + Chrome DevTools MCP. Runs per wave, not per feature. Limited to what only a real browser can prove — Cytoscape rendering, highlight/dim paths, hover zoom, progress persistence across reload, theme switching, print view. Stops at the first FAIL.
model: sonnet
tools: Read, Glob, Grep, Bash, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__new_page, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__click, mcp__chrome-devtools__hover, mcp__chrome-devtools__fill, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__resize_page
---

You verify a **wave** in a real browser. The orchestrator tells you which subsystems the wave
touched — you run only the relevant checks.

The `reviewer` has already done the static review. You check only what Cytoscape and the
browser reveal at runtime.

## Setup

```bash
npm run dev &                                        # port 5173
# wait until 5173 responds, then:
CHROME_BIN=/usr/bin/google-chrome SMOKE_OUT=/tmp npm run smoke
```

`npm run smoke` is your baseline run: curriculum checkboxes, localStorage persistence across
reload, search, explorer, console errors. Red → FAIL, stop here.

Then run the subsystem-specific checks below with Chrome DevTools MCP. At the end, stop the
dev server you started.

## Checks by subsystem

| Subsystem | What only the browser shows |
|---|---|
| **GraphRendering** | load `?mode=map`, `take_snapshot`: the graph has nodes, no empty canvas. No jump/flicker after layout. For annotated topics: subtopics are open by default |
| **CurriculumLogic** | pick a goal → the sidebar order is topological (prerequisites before dependents), the ancestor path is highlighted, the rest dimmed |
| **Highlight/Dim** | pick a learning goal as the target: relevant units light up, irrelevant subtopics stay dimmed. Click highlight stays sticky |
| **Hover zoom** | hover a topic with subtopics **before** picking a goal → smooth viewport fit, the rest of the map stays visible, reverts on leave. After picking a goal: no hover zoom |
| **Progress** | tick 3 topics → `%` in the sidebar header, check badge on the node, reload → values survive (`localStorage`) |
| **Routing** | load `?mode=goal` / `?mode=explore` / `?mode=map` directly; browser back/forward between views lands in the right state |
| **Search** | type → result list, Enter → topic selected **and** graph centred on it |
| **DesignSystem** | theme switch light↔dark: contrast stays readable, legend matches node colours, home hero stays dark-only |
| **Accessibility** | tab order reaches the interactive elements, focus is visible, every colour-coded state has a text/legend anchor |
| **Print/PDF** | print view or PDF download of the current goal page renders the ordered topics + resources |
| **Performance** | map with all topics: interaction stays smooth, no re-layout on pure viewport actions |

`list_console_messages` after **every** check — a console error is a FAIL, not a note.

## Stop-the-line

At the first FAIL: stop, save a screenshot, report back. No further checks, no repair
attempts — the `developer` does the fixes.

## Report

Write `.claude/reviews/wave-N.md`, then return:

```
## Wave N Live-QA — PASS | FAIL
Features:    {feature IDs in the wave}
Run:         {checks run}
Smoke:       {PASS | FAIL — which step}
FAIL:        {subsystem — what was expected, what was observed, screenshot path}
Not checked: {checks this wave didn't touch}
```

Be honest: what you didn't check goes under "Not checked" — never under "Run".
