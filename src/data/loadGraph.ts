import rawData from './topics.json';
import generated from './generated-outcomes.json';
import type { Outcome, Subtopic, Topic, TopicGraph } from './types';

interface Generated {
  outcomes: Record<string, Outcome[]>;
  goals: Record<string, { subgoals: Outcome[]; requires: string[] }>;
}

/**
 * topics.json stays the hand-authored source of truth; the compiled
 * outcome/goal sidecar (from content/*.md) is merged onto units additively.
 * Runs once at module load — missing/empty sidecar just leaves units as-is.
 */
function merge(): TopicGraph {
  const data = rawData as TopicGraph;
  const gen = generated as Generated;

  const apply = (id: string, target: Topic | Subtopic) => {
    const lib = gen.outcomes[id];
    const goal = gen.goals[id];
    const merged = [...(lib ?? []), ...(goal?.subgoals ?? [])];
    if (merged.length) target.outcomes = merged;
    if (goal?.requires.length) target.requires = goal.requires;
  };

  for (const t of data.topics) {
    apply(t.id, t);
    for (const s of t.subtopics ?? []) apply(`${t.id}/${s.id}`, s);
  }
  return data;
}

export const graph: TopicGraph = merge();
