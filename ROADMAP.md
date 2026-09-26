# Physics Atlas — Roadmap

> One block per feature. Status lifecycle: 🟡 Planned → ✅ Implemented (or
> ❌ Skipped). Inserted **newest first** directly below the marker. The planner and
> committer edit this file — no manual edits, otherwise the markers break.

<!-- ROADMAP-INSERT-HERE: planner inserts new entries directly below this line, newest first -->

## feature-14: Topic cleanup + subtopics visible by default + hover zoom in the explorer

**Status:** ✅ Implemented <!-- status-line: feature-14 -->
**Planned:** 2026-08-30T16:37:00Z
**Plan:** [.claude/plans/feature-14-topic-cleanup-default-subtopics-hover-zoom.md](.claude/plans/feature-14-topic-cleanup-default-subtopics-hover-zoom.md)
**Complexity:** high

### Key decisions (why it's planned this way)
- Real deletion instead of hiding for the 6 uncategorised topics — no new filter logic needed; search/home/legend/GraphView automatically reflect the shorter list. Deliberately accepted content regression: general-relativity/quantum-field-theory/black-holes-gravitational-waves/cosmology each get one step shorter.
- Default-open instead of collapse-by-default for annotated topics structurally removes the hover-zoom layout risk: the subtopic child nodes already exist in the graph on hover, so it's a pure viewport operation (`cy.animate({fit})`) instead of an `expandedIds` change + expensive re-layout.
- Hover zoom is deliberately not a fisheye/isolate lens (Cytoscape has no such primitive) — a pure viewport fit/revert, reusing exactly the existing `focus` pattern (search jump), gated on `large && !goalId`.
- Assumption: the four shortened curricula aren't a bug but were deliberately accepted by the user.

### Reused patterns
- `GraphView.tsx:456-469` (`focus` effect, `cy.animate({fit})`, `prefers-reduced-motion`) — hover zoom is a second, thematically identical call instead of a new mechanism.
- `MapView.tsx:60-77` (`autoAddedRef`) — the default-expand floor doesn't clash with the existing goal auto-expand, because `goalPathFor().expand` is always a subset of the now default-open annotated topics.
- `GraphView.tsx:374` (350 ms double-tap window) — same timing convention for the hover-zoom dwell.

**Implemented:** 2026-08-30T16:45:51Z

### Implemented
- `src/data/topics.json` — 6 topics removed (lagrangian-mechanics, optics, standard-model, quantum-gravity-frontiers, stellar-astrophysics, galaxies-large-scale-structure), 5 dangling prerequisite refs cleaned up (quantum-mechanics, general-relativity, quantum-field-theory, black-holes-gravitational-waves, cosmology)
- `src/components/MapView.tsx:41` — `expandedIds` default: the lazy initializer changes the default from `Set()` to all topics with subtopics
- `src/components/GraphView.tsx` — hover-zoom mechanism (350 ms dwell → `cy.animate({fit})`, 150–200 ms exit → viewport revert); only when `large && !goalId`; timings reused from the `focus` effect
- `docs/AUTHORING.md` — example topics corrected (lagrangian-mechanics removed), new field-table row for `subtopics` (optional, default-open when present)
- `docs/DESIGN-DECISIONS.md` — reference sentence added to Decision 10 (topics now deleted), new Decision 11 (real deletion instead of hiding, default-open, hover zoom as a pure viewport operation)

### QA outcome
**QA:** Review/QA agent step skipped on explicit user instruction. Developer hard gate PASS: `npm run validate` (35 topics, 0 errors), `npx tsc -b`, `npm run lint`, `npm run build` — all clean at iteration 1/3. No independent QA/code/design review performed.

<!-- impl-marker: feature-14 -->

## feature-13: Category colours + goal highlighting in the explorer

**Status:** ✅ Implemented <!-- status-line: feature-13 -->
**Planned:** 2026-08-30T14:36:10Z
**Plan:** [.claude/plans/feature-13-category-colors-goal-highlight.md](.claude/plans/feature-13-category-colors-goal-highlight.md)
**Complexity:** high

### Key decisions (why it's planned this way)
- `level` is **replaced** by `category` (field/method/math-concept), not supplemented — two parallel classifications are a source of errors for a non-dev author, and the dagre BT layout already shows the "height". Palette measured rather than guessed: `#199e70`/`#e2574c`/`#3987e5` plus neutral `#7a86a0` (= existing `--muted`), contrast ≥3.0 on both surfaces, worst CVD pair ΔE 14.4 (existing palette: 13.4).
- `category` is **optional**, not required: Sophie classifies 34 of the 40 topics, 6 are deliberately left empty and render neutral grey ("Not yet categorized" as a fourth legend entry). A required field would force invented assignments and devalue the colour coding; the validator checks the value only *if* set. `'uncategorized'` exists only as a render fallback (`categoryOf()`), never as a value in topics.json.
- The goal path needs **cross-topic unit edges** in GraphView: today edges are drawn only at topic level, so highlighted areas like `metric`/`la-tensors` would stand as unconnected islands. That is the real architectural change of this feature.
- Pilot content is authored **inline in topics.json** instead of as `content/goals/*.md`: the Markdown compiler creates a new unit for each prerequisite bullet, which (a) collides with hand-written subtopics of the same ID and (b) doesn't allow coarse topic refs. `fluid-dynamics`/`special-relativity` are therefore deliberately left unannotated — annotating them would shrink existing curricula (Cosmology, Black Holes) down to placeholder learning goals.
- The mapping comes from Sophie and is binding — including the surprising assignments (electromagnetism, thermodynamics, classical mechanics as `method`): she separates "tools you master" from "phenomena you study". Don't adjust it during implementation.

### Reused patterns
- `GraphView.tsx:386-395` (`highlightIds`/`dimmed`/`onpath`) — works purely on node IDs, which for expanded topics match the `UnitId`s from dag.ts exactly; no new highlight system is needed, just a better-computed set.
- `dag.ts:300-371` (`expandedCurriculumFor`) — the new `goalPathFor()` is a thin adapter over it instead of a second traversal, so map and curriculum never drift apart.
- `GraphView.tsx:279-299` + `MapView.tsx:40-48` (`expandedIds`/⊕ toggle) — auto-expand feeds the same state, with `autoAddedRef` so manual toggles aren't fought.
- `GraphView.tsx:42-47` + `App.css:684` (gold vocabulary `sel-post`/`.ink-post`) — gold already means "goal" in this project; the goal marker inherits the hex values instead of introducing new ones.
- `GraphView.tsx:371` (`✓` label badge) — the same place provides the `★` badge, so gold doesn't carry meaning alone.

**Implemented:** 2026-08-30T16:00:00Z
**QA report:** Developer hard gate (QA agents skipped)

### Implemented
- `src/data/types.ts` — `TopicLevel` → `TopicCategory` (field/method/math-concept, optional)
- `src/graph/categoryColors.ts` (rename) — 4-entry palette (field green, method red, math-concept blue, uncategorized neutral)
- `src/data/topics.json` — 34 topics get `category`, 6 stay without; new topic `relativistic-hydro` + subtopic `metric/curvilinear-coords`
- `scripts/validate-topics.mjs` — `category` value check (not required)
- `src/graph/dag.ts` — new function `goalPathFor()` (unit closure + highlight set + auto-expand set)
- `src/components/GraphView.tsx` — gold class `goal-node`, cross-topic unit edges, label badges for subtopics
- `src/components/MapView.tsx` — goal bar with CTA, auto-expand, `goalPick` state
- `src/App.css` — `--gold`/`--silver` theme tokens, `.goal-bar` glass panel, `.level-dot` → `.cat-dot`
- `docs/AUTHORING.md` — schema docs (category instead of level)
- `docs/DESIGN-DECISIONS.md` — Decision 10 (colour = category)
- Component updates: Legend, GoalView, TopicPage, SearchBox, Home, TopicPrintSheet

### QA outcome
**QA:** Review/QA agent step skipped on explicit user instruction. Developer hard gate PASS: `npm run validate` (41 topics, 54 subtopics, 35 subgoals, 0 errors), `npx tsc -b`, `npm run lint`, `npm run build` — all clean at iteration 1/3. No independent QA/code/design review performed.

<!-- impl-marker: feature-13 -->
