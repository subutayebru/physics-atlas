import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Topic } from '../data/types';
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
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      width: 1.5,
      'line-color': 'rgba(160, 180, 224, 0.28)',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'rgba(160, 180, 224, 0.35)',
      'arrow-scale': 0.8,
    },
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
  // Hover states — defined last so they win over dimmed/onpath while active.
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
  onSelect,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // (Re)build the graph when the topic set changes
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
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: styleFor(large),
      wheelSensitivity: 0.3,
      autoungrabify: true,
    });
    cy.layout(layoutFor(large)).run();
    cy.fit(undefined, large ? 40 : 24);
    cy.on('tap', 'node', (e) => onSelectRef.current(e.target.id()));
    cy.on('tap', (e) => {
      if (e.target === cy) onSelectRef.current(null);
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
  }, [topics, large]);

  // Apply selection/path highlighting without re-layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass('chosen dimmed onpath done');
      cy.nodes().forEach((n) => {
        const topic = topics.find((t) => t.id === n.id());
        if (!topic) return;
        const isDone = doneIds?.has(n.id()) ?? false;
        n.data('label', isDone ? `✓ ${topic.title}` : topic.title);
        if (isDone) n.addClass('done');
      });
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
    });
  }, [selectedId, highlightIds, doneIds, topics]);

  // Center the viewport on the focused node (search jumps)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !focus?.id) return;
    const node = cy.$id(focus.id);
    if (node.length) cy.animate({ center: { eles: node } }, { duration: 300 });
  }, [focus]);

  return <div ref={containerRef} className="graph-canvas" />;
}
