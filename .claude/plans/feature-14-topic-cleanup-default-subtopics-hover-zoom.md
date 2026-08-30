---
feature-id: 14
title: Topic-Cleanup + Subtopics default-sichtbar + Hover-Zoom im Explorer
issue:
requires-design-assets: false
estimated-complexity: high
code-review: required
design-review: required
runtime-budget-minutes: 20
---

## Context

Follow-up zu feature-13 (Commit `8f5b03b`, Kategorie-Farben + Goal-Highlighting), aus
direktem Feedback nach dem ersten Blick auf die live App:

1. Die 6 in feature-13 unkategorisiert gelassenen Topics sind auf der Map noch als graue
   Nodes sichtbar. Gewollt ist: komplett weg aus der App — nicht ausgeblendet, sondern aus
   `topics.json` gelöscht, inklusive aller Prerequisite-Referenzen darauf. Das ist ein
   bewusst akzeptierter Content-Rückschritt: general-relativity, quantum-field-theory,
   black-holes-gravitational-waves und cosmology werden je einen Schritt kürzer,
   quantum-mechanics verliert sein einziges optionales Prerequisite.
2. Subtopics sollen zur normalen Kartenstruktur gehören, nicht hinter einem Toggle versteckt
   sein. Aktuell startet jedes Topic eingeklappt (⊕-Klick/Doppel-Tap nötig) — auch die 7
   Topics, die schon Subtopics haben. Gewollt: diese 7 zeigen ihre Subtopics beim Laden
   sofort offen.
3. Hovern über ein Topic (bevor ein Lernziel gewählt ist) soll die Ansicht sanft auf dieses
   Topic + seine Subtopics zoomen, der Rest der Map bleibt sichtbar, dann wieder zurück.
   Bestätigter Scope: nur im Vor-Ziel-Explorationszustand — sobald ein Lernziel aktiv ist,
   bleibt die Ansicht auf den hervorgehobenen Pfad fokussiert, kein Hover-Zoom mehr.
4. Das eigentliche feature-13-Ziel — bei gewähltem Lernziel nur die relevanten Subtopics
   hervorheben, irrelevante ausblenden — funktioniert bereits korrekt (verifiziert am
   `relativistic-hydro/israel-stuart`-Beispiel: `metric/curvilinear-coords` leuchtet,
   `metric/lengths-angles-volumes` bleibt gedimmt; klassische vs. relativistische
   Hydrodynamik: `fluid-dynamics` hat schlicht keine Kante zu `differential-geometry`).
   Kein neuer Code hier — nur ein Verifikations-Pass, dass Punkt 2/3 das nicht kaputt machen.

Content für die ~28 Topics ohne Subtopics ist bewusst aufgeschoben — Sophie füllt das
später. Wird in der Doku explizit als erwarteter, dokumentierter Zustand festgehalten,
nicht stillschweigend offen gelassen.

## Critical Files

- `src/data/topics.json` — 6 Topic-Einträge löschen, 5 hängende Prerequisite-Refs bereinigen
- `src/components/MapView.tsx:41` — `expandedIds`-Default (leer → alle annotierten Topics)
- `src/components/GraphView.tsx` — neuer Hover-Zoom-Mechanismus (rein intern, keine neuen Props)
- `docs/AUTHORING.md`, `docs/DESIGN-DECISIONS.md` — Doku für aufgeschobenen Content + Decision 11
- `BACKLOG.md`, `ROADMAP.md` — Projekt-Bookkeeping

## Wiederverwendete Patterns

- `GraphView.tsx:456-469` (`focus`-Effekt: `cy.animate({fit:{eles,padding}})`,
  `prefers-reduced-motion`-Check via `window.matchMedia`) — Hover-Zoom ist ein zweiter,
  thematisch identischer Aufruf statt eines neuen Mechanismus.
- `MapView.tsx:60-77` (`autoAddedRef`, goal-getriebenes Auto-Expand über `goalPathFor()`
  aus `src/graph/dag.ts`) — bleibt unverändert; der neue Default-Expand-Floor ist immer eine
  Obermenge von `goalPathFor().expand`, die beiden Mechanismen können sich nicht ins Gehege
  kommen (siehe Datenmodell-Abschnitt).
- `GraphView.tsx:374` (350ms-Fenster für Doppel-Tap-Erkennung) — gleiche Timing-Konvention
  für den Hover-Zoom-Dwell wiederverwendet statt einer neuen Magic Number.
- `scripts/validate-topics.mjs:182-194` (Prerequisite-Auflösung, harter Fehler bei unbekannter
  ID) — unverändert, die Datenbereinigung ist exakt darauf ausgelegt, hier sauber
  durchzulaufen; kein Script-Change nötig.
- `Home.tsx:14` (`topics.filter(t => t.featured)`) — kein Code-Change; `standard-model`
  fällt automatisch aus den Featured-Chips, sobald das Topic aus den Daten verschwindet.

## Datenmodell / Relations

**Löschen** (vollständige Topic-Einträge aus `topics.json`, keine `partOf`-Ziele, keine
eigenen Subtopics, von keiner anderen Stelle im Repo referenziert außer den unten
gelisteten Prerequisite-Refs):

`lagrangian-mechanics`, `optics`, `standard-model`, `quantum-gravity-frontiers`,
`stellar-astrophysics`, `galaxies-large-scale-structure`

**Referenzen bereinigen** (sonst harter `npm run validate`-Fehler):

| Topic | Vorher | Nachher |
|---|---|---|
| `quantum-mechanics` | `optionalPrerequisites: ["lagrangian-mechanics"]` | Feld ganz entfernen |
| `general-relativity` | `["special-relativity", "differential-geometry", "lagrangian-mechanics"]` | `["special-relativity", "differential-geometry"]` |
| `quantum-field-theory` | `["quantum-mechanics", "special-relativity", "lagrangian-mechanics"]` | `["quantum-mechanics", "special-relativity"]` |
| `black-holes-gravitational-waves` | `["general-relativity", "stellar-astrophysics"]` | `["general-relativity"]` |
| `cosmology` | `["general-relativity", "statistical-mechanics", "astrophysics", "nuclear-particle-physics", "galaxies-large-scale-structure"]` | `["general-relativity", "statistical-mechanics", "astrophysics", "nuclear-particle-physics"]` |

Exakte Zeilennummern beim Implementieren frisch per `grep -n '"id"'` bestimmen — die Datei
ist groß und handgepflegt, Zeilen verschieben sich schnell.

## Implementation Steps

1. **`src/data/topics.json`** — die 6 Topic-Blöcke löschen, die 5 Referenzen wie oben
   bereinigen (von unten nach oben löschen oder nach jedem Schritt neu `grep`en).
2. **`npm run validate`** direkt danach laufen lassen — erwartet: 35 statt 41 Topics, 0 Fehler.
3. **`src/components/MapView.tsx:41`** — Lazy-Initializer ändern:
   ```ts
   const [expandedIds, setExpandedIds] = useState<Set<string>>(
     () => new Set(topics.filter((t) => t.subtopics?.length).map((t) => t.id)),
   );
   ```
   `toggleExpand` und der ⊕/⊖-Button bleiben unverändert. `.map-hint`-Text (nahegelegen)
   optional anpassen — beschreibt aktuell nur das Öffnen, sollte auch das Einklappen
   erwähnen, da die meisten annotierten Topics jetzt offen starten.
4. **`src/components/GraphView.tsx`** — Hover-Zoom, komplett intern, keine neuen Props:
   - Gating: nur wenn `large === true`, nur wenn `!goalId`, nur für Nodes mit
     `node.isParent()` (manuell eingeklappte oder Blatt-Topics no-open automatisch).
   - Neue Refs: Enter-Timer, Exit-Timer, `preHoverViewportRef` (`{zoom, pan}`, einmal pro
     Hover-*Session* gesetzt, nicht pro Node).
   - `mouseover` auf berechtigtem Node: ~350ms Dwell, dann (falls `preHoverViewportRef`
     leer) aktuellen Viewport merken, dann `cy.stop()` +
     `cy.animate({fit:{eles: node.union(node.children()), padding: ~160-200}}, {duration:500,
     easing:'ease-in-out-cubic'})` (bzw. `cy.fit()` sofort bei `prefers-reduced-motion`).
   - `mouseout`: ~150-200ms Exit-Timer, dann `cy.viewport({zoom, pan})` aus dem gemerkten
     Wert wiederherstellen, Session zurücksetzen. Ein neuer `mouseover` vor Ablauf des
     Exit-Timers bricht ihn ab und fitted direkt neu, kein Zurückspring-Flackern.
   - Beide Timer im bestehenden `cy.destroy()`-Teardown (Element-Rebuild-Effekt) clearen.
   - Bestehende Hover-Highlight-Klassen (`hover-pre`/`hover-post`/`hovered`) unangetastet —
     Hover-Zoom ist eine separate `cy.on(...)`-Registrierung, keine Vermischung.
5. **Verifikation der bereits funktionierenden Goal-Dimming-Logik** (kein Code-Change) —
   siehe Verification-Abschnitt.
6. **`docs/AUTHORING.md`** — Beispiel-`prerequisites` (aktuell noch mit
   `lagrangian-mechanics`, modelliert auf `quantum-field-theory`) korrigieren; neue Zeile
   für `subtopics` in der Feldtabelle (analog zum bestehenden `category`-Eintrag): optional,
   fehlend ist ein gültiger Dauerzustand (schlichter Node), kein Mangel; wenn vorhanden,
   rendert standardmäßig offen auf der Map.
7. **`docs/DESIGN-DECISIONS.md`** — kurzer Verweis-Satz an Decision 10 (die 6 Topics sind
   jetzt gelöscht, nicht mehr nur unkategorisiert); neue **Decision 11** — echtes Löschen
   statt Ausblenden (+ akzeptierter Curriculum-Rückschritt), Default-Open als strukturelle
   Voraussetzung für günstiges Hover-Zoom, Hover-Zoom als reine Viewport-Operation
   (explizit kein Fisheye/Lens — cytoscape hat kein solches Primitiv), gegated auf
   Vor-Ziel-Exploration auf der großen Map.
8. **`BACKLOG.md`** — feature-14-Zeile unter `## Open` ergänzen (Format wie bestehende
   Einträge).
9. **`ROADMAP.md`** — Eintrag unter dem Insert-Marker (Format wie feature-13-Block).
10. **Gates**: `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build`.

## Verification

- `npm run validate` → 35 topics, 0 Fehler.
- `npx tsc -b`, `npm run lint`, `npm run build` — alle clean.
- `npm run dev`, manueller Pass:
  - Alle 6 gelöschten Topics: keine Suchtreffer, nicht auf der Map, keine hängenden Kanten;
    Home zeigt 8 statt 9 Featured-Chips (kein Standard-Model-Chip mehr).
  - `?mode=goal&goal=general-relativity`, `…quantum-field-theory`,
    `…black-holes-gravitational-waves`, `…cosmology` laden sauber mit den verkürzten
    Prerequisite-Listen, keine Console-Errors, kein kaputter Chip für den entfernten Schritt.
  - Frischer Load von `?mode=map` (kein Ziel gewählt): `calculus-1`, `linear-algebra`,
    `differential-equations`, `waves-oscillations`, `quantum-mechanics`, `metric`,
    `relativistic-hydro` zeigen ihre Subtopics sofort; ⊖/⊕ klappt weiterhin manuell.
  - Hover über eines dieser 7 Topics zoomt sanft auf Topic+Subtopics, ohne dass andere
    Node-Positionen springen (Indiz für ungewollte `expandedIds`-Mutation); Wechsel zu
    einem Nachbar-Topic re-fitted ohne Zwischen-Flackern; Maus raus → sanft zurück zur
    Vorher-Ansicht; `prefers-reduced-motion` → sofortiger Schnitt ohne Animation; Hover
    über ein Blatt-Topic (z.B. `electromagnetism`) → keine Viewport-Änderung, nur die
    bestehende Hover-Hervorhebung.
  - Bei gewähltem Lernziel: Hover löst **kein** Zoom mehr aus.
  - `relativistic-hydro/israel-stuart`-Dimming-Beispiel unverändert korrekt.

## Annahmen

- Curriculum-Rückschritt (general-relativity/quantum-field-theory/
  black-holes-gravitational-waves/cosmology je einen Schritt kürzer, quantum-mechanics ohne
  optionales Prerequisite) ist vom User bewusst und explizit akzeptiert, kein Bug.
- Exakte Timing-Werte (350ms Dwell, 150-200ms Exit, 500ms Animationsdauer, 160-200px
  Padding) sind vernünftige, an bestehenden Codewerten orientierte Startpunkte — im
  Dev-Server visuell nachjustierbar, kein Hard-Requirement.
- Hover-Zoom-Revert-Ziel: der exakte Viewport-Stand vor Hover-Beginn (nicht ein generisches
  Fit-All) — bewahrt manuelles Pan/Zoom des Users vor dem Hover.
- `docs/DESIGN-DECISIONS.md`: Decision 10 bekommt nur einen kurzen Verweis-Zusatz statt
  einer Neufassung — der historische Eintrag bleibt stehen, Decision 11 dokumentiert das Update.
