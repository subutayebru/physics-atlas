# Authoring Guide — adding topics & content

Content lives in **two places**:

| You want to add… | Edit | Format |
|---|---|---|
| A **learning goal** ("be able to derive X") with its subgoals + prerequisites | `content/goals/<name>.md` | Markdown outline — [see below](#learning-goals-markdown) |
| A **topic / area** on the map, or resources (books, videos) | [`src/data/topics.json`](../src/data/topics.json) | JSON |

Either way: edit, run `npm run validate`, done. The site rebuilds the graph
automatically.

## Learning goals (Markdown)

This is the everyday format — write the outline, the build turns it into the
map. **Every learning goal is a real node**: it has its own subgoals, its own
prerequisites, and *any* of them can be clicked to become the main goal.

Create `content/goals/parallel-transport.md`:

```markdown
# Parallel transport   {id: general-relativity/parallel-transport}

Be able to derive and use the parallel transport equation.

## Subgoals

- Explain all the elements of the parallel transport equation.
- Distinguish between the geodesic equation and parallel transport.

## Prerequisites

### Linear Algebra   {ref: la-tensors}

- Comfortably manipulate matrix equations.        {id: matrix-eqs}
- Use and explain Einstein index notation.        {id: einstein}
- Distinguish abstract vector spaces and 1-forms. {id: duals, needs: matrix-eqs, einstein}

### Calculus   {ref: calculus-geometry}

- Compute derivatives.   {id: compute-derivatives}
- Compute Jacobians.     {needs: compute-derivatives}
```

What each part does:

| Line | Meaning |
|---|---|
| `# Title {id: topicId/goalId}` | The learning goal itself. `topicId` must be a topic in topics.json (its home — e.g. `general-relativity`); `goalId` is a new kebab-case id you choose. |
| Text under the title | The goal's one-line description. |
| `## Subgoals` | Its checkbox breakdown — "what you can do". Each bullet becomes one checkbox. |
| `## Prerequisites` | The areas this goal builds on. |
| `### Area {ref: topicId}` | An **area** — must be an existing topic id. Its bullets become learning goals *of that area*. |
| `- text {id: …, needs: …}` | One learning goal. `id` optional (auto-slugged from the text, but write it if others reference it). `needs` lists learning goals that come **first**. |

`needs` rules:

- Bare id (`matrix-eqs`) = a sibling in the **same** area.
- Cross-area = `areaTopicId/goalId` (e.g. `la-tensors/duals`).
- These become real prerequisite edges — they order the curriculum and draw
  the arrows on the map. Keep them acyclic; the validator checks.

Reuse is by id: writing the same `{id:}` under the same `{ref:}` area in
another file refers to the *same* learning goal (first definition wins, and
the validator warns if a later one disagrees). So a second goal that also
needs `la-tensors/duals` just lists it — the learner ticks it once.

If an area doesn't exist yet, add it to topics.json as a normal topic first
(see below), then point `{ref:}` at it.

## Adding a topic

Append an object to the `topics` array:

```json
{
  "id": "quantum-field-theory",
  "title": "Quantum Field Theory",
  "level": "advanced",
  "description": "One or two sentences: what is this and why would someone learn it?",
  "prerequisites": ["quantum-mechanics", "special-relativity", "lagrangian-mechanics"],
  "featured": false,
  "content": []
}
```

Field rules:

| Field | Rule |
|---|---|
| `id` | kebab-case (`lower-case-with-dashes`), unique. Never change an id later without updating everyone who lists it as a prerequisite. |
| `title` | Human-readable name shown on the node. |
| `level` | `foundation` (math basics) · `core` (first physics courses) · `advanced` (upper-level) · `goal` (summit topics). Drives node color only. |
| `prerequisites` | ids of topics to learn **directly before** this one. Only direct edges — don't list calculus on cosmology; the graph walks the chain for you. `[]` for entry-point topics. |
| `featured` | `true` shows the topic in the goal picker on the landing view. Optional. |
| `content` | list of learning resources, see below. `[]` is allowed (validator warns but passes). |

## Adding content to a topic

```json
{
  "type": "video",
  "title": "The Theoretical Minimum — Cosmology",
  "author": "Leonard Susskind (Stanford)",
  "url": "https://theoreticalminimum.com/courses",
  "note": "Full lecture course pitched exactly at this level."
}
```

- `type`: `book` · `video` · `course` · `notes` · `article`
- `url`: optional (books often have none), must start with `http(s)://`
- `note`: one sentence of guidance — *why this resource / which chapters / what order*. This is the most valuable field; always write it.

## Subtopics (optional, per topic)

A topic can carry a `subtopics` array — its chapter-level parts, each with its
own prerequisites. This is what makes minimal curricula possible: someone
learning *The Hydrogen Atom* gets only *Eigenvalues & Eigenvectors* from
Linear Algebra, not the whole course. Annotate incrementally — topics without
`subtopics` keep working as one block.

```json
{
  "id": "linear-algebra",
  "...": "...",
  "subtopics": [
    { "id": "vectors-and-spaces", "title": "Vectors & Vector Spaces", "prerequisites": ["hs-math"] },
    {
      "id": "eigenvalues-and-eigenvectors",
      "title": "Eigenvalues & Eigenvectors",
      "description": "Directions a transformation only stretches.",
      "prerequisites": ["matrices-and-linear-maps", "determinants"],
      "content": []
    }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | kebab-case, unique **within its topic**. |
| `title` | Shown as a curriculum step. |
| `description` | Optional, shown when the step is expanded. |
| `prerequisites` | Refs in three forms — see below. |
| `optionalPrerequisites` | Same ref forms; *enrichment*, not required. Curriculum shows these steps with an "optional" badge and a hide toggle; the map draws optional topic edges dashed. On overlap with `prerequisites`, mandatory wins. |
| `objectives` | Optional list of plain "after this step you can …" strings; shown in the step detail, the map card, and the PDF export. For a *checkbox* breakdown, author the step as a learning goal in Markdown instead — its `## Subgoals` become tickable. |
| `content` | Optional own resources; when empty/absent the step shows the parent topic's resources. |

Topics support `optionalPrerequisites` (topic ids) and `objectives` too.
Keep the union of mandatory + optional edges acyclic — the validator checks it,
because the curriculum ordering runs on both together.

Prerequisite refs, resolved in this order:

1. `"linear-algebra/eigenvalues-and-eigenvectors"` — full `topic/subtopic` ref, works across topics.
2. `"determinants"` — shorthand for a **sibling** subtopic of the same topic.
3. `"hs-math"` — a whole topic, allowed **only** if that topic has no subtopics
   of its own. Referencing an annotated topic bare is an error — pick the
   specific subtopic you need.

Consistency rule: a cross-topic ref should stay inside topics your topic
already (transitively) builds on — the validator warns otherwise, because it
usually means a topic-level edge is missing from the map.

## Skills (optional, top-level)

Next to `topics` the file can carry a `skills` array — study habits shown as a
collapsible "Skills to practice along the way" panel under every curriculum
(they are *not* graph nodes and have no prerequisites):

```json
{ "id": "dimensional-analysis", "title": "Dimensional analysis & estimation", "description": "…", "content": [] }
```

## Before committing

```bash
npm run validate
```

This first compiles `content/**/*.md` into the map, then validates everything
together. Catches: duplicate/malformed ids, prerequisites (and `needs`)
pointing to things that don't exist, cycles (A needs B needs A — also through
subtopic chains), bare refs to annotated topics, bad URLs, missing fields. If
it prints `✓ topics.json valid`, the site will render.

Lines starting with `⚠` are advisories, not failures — the most common is
"topic-level prerequisite … is not referenced by any subtopic", which just
means an area's learning goals don't yet cover everything it builds on.

## Rules of thumb for good graph shape

- A topic with more than ~5 direct prerequisites is probably too big — split it.
- If two topics always appear together, consider merging them.
- Prefer adding a *humbler* intermediate goal (e.g. Special Relativity) over
  one giant leap — endings at different depths are a feature of this site.
