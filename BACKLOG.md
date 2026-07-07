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
- [ ] feature-5: Curriculum-Export/Print-View — druckbare Syllabus-Ansicht des aktuellen Lernziels (geordnete Topics + Resources + Notizen), via CSS print stylesheet oder eigene Route; Button im Goal-Sidebar.
- [ ] feature-6: Progress auf Home-Goal-Chips — jeder Featured-Goal-Chip auf der Startseite zeigt seinen Fortschritt (Ring oder %-Badge) aus localStorage.
- [ ] feature-7: Map-Zoom-Controls — schwebende +/−/Fit-Buttons auf der Full-Map (Glass-Stil wie map-card), für Nutzer ohne Scroll/Pinch-Gewohnheit.

## Done

<!-- Historisches Archiv. Der Committer hakt Features in `## Open` ab und lässt sie dort stehen — er verschiebt nicht in diese Section. -->
