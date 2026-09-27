# Physics Atlas — Roadmap

> One block per feature. Status lifecycle: 🟡 Planned → ✅ Implemented (or
> ❌ Skipped). Inserted **newest first** directly below the marker. The planner and
> committer edit this file — no manual edits, otherwise the markers break.

<!-- ROADMAP-INSERT-HERE: planner inserts new entries directly below this line, newest first -->

## feature-17: Concept learning flow — goal path over strict prerequisites, progress, concept search

**Status:** ✅ Implemented <!-- status-line: feature-17 -->
**Planned:** 2026-09-27T11:35:35Z
**Plan:** [.claude/plans/feature-17-concept-learning-flow.md](.claude/plans/feature-17-concept-learning-flow.md)
**Complexity:** high

### Key decisions (why it's planned this way)
- Paths are computed over `strict prerequisite for` edges only (named constant `CURRICULUM_EDGE_TYPES`); resources join via `helps understand`; every other relation is context. Widening that set is a pedagogy call for Sophie.
- Goal flow lives inside the concept map (goal bar + ordered step panel), not in a new view mode, and the topic views (`GoalView`, `TopicPage`, print, category colours) are deliberately left alone until feature-18.
- Assumption: namespacing concept progress as `concept:<id>` in the existing localStorage store is preferable to a second store.

### Reused patterns
- `src/graph/dag.ts:252,265` (`dfsClosure`, `kahnOrder`) — exported and reused, so concept and topic curricula order by the same rule.
- `src/components/MapView.tsx:121-134` + `src/App.css:522` (`.goal-bar`) and `GraphView.tsx:91-102,529` (`goal-node`) — goal marking and goal bar without new UI primitives.
- `src/components/SearchBox.tsx:28-42` — generalized to caller-supplied entries instead of a second search component.

**Implemented:** 2026-09-27T20:08:20Z

### Implemented
- `src/graph/dag.ts` — `dfsClosure` and `kahnOrder` exported (no logic change; allows concept curriculum to order by the same rule)
- `src/graph/concepts.ts` — `CURRICULUM_EDGE_TYPES` (strict prerequisite for only), `conceptPathFor(goalId, index)` for ordered paths and resources
- `src/components/ConceptMapView.tsx` — goal selection, goal bar ("★ Goal: N steps"), ordered step panel with progress checkboxes and resources per step
- `src/components/SearchBox.tsx` — generalized to accept prebuilt entries; topic search unchanged
- `src/components/GraphView.tsx` — `.goal-node` opacity/text-opacity addition (advisory: verify visually at live-qa)
- `src/App.tsx` — `conceptGoal` state, `?mode=concepts&goal=<id>` URL sync, concept-aware header search
- `src/App.css` — goal bar and step panel styles
- `docs/AUTHORING.md` — "How the concept curriculum is built" paragraph
- `scripts/smoke-test.mjs` — goal-path step

### Review
**PASS** — validate/build/lint clean. [.claude/reviews/feature-17.md](.claude/reviews/feature-17.md)
Advisory: GraphView.tsx:132-133 opacity fix reasoned safe from sizing model but not confirmed live — spot-check at wave-close live-qa.

<!-- impl-marker: feature-17 -->

## feature-16: Concept map view — type colours, generality-sized nodes, sentence edges, zoom-linked fade

**Status:** ✅ Implemented <!-- status-line: feature-16 -->
**Planned:** 2026-09-27T11:35:35Z
**Plan:** [.claude/plans/feature-16-concept-map-rendering.md](.claude/plans/feature-16-concept-map-rendering.md)
**Complexity:** high

### Key decisions (why it's planned this way)
- New mode `?mode=concepts` next to the existing full map, rendered by the same `GraphView` (second input variant, topic element builder extracted unchanged) — GraphView stays the only Cytoscape file.
- dagre BT over all edges (existing `layoutFor`) keeps every strict-prerequisite edge pointing upward; `cose` is a recorded pathway. Selection/hover are 1-hop for concepts, because transitive closure over mixed relation types is meaningless.
- Size = generality through one `nodeRadius()` fallback rule (learning goals always minimal; otherwise the preview's degree heuristic until Sophie authors values). Zoom fade is on-screen-radius-driven, so it follows generality automatically.
- Assumption: the seed's ColorBrewer placeholder hues are adjusted to reach ≥3:1 on both surfaces; 12 hues can't be CVD-safe pairwise, so text labels, legend and the type named in the card carry the meaning.

### Reused patterns
- `src/components/GraphView.tsx:240-247` (`layoutFor`) — no second layout engine.
- `src/components/GraphView.tsx:517-528` (`highlightIds`/`dimmed`) — concept selection feeds a neighbour set instead of new classes.
- `src/components/GraphView.tsx:537-550` (`focus`, `cy.animate({fit})`) — index and relation clicks glide to the node.
- `src/graph/categoryColors.ts:3-17` — measured-palette module format for `typeColors.ts`.

**Implemented:** 2026-09-27T19:56:24Z

### Implemented
- `src/graph/typeColors.ts` — new, validated 12-type colour palette (WCAG contrast ≥3:1)
- `src/graph/concepts.ts` — added `effectiveGenerality()`, `nodeRadius()`, `neighbourIds()`
- `src/components/GraphView.tsx` — second input variant (concepts), concept element builder, concept node/edge styles, 1-hop hover, zoom-linked fade, edge sentence on hover
- `src/components/ConceptMapView.tsx` — new view (graph pane + glass detail card + legend + browse-by-type index)
- `src/components/Legend.tsx` — `variant` prop for type legend rendering
- `src/App.tsx` — `Mode` += `'concepts'`, URL sync, header tab
- `src/App.css` — concept card blocks, `.type-dot`, type-by-type index
- `scripts/smoke-test.mjs` — concept-mode step (node count, edge count, card text assertions)
- `docs/AUTHORING.md` + `docs/DESIGN-DECISIONS.md` — Decision 13 (type colours, generality-sized nodes, zoom fade)

### Review
**PASS** — validate/build/lint clean. [.claude/reviews/feature-16.md](.claude/reviews/feature-16.md)

<!-- impl-marker: feature-16 -->

## feature-15: Concept graph schema foundation (typed nodes + sentence edges, data + validator + docs, no rendering)

**Status:** ✅ Implemented <!-- status-line: feature-15 -->
**Planned:** 2026-09-27T11:35:35Z
**Plan:** [.claude/plans/feature-15-concept-schema-foundation.md](.claude/plans/feature-15-concept-schema-foundation.md)
**Complexity:** medium

### Key decisions (why it's planned this way)
- Coexist, don't replace: `src/data/concepts.json` becomes a second dataset next to `topics.json`. The two are different granularities (course-level topics vs. typed concepts); replacing would delete every curriculum, and converting would mean agents invent type/generality assignments. Retirement is feature-18, blocked on Sophie.
- The 12 node types and the 17 sentence templates live in `src/data/conceptVocabulary.json`, read by both `types.ts` (literal key types) and the validator, so there's no mirrored table to drift. Only authored fields are stored; degree, radius, colour and sentences are derived.
- The brief's data-quality issues are flagged, not resolved: an optional `review` field on e7/e35/e39/e40/e57 plus automatic validator warnings (casing variants, orphans, example.com links). Assumption: `generality` is an optional integer 1–5, and no values are invented.

### Reused patterns
- `scripts/validate-topics.mjs:262-285` (`findCycle`) — extracted to `scripts/lib/find-cycle.mjs`, used by both validators.
- `src/data/loadGraph.ts:1,29` — same typed JSON-loader shape for `loadConcepts.ts`.
- `scripts/validate-topics.mjs:104-108` + `src/graph/categoryColors.ts:33-36` — the "optional field, validated if present, one fallback function" pattern applied to `generality`.

**Implemented:** 2026-09-27T19:40:05Z

### Implemented
- `src/data/concepts.json` — new, migrated concept graph (54 nodes, 59 edges, authored fields only)
- `src/data/conceptVocabulary.json` — new, 12 node types and 17 edge sentence templates
- `src/data/types.ts` — appended `NodeType`, `EdgeType`, `GraphNode`, `GraphEdge`, `ConceptGraph` types
- `src/data/loadConcepts.ts` — new, typed export of the concept graph
- `src/graph/concepts.ts` — new, normalization and indexing functions
- `scripts/validate-concepts.mjs` — new, concept graph validator chained into `npm run validate`
- `scripts/lib/find-cycle.mjs` — new, `findCycle` extracted as shared module
- `docs/AUTHORING.md` — new section "Concept graph (pilot)" with schema and editing guidelines
- `docs/DESIGN-DECISIONS.md` — Decision 12, rationale for coexistence with `topics.json`

### Review
**PASS** — validate/build/lint clean. [.claude/reviews/feature-15.md](.claude/reviews/feature-15.md)

<!-- impl-marker: feature-15 -->

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
