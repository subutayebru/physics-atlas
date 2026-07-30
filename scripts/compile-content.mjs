#!/usr/bin/env node
// Compiles Sophie's Markdown detail maps (content/**/*.md) into
// src/data/generated-units.json — a sidecar the loader + validator merge onto
// topics.json as learning-goal SUBTOPICS. Every learning goal is a first-class,
// promotable subtopic; its `needs` become prerequisite edges; a goal's Subgoals
// become its `outcomes` (the checkbox breakdown). Authoring format (forgiving) —
// a trailing {key: value, ...} tag on a line:
//   # Goal title            {id: <topicId>/<subId>}    ← the goal IS a subtopic
//   ## Subgoals
//   - <text>                {id: <slug>}               (the goal's checkbox subgoals)
//   ## Prerequisites
//   ### Area title          {ref: <topicId>}           ← an area = a topic
//   - <learning goal>       {id: <slug>, needs: <id>, <id>}   (needs = within-area order)
// A prerequisite bullet becomes a learning-goal subtopic of <Area>; the goal
// lists each as a prerequisite ("<areaTopicId>/<id>"). A bare `needs` id is a
// sibling in the same area; cross-area needs use "areaTopicId/goalId".
// Run via `npm run build:content`.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content');
const OUT = join(root, 'src/data/generated-units.json');

const warnings = [];

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
}

function parseTag(line) {
  const m = line.match(/\{([^}]*)\}\s*$/);
  const text = (m ? line.slice(0, m.index) : line).replace(/^[-#\s]+/, '').trim();
  const tag = {};
  if (m) {
    const body = m[1];
    const id = body.match(/\bid:\s*([a-z0-9/-]+)/i);
    const ref = body.match(/\bref:\s*([a-z0-9/-]+)/i);
    const needs = body.match(/\bneeds:\s*([a-z0-9,\s/-]+)/i);
    if (id) tag.id = id[1].trim();
    if (ref) tag.ref = ref[1].trim();
    if (needs) tag.needs = needs[1].split(',').map((x) => x.trim()).filter(Boolean);
  }
  return { text, tag };
}

function listMarkdown(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...listMarkdown(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

// topicId -> Map(subId -> Subtopic) ; first definition canonical
const subtopicsByTopic = new Map();

function addSubtopic(topicId, sub, sourceFile) {
  if (!subtopicsByTopic.has(topicId)) subtopicsByTopic.set(topicId, new Map());
  const bucket = subtopicsByTopic.get(topicId);
  const existing = bucket.get(sub.id);
  if (existing) {
    const drift =
      existing.title !== sub.title ||
      JSON.stringify(existing.prerequisites) !== JSON.stringify(sub.prerequisites);
    if (drift)
      warnings.push(
        `learning goal "${topicId}/${sub.id}" redefined differently in ${sourceFile} — first definition kept`,
      );
    return;
  }
  bucket.set(sub.id, sub);
}

for (const file of listMarkdown(CONTENT_DIR)) {
  const rel = file.slice(root.length + 1);
  const lines = readFileSync(file, 'utf8').split('\n');
  let goalTopic = null;
  let goalSub = null;
  let goalText = null;
  let section = null; // 'subgoals' | 'prereqs'
  let areaId = null;
  const subgoals = [];
  const goalPrereqs = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (/^#\s/.test(line)) {
      const { text, tag } = parseTag(line);
      goalText = text;
      if (tag.id && tag.id.includes('/')) {
        [goalTopic, goalSub] = tag.id.split('/');
      } else {
        warnings.push(`${rel}: "# ${text}" needs {id: topicId/subId} — file skipped`);
      }
      section = null;
      continue;
    }
    if (/^##\s/.test(line)) {
      const h = line.replace(/^##\s+/, '').toLowerCase();
      section = h.startsWith('subgoal') ? 'subgoals' : h.startsWith('prereq') ? 'prereqs' : null;
      areaId = null;
      continue;
    }
    if (/^###\s/.test(line)) {
      const { tag } = parseTag(line);
      areaId = tag.ref ?? null;
      if (!areaId) warnings.push(`${rel}: area heading without {ref: topicId} — bullets ignored`);
      continue;
    }
    if (/^\s*-\s/.test(line)) {
      const { text, tag } = parseTag(line);
      if (!text) continue;
      const id = tag.id ?? slug(text);
      if (section === 'subgoals') {
        subgoals.push({ id, text });
      } else if (section === 'prereqs' && areaId) {
        const prerequisites = (tag.needs ?? []).map((n) => (n.includes('/') ? n : `${areaId}/${n}`));
        addSubtopic(areaId, { id, title: text, prerequisites }, rel);
        goalPrereqs.push(`${areaId}/${id}`);
      }
    }
  }

  if (goalTopic && goalSub) {
    const goalSubtopic = { id: goalSub, title: goalText, prerequisites: goalPrereqs };
    if (subgoals.length) goalSubtopic.outcomes = subgoals;
    addSubtopic(goalTopic, goalSubtopic, rel);
  }
}

const subtopics = {};
for (const [topicId, bucket] of subtopicsByTopic) subtopics[topicId] = [...bucket.values()];

writeFileSync(OUT, JSON.stringify({ subtopics }, null, 2) + '\n');

for (const w of warnings) console.log(`⚠ ${w}`);
const topicCount = Object.keys(subtopics).length;
const goalCount = Object.values(subtopics).reduce((n, a) => n + a.length, 0);
console.log(
  `✓ compiled ${goalCount} learning goal(s) across ${topicCount} area(s) → ${OUT.slice(root.length + 1)}`,
);
