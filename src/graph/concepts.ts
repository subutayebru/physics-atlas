import { EDGE_SENTENCE_TEMPLATES } from '../data/types';
import type { ConceptGraph, EdgeType, GraphEdge, GraphNode } from '../data/types';

export type ConceptMap = Map<string, GraphNode>;

/**
 * Trims, collapses inner whitespace and lowercases a raw `relationship`
 * string, then looks it up against EDGE_SENTENCE_TEMPLATES (case-insensitive,
 * so the casing variants flagged by the validator don't break sentence
 * rendering). Mirrored in scripts/validate-concepts.mjs — keep in sync.
 */
export function normalizeRelationship(raw: string): EdgeType | null {
  const key = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  return key in EDGE_SENTENCE_TEMPLATES ? (key as EdgeType) : null;
}

/**
 * Fills {s}/{t} with node labels. Falls back to a plain "{s} — {raw} — {t}"
 * reading only for an unknown relationship type — a case the validator
 * already rejects, so this is a defensive fallback, not a normal path.
 */
export function edgeSentence(edge: GraphEdge, byId: ConceptMap): string {
  const s = byId.get(edge.source)?.label ?? edge.source;
  const t = byId.get(edge.target)?.label ?? edge.target;
  const type = normalizeRelationship(edge.relationship);
  if (!type) return `${s} — ${edge.relationship} — ${t}`;
  return EDGE_SENTENCE_TEMPLATES[type].replace('{s}', s).replace('{t}', t);
}

/**
 * The sentence split into text runs and node references, so a view can render
 * the other node's label as a control. Same fallback as edgeSentence().
 */
export function sentenceParts(
  edge: GraphEdge,
  byId: ConceptMap,
): (string | { id: string; label: string })[] {
  const s = { id: edge.source, label: byId.get(edge.source)?.label ?? edge.source };
  const t = { id: edge.target, label: byId.get(edge.target)?.label ?? edge.target };
  const type = normalizeRelationship(edge.relationship);
  const template = type ? EDGE_SENTENCE_TEMPLATES[type] : `{s} — ${edge.relationship} — {t}`;
  return template
    .split(/(\{s\}|\{t\})/)
    .filter((part) => part !== '')
    .map((part) => (part === '{s}' ? s : part === '{t}' ? t : part));
}

export interface ConceptIndex {
  byId: ConceptMap;
  incoming: Map<string, GraphEdge[]>;
  outgoing: Map<string, GraphEdge[]>;
  degree: Map<string, number>;
}

/** byId + incoming/outgoing adjacency + degree (in + out), for every node. */
export function buildConceptIndex(graph: ConceptGraph): ConceptIndex {
  const byId: ConceptMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, GraphEdge[]>();
  const outgoing = new Map<string, GraphEdge[]>();
  const degree = new Map<string, number>();
  for (const n of graph.nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
    degree.set(n.id, 0);
  }
  for (const e of graph.edges) {
    outgoing.get(e.source)?.push(e);
    incoming.get(e.target)?.push(e);
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  return { byId, incoming, outgoing, degree };
}

/**
 * The single place for the generality fallback: learning goals are always
 * the most specific (1), an authored value wins, otherwise the node's degree
 * stands in until Sophie authors one.
 */
export function effectiveGenerality(node: GraphNode, degree: number): number {
  if (node.type === 'learning_goal') return 1;
  return node.generality ?? degree;
}

/** On-canvas circle radius: authored 1–5 → 8…24; degree fallback matches the seed preview. */
export function nodeRadius(node: GraphNode, degree: number): number {
  if (node.type === 'learning_goal') return 7;
  if (node.generality !== undefined) return 8 + (node.generality - 1) * 4;
  return Math.min(24, 7 + 5.7 * Math.sqrt(degree));
}

/** The node itself plus its direct in- and out-neighbours. */
export function neighbourIds(id: string, index: ConceptIndex): Set<string> {
  const ids = new Set([id]);
  for (const e of index.incoming.get(id) ?? []) ids.add(e.source);
  for (const e of index.outgoing.get(id) ?? []) ids.add(e.target);
  return ids;
}
