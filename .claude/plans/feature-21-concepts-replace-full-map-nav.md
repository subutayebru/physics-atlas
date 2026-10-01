---
feature-id: 21
title: Concepts takes the Full Map's place in navigation
estimated-complexity: low
data-impact: none
---

## Context

The concept map (`?mode=concepts`, feature-15/16/17) is now the map experience the user wants
learners to land on. Today the two prominent "go explore" entry points, the header's first tab
("Full map") and Home's "Explore the full map" button, open the topic DAG (`?mode=map`), and
the concept map sits last in the tab bar as "Concepts (pilot)". After this change, a learner
who clicks "explore" or the first header tab lands on the concept map. The topic full map
(`MapView`) stays in the codebase unchanged and still works through its direct URL
(`?mode=map`, legacy alias `?mode=explore`). It just has no tab or Home button for now. The user
may want it back later, so restoring it should be a one-line revert.

This is a navigation change only. `?mode=goal` and `?mode=topic` keep using `topics.json`.
It does **not** resolve feature-18. The user has said the topic model stays.

## Critical Files

- `src/App.tsx`: header `mode-tabs` (205-224) and the Home `onExplore` prop (232). Nothing
  else in this file changes.
- `src/components/Home.tsx`: button label at 46-47 (`Explore the full map`).
- `docs/AUTHORING.md`: lines 9 and 184 name the "Concepts (pilot)" tab.
- `docs/DESIGN-DECISIONS.md`: Decision 3 table (line 39). Add a new current row and keep the
  old one as a reachable pathway (that file never deletes options).
- `scripts/smoke-test.mjs`: one nav assertion (see Verification).

Explicitly **not** touched: `MapView.tsx`, `GraphView.tsx`, `dag.ts`, `categoryColors.ts`,
`topics.json`, `TopicPage.tsx`, `SearchBox.tsx`, `App.css`, and `initialMode()`
(`App.tsx:21-28`).

## Reused Patterns

- `App.tsx:21-28` (`initialMode()`): already maps `map`/`explore` → `'map'` and `concepts` →
  `'concepts'`. This is what keeps `?mode=map` reachable by direct URL, so it needs no
  change and no new "hidden route" mechanism.
- `App.tsx:93-114` (URL sync effect): `setMode('concepts')` with `conceptGoal === null` already
  writes `?mode=concepts` (line 103 fallback). With a goal set it writes
  `?mode=concepts&goal=…` (101-102). The new entry points get correct URLs and history
  entries for free.
- `App.tsx:194-204` (header SearchBox switch on `mode === 'concepts'`): the concept search was
  wired in feature-17 and keys off `mode`, not tab position. Moving the tab changes nothing
  here. When someone reaches `?mode=map` by URL, the topic SearchBox still renders and
  `headerSearchPick` (162-181) still focuses topic nodes in MapView.
- `App.tsx:218-223` (existing concepts tab button): moved to the first slot and relabeled,
  not rebuilt. Same `mode-tab` / `mode-tab-active` classes (`App.css:361,380`), so no style
  work.

## Implementation Steps

1. **`App.tsx` header nav (205-224):** delete the "Full map" `<button>` (206-211). Move the
   concepts button to the first position, so the order is the concept map and then
   "Learning goal". Relabel it from `Concepts (pilot)` to `Concept map` (see Assumptions).
   Leave the `Mode` union (19) as is, with `'map'` still a member. When `mode === 'map'`
   (direct URL), no tab is active. That's intended and needs no extra handling.
2. **`App.tsx` Home (232):** change `onExplore={() => setMode('map')}` to
   `onExplore={() => setMode('concepts')}`. Don't reset `conceptGoal`. The header tab doesn't
   either, so both entry points behave the same: a concept goal picked earlier in the
   session is kept.
3. **`Home.tsx:47`:** change the label from `Explore the full map` to
   `Explore the concept map`. "Full map" would now describe a view the button no longer opens.
4. **Leave alone, on purpose (decision, not oversight):**
   - `homeSearchPick` (`App.tsx:147-157`, `setMode('map')` at 153). Home's hero search
     indexes **topics** (`Home` gets `topics={data.topics}`), and a topic id can't be
     centered on the concept map, because the id spaces differ. Its only graph target is
     MapView. This is a contextual deep link, not navigation, and the backlog names only the
     tab and the Explore button.
   - `TopicPage` "Show on map" (`TopicPage.tsx:146-147`, wired at `App.tsx:272-275`). Same
     reason: it centers a topic id, which only MapView knows.
   - Result: the old map has no *nav* entry point but is still reachable through these two
     topic-scoped deep links. Both land on a working MapView with no active tab. See
     Assumptions for the follow-up option.
5. **`docs/AUTHORING.md:9,184`:** replace `"Concepts (pilot)" tab` with `"Concept map" tab`.
   The "pilot" wording about the *dataset* (section heading "Concept graph (pilot)") stays.
   Only the tab name changed.
6. **`docs/DESIGN-DECISIONS.md` Decision 3:** add a new top row, "**Home → Concept map → Goal**
   (2026-10-01)", ✅ Current. It says that Home's Explore button and the first header tab open
   `?mode=concepts`, and that the topic full map is hidden from nav but kept at `?mode=map`.
   Change the existing "Home → Map → Goal" row's status to `↩ pathway` with the note "topic
   full map still at `?mode=map` (alias `explore`); restore by re-adding the tab + pointing
   `onExplore` back". Delete nothing.
7. **`scripts/smoke-test.mjs`:** add one short block (next to the existing concept section,
   around 279). It loads `/`, clicks `.home-explore`, asserts that `location.search` starts with
   `?mode=concepts` and that `window.__cy` has 54 nodes. Then it asserts that
   `.mode-tab` texts don't include "Full map" and that the first tab is the active one in
   concepts mode. Keep the existing `?mode=explore` step (48), because it now doubles as the
   "old map still works by URL" regression check.

## Verification

- `npm run validate`, `npm run build`, `npm run lint` clean.
- `/` (Home): the button reads "Explore the concept map". Clicking it lands on
  `?mode=concepts` with the concept graph (54 nodes). Browser Back returns to Home.
- Any non-home view (e.g. `?mode=goal`): the header shows two tabs, "Concept map" first and
  then "Learning goal", with no "Full map". Clicking "Concept map" opens `?mode=concepts`, the
  tab shows `mode-tab-active`, and the header search placeholder reads "Search concepts…".
- Header search in concepts mode: type "einstein", press Enter, and the node is selected and
  centered (feature-17 behavior, unchanged).
- `?mode=map` and `?mode=explore` by direct URL: the topic full map renders exactly as
  before. Neither tab is highlighted, and the topic header search still centers topics.
- `?mode=topic&id=quantum-mechanics` → "Show on map" still opens MapView centered on Quantum
  Mechanics (deliberately unchanged).
- Home hero search with a topic (e.g. "quantum" + Enter) still lands on MapView centered on
  the hit (deliberately unchanged).
- a11y: the tab bar keeps working by keyboard (Tab and Enter on two buttons, visible focus from
  the existing `.mode-tab` styles). The labels are visible text and the contrast is unchanged
  because the classes are reused.
- Extend `npm run smoke`? **Yes.** One block (step 7). The nav entry points are the whole
  feature and are cheap to assert, and the existing `?mode=explore` step covers the
  "still reachable by URL" half.

## Assumptions

- **Remove, don't repoint.** The "Full map" tab is removed, and the existing concepts tab moves
  into its slot. Repointing the "Full map" button to concepts would leave two tabs opening the
  same view.
- **Label: "Concept map"** (drop "(pilot)"). It's now the primary map in nav, and calling the
  default experience a pilot is confusing. "Concept map" also keeps the "map" mental model the
  old first tab had. If the user prefers "Concepts" or "Map", it's a one-string change (plus
  the AUTHORING mentions).
- **Topic-scoped deep links still go to MapView** (`homeSearchPick`, TopicPage "Show on
  map"). The backlog names only the tab and the Explore button, and concept ids can't
  resolve topic ids. Possible follow-up (not in scope): send topic hits from the Home search
  to `openTopic` (topic page) instead, which would remove the last casual route into the
  hidden map. Leave this for the user to decide.
- `conceptGoal` is not reset by either entry point, matching how the tab already behaves.
- No README screenshot changes (`README.md:13` shows the topic map). Screenshots are
  user-supplied assets.
