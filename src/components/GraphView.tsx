import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Topic } from '../data/types';
import { buildTopicMap, parseUnitId, resolveSubtopicRef } from '../graph/dag';
import { LEVEL_COLORS } from '../graph/levelColors';

cytoscape.use(dagre);

interface GraphViewProps {
  topics: Topic[];
  selectedId: string | null;
  /** Nodes to emphasize (e.g. selected topic + its ancestors); others dim. */
  highlightIds: Set<string> | null;
  /** Topics marked as learned — shown with a ✓ label badge. */
  doneIds?: Set<string>;
  /** Bump `tick` to animate-center the viewport on `id` (e.g. after a search). */
  focus?: { id: string | null; tick: number };
  /** Roomier layout + bigger labels for the full-screen map. */
  large?: boolean;
  /**
   * Clicking a node sticks the full silver/gold tree (prerequisites +
   * everything it unlocks) until another node is clicked. When false, the
   * `highlightIds` set drives an ancestors-only dim (goal / curriculum view).
   */
  directionalSelect?: boolean;
  /** Annotated topics rendered as compound nodes with their subtopics inside. */
  expandedIds?: Set<string>;
  /** Double-tapping an annotated topic toggles its expansion. */
  onToggleExpand?: (id: string) => void;
  onSelect: (id: string | null) => void;
}

const styleFor = (large: boolean) => [
  {
    selector: 'node',
    style: {
      shape: 'round-rectangle',
      width: 'label',
      height: 'label',
      padding: large ? '14px' : '10px',
      'background-color': 'data(color)',
      'background-opacity': 0.16,
      'border-width': 1.5,
      'border-color': 'data(color)',
      'border-opacity': 0.85,
      label: 'data(label)',
      color: '#eef2fb',
      'font-size': large ? 14 : 12,
      'font-family': 'system-ui, -apple-system, "Segoe UI", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': large ? '170px' : '130px',
      // Tween highlight/dim changes instead of snapping — the "flowing" feel.
      'transition-property': 'opacity, background-opacity, border-width, border-color',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out',
    },
  },
  {
    selector: 'node.chosen',
    style: {
      'border-width': 3,
      'background-opacity': 0.35,
      'font-weight': 'bold',
      'underlay-color': 'data(color)',
      'underlay-opacity': 0.18,
      'underlay-padding': 8,
    },
  },
  { selector: 'node.dimmed', style: { opacity: 0.16 } },
  { selector: 'node.done', style: { 'background-opacity': 0.06, 'border-style': 'dashed' } },
  {
    selector: 'node:parent',
    style: {
      'background-opacity': 0.05,
      'border-opacity': 0.5,
      'border-style': 'dashed',
      'text-valign': 'top',
      'text-margin-y': large ? -6 : -4,
      padding: large ? '18px' : '12px',
      'font-weight': 'bold',
    },
  },
  {
    selector: 'node.subtopic-node',
    style: {
      'font-size': large ? 12 : 10.5,
      'background-opacity': 0.14,
      padding: large ? '9px' : '7px',
      'text-max-width': large ? '130px' : '100px',
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      width: 1.5,
      'line-color': 'rgba(160, 180, 224, 0.28)',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'rgba(160, 180, 224, 0.35)',
      'arrow-scale': 0.8,
      'transition-property': 'opacity, width, line-color, target-arrow-color',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out',
    },
  },
  {
    selector: 'edge.optional-edge',
    style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] },
  },
  {
    selector: 'edge.onpath',
    style: {
      width: 2.5,
      'line-color': 'rgba(143, 183, 255, 0.85)',
      'target-arrow-color': 'rgba(143, 183, 255, 0.9)',
    },
  },
  { selector: 'edge.dimmed', style: { opacity: 0.08 } },
  // Persistent selection tree (a click) — same silver/gold coding as hover,
  // but sticky. Defined before hover so a live hover still wins on top.
  { selector: 'node.sel-soft', style: { opacity: 0.4 } },
  { selector: 'edge.sel-soft', style: { opacity: 0.14 } },
  {
    selector: 'node.sel-pre',
    style: { 'border-width': 2.5, 'border-color': '#cdd6e8', 'background-opacity': 0.3 },
  },
  {
    selector: 'edge.sel-pre',
    style: {
      width: 2.5,
      'line-color': 'rgba(205, 214, 232, 0.85)',
      'target-arrow-color': 'rgba(205, 214, 232, 0.9)',
    },
  },
  {
    selector: 'node.sel-post',
    style: { 'border-width': 2.5, 'border-color': '#e6b566', 'background-opacity': 0.3 },
  },
  {
    selector: 'edge.sel-post',
    style: {
      width: 2.5,
      'line-color': 'rgba(230, 181, 102, 0.85)',
      'target-arrow-color': 'rgba(230, 181, 102, 0.9)',
    },
  },
  // Hover states — defined last so they win over dimmed/onpath/sel while active.
  // Others recede but stay clearly visible. Direction is color-coded:
  // silver = prerequisites (what it stands on), gold = what it unlocks.
  { selector: 'node.hover-soft', style: { opacity: 0.45 } },
  { selector: 'edge.hover-soft', style: { opacity: 0.18 } },
  {
    selector: 'node.hover-pre',
    style: {
      opacity: 1,
      'border-width': 2.5,
      'border-color': '#cdd6e8',
      'background-opacity': 0.3,
    },
  },
  {
    selector: 'edge.hover-pre',
    style: {
      opacity: 1,
      width: 2.5,
      'line-color': 'rgba(205, 214, 232, 0.85)',
      'target-arrow-color': 'rgba(205, 214, 232, 0.9)',
    },
  },
  {
    selector: 'node.hover-post',
    style: {
      opacity: 1,
      'border-width': 2.5,
      'border-color': '#e6b566',
      'background-opacity': 0.3,
    },
  },
  {
    selector: 'edge.hover-post',
    style: {
      opacity: 1,
      width: 2.5,
      'line-color': 'rgba(230, 181, 102, 0.85)',
      'target-arrow-color': 'rgba(230, 181, 102, 0.9)',
    },
  },
  {
    selector: 'node.hovered',
    style: {
      opacity: 1,
      'font-size': large ? 16.5 : 14,
      padding: large ? '17px' : '13px',
      'border-width': 3,
      'background-opacity': 0.4,
      'font-weight': 'bold',
      'z-index': 10,
      'underlay-color': 'data(color)',
      'underlay-opacity': 0.22,
      'underlay-padding': 10,
    },
  },
] as unknown as cytoscape.StylesheetJson;

const layoutFor = (large: boolean) =>
  ({
    name: 'dagre',
    rankDir: 'BT',
    nodeSep: large ? 44 : 24,
    rankSep: large ? 110 : 60,
    padding: large ? 32 : 16,
  }) as cytoscape.LayoutOptions;

export default function GraphView({
  topics,
  selectedId,
  highlightIds,
  doneIds,
  focus,
  large = false,
  directionalSelect = false,
  expandedIds,
  onToggleExpand,
  onSelect,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onToggleExpandRef = useRef(onToggleExpand);
  onToggleExpandRef.current = onToggleExpand;
  const lastTapRef = useRef<{ id: string; t: number }>({ id: '', t: 0 });

  // (Re)build the graph when the topic set (or expansion) changes
  useEffect(() => {
    const present = new Set(topics.map((t) => t.id));
    const elements: cytoscape.ElementDefinition[] = [
      ...topics.map((t) => ({
        data: { id: t.id, label: t.title, color: LEVEL_COLORS[t.level] },
      })),
      ...topics.flatMap((t) =>
        t.prerequisites
          .filter((p) => present.has(p))
          .map((p) => ({ data: { id: `${p}->${t.id}`, source: p, target: t.id } })),
      ),
      ...topics.flatMap((t) =>
        (t.optionalPrerequisites ?? [])
          .filter((p) => present.has(p) && !t.prerequisites.includes(p))
          .map((p) => ({
            data: { id: `${p}~opt->${t.id}`, source: p, target: t.id },
            classes: 'optional-edge',
          })),
      ),
    ];

    // Compound expansion: an opened annotated topic renders its subtopics as
    // child nodes with their internal (same-topic) prerequisite order. Edges
    // to other topics stay at the topic level (drawn to the compound box).
    const tmap = buildTopicMap(topics);
    for (const t of topics) {
      if (!expandedIds?.has(t.id) || !t.subtopics?.length) continue;
      for (const s of t.subtopics)
        elements.push({
          data: { id: `${t.id}/${s.id}`, parent: t.id, label: s.title, color: LEVEL_COLORS[t.level] },
          classes: 'subtopic-node',
        });
      for (const s of t.subtopics) {
        const uid = `${t.id}/${s.id}`;
        const addInternal = (raw: string, optional: boolean) => {
          const r = resolveSubtopicRef(raw, t, tmap);
          if (r && r !== uid && parseUnitId(r).topicId === t.id)
            elements.push({
              data: { id: `${r}=>${uid}${optional ? '~o' : ''}`, source: r, target: uid },
              classes: optional ? 'optional-edge' : undefined,
            });
        };
        for (const raw of s.prerequisites) addInternal(raw, false);
        for (const raw of s.optionalPrerequisites ?? []) addInternal(raw, true);
      }
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: styleFor(large),
      wheelSensitivity: 0.3,
      autoungrabify: true,
    });
    cy.layout(layoutFor(large)).run();
    cy.fit(undefined, large ? 40 : 24);

    // One core-level tap handler (not a delegated 'node' one) so a tap on a
    // subtopic child fires exactly once with the true target — a delegated
    // handler would also fire for the compound parent it bubbles through and
    // re-select the whole topic. Single tap selects; a quick second tap on an
    // annotated topic toggles it open/closed into its subtopics.
    const annotated = new Set(topics.filter((t) => t.subtopics?.length).map((t) => t.id));
    cy.on('tap', (e) => {
      const tgt = e.target;
      if (tgt === cy) {
        onSelectRef.current(null);
        return;
      }
      if (typeof tgt.isNode !== 'function' || !tgt.isNode()) return;
      const id = tgt.id();
      const now = performance.now();
      const prev = lastTapRef.current;
      lastTapRef.current = { id, t: now };
      if (onToggleExpandRef.current && annotated.has(id) && prev.id === id && now - prev.t < 350) {
        onToggleExpandRef.current(id);
        return;
      }
      onSelectRef.current(id);
    });

    // Hover: grow the node a touch and light up its related tree —
    // prerequisites in silver, unlocked topics in gold; soften the rest.
    cy.on('mouseover', 'node', (e) => {
      const n = e.target;
      cy.batch(() => {
        cy.elements().addClass('hover-soft');
        n.predecessors().removeClass('hover-soft').addClass('hover-pre');
        n.successors().removeClass('hover-soft').addClass('hover-post');
        n.removeClass('hover-soft').addClass('hovered');
      });
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', () => {
      cy.batch(() => cy.elements().removeClass('hover-soft hover-pre hover-post hovered'));
      if (containerRef.current) containerRef.current.style.cursor = '';
    });

    if (import.meta.env.DEV) (window as unknown as { __cy?: cytoscape.Core }).__cy = cy;

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [topics, large, expandedIds]);

  // Apply selection/path highlighting without re-layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass('chosen dimmed onpath done sel-soft sel-pre sel-post');
      cy.nodes().forEach((n) => {
        const topic = topics.find((t) => t.id === n.id());
        if (!topic) return;
        const isDone = doneIds?.has(n.id()) ?? false;
        n.data('label', isDone ? `✓ ${topic.title}` : topic.title);
        if (isDone) n.addClass('done');
      });
      if (directionalSelect) {
        // Sticky both-directions tree: silver up (prerequisites), gold down
        // (everything it unlocks); the rest recede but stay legible.
        if (selectedId) {
          const n = cy.$id(selectedId);
          cy.elements().addClass('sel-soft');
          n.predecessors().removeClass('sel-soft').addClass('sel-pre');
          n.successors().removeClass('sel-soft').addClass('sel-post');
          n.removeClass('sel-soft').addClass('chosen');
        }
      } else {
        if (selectedId) cy.$id(selectedId).addClass('chosen');
        if (highlightIds) {
          cy.nodes().forEach((n) => {
            if (!highlightIds.has(n.id())) n.addClass('dimmed');
          });
          cy.edges().forEach((e) => {
            if (highlightIds.has(e.source().id()) && highlightIds.has(e.target().id()))
              e.addClass('onpath');
            else e.addClass('dimmed');
          });
        }
      }
    });
  }, [selectedId, highlightIds, doneIds, topics, directionalSelect]);

  // Glide to the focused concept (search / home jumps) — a smooth pan+zoom
  // that frames the concept with its immediate connections, rather than a
  // sudden cut. Reduced-motion gets an instant fit.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !focus?.id) return;
    const node = cy.$id(focus.id);
    if (!node.length) return;
    const eles = node.closedNeighborhood();
    const padding = large ? 130 : 80;
    cy.stop();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cy.fit(eles, padding);
      return;
    }
    cy.animate({ fit: { eles, padding } }, { duration: 900, easing: 'ease-in-out-cubic' });
  }, [focus, large]);

  return <div ref={containerRef} className="graph-canvas" />;
}
