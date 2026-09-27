# Wave 1 Live-QA — feature-15, feature-16, feature-17

Verdict: PASS

## Scope

Multi-type concept graph migration (stages 1-3 of 4): `GraphRendering`
(concept-node/edge variant, zoom-linked fade, type-colour palette),
`CurriculumLogic` (`conceptPathFor`), `DataSchema` (`concepts.json` /
`conceptVocabulary.json`, `validate-concepts.mjs`), `Routing`
(`?mode=concepts`, `?mode=concepts&goal=<id>`), `DesignSystem` (12-type
palette, goal-bar/step-panel reuse), `Accessibility` (step list, browse-by-type
index, goal bar `aria-live`).

## Baseline

- `npm run dev` on :5173, `CHROME_BIN=/usr/bin/google-chrome SMOKE_OUT=/tmp npm run smoke`.
- Smoke exits non-zero, but the only two failing assertions are the pre-existing,
  already-logged-and-confirmed-unrelated issues (feature-19 "optional toggle did not
  reduce the curriculum" / feature-20 "expected 13 diff-geo learning goals, got 14" —
  topic-dataset counts). Everything else in the smoke log is green, including the new
  concept-flow assertions: `concept map: 54 nodes, 59 edges`, `concept card has "leads
  to Newtonian Gravity": true`, `concept path lg_pt_3: 7 steps, goal marked: true`,
  `concept progress key stored: true`. Treated as Smoke PASS per the out-of-scope note.
- `npm run validate` exits 0 — `concepts.json valid — 54 nodes (12 types), 59 edges
  (17 types), strict prerequisites acyclic`. Remaining output is warnings only
  (open-review notes on specific edges/nodes, example.com placeholder links,
  generality fallback) — no schema errors.

## Browser checks (Chrome DevTools MCP)

**GraphRendering / end-to-end concept flow**
- `?mode=concepts` loads: legend shows all 12 types, `window.__cy` reports 54 nodes /
  59 edges (matches smoke and validator). No empty canvas, no console errors.
  (One test artifact: resizing the browser *after* first load leaves the initial
  `cy.fit()` stale since `GraphView` never listens for container resize — reproducible
  on `?mode=map` too, so pre-existing and viewport-size-dependent, not concept-specific.
  A normal load at a fixed viewport fits and fills the canvas correctly, confirmed by
  reload.)
- Clicked a `physical_system` node (`nucleus`): card shows type/domain, description,
  "From this concept" / "Into this concept" relations, "Show path to this" button.
- Clicked a `law/equation` node (`einstein_eq`): card shows formula, variable glossary,
  conditions, representations, relations — rich content renders correctly.
- Clicked a `resource` node (`res_pt_textbook`): card shows "Open resource" link,
  media type/duration, relations.
- Hovered an edge (`e1`, `linear_algebra → vector_space`): `sentence-shown` class
  applied, sentence text rendered on the edge in the canvas (rotated label, confirmed
  in screenshot: "Linear Algebra is a strict prerequisite for Vector space").
- No console errors after any of the above (only pre-existing cytoscape/oxlint-style
  dev warnings: wheel-sensitivity, deprecated `label` width/height, one a11y "form
  field needs id/name" issue on the search input — present before this wave too).

**CurriculumLogic — concept goal path**
- `?mode=concepts&goal=lg_pt_3`: goal bar reads "★ Goal: Interpret geometrically the
  action of parallel transport on a vector. · 7 steps on this path", sidebar lists
  a topologically ordered path (Linear Algebra → Vector space → Differential
  Geometry → Tangent Space → Tangent vector → Parallel Transport → goal), with the
  goal's 3 resources listed under step 7. Matches smoke's `7 steps, goal marked: true`.

**Progress persistence (concept flow)**
- Ticked step 3 ("Differential Geometry"). `localStorage["physics-atlas-progress-v1"]`
  updated to `["concept:diff_geometry"]`. Reloaded: checkbox stays checked, counter
  reads "1 of 7 learned" — survives reload.

**Search (concept mode)**
- Typed "transport": 8 results returned with type suffixes (Parallel Transport —
  Method/technique, 3 learning goals, 3 educational resources). Selecting via
  keyboard Enter (the same interaction path the smoke test and `topics` search use)
  selects "Parallel Transport", opens its full card, and the graph centres/zooms on
  it with its relations visible.
  Note: the MCP `click` tool's synthetic click did not trigger the result buttons'
  `onMouseDown`-based pick handler (`SearchBox.tsx`, shared by both topic and concept
  search, unmodified by this wave) in this browser session — Enter-key selection
  (the same pattern `npm run smoke` already exercises for topic search) worked
  correctly and is what real users' keyboard flow and existing regression coverage
  use. Recorded as a testing-tool quirk, not a product regression; not on the critical
  path this wave touched.

**Routing / no cross-contamination**
- Switched back to `?mode=map`: topic dataset renders correctly (topic ids like
  `calculus-1/derivatives`, category legend "Mathematical concept / Method & formalism
  / Field (physics domain)"), fully distinct from the concept dataset — no leakage
  between the two graphs or their `window.__cy` instances.

**Advisory spot-check — `.goal-node` opacity/text-opacity fix**
- (a) `?mode=concepts&goal=lg_pt_3`: the goal node (`lg_pt_3`, radius 7, tiny at the
  default zoom) carries classes `["concept-node","zoom-faded","goal-node"]`
  simultaneously, but computed `opacity: 1` and `text-opacity: 1` — confirmed both
  numerically and visually (zoomed screenshot): a clearly visible gold/red-ringed
  circle with a star icon and fully legible bold label, not faded despite the
  `zoom-faded` class also being present. The fix works as intended.
- (b) Topic mode: `GoalView.tsx` (backing `?mode=goal`) never passes a `goalId` prop
  to `GraphView` at all — `.goal-node` is simply never applied there, confirmed by
  inspecting node classes on `cosmology` while a goal curriculum was open (`classes:
  []`). `MapView.tsx` (backing `?mode=map`) does pass `goalId`, but picking a goal
  path there (via "★ Show this path" on a subtopic) also produced no `goal-node`
  class on the target node in this build — this is the already-logged, confirmed-
  unrelated feature-19 issue ("goal-pick doesn't highlight on `?mode=map`"), not
  something this wave's 2-line opacity change caused or could have caused. Net: no
  observable change to topic-mode goal-node styling before/after this wave — the
  reviewer's static reasoning holds up at runtime.

## Report

## Wave 1 Live-QA — PASS
Features:    feature-15 (8269dab), feature-16 (1ba5482), feature-17 (915da9a)
Run:         npm run smoke; npm run validate; GraphRendering (concepts load, node
             click cards for physical_system/equation/resource, edge-hover sentence);
             CurriculumLogic (conceptPathFor 7-step goal path for lg_pt_3);
             Progress (concept tick persists across reload); Search (concepts-mode
             search + select + centre); Routing (?mode=map / ?mode=concepts no
             cross-contamination); advisory spot-check on .goal-node opacity fix in
             both concept and topic modes
Smoke:       PASS (2 failing assertions are the pre-logged, confirmed-unrelated
             feature-19/feature-20 topic-count issues, per task instructions)
FAIL:        none
Not checked: DesignSystem theme switch light/dark for concept mode; Accessibility tab
             order / focus-visible walkthrough beyond the a11y-tree structure already
             inspected; Print/PDF for concept goal path; Performance under heavy
             interaction on the full concept map; Hover-zoom-before-goal-pick behaviour
             for concept nodes (not explicitly requested for this wave and not a
             touched subsystem per the wave's subsystem list)
