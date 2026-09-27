# Physics Atlas — multi-type graph migration brief

Context for whoever (human or Claude Code) picks this up: the live app at
`subutayebru/physics-atlas` currently models content as a single `Topic` type
with two hardcoded relations (`prerequisites`, `optionalPrerequisites`). Sophie
has authored a pilot dataset — 12 CSVs, one per node type, plus `edges.csv` —
that instantiates a richer schema: 12 node types, typed/directional edges that
read as sentences, and (eventually) a generality value driving node size on
the map. This brief is the spec for migrating the app to that schema, using
Sophie's CSVs as the real seed data rather than inventing test fixtures.

The already-merged seed dataset lives at `data/seed/graph-data.json` (the
raw per-type CSVs themselves were not handed over, only their merge — treat
this JSON as the seed data directly, there is nothing to re-parse). A
working, non-production preview of what this renders as is here:
**https://claude.ai/artifact/NFnUBuHxMVSWn6eRybDKky** — colour-by-type,
size-by-generality, edges-as-sentences, zoom-linked fade, all built from
Sophie's actual CSV rows. Treat it as a reference for behaviour, not as
production code (it's a single static HTML file with an inlined force-graph,
not the React/Cytoscape app).

## 1. Files Sophie provided

12 node-type files + 1 edge file, all with an `id,label,description,domain`
shape unless noted:

| File | → node type | rows |
|---|---|---|
| `physical_system.csv` | Physical system | 3 |
| `property.csv` | Property/quantity | 11 |
| `phenomenon.csv` | Phenomenon | 2 |
| `model_regime.csv` | Model/behaviour regime | 2 |
| `conditions.csv` | Conditions/assumptions | 3 |
| `formalism.csv` | Mathematical formalism | 7 |
| `equation.csv` | Law/equation | 4 — extra columns: `equation`, `variables` (JSON array of `{symbol, meaning}`), `conditions` (JSON array of strings), `representations` (JSON array of strings) |
| `method.csv` | Method/technique | 4 |
| `experiment.csv` | Experiment/evidence | 2 |
| `learning_goal.csv` | Learning goal | 11 — columns: `id,label,description` only (no `domain`) |
| `resource.csv` | Educational resource | 4 — columns: `id,label,link,mediaType,estimatedMinutes,rating,reviewCount` (no `description`/`domain`) |
| `misconception.csv` | Misconception | 1 |
| `edges.csv` | — | 59 — columns: `id,source,target,relationship` (`source`/`target` are ids from the files above) |

54 nodes total. Referential integrity is already good: no duplicate ids
across files, no edge references a nonexistent node.

## 2. Edge vocabulary actually in use

18 distinct relationship strings appear in `edges.csv`. Sentence template =
`{source label} {relationship, lightly conjugated} {target label}.` — most
relationship strings already read fine literally; a few need a small fixed
phrase around them. The full map (also implemented in
`convert_seed_data.py`, section 4):

```
strict prerequisite for   → "{s} is a strict prerequisite for {t}."
relates                   → "{s} relates to {t}."
helps understand          → "{s} helps understand {t}."
described by              → "{s} is described by {t}."
has a                     → "{s} has a {t}."
is one property of        → "{s} is one property of {t}."
is derived by             → "{s} is derived by {t}."
is derived from           → "{s} is derived from {t}."
is a condition of         → "{s} is a condition of {t}."
leads to                  → "{s} leads to {t}."
depends on                → "{s} depends on {t}."
explains                  → "{s} explains {t}."
links                     → "{s} links to {t}."
is a                      → "{s} is a {t}."
assumes a                 → "{s} assumes a {t}."
describes                 → "{s} describes {t}."
happens in                → "{s} happens in {t}."
```

This table should become the canonical `EDGE_SENTENCE_TEMPLATES` lookup in
`src/data/types.ts` (see the earlier implementation plan, Step 2) — every
edge type the app will ever render must have an entry here, and the
contributor form (Step 8 of that plan) should refuse a submission whose type
isn't in this table.

## 3. Data-quality issues to resolve before/during migration

These are things I found by cross-checking the CSVs against each other —
flag to Sophie rather than silently "fixing" them, since only she knows the
intended physics:

1. **Casing duplicate**: `"Relates"` (11 uses) and `"relates"` (1 use, edge
   `e55`) are almost certainly the same edge type. Normalize to one casing.
2. **Likely reversed edge**: `e57` (`exponentials → decay_equation`,
   `has a`) reads as "Exponentials has a Decay equation," which is backwards
   compared to the other two `has a` edges (`nucleus → half_life`,
   `nucleus → nucleon_number`, both of which read correctly). Probably
   `source`/`target` got swapped — should likely be
   `decay_equation → exponentials`.
3. **Inconsistent direction convention**: `"Is derived from"` (`e7`:
   `curvature → parallel_transport`) and `"Is derived by"` (`e39`:
   `kinetic_theory → fourteen_moment_approximation`; `e40`:
   `fourteen_moment_approximation → israel_stewart_equations`) read in
   opposite senses for what looks like the same underlying relationship.
   Worth Sophie confirming the intended direction for all three, and
   probably collapsing to a single edge type either way.
4. **Worth a second look**: `e35` (`quark_gluon_plasma → rhic`,
   `"Described by"`) — RHIC is the experimental apparatus, not obviously a
   "description" of QGP; `"Studied by"` or a dedicated
   Physical-system↔Experiment edge type might fit better.
5. **Orphan nodes**: `lg_alpha_decay_nucleons` and
   `lg_alpha_radiation_properties` (both `learning_goal`) appear in zero
   edges — no prerequisite links them to any concept. Same gap was visible
   in the original Canva mockups.
6. **`Learning goal` has no `domain` column** and **`resource` has no
   `description`/`domain`** — intentional (matches "each node type has its
   own attribute shape"), just don't let the validator require fields that
   were never meant to exist for those types.

## 4. What `convert_seed_data.py` (reference only, not in this repo) already did

A working reference implementation used to build `data/seed/graph-data.json`
— not production code, but the logic should port directly if Sophie sends
more raw CSVs in the future:

- Parses all 12 node CSVs + `edges.csv` into one merged structure.
- Handles `equation.csv`'s JSON-in-CSV cells (`variables`, `conditions`,
  `representations`) via `json.loads` per cell.
- Builds the sentence for every edge from the template table in section 2.
- Computes a **placeholder** generality/radius from node degree (in-degree +
  out-degree), since no authored generality field exists yet, with
  `learning_goal` nodes forced to the minimum radius regardless of degree
  (per Sophie's rule from the design call: "learning goals are always tiny").
  **This heuristic is a stand-in for the preview only** — production should
  use an authored `generality` field, filled in by Sophie during the same
  manual pass where she'll assign each node's final type.
- Outputs `nodes[]`, `edges[]` (each edge carrying its resolved `sentence`),
  and `typeMeta[]` (12 types with a placeholder colour and live counts) —
  exactly the shape of `data/seed/graph-data.json`.

If Sophie sends raw CSVs later, port the parsing/sentence-template logic
into a Node script under `scripts/` (matching the existing
`scripts/validate-topics.mjs` convention), reading from `data/seed/*.csv`
and emitting the same merged shape.

## 5. Suggested next steps

1. Sophie resolves the 5 items in section 3 in her own time — don't block
   the migration on it; flag them in the migrated data/docs instead of
   guessing.
2. Implement the new `GraphNode`/`GraphEdge` types + `EDGE_SENTENCE_TEMPLATES`
   (the template table in section 2 goes here verbatim).
3. Migrate `data/seed/graph-data.json` into the app's real schema location.
4. Extend `scripts/validate-topics.mjs` to also validate the new node/edge
   shape: every edge type must be in `EDGE_SENTENCE_TEMPLATES`, every node's
   `type` must be one of the 12, no dangling ids (already true for this
   dataset, but this needs to hold for every future contribution).
5. Sophie authors real `generality` values for these 54 nodes as she goes
   (the degree-based number is only a placeholder).
6. Wire node radius + zoom-linked fade into `GraphView.tsx`.
7. Everything downstream (contributor form, view migration, retiring
   `Topic`/`Subtopic`) — scope and sequence this as its own set of
   follow-up features once the base schema is live and rendering.
