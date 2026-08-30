# Physics Atlas — Roadmap

> Pro Feature ein Block. Status-Lifecycle: 🟡 Planned → ✅ Implemented (oder
> ❌ Skipped). Eingefügt **newest-first** direkt unter dem Marker. Planner und
> Committer editieren diese Datei — keine manuellen Edits, sonst brechen die
> Marker.

<!-- ROADMAP-INSERT-HERE: planner inserts new entries directly below this line, newest first -->

## feature-13: Kategorie-Farben + Goal-Highlighting im Explorer

**Status:** ✅ Implemented <!-- status-line: feature-13 -->
**Geplant:** 2026-08-30T14:36:10Z
**Plan:** [.claude/plans/feature-13-category-colors-goal-highlight.md](.claude/plans/feature-13-category-colors-goal-highlight.md)
**Komplexität:** high

### Kern-Entscheidungen (Warum so geplant)
- `level` wird durch `category` (field/method/math-concept) **ersetzt**, nicht ergänzt — zwei parallele Klassifikationen sind für eine Non-Dev-Autorin eine Fehlerquelle, und die "Höhe" zeigt das dagre-BT-Layout ohnehin schon. Palette gemessen statt geraten: `#199e70`/`#e2574c`/`#3987e5` plus Neutral `#7a86a0` (= bestehendes `--muted`), Kontrast ≥3.0 auf beiden Surfaces, schlechtestes CVD-Paar ΔE 14.4 (bestehende Palette: 13.4).
- `category` ist **optional**, nicht Pflicht: Sophie klassifiziert 34 der 40 Topics, 6 bleiben bewusst leer und rendern neutral grau ("Not yet categorized" als vierter Legenden-Eintrag). Ein Pflichtfeld würde erfundene Zuordnungen erzwingen und die Farbkodierung entwerten; der Validator prüft nur den Wert *falls* gesetzt. `'uncategorized'` existiert nur als Render-Fallback (`categoryOf()`), nie als Wert in topics.json.
- Der Ziel-Pfad braucht **Cross-Topic-Unit-Kanten** in GraphView: heute werden Kanten nur topic-level gezeichnet, dadurch stünden hervorgehobene Areas wie `metric`/`la-tensors` als unverbundene Inseln da. Das ist der eigentliche Architektur-Eingriff des Features.
- Pilot-Content wird **inline in topics.json** authored statt als `content/goals/*.md`: der Markdown-Compiler legt für jeden Prerequisite-Bullet eine neue Unit an, was (a) mit handgeschriebenen Subtopics gleicher ID kollidiert und (b) keine groben Topic-Refs erlaubt. `fluid-dynamics`/`special-relativity` bleiben deshalb bewusst unannotiert — sie zu annotieren würde bestehende Curricula (Cosmology, Black Holes) auf Platzhalter-Lernziele zusammenschrumpfen lassen.
- Das Mapping kommt von Sophie und ist verbindlich — auch die überraschenden Zuordnungen (Elektromagnetismus, Thermodynamik, klassische Mechanik als `method`): sie trennt "Handwerkszeug, das man beherrscht" von "Phänomenbereich, den man erforscht". Nicht während der Implementierung nachjustieren.

### Wiederverwendete Patterns
- `GraphView.tsx:386-395` (`highlightIds`/`dimmed`/`onpath`) — arbeitet rein über Node-IDs, die bei expandierten Topics exakt den `UnitId`s aus dag.ts entsprechen; es braucht kein neues Highlight-System, nur ein besser berechnetes Set.
- `dag.ts:300-371` (`expandedCurriculumFor`) — die neue `goalPathFor()` ist ein dünner Adapter darauf statt einer zweiten Traversierung, damit Map und Curriculum nie auseinanderdriften.
- `GraphView.tsx:279-299` + `MapView.tsx:40-48` (`expandedIds`/⊕-Toggle) — Auto-Expand füttert denselben State, mit `autoAddedRef` damit manuelle Toggles nicht bekämpft werden.
- `GraphView.tsx:42-47` + `App.css:684` (Gold-Vokabular `sel-post`/`.ink-post`) — Gold heißt im Projekt schon "Ziel"; die Ziel-Markierung erbt die Hexwerte statt neue einzuführen.
- `GraphView.tsx:371` (`✓`-Label-Badge) — dieselbe Stelle liefert das `★`-Badge, damit Gold nicht allein Bedeutung trägt.

**Implementiert:** 2026-08-30T16:00:00Z
**QA-Report:** Developer-Hard-Gate (QA-Agenten übersprungen)

### Implementiert
- `src/data/types.ts` — `TopicLevel` → `TopicCategory` (field/method/math-concept, optional)
- `src/graph/categoryColors.ts` (rename) — 4-Einträge-Palette (field grün, method rot, math-concept blau, uncategorized neutral)
- `src/data/topics.json` — 34 Topics bekommen `category`, 6 bleiben ohne; neues Topic `relativistic-hydro` + Subtopic `metric/curvilinear-coords`
- `scripts/validate-topics.mjs` — `category` Wert-Prüfung (keine Pflicht)
- `src/graph/dag.ts` — neue Funktion `goalPathFor()` (Unit-Closure + Highlight-Set + Auto-Expand-Set)
- `src/components/GraphView.tsx` — Gold-Klasse `goal-node`, Cross-Topic-Unit-Edges, Label-Badges für Subtopics
- `src/components/MapView.tsx` — Goal-Bar mit CTA, Auto-Expand, `goalPick`-State
- `src/App.css` — `--gold`/`--silver` Theme-Tokens, `.goal-bar` Glass-Panel, `.level-dot` → `.cat-dot`
- `docs/AUTHORING.md` — Schema-Doku (category statt level)
- `docs/DESIGN-DECISIONS.md` — Decision 10 (Farbe = Kategorie)
- Komponenten-Updates: Legend, GoalView, TopicPage, SearchBox, Home, TopicPrintSheet

### QA-Outcome
**QA:** Review-/QA-Agenten-Schritt auf explizite User-Anweisung übersprungen. Developer-Hard-Gate PASS: `npm run validate` (41 topics, 54 subtopics, 35 subgoals, 0 Fehler), `npx tsc -b`, `npm run lint`, `npm run build` — alle clean bei Iteration 1/3. Kein unabhängiger QA-/Code-/Design-Review durchgeführt.

<!-- impl-marker: feature-13 -->
