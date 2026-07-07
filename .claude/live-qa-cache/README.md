# Live-QA Recipe-Cache

Dieser Ordner enthält den Recipe-Cache des `live-qa-analyst`-Agents.

## Was steht hier drin?

- `recipes.md` — vom Agent runtime gepflegt, **gitignored**. Wird automatisch
  beim ersten Live-QA-Lauf angelegt.
- `README.md` — diese Datei. Erklärt das System für Template-User.

## Was ist ein Recipe?

Ein Recipe ist eine semantische Browser-Navigations-Sequenz, gespeichert unter einem
kebab-case Intent-Namen (z.B. `submit-login-form`, `open-settings-modal`).

Der Agent nutzt Recipes als **HINTS** — nicht als Wahrheit. Jeder Schritt wird trotzdem
live über `take_snapshot` (a11y-Tree) + die Chrome-DevTools-Aktionen (`click`/`fill`)
verifiziert. Failed ein Hint-Step, fällt der Agent auf normale Discovery zurück und markiert
das Recipe als stale.

## Mechanik in einem Satz pro Punkt

- **Build-Fingerprint:** jedes Recipe ist an `git rev-parse --short HEAD` (+ `-dirty`)
  gebunden. Bei neuem Commit → alte Recipes werden für Hint-Lookup ignoriert.
- **Stale-Tracking:** failed ein Hint, wird `stale-count++`. Ab `stale-count >= 3`
  wird das Recipe nicht mehr genutzt.
- **Keine Pixel-Koordinaten:** Recipes speichern nur Route + a11y-Label/Rolle/Selektor-Intent,
  niemals xy-Koordinaten oder flüchtige Snapshot-uids — sonst wären sie bei kleinster
  UI-Änderung toxisch.
- **Append-only:** Recipes werden nie gelöscht (historisches Material). Stale- und
  alte-Build-Recipes bleiben in der Datei, werden nur ignoriert.

## Manuell editieren?

Nein. Format-Details siehe `.claude/agents/live-qa-analyst.md`, Section "Recipe-Cache".
