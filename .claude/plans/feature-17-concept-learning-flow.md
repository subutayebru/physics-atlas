---
feature-id: 17
title: Concept learning flow — goal path over strict prerequisites, progress, concept search
estimated-complexity: high
data-impact: none
---

## Context

Third stage (requires feature-15 schema/logic and feature-16 `?mode=concepts` rendering).
Brings the app's core learning flow — pick a goal, get an ordered path, tick things off — to
the concept graph, so the typed dataset isn't just a picture. Sophie's 11 `learning_goal`
nodes become pickable goals; the path is computed over `strict prerequisite for` edges only,
resources attach via `helps understand`, other relations stay as context.

This stage deliberately does **not** retire `Topic`/`Subtopic`, `GoalView`, `TopicPage`,
`TopicPrintSheet`, or the category colours: `topics.json` still carries every existing
curriculum, and replacing it needs Sophie's mapping decision (feature-18, blocked). After this
stage, both datasets are fully usable end to end and nothing is half-migrated *within* either
one.

## Critical Files

- `src/graph/dag.ts` — export `dfsClosure` (252) and `kahnOrder` (265), no logic change
- `src/graph/concepts.ts` — `CURRICULUM_EDGE_TYPES`, `conceptPathFor(goalId, index)`
- `src/components/ConceptMapView.tsx` — goal pick, goal bar, ordered step panel, progress
  checkboxes, resources per step
- `src/components/SearchBox.tsx` — accept prebuilt `entries` (generic), topic behaviour
  unchanged
- `src/App.tsx` — `conceptGoal` state + `?mode=concepts&goal=<id>`, concept-aware header search
- `src/lib/useProgress.ts` — no change to storage; concept keys are namespaced by the caller
- `docs/AUTHORING.md` — "How the concept curriculum is built" paragraph
- `scripts/smoke-test.mjs` — goal-path step

## Reused Patterns

- `dag.ts:252-262` (`dfsClosure`) and `dag.ts:264-289` (`kahnOrder`, ties by longest-path depth
  then id) — exported and reused for the concept path so concept and topic curricula order by
  the exact same rule; no second topological sort.
- `dag.ts:382-403` (`goalPathFor` → `{units, highlight}`) — `conceptPathFor` returns the same
  shape idea (`order`, `highlight`, `resourcesByStep`) so ConceptMapView feeds GraphView the
  same way MapView does.
- `GraphView.tsx:91-102,529` (`goal-node` gold class via `goalId`) and `GraphView.tsx:502-504`
  (★/✓ label badges, made data-driven in feature-16) — goal marking and progress badges on
  concept nodes with zero new GraphView code.
- `GraphView.tsx:519-528` (`highlightIds` → `dimmed`/`onpath`) — path highlight.
- `MapView.tsx:121-134` + `App.css:522-586` (`.goal-bar`, "Open curriculum"/"Clear") — the
  concept goal bar reuses the markup and styles.
- `MapView.tsx:259-272` (`.learned-toggle` checkbox) + `useProgress.ts:36-58` (`toggle`,
  `setMany`) — progress for concepts, keys prefixed `concept:` so they can never collide with
  topic/unit keys in the shared `physics-atlas-progress-v1` store (`useProgress.ts:3`).
- `SearchBox.tsx:28-42` (entry list) / `:109` (colour dot) — generalized to take `entries`
  from the caller; the topic list builder moves into a helper used by the existing call sites.
- `GraphView.tsx:537-550` (`focus`) — clicking a step centres the node.
- `App.tsx:36-42,72-102` (`initialGoal` validation + URL sync + popstate) — same pattern for
  `?mode=concepts&goal=`.

## Implementation Steps

1. **`dag.ts`** — `export` on `dfsClosure` and `kahnOrder`. Topic outputs unchanged.
2. **`concepts.ts`** — `export const CURRICULUM_EDGE_TYPES: EdgeType[] = ['strict
   prerequisite for']`. `conceptPathFor(goalId, index)`: prereqsOf(id) = sources of incoming
   edges whose normalized type ∈ `CURRICULUM_EDGE_TYPES`; `closure = dfsClosure(goalId,
   prereqsOf)`; `order = kahnOrder(Map(closure → prereqs ∩ closure))`; `resourcesByStep` =
   for each step, sources of incoming `helps understand` edges whose node type is `resource`;
   `highlight` = closure ∪ all those resources. Pure function, no React.
3. **`SearchBox.tsx`** — `SearchEntry` gets optional `color` and `context`; new optional prop
   `entries`; when absent, build from `topics` exactly as today (existing call sites
   `App.tsx:170`, `Home.tsx` untouched in behaviour). The dot uses `entry.color ??
   CATEGORY_COLORS[categoryOf(entry)]`.
4. **`App.tsx`** — `conceptGoal` state from `?goal=` when `mode=concepts` (validated against
   concept ids, otherwise `null` — no default goal); URL target `?mode=concepts` or
   `?mode=concepts&goal=<id>`; popstate restores it. In concepts mode the header SearchBox
   (hidden in feature-16) returns with concept entries (label, type label as context, type
   colour) and `onPick` = select + focus in the concept map.
5. **`ConceptMapView.tsx`** — props `goalId`, `onGoalChange`, `progress`. Card: "★ Show path
   to this" button for every node (learning goals first-class; any concept may be a goal, as
   any topic can be today). With a goal: `GraphView goalId={goalId} highlightIds=
   {path.highlight} directionalSelect={false} doneIds={concept ids with 'concept:' stripped}`;
   goal bar "★ Goal: {label} — N steps"; a step panel (ordered list, `<ol>`) where each step
   shows type dot + label + type label, a "Learned" checkbox (`progress.toggle('concept:' +
   id)`), its resources as links (label, mediaType, minutes), and a button that selects +
   focuses the node; progress "k of N learned" in the panel header. Goal with no prerequisites
   (orphans): panel shows the goal alone plus "No prerequisites are linked to this goal yet."
   — no inferred steps. Labels render exactly as authored (e.g. `exponentials` is lowercase in
   the data — not "fixed"). Selection without a goal keeps feature-16's 1-hop highlight.
6. **`docs/AUTHORING.md`** — in the concept section: "Only `strict prerequisite for` edges
   build a path; resources join a step via `helps understand`; all other relations are shown
   as context. If another relation (e.g. `depends on`) should pull concepts into paths, that's
   a one-line change — ask for it." Also note that the two orphan goals currently produce a
   one-step path.
7. **`scripts/smoke-test.mjs`** + gates.

## Verification

- `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build` clean.
- `?mode=concepts&goal=lg_pt_3` → gold ★ on `lg_pt_3`; step list exactly: Linear Algebra,
  Vector space, Differential Geometry, Tangent Space, Tangent vector, Parallel Transport,
  "Interpret geometrically the action of parallel transport on a vector." (7 steps); the 3 `res_pt_*` resources listed under the last step
  and not dimmed on the map; everything else dimmed (e.g. `curvature`, whose edge to
  `parallel_transport` is "is derived from", not a prerequisite).
- `?mode=concepts&goal=gravity_goal` → 6 steps: Linear Algebra, Newtonian Gravity, Vector
  space, Differential Geometry, Einstein Field Equations, "Understand why planets orbit the
  Sun" (depth-0 tie broken by id: `linear_algebra` < `newtonian_gravity`); `resource_mtw` under
  Einstein Field Equations.
- `?mode=concepts&goal=lg_alpha_decay_nucleons` → 1 step + "No prerequisites are linked…".
- `?mode=concepts&goal=does_not_exist` → no goal, map unfiltered, no console error.
- Tick "Learned" on Vector space → ✓ badge on the node, "1 of 7 learned", survives reload;
  `?mode=goal&goal=cosmology` progress unchanged (namespacing works).
- Header search in concepts mode: typing "transport" lists Parallel transport (+ learning goals
  containing it) with type context; picking centres and selects it. In `?mode=map` the search
  still lists topics/subtopics exactly as before; Home hero search unchanged.
- Browser back/forward walks between goals and modes.
- **a11y:** the step list is an `<ol>` with real checkboxes and visible labels; goal bar is
  `role="status" aria-live="polite"` like MapView's; ★ and ✓ are text badges, not colour only.
- None of the flagged edges (e7, e35, e39, e40, e55, e57) is a `strict prerequisite for`
  edge, so Sophie's pending decisions don't change any path — confirm by grepping the path
  output.
- Extend `npm run smoke`? **Yes** — `goto ?mode=concepts&goal=lg_pt_3`, assert 7 step rows and
  `window.__cy.$id('lg_pt_3').hasClass('goal-node')`; tick the first step and assert the
  `concept:linear_algebra` key in localStorage.

## Assumptions

- Datasets coexist (feature-15). `GoalView`/`TopicPage`/`TopicPrintSheet`/`Home` chips/
  category colours stay on `topics.json`; retiring them is feature-18 (blocked on Sophie).
- Only `strict prerequisite for` orders curricula. Treating e.g. `depends on` (reverse
  direction) as a prerequisite is a physics/pedagogy call for Sophie — kept as a named
  constant so widening it is trivial.
- No print/PDF for concept paths in this stage (`PrintSheet` is shaped around
  `CurriculumGroup`); pathway once the concept flow replaces the topic flow.
- No Home-page entry point for concepts yet — reachable via the header tab only, fitting a
  pilot.
- Progress keys `concept:<id>` in the existing store rather than a second storage key: one
  store, one reset, no migration.
