#!/usr/bin/env node
// Validates src/data/topics.json: schema shape, unique ids, resolvable
// prerequisites, and acyclicity. Run via `npm run validate`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), '../src/data/topics.json');

const LEVELS = ['foundation', 'core', 'advanced', 'goal'];
const CONTENT_TYPES = ['book', 'video', 'course', 'notes', 'article'];

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

const ids = new Set();
for (const t of data.topics) {
  const where = `topic "${t.id ?? t.title ?? '<unnamed>'}"`;
  if (!t.id || typeof t.id !== 'string') errors.push(`${where}: missing string "id"`);
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id)) errors.push(`${where}: id must be kebab-case`);
  else if (ids.has(t.id)) errors.push(`${where}: duplicate id`);
  else ids.add(t.id);

  if (!t.title) errors.push(`${where}: missing "title"`);
  if (!LEVELS.includes(t.level)) errors.push(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (!t.description) warn.push(`${where}: empty description`);
  if (!Array.isArray(t.prerequisites)) errors.push(`${where}: "prerequisites" must be an array (use [] for none)`);
  if (!Array.isArray(t.content)) errors.push(`${where}: "content" must be an array (use [] for none)`);
  else {
    for (const c of t.content) {
      if (!CONTENT_TYPES.includes(c.type)) errors.push(`${where}: content type "${c.type}" not in ${CONTENT_TYPES.join(', ')}`);
      if (!c.title) errors.push(`${where}: content item missing "title"`);
      if (c.url && !/^https?:\/\//.test(c.url)) errors.push(`${where}: content url "${c.url}" is not http(s)`);
    }
    if (t.content.length === 0) warn.push(`${where}: no content attached yet`);
  }
}

// Prerequisite references must resolve
for (const t of data.topics) {
  for (const p of t.prerequisites ?? []) {
    if (!ids.has(p)) errors.push(`topic "${t.id}": unknown prerequisite "${p}"`);
    if (p === t.id) errors.push(`topic "${t.id}": lists itself as a prerequisite`);
  }
}

// Cycle detection via Kahn's algorithm
if (errors.length === 0) {
  const indegree = new Map(data.topics.map((t) => [t.id, t.prerequisites.length]));
  const dependents = new Map(data.topics.map((t) => [t.id, []]));
  for (const t of data.topics) for (const p of t.prerequisites) dependents.get(p).push(t.id);
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited++;
    for (const dep of dependents.get(id)) {
      indegree.set(dep, indegree.get(dep) - 1);
      if (indegree.get(dep) === 0) queue.push(dep);
    }
  }
  if (visited !== data.topics.length) {
    const stuck = [...indegree].filter(([, d]) => d > 0).map(([id]) => id);
    errors.push(`cycle detected among: ${stuck.join(', ')} — a prerequisite chain loops back on itself`);
  }
}

for (const w of warn) console.log(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s) in topics.json`);
  process.exit(1);
}
console.log(`✓ topics.json valid — ${data.topics.length} topics, DAG is acyclic`);
