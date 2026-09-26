---
feature-id: 14
title: Topic cleanup + subtopics visible by default + hover zoom in the explorer
issue:
requires-design-assets: false
estimated-complexity: high
code-review: required
design-review: required
runtime-budget-minutes: 20
---

## Context

Follow-up to feature-13 (commit `8f5b03b`, category colours + goal highlighting), from
direct feedback after the first look at the live app:

1. The 6 topics left uncategorised in feature-13 are still visible on the map as grey
   nodes. What's wanted: gone from the app entirely — not hidden, but deleted from
   `topics.json`, including every prerequisite reference to them. This is a
   deliberately accepted content regression: general-relativity, quantum-field-theory,
   black-holes-gravitational-waves and cosmology each get one step shorter,
   quantum-mechanics loses its only optional prerequisite.
2. Subtopics should be part of the normal map structure, not hidden behind a toggle.
   Currently every topic starts collapsed (⊕ click/double tap needed) — including the 7
   topics that already have subtopics. What's wanted: these 7 show their subtopics open
   immediately on load.
3. Hovering a topic (before a learning goal is picked) should smoothly zoom the view to that
   topic + its subtopics, with the rest of the map staying visible, then back again.
   Confirmed scope: only in the pre-goal exploration state — once a learning goal is active,
   the view stays focused on the highlighted path, no more hover zoom.
4. The actual feature-13 goal — with a learning goal picked, highlight only the relevant
   subtopics and fade out the irrelevant ones — already works correctly (verified on the
   `relativistic-hydro/israel-stuart` example: `metric/curvilinear-coords` lights up,
   `metric/lengths-angles-volumes` stays dimmed; classical vs. relativistic
   hydrodynamics: `fluid-dynamics` simply has no edge to `differential-geometry`).
   No new code here — only a verification pass that points 2/3 don't break it.

Content for the ~28 topics without subtopics is deliberately deferred — Sophie fills it in
later. This is recorded explicitly in the docs as an expected, documented state, not left
silently open.

## Critical Files

- `src/data/topics.json` — delete 6 topic entries, clean up 5 dangling prerequisite refs
- `src/components/MapView.tsx:41` — `expandedIds` default (empty → all annotated topics)
- `src/components/GraphView.tsx` — new hover-zoom mechanism (fully internal, no new props)
- `docs/AUTHORING.md`, `docs/DESIGN-DECISIONS.md` — docs for deferred content + Decision 11
- `BACKLOG.md`, `ROADMAP.md` — project bookkeeping

## Reused Patterns

- `GraphView.tsx:456-469` (`focus` effect: `cy.animate({fit:{eles,padding}})`,
  `prefers-reduced-motion` check via `window.matchMedia`) — hover zoom is a second,
  thematically identical call instead of a new mechanism.
- `MapView.tsx:60-77` (`autoAddedRef`, goal-driven auto-expand via `goalPathFor()`
  from `src/graph/dag.ts`) — stays unchanged; the new default-expand floor is always a
  superset of `goalPathFor().expand`, so the two mechanisms can't get in each other's way
  (see the data model section).
- `GraphView.tsx:374` (350 ms window for double-tap detection) — the same timing convention
  is reused for the hover-zoom dwell instead of a new magic number.
- `scripts/validate-topics.mjs:182-194` (prerequisite resolution, hard error on an unknown
  ID) — unchanged; the data cleanup is designed exactly so that this runs through cleanly;
  no script change needed.
- `Home.tsx:14` (`topics.filter(t => t.featured)`) — no code change; `standard-model`
  drops out of the featured chips automatically once the topic disappears from the data.

## Data Model / Relations

**Delete** (complete topic entries from `topics.json`; no `partOf` targets, no subtopics of
their own, not referenced anywhere else in the repo except the prerequisite refs listed
below):

`lagrangian-mechanics`, `optics`, `standard-model`, `quantum-gravity-frontiers`,
`stellar-astrophysics`, `galaxies-large-scale-structure`

**Clean up references** (otherwise a hard `npm run validate` error):

| Topic | Before | After |
|---|---|---|
| `quantum-mechanics` | `optionalPrerequisites: ["lagrangian-mechanics"]` | remove the field entirely |
| `general-relativity` | `["special-relativity", "differential-geometry", "lagrangian-mechanics"]` | `["special-relativity", "differential-geometry"]` |
| `quantum-field-theory` | `["quantum-mechanics", "special-relativity", "lagrangian-mechanics"]` | `["quantum-mechanics", "special-relativity"]` |
| `black-holes-gravitational-waves` | `["general-relativity", "stellar-astrophysics"]` | `["general-relativity"]` |
| `cosmology` | `["general-relativity", "statistical-mechanics", "astrophysics", "nuclear-particle-physics", "galaxies-large-scale-structure"]` | `["general-relativity", "statistical-mechanics", "astrophysics", "nuclear-particle-physics"]` |

Determine exact line numbers fresh via `grep -n '"id"'` when implementing — the file is
large and hand-maintained, lines shift quickly.

## Implementation Steps

1. **`src/data/topics.json`** — delete the 6 topic blocks, clean up the 5 references as
   above (delete bottom-up, or re-`grep` after each step).
2. **`npm run validate`** right afterwards — expected: 35 instead of 41 topics, 0 errors.
3. **`src/components/MapView.tsx:41`** — change the lazy initializer:
   ```ts
   const [expandedIds, setExpandedIds] = useState<Set<string>>(
     () => new Set(topics.filter((t) => t.subtopics?.length).map((t) => t.id)),
   );
   ```
   `toggleExpand` and the ⊕/⊖ button stay unchanged. Optionally adjust the `.map-hint` text
   (nearby) — it currently describes only opening, and should also mention collapsing, since
   most annotated topics now start open.
4. **`src/components/GraphView.tsx`** — hover zoom, fully internal, no new props:
   - Gating: only when `large === true`, only when `!goalId`, only for nodes with
     `node.isParent()` (manually collapsed or leaf topics are automatically excluded).
   - New refs: enter timer, exit timer, `preHoverViewportRef` (`{zoom, pan}`, set once per
     hover *session*, not per node).
   - `mouseover` on an eligible node: ~350 ms dwell, then (if `preHoverViewportRef` is
     empty) remember the current viewport, then `cy.stop()` +
     `cy.animate({fit:{eles: node.union(node.children()), padding: ~160-200}}, {duration:500,
     easing:'ease-in-out-cubic'})` (or `cy.fit()` immediately under `prefers-reduced-motion`).
   - `mouseout`: ~150–200 ms exit timer, then restore `cy.viewport({zoom, pan})` from the
     remembered value, reset the session. A new `mouseover` before the exit timer expires
     cancels it and re-fits directly, no snap-back flicker.
   - Clear both timers in the existing `cy.destroy()` teardown (element rebuild effect).
   - Leave the existing hover-highlight classes (`hover-pre`/`hover-post`/`hovered`)
     untouched — hover zoom is a separate `cy.on(...)` registration, no mixing.
5. **Verification of the already-working goal-dimming logic** (no code change) —
   see the Verification section.
6. **`docs/AUTHORING.md`** — correct the example `prerequisites` (currently still with
   `lagrangian-mechanics`, modelled on `quantum-field-theory`); new row for `subtopics` in the
   field table (analogous to the existing `category` entry): optional, absent is a valid
   permanent state (plain node), not a deficiency; when present, renders open by default on
   the map.
7. **`docs/DESIGN-DECISIONS.md`** — short reference sentence added to Decision 10 (the 6
   topics are now deleted, no longer just uncategorised); new **Decision 11** — real deletion
   instead of hiding (+ accepted curriculum regression), default-open as the structural
   precondition for cheap hover zoom, hover zoom as a pure viewport operation
   (explicitly no fisheye/lens — Cytoscape has no such primitive), gated to pre-goal
   exploration on the large map.
8. **`BACKLOG.md`** — add the feature-14 line under `## Open` (same format as the existing
   entries).
9. **`ROADMAP.md`** — entry under the insert marker (same format as the feature-13 block).
10. **Gates**: `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build`.

## Verification

- `npm run validate` → 35 topics, 0 errors.
- `npx tsc -b`, `npm run lint`, `npm run build` — all clean.
- `npm run dev`, manual pass:
  - All 6 deleted topics: no search hits, not on the map, no dangling edges;
    home shows 8 instead of 9 featured chips (no Standard Model chip any more).
  - `?mode=goal&goal=general-relativity`, `…quantum-field-theory`,
    `…black-holes-gravitational-waves`, `…cosmology` load cleanly with the shortened
    prerequisite lists, no console errors, no broken chip for the removed step.
  - Fresh load of `?mode=map` (no goal picked): `calculus-1`, `linear-algebra`,
    `differential-equations`, `waves-oscillations`, `quantum-mechanics`, `metric`,
    `relativistic-hydro` show their subtopics immediately; ⊖/⊕ still collapses/expands manually.
  - Hovering one of these 7 topics zooms smoothly to topic+subtopics without other
    node positions jumping (a sign of an unintended `expandedIds` mutation); moving to
    a neighbouring topic re-fits without intermediate flicker; mouse out → smoothly back to
    the previous view; `prefers-reduced-motion` → instant cut without animation; hovering a
    leaf topic (e.g. `electromagnetism`) → no viewport change, only the existing hover
    highlight.
  - With a learning goal picked: hover triggers **no** zoom.
  - The `relativistic-hydro/israel-stuart` dimming example is still correct.

## Assumptions

- The curriculum regression (general-relativity/quantum-field-theory/
  black-holes-gravitational-waves/cosmology each one step shorter, quantum-mechanics without
  an optional prerequisite) is deliberately and explicitly accepted by the user, not a bug.
- The exact timing values (350 ms dwell, 150–200 ms exit, 500 ms animation duration,
  160–200 px padding) are reasonable starting points based on existing code values —
  adjustable visually in the dev server, not a hard requirement.
- Hover-zoom revert target: the exact viewport state before the hover began (not a generic
  fit-all) — preserves the user's manual pan/zoom from before the hover.
- `docs/DESIGN-DECISIONS.md`: Decision 10 only gets a short reference addition instead of a
  rewrite — the historical entry stays, Decision 11 documents the update.
