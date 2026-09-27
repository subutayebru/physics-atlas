# feature-17 Review — Concept learning flow

## Gates
validate, build, lint — all clean (pre-existing data-quality warnings only, unrelated to this diff).

## Diff checked
docs/AUTHORING.md, scripts/smoke-test.mjs, src/App.css, src/App.tsx,
src/components/ConceptMapView.tsx, src/components/GraphView.tsx, src/components/SearchBox.tsx,
src/graph/concepts.ts, src/graph/dag.ts (427 insertions / 75 deletions).

## Targeted checks

- **dag.ts**: diff is exactly `export` added to `dfsClosure`/`kahnOrder`, no other change. Confirmed.
- **CURRICULUM_EDGE_TYPES**: `['strict prerequisite for']` only (src/graph/concepts.ts:104).
  `conceptPathFor` filters via `normalizeRelationship(e.relationship)` against that array.
  Checked concepts.json for e7/e35/e39/e40/e55/e57: relationships are 'Is derived from',
  'Described by', 'Is derived by' (×2), 'relates', 'has a' — none normalize to
  'strict prerequisite for'. Confirmed by direct data inspection, not just review of intent.
- **SearchBox regression**: diff moved the inline entries builder into `topicSearchEntries()`,
  called as `prebuilt ?? topicSearchEntries(topics ?? [])` — logically identical to the old
  inline `useMemo`. Both existing call sites (`Home.tsx:31`, `App.tsx:203`) still pass only
  `topics={...}` with no `entries` prop, so they take the same code path with the same output
  shape. `aria-label` defaults to the same string when `label` is absent. No regression.
- **Progress namespacing**: `useProgress.ts` is untouched (not in the diff) — single flat
  `Set<string>` in one `localStorage` key, as before. ConceptMapView prefixes every concept
  key with `concept:` (src/components/ConceptMapView.tsx:11, :168) and strips it back off only
  for `doneIds`. Grepped all other `progress.toggle`/`isDone` call sites (GoalView, TopicPage,
  SubgoalChecklist, MapView) — none use a `concept:` prefix or any prefix that could collide;
  topic ids/unit refs are plain kebab-case/`unit#outcome` strings. Collision is structurally
  impossible, confirmed from code, not just manual QA.
- **GraphView.tsx `.goal-node` opacity/text-opacity**: 2-line addition only. Reasoned from the
  stylesheet: `.zoom-faded` (opacity 0.3) is declared before `.goal-node` in the style array, so
  for a node carrying both classes the later `.goal-node` rule now wins on `opacity`/`text-opacity`
  where before it deferred to whatever else matched. Topic-mode goal nodes use `width: 'label'`
  sizing (auto-fit to text) while concept nodes use `width: 'data(size)'` (generality-driven,
  can be small) — so topic-mode goal nodes were unlikely to ever cross the 6px `FADE_PX`
  threshold in the first place, matching the developer's "no-op for topics" claim. This is a
  plausible, narrowly-scoped fix; genuinely can't be 100%-confirmed without a browser, which is
  outside this review's scope — flagged as residual risk, not a blocker.
- **a11y**: step list is a real `<ol className="concept-path-steps">`
  (ConceptMapView.tsx:~163) with real `<input type="checkbox">` + `aria-label`; goal bar is
  `role="status" aria-live="polite"` (ConceptMapView.tsx:~110); ★/✓ are text, not colour-only.
  No new law violation.
- **No magic hex / no stray Cytoscape**: grepped the full diff — no new `#hex`/`rgb(` in
  components, no `cytoscape`/`cy.` outside GraphView.tsx.
- **No loopholes**: no `any`, `@ts-ignore`, `oxlint-disable`, or loosened validator rules in
  the diff (one incidental match was the English word "any" in AUTHORING.md prose).
- **Pre-existing smoke failures** ("optional toggle did not reduce the curriculum", "expected
  13 diff-geo learning goals, got 14"): both assert against `?mode=goal` (`GoalView`,
  `.curriculum-item`/`.optional-toggle`) and `?mode=topic` (`TopicPage`,
  `.learning-goal-item`). Neither `GoalView.tsx` nor `TopicPage.tsx` is in this diff;
  `topics.json`/`generated-units.json` inputs are untouched; `dag.ts`'s only change is two
  `export` keywords with no logic difference. Structurally, nothing in this diff can reach
  either assertion — confirmed pre-existing and unrelated from the diff alone.
- **Reused Patterns**: `dfsClosure`/`kahnOrder` reused (not re-implemented), `goalPathFor`
  shape mirrored, GraphView goal/highlight/badge machinery reused with zero new GraphView
  selection logic, `.goal-bar`/`.learned-toggle` markup/CSS patterns reused. No parallel
  implementation found.

## Verdict
Gates: validate · build · lint — all green.
Findings: none blocking. One advisory: the `.goal-node` opacity fix (GraphView.tsx:132-133) is
reasoned to be a no-op for topic mode from static analysis (sizing model differs) but wasn't
confirmed in a live browser — worth a quick visual check at wave-close live-qa.

## feature-17 Review — PASS
Gates:    validate · build · lint
Findings: GraphView.tsx:132-133 — unplanned `.goal-node` opacity/text-opacity addition, reasoned
  safe for topic mode from the sizing model (`width:'label'` vs `data(size)`) but not confirmed
  live — advisory, verify visually at live-qa, not blocking.
