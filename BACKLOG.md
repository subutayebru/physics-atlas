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

## Client-Feedback (2026-07-20) — deferred

- [ ] feature-8: Interaktive Simulationen — neuer Content-Typ `simulation` + optionales `codeUrl`-Feld ("was macht der Code"); Pilot: Franck-Hertz-Applet auf Quantum Mechanics verlinken. Später: In-Page-Embedding. Ref: https://mintapps.org/html/mint-franckhertz.html
- [ ] feature-9: Exercises mit versteckten Lösungen — pro Subtopic `exercises` (Aufgabe, Lösung hinter Toggle, eigenes Lernziel); Paar-Konvention: Lösung von Ex. 1 gesehen → Ex. 2 testet dasselbe. Client-Muster "proofs hidden by default". Übungs-Content kuratiert Sophie. Struktur-Ref: https://sites.ualberta.ca/~vbouchar/MAPH464/section-multiplication-table.html
- [ ] feature-10: Formel-/Theorem-Popups — referenzierte Gleichungen/Sätze als Popover ohne Seitenwechsel anzeigen (gleiche Struktur-Ref wie feature-9).
- [ ] feature-11: Lern-Ansatz-Labels + Filter — Content-Items taggen (intuition-first / formal / hands-on …), Filter-Chips wie beim Typ-Filter in ContentList.
- [ ] feature-12: Material-Rating 0–5 Sterne — v1 device-lokal (localStorage, "hat mir geholfen"); nutzerübergreifende Aggregation braucht ein Backend (erster echter Backend-Treiber).

## Done

<!-- Historisches Archiv. Der Committer hakt Features in `## Open` ab und lässt sie dort stehen — er verschiebt nicht in diese Section. -->
