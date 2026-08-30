# Physics Atlas — Backlog

> Format: `- [ ] feature-N: {title} — {description}` in `## Open`. Der Committer
> hakt nach Erfolg auf `[x]` ab — er verschiebt NICHT zwischen Open/Done.

## Brainstorm-Focus

Fokus auf Lern-UX rund um den Prerequisite-Graphen (Curriculum, Progress,
Orientierung im Graphen) und a11y-Polish. Keine neuen Physik-Inhalte erfinden
— Content kuratiert Sophie über topics.json.

## Open

- [x] feature-1: Progress-Tracking — Topics im Curriculum abhakbar (localStorage), Fortschritts-% pro Lernziel im Sidebar-Header, erledigte Nodes im Graphen dezent markiert (Häkchen-Badge, nicht nur Farbe).
- [x] feature-2: Topic-Suche — Suchfeld im Header; Treffer wählt das Topic im aktiven View aus und zentriert den Graphen darauf. (In Goal-Mode wird ein Topic außerhalb des aktuellen Subgraphen zum neuen Lernziel.)
- [x] feature-3: Content-Typ-Filter — im Sidebar/Detail nach book/video/course filtern; Filterzeile über der Resource-Liste.
- [ ] feature-4: Fuzzy-Suche — Suche toleriert Tippfehler („cosmolgy") und matcht auch Topic-Beschreibungen, nicht nur Titel. Kleine eigene Implementierung (z.B. Bigram-Score), keine neue Dependency ohne Plan.
- [x] feature-5: Curriculum-Export/Print-View — druckbare Syllabus-Ansicht des aktuellen Lernziels (geordnete Topics + Resources + Notizen), via CSS print stylesheet oder eigene Route; Button im Goal-Sidebar.
- [ ] feature-6: Progress auf Home-Goal-Chips — jeder Featured-Goal-Chip auf der Startseite zeigt seinen Fortschritt (Ring oder %-Badge) aus localStorage.
- [ ] feature-7: Map-Zoom-Controls — schwebende +/−/Fit-Buttons auf der Full-Map (Glass-Stil wie map-card), für Nutzer ohne Scroll/Pinch-Gewohnheit.
- [x] feature-13: Kategorie-Farben + Goal-Highlighting im Explorer — Node-Farbe wechselt von `level` (foundation/core/advanced/goal, rein dekorativ) auf `category`: field=Grün, method=Rot, math-concept=Blau (alle 40 Topics neu klassifizieren, Sophie reviewt Mapping). Im Explorer-Map (mode=map) kann eine Subtopic-Learning-Goal (promotable subgoal) direkt als Ziel gewählt werden: Ziel wird golden markiert (dynamischer Zustand, keine Kategorie-Farbe), relevante Prerequisite-Units (`buildUnitGraph`/`expandedCurriculumFor`, Unit-Granularität) werden verbunden/hervorgehoben, alles andere dimmt (bestehendes `highlightIds`/`dimmed`-Pattern aus GoalView wiederverwenden); Ziel-Topics klappen automatisch zu ihren relevanten Subtopics auf (bestehendes `expandedIds`/⊕-Toggle wiederverwenden, aber nur relevante Subtopics markiert). CTA führt in die bestehende Curriculum-Seite (GoalView, unverändert). Pilot-Content: neues Topic `relativistic-hydro` (Subtopics `basics`, `viscous`, Learning-Goal `israel-stuart`) als Platzhalter-Skeleton unter fluid-dynamics/special-relativity/differential-geometry verdrahtet — Sophie ersetzt Platzhaltertexte durch echten Content.

- [x] feature-14: Topic-Cleanup + Subtopics default-sichtbar + Hover-Zoom im Explorer — 6 unkategorisierte Topics (lagrangian-mechanics, optics, standard-model, quantum-gravity-frontiers, stellar-astrophysics, galaxies-large-scale-structure) werden vollständig aus topics.json entfernt (nicht nur ausgeblendet), inkl. Bereinigung betroffener prerequisites/optionalPrerequisites (general-relativity, quantum-field-theory, quantum-mechanics, black-holes-gravitational-waves, cosmology — 4 Curricula werden dadurch einen Schritt kürzer, bewusst in Kauf genommen). Annotierte Topics (7 von 35) zeigen ihre Subtopics künftig standardmäßig offen auf der Full-Map statt eingeklappt (⊕/⊖-Toggle bleibt für manuelles Ein-/Ausklappen). Neu: Hover auf ein Topic mit Subtopics (nur vor Zielwahl) zoomt/pan't den Viewport sanft auf Topic+Subtopics (Rest der Map bleibt sichtbar), reine Viewport-Operation (`cy.animate({fit})`), kein Re-Layout, `prefers-reduced-motion` respektiert.

## Client-Feedback (2026-07-20) — deferred

- [ ] feature-8: Interaktive Simulationen — neuer Content-Typ `simulation` + optionales `codeUrl`-Feld ("was macht der Code"); Pilot: Franck-Hertz-Applet auf Quantum Mechanics verlinken. Später: In-Page-Embedding. Ref: https://mintapps.org/html/mint-franckhertz.html
- [ ] feature-9: Exercises mit versteckten Lösungen — pro Subtopic `exercises` (Aufgabe, Lösung hinter Toggle, eigenes Lernziel); Paar-Konvention: Lösung von Ex. 1 gesehen → Ex. 2 testet dasselbe. Client-Muster "proofs hidden by default". Übungs-Content kuratiert Sophie. Struktur-Ref: https://sites.ualberta.ca/~vbouchar/MAPH464/section-multiplication-table.html
- [ ] feature-10: Formel-/Theorem-Popups — referenzierte Gleichungen/Sätze als Popover ohne Seitenwechsel anzeigen (gleiche Struktur-Ref wie feature-9).
- [ ] feature-11: Lern-Ansatz-Labels + Filter — Content-Items taggen (intuition-first / formal / hands-on …), Filter-Chips wie beim Typ-Filter in ContentList.
- [ ] feature-12: Material-Rating 0–5 Sterne — v1 device-lokal (localStorage, "hat mir geholfen"); nutzerübergreifende Aggregation braucht ein Backend (erster echter Backend-Treiber).

## Done

<!-- Historisches Archiv. Der Committer hakt Features in `## Open` ab und lässt sie dort stehen — er verschiebt nicht in diese Section. -->
