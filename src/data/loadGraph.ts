import rawData from './topics.json';
import generated from './generated-units.json';
import type { Subtopic, TopicGraph } from './types';

interface Generated {
  /** areaTopicId -> its compiled learning-goal subtopics */
  subtopics: Record<string, Subtopic[]>;
}

/**
 * topics.json stays the hand-authored source of truth; the compiled
 * learning-goal subtopics (from content/*.md → generated-units.json) are
 * appended onto their area topics additively. Runs once at module load — a
 * missing/empty sidecar just leaves topics as authored.
 */
function merge(): TopicGraph {
  const data = rawData as TopicGraph;
  const gen = generated as Generated;
  const byId = new Map(data.topics.map((t) => [t.id, t]));

  for (const [topicId, subs] of Object.entries(gen.subtopics ?? {})) {
    const t = byId.get(topicId);
    if (!t) continue;
    t.subtopics = [...(t.subtopics ?? []), ...subs];
  }
  return data;
}

export const graph: TopicGraph = merge();
