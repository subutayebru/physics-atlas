# Authoring Guide — adding topics & content

All content lives in **one file**: [`src/data/topics.json`](../src/data/topics.json).
Edit it, run `npm run validate`, done. The site rebuilds the graph from it
automatically.

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

## Before committing

```bash
npm run validate
```

Catches: duplicate/malformed ids, prerequisites pointing to topics that don't
exist, cycles (A needs B needs A), bad URLs, missing fields. If it prints
`✓ topics.json valid`, the site will render.

## Rules of thumb for good graph shape

- A topic with more than ~5 direct prerequisites is probably too big — split it.
- If two topics always appear together, consider merging them.
- Prefer adding a *humbler* intermediate goal (e.g. Special Relativity) over
  one giant leap — endings at different depths are a feature of this site.
