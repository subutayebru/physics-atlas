# Design Decisions — Sophie SciCom (Physics Prerequisite Graph)

> Decision log, 2026-07-02. Every option is preserved here as a possible future
> pathway — the "Chosen" marks the current path, not a closed door. When we
> divert, add a dated note under the relevant section instead of deleting.

## Vision

An accessible database of physics learning content organized as a
**prerequisite DAG** (directed acyclic graph — not a tree: topics like
calculus and mechanics feed many paths). A final learning goal (e.g.
cosmology) sits at the top and connects down through prerequisites to
fundamentals. Content (books, YouTube lectures, courses) is attached to each
topic. A student picks a goal — ambitious (cosmology) or humble (special
relativity) — and gets a generated curriculum. **v1 is fully static: no backend.**

---

## Decision 1 — Stack

| Option | Status | Notes |
|---|---|---|
| **React + TypeScript + Vite** | ✅ Chosen | Typed schema, easy growth into curriculum/progress features, matches web-dev-agent template defaults. Deploys as pure static files. |
| Vanilla JS + Vite | ↩ pathway | Lighter; revisit if the app should become an embeddable widget. |
| Svelte + Vite | ↩ pathway | Leaner output; revisit if bundle size ever matters a lot. |

## Decision 2 — Graph visualization

| Option | Status | Notes |
|---|---|---|
| **Cytoscape.js + dagre layout** | ✅ Chosen | DAG layouts, pan/zoom, events, subgraph highlighting out of the box. |
| D3.js custom | ↩ pathway | Total visual freedom (animated path reveal, custom node cards) at ~2–3× effort. Revisit for a "wow" redesign. |
| React Flow (+ dagre/elk) | ↩ pathway | Rich React-component nodes (inline book/video badges). Revisit if node cards need to be much richer than Cytoscape styling allows. |

## Decision 3 — UI concept

| Option | Status | Notes |
|---|---|---|
| **Home → Map → Goal** (updated 2026-07-03) | ✅ Current | Landing = cosmic hero (animated spiral galaxies, `Galaxy.tsx`) with hero search + featured-goal chips + "Explore the full map". **Full map** = whole DAG, roomier layout (`large` GraphView variant), floating glass detail card — deliberately *no resources* there; "Build curriculum →" jumps into goal mode. **Learning goal** = curriculum + resources, unchanged. URL: `/`, `?mode=map` (alias `explore`), `?mode=goal`. |
| Goal-first as landing | ↩ superseded | The v1 landing (goal picker straight away). Still one click away via header tabs. |
| Curriculum-list-first | ↩ pathway | Linear syllabus view, graph secondary. Elements of it live inside goal mode (the ordered curriculum sidebar); could be promoted to its own view later. |

## Decision 4 — Content authoring

| Option | Status | Notes |
|---|---|---|
| **One JSON file + validator** | ✅ Chosen | `src/data/topics.json`, schema documented in `docs/AUTHORING.md`, `npm run validate` catches broken prereq refs, cycles, duplicate ids. |
| Markdown file per topic | ↩ pathway | Revisit when topics need long-form notes; compile step .md → JSON. |
| In-browser editor | ↩ pathway | Revisit when Sophie authors regularly and git editing becomes friction; admin view exports JSON. |

## Decision 5 — Visual identity (updated 2026-07-02)

**Cosmic dark theme** (user request, ref: dreiraum.studio feel — flowing,
premium, constant subtle motion):
- Deep-space ground `#070b14`, glass panels (`backdrop-filter` blur), Sora
  display face + system body, gradient title.
- Background: canvas starfield (drift + twinkle, `Starfield.tsx`) + three
  CSS nebula blobs (60–95s drift cycles). All motion respects
  `prefers-reduced-motion`.
- Node palette re-validated for the dark surface (`#0d1220`, dataviz
  six-checks, worst adjacent CVD ΔE 13.4): foundation `#199e70`, core
  `#3987e5`, advanced `#d55181` (violet failed protan vs blue — magenta
  chosen instead), goal `#d95926`. Light-theme palette preserved in git
  history (pre-redesign) as a pathway.

## Decision 6 — Deployment (default, not yet executed)

GitHub Pages (or Netlify drop) — the build is static. Note: this folder
currently lives inside the larger `dev-bru` git repo; before deploying, give
`sophie_scicom` its own repository.

## Multi-agent workflow (web-dev-agent-system)

**Installed 2026-07-02** (Setup B from `../web-dev-agent-system-main`):
`.claude/` agents, `.mcp.json` (Chrome DevTools MCP), `scripts/preflight.sh` +
`init-template.sh`, `start-dev-session.command`, `BACKLOG.md`, `ROADMAP.md`.
`CLAUDE.md` carries the real stack commands (npm, port 5173) and architecture.
Preflight: ✅ (gh CLI missing → `github: disabled` until the repo split).

Remaining manual step: create `.claude/settings.local.json` from
`.claude/settings.local.json.example` (replace `{{PROJECT_ROOT_ABS}}` with
`/Users/de01sav095/dev-bru/sophie_scicom`) — it grants the agent session its
Bash/Write permissions, so it must be created by the user, then restart
Claude Code so `.mcp.json` loads. Start a session with
`bash start-dev-session.command`.

## Roadmap hooks (later)

- Progress tracking (localStorage checkmarks per topic → curriculum shows % done)
- More domains (quantum computing, particle physics, astro instrumentation)
- Difficulty/effort estimates per topic; multiple curricula presets
- Search + filter by content type (book / video / course / paper)
