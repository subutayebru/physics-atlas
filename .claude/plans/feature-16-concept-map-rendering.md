---
feature-id: 16
title: Concept map view — type colours, generality-sized nodes, sentence edges, zoom-linked fade
estimated-complexity: high
data-impact: none
---

## Context

Second stage of the migration (requires feature-15: `src/data/concepts.json`, types,
`src/graph/concepts.ts`). Renders the concept graph as its own view mode `?mode=concepts`,
next to — not instead of — the existing full map (`?mode=map`, still `topics.json`; see
feature-15 Assumptions for why the datasets coexist).

Learning flow it improves: a learner can see *what kind* of thing each concept is (equation vs.
method vs. phenomenon), how general it is (size), and read every relation as a plain sentence
("Curvature explains Gravitational lensing.") instead of an unlabeled arrow. Zooming out
leaves the general concepts; zooming in reveals specific ones and learning goals — the
reference preview's behaviour (brief intro), rebuilt on the Cytoscape stack.

No learning-goal curriculum, progress, or search here — that's feature-17.

## Critical Files

- `src/graph/typeColors.ts` — **new**, validated 12-type palette (mirrors `categoryColors.ts`)
- `src/graph/concepts.ts` — add `effectiveGenerality()` + `nodeRadius()` (single place for the
  generality fallback rule) and `neighbourIds()`
- `src/components/GraphView.tsx` — second input variant (`concepts`), concept element builder,
  concept node/edge styles, 1-hop hover for concepts, zoom-linked fade, edge sentence on hover
- `src/components/ConceptMapView.tsx` — **new** view (graph pane + glass detail card + legend +
  browse-by-type index)
- `src/components/Legend.tsx` — `variant` prop: `'category'` (default, unchanged) | `'type'`
- `src/App.tsx` — `Mode` gains `'concepts'`, URL sync, header tab
- `src/App.css` — concept card blocks (relations list, equation block), `.type-dot`, index
- `docs/DESIGN-DECISIONS.md` — Decision 13
- `scripts/smoke-test.mjs` — one concept-mode step

## Reused Patterns

- `GraphView.tsx:240-247` (`layoutFor`, dagre `rankDir: 'BT'`) — reused unchanged over *all*
  concept edges. Every `strict prerequisite for` edge therefore points upward, the one
  ordering the curriculum (feature-17) depends on; it keeps the project's layout convention
  instead of introducing a second layout engine. `cose` (built into Cytoscape, no dependency)
  is recorded as a pathway.
- `GraphView.tsx:278-361` (element build effect, `cy.destroy()` teardown at 479-485) — the
  topic element construction (280-351) is extracted verbatim into a module-level
  `topicElements(topics, expandedIds, unitPathIds)`; a sibling `conceptElements(graph,
  index)` is added. One effect, one Cytoscape instance lifecycle — GraphView stays the only
  file touching Cytoscape (CLAUDE.md).
- `GraphView.tsx:492-506` (label badge effect, title lookup via `buildTopicMap`) — changed to
  read a base `title` stored in element data at build time, so the same ★/✓ badge code serves
  both variants (feature-17 needs ✓ on concepts).
- `GraphView.tsx:517-528` (`highlightIds` → `dimmed`/`onpath`) — concept selection passes
  `highlightIds = neighbourIds(selected)` with `directionalSelect={false}`; no new selection
  classes. The transitive silver/gold tree (507-516) is *not* used for concepts: a transitive
  closure over mixed relation types ("relates" chains) is meaningless and would light half the
  graph.
- `GraphView.tsx:389-402` (hover soft/pre/post/hovered) — same classes; for the concept variant
  `n.incomers()`/`n.outgoers()` (1 hop) replace `predecessors()`/`successors()`.
- `GraphView.tsx:430-456` (hover-zoom) — gated on `n.isParent()`; concept graphs have no
  compound nodes, so it is inert without any change.
- `GraphView.tsx:537-550` (`focus` effect, `cy.animate({fit})`, reduced-motion) — index clicks
  and relation-chip clicks in the card focus the node through it.
- `src/graph/categoryColors.ts:3-17` (measured palette + comment with contrast numbers) —
  `typeColors.ts` follows the same format and the same acceptance bar.
- `MapView.tsx:143-185` + `App.css:621` (`.map-card` glass card, close button, `.cat-dot`
  `App.css:588`) and `Legend.tsx` + `App.css:498` — the concept card and legend reuse these
  classes instead of new panel styles.
- `App.tsx:14-22,72-91,171-184` (`Mode`, `initialMode`, URL sync with push/replace, header
  tabs) — `'concepts'` slots into the same switch.

## Implementation Steps

1. **`src/graph/typeColors.ts`** — `TYPE_COLORS: Record<NodeType, string>` + `TYPE_ORDER`
   (vocabulary order). Start from the seed's placeholder hues (ColorBrewer *Paired*:
   `#e31a1c #ff7f00 #ffff99 #6a3d9a #a6cee3 #1f78b4 #33a02c #b2df8a #cab2d6 #fb9a99 #fdbf6f
   #b15928`) and adjust lightness until **every** colour is ≥3:1 against both `--page`
   surfaces (dark `#070b14`, light `#f3f5fa`, `App.css:2,21`) — the pale members (`#ffff99`,
   `#a6cee3`, `#b2df8a`, `#fb9a99`, `#fdbf6f`, `#cab2d6`) will fail on light as-is. Keep
   Paired's pairing logic (related types share a hue family) where possible. Document measured
   ratios in the header comment like `categoryColors.ts:3-11`. 12 hues cannot all be CVD-safe
   pairwise — acceptable because every node has a visible text label, the legend names every
   type, and the card states the type in text; shape-per-type is a pathway.
2. **`src/graph/concepts.ts`** — `effectiveGenerality(node, degree)`: `learning_goal` → 1
   always; authored `generality` → it; else degree fallback. `nodeRadius(node, degree)`:
   `learning_goal` → 7; authored g → `8 + (g − 1) · 4` (8…24); fallback → `min(24, 7 + 5.7 ·
   √degree)` (reproduces the preview's placeholder radii: deg 1 → 12.7, deg 4 → 18.3, deg 9 →
   24). `neighbourIds(id, index)` → id ∪ direct in/out neighbours.
3. **`GraphView.tsx` props** — make `topics` optional and add `concepts?: ConceptGraph`;
   exactly one is passed (document in the prop comment; a discriminated props union is fine
   if it stays readable). Extract `topicElements(...)` with no behaviour change (verify on
   `?mode=map` before continuing).
4. **`conceptElements(graph, index)`** — nodes: `data { id, title: label, label, color:
   TYPE_COLORS[type], size: 2·radius, radius, type }`, class `concept-node`; edges: `data {
   id, source, target, sentence: edgeSentence(...) }`, class `concept-edge`. Store `title` on
   topic elements too (step 6).
5. **Concept styles** in `styleFor` (before the hover block so hover still wins): `node.concept-
   node` → `shape: ellipse`, `width/height: data(size)`, `background-opacity` ~0.55,
   `text-valign: bottom`, `text-margin-y: 4`, `text-max-width` ~140px, font 11–12;
   `edge.concept-edge.sentence-shown` → `label: data(sentence)`, `font-size` 11,
   `text-rotation: autorotate`, `text-background-color` = surface, `text-background-opacity`
   0.85, `text-background-padding` 3. New `.zoom-faded` classes: node `opacity: 0.3,
   text-opacity: 0`; edge `opacity: 0.12`. Order: `zoom-faded` before `dimmed`/`sel-*`/hover so
   an explicitly highlighted or hovered node is never invisible. Tune `layoutFor` spacing for
   circles only if labels overlap (e.g. `nodeSep` 60 for concepts) — no other layout change.
6. **Label effect** (492-506) — use `n.data('title')` instead of the topic lookup; keeps ★/✓
   behaviour for topics identical.
7. **Hover** — concept variant: 1-hop (`incomers`/`outgoers`), and add `sentence-shown` to the
   hovered node's incident edges and to a directly hovered edge (`mouseover`/`mouseout` on
   `edge.concept-edge`). No sentences shown by default (59 labels would be unreadable).
8. **Zoom-linked fade** (concept variant only) — after the initial `cy.fit`, and on `cy.on('zoom')`
   throttled with `requestAnimationFrame`: in one `cy.batch`, a node gets `zoom-faded` iff
   `radius · cy.zoom() < FADE_PX` (start at 6), an edge iff both endpoints are faded. Labels of
   non-faded nodes hide iff `radius · zoom < LABEL_PX` (start at 9) via a second class
   `label-hidden` (`text-opacity: 0`). Effect: zoomed out → learning goals (r 7) and the
   least general nodes recede first; zoom in → they return. Faded nodes stay tappable. Style
   transitions already respect the 0.3s tween; under `prefers-reduced-motion` set
   `transition-duration: 0` for these classes (check `matchMedia` once when building the
   style). Listener removed by the existing `cy.destroy()`.
9. **`ConceptMapView.tsx`** — `GraphView concepts={…} large theme highlightIds=
   {selected ? neighbourIds(selected) : null} directionalSelect={false} focus=…`. Card for the
   selected node (reuse `.map-card`): `.type-dot` + label; type label in text (from
   `NODE_TYPE_LABELS`); `domain` if present; `description`; for `equation` a block with the
   `equation` string (monospace), variables as a `<dl>`, conditions/representations as lists
   (omit empty ones); for `resource` the link (`target="_blank" rel="noreferrer"`),
   `mediaType`, minutes; **Relations**: every incident edge as its full sentence, the other
   node's label rendered as a button that selects + focuses it, outgoing and incoming grouped
   under "From this concept" / "Into this concept"; if `review` is set on the node or any shown
   edge, a small muted "Open question for the author" note (the pilot is honest about pending
   items; it's Sophie's text). Map hint when nothing is selected (reuse `.map-hint`):
   "Colour = kind of concept, size = how general it is. Hover a line to read it as a sentence.
   Zoom in for specific concepts and learning goals." **Browse by type**: a `<details>` panel
   listing all nodes grouped by type (with counts), each a `<button>` that selects + focuses —
   this is the keyboard path, since canvas nodes aren't focusable.
10. **`Legend.tsx`** — `variant="type"` renders the 12 `TYPE_ORDER` entries (dot + label) and a
    size note ("larger circle = more general"); no optional-dash entry. Default variant output
    unchanged.
11. **`App.tsx`** — `Mode` += `'concepts'`; `initialMode` maps `?mode=concepts`; URL sync
    target `?mode=concepts`; header tab "Concepts (pilot)" after "Learning goal"; the header
    `SearchBox` stays topic-based in this stage (feature-17 switches it) — hide it in concepts
    mode rather than let it jump to the topic map unexpectedly.
12. **`App.css`** — `.type-dot` (same as `.cat-dot`), relations list, equation block,
    browse index; tokens only from `:root`, no new hex values (colours come from
    `typeColors.ts`).
13. **`docs/DESIGN-DECISIONS.md`** — Decision 13: colour = node type (palette + measurement),
    size = generality with the single fallback rule, dagre-over-all-edges chosen / cose
    pathway / concentric-by-generality rejected (double-encodes generality, ignores edges),
    1-hop highlight for multi-relational graphs, sentences on hover + always in the card,
    zoom fade thresholds, shape-per-type as CVD pathway. Add a one-line note to Decision 10 that
    category colour still applies to the topic views until feature-18.
14. **`scripts/smoke-test.mjs`** — concept step (see Verification). Gates.

## Verification

- `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build` clean.
- **Regression first:** `?mode=map`, `?mode=goal&goal=cosmology`,
  `?mode=topic&id=differential-geometry` look and behave as before (category colours, ★/✓
  badges, hover-zoom on `metric`, subtopic compound nodes, `relativistic-hydro/israel-stuart`
  goal dimming).
- `?mode=concepts`: 54 circles, 59 edges (`window.__cy.nodes().length === 54`,
  `edges().length === 59`); every `strict prerequisite for` edge's target is rendered above its
  source (e.g. `linear_algebra` below `vector_space` below `parallel_transport` below
  `lg_pt_3`); learning goals are the smallest circles; `parallel_transport` (degree 9) is the
  largest.
- Hover the edge `curvature → gravitational_lensing` → label "Curvature explains
  Gravitational lensing." Hover `nucleus` → its 4 incident edges show sentences, neighbours lit,
  rest softened; mouse out → all sentence labels gone.
- Click `einstein_eq` → card shows type "Law/equation", the equation `Gμν + Λgμν = (8πG / c⁴)
  Tμν`, 6 variables, 2 conditions, 3 representations, relations incl. "Einstein Field
  Equations leads to Newtonian Gravity." and "Intro to the Einstein Field Equations (sample
  resource) helps understand Einstein Field Equations."; non-neighbours dimmed. Click the
  `Newtonian Gravity` relation button → selection + animated focus move there.
- Click `e57`'s endpoint `exponentials` → card shows the relation sentence plus the "Open
  question for the author" note. Orphan `lg_alpha_decay_nucleons` → card shows "No relations
  yet".
- Zoom out with the wheel → learning goals fade and lose labels first; zoom in → they return;
  a faded node is still clickable; hovering a faded node shows it fully.
- `prefers-reduced-motion` (DevTools rendering emulation) → fade toggles without tween.
- Light theme toggle → all 12 legend dots and node borders visibly distinct from the surface.
- **a11y:** Tab reaches the header tab, the "Browse by type" `<details>`, every node button in
  it (Enter selects + focuses), the card's relation buttons, and the close button; legend and
  card state the type in text; contrast of all type colours ≥3:1 on both surfaces (numbers in
  `typeColors.ts` header).
- Extend `npm run smoke`? **Yes** — new step: `goto ?mode=concepts`, assert 54 nodes / 59
  edges via `window.__cy`, `emit('tap')` on `einstein_eq`, wait for `.map-card`, assert the
  card text contains "leads to Newtonian Gravity". Cheap guard for the second GraphView variant,
  which is exactly where a refactor of the shared file could silently break.

## Assumptions

- Datasets coexist (feature-15). `?mode=map` keeps showing `topics.json`; the concept map is
  labelled "pilot" because it covers three pilot domains only.
- Using dagre over all edge types asserts a vertical reading for non-prerequisite edges too
  (e.g. "Curvature is one property of Spacetime" puts spacetime above curvature). Accepted for
  the pilot: it keeps prerequisite edges strictly upward and matches the project convention;
  if Sophie finds the vertical reading misleading, the `cose` pathway is a `layoutFor` change.
- No node has authored `generality` yet, so sizes come entirely from the degree fallback
  (identical to the preview). Sizes shift automatically as Sophie authors values.
- Fade/label thresholds (6 px / 9 px on-screen radius) are starting values to tune visually,
  not requirements.
- Header search is hidden in concepts mode until feature-17 makes it concept-aware (better
  than a search that silently switches datasets).
- Seed placeholder resources (`example.com`) are rendered as-is; the validator already flags
  them.
