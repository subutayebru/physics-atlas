#!/usr/bin/env node
// Compiles Sophie's Markdown detail maps (content/**/*.md) into
// src/data/generated-outcomes.json — a sidecar the app merges onto topics.
// Authoring format (forgiving): a trailing {key: value, ...} tag on a line.
//   # Goal title            {id: <topic-or-subtopic-ref>}
//   ## Subgoals
//   - <text>                {id: <slug>}          (id optional)
//   ## Prerequisites
//   ### Category            {ref: <topic-or-subtopic-id>}
//   - <competency>          {id: <slug>, needs: <id>, <id>}   (needs last)
// Competencies become that unit's `outcomes`; the goal collects them as
// `requires` ("<ref>#<id>"). Run via `npm run build:content`.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content');
const OUT = join(root, 'src/data/generated-outcomes.json');

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
    const needs = body.match(/\bneeds:\s*([a-z0-9,\s/#-]+)/i);
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

// unitId -> Map(outcomeId -> {id, text, needs}) ; first definition canonical
const outcomesByUnit = new Map();
const goals = {};

function addOutcome(unitId, o, sourceFile) {
  if (!outcomesByUnit.has(unitId)) outcomesByUnit.set(unitId, new Map());
  const bucket = outcomesByUnit.get(unitId);
  const existing = bucket.get(o.id);
  if (existing) {
    const drift =
      existing.text !== o.text || JSON.stringify(existing.needs ?? []) !== JSON.stringify(o.needs ?? []);
    if (drift)
      warnings.push(
        `competency "${unitId}#${o.id}" redefined differently in ${sourceFile} — first definition kept`,
      );
    return;
  }
  bucket.set(o.id, o);
}

for (const file of listMarkdown(CONTENT_DIR)) {
  const rel = file.slice(root.length + 1);
  const lines = readFileSync(file, 'utf8').split('\n');
  let goalRef = null;
  let section = null; // 'subgoals' | 'prereqs'
  let currentRef = null;
  const subgoals = [];
  const requires = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (/^#\s/.test(line)) {
      const { tag } = parseTag(line);
      goalRef = tag.id ?? null;
      section = null;
      continue;
    }
    if (/^##\s/.test(line)) {
      const h = line.replace(/^##\s+/, '').toLowerCase();
      section = h.startsWith('subgoal') ? 'subgoals' : h.startsWith('prereq') ? 'prereqs' : null;
      currentRef = null;
      continue;
    }
    if (/^###\s/.test(line)) {
      const { tag } = parseTag(line);
      currentRef = tag.ref ?? null;
      if (!currentRef) warnings.push(`${rel}: category heading without {ref: …} — bullets ignored`);
      continue;
    }
    if (/^\s*-\s/.test(line)) {
      const { text, tag } = parseTag(line);
      if (!text) continue;
      const id = tag.id ?? slug(text);
      if (section === 'subgoals') {
        subgoals.push({ id, text });
      } else if (section === 'prereqs' && currentRef) {
        const o = { id, text };
        if (tag.needs?.length) o.needs = tag.needs;
        addOutcome(currentRef, o, rel);
        requires.push(`${currentRef}#${id}`);
      }
    }
  }

  if (goalRef) {
    goals[goalRef] = { subgoals, requires };
  } else {
    warnings.push(`${rel}: no "# Title {id: …}" — file skipped as a goal`);
  }
}

const outcomes = {};
for (const [unit, bucket] of outcomesByUnit) outcomes[unit] = [...bucket.values()];

writeFileSync(OUT, JSON.stringify({ outcomes, goals }, null, 2) + '\n');

for (const w of warnings) console.log(`⚠ ${w}`);
const unitCount = Object.keys(outcomes).length;
const outcomeCount = Object.values(outcomes).reduce((n, a) => n + a.length, 0);
console.log(
  `✓ compiled ${Object.keys(goals).length} goal(s), ${outcomeCount} outcomes across ${unitCount} unit(s) → ${OUT.slice(root.length + 1)}`,
);
