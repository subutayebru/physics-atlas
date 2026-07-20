import type { Subtopic, Topic } from '../data/types';

export type TopicMap = Map<string, Topic>;

/** 'topicId' for a whole topic, or 'topicId/subId' for a subtopic. */
export type UnitId = string;

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

export function parseUnitId(id: UnitId): { topicId: string; subId?: string } {
  const i = id.indexOf('/');
  return i === -1 ? { topicId: id } : { topicId: id.slice(0, i), subId: id.slice(i + 1) };
}

function isAnnotated(t: Topic | undefined): boolean {
  return !!t?.subtopics && t.subtopics.length > 0;
}

/**
 * Resolves a raw subtopic prerequisite to a canonical unit id, or null when
 * unresolvable. Rules mirrored in scripts/validate-topics.mjs — keep in sync:
 * "a/b" full ref; bare sibling shorthand; bare topic only if unannotated.
 */
export function resolveSubtopicRef(raw: string, parent: Topic, map: TopicMap): UnitId | null {
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [topicId, subId] = parts;
    const t = map.get(topicId);
    return t?.subtopics?.some((s) => s.id === subId) ? `${topicId}/${subId}` : null;
  }
  if (parent.subtopics?.some((s) => s.id === raw)) return `${parent.id}/${raw}`;
  const t = map.get(raw);
  if (t && !isAnnotated(t)) return raw;
  return null;
}

export interface Unit {
  id: UnitId;
  topic: Topic;
  /** undefined = whole-topic unit */
  subtopic?: Subtopic;
  prerequisites: UnitId[];
}

/**
 * The fine-grained dependency graph: annotated topics contribute one unit per
 * subtopic (resolved refs are authoritative — topic-level edges are not
 * inherited); unannotated topics stay one unit, depending on all subtopics of
 * annotated prerequisites (without annotation we can't know which parts).
 */
export function buildUnitGraph(topics: Topic[]): Map<UnitId, Unit> {
  const map = buildTopicMap(topics);
  const units = new Map<UnitId, Unit>();
  for (const t of topics) {
    if (isAnnotated(t)) {
      for (const s of t.subtopics!) {
        const id = `${t.id}/${s.id}`;
        const prerequisites: UnitId[] = [];
        for (const raw of s.prerequisites) {
          const r = resolveSubtopicRef(raw, t, map);
          if (r && r !== id && !prerequisites.includes(r)) prerequisites.push(r);
        }
        units.set(id, { id, topic: t, subtopic: s, prerequisites });
      }
    } else {
      const prerequisites: UnitId[] = [];
      for (const p of t.prerequisites) {
        const pt = map.get(p);
        if (isAnnotated(pt)) for (const ps of pt!.subtopics!) prerequisites.push(`${p}/${ps.id}`);
        else if (pt) prerequisites.push(p);
      }
      units.set(t.id, { id: t.id, topic: t, prerequisites });
    }
  }
  return units;
}

/**
 * A topic's subtopics topologically ordered by their same-topic edges
 * (cross-topic prerequisites are satisfied by earlier curriculum groups),
 * ties broken by local depth then id. Stalled nodes append in file order.
 */
export function subtopicsInOrder(topic: Topic): Subtopic[] {
  const subs = topic.subtopics ?? [];
  const byId = new Map(subs.map((s) => [s.id, s]));
  const localPrereqs = new Map<string, string[]>();
  for (const s of subs) {
    const ps: string[] = [];
    for (const raw of s.prerequisites) {
      const sid = raw.includes('/')
        ? raw.startsWith(`${topic.id}/`)
          ? raw.slice(topic.id.length + 1)
          : null
        : raw;
      if (sid && sid !== s.id && byId.has(sid) && !ps.includes(sid)) ps.push(sid);
    }
    localPrereqs.set(s.id, ps);
  }
  const memo = new Map<string, number>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const ps = localPrereqs.get(id) ?? [];
    const d = ps.length === 0 ? 0 : 1 + Math.max(...ps.map(depth));
    memo.set(id, d);
    return d;
  };
  const indegree = new Map(subs.map((s) => [s.id, localPrereqs.get(s.id)!.length]));
  const dependents = new Map<string, string[]>(subs.map((s) => [s.id, []]));
  for (const [id, ps] of localPrereqs) for (const p of ps) dependents.get(p)!.push(id);
  const ready = subs.filter((s) => indegree.get(s.id) === 0).map((s) => s.id);
  const order: Subtopic[] = [];
  while (ready.length) {
    ready.sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
    const id = ready.shift()!;
    order.push(byId.get(id)!);
    for (const dep of dependents.get(id)!) {
      indegree.set(dep, indegree.get(dep)! - 1);
      if (indegree.get(dep) === 0) ready.push(dep);
    }
  }
  if (order.length < subs.length) for (const s of subs) if (!order.includes(s)) order.push(s);
  return order;
}

export interface CurriculumGroup {
  topic: Topic;
  /** Included units in local reading order */
  units: Unit[];
  /** Annotated topic with only some subtopics included */
  partial: boolean;
}

function groupsForWholeTopics(order: Topic[], unitMap: Map<UnitId, Unit>): CurriculumGroup[] {
  return order.map((t) => ({
    topic: t,
    units: isAnnotated(t)
      ? subtopicsInOrder(t).map((s) => unitMap.get(`${t.id}/${s.id}`)!)
      : [unitMap.get(t.id)!],
    partial: false,
  }));
}

/**
 * Curriculum at unit granularity, grouped by parent topic. A topic-level goal
 * reuses curriculumFor (identical topic ordering); a subtopic goal includes
 * only the transitively required units, so prerequisite topics appear with
 * just the parts that are actually needed.
 */
export function expandedCurriculumFor(goalRef: UnitId, topics: Topic[]): CurriculumGroup[] {
  const map = buildTopicMap(topics);
  const unitMap = buildUnitGraph(topics);
  const { topicId, subId } = parseUnitId(goalRef);

  if (!subId || !unitMap.has(goalRef)) {
    return groupsForWholeTopics(curriculumFor(topicId, topics), unitMap);
  }

  const include = new Set<UnitId>();
  const stack: UnitId[] = [goalRef];
  while (stack.length) {
    const cur = stack.pop()!;
    if (include.has(cur)) continue;
    include.add(cur);
    stack.push(...(unitMap.get(cur)?.prerequisites ?? []));
  }

  const includedTopics = new Set<string>();
  for (const u of include) includedTopics.add(parseUnitId(u).topicId);

  // Contracted subgraph: topic-level edges plus cross-topic unit edges,
  // restricted to included topics — validated acyclic by the data gate.
  const prereqTopics = new Map<string, Set<string>>();
  for (const tid of includedTopics) {
    const set = new Set<string>();
    for (const p of map.get(tid)?.prerequisites ?? []) if (includedTopics.has(p)) set.add(p);
    prereqTopics.set(tid, set);
  }
  for (const u of include) {
    const tid = parseUnitId(u).topicId;
    for (const p of unitMap.get(u)?.prerequisites ?? []) {
      const pt = parseUnitId(p).topicId;
      if (pt !== tid) prereqTopics.get(tid)!.add(pt);
    }
  }

  const memo = new Map<string, number>();
  const depth = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const ps = prereqTopics.get(id) ?? new Set();
    const d = ps.size === 0 ? 0 : 1 + Math.max(...[...ps].map(depth));
    memo.set(id, d);
    return d;
  };
  const indegree = new Map([...includedTopics].map((id) => [id, prereqTopics.get(id)!.size]));
  const dependents = new Map<string, string[]>([...includedTopics].map((id) => [id, []]));
  for (const [id, ps] of prereqTopics) for (const p of ps) dependents.get(p)!.push(id);
  const ready = [...includedTopics].filter((id) => indegree.get(id) === 0);
  const topicOrder: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
    const id = ready.shift()!;
    topicOrder.push(id);
    for (const dep of dependents.get(id)!) {
      indegree.set(dep, indegree.get(dep)! - 1);
      if (indegree.get(dep) === 0) ready.push(dep);
    }
  }

  return topicOrder.map((tid) => {
    const topic = map.get(tid)!;
    const units = isAnnotated(topic)
      ? subtopicsInOrder(topic)
          .map((s) => unitMap.get(`${tid}/${s.id}`)!)
          .filter((u) => include.has(u.id))
      : [unitMap.get(tid)!];
    return { topic, units, partial: isAnnotated(topic) && units.length < topic.subtopics!.length };
  });
}

export function unitDone(unit: Unit, done: Set<string>): boolean {
  return done.has(unit.id) || (unit.subtopic !== undefined && done.has(unit.topic.id));
}

export function topicDone(topic: Topic, done: Set<string>): boolean {
  if (done.has(topic.id)) return true;
  const subs = topic.subtopics ?? [];
  return subs.length > 0 && subs.every((s) => done.has(`${topic.id}/${s.id}`));
}
