---
feature-id: 13
title: Category colours + goal highlighting in the explorer
issue:
requires-design-assets: false
estimated-complexity: high
code-review: required
design-review: required
runtime-budget-minutes: 25
---

## Context

Two related problems:

1. **Node colour says nothing useful.** `Topic.level` (foundation/core/advanced/goal)
   is purely decorative — the dagre `BT` layout already shows the "height" in the graph,
   so the colour duplicates information that is already visible. More useful is the
   *kind* of node: is it a **physics field** (electrodynamics, cosmology),
   a **method/formalism** (Lagrangian mechanics, hydrodynamics, QFT) or a
   **mathematical concept** (linear algebra, metric, tensors)? That is the question
   learners actually have when they look at the graph.
2. **The explorer can't show a goal.** Today a learning goal (`topicId/subId`, e.g.
   `general-relativity/parallel-transport`) can only be *left* — clicking the subtopic chip
   jumps straight to the curriculum page. You never see **in the graph** what this goal
   actually requires. Yet that is exactly the page's aha moment:
   "my goal glows gold, the path to it is connected, the rest of physics steps back —
   and it's not *all* subtopics of differential geometry that are needed, only three of
   them."

After the feature: pick a goal in the explorer → goal gold, prerequisite units highlighted
at unit granularity **and connected**, irrelevant sibling subtopics stay visible but dimmed,
a CTA leads into the unchanged curriculum page.

Plus pilot content (`relativistic-hydro`), so the feature has a case at all in which an
area is needed only *partially* — placeholder texts, Sophie replaces them.

## Critical Files

- `src/data/types.ts` — `TopicLevel` out, `TopicCategory` in; `Topic.level` → `Topic.category?` (**optional**)
- `src/graph/levelColors.ts` → **rename** to `src/graph/categoryColors.ts` — `CATEGORY_COLORS/LABELS/ORDER` (4 entries incl. `uncategorized`) + `categoryOf()` fallback helper + validated palette
- `src/data/topics.json` — 34 of the 40 topics get `category`, 6 deliberately stay without, `level` goes away everywhere; new topic `relativistic-hydro`; new subtopic `metric/curvilinear-coords`
- `scripts/validate-topics.mjs:14,104` — `LEVELS` → `CATEGORIES`, change the check from "required field" to "if set, valid value"
- `src/graph/dag.ts` — new exported function `goalPathFor()` (unit closure + highlight set + auto-expand set), built on `expandedCurriculumFor()`
- `src/components/GraphView.tsx` — new props (`goalId`, `unitPathIds`), gold class `goal-node`, cross-topic **unit** edges, label badges for subtopic nodes too
- `src/components/MapView.tsx` — `goalPick` state, goal bar with CTA, auto-expand, `directionalSelect` off while a goal is picked
- `src/App.css` — `--gold` theme token, `.goal-bar`, `.level-dot` → `.cat-dot` (+ `.map-card-level`/`.topic-page-level` rename)
- `src/components/{Legend,MapView,GoalView,TopicPage,SearchBox,Home,TopicPrintSheet}.tsx` — import and field change `level` → `category`
- `content/goals/israel-stuart.md` — **don't** create (see data model: the pilot is authored inline in topics.json, otherwise duplicate-subtopic error)
- `docs/AUTHORING.md:79,93` — schema docs (`category` instead of `level`)
- `docs/DESIGN-DECISIONS.md` — new Decision 10 (colour = category; rejected alternatives as paths)

## Reused Patterns

- `highlightIds`/`dimmed`/`onpath` in `src/components/GraphView.tsx:386-395` — the dim/path pass
  already exists (used today by `GoalView.tsx:84-89`) and works purely on node IDs.
  Because expanded subtopics exist as nodes with ID `topicId/subId` (`GraphView.tsx:283`),
  this matches `UnitId` from `dag.ts:6` exactly — **no new highlight mechanism needed**,
  just a better-computed set.
- `expandedIds`/`onToggleExpand` in `GraphView.tsx:279-299` + `MapView.tsx:40-48` — compound nodes
  for subtopics already exist (today the ⊕ button, `MapView.tsx:181`). Auto-expand feeds the same state.
- `expandedCurriculumFor()` in `dag.ts:300-371` — already computes exactly the unit closure (`F`/`M`,
  `dfsClosure`, grouping by topic, `partial` flag). The new `goalPathFor()` is a thin
  adapter over it, **not a second traversal** — otherwise curriculum and map drift apart.
- Gold/silver vocabulary in `GraphView.tsx:42-47` (`gold`/`goldEdge`/`goldArrow`, light/dark separate)
  and `.ink-post` in `App.css:684` — in this project gold already means "goal/what it unlocks".
  The goal marker takes over the same hex values instead of new ones.
- `✓` label badge in `GraphView.tsx:371` — the same place gets the `★` goal badge (colour may
  never carry meaning alone, CLAUDE.md a11y rule).
- `resolveSubtopicRef()` in `dag.ts:112-124` — resolves unit refs; the new cross-topic unit edges
  use the same resolution as the internal edges in `GraphView.tsx:288-297`.
- `.legend`/`.map-card` glass-panel pattern in `App.css:494,559` (`var(--surface)`, `--border`, blur)
  — the goal bar inherits it, no new panel styles.
- `LEVEL_COLORS` module pattern (`src/graph/levelColors.ts`) — stays structurally identical
  (record + labels + order + palette comment with measured values), only the domain is swapped.
- Inline `outcomes` form for subgoals (`docs/AUTHORING.md:146`) — the pilot uses it instead of
  the Markdown path (reasoning in the data model section).

## Design Directive

**Palette (measured, not guessed).** The project's surfaces: dark `--page: #070b14`,
light `--page: #f3f5fa` (`App.css:2,19`). The existing palette was at 4.99–5.78 (dark) /
3.12–3.62 (light) and "worst adjacent CVD ΔE 13.4" (`levelColors.ts:3-5`). The new
three-colour palette holds the same bar and recycles two already-validated hex values:

| Category | Hex | Contrast dark `#070b14` | Contrast light `#f3f5fa` |
|---|---|---|---|
| `field` (green) | `#199e70` (= old `foundation`) | 5.78 | 3.12 |
| `method` (red) | `#e2574c` | 5.34 | 3.38 |
| `math-concept` (blue) | `#3987e5` (= old `core`, = `--accent`) | 5.41 | 3.34 |
| `uncategorized` (neutral) | `#7a86a0` (= the light theme's `--muted`, `App.css:24`) | 5.38 | 3.35 |

CVD distances (Machado matrices, ΔE76 in Lab): deuteranopia field/method **27.7**,
protanopia field/method **14.4** (worst pair of the palette, still better than the
13.4 of the existing one), tritanopia field/math **16.7**. All pairs in normal vision ΔE > 87.
The neutral grey sits far enough from all three and **doesn't lower the floor**:
deuteranopia neutral/field 18.9, protanopia neutral/method 34.4, tritanopia
neutral/math-concept 23.6 — so the worst pair of the four-colour palette stays at 14.4.
→ Take these exact hex values; whoever changes them must re-measure (dark ≥ 3.0, light ≥ 3.0,
worst CVD pair ≥ 13).

The neutral is deliberately **not** a new colour value but the light theme's existing
`--muted` tone: "not yet categorised" should read as a state (muted, grey), not as a fourth
content category. It still sits above 3:1 on both surfaces, so uncategorised nodes don't look
disabled or dimmed — the `dimmed` state (opacity 0.16) must stay clearly distinguishable.

Red/green is deliberately the weakest pair. Redundant channels that cover for it (all already
in the project or mandatory): a visible title label on every node, a legend with text labels,
category **text** (`CATEGORY_LABELS`) in the map card, topic page header and PDF header. An
additional shape encoding per category (Cytoscape `shape`, e.g. `cut-rectangle` for `method`)
is **deliberately not part of this feature** — shapes with `width/height: 'label'` change the
text metrics and therefore the layout; note it as an open path in DESIGN-DECISIONS so the
design reviewer can evaluate it instead of inventing it.

**Legend labels:** `field` → "Field (physics domain)", `method` → "Method & formalism",
`math-concept` → "Mathematical concept", `uncategorized` → "Not yet categorized".
Order `CATEGORY_ORDER = ['math-concept', 'method', 'field', 'uncategorized']`
(mathematical base → formalism → field, then the gap at the end). The legend thus has
**four** colour entries plus the "optional prerequisite" dash. The fourth entry is
intentional and not a construction site: it explains the grey nodes instead of leaving them
uncommented.

**Goal state (gold).** The picked goal node: 3px gold border, `background-opacity 0.4`,
gold underlay (the same hex values as `sel-post`/`hover-post`, `GraphView.tsx:45-47`), label
prefixed with `★ `. Gold is explicitly **not** a category value — it is a selection state
like `chosen`; so it still goes through classes rather than `data(color)`.

**Goal bar.** New element in `.graph-pane`, top centre (the legend sits bottom left,
`.map-hint` bottom centre — no collision risk). Glass panel like `.map-card`. Content on
one line: `★ Goal: {unit title}` · `{n} steps on this path` · button "Open curriculum →"
(primary, gold accent) · button "Clear" (tertiary). `role="status"` + `aria-live="polite"`,
so screen readers announce the goal pick; both controls are real `<button>`s, keyboard focus
visible (existing focus ring). Below 720px width: the bar wraps onto two lines
(`flex-wrap`), buttons stay ≥ 40px tall (touch target).

**Gold token.** `.ink-post` (`App.css:684`) currently has a hard-coded dark hex and
no light variant. As part of the feature: `--gold: #e6b566` in `:root`, `--gold: #b0821e`
in `:root[data-theme='light']` (the same values `GraphView.tsx:45` already picks per theme);
`.ink-post` and the goal bar use the token. Likewise `--silver` for `.ink-pre`.

## Data Model / Relations

### 1. `level` → `category` (replace, don't supplement) — and `category` is **optional**

```ts
export type TopicCategory = 'field' | 'method' | 'math-concept';
// Topic.level: TopicLevel  →  Topic.category?: TopicCategory   (OPTIONAL)
```

`TopicLevel` is deleted. Reasoning: maintaining two parallel classifications is a source of
errors for a non-dev author, and `level` carried no information that can't already be read
from the DAG height. The migration is a pure key/value swap in topics.json —
no backend, no stored user data depends on it (localStorage stores only unit IDs,
`useProgress`).

**Optionality is a deliberate content decision by Sophie**, not a transitional state:
6 of the 40 topics get no category for now ("we're not putting everything in yet"). A
required field would force her to invent assignments she doesn't stand behind content-wise
yet — exactly the kind of noise that makes the colour coding worthless. Consequences that
run through the whole code base:

- `Topic.category?: TopicCategory` — the doc comment (`types.ts:58`) says explicitly that
  omitting it is allowed and renders neutral.
- `CATEGORY_COLORS`/`CATEGORY_LABELS` are typed over `TopicCategory | 'uncategorized'`;
  every consumer reads via `topic.category ?? 'uncategorized'`. **No `!`, no
  `as TopicCategory`, no optional rendering of the dot** — the colour is never missing, it's
  just neutral. That way no consumer can produce an `undefined` lookup.
- The validator does **not** check `category` for existence, only: if set, the value must
  be one of the three allowed strings. A missing field is neither an error nor a warning
  (otherwise `npm run validate` would permanently emit 6 advisories and bury real warnings).
- A clean helper in `categoryColors.ts` keeps the fallback rule in exactly one place:
  `export const categoryOf = (t: Pick<Topic, 'category'>) => t.category ?? 'uncategorized';`
  — consumers call `CATEGORY_COLORS[categoryOf(t)]` / `CATEGORY_LABELS[categoryOf(t)]`.

Boundary rule (document in AUTHORING.md so Sophie can correct consistently):

- **`field`** — a domain of *physical phenomena* you study (electromagnetism, cosmology, condensed matter).
- **`method`** — a *formalism/tool/framework* applied across fields (Lagrangian mechanics, QFT, hydrodynamics, numerics).
- **`math-concept`** — mathematics (calculus, linear algebra, tensors, metric).

### 2. Mapping — **set by Sophie**, take it over 1:1

This is no longer a proposal: the list comes from the content author and is binding.
Anyone who disagrees on content during implementation (e.g. "electromagnetism is surely a
field") does **not** change it, but notes it in the PR/review.

**`math-concept` (blue) — 14:** `hs-math`, `calculus-1`, `multivariable-calculus`,
`differential-equations`, `linear-algebra`, `probability-statistics`, `complex-analysis`,
`differential-geometry`, `la-tensors`, `calculus-geometry`, `tangent-space`, `tensors`,
`metric`, `connection`
(Sophie's group "differential geometry & tensors" covers the whole diff-geo cluster,
i.e. `differential-geometry` itself plus its `partOf` sub-areas `tangent-space`,
`tensors`, `metric`, `connection` — as well as `la-tensors`/`calculus-geometry`, which as
sub-areas of `linear-algebra`/`calculus-1` follow the same logic.)

**`method` (red) — 12 + pilot:** `classical-mechanics`, `waves-oscillations`,
`electromagnetism`, `thermodynamics`, `statistical-mechanics`, `special-relativity`,
`general-relativity`, `quantum-mechanics`, `quantum-field-theory`, `fluid-dynamics`,
`chaos-nonlinear-dynamics`, `computational-physics`, **`relativistic-hydro`** (new, pilot)

**`field` (green) — 8:** `nuclear-particle-physics`, `atomic-molecular-physics`,
`plasma-physics`, `condensed-matter`, `astrophysics`, `black-holes-gravitational-waves`,
`cosmology`, `quantum-computing`

**Without a `category` field — 6:** `lagrangian-mechanics`, `optics`, `standard-model`,
`quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`

For these six the field is **omitted** — no `"category": null`, no
`"category": ""`, no `"uncategorized"` in the data. `'uncategorized'` exists only as a
render fallback in the code (colour + label), never as a value in topics.json; otherwise
there would be two spellings for the same state and the validator would have to know both.

Readable consequence of the mapping logic (helps during review): Sophie draws the line
between *a domain of phenomena you explore* (`field` — mostly the upper, ambitious
goals) and *a framework/toolkit you master* (`method` — including the classic course
subjects like electromagnetism and thermodynamics). The graph thereby gets a visible
layering: red method middle, green goal peaks, blue maths base.

### 3. Pilot content — why inline in topics.json, not as `content/goals/*.md`

The Markdown path (`scripts/compile-content.mjs`) can do only two things: a goal subtopic
(`# … {id: topicId/subId}`) and prerequisite bullets, which **always create new subtopics in
the referenced area**. Two hard constraints follow:

1. A bullet with `{id: viscous}` under `### … {ref: relativistic-hydro}` would create a
   *second* `viscous` next to the hand-written one — `loadGraph.ts:24` appends
   generated subtopics additively, and the validator (`validate-topics.mjs:125`) throws
   "duplicate subtopic id". Hand-written and generated subtopics of the **same** topic
   therefore must not overlap.
2. Bare topic refs (`"fluid-dynamics"` as a prerequisite of a subtopic, `dag.ts:121-122`)
   can't be expressed in the Markdown format at all — every bullet creates a unit.

Constraint 2 is decisive: `fluid-dynamics` and `special-relativity` must **not** be
annotated. Both are unannotated today and have dependents
(`plasma-physics`, or `general-relativity`, `nuclear-particle-physics`,
`quantum-field-theory`). If we annotated them with one or two placeholder learning goals,
all of special relativity would shrink down to exactly that one placeholder learning goal in
**existing** curricula (Cosmology, Black Holes, …) (`buildUnitGraph`,
`dag.ts:163-169`: unannotated topics depend on *all* subtopics of annotated prereqs).
That would be a real regression. So: coarse topic refs for these two, fine unit refs
only in areas that are **already** annotated (`la-tensors`, `metric`).

### 4. New topic `relativistic-hydro` (topics.json, at the end of the `topics` list)

```json
{
  "id": "relativistic-hydro",
  "title": "Relativistic Hydrodynamics",
  "category": "method",
  "description": "Placeholder — Sophie will add real content. Fluid dynamics for matter moving at speeds where relativity matters (heavy-ion collisions, neutron-star mergers).",
  "prerequisites": ["fluid-dynamics", "special-relativity", "differential-geometry"],
  "featured": false,
  "content": [],
  "subtopics": [
    {
      "id": "basics",
      "title": "Relativistic fluid basics (placeholder)",
      "description": "Placeholder — Sophie will add real content.",
      "prerequisites": ["fluid-dynamics", "special-relativity", "la-tensors/einstein"]
    },
    {
      "id": "viscous",
      "title": "Viscous & dissipative flow (placeholder)",
      "description": "Placeholder — Sophie will add real content.",
      "prerequisites": ["basics", "metric/curvilinear-coords", "la-tensors/vec-dual-operators"]
    },
    {
      "id": "israel-stuart",
      "title": "Israel-Stewart theory (placeholder)",
      "description": "Placeholder — Sophie will add real content. The second-order theory that repairs acausal first-order viscous hydrodynamics.",
      "prerequisites": ["viscous", "metric/metric-under-coords", "la-tensors/dual-transforms"],
      "outcomes": [
        { "id": "first-order-problem", "text": "Placeholder — explain why first-order viscous hydrodynamics is acausal." },
        { "id": "relaxation", "text": "Placeholder — write down the relaxation equations for the dissipative currents.", "needs": ["first-order-problem"] },
        { "id": "apply", "text": "Placeholder — apply the theory to a simple expanding flow.", "needs": ["relaxation"] }
      ]
    }
  ]
}
```

New hand-written subtopic in `metric` (doesn't exist yet; `metric` is already
annotated via `content/goals/parallel-transport.md`; hand-written + generated mix
without conflict here because the IDs are disjoint):

```json
{ "id": "curvilinear-coords",
  "title": "Set up curvilinear coordinates and their basis vectors. (placeholder)",
  "prerequisites": ["metric-viewpoints"] }
```

**Resulting unit closure for the goal `relativistic-hydro/israel-stuart`** (this is the
demo case on which QA checks the feature):

- `relativistic-hydro`: `israel-stuart`, `viscous`, `basics` (all 3 → full)
- `fluid-dynamics`, `special-relativity`: one **whole** topic unit each
- `la-tensors`: all 6 learning goals (via `duals` it pulls in the base)
- `metric`: `curvilinear-coords`, `metric-viewpoints`, `metric-under-coords`, `raise-lower`
  — **`lengths-angles-volumes` stays out** → exactly the required case "expanded
  topic, irrelevant sibling subtopic stays dimmed"
- **not** in the closure: `differential-geometry` itself (only a structural topic edge),
  `connection`, `tangent-space`, `tensors`, and the remaining 30+ topics → dimmed

### 5. Cross-topic unit edges (otherwise the path falls apart into islands)

Today `GraphView` draws edges only at **topic** level (`GraphView.tsx:260-272`) plus
topic-**internal** subtopic edges (`:286-298`). So the edge `metric/curvilinear-coords →
relativistic-hydro/viscous` doesn't exist at all — `metric` and `la-tensors` would stand as
highlighted *islands* with no connection to the goal (topologically they hang off
`differential-geometry → connection`, and that is dimmed because it isn't needed).
That makes "connected" from the backlog a real code requirement: with an active goal path,
GraphView additionally draws edges between units of the closure, where an endpoint whose
parent isn't expanded falls back to the topic node.

## Implementation Steps

1. **`src/data/types.ts`** — delete `TopicLevel`, add `export type TopicCategory = 'field' | 'method' | 'math-concept';`,
   `Topic.level` → `category?: TopicCategory` (**optional**). Doc comment `:58`:
   "What kind of node this is — drives node color and the legend. Optional: topics Sophie
   has not classified yet render in a neutral grey."
2. **`git mv src/graph/levelColors.ts src/graph/categoryColors.ts`**; switch the content to
   `CATEGORY_COLORS` / `CATEGORY_LABELS` / `CATEGORY_ORDER`, each with the
   fourth entry `uncategorized` (values, labels and order from the design directive).
   Typing: `Record<TopicCategory | 'uncategorized', string>`. Also export the helper
   `categoryOf(t)` (fallback rule in exactly one place, see data model).
   Replace the palette comment with the **measured** numbers (dark/light contrasts of all
   four, worst CVD ΔE 14.4 protanopia field/method, neutral stays above) — keep the format
   of the existing comment `levelColors.ts:3-5`, plus one sentence on why the neutral is the
   `--muted` tone and must not be darker (distinction from `dimmed`).
3. **`scripts/validate-topics.mjs`** — `:14` `const CATEGORIES = ['field', 'method', 'math-concept'];`
   (remove `LEVELS`). `:104` changes from a required check to a value check:
   `if (t.category !== undefined && !CATEGORIES.includes(t.category)) errors.push(…)`.
   **A missing field is neither an error nor a warning.** Add a comment there so nobody
   "fixes" the check later: omitting it is a content decision.
4. **`src/data/topics.json`** — remove `"level": …` from all 40 topics. The 34 topics
   classified by Sophie get `"category": …` at the same field position (values from the
   mapping in data model §2), the new `relativistic-hydro` gets `"category": "method"`. The
   **six** topics `lagrangian-mechanics`, `optics`, `standard-model`,
   `quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`
   get **no** `category` field at all (not `null`, not `""`).
5. **`docs/AUTHORING.md`** — switch example `:79` and field table `:93` to `category`:
   the three boundary rules from the data model section, plus explicitly "**optional** —
   leave the field out as long as you're not sure; such topics appear neutral grey with the
   legend entry *Not yet categorized*, and the validator won't complain. Adding it later is a
   one-word diff." In the subtopics section, add that hand-written subtopics of a topic must
   not share IDs with those generated from `content/*.md` (duplicate error).
6. **Switch consumers** — rename **plus** undefined safety via `categoryOf()`:
   `Legend.tsx:1-11` (iterates `CATEGORY_ORDER`, and thereby gets the fourth entry
   automatically), `MapView.tsx:11,94,127,132`, `GoalView.tsx:11,147,205,314`,
   `TopicPage.tsx:14,87,132,255`, `SearchBox.tsx:2,18,31,38,107`, `Home.tsx:2,39`,
   `TopicPrintSheet.tsx:3,27`, `GraphView.tsx:6,258,283`
   (`color: CATEGORY_COLORS[categoryOf(t)]` — applies to the topic node **and** subtopic
   nodes; subtopics inherit the parent topic's colour as before). In `SearchBox` the
   result field `level: TopicLevel` → `category?: TopicCategory`; `:38` (subtopic hit)
   still inherits from the parent topic. No `!` or cast anywhere — where a category is
   missing, the fallback kicks in; the dot never disappears.
7. **`src/App.css`** — add `--gold`/`--silver` tokens in both themes, switch `.ink-pre`/`.ink-post`
   (`:679-687`) to the tokens; `.level-dot` → `.cat-dot` (`:518`, `:961` + all
   TSX usages), `.map-card-level` → `.map-card-category`, `.topic-page-level` → `.topic-page-category`.
   No "level" remains in the vocabulary.
8. **`src/graph/dag.ts`** — new function, placed below `expandedCurriculumFor`:

   ```ts
   export interface GoalPath {
     /** Units on the path (incl. the goal itself) — cytoscape node ids when expanded */
     units: Set<UnitId>;
     /** units ∪ their parent topic ids — the GraphView highlight set */
     highlight: Set<string>;
     /** Annotated topics contributing ≥1 unit — auto-expand these */
     expand: Set<string>;
   }
   export function goalPathFor(goalRef: UnitId, topics: Topic[]): GoalPath
   ```

   Implement exclusively via `expandedCurriculumFor(goalRef, topics)`: iterate over all
   groups, `units` = all `g.units[].unit.id`, `highlight` = `units` **plus**
   `g.topic.id` (mandatory — otherwise GraphView dims the compound parent and with it all
   topic edges of the path), `expand` = `g.topic.id` for groups with `g.topic.subtopics?.length`.
   No traversal of its own — curriculum and map must see the same closure.
9. **`GraphView.tsx` — new props** in `GraphViewProps` (`:10-34`), both optional and
   off by default, so `GoalView` keeps working unchanged:
   - `goalId?: string | null` — the gold-marked goal node (unit or topic ID)
   - `unitPathIds?: Set<string> | null` — units between which cross-topic unit edges are
     drawn
10. **`GraphView.tsx` — gold style**: insert selector `node.goal-node` after `node.chosen` (`:76-85`)
    and before the `sel-*` rules: `border-width: 3.5`, `border-color: gold`,
    `background-opacity: 0.4`, `underlay-color: gold`, `underlay-opacity: 0.25`,
    `underlay-padding: 10`, `font-weight: bold`, `z-index: 5` (`gold` = the theme variable
    already computed in `styleFor` `:45`).
11. **`GraphView.tsx` — label/badge pass** (`:367-373`): the loop currently skips
    subtopic nodes (`topics.find(t => t.id === n.id())` → `return`). Rework it to use
    `parseUnitId(n.id())` + `buildTopicMap` (once outside the loop, instead of `find` per
    node); title = subtopic title for a `subId`, otherwise topic title; label =
    `${isGoal ? '★ ' : ''}${isDone ? '✓ ' : ''}${title}`. Add `goal-node` to the `removeClass` list
    in `:366` and set `cy.$id(goalId).addClass('goal-node')` in the non-`directionalSelect` branch
    (after the `highlightIds` pass, so gold isn't dimmed).
12. **`GraphView.tsx` — cross-topic unit edges** in the element build (after the
    compound block `:299`): if `unitPathIds` is set, for each unit in it iterate over the
    `buildUnitGraph(topics)` prerequisites; endpoint ID = the unit itself if its node exists
    (topic without subtopics, or parent in `expandedIds`), otherwise the parent topic ID.
    Skip self-edges and edges whose two ends land on the same node; deduplicate IDs via a
    `Set` and separate them from the topic edge scheme (`${p}->${t.id}`) with a `~u` suffix.
    Add `unitPathIds` to the build effect's dependency list (`:359`). The new edges get
    `onpath` automatically from the existing edge pass (`:390-394`), because both endpoints
    are in the highlight set.
13. **`MapView.tsx` — state + derivations**:
    - `const [goalPick, setGoalPick] = useState<string | null>(null)`
    - `const goalPath = useMemo(() => (goalPick ? goalPathFor(goalPick, topics) : null), [goalPick, topics])`
    - Auto-expand without fighting the existing toggle: a `useEffect` on `goalPath` that
      merges the not-yet-open IDs from `goalPath.expand` into the `expandedIds` state and
      remembers in an `autoAddedRef` which ones it added; on the next goal change/clear,
      **exactly these** are removed again. Manual ⊕/double-click toggles
      stay untouched that way.
14. **`MapView.tsx` — GraphView wiring**: `highlightIds={goalPath?.highlight ?? null}`,
    `unitPathIds={goalPath?.units ?? null}`, `goalId={goalPick}`,
    **`directionalSelect={goalPick === null}`** — critical: as long as `directionalSelect` is
    on, GraphView ignores `highlightIds` completely (`:374-396`). Without a goal, today's
    silver/gold click behaviour stays unchanged.
15. **`MapView.tsx` — goal-pick entry points** (all only set `goalPick`, **no**
    mode switch any more):
    - Subtopic card `:112` — "Focus this path →" becomes `★ Show this path` → `setGoalPick(selectedId!)`
    - Subtopic chips `:171-179` — `onMakeGoal(...)` → `setGoalPick(...)`; change heading `:169`
      to "Learning goals — pick one to light up its path"
    - Topic card `:222` "Full curriculum →" stays as it is (direct navigation, deliberately
      kept as a shortcut)
16. **`MapView.tsx` — goal bar** (new, in `.graph-pane` before `<Legend/>`), visible only when
    `goalPick` is set: `role="status" aria-live="polite"`; title of the goal unit (via `parseUnitId`
    + `map`, the same pattern as `:50-54`), step count from `goalPath.units.size`, button
    "Open curriculum →" → `onMakeGoal(goalPick)` (App switches to `mode=goal`, `App.tsx:104`
    — GoalView itself stays untouched), button "Clear" → `setGoalPick(null)`.
    Show `.map-hint` (`:82-87`) only when neither a topic is selected **nor** a goal is picked.
17. **`src/App.css`** — `.goal-bar`, `.goal-bar-title`, `.goal-bar-count`, `.goal-bar-open`,
    `.goal-bar-clear` after the `.legend` block (`:494`); take the panel values from `.map-card`/`.legend`,
    accent via `var(--gold)`, `flex-wrap` for < 720px (media-query block from `:1781`).
18. **Pilot content**: add `relativistic-hydro` and `metric/curvilinear-coords` to `topics.json`
    as in the data model section. No new Markdown file.
19. **`docs/DESIGN-DECISIONS.md`** — "Decision 10 — Node color encodes category, not altitude
    (2026-08-30)": the decision, the measured four-colour palette, and the deliberate
    optionality of the field (incomplete classification is a valid state, not a
    migration leftover). As paths kept open: (a) shape encoding per category as a
    redundant CVD channel, (b) `level` can be reactivated as an optional extra field if the
    altitude info turns out to be needed after all, (c) fine unit highlights in GoalView too
    (it still uses the coarse `ancestorsOf` today, `GoalView.tsx:84-89`), (d) further categories
    (e.g. `application`), if the grey nodes turn out to be a group of their own rather than a
    gap.
20. **Gates**: `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build`.

## Verification

- `npm run validate` → `✓ topics.json valid — 41 topics, 54 subtopics, 35 subgoals, …`
  (today: 40 / 50 / 32; +1 topic, +3 subtopics in `relativistic-hydro`, +1 in `metric`,
  +3 placeholder subgoals),
  **0 errors**. Expected *new* advisory warning (not an error): `⚠ topic "relativistic-hydro":
  topic-level prerequisite "differential-geometry" is not referenced by any subtopic` —
  the edge is there on purpose, so that the fine refs to `metric`/`la-tensors` lie within
  the transitive prerequisites. No *other* new warnings; in particular no
  `duplicate subtopic id`, no `"…" has subtopics — pick a specific one` and **not a
  single message about the six topics without `category`** (neither error nor ⚠).
- `npx tsc -b` clean (catches every forgotten `t.level` **and** every unguarded
  `category` lookup, since the field is optional), `npm run lint` clean, `npm run build` clean.
- **Optionality gate**: `grep -c '"category"' src/data/topics.json` → **35**
  (34 existing + `relativistic-hydro`); `grep -c '"level"' src/data/topics.json` → 0;
  no `"category": null` and no `"uncategorized"` in topics.json.
- `npm run dev` → `http://localhost:5173/?mode=map` loads without console errors.
- **Colours**: the legend shows **four** colour entries in the order Mathematical concept /
  Method & formalism / Field (physics domain) / Not yet categorized, plus "optional
  prerequisite". Spot check: `linear-algebra` blue, `electromagnetism` **red** (method,
  not field — Sophie's assignment), `cosmology` green, `optics` and `lagrangian-mechanics`
  neutral grey. Theme toggle (☀/🌙) → all four stay readable in both themes, and the
  grey nodes are clearly distinguishable from `dimmed` nodes (compare the latter with an
  active goal path).
- **Uncategorised in the UI**: `?mode=topic&id=optics` shows the text
  "Not yet categorized" in the header (no empty paragraph, no "undefined"); searching for
  "optics" shows the grey dot; the PDF view of an uncategorised topic shows the same label.
- **Goal path (main flow)**: search `relativistic` in the header search → map centres on
  `relativistic-hydro`; click the node → card; in the "Learning goals" block click
  *Israel-Stewart theory*. Expected:
  1. The goal bar appears at the top with `★ Goal: Israel-Stewart theory (placeholder)` + step count.
  2. `relativistic-hydro`, `metric` and `la-tensors` are expanded as compound boxes.
  3. The `israel-stuart` node is gold and carries `★` in its label.
  4. `metric/lengths-angles-volumes` is visibly **dimmed**, while
     `metric/curvilinear-coords`, `metric/metric-viewpoints`, `metric/raise-lower`,
     `metric/metric-under-coords` are highlighted.
  5. There are visible `onpath` edges from `metric/curvilinear-coords` and
     `la-tensors/vec-dual-operators` to `relativistic-hydro/viscous` (no islands),
     as well as from the topic nodes `fluid-dynamics` and `special-relativity` to
     `relativistic-hydro/basics`.
  6. Uninvolved topics (`cosmology`, `thermodynamics`, `connection`, `differential-geometry`)
     are dimmed.
- **CTA**: "Open curriculum →" → `?mode=goal&goal=relativistic-hydro%2Fisrael-stuart`,
  sidebar title "Curriculum — Israel-Stewart theory (placeholder)", the three placeholder
  subgoals as checkboxes, group *Metric* with `only: …` and without "Compute lengths, angles,
  and volumes".
- **Clear**: back on the map, "Clear" → dimming gone, the topics opened automatically by the
  goal are closed again, topics opened manually by double-click stay open, and the
  silver/gold click behaviour (`directionalSelect`) works again.
- **No regression**: `?mode=goal&goal=cosmology` — curriculum length and order
  identical to before (SR/fluid dynamics still appear as whole topics);
  `?mode=goal&goal=general-relativity/parallel-transport` unchanged; topic page
  (`?mode=topic&id=metric`) shows the new placeholder learning goal; PDF print view
  (Download PDF) shows the category label instead of the level label in its header.
- **a11y/responsive**: goal bar reachable by keyboard, both buttons focusable,
  `aria-live` announces the goal pick; at 375px width the bar wraps and covers neither
  the legend nor the map card; the category also appears everywhere as **text** (map card,
  topic page, legend, PDF), never only as colour.

## Assumptions

- **`level` is removed without replacement** rather than maintained alongside `category`. If
  the altitude information is wanted after all, it comes back as an optional field — noted
  as a path in DESIGN-DECISIONS.
- **The category mapping is set, not guessed** — it comes from Sophie (data model §2)
  and is taken over 1:1. Even the assignments that are surprising at first glance
  (`electromagnetism`, `thermodynamics`, `waves-oscillations`, `classical-mechanics` as
  `method`) are intended: Sophie separates "tools you master" from
  "a domain of phenomena you explore". Don't adjust them during implementation.
- **The six topics without `category` are a deliberate content gap, not a TODO and
  not an error.** `lagrangian-mechanics`, `optics`, `standard-model`,
  `quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`
  render neutral grey with the legend entry "Not yet categorized". Neither the validator nor
  QA may report this as a deficiency; Sophie fills them in step by step.
- **`'uncategorized'` is a pure render state**, not a data value: it exists in
  `CATEGORY_COLORS`/`CATEGORY_LABELS`/`CATEGORY_ORDER` and in the `categoryOf()` fallback, but
  never in topics.json. That leaves exactly one spelling for "not classified"
  (field missing), and the validator needs no special cases.
- **The neutral tone is `#7a86a0`**, the light theme's existing `--muted` value — deliberately
  light enough (5.38 dark / 3.35 light) that uncategorised nodes don't look disabled
  or dimmed. Darkening it would collide with the `dimmed` state.
- **Pilot content is authored inline in topics.json, not as `content/goals/*.md`** —
  reasoned in the data model section (duplicate-subtopic collision + bare topic refs can't be
  expressed in the Markdown format). If Sophie later wants to maintain `relativistic-hydro`
  in Markdown, the hand-written subtopics have to come out first.
- **`fluid-dynamics` and `special-relativity` stay unannotated.** `relativistic-hydro/basics`
  therefore depends on the *whole* topics rather than on "Euler/Lagrange formalism" or
  "Lorentz invariance" — those subtopics don't exist, and creating them just for the pilot
  would shrink existing curricula. TODO note in AUTHORING: once Sophie annotates these
  topics, replace the coarse refs with the specific ones.
- **"Coordinate transformations" and "vectors as differential operators"** from the backlog
  already exist as `la-tensors/dual-transforms` and `la-tensors/vec-dual-operators`
  (compiled from `content/goals/parallel-transport.md`) — they are reused rather than
  duplicated. Only "curvilinear coordinates" is missing and is created as
  `metric/curvilinear-coords`.
- **The gold marker is pure UI state** (`MapView`), not persisted in the URL or localStorage.
  A reload loses the goal pick; the durable goal is still `?mode=goal&goal=…`.
- **No auto-zoom** to the goal after picking: the graph rebuild caused by auto-expand
  does a `fit()` anyway. If live QA reports that as confusing, the `focus` prop path
  (`GraphView.tsx:403-416`) is the intended retrofit hook.
- **GoalView stays unchanged**, even though its highlight still uses the coarse `ancestorsOf`.
  Bringing the fine variant there is a feature of its own (noted as a path); otherwise this
  one grows beyond reviewability.
- **No shape encoding per category** in v1 (layout risk from `width/height: 'label'`);
  the red/green CVD weakness is covered by labels, the legend and the category text.
