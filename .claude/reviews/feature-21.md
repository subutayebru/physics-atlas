# feature-21 Review — Concepts takes the Full Map's place in navigation

## Gates
- `npm run validate` — clean (pre-existing content warnings only, unrelated to this diff)
- `npm run build` — clean
- `npm run lint` — clean

## Diff reviewed
`git diff --stat HEAD`: BACKLOG.md, ROADMAP.md, docs/AUTHORING.md, docs/DESIGN-DECISIONS.md,
scripts/smoke-test.mjs, src/App.tsx, src/components/Home.tsx (7 files, +47/-14).

## Scope check
- `src/App.tsx`: only two hunks — header nav (removed "Full map" button, moved/relabeled the
  concepts button to first slot as "Concept map") and `onExplore` now `setMode('concepts')`.
  `Mode` union (line 19) and `initialMode()` (21-28) byte-for-byte unchanged; `mode === 'map'`
  render branch still present at line 230 and reachable with no tab pointing at it.
- Confirmed absent from diff: `MapView.tsx`, `GraphView.tsx`, `dag.ts`, `categoryColors.ts`,
  `topics.json`, `SearchBox.tsx`, `App.css`, `TopicPage.tsx` — `git diff --stat` for these paths
  returns nothing.
- `homeSearchPick` (topic-scoped Home hero search) and TopicPage "Show on map" left untouched,
  as the plan specifies (still target MapView).
- No duplicate concepts tab, no orphaned "Full map" handler — nav is exactly two buttons.
- BACKLOG.md/ROADMAP.md edits are standard per-feature bookkeeping, not scope creep.

## Project laws
- No magic hex, no Cytoscape outside GraphView, no re-layout, no schema change — N/A, nothing
  touched in those areas.
- a11y: tab labels are visible text (not colour-only); `.mode-tab`/`.mode-tab-active` classes
  reused unchanged, so focus/contrast behavior carries over.
- No invented content, no new dependency, no asset generation.
- docs/DESIGN-DECISIONS.md: old row demoted to "↩ pathway" with restore note, nothing deleted —
  matches house rule.
- docs/AUTHORING.md: only the tab-name mentions changed, "pilot" dataset wording kept, as planned.

## Verification vs plan
- Smoke test block added asserts: `location.search` starts with `?mode=concepts`, 54 concept
  nodes present, `.mode-tab` texts exclude "Full map", first tab carries `mode-tab-active` —
  meaningful, non-trivial checks, not tautologies.
- Existing `?mode=explore` step still present, doubling as the "old map reachable by URL"
  regression check per plan step 7.
- Developer-reported pre-existing smoke failures (feature-19/20, curriculum-toggle and
  diff-geo goal count) are unrelated to this diff — it touches neither topics.json, GoalView,
  TopicPage, nor dag.ts logic; no reason to suspect otherwise.

## Findings
None.

## Verdict: PASS
