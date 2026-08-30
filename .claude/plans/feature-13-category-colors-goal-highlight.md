---
feature-id: 13
title: Kategorie-Farben + Goal-Highlighting im Explorer
issue:
requires-design-assets: false
estimated-complexity: high
code-review: required
design-review: required
runtime-budget-minutes: 25
---

## Context

Zwei zusammenhängende Probleme:

1. **Node-Farbe sagt nichts Nützliches.** `Topic.level` (foundation/core/advanced/goal)
   ist rein dekorativ — die "Höhe" im Graphen zeigt das dagre-`BT`-Layout ohnehin schon,
   die Farbe verdoppelt also eine Information, die visuell bereits da ist. Nützlicher ist
   die *Art* eines Knotens: ist das ein **Physik-Feld** (Elektrodynamik, Kosmologie),
   eine **Methode/ein Formalismus** (Lagrange-Mechanik, Hydrodynamik, QFT) oder ein
   **mathematisches Konzept** (Lineare Algebra, Metrik, Tensoren)? Das ist die Frage,
   die Lernende beim Blick auf den Graphen tatsächlich haben.
2. **Der Explorer kann kein Ziel zeigen.** Ein Lernziel (`topicId/subId`, z.B.
   `general-relativity/parallel-transport`) lässt sich heute nur *verlassen* — Klick auf
   das Subtopic-Chip springt sofort in die Curriculum-Seite. Man sieht nie **im Graphen**,
   was dieses Ziel eigentlich verlangt. Genau das ist aber der Aha-Moment der Seite:
   "mein Ziel leuchtet golden, der Pfad dorthin ist verbunden, der Rest der Physik tritt
   zurück — und es sind gar nicht *alle* Subtopics von Differentialgeometrie nötig,
   sondern nur drei davon."

Nach dem Feature: im Explorer ein Ziel picken → Ziel golden, Prerequisite-Units auf
Unit-Granularität hervorgehoben **und verbunden**, irrelevante Geschwister-Subtopics
bleiben sichtbar gedimmt, ein CTA führt in die unveränderte Curriculum-Seite.

Dazu Pilot-Content (`relativistic-hydro`), damit das Feature überhaupt einen Fall hat,
in dem eine Area *teilweise* gebraucht wird — Platzhaltertexte, Sophie ersetzt sie.

## Critical Files

- `src/data/types.ts` — `TopicLevel` raus, `TopicCategory` rein; `Topic.level` → `Topic.category?` (**optional**)
- `src/graph/levelColors.ts` → **umbenennen** in `src/graph/categoryColors.ts` — `CATEGORY_COLORS/LABELS/ORDER` (4 Einträge inkl. `uncategorized`) + `categoryOf()`-Fallback-Helper + validierte Palette
- `src/data/topics.json` — 34 der 40 Topics bekommen `category`, 6 bleiben bewusst ohne, `level` entfällt überall; neues Topic `relativistic-hydro`; neues Subtopic `metric/curvilinear-coords`
- `scripts/validate-topics.mjs:14,104` — `LEVELS` → `CATEGORIES`, Prüfung von "Pflichtfeld" auf "falls gesetzt, gültiger Wert" umbauen
- `src/graph/dag.ts` — neue Export-Funktion `goalPathFor()` (Unit-Closure + Highlight-Set + Auto-Expand-Set), aufgebaut auf `expandedCurriculumFor()`
- `src/components/GraphView.tsx` — drei neue Props (`goalId`, `unitPathIds`), Gold-Klasse `goal-node`, Cross-Topic-**Unit**-Edges, Label-Badges auch für Subtopic-Nodes
- `src/components/MapView.tsx` — `goalPick`-State, Goal-Bar mit CTA, Auto-Expand, `directionalSelect` aus solange ein Ziel gepickt ist
- `src/App.css` — `--gold` Theme-Token, `.goal-bar`, `.level-dot` → `.cat-dot` (+ `.map-card-level`/`.topic-page-level` Rename)
- `src/components/{Legend,MapView,GoalView,TopicPage,SearchBox,Home,TopicPrintSheet}.tsx` — Import- und Feldwechsel `level` → `category`
- `content/goals/israel-stuart.md` — **nicht** anlegen (siehe Datenmodell: Pilot wird inline in topics.json authored, sonst Duplicate-Subtopic-Fehler)
- `docs/AUTHORING.md:79,93` — Schema-Doku (`category` statt `level`)
- `docs/DESIGN-DECISIONS.md` — neue Decision 10 (Farbe = Kategorie; verworfene Alternativen als Pfade)

## Wiederverwendete Patterns

- `highlightIds`/`dimmed`/`onpath` in `src/components/GraphView.tsx:386-395` — der Dim-/Pfad-Pass
  existiert schon (heute von `GoalView.tsx:84-89` genutzt) und arbeitet rein über Node-IDs.
  Weil expandierte Subtopics als Nodes mit ID `topicId/subId` vorliegen (`GraphView.tsx:283`),
  deckt sich das exakt mit `UnitId` aus `dag.ts:6` — **kein neuer Highlight-Mechanismus nötig**,
  nur ein besser berechnetes Set.
- `expandedIds`/`onToggleExpand` in `GraphView.tsx:279-299` + `MapView.tsx:40-48` — Compound-Nodes
  für Subtopics gibt es bereits (heute ⊕-Button `MapView.tsx:181`). Auto-Expand füttert denselben State.
- `expandedCurriculumFor()` in `dag.ts:300-371` — berechnet bereits genau die Unit-Closure (`F`/`M`,
  `dfsClosure`, Gruppierung nach Topic, `partial`-Flag). Die neue `goalPathFor()` ist ein dünner
  Adapter darauf, **keine zweite Traversierung** — sonst driften Curriculum und Map auseinander.
- Gold/Silber-Vokabular in `GraphView.tsx:42-47` (`gold`/`goldEdge`/`goldArrow`, hell/dunkel getrennt)
  und `.ink-post` in `App.css:684` — Gold heißt in diesem Projekt schon "Ziel/was es freischaltet".
  Die Ziel-Markierung übernimmt dieselben Hex-Werte statt neuer.
- `✓`-Label-Badge in `GraphView.tsx:371` — dieselbe Stelle bekommt das `★`-Ziel-Badge (Farbe darf
  nie allein tragen, CLAUDE.md-a11y-Regel).
- `resolveSubtopicRef()` in `dag.ts:112-124` — löst Unit-Refs auf; die neuen Cross-Topic-Unit-Edges
  nutzen dieselbe Auflösung wie die internen Edges in `GraphView.tsx:288-297`.
- `.legend`/`.map-card`-Glass-Panel-Muster in `App.css:494,559` (`var(--surface)`, `--border`, blur)
  — die Goal-Bar erbt es, keine neuen Panel-Styles.
- `LEVEL_COLORS`-Modul-Muster (`src/graph/levelColors.ts`) — bleibt strukturell identisch
  (Record + Labels + Order + Palette-Kommentar mit Messwerten), nur Domäne getauscht.
- Inline-`outcomes`-Form für Subgoals (`docs/AUTHORING.md:146`) — der Pilot nutzt sie statt
  des Markdown-Pfads (Begründung im Datenmodell-Abschnitt).

## Design-Direktive

**Palette (gemessen, nicht geraten).** Surfaces des Projekts: dark `--page: #070b14`,
light `--page: #f3f5fa` (`App.css:2,19`). Bestehende Palette lag bei 4.99–5.78 (dark) /
3.12–3.62 (light) und "worst adjacent CVD ΔE 13.4" (`levelColors.ts:3-5`). Die neue
Dreier-Palette hält dieselbe Latte und recycelt zwei bereits validierte Hexwerte:

| Kategorie | Hex | Kontrast dark `#070b14` | Kontrast light `#f3f5fa` |
|---|---|---|---|
| `field` (Grün) | `#199e70` (= altes `foundation`) | 5.78 | 3.12 |
| `method` (Rot) | `#e2574c` | 5.34 | 3.38 |
| `math-concept` (Blau) | `#3987e5` (= altes `core`, = `--accent`) | 5.41 | 3.34 |
| `uncategorized` (Neutral) | `#7a86a0` (= `--muted` des Light-Themes, `App.css:24`) | 5.38 | 3.35 |

CVD-Abstände (Machado-Matrizen, ΔE76 im Lab): Deuteranopie field/method **27.7**,
Protanopie field/method **14.4** (schlechtestes Paar der Palette, immer noch besser als die
13.4 der bestehenden), Tritanopie field/math **16.7**. Alle Paare im Normalsehen ΔE > 87.
Das Neutral-Grau liegt von allen dreien weit genug weg und **senkt den Boden nicht**:
Deuteranopie neutral/field 18.9, Protanopie neutral/method 34.4, Tritanopie
neutral/math-concept 23.6 — schlechtestes Paar der Vierer-Palette bleibt damit die 14.4.
→ Diese exakten Hexwerte übernehmen; wer sie ändert, muss neu messen (dark ≥ 3.0, light ≥ 3.0,
schlechtestes CVD-Paar ≥ 13).

Das Neutral ist bewusst **kein** neuer Farbwert, sondern der bestehende `--muted`-Ton des
Light-Themes: "noch nicht kategorisiert" soll wie eine Zustandsangabe wirken (zurückgenommen,
grau), nicht wie eine vierte inhaltliche Kategorie. Es liegt trotzdem über 3:1 auf beiden
Surfaces, damit unkategorisierte Nodes nicht wie deaktiviert oder gedimmt aussehen — der
`dimmed`-Zustand (opacity 0.16) muss klar unterscheidbar bleiben.

Rot/Grün ist bewusst das schwächste Paar. Redundante Kanäle, die das abfangen (alle schon
im Projekt vorhanden bzw. Pflicht): sichtbares Titel-Label an jedem Node, Legende mit
Textlabel, Kategorie-**Text** (`CATEGORY_LABELS`) in Map-Card, Topic-Page-Header und
PDF-Kopf. Eine zusätzliche Form-Kodierung pro Kategorie (cytoscape `shape`, z.B.
`cut-rectangle` für `method`) ist **bewusst nicht Teil dieses Features** — Formen mit
`width/height: 'label'` verändern die Textmetrik und damit das Layout; als offener Pfad in
DESIGN-DECISIONS notieren, damit der design-reviewer ihn bewerten kann statt ihn zu erfinden.

**Legenden-Labels:** `field` → "Field (physics domain)", `method` → "Method & formalism",
`math-concept` → "Mathematical concept", `uncategorized` → "Not yet categorized".
Reihenfolge `CATEGORY_ORDER = ['math-concept', 'method', 'field', 'uncategorized']`
(mathematische Basis → Formalismus → Feld, dann die Lücke ans Ende). Die Legende hat damit
**vier** Farbeinträge plus den "optional prerequisite"-Strich. Der vierte Eintrag ist
Absicht und keine Baustelle: er erklärt die grauen Nodes, statt sie unkommentiert stehen
zu lassen.

**Ziel-Zustand (Gold).** Der gepickte Ziel-Node: 3px Gold-Border, `background-opacity 0.4`,
Gold-Underlay (dieselben Hexwerte wie `sel-post`/`hover-post`, `GraphView.tsx:45-47`), Label
mit vorangestelltem `★ `. Gold ist explizit **kein** Kategorie-Wert — es ist ein
Auswahl-Zustand wie `chosen`; deshalb weiterhin über Klassen statt über `data(color)`.

**Goal-Bar.** Neues Element in `.graph-pane`, oben zentriert (Legende sitzt unten links,
`.map-hint` unten mittig — kein Kollisionsrisiko). Glass-Panel wie `.map-card`. Inhalt in
einer Zeile: `★ Goal: {Unit-Titel}` · `{n} steps on this path` · Button "Open curriculum →"
(primär, Gold-Akzent) · Button "Clear" (tertiär). `role="status"` + `aria-live="polite"`,
damit Screenreader die Zielwahl mitbekommen; beide Controls echte `<button>`, Tastaturfokus
sichtbar (bestehender Focus-Ring). Unter 720px Breite: Bar bricht auf zwei Zeilen um
(`flex-wrap`), Buttons bleiben ≥ 40px hoch (Touch-Target).

**Gold-Token.** `.ink-post` (`App.css:684`) hat heute einen hart kodierten Dark-Hex und
keine Light-Variante. Im Zuge des Features: `--gold: #e6b566` in `:root`, `--gold: #b0821e`
in `:root[data-theme='light']` (dieselben Werte, die `GraphView.tsx:45` schon pro Theme
wählt), `.ink-post` und die Goal-Bar nutzen das Token. Analog `--silver` für `.ink-pre`.

## Datenmodell / Relations

### 1. `level` → `category` (ersetzen, nicht ergänzen) — und `category` ist **optional**

```ts
export type TopicCategory = 'field' | 'method' | 'math-concept';
// Topic.level: TopicLevel  →  Topic.category?: TopicCategory   (OPTIONAL)
```

`TopicLevel` wird gelöscht. Begründung: zwei parallele Klassifikationen zu pflegen ist für
eine Non-Dev-Autorin eine Fehlerquelle, und `level` trug keine Information, die nicht schon
aus der DAG-Höhe ablesbar ist. Migration ist ein reiner Key-/Wert-Tausch in topics.json —
kein Backend, keine gespeicherten User-Daten hängen daran (localStorage speichert nur
Unit-IDs, `useProgress`).

**Optionalität ist eine bewusste Content-Entscheidung von Sophie**, kein Übergangszustand:
6 der 40 Topics bekommen jetzt keine Kategorie ("wir nehmen noch nicht alles rein"). Ein
Pflichtfeld würde sie zwingen, Zuordnungen zu erfinden, die sie inhaltlich noch nicht
vertritt — genau die Art von Rauschen, die die Farbkodierung wertlos macht. Konsequenzen,
die sich durch den ganzen Code ziehen:

- `Topic.category?: TopicCategory` — der Doc-Kommentar (`types.ts:58`) sagt explizit, dass
  Weglassen erlaubt ist und neutral rendert.
- `CATEGORY_COLORS`/`CATEGORY_LABELS` sind über `TopicCategory | 'uncategorized'` typisiert;
  jeder Konsument liest über `topic.category ?? 'uncategorized'`. **Kein `!`, kein
  `as TopicCategory`, kein optionales Rendern des Dots** — die Farbe fehlt nie, sie ist nur
  neutral. So kann kein Konsument einen `undefined`-Lookup produzieren.
- Der Validator prüft `category` **nicht** auf Existenz, sondern nur: falls gesetzt, muss
  der Wert einer der drei erlaubten Strings sein. Ein fehlendes Feld ist kein Fehler und
  keine Warnung (sonst würde `npm run validate` dauerhaft 6 Advisories rauschen und echte
  Warnungen zudecken).
- Ein sauberer Helper in `categoryColors.ts` hält die Fallback-Regel an genau einer Stelle:
  `export const categoryOf = (t: Pick<Topic, 'category'>) => t.category ?? 'uncategorized';`
  — Konsumenten rufen `CATEGORY_COLORS[categoryOf(t)]` / `CATEGORY_LABELS[categoryOf(t)]`.

Abgrenzungsregel (in AUTHORING.md dokumentieren, damit Sophie konsistent korrigieren kann):

- **`field`** — ein Bereich *physikalischer Phänomene*, den man studiert (Elektromagnetismus, Kosmologie, Festkörper).
- **`method`** — ein *Formalismus/Werkzeug/Rahmen*, der über Felder hinweg angewandt wird (Lagrange-Mechanik, QFT, Hydrodynamik, Numerik).
- **`math-concept`** — Mathematik (Analysis, Lineare Algebra, Tensoren, Metrik).

### 2. Mapping — **von Sophie festgelegt**, 1:1 so übernehmen

Das ist kein Vorschlag mehr: die Liste kommt von der Content-Autorin und ist verbindlich.
Wer beim Implementieren inhaltlich anderer Meinung ist (z.B. "Elektromagnetismus ist doch
ein Feld"), ändert sie **nicht**, sondern notiert es im PR/Review.

**`math-concept` (Blau) — 14:** `hs-math`, `calculus-1`, `multivariable-calculus`,
`differential-equations`, `linear-algebra`, `probability-statistics`, `complex-analysis`,
`differential-geometry`, `la-tensors`, `calculus-geometry`, `tangent-space`, `tensors`,
`metric`, `connection`
(Sophies Gruppe "differential-geometry & tensors" umfasst den ganzen diff-geo-Cluster,
also `differential-geometry` selbst plus seine `partOf`-Sub-Areas `tangent-space`,
`tensors`, `metric`, `connection` — sowie `la-tensors`/`calculus-geometry`, die als
Sub-Areas von `linear-algebra`/`calculus-1` derselben Logik folgen.)

**`method` (Rot) — 12 + Pilot:** `classical-mechanics`, `waves-oscillations`,
`electromagnetism`, `thermodynamics`, `statistical-mechanics`, `special-relativity`,
`general-relativity`, `quantum-mechanics`, `quantum-field-theory`, `fluid-dynamics`,
`chaos-nonlinear-dynamics`, `computational-physics`, **`relativistic-hydro`** (neu, Pilot)

**`field` (Grün) — 8:** `nuclear-particle-physics`, `atomic-molecular-physics`,
`plasma-physics`, `condensed-matter`, `astrophysics`, `black-holes-gravitational-waves`,
`cosmology`, `quantum-computing`

**Ohne `category`-Feld — 6:** `lagrangian-mechanics`, `optics`, `standard-model`,
`quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`

Bei diesen sechs wird das Feld **weggelassen** — kein `"category": null`, kein
`"category": ""`, kein `"uncategorized"` in den Daten. `'uncategorized'` existiert nur als
Render-Fallback im Code (Farbe + Label), nie als Wert in topics.json; sonst hätte man zwei
Schreibweisen für denselben Zustand und der Validator müsste beide kennen.

Lesbare Konsequenz der Mapping-Logik (hilft beim Review): Sophie zieht die Grenze zwischen
*Phänomenbereich, den man erforscht* (`field` — überwiegend die oberen, ambitionierten
Ziele) und *Rahmenwerk/Handwerkszeug, das man beherrscht* (`method` — auch die klassischen
Kursfächer wie Elektromagnetismus und Thermodynamik). Der Graph bekommt dadurch eine
sichtbare Schichtung: rote Methodik-Mitte, grüne Ziel-Spitzen, blaue Mathe-Basis.

### 3. Pilot-Content — warum inline in topics.json, nicht als `content/goals/*.md`

Der Markdown-Pfad (`scripts/compile-content.mjs`) kann nur zwei Dinge: einen Goal-Subtopic
(`# … {id: topicId/subId}`) und Prerequisite-Bullets, die **immer neue Subtopics in der
referenzierten Area anlegen**. Daraus folgen zwei harte Constraints:

1. Ein Bullet mit `{id: viscous}` unter `### … {ref: relativistic-hydro}` würde ein
   *zweites* `viscous` neben dem handgeschriebenen erzeugen — `loadGraph.ts:24` hängt
   generierte Subtopics additiv an, der Validator (`validate-topics.mjs:125`) wirft
   "duplicate subtopic id". Handgeschriebene und generierte Subtopics **desselben** Topics
   dürfen sich also nicht überschneiden.
2. Bare-Topic-Refs (`"fluid-dynamics"` als Prerequisite eines Subtopics, `dag.ts:121-122`)
   sind im Markdown-Format gar nicht ausdrückbar — jeder Bullet erzeugt eine Unit.

Constraint 2 ist entscheidend: `fluid-dynamics` und `special-relativity` dürfen **nicht**
annotiert werden. Beide sind heute unannotiert und haben Abhängige
(`plasma-physics` bzw. `general-relativity`, `nuclear-particle-physics`,
`quantum-field-theory`). Würden wir sie mit ein, zwei Platzhalter-Lernzielen annotieren,
schrumpfte in **bestehenden** Curricula (Cosmology, Black Holes, …) die ganze Spezielle
Relativitätstheorie auf genau dieses eine Platzhalter-Lernziel zusammen (`buildUnitGraph`,
`dag.ts:163-169`: unannotierte Topics hängen an *allen* Subtopics annotierter Prereqs).
Das wäre eine echte Regression. Also: grobe Topic-Refs für diese beiden, feine Unit-Refs
nur in Areas, die **schon** annotiert sind (`la-tensors`, `metric`).

### 4. Neues Topic `relativistic-hydro` (topics.json, ans Ende der `topics`-Liste)

```json
{
  "id": "relativistic-hydro",
  "title": "Relativistic Hydrodynamics",
  "category": "method",
  "description": "Platzhalter — Sophie ergänzt echten Content. Fluid dynamics for matter moving at speeds where relativity matters (heavy-ion collisions, neutron-star mergers).",
  "prerequisites": ["fluid-dynamics", "special-relativity", "differential-geometry"],
  "featured": false,
  "content": [],
  "subtopics": [
    {
      "id": "basics",
      "title": "Relativistic fluid basics (Platzhalter)",
      "description": "Platzhalter — Sophie ergänzt echten Content.",
      "prerequisites": ["fluid-dynamics", "special-relativity", "la-tensors/einstein"]
    },
    {
      "id": "viscous",
      "title": "Viscous & dissipative flow (Platzhalter)",
      "description": "Platzhalter — Sophie ergänzt echten Content.",
      "prerequisites": ["basics", "metric/curvilinear-coords", "la-tensors/vec-dual-operators"]
    },
    {
      "id": "israel-stuart",
      "title": "Israel-Stewart theory (Platzhalter)",
      "description": "Platzhalter — Sophie ergänzt echten Content. The second-order theory that repairs acausal first-order viscous hydrodynamics.",
      "prerequisites": ["viscous", "metric/metric-under-coords", "la-tensors/dual-transforms"],
      "outcomes": [
        { "id": "first-order-problem", "text": "Platzhalter — explain why first-order viscous hydrodynamics is acausal." },
        { "id": "relaxation", "text": "Platzhalter — write down the relaxation equations for the dissipative currents.", "needs": ["first-order-problem"] },
        { "id": "apply", "text": "Platzhalter — apply the theory to a simple expanding flow.", "needs": ["relaxation"] }
      ]
    }
  ]
}
```

Neues handgeschriebenes Subtopic in `metric` (existiert noch nicht; `metric` ist bereits
über `content/goals/parallel-transport.md` annotiert, handgeschrieben + generiert mischen
sich hier konfliktfrei, weil die IDs disjunkt sind):

```json
{ "id": "curvilinear-coords",
  "title": "Set up curvilinear coordinates and their basis vectors. (Platzhalter)",
  "prerequisites": ["metric-viewpoints"] }
```

**Resultierende Unit-Closure für das Ziel `relativistic-hydro/israel-stuart`** (das ist der
Demo-Fall, an dem QA das Feature prüft):

- `relativistic-hydro`: `israel-stuart`, `viscous`, `basics` (alle 3 → voll)
- `fluid-dynamics`, `special-relativity`: je eine **ganze** Topic-Unit
- `la-tensors`: alle 6 Lernziele (über `duals` zieht es die Basis mit)
- `metric`: `curvilinear-coords`, `metric-viewpoints`, `metric-under-coords`, `raise-lower`
  — **`lengths-angles-volumes` bleibt draußen** → genau der geforderte Fall "expandiertes
  Topic, irrelevantes Geschwister-Subtopic bleibt dimmed"
- **nicht** in der Closure: `differential-geometry` selbst (nur strukturelle Topic-Kante),
  `connection`, `tangent-space`, `tensors`, sowie die übrigen 30+ Topics → dimmed

### 5. Cross-Topic-Unit-Edges (sonst zerfällt der Pfad in Inseln)

`GraphView` zeichnet Kanten heute nur auf **Topic**-Ebene (`GraphView.tsx:260-272`) plus
topic-**interne** Subtopic-Kanten (`:286-298`). Die Kante `metric/curvilinear-coords →
relativistic-hydro/viscous` existiert also gar nicht — `metric` und `la-tensors` würden als
hervorgehobene *Inseln* ohne Verbindung zum Ziel dastehen (topologisch hängen sie über
`differential-geometry → connection`, und das ist gedimmt, weil es nicht gebraucht wird).
Deshalb ist "verbunden" aus dem Backlog eine echte Code-Anforderung: bei aktivem Ziel-Pfad
zeichnet GraphView zusätzlich Kanten zwischen Units der Closure, wobei ein Endpunkt, dessen
Parent nicht expandiert ist, auf den Topic-Node zurückfällt.

## Implementation Steps

1. **`src/data/types.ts`** — `TopicLevel` löschen, `export type TopicCategory = 'field' | 'method' | 'math-concept';`
   ergänzen, `Topic.level` → `category?: TopicCategory` (**optional**). Doc-Kommentar `:58`:
   "What kind of node this is — drives node color and the legend. Optional: topics Sophie
   has not classified yet render in a neutral grey."
2. **`git mv src/graph/levelColors.ts src/graph/categoryColors.ts`**; Inhalt auf
   `CATEGORY_COLORS` / `CATEGORY_LABELS` / `CATEGORY_ORDER` umstellen, jeweils mit dem
   vierten Eintrag `uncategorized` (Werte, Labels und Reihenfolge aus der Design-Direktive).
   Typisierung: `Record<TopicCategory | 'uncategorized', string>`. Zusätzlich den Helper
   `categoryOf(t)` exportieren (Fallback-Regel an genau einer Stelle, siehe Datenmodell).
   Palette-Kommentar mit den **gemessenen** Zahlen ersetzen (dark/light-Kontraste aller
   vier, worst CVD ΔE 14.4 Protanopie field/method, Neutral bleibt darüber) — das Format
   des bestehenden Kommentars `levelColors.ts:3-5` beibehalten, plus einen Satz, warum das
   Neutral der `--muted`-Ton ist und nicht dunkler sein darf (Abgrenzung zu `dimmed`).
3. **`scripts/validate-topics.mjs`** — `:14` `const CATEGORIES = ['field', 'method', 'math-concept'];`
   (`LEVELS` entfernen). `:104` wird von einer Pflicht- zu einer Wert-Prüfung:
   `if (t.category !== undefined && !CATEGORIES.includes(t.category)) errors.push(…)`.
   **Fehlendes Feld ist weder Fehler noch Warnung.** Kommentar an der Stelle, damit niemand
   die Prüfung später "repariert": das Weglassen ist eine Content-Entscheidung.
4. **`src/data/topics.json`** — `"level": …` in allen 40 Topics entfernen. Die 34 von Sophie
   klassifizierten Topics bekommen an derselben Feldposition `"category": …` (Werte aus dem
   Mapping in Datenmodell §2), das neue `relativistic-hydro` `"category": "method"`. Die
   **sechs** Topics `lagrangian-mechanics`, `optics`, `standard-model`,
   `quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`
   bekommen **gar kein** `category`-Feld (nicht `null`, nicht `""`).
5. **`docs/AUTHORING.md`** — Beispiel `:79` und Feldtabelle `:93` auf `category` umstellen:
   die drei Abgrenzungsregeln aus dem Datenmodell-Abschnitt, dazu explizit "**optional** —
   lass das Feld weg, solange du dir nicht sicher bist; solche Topics erscheinen neutral
   grau mit dem Legenden-Eintrag *Not yet categorized*, und der Validator meckert nicht.
   Nachtragen ist ein Ein-Wort-Diff." In der Subtopics-Sektion ergänzen, dass
   handgeschriebene Subtopics eines Topics keine IDs mit den aus `content/*.md` generierten
   teilen dürfen (Duplicate-Fehler).
6. **Konsumenten umstellen** — Rename **plus** Undefined-Sicherheit über `categoryOf()`:
   `Legend.tsx:1-11` (iteriert `CATEGORY_ORDER`, bekommt dadurch automatisch den vierten
   Eintrag), `MapView.tsx:11,94,127,132`, `GoalView.tsx:11,147,205,314`,
   `TopicPage.tsx:14,87,132,255`, `SearchBox.tsx:2,18,31,38,107`, `Home.tsx:2,39`,
   `TopicPrintSheet.tsx:3,27`, `GraphView.tsx:6,258,283`
   (`color: CATEGORY_COLORS[categoryOf(t)]` — gilt für Topic-Node **und** Subtopic-Node,
   Subtopics erben die Farbe des Parent-Topics wie bisher). In `SearchBox` wird das
   Ergebnis-Feld `level: TopicLevel` → `category?: TopicCategory`; `:38` (Subtopic-Treffer)
   erbt weiterhin vom Parent-Topic. Nirgends `!` oder ein Cast — wo eine Kategorie fehlt,
   greift der Fallback, der Dot verschwindet nie.
7. **`src/App.css`** — `--gold`/`--silver`-Tokens in beiden Themes ergänzen, `.ink-pre`/`.ink-post`
   (`:679-687`) auf die Tokens umstellen; `.level-dot` → `.cat-dot` (`:518`, `:961` + alle
   TSX-Usages), `.map-card-level` → `.map-card-category`, `.topic-page-level` → `.topic-page-category`.
   Kein "level" bleibt im Vokabular zurück.
8. **`src/graph/dag.ts`** — neue Funktion, unter `expandedCurriculumFor` platziert:

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

   Implementierung ausschließlich über `expandedCurriculumFor(goalRef, topics)`: über alle
   Gruppen iterieren, `units` = alle `g.units[].unit.id`, `highlight` = `units` **plus**
   `g.topic.id` (Pflicht — sonst dimmt GraphView den Compound-Parent und damit alle
   Topic-Kanten des Pfads), `expand` = `g.topic.id` für Gruppen mit `g.topic.subtopics?.length`.
   Keine eigene Traversierung — Curriculum und Map müssen dieselbe Closure sehen.
9. **`GraphView.tsx` — neue Props** in `GraphViewProps` (`:10-34`), beide optional und
   defaultmäßig aus, damit `GoalView` unverändert weiterläuft:
   - `goalId?: string | null` — der golden markierte Ziel-Node (Unit- oder Topic-ID)
   - `unitPathIds?: Set<string> | null` — Units, zwischen denen Cross-Topic-Unit-Kanten
     gezeichnet werden
10. **`GraphView.tsx` — Gold-Style**: Selector `node.goal-node` nach `node.chosen` (`:76-85`)
    und vor den `sel-*`-Regeln einfügen: `border-width: 3.5`, `border-color: gold`,
    `background-opacity: 0.4`, `underlay-color: gold`, `underlay-opacity: 0.25`,
    `underlay-padding: 10`, `font-weight: bold`, `z-index: 5` (`gold` = die bereits in
    `styleFor` berechnete Theme-Variable `:45`).
11. **`GraphView.tsx` — Label-/Badge-Pass** (`:367-373`): Die Schleife überspringt heute
    Subtopic-Nodes (`topics.find(t => t.id === n.id())` → `return`). Umbauen auf
    `parseUnitId(n.id())` + `buildTopicMap` (einmal außerhalb der Schleife, statt `find` pro
    Node), Titel = Subtopic-Titel bei `subId`, sonst Topic-Titel; Label =
    `${isGoal ? '★ ' : ''}${isDone ? '✓ ' : ''}${title}`. `goal-node` zur `removeClass`-Liste
    in `:366` hinzufügen und `cy.$id(goalId).addClass('goal-node')` im Nicht-`directionalSelect`-Zweig
    setzen (nach dem `highlightIds`-Pass, damit Gold nicht gedimmt wird).
12. **`GraphView.tsx` — Cross-Topic-Unit-Kanten** im Element-Build (nach dem
    Compound-Block `:299`): Wenn `unitPathIds` gesetzt ist, für jede Unit darin über
    `buildUnitGraph(topics)`-Prerequisites iterieren; Endpunkt-ID = die Unit selbst, falls
    ihr Node existiert (Topic ohne Subtopics, oder Parent in `expandedIds`), sonst der
    Parent-Topic-ID. Selbstkanten und Kanten, deren beide Enden auf denselben Node fallen,
    überspringen; IDs über ein `Set` deduplizieren und mit `~u`-Suffix vom Topic-Kanten-Schema
    (`${p}->${t.id}`) trennen. `unitPathIds` in die Dependency-Liste des Build-Effekts
    (`:359`) aufnehmen. Die neuen Kanten bekommen `onpath` automatisch aus dem bestehenden
    Edge-Pass (`:390-394`), weil beide Endpunkte im Highlight-Set liegen.
13. **`MapView.tsx` — State + Ableitungen**:
    - `const [goalPick, setGoalPick] = useState<string | null>(null)`
    - `const goalPath = useMemo(() => (goalPick ? goalPathFor(goalPick, topics) : null), [goalPick, topics])`
    - Auto-Expand ohne den bestehenden Toggle zu bekämpfen: `useEffect` auf `goalPath`, das
      die noch nicht offenen IDs aus `goalPath.expand` in den `expandedIds`-State mergt und
      sich in einem `autoAddedRef` merkt, welche es hinzugefügt hat; beim nächsten
      Ziel-Wechsel/Clear werden **genau diese** wieder entfernt. Manuelle ⊕/Doppelklick-Toggles
      bleiben dadurch unangetastet.
14. **`MapView.tsx` — GraphView-Verdrahtung**: `highlightIds={goalPath?.highlight ?? null}`,
    `unitPathIds={goalPath?.units ?? null}`, `goalId={goalPick}`,
    **`directionalSelect={goalPick === null}`** — kritisch: solange `directionalSelect` an
    ist, ignoriert GraphView `highlightIds` komplett (`:374-396`). Ohne Ziel bleibt das
    heutige Silber/Gold-Klickverhalten unverändert.
15. **`MapView.tsx` — Zielwahl-Einstiege** (alle setzen nur `goalPick`, **kein**
    Modus-Wechsel mehr):
    - Subtopic-Karte `:112` — "Focus this path →" wird zu `★ Show this path` → `setGoalPick(selectedId!)`
    - Subtopic-Chips `:171-179` — `onMakeGoal(...)` → `setGoalPick(...)`; Überschrift `:169`
      auf "Learning goals — pick one to light up its path" anpassen
    - Topic-Karte `:222` "Full curriculum →" bleibt wie es ist (direkte Navigation, bewusst
      als Abkürzung erhalten)
16. **`MapView.tsx` — Goal-Bar** (neu, im `.graph-pane` vor `<Legend/>`), sichtbar nur wenn
    `goalPick`: `role="status" aria-live="polite"`; Titel der Ziel-Unit (über `parseUnitId`
    + `map`, dasselbe Muster wie `:50-54`), Schrittzahl aus `goalPath.units.size`, Button
    "Open curriculum →" → `onMakeGoal(goalPick)` (App wechselt nach `mode=goal`, `App.tsx:104`
    — GoalView selbst bleibt unangetastet), Button "Clear" → `setGoalPick(null)`.
    `.map-hint` (`:82-87`) nur zeigen, wenn weder Topic gewählt **noch** Ziel gepickt ist.
17. **`src/App.css`** — `.goal-bar`, `.goal-bar-title`, `.goal-bar-count`, `.goal-bar-open`,
    `.goal-bar-clear` nach dem `.legend`-Block (`:494`); Panel-Werte von `.map-card`/`.legend`
    übernehmen, Akzent über `var(--gold)`, `flex-wrap` für < 720px (Media-Query-Block ab `:1781`).
18. **Pilot-Content**: `relativistic-hydro` und `metric/curvilinear-coords` wie im
    Datenmodell-Abschnitt in `topics.json` eintragen. Keine neue Markdown-Datei.
19. **`docs/DESIGN-DECISIONS.md`** — "Decision 10 — Node color encodes category, not altitude
    (2026-08-30)": Entscheidung, gemessene Vierer-Palette, und die bewusste Optionalität
    des Feldes (unvollständige Klassifikation ist ein gültiger Zustand, nicht ein
    Migrations-Rest). Als offen gehaltene Pfade: (a) Form-Kodierung pro Kategorie als
    redundanter CVD-Kanal, (b) `level` als optionales Zusatzfeld reaktivierbar, falls die
    Altitude-Info doch gebraucht wird, (c) feine Unit-Highlights auch in GoalView (nutzt
    heute noch das grobe `ancestorsOf`, `GoalView.tsx:84-89`), (d) weitere Kategorien
    (z.B. `application`), falls die grauen Nodes sich als eigene Gruppe entpuppen statt als
    Lücke.
20. **Gates**: `npm run validate`, `npx tsc -b`, `npm run lint`, `npm run build`.

## Verification

- `npm run validate` → `✓ topics.json valid — 41 topics, 54 subtopics, 35 subgoals, …`
  (heute: 40 / 50 / 32; +1 Topic, +3 Subtopics in `relativistic-hydro`, +1 in `metric`,
  +3 Platzhalter-Subgoals),
  **0 Fehler**. Erwartete *neue* Advisory-Warnung (kein Fehler): `⚠ topic "relativistic-hydro":
  topic-level prerequisite "differential-geometry" is not referenced by any subtopic` —
  die Kante ist absichtlich da, damit die feinen Refs nach `metric`/`la-tensors` innerhalb
  der transitiven Prerequisites liegen. Keine *anderen* neuen Warnungen; insbesondere kein
  `duplicate subtopic id`, kein `"…" has subtopics — pick a specific one` und **keine
  einzige Meldung zu den sechs Topics ohne `category`** (weder Fehler noch ⚠).
- `npx tsc -b` clean (fängt jedes vergessene `t.level` **und** jeden ungesicherten
  `category`-Lookup, weil das Feld optional ist), `npm run lint` clean, `npm run build` clean.
- **Optionalitäts-Gate**: `grep -c '"category"' src/data/topics.json` → **35**
  (34 bestehende + `relativistic-hydro`); `grep -c '"level"' src/data/topics.json` → 0;
  kein `"category": null` und kein `"uncategorized"` in topics.json.
- `npm run dev` → `http://localhost:5173/?mode=map` lädt ohne Console-Errors.
- **Farben**: Legende zeigt **vier** Farbeinträge in der Reihenfolge Mathematical concept /
  Method & formalism / Field (physics domain) / Not yet categorized, plus "optional
  prerequisite". Stichprobe: `linear-algebra` blau, `electromagnetism` **rot** (Methode,
  nicht Feld — Sophies Zuordnung), `cosmology` grün, `optics` und `lagrangian-mechanics`
  neutral grau. Theme-Toggle (☀/🌙) → alle vier bleiben in beiden Themes lesbar, und die
  grauen Nodes sind klar von `dimmed`-Nodes unterscheidbar (letztere bei aktivem Ziel-Pfad
  vergleichen).
- **Unkategorisiert im UI**: `?mode=topic&id=optics` zeigt im Header den Text
  "Not yet categorized" (kein leerer Absatz, kein "undefined"); Suche nach "optics" zeigt
  den grauen Dot; die PDF-Ansicht eines unkategorisierten Topics zeigt dasselbe Label.
- **Ziel-Pfad (Hauptflow)**: Suche `relativistic` in der Header-Suche → Map zentriert auf
  `relativistic-hydro`; Klick auf den Node → Karte; im Block "Learning goals" auf
  *Israel-Stewart theory* klicken. Erwartet:
  1. Goal-Bar erscheint oben mit `★ Goal: Israel-Stewart theory (Platzhalter)` + Schrittzahl.
  2. `relativistic-hydro`, `metric` und `la-tensors` sind als Compound-Boxen aufgeklappt.
  3. Der `israel-stuart`-Node ist golden und trägt `★` im Label.
  4. `metric/lengths-angles-volumes` ist sichtbar **gedimmt**, während
     `metric/curvilinear-coords`, `metric/metric-viewpoints`, `metric/raise-lower`,
     `metric/metric-under-coords` hervorgehoben sind.
  5. Es gibt sichtbare `onpath`-Kanten von `metric/curvilinear-coords` und
     `la-tensors/vec-dual-operators` zu `relativistic-hydro/viscous` (keine Inseln),
     ebenso von den Topic-Nodes `fluid-dynamics` und `special-relativity` zu
     `relativistic-hydro/basics`.
  6. Unbeteiligte Topics (`cosmology`, `thermodynamics`, `connection`, `differential-geometry`)
     sind gedimmt.
- **CTA**: "Open curriculum →" → `?mode=goal&goal=relativistic-hydro%2Fisrael-stuart`,
  Sidebar-Titel "Curriculum — Israel-Stewart theory (Platzhalter)", die drei Platzhalter-Subgoals
  als Checkboxen, Gruppe *Metric* mit `only: …` und ohne "Compute lengths, angles, and volumes".
- **Clear**: Zurück auf die Map, "Clear" → Dimming weg, die vom Ziel automatisch geöffneten
  Topics wieder zu, manuell per Doppelklick geöffnete Topics bleiben offen, das
  Silber/Gold-Klickverhalten (`directionalSelect`) funktioniert wieder.
- **Keine Regression**: `?mode=goal&goal=cosmology` — Curriculum-Länge und Reihenfolge
  identisch zu vorher (SR/Fluid-Dynamics erscheinen weiterhin als ganze Topics);
  `?mode=goal&goal=general-relativity/parallel-transport` unverändert; Topic-Page
  (`?mode=topic&id=metric`) zeigt das neue Platzhalter-Lernziel; PDF-Druckansicht
  (Download PDF) zeigt im Kopf das Kategorie-Label statt des Level-Labels.
- **a11y/Responsive**: Goal-Bar per Tastatur erreichbar, beide Buttons fokussierbar,
  `aria-live` meldet die Zielwahl; bei 375px Breite bricht die Bar um und überdeckt weder
  Legende noch Map-Card; Kategorie steht überall auch als **Text** (Map-Card, Topic-Page,
  Legende, PDF), nie nur als Farbe.

## Annahmen

- **`level` wird ersatzlos entfernt** statt neben `category` weitergepflegt. Falls die
  Altitude-Information doch gewünscht ist, kommt sie als optionales Feld zurück — als Pfad
  in DESIGN-DECISIONS notiert.
- **Das Kategorie-Mapping ist gesetzt, nicht geraten** — es kommt von Sophie (Datenmodell §2)
  und wird 1:1 übernommen. Auch die auf den ersten Blick überraschenden Zuordnungen
  (`electromagnetism`, `thermodynamics`, `waves-oscillations`, `classical-mechanics` als
  `method`) sind so gewollt: Sophie trennt "Handwerkszeug, das man beherrscht" von
  "Phänomenbereich, den man erforscht". Nicht während der Implementierung nachjustieren.
- **Die sechs Topics ohne `category` sind eine bewusste inhaltliche Lücke, kein TODO und
  kein Fehler.** `lagrangian-mechanics`, `optics`, `standard-model`,
  `quantum-gravity-frontiers`, `stellar-astrophysics`, `galaxies-large-scale-structure`
  rendern neutral grau mit dem Legenden-Eintrag "Not yet categorized". Weder Validator noch
  QA dürfen das als Mangel melden; Sophie füllt schrittweise nach.
- **`'uncategorized'` ist ein reiner Render-Zustand**, kein Datenwert: er existiert in
  `CATEGORY_COLORS`/`CATEGORY_LABELS`/`CATEGORY_ORDER` und im `categoryOf()`-Fallback, aber
  niemals in topics.json. Damit gibt es genau eine Schreibweise für "nicht klassifiziert"
  (Feld fehlt), und der Validator braucht keine Sonderfälle.
- **Neutral-Ton ist `#7a86a0`**, der bestehende `--muted`-Wert des Light-Themes — bewusst
  hell genug (5.38 dark / 3.35 light), damit unkategorisierte Nodes nicht wie deaktiviert
  oder gedimmt wirken. Wer ihn abdunkelt, kollidiert mit dem `dimmed`-Zustand.
- **Pilot-Content wird inline in topics.json authored, nicht als `content/goals/*.md`** —
  begründet im Datenmodell-Abschnitt (Duplicate-Subtopic-Kollision + Bare-Topic-Refs sind
  im Markdown-Format nicht ausdrückbar). Wenn Sophie später `relativistic-hydro` in
  Markdown pflegen will, müssen die handgeschriebenen Subtopics vorher raus.
- **`fluid-dynamics` und `special-relativity` bleiben unannotiert.** `relativistic-hydro/basics`
  hängt deshalb an den *ganzen* Topics statt an "Euler/Lagrange-Formalismus" bzw.
  "Lorentz-Invarianz" — diese Subtopics existieren nicht, und sie nur für den Piloten
  anzulegen würde bestehende Curricula verkleinern. TODO-Notiz in AUTHORING: sobald Sophie
  diese Topics annotiert, die groben Refs durch die spezifischen ersetzen.
- **"Coordinate transformations" und "vectors as differential operators"** aus dem Backlog
  existieren bereits als `la-tensors/dual-transforms` und `la-tensors/vec-dual-operators`
  (kompiliert aus `content/goals/parallel-transport.md`) — sie werden wiederverwendet statt
  dupliziert. Nur "curvilinear coordinates" fehlt und wird als `metric/curvilinear-coords`
  neu angelegt.
- **Gold-Markierung ist reiner UI-State** (`MapView`), wird nicht in URL oder localStorage
  persistiert. Ein Reload verliert die Zielwahl; das dauerhafte Ziel ist weiterhin
  `?mode=goal&goal=…`.
- **Kein Auto-Zoom** auf das Ziel nach der Wahl: der Graph-Rebuild durch das Auto-Expand
  macht ohnehin ein `fit()`. Falls die Live-QA das als verwirrend meldet, ist der
  `focus`-Prop-Pfad (`GraphView.tsx:403-416`) der vorgesehene Nachrüst-Hook.
- **GoalView bleibt unverändert**, obwohl sein Highlight noch das grobe `ancestorsOf` nutzt.
  Die feine Variante dort nachzuziehen ist ein eigenes Feature (als Pfad notiert), sonst
  wächst dieses hier über die Reviewbarkeit hinaus.
- **Keine Form-Kodierung pro Kategorie** in v1 (Layout-Risiko durch `width/height: 'label'`);
  die Rot/Grün-CVD-Schwäche wird über Labels, Legende und Kategorie-Text abgefangen.
