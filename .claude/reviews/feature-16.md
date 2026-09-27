# feature-16 Review — Concept map view

## Gates
validate: clean (35 topics/54 subtopics; concepts.json 54 nodes/59 edges, DAG acyclic) — pre-existing content warnings only, no new ones.
build: clean (tsc -b + vite build).
lint: clean (oxlint, no findings).

## Diff
`git diff --stat HEAD`: 8 files, +529/-98 (typeColors.ts and ConceptMapView.tsx are new, untracked at review time but present).

## Law checks
- Cytoscape only in GraphView: confirmed — no `cytoscape` import, no `cy.` call in `ConceptMapView.tsx`; it only renders `<GraphView concepts={...} .../>`.
- No magic hex in `src/components/**`: none found in `ConceptMapView.tsx`/`Legend.tsx` (grep clean); all new App.css rules use `var(--...)` tokens. `GraphView.tsx` adds one literal (`surface = light ? '#f3f5fa' : '#070b14'`) but this follows the file's pre-existing, already-accepted pattern (`ink`, `edge`, `silver`, `gold` etc. are all hardcoded the same way, with the existing prop comment "canvas can't use CSS vars") — not a new violation.
- Palette (`src/graph/typeColors.ts`): recomputed all 12 contrast ratios independently (WCAG relative-luminance formula) against `#070b14`/`#f3f5fa` — they match the header comment and the report exactly (3.08–5.79 dark / 3.12–5.86 light), all ≥3:1. Header documents the derivation (ColorBrewer Paired → lightness shift) in the same format as `categoryColors.ts`.
- `Legend.tsx` rewritten with Write: diffed directly — the hunk only inserts a new `if (variant === 'type') {...}` branch before the existing `return`; every line of the `category`-variant render path (the `return (<div className="legend">...)` block) is untouched context, confirmed byte-identical against `git show HEAD:...`. Claim verified, not just trusted.
- a11y colour-never-alone: every colour use (type dots, node fill) is paired with a visible text label (legend entries, card title/type text, "Browse by type" index) — no new state conveyed by colour alone. Zoom-fade dims by continuous opacity as a zoom cue, not a new binary category encoded only in colour.
- Reused Patterns: verified each cited hunk was actually reused (not reimplemented) — `topicElements` extracted verbatim (diff shows pure move, no behaviour change), `conceptElements` added as sibling, label effect now reads `n.data('title')`, hover switched to `incomers/outgoers` for concepts, `highlightIds`/`neighbourIds` reused without new selection classes, `focus`/`cy.animate({fit})` reused in `ConceptMapView`, `Legend`/`.map-card`/`.cat-dot` classes reused. No parallel implementation found.
- `prefers-reduced-motion`: guarded once via `matchMedia('(prefers-reduced-motion: reduce)')` → `fadeDuration = '0s'` applied to all new `.concept-node`, `.zoom-faded`, `.label-hidden`, `.concept-edge` transitions.
- Schema-adjacent doc sync: `docs/AUTHORING.md` and `docs/DESIGN-DECISIONS.md` (Decision 13 + note on Decision 10) both updated to describe the new view; no schema/validator change in this feature (data-impact: none per plan header), so no third-place mirroring was required.
- Loopholes: no `any`, `@ts-ignore`, `oxlint-disable`, or loosened validator rule found in the diff.
- Regression: dependency-array check confirms `expandedIds` was already missing from the highlight effect at HEAD (8269dab) — the `?mode=map` goal-dimming gap is genuinely pre-existing, not introduced here (as the developer reports). The topic-variant code path (`topicElements`, label effect, hover, focus) is an unchanged extraction — no behavioural diff for `?mode=map`/`goal`/`topic`.
- Plan deviations: `LABEL_PX = 8` instead of the plan's suggested starting value of 9 — plan explicitly calls these "starting values to tune visually, not requirements"; non-breaking, reasonable. The additional style entries (`node.concept-node.hovered` padding, `.chosen`/`.hovered` opacity/text-opacity resets) are needed so small circles don't visually vanish under existing hover/selection classes — reasonable, in scope of step 5's intent, not a new mechanism.

## Verification vs plan
Static verification only (per role scope): node/edge counts (54/59) confirmed via `npm run validate` output; contrast numbers confirmed by independent computation; Legend byte-identity confirmed by diff; smoke-test step added matches the plan's Verification bullet (nodes/edges assertion, tap `einstein_eq`, wait for `.map-card`, assert relation sentence text). Browser-level checks (hover sentence, zoom fade behaviour, focus animation, light-theme dot contrast) are out of this review's scope (static only) and belong to live-qa at wave close.

## Findings
None blocking. No advisory items beyond what's already covered above.

## Verdict: PASS
