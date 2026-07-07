# Physics Atlas (sophie_scicom)

An accessible database of physics learning content organized as a
**prerequisite graph** (a DAG — topics share prerequisites). Pick a learning
goal — ambitious like Cosmology or humbler like Special Relativity — and see
everything it stands on, in an order you can actually follow, with books,
video lectures and courses attached to every topic. Fully static, no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

- `?mode=explore` deep-links to the full-map explorer view.

## Commands

| Command | What |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run validate` | check `src/data/topics.json` (ids, prereq refs, cycles) |
| `npm run lint` | oxlint |

## Editing content

Everything lives in [`src/data/topics.json`](src/data/topics.json).
See **[docs/AUTHORING.md](docs/AUTHORING.md)** — then `npm run validate`.

## Structure

```
src/
├── data/          topics.json (the entire database) + types.ts
├── graph/         dag.ts (ancestors, curriculum ordering), levelColors.ts
└── components/    GraphView (Cytoscape), GoalView, ExplorerView, ContentList, Legend
scripts/           validate-topics.mjs
docs/              DESIGN-DECISIONS.md (all chosen + alternative pathways), AUTHORING.md
```

## Design decisions

All choices (stack, graph library, UI concept, authoring flow) and the
alternatives kept open as future pathways: **[docs/DESIGN-DECISIONS.md](docs/DESIGN-DECISIONS.md)**.
