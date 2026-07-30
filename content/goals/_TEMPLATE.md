<!--
  Copy this file to content/goals/<your-goal>.md and fill it in.
  Files starting with "_" are ignored by the build, so this template is safe.
  When done, run:  npm run validate

  Full guide: docs/AUTHORING.md
-->

# <Goal title>   {id: <topic-id>/<goal-id>}

<One sentence: what you'll be able to do.>

## Subgoals

<!-- The checkbox breakdown of THIS goal. One bullet = one checkbox. -->

- <Can do …>
- <Can do …>

## Prerequisites

<!--
  Each "###" is an AREA and must be an existing topic id from topics.json
  (e.g. la-tensors, calculus-geometry, tangent-space, tensors, metric,
  connection). Its bullets are learning goals OF THAT AREA — each one can
  itself be opened as a main goal later.

  {id: …}    optional, but write it if something else references it
  {needs: …} what must come first — a sibling id in the same area,
             or "area-topic-id/goal-id" to point at another area
-->

### <Area title>   {ref: <topic-id>}

- <Can do …>                {id: <short-id>}
- <Can do …>                {id: <another-id>, needs: <short-id>}

### <Area title>   {ref: <topic-id>}

- <Can do …>                {id: <short-id>}
