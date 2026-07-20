#!/usr/bin/env node
// Validates src/data/topics.json: schema shape, unique ids, resolvable
// prerequisites (topic- and subtopic-level), and acyclicity.
// Subtopic ref-resolution rules mirror src/graph/dag.ts — keep them in sync.
// Run via `npm run validate`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), '../src/data/topics.json');

const LEVELS = ['foundation', 'core', 'advanced', 'goal'];
const CONTENT_TYPES = ['book', 'video', 'course', 'notes', 'article'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];
const warn = [];

let data;
try {
  data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
} catch (e) {
  console.error(`✗ Cannot read/parse ${DATA_PATH}: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(data.topics)) {
  console.error('✗ Top-level "topics" must be an array');
  process.exit(1);
}

function checkContentItems(where, content) {
  for (const c of content) {
    if (!CONTENT_TYPES.includes(c.type)) errors.push(`${where}: content type "${c.type}" not in ${CONTENT_TYPES.join(', ')}`);
    if (!c.title) errors.push(`${where}: content item missing "title"`);
    if (c.url && !/^https?:\/\//.test(c.url)) errors.push(`${where}: content url "${c.url}" is not http(s)`);
  }
}

const ids = new Set();
let subtopicCount = 0;
for (const t of data.topics) {
  const where = `topic "${t.id ?? t.title ?? '<unnamed>'}"`;
  if (!t.id || typeof t.id !== 'string') errors.push(`${where}: missing string "id"`);
  else if (!KEBAB.test(t.id)) errors.push(`${where}: id must be kebab-case`);
  else if (ids.has(t.id)) errors.push(`${where}: duplicate id`);
  else ids.add(t.id);

  if (!t.title) errors.push(`${where}: missing "title"`);
  if (!LEVELS.includes(t.level)) errors.push(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (!t.description) warn.push(`${where}: empty description`);
  if (!Array.isArray(t.prerequisites)) errors.push(`${where}: "prerequisites" must be an array (use [] for none)`);
  if (!Array.isArray(t.content)) errors.push(`${where}: "content" must be an array (use [] for none)`);
  else {
    checkContentItems(where, t.content);
    if (t.content.length === 0) warn.push(`${where}: no content attached yet`);
  }

  if (t.subtopics !== undefined) {
    if (!Array.isArray(t.subtopics)) errors.push(`${where}: "subtopics" must be an array`);
    else {
      if (t.subtopics.length === 0) warn.push(`${where}: empty "subtopics" — topic is treated as unannotated`);
      const subIds = new Set();
      for (const s of t.subtopics) {
        const sw = `${where} subtopic "${s.id ?? s.title ?? '<unnamed>'}"`;
        if (!s.id || typeof s.id !== 'string') errors.push(`${sw}: missing string "id"`);
        else if (!KEBAB.test(s.id)) errors.push(`${sw}: id must be kebab-case`);
        else if (subIds.has(s.id)) errors.push(`${sw}: duplicate subtopic id`);
        else subIds.add(s.id);
        if (!s.title) errors.push(`${sw}: missing "title"`);
        if (!Array.isArray(s.prerequisites)) errors.push(`${sw}: "prerequisites" must be an array (use [] for none)`);
        if (s.content !== undefined) {
          if (!Array.isArray(s.content)) errors.push(`${sw}: "content" must be an array`);
          else checkContentItems(sw, s.content);
        }
      }
      subtopicCount += t.subtopics.length;
    }
  }
}

const skills = data.skills ?? [];
if (!Array.isArray(skills)) errors.push('top-level "skills" must be an array');
else {
  const skillIds = new Set();
  for (const s of skills) {
    const sw = `skill "${s.id ?? s.title ?? '<unnamed>'}"`;
    if (!s.id || typeof s.id !== 'string') errors.push(`${sw}: missing string "id"`);
    else if (!KEBAB.test(s.id)) errors.push(`${sw}: id must be kebab-case`);
    else if (skillIds.has(s.id)) errors.push(`${sw}: duplicate id`);
    else skillIds.add(s.id);
    if (!s.title) errors.push(`${sw}: missing "title"`);
    if (!s.description) errors.push(`${sw}: missing "description"`);
    if (s.content !== undefined) {
      if (!Array.isArray(s.content)) errors.push(`${sw}: "content" must be an array`);
      else checkContentItems(sw, s.content);
    }
  }
}

// Prerequisite references must resolve
for (const t of data.topics) {
  for (const p of t.prerequisites ?? []) {
    if (!ids.has(p)) errors.push(`topic "${t.id}": unknown prerequisite "${p}"`);
    if (p === t.id) errors.push(`topic "${t.id}": lists itself as a prerequisite`);
  }
}

// --- Subtopic ref resolution (rules mirrored in src/graph/dag.ts) ---
const byId = new Map(data.topics.map((t) => [t.id, t]));
const isAnnotated = (t) => Array.isArray(t?.subtopics) && t.subtopics.length > 0;
const subIdsOf = (t) => new Set(Array.isArray(t?.subtopics) ? t.subtopics.map((s) => s.id) : []);

// "parentTopic/subId" -> resolved unit ids of its prerequisites
const resolvedBySub = new Map();

for (const t of data.topics) {
  if (!isAnnotated(t)) continue;
  const siblings = subIdsOf(t);
  for (const s of t.subtopics) {
    const sw = `topic "${t.id}" subtopic "${s.id}"`;
    const resolved = [];
    for (const raw of s.prerequisites ?? []) {
      if (typeof raw !== 'string' || !raw) {
        errors.push(`${sw}: prerequisite must be a non-empty string`);
        continue;
      }
      let unit = null;
      if (raw.includes('/')) {
        const parts = raw.split('/');
        const [topicId, subId] = parts;
        if (parts.length !== 2 || !topicId || !subId) errors.push(`${sw}: malformed ref "${raw}" — use "topic/subtopic"`);
        else if (!byId.has(topicId)) errors.push(`${sw}: unknown topic in ref "${raw}"`);
        else if (!subIdsOf(byId.get(topicId)).has(subId)) errors.push(`${sw}: topic "${topicId}" has no subtopic "${subId}"`);
        else unit = `${topicId}/${subId}`;
      } else if (siblings.has(raw)) {
        if (ids.has(raw)) warn.push(`${sw}: ref "${raw}" matches both a sibling subtopic and a topic id — sibling wins; use "${t.id}/${raw}" or rename to disambiguate`);
        unit = `${t.id}/${raw}`;
      } else if (ids.has(raw)) {
        if (isAnnotated(byId.get(raw))) errors.push(`${sw}: "${raw}" has subtopics — pick a specific one, e.g. "${raw}/<subtopic-id>"`);
        else unit = raw;
      } else {
        errors.push(`${sw}: unknown prerequisite "${raw}"`);
      }
      if (unit === `${t.id}/${s.id}`) errors.push(`${sw}: lists itself as a prerequisite`);
      else if (unit && !resolved.includes(unit)) resolved.push(unit);
    }
    resolvedBySub.set(`${t.id}/${s.id}`, resolved);
  }
}

// Kahn's algorithm over an adjacency map: node -> prerequisite nodes.
// Returns ids stuck in a cycle ([] when acyclic).
function findCycle(prereqsByNode) {
  const indegree = new Map();
  const dependents = new Map();
  for (const [node, prereqs] of prereqsByNode) {
    indegree.set(node, prereqs.length);
    if (!dependents.has(node)) dependents.set(node, []);
    for (const p of prereqs) {
      if (!dependents.has(p)) dependents.set(p, []);
      dependents.get(p).push(node);
    }
  }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited++;
    for (const dep of dependents.get(id) ?? []) {
      indegree.set(dep, indegree.get(dep) - 1);
      if (indegree.get(dep) === 0) queue.push(dep);
    }
  }
  if (visited === indegree.size) return [];
  return [...indegree].filter(([, d]) => d > 0).map(([id]) => id);
}

if (errors.length === 0) {
  const topicGraph = new Map(data.topics.map((t) => [t.id, t.prerequisites]));
  const stuckTopics = findCycle(topicGraph);
  if (stuckTopics.length) errors.push(`cycle detected among: ${stuckTopics.join(', ')} — a prerequisite chain loops back on itself`);

  // Unit graph: annotated topics contribute one node per subtopic,
  // unannotated topics one node depending on all subtopics of annotated prereqs.
  const unitGraph = new Map();
  for (const t of data.topics) {
    if (isAnnotated(t)) {
      for (const s of t.subtopics) unitGraph.set(`${t.id}/${s.id}`, resolvedBySub.get(`${t.id}/${s.id}`) ?? []);
    } else {
      const prereqUnits = [];
      for (const p of t.prerequisites) {
        const pt = byId.get(p);
        if (isAnnotated(pt)) for (const ps of pt.subtopics) prereqUnits.push(`${p}/${ps.id}`);
        else prereqUnits.push(p);
      }
      unitGraph.set(t.id, prereqUnits);
    }
  }
  const stuckUnits = findCycle(unitGraph);
  if (stuckUnits.length) errors.push(`subtopic cycle detected among: ${stuckUnits.join(', ')}`);

  // Contracted graph: topic-level edges plus cross-topic subtopic edges
  // collapsed to their parent topics — guarantees a valid group order.
  const contracted = new Map(data.topics.map((t) => [t.id, new Set(t.prerequisites)]));
  for (const [unit, prereqs] of resolvedBySub) {
    const topicId = unit.split('/')[0];
    for (const p of prereqs) {
      const pTopic = p.split('/')[0];
      if (pTopic !== topicId) contracted.get(topicId).add(pTopic);
    }
  }
  const stuckContracted = findCycle(new Map([...contracted].map(([id, set]) => [id, [...set]])));
  if (stuckContracted.length) errors.push(`topic-level cycle via subtopic refs among: ${stuckContracted.join(', ')} — cross-topic subtopic prerequisites make these topics mutually dependent`);

  // Consistency warnings for annotated topics
  const topicAncestors = (id) => {
    const seen = new Set();
    const stack = [...(byId.get(id)?.prerequisites ?? [])];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(byId.get(cur)?.prerequisites ?? []));
    }
    return seen;
  };
  for (const t of data.topics) {
    if (!isAnnotated(t)) continue;
    const ancestors = topicAncestors(t.id);
    const refTopics = new Set();
    for (const s of t.subtopics) {
      for (const p of resolvedBySub.get(`${t.id}/${s.id}`) ?? []) {
        const pTopic = p.split('/')[0];
        if (pTopic !== t.id) refTopics.add(pTopic);
      }
    }
    for (const rt of refTopics) {
      if (!ancestors.has(rt)) warn.push(`topic "${t.id}": subtopics reference "${rt}" but it is not among the topic's (transitive) prerequisites — consider adding a topic-level edge`);
    }
    for (const p of t.prerequisites) {
      if (!refTopics.has(p)) warn.push(`topic "${t.id}": topic-level prerequisite "${p}" is not referenced by any subtopic (coverage gap)`);
    }
  }
}

for (const w of warn) console.log(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s) in topics.json`);
  process.exit(1);
}
console.log(`✓ topics.json valid — ${data.topics.length} topics, ${subtopicCount} subtopics, ${skills.length} skills, DAG is acyclic`);
