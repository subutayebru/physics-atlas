# feature-15 Review — Concept graph schema foundation

## Gates
- `npm run validate` — exit 0. `⚠`/`✓` output matches plan's Verification section exactly:
  unchanged `✓ topics.json valid — 35 topics, 54 subtopics, 35 subgoals, 4 skills, 1 optional
  edges, DAG is acyclic (incl. optional edges)`, then `✓ concepts.json valid — 54 nodes
  (12 types), 59 edges (17 types), strict prerequisites acyclic`. Warnings: 1 casing
  (`Relates`×11/`relates`×1), 5 review items (e7, e35, e39, e40, e57), 2 no-edge nodes,
  2 learning-goal-no-prereq, 4 example-domain links, 1 generality summary (54/54) — all present,
  no extras.
- `npm run build` — clean (tsc -b + vite build).
- `npm run lint` — clean (oxlint, no findings).
- `npx tsc -b --force` — clean.

## Diff reviewed
`git diff --stat/HEAD` on: `BACKLOG.md`, `ROADMAP.md`, `docs/AUTHORING.md`,
`docs/DESIGN-DECISIONS.md`, `package.json`, `scripts/validate-topics.mjs`, `src/data/types.ts`,
plus new files `src/data/concepts.json`, `src/data/conceptVocabulary.json`,
`src/data/loadConcepts.ts`, `src/graph/concepts.ts`, `scripts/validate-concepts.mjs`,
`scripts/lib/find-cycle.mjs`.

## Checks performed
- `findCycle` extraction: `scripts/lib/find-cycle.mjs` is a byte-for-byte move of the old
  in-file function; `validate-topics.mjs`'s topics output is unchanged (confirmed above) — no
  regression.
- Negative checks (plan's Verification list), each reverted after testing:
  - `relationship: "studied by"` → `✗ edge "e1": unknown edge type "studied by" — add it to
    conceptVocabulary.json first`.
  - Edge target `"nope"` → `✗ edge "e1": unknown target "nope"`.
  - Added `lg_pt_1 -strict prerequisite for-> linear_algebra` → cycle error naming the stuck set.
  - Removed `domain` from a `learning_goal` → exit 0, no error.
  - File restored, `diff -q` against a pre-edit copy confirms byte-identical.
- Lossless migration (compared against the original seed found at
  `/home/bru/Downloads/graph-data.json`, 54 nodes/59 edges): 0 node mismatches (id/type/label/
  attrs, only the 3 numeric fields coerced string→number), 0 edge mismatches (id/source/target/
  relationship verbatim), per-type counts equal the seed's `typeMeta` counts exactly. All derived
  fields (`typeLabel`, `degree`, `radius`, `generalityNote`, `color`, edge `sentence`,
  `relationshipNormalized`, `typeMeta[]`) confirmed absent from `concepts.json`.
- Data-quality issues from the brief — confirmed flagged, not resolved: `review` present on
  exactly e7/e35/e39/e40/e57 (no node review used); orphans `lg_alpha_decay_nucleons`/
  `lg_alpha_radiation_properties` have zero edges (none fabricated); `e35`'s type still
  `"Described by"` (not renamed); `e7`/`e39`/`e40` keep their original, opposite-sense
  directions (`is derived from` / `is derived by`, no direction picked); casing kept verbatim
  (`Relates` ×11, `relates` ×1); no node has `generality` set (0/54).
- `data/seed/graph-data.json` and the `data/` directory are gone (untracked, so no git-visible
  deletion — consistent with the report).
- `conceptVocabulary.json`: 12 node types, 17 edge templates — checked verbatim against
  `docs/physics-atlas-migration-brief.md` §2, identical.
- Project laws: no magic hex/`rgb(` in the touched files; no `cytoscape` import outside
  `GraphView.tsx` (none added by this feature); no `any`/`@ts-ignore`/`oxlint-disable` in any
  new file; `Topic`/`Subtopic` in `types.ts` untouched (only appended); no component touched, so
  the "no UI change" claim holds trivially.
- Reused Patterns actually reused, not parallel-implemented: `loadConcepts.ts` mirrors
  `loadGraph.ts`'s JSON-import + typed-cast shape; `findCycle` is shared via
  `scripts/lib/find-cycle.mjs`, imported by both validators (no second copy); the validator/
  output contract (`errors`/`warn`, `⚠`/`✗`, one `✓` summary, exit 1 on error) matches
  `validate-topics.mjs`'s.
- `docs/AUTHORING.md` new "Concept graph (pilot)" section covers: intro-table row, 12 types
  table, per-type attrs table (explicitly no domain for learning_goal, no description/domain for
  resource), the 17-row edge template table verbatim, `generality` 1–5 scale with "leave it out"
  guidance, `review` field explanation + the 6 open items, snake_case id rationale, and the
  "add a row to conceptVocabulary.json first" instruction for new relationship types.
- `docs/DESIGN-DECISIONS.md` Decision 12 covers the options table (coexist chosen / replace
  rejected / mechanical-convert rejected) plus the vocabulary-sharing, `review`-flag,
  snake_case-id, generality-scale and CSV-pathway notes — matches plan step 10.
- `BACKLOG.md`/`ROADMAP.md` additions (feature-15/16/17 entries, feature-18 blocked question)
  are informational and consistent with the plan; no content invented.

## Findings
None. No law violations, no loopholes, no parallel implementations found.

## feature-15 Review — PASS
Gates:    validate · build · lint — all green
Findings: none
