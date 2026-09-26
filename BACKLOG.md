# Physics Atlas — Backlog

> Format: `- [ ] feature-N: {title} — {description}` in `## Open`. The committer
> ticks entries off to `[x]` on success — it does NOT move them between Open/Done.

## Brainstorm Focus

Focus on learning UX around the prerequisite graph (curriculum, progress,
orientation in the graph) and a11y polish. Don't invent new physics content
— Sophie curates content via topics.json.

## Open

- [x] feature-1: Progress tracking — topics in the curriculum can be ticked off (localStorage), progress % per learning goal in the sidebar header, completed nodes subtly marked in the graph (check badge, not just colour).
- [x] feature-2: Topic search — search box in the header; a hit selects the topic in the active view and centres the graph on it. (In goal mode, a topic outside the current subgraph becomes the new learning goal.)
- [x] feature-3: Content-type filter — filter by book/video/course in the sidebar/detail; filter row above the resource list.
- [ ] feature-4: Fuzzy search — search tolerates typos ("cosmolgy") and also matches topic descriptions, not just titles. Small in-house implementation (e.g. bigram score), no new dependency without a plan.
- [x] feature-5: Curriculum export/print view — printable syllabus view of the current learning goal (ordered topics + resources + notes), via a CSS print stylesheet or its own route; button in the goal sidebar.
- [ ] feature-6: Progress on home goal chips — each featured goal chip on the home page shows its progress (ring or % badge) from localStorage.
- [ ] feature-7: Map zoom controls — floating +/−/fit buttons on the full map (glass style like map-card), for users without a scroll/pinch habit.
- [x] feature-13: Category colours + goal highlighting in the explorer — node colour switches from `level` (foundation/core/advanced/goal, purely decorative) to `category`: field=green, method=red, math-concept=blue (reclassify all 40 topics, Sophie reviews the mapping). In the explorer map (mode=map) a subtopic learning goal (promotable subgoal) can be picked directly as the target: the target is marked gold (dynamic state, not a category colour), relevant prerequisite units (`buildUnitGraph`/`expandedCurriculumFor`, unit granularity) are connected/highlighted, everything else dims (reuse the existing `highlightIds`/`dimmed` pattern from GoalView); target topics auto-expand to their relevant subtopics (reuse the existing `expandedIds`/⊕ toggle, but mark only relevant subtopics). A CTA leads into the existing curriculum page (GoalView, unchanged). Pilot content: new topic `relativistic-hydro` (subtopics `basics`, `viscous`, learning goal `israel-stuart`) as a placeholder skeleton wired under fluid-dynamics/special-relativity/differential-geometry — Sophie replaces the placeholder texts with real content.

- [x] feature-14: Topic cleanup + subtopics visible by default + hover zoom in the explorer — 6 uncategorised topics (lagrangian-mechanics, optics, standard-model, quantum-gravity-frontiers, stellar-astrophysics, galaxies-large-scale-structure) are removed completely from topics.json (not just hidden), including cleanup of affected prerequisites/optionalPrerequisites (general-relativity, quantum-field-theory, quantum-mechanics, black-holes-gravitational-waves, cosmology — 4 curricula get one step shorter as a result, deliberately accepted). Annotated topics (7 of 35) now show their subtopics open by default on the full map instead of collapsed (the ⊕/⊖ toggle stays for manual expand/collapse). New: hovering a topic with subtopics (only before a goal is picked) smoothly zooms/pans the viewport to topic+subtopics (the rest of the map stays visible), a pure viewport operation (`cy.animate({fit})`), no re-layout, respects `prefers-reduced-motion`.

## Client feedback (2026-07-20) — deferred

- [ ] feature-8: Interactive simulations — new content type `simulation` + optional `codeUrl` field ("what the code does"); pilot: link the Franck–Hertz applet on Quantum Mechanics. Later: in-page embedding. Ref: https://mintapps.org/html/mint-franckhertz.html
- [ ] feature-9: Exercises with hidden solutions — `exercises` per subtopic (task, solution behind a toggle, own learning goal); pairing convention: solution of Ex. 1 seen → Ex. 2 tests the same thing. Client pattern "proofs hidden by default". Sophie curates the exercise content. Structure ref: https://sites.ualberta.ca/~vbouchar/MAPH464/section-multiplication-table.html
- [ ] feature-10: Formula/theorem popups — show referenced equations/theorems as a popover without leaving the page (same structure ref as feature-9).
- [ ] feature-11: Learning-approach labels + filter — tag content items (intuition-first / formal / hands-on …), filter chips like the type filter in ContentList.
- [ ] feature-12: Material rating 0–5 stars — v1 device-local (localStorage, "this helped me"); cross-user aggregation needs a backend (first real backend driver).

## Blocked

<!-- The orchestrator puts features here when the developer reported a product/content question.
     Format: `- [ ] feature-N: {title} — QUESTION: {what needs to be decided}`.
     Once the user answers the question, the entry moves back to `## Open`. -->

## Wave-Log

<!-- The committer writes the wave summary here at wave-close, newest first. -->

## Done

<!-- Historical archive. The committer ticks features off in `## Open` and leaves them there — it doesn't move them into this section. -->
