#!/usr/bin/env node
// Validates src/data/topics.json: schema shape, unique ids, resolvable
// prerequisites (topic- and subtopic-level, mandatory and optional), and
// acyclicity (also over the union of mandatory+optional edges — curriculum
// ordering runs on that union).
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

function checkObjectives(where, objectives) {
  if (objectives === undefined) return;
  if (!Array.isArray(objectives)) errors.push(`${where}: "objectives" must be an array`);
  else
    for (const o of objectives)
      if (typeof o !== 'string' || !o.trim()) errors.push(`${where}: objectives must be non-empty strings`);
}

const ids = new Set();
let subtopicCount = 0;
let optionalEdgeCount = 0;
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
  if (t.optionalPrerequisites !== undefined && !Array.isArray(t.optionalPrerequisites))
    errors.push(`${where}: "optionalPrerequisites" must be an array`);
  checkObjectives(where, t.objectives);
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
        if (s.optionalPrerequisites !== undefined && !Array.isArray(s.optionalPrerequisites))
          errors.push(`${sw}: "optionalPrerequisites" must be an array`);
        checkObjectives(sw, s.objectives);
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

// Topic-level prerequisite references (mandatory and optional) must resolve
for (const t of data.topics) {
  for (const p of t.prerequisites ?? []) {
    if (!ids.has(p)) errors.push(`topic "${t.id}": unknown prerequisite "${p}"`);
    if (p === t.id) errors.push(`topic "${t.id}": lists itself as a prerequisite`);
  }
  for (const p of Array.isArray(t.optionalPrerequisites) ? t.optionalPrerequisites : []) {
    optionalEdgeCount++;
    if (!ids.has(p)) errors.push(`topic "${t.id}": unknown optional prerequisite "${p}"`);
    if (p === t.id) errors.push(`topic "${t.id}": lists itself as an optional prerequisite`);
    if ((t.prerequisites ?? []).includes(p))
      warn.push(`topic "${t.id}": "${p}" is both mandatory and optional — mandatory wins, drop the optional copy`);
  }
}

// --- Subtopic ref resolution (rules mirrored in src/graph/dag.ts) ---
const byId = new Map(data.topics.map((t) => [t.id, t]));
const isAnnotated = (t) => Array.isArray(t?.subtopics) && t.subtopics.length > 0;
const subIdsOf = (t) => new Set(Array.isArray(t?.subtopics) ? t.subtopics.map((s) => s.id) : []);

// "parentTopic/subId" -> resolved unit ids of its (optional) prerequisites
const resolvedBySub = new Map();
const resolvedOptBySub = new Map();

function resolveRef(raw, t, siblings, sw, kind) {
  if (typeof raw !== 'string' || !raw) {
    errors.push(`${sw}: ${kind} must be a non-empty string`);
    return null;
  }
  if (raw.includes('/')) {
    const parts = raw.split('/');
    const [topicId, subId] = parts;
    if (parts.length !== 2 || !topicId || !subId) errors.push(`${sw}: malformed ref "${raw}" — use "topic/subtopic"`);
    else if (!byId.has(topicId)) errors.push(`${sw}: unknown topic in ref "${raw}"`);
    else if (!subIdsOf(byId.get(topicId)).has(subId)) errors.push(`${sw}: topic "${topicId}" has no subtopic "${subId}"`);
    else return `${topicId}/${subId}`;
    return null;
  }
  if (siblings.has(raw)) {
    if (ids.has(raw)) warn.push(`${sw}: ref "${raw}" matches both a sibling subtopic and a topic id — sibling wins; use "${t.id}/${raw}" or rename to disambiguate`);
    return `${t.id}/${raw}`;
  }
  if (ids.has(raw)) {
    if (isAnnotated(byId.get(raw))) {
      errors.push(`${sw}: "${raw}" has subtopics — pick a specific one, e.g. "${raw}/<subtopic-id>"`);
      return null;
    }
    return raw;
  }
  errors.push(`${sw}: unknown ${kind} "${raw}"`);
  return null;
}

for (const t of data.topics) {
  if (!isAnnotated(t)) continue;
  const siblings = subIdsOf(t);
  for (const s of t.subtopics) {
    const sw = `topic "${t.id}" subtopic "${s.id}"`;
    const self = `${t.id}/${s.id}`;
    const resolved = [];
    for (const raw of s.prerequisites ?? []) {
      const unit = resolveRef(raw, t, siblings, sw, 'prerequisite');
      if (unit === self) errors.push(`${sw}: lists itself as a prerequisite`);
      else if (unit && !resolved.includes(unit)) resolved.push(unit);
    }
    resolvedBySub.set(self, resolved);
    const resolvedOpt = [];
    for (const raw of Array.isArray(s.optionalPrerequisites) ? s.optionalPrerequisites : []) {
      optionalEdgeCount++;
      const unit = resolveRef(raw, t, siblings, sw, 'optional prerequisite');
      if (unit === self) errors.push(`${sw}: lists itself as an optional prerequisite`);
      else if (unit && resolved.includes(unit))
        warn.push(`${sw}: "${raw}" is both mandatory and optional — mandatory wins, drop the optional copy`);
      else if (unit && !resolvedOpt.includes(unit)) resolvedOpt.push(unit);
    }
    resolvedOptBySub.set(self, resolvedOpt);
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
  const optTopic = (t) => (Array.isArray(t?.optionalPrerequisites) ? t.optionalPrerequisites : []);

  // Mandatory-only checks first (cleaner messages for pure-mandatory cycles)
  const topicGraph = new Map(data.topics.map((t) => [t.id, t.prerequisites]));
  const stuckTopics = findCycle(topicGraph);
  if (stuckTopics.length) errors.push(`cycle detected among: ${stuckTopics.join(', ')} — a prerequisite chain loops back on itself`);

  // Unit graph: annotated topics contribute one node per subtopic,
  // unannotated topics one node depending on all subtopics of annotated prereqs.
  const unitEdges = (withOptional) => {
    const graph = new Map();
    for (const t of data.topics) {
      if (isAnnotated(t)) {
        for (const s of t.subtopics) {
          const id = `${t.id}/${s.id}`;
          const prereqs = [...(resolvedBySub.get(id) ?? [])];
          if (withOptional) prereqs.push(...(resolvedOptBySub.get(id) ?? []));
          graph.set(id, prereqs);
        }
      } else {
        const prereqUnits = [];
        const expand = (p) => {
          const pt = byId.get(p);
          if (isAnnotated(pt)) for (const ps of pt.subtopics) prereqUnits.push(`${p}/${ps.id}`);
          else prereqUnits.push(p);
        };
        for (const p of t.prerequisites) expand(p);
        if (withOptional) for (const p of optTopic(t)) expand(p);
        graph.set(t.id, prereqUnits);
      }
    }
    return graph;
  };
  const stuckUnits = findCycle(unitEdges(false));
  if (stuckUnits.length) errors.push(`subtopic cycle detected among: ${stuckUnits.join(', ')}`);

  // Contracted graph: topic-level edges plus cross-topic subtopic edges
  // collapsed to their parent topics — guarantees a valid group order.
  const contractedEdges = (withOptional) => {
    const contracted = new Map(
      data.topics.map((t) => [
        t.id,
        new Set(withOptional ? [...t.prerequisites, ...optTopic(t)] : t.prerequisites),
      ]),
    );
    const collapse = (resolvedMap) => {
      for (const [unit, prereqs] of resolvedMap) {
        const topicId = unit.split('/')[0];
        for (const p of prereqs) {
          const pTopic = p.split('/')[0];
          if (pTopic !== topicId) contracted.get(topicId).add(pTopic);
        }
      }
    };
    collapse(resolvedBySub);
    if (withOptional) collapse(resolvedOptBySub);
    return new Map([...contracted].map(([id, set]) => [id, [...set]]));
  };
  const stuckContracted = findCycle(contractedEdges(false));
  if (stuckContracted.length) errors.push(`topic-level cycle via subtopic refs among: ${stuckContracted.join(', ')} — cross-topic subtopic prerequisites make these topics mutually dependent`);

  // Union checks: curriculum ordering runs on mandatory+optional together,
  // so the union graphs must stay acyclic too.
  if (errors.length === 0) {
    const stuckTopicsU = findCycle(new Map(data.topics.map((t) => [t.id, [...new Set([...t.prerequisites, ...optTopic(t)])]])));
    if (stuckTopicsU.length) errors.push(`cycle involving optional edges among: ${stuckTopicsU.join(', ')} — ordering runs on mandatory+optional together, so this union must stay acyclic`);
    const stuckUnitsU = findCycle(unitEdges(true));
    if (stuckUnitsU.length) errors.push(`subtopic cycle involving optional refs among: ${stuckUnitsU.join(', ')}`);
    const stuckContractedU = findCycle(contractedEdges(true));
    if (stuckContractedU.length) errors.push(`topic-level cycle involving optional edges among: ${stuckContractedU.join(', ')}`);
  }

  // Consistency warnings for annotated topics
  const topicAncestors = (id, withOptional) => {
    const seen = new Set();
    const edges = (t) => (withOptional ? [...(t?.prerequisites ?? []), ...optTopic(t)] : (t?.prerequisites ?? []));
    const stack = [...edges(byId.get(id))];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...edges(byId.get(cur)));
    }
    return seen;
  };
  for (const t of data.topics) {
    if (!isAnnotated(t)) continue;
    const unionAncestors = topicAncestors(t.id, true);
    const mandAncestors = topicAncestors(t.id, false);
    const mandRefTopics = new Set();
    const allRefTopics = new Set();
    for (const s of t.subtopics) {
      const self = `${t.id}/${s.id}`;
      for (const p of resolvedBySub.get(self) ?? []) {
        const pTopic = p.split('/')[0];
        if (pTopic !== t.id) {
          mandRefTopics.add(pTopic);
          allRefTopics.add(pTopic);
        }
      }
      for (const p of resolvedOptBySub.get(self) ?? []) {
        const pTopic = p.split('/')[0];
        if (pTopic !== t.id) allRefTopics.add(pTopic);
      }
    }
    for (const rt of allRefTopics) {
      if (!unionAncestors.has(rt)) warn.push(`topic "${t.id}": subtopics reference "${rt}" but it is not among the topic's (transitive) prerequisites — consider adding a topic-level edge`);
    }
    for (const rt of mandRefTopics) {
      if (unionAncestors.has(rt) && !mandAncestors.has(rt))
        warn.push(`topic "${t.id}": mandatory subtopic ref into "${rt}" which is only optionally connected — add a mandatory topic-level edge or make the ref optional`);
    }
    for (const p of t.prerequisites) {
      if (!allRefTopics.has(p)) warn.push(`topic "${t.id}": topic-level prerequisite "${p}" is not referenced by any subtopic (coverage gap)`);
    }
  }
}

for (const w of warn) console.log(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s) in topics.json`);
  process.exit(1);
}
console.log(
  `✓ topics.json valid — ${data.topics.length} topics, ${subtopicCount} subtopics, ${skills.length} skills, ${optionalEdgeCount} optional edges, DAG is acyclic (incl. optional edges)`,
);
