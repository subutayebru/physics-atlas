---
feature-id: 15
title: Concept graph schema foundation (typed nodes + sentence edges, data + validator + docs, no rendering)
estimated-complexity: medium
data-impact: schema
---

## Context

First of three stages of the multi-type graph migration (feature-15 → 16 → 17; retiring
`topics.json` is feature-18, blocked on Sophie — see Assumptions). Sophie's pilot dataset
(`data/seed/graph-data.json`, 54 nodes / 59 edges, spec in
`docs/physics-atlas-migration-brief.md`) models *concepts* with 12 node types and typed,
directional edges that read as sentences. The app today only knows `Topic`/`Subtopic` with two
hardcoded relations (`src/data/types.ts:29-81`).

This stage lands the new schema as a **second, independent dataset** — typed, validated,
documented, loadable — without touching any rendering. After it, Sophie can already edit
`src/data/concepts.json` and get `npm run validate` feedback (including the open data-quality
questions from the brief, surfaced as warnings), and feature-16 can render it.

**Architectural fork (decided): coexist, don't replace.** `topics.json` (35 course-level
topics, real curated books/videos, 8 featured goals incl. Cosmology, the compiled
parallel-transport goal) and the seed (54 concept-level nodes across three pilot domains —
GR/parallel transport, relativistic hydro, alpha decay — with 4 `example.com` placeholder
resources) are different granularities: old topics like "Cosmology" are closer to the seed's
`domain` attribute than to any of the 12 node types. Mechanically converting topics into typed
nodes would mean the agents invent type assignments and generality values (Sophie's content),
and replacing outright would delete every existing curriculum. So both datasets live side by
side until Sophie decides the mapping (feature-18, blocked).

## Critical Files

- `src/data/concepts.json` — **new**, the migrated seed in authored-only form (the concept
  graph's single source of truth)
- `src/data/conceptVocabulary.json` — **new**, the 12 node types (key → label), the 17-entry
  edge sentence template table, known resource `mediaType`s — read by both TS and the validator
- `src/data/types.ts` — new `NodeType`, `EdgeType`, `GraphNode` (discriminated by `type`),
  `GraphEdge`, `ConceptGraph`, `EDGE_SENTENCE_TEMPLATES`, `NODE_TYPE_LABELS`
- `src/data/loadConcepts.ts` — **new**, typed export of the dataset (mirrors `loadGraph.ts`)
- `src/graph/concepts.ts` — **new**, pure logic: `normalizeRelationship`, `edgeSentence`,
  `buildConceptIndex` (byId, incoming/outgoing adjacency, degree)
- `scripts/validate-concepts.mjs` — **new** validator for the concept graph
- `scripts/lib/find-cycle.mjs` — **new**, `findCycle` extracted from `validate-topics.mjs`
- `scripts/validate-topics.mjs` — import `findCycle` from the shared module (no rule change)
- `package.json` — chain `validate-concepts.mjs` into `npm run validate`
- `data/seed/graph-data.json` — removed once migrated (see Data Impact)
- `docs/AUTHORING.md` — new section "Concept graph (pilot)"
- `docs/DESIGN-DECISIONS.md` — new Decision 12

## Reused Patterns

- `src/data/loadGraph.ts:1,29` (JSON import + typed `export const graph`) — `loadConcepts.ts`
  is the same shape, so the bundler/tsc path for JSON is already proven.
- `scripts/validate-topics.mjs:262-285` (`findCycle`, Kahn over an adjacency map) — extracted
  to `scripts/lib/find-cycle.mjs` and imported by both validators instead of a second copy.
  The concept validator runs it over `strict prerequisite for` edges only.
- `scripts/validate-topics.mjs:18-19,406-414` (`errors`/`warn` arrays, `⚠`/`✗` output, one
  `✓` summary line, exit 1 on errors) — same output contract so Sophie reads both the same way.
- `scripts/validate-topics.mjs:104-108` + `src/graph/categoryColors.ts:33-36` (optional
  `category`, validated only if present, one fallback function) — same philosophy for
  `generality`: optional, validated only if present, render fallback lives in one function
  (added in feature-16).
- `scripts/validate-topics.mjs:6` / `src/graph/dag.ts:107-111` ("rules mirrored — keep in
  sync") — the only mirrored rule here is the 1-line `normalizeRelationship`; everything
  table-shaped is shared via `conceptVocabulary.json` instead of mirrored, which removes the
  drift risk the existing mirror comment warns about.

## Data Impact

**Authored file shape** (`src/data/concepts.json`):

```json
{
  "version": 1,
  "nodes": [
    { "id": "parallel_transport", "type": "method", "label": "Parallel transport",
      "generality": 3, "attrs": { "description": "…", "domain": "General relativity" } }
  ],
  "edges": [
    { "id": "e57", "source": "exponentials", "target": "decay_equation",
      "relationship": "has a", "review": "…" }
  ]
}
```

- Node: `id`, `type` (one of 12), `label`, `attrs` (per-type shape below), optional
  `generality` (integer 1–5, 1 = most specific, 5 = most general), optional `review` (string).
- Edge: `id`, `source`, `target`, `relationship` (verbatim as authored), optional `review`.
- Per-type `attrs` (TS discriminated union on `type`):
  - concept types (`physical_system`, `property`, `phenomenon`, `model_regime`, `conditions`,
    `formalism`, `method`, `experiment`, `misconception`): `description` (required),
    `domain?`
  - `equation`: `description`, `equation` (required string), `variables:
    {symbol, meaning}[]`, `conditions: string[]`, `representations: string[]`, `domain?`
    (seed equations have no `domain`)
  - `learning_goal`: `description` only — **no `domain`** (brief §3.6)
  - `resource`: `link`, `mediaType`, `estimatedMinutes` (number), `rating` (number 0–5),
    `reviewCount` (integer) — **no `description`/`domain`** (brief §3.6)
- **Dropped derived fields** (recomputed at runtime, never authored): `typeLabel`, `degree`,
  `radius`, `generalityNote`, `color`, edge `relationshipNormalized`, edge `sentence`, and the
  whole `typeMeta[]` array. The seed's placeholder colours are *not* data — feature-16 turns
  them into a validated palette module.
- **Type coercion only:** resource `estimatedMinutes`/`rating`/`reviewCount` are strings in the
  seed (`"45"`, `"4.6"`, `"128"`) and become numbers. No value changes.
- IDs stay **snake_case exactly as in Sophie's CSVs** (`quark_gluon_plasma`, `lg_pt_3`) —
  renaming would break traceability to her source files. They're disjoint from the kebab-case
  topic ids by construction.
- `generality`: **not set on any node** in this migration (the seed has only a degree
  heuristic; inventing values is Sophie's call).

**Data-quality issues from the brief (§3) — flagged, not resolved:**

| # | Issue | How it's flagged |
|---|---|---|
| 1 | `"Relates"` ×11 vs `"relates"` ×1 (`e55`) | Automatic validator warning: one normalized edge type authored in several casings, with counts. Relationships stay verbatim; the template lookup is case-insensitive, so nothing breaks meanwhile. |
| 2 | `e57` `exponentials → decay_equation` "has a" likely reversed | `review` note on `e57` |
| 3 | "is derived from" (`e7`) vs "is derived by" (`e39`, `e40`) | `review` note on all three edges, same text, cross-referencing each other. No direction picked, no type collapsed. |
| 4 | `e35` `quark_gluon_plasma → rhic` "Described by" | `review` note on `e35`. Type not renamed. |
| 5 | Orphans `lg_alpha_decay_nucleons`, `lg_alpha_radiation_properties` | Automatic validator warnings: "node has no edges", plus "learning goal has no incoming strict prerequisite". No edges fabricated. |
| 6 | Per-type attribute shapes | Validator requires only the fields listed above per type. |
| (extra) | 4 resources link to `example.com` | Automatic warning for links on reserved example domains (`example.com/.org/.net`) — flag only. |

`review` note wording is neutral and quotes the brief: it says what reads oddly and that
Sophie decides, never states the fix (e.g. e57: *"Reads 'Exponentials has a Decay equation';
the other 'has a' edges point from the whole to its part — source/target may be swapped.
Sophie to confirm (migration brief §3.2)."*). Sophie clears an item by deleting the field.

- **Validator mirror:** new `scripts/validate-concepts.mjs`, chained in `npm run validate`
  after `validate-topics.mjs`. Errors: top-level shape; node `id` snake_case
  (`^[a-z0-9]+(_[a-z0-9]+)*$`) and unique; `type` ∈ vocabulary; `label` non-empty; required
  per-type attrs present and correctly typed; resource `link` is http(s); `rating` ∈ [0,5];
  `generality`, if present, integer 1–5; edge `id` unique; `source`/`target` exist; no
  self-loop; normalized `relationship` ∈ `EDGE_SENTENCE_TEMPLATES` (this is the brief's "refuse
  unknown edge types" rule); `strict prerequisite for` edges acyclic (curricula in feature-17
  order over them). Warnings: casing variants (#1), open `review` items (#2–#4), nodes with
  no edges (#5), learning goals with no incoming strict prerequisite (#5), unknown `attrs` keys,
  unknown `mediaType` (not an error — list is Sophie-extensible), `generality` set on a
  `learning_goal` (ignored: learning goals always render minimal), example-domain links,
  duplicate (source, target, type) triples, and **one summary line** "N of M nodes have no
  authored generality yet — size falls back to connection count" (not 54 separate lines).
  Summary on success: `✓ concepts.json valid — 54 nodes (12 types), 59 edges (17 types),
  strict prerequisites acyclic`.
- **Docs mirror:** `docs/AUTHORING.md` gets a new top-level section **"Concept graph
  (pilot)"** and a row in the intro table (`src/data/concepts.json`): the 12 types with their
  label and one-line meaning, the per-type field table (which fields each type has — explicitly
  "learning goals have no domain, resources have no description"), how to write an edge
  (`source` + `relationship` + `target` must read as a sentence — the full 17-row template
  table, verbatim), `generality` 1–5 scale with "leave it out until you've decided; learning
  goals are always drawn smallest", the `review` field ("an open question for you — delete it
  once decided"), the current open review list (the 6 items above), snake_case ids, and that
  adding a new relationship type means adding a row to `conceptVocabulary.json` first.
- **Content regression:** none. No curriculum changes; `topics.json` untouched. The seed file
  `data/seed/graph-data.json` is deleted after migration because its derived fields would
  silently drift from `concepts.json`; the migration is lossless for every authored field
  (checked in Verification).

## Implementation Steps

1. **`src/data/conceptVocabulary.json`** — `{ "nodeTypes": { "physical_system": "Physical
   system", … 12 entries in the seed's `typeMeta` order and labels }, "edgeTemplates": {
   "strict prerequisite for": "{s} is a strict prerequisite for {t}.", … all 17 rows of brief
   §2 verbatim }, "mediaTypes": ["text", "video", "quiz"] }`.
2. **`src/data/types.ts`** — append (don't touch `Topic`/`Subtopic`): import the vocabulary
   JSON; `export const NODE_TYPE_LABELS = vocab.nodeTypes; export type NodeType = keyof typeof
   NODE_TYPE_LABELS; export const EDGE_SENTENCE_TEMPLATES = vocab.edgeTemplates; export type
   EdgeType = keyof typeof EDGE_SENTENCE_TEMPLATES;` then the attrs interfaces, `GraphNode` as
   a union discriminated on `type`, `GraphEdge` (`relationship: string` — raw; the resolved
   `EdgeType` comes from `normalizeRelationship`), `ConceptGraph { version: number; nodes;
   edges }`. `verbatimModuleSyntax`/`erasableSyntaxOnly` are on — no enums; `import type`
   stays valid at existing call sites.
3. **Migrate data** — one-off node transform (not committed as a script) from
   `data/seed/graph-data.json` to `src/data/concepts.json`: keep `id,type,label,attrs` /
   `id,source,target,relationship`, coerce the three resource numbers, add the five `review`
   notes (e7, e35, e39, e40, e57), 2-space JSON. Then delete `data/seed/graph-data.json` (and
   the empty `data/` dir).
4. **`src/data/loadConcepts.ts`** — `import raw from './concepts.json'; export const concepts
   = raw as ConceptGraph;` (same cast pattern as `loadGraph.ts:17`).
5. **`src/graph/concepts.ts`** — `normalizeRelationship(raw): EdgeType | null` (trim, collapse
   inner whitespace, lowercase, look up — comment: mirrored in validate-concepts.mjs);
   `edgeSentence(edge, byId): string` (fill `{s}`/`{t}` with labels; fall back to
   `"{s} — {raw} — {t}"` only for an unknown type, which the validator already rejects);
   `buildConceptIndex(graph)` → `{ byId, incoming, outgoing, degree }`. No component imports
   yet.
6. **`scripts/lib/find-cycle.mjs`** — move `findCycle` from `validate-topics.mjs:262-285`,
   export it, import it back in `validate-topics.mjs`. Run `npm run validate` — topics output
   must be byte-identical to before.
7. **`scripts/validate-concepts.mjs`** — rules per Data Impact; reads both JSON files via
   `readFileSync` like `validate-topics.mjs:12,23`.
8. **`package.json`** — `"validate": "node scripts/compile-content.mjs && node
   scripts/validate-topics.mjs && node scripts/validate-concepts.mjs"`.
9. **`docs/AUTHORING.md`** — new section per Docs mirror.
10. **`docs/DESIGN-DECISIONS.md`** — Decision 12 "Concept graph as a second dataset
    (2026-09)": options table — **coexist (chosen)** / replace topics.json now (rejected:
    deletes all curricula, needs invented type mappings) / convert topics mechanically
    (rejected: agent-invented content); vocabulary JSON shared by TS + validator instead of a
    mirror; `review` field as the flag mechanism; snake_case ids kept from the CSVs; generality
    1–5 optional; pathway: `scripts/import-concepts-csv.mjs` if Sophie sends raw CSVs again
    (brief §4).
11. Gates.

## Verification

- `npm run validate` exits 0: unchanged `✓ topics.json valid — 35 topics …` line, then
  `✓ concepts.json valid — 54 nodes (12 types), 59 edges (17 types), strict prerequisites
  acyclic`. Expected `⚠` lines, exactly: 1 casing warning (`relates`: `Relates`×11,
  `relates`×1), 5 open review items (e7, e35, e39, e40, e57), 2 no-edge nodes + 2 learning
  goals without prerequisite (`lg_alpha_decay_nucleons`, `lg_alpha_radiation_properties`),
  4 example-domain links (`resource_mtw`, `res_pt_video`, `res_pt_concepttest`,
  `res_pt_textbook`), 1 generality summary (54 of 54).
- Negative checks (edit, run, revert): change one edge to `"relationship": "studied by"` →
  error "unknown edge type"; point an edge at `nope` → error; add
  `lg_pt_1 -strict prerequisite for-> linear_algebra` → cycle error; remove `domain` from a
  `learning_goal` → no error (field never required).
- Lossless migration: a throwaway node check confirms 54 nodes / 59 edges, every seed
  `id,type,label,attrs` (modulo the 3 numeric coercions) and `source,target,relationship`
  present unchanged in `concepts.json`; per-type counts equal the seed's `typeMeta` counts.
- `npx tsc -b`, `npm run lint`, `npm run build` clean. `src/graph/concepts.ts` compiles
  against the typed data (no `any`).
- No UI change: `?mode=map`, `?mode=goal`, `?mode=topic&id=quantum-mechanics` identical to
  before.
- Extend `npm run smoke`? **No** — nothing renders the new data yet; feature-16 adds the
  first concept smoke step.

## Assumptions

- **Coexistence, not replacement** (see Context): `topics.json` and every view built on it
  stay untouched through feature-17. The `category` colour system (feature-13/14) is *not*
  retired by this sequence — it keeps colouring the topic views until feature-18. Retiring it
  requires Sophie to decide how the 35 topics relate to concept nodes (keep as course-level
  areas linked via `domain`? re-author as typed nodes? drop?) — logged as feature-18 under
  `## Blocked`.
- Known content overlap is left alone: `lg_pt_1…5` duplicate the parallel-transport subgoals
  in `content/goals/parallel-transport.md`, `lg_tv_1…3` resemble tangent-space goals, and the
  relativistic-hydro nodes overlap topic `relativistic-hydro`. Deduplication is part of
  Sophie's feature-18 decision.
- `generality` scale 1–5 integer (not 0–1 float): easiest to author for a non-dev, maps
  cleanly to five size steps. Changing the scale later is a validator + one-function change.
- The casing issue (#1) is flagged, not normalized in the data, because the orchestrator
  instruction is to flag all five issues; the case-insensitive lookup means it has no runtime
  effect meanwhile.
- Relationship strings are stored verbatim (incl. capitalization) so Sophie's CSV round-trip
  stays recognizable.
- No `CLAUDE.md` edit by the developer: the user may want to add `concepts.json` /
  `src/graph/concepts.ts` to the Architecture Overview by hand.
