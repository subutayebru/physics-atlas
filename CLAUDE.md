# Physics Atlas (sophie_scicom) — Entwicklungsplan

> Single-Source-of-Truth für den Multi-Agent-Workflow (Web-Dev). Die Agents
> lesen dieses File bei jedem Run als Projekt-Kontext. Schlank halten.

## Projekt-Vision

Eine zugängliche Datenbank von Physik-Lerninhalten, organisiert als
**Prerequisite-DAG** (gerichteter azyklischer Graph — kein Baum: Calculus,
Mechanik etc. speisen viele Pfade). Ein Lernziel (z.B. Cosmology) sitzt oben
und verbindet sich über seine Voraussetzungen bis zu den Fundamentals. An
jedem Topic hängt Content (Bücher, YouTube-Lectures, Kurse). Sophie pflegt
die Inhalte; Lernende wählen ein Ziel — ehrgeizig (Cosmology) oder bescheiden
(Special Relativity) — und bekommen ein generiertes Curriculum.

**Typ:** Statische SPA — kein Backend (v1)
**Stack:** React 19 + TypeScript + Vite, Cytoscape.js + dagre für den Graphen
**Zielgruppe:** Selbstlerner:innen; Content-Autorin ist Sophie (non-dev)

Design-Entscheidungen + bewusst offen gehaltene Alternativen:
`docs/DESIGN-DECISIONS.md` (nicht löschen — alle Optionen bleiben als Pfade).

## Stack-Commands

| Command | Wert | Verwendung |
|---|---|---|
| Install | `npm install` | Dependencies |
| Build | `npm run build` | **Hard Gate** — tsc + vite build, muss clean durchlaufen |
| Typecheck | `npx tsc -b` | Typecheck-Gate |
| Lint | `npm run lint` | oxlint |
| Test | `npm run validate` | Daten-Gate: topics.json (ids, refs, Zyklen) — es gibt (noch) keine Unit-Tests |
| Dev-Server | `npm run dev` | Vite |
| Dev-URL | `http://localhost:5173` | Chrome-DevTools-Navigationsziel; `?mode=explore` für den Explorer-View |
| DB-Migrate | *(leer — kein Backend)* | |

## Architektur-Überblick

```
sophie_scicom/
├── src/
│   ├── data/         # topics.json (DIE Datenbank) + types.ts (Schema)
│   ├── graph/        # dag.ts (ancestors, topologische Curriculum-Ordnung), levelColors.ts
│   ├── components/   # GraphView (Cytoscape-Wrapper), GoalView, ExplorerView,
│   │                 # ContentList, Legend
│   ├── App.tsx       # Mode-Switch (goal | explore), liest ?mode= aus der URL
│   └── App.css       # alle Styles; Tokens als CSS-Variablen in :root
├── scripts/          # validate-topics.mjs (+ Template-Scripts)
└── docs/             # DESIGN-DECISIONS.md, AUTHORING.md
```

## Wichtige Patterns / Module

- **`src/data/topics.json`** — einzige Datenquelle. Schema-Regeln in
  `docs/AUTHORING.md`. Nach jeder Daten-Änderung `npm run validate`.
- **`src/graph/dag.ts`** — `ancestorsOf()` (transitive Prerequisites),
  `curriculumFor()` (topologisch sortiertes Curriculum),
  `expandedCurriculumFor()` (Unit-Granularität: Unit-Refs sind `topicId` oder
  `topicId/subId`, Subtopic-Auflösungsregeln gespiegelt im Validator).
  Graph-Logik gehört hierhin, nicht in Komponenten.
- **`src/graph/levelColors.ts`** — validierte Level-Palette (foundation
  `#1baf7a`, core `#2a78d6`, advanced `#4a3aa7`, goal `#eb6834`). Keine
  Magic-Hex-Werte in Komponenten; App-Chrome-Tokens in `App.css :root`.
- **`GraphView.tsx`** — einziger Ort mit Cytoscape-Kontakt. Selektion/
  Highlight via Klassen (`chosen`, `dimmed`, `onpath`) ohne Re-Layout.
- **Layout-Konvention:** dagre `rankDir: 'BT'` — Ziele oben, Fundamentals
  unten. Kanten zeigen von Prerequisite → abhängigem Topic.

## Subsysteme (für QA-/Live-QA-Heuristik)

- `GraphRendering` (Cytoscape, Layout, Highlighting)
- `CurriculumLogic` (dag.ts, Ordnung, Ancestors)
- `DataSchema` (topics.json, Validator)
- `Routing` (Mode-Switch, URL-Param)
- `DesignSystem` (Tokens, Palette, Legend)
- `Accessibility`
- `Performance`

## Konventionen

- TypeScript strict, 2-Space-Indent, keine neuen Dependencies ohne Plan.
- Default keine Kommentare; nur nicht-offensichtliche WHYs.
- Edit > Write: existierende Files modifizieren.
- a11y-First: semantisches HTML, sichtbare Labels (Node-Farben tragen nie
  allein Bedeutung — Legende + Ink-Labels sind Pflicht).
- Content-Änderungen (topics.json) brauchen `npm run validate` als Gate.
- Keine Design-Assets generieren — Assets liefert der User.

## Live-QA-Modus

Schalter: `live-qa: auto-per-wave`

## GitHub-Integration

Schalter: `github: disabled` · `close-policy: after-live-qa`
(Projekt hat noch kein eigenes GitHub-Repo — liegt im dev-bru-Monorepo.
Nach Repo-Split auf `enabled` stellen.)

## Bewusst nicht jetzt

- Kein Backend, keine Accounts, kein CMS — Datenpflege via topics.json + git.
- Keine native Mobile-App.
- Kein D3-/React-Flow-Rewrite (bewusste Pfade, siehe DESIGN-DECISIONS.md).
- Der `idea-generator` soll keine neuen Physik-*Inhalte* erfinden — Content
  kuratiert Sophie.

## Nächste größere Themen (Roadmap-Hooks)

- Progress-Tracking (localStorage-Checkmarks pro Topic, % im Curriculum)
- Default-Modus-Entscheidung (goal-first vs. explorer) nach User-Vergleich
- Deployment (eigenes Repo + GitHub Pages)
- Suche + Filter nach Content-Typ
