import type { Topic } from '../data/types';

export type TopicMap = Map<string, Topic>;

export function buildTopicMap(topics: Topic[]): TopicMap {
  return new Map(topics.map((t) => [t.id, t]));
}

/** All transitive prerequisites of `goalId`, excluding the goal itself. */
export function ancestorsOf(goalId: string, map: TopicMap): Set<string> {
  const seen = new Set<string>();
  const stack = [...(map.get(goalId)?.prerequisites ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(map.get(id)?.prerequisites ?? []));
  }
  return seen;
}

/** Reverse adjacency: topic id → ids of topics that list it as a prerequisite. */
export function dependentsMap(topics: Topic[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const t of topics)
    for (const p of t.prerequisites) {
      const list = children.get(p);
      if (list) list.push(t.id);
      else children.set(p, [t.id]);
    }
  return children;
}

/** All transitive dependents of `id` — everything it is (in)directly used in. */
export function descendantsOf(id: string, topics: Topic[]): Set<string> {
  const children = dependentsMap(topics);
  const seen = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(children.get(cur) ?? []));
  }
  return seen;
}

/** Longest-path depth from entry points; used for ordering ties. */
function depths(topics: Topic[], map: TopicMap): Map<string, number> {
  const memo = new Map<string, number>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const prereqs = map.get(id)?.prerequisites ?? [];
    const d = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(depth));
    memo.set(id, d);
    return d;
  };
  topics.forEach((t) => depth(t.id));
  return memo;
}

/**
 * Curriculum for a goal: the goal's ancestor subgraph plus the goal itself,
 * topologically sorted (prerequisites first), ties broken by graph depth
 * then title so the order is stable and pedagogically sensible.
 */
export function curriculumFor(goalId: string, topics: Topic[]): Topic[] {
  const map = buildTopicMap(topics);
  const include = ancestorsOf(goalId, map);
  include.add(goalId);
  const subset = topics.filter((t) => include.has(t.id));
  const d = depths(subset, map);

  const indegree = new Map(
    subset.map((t) => [t.id, t.prerequisites.filter((p) => include.has(p)).length]),
  );
  const dependents = new Map<string, string[]>(subset.map((t) => [t.id, []]));
  for (const t of subset)
    for (const p of t.prerequisites) if (include.has(p)) dependents.get(p)!.push(t.id);

  const ready = subset.filter((t) => indegree.get(t.id) === 0).map((t) => t.id);
  const order: Topic[] = [];
  while (ready.length) {
    ready.sort((a, b) => d.get(a)! - d.get(b)! || a.localeCompare(b));
    const id = ready.shift()!;
    order.push(map.get(id)!);
    for (const dep of dependents.get(id)!) {
      indegree.set(dep, indegree.get(dep)! - 1);
      if (indegree.get(dep) === 0) ready.push(dep);
    }
  }
  return order;
}
