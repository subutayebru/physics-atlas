import { Fragment, useMemo, useState } from 'react';
import { NODE_TYPE_LABELS } from '../data/types';
import type { ConceptGraph, GraphEdge } from '../data/types';
import { buildConceptIndex, neighbourIds, sentenceParts } from '../graph/concepts';
import type { ConceptIndex } from '../graph/concepts';
import { TYPE_COLORS, TYPE_ORDER } from '../graph/typeColors';
import GraphView from './GraphView';
import Legend from './Legend';

interface ConceptMapViewProps {
  graph: ConceptGraph;
  theme?: 'dark' | 'light';
}

export default function ConceptMapView({ graph, theme }: ConceptMapViewProps) {
  const index = useMemo(() => buildConceptIndex(graph), [graph]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string | null; tick: number }>({ id: null, tick: 0 });
  const highlightIds = useMemo(
    () => (selectedId ? neighbourIds(selectedId, index) : null),
    [selectedId, index],
  );

  const selectAndFocus = (id: string) => {
    setSelectedId(id);
    setFocus((f) => ({ id, tick: f.tick + 1 }));
  };

  const byType = useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        nodes: graph.nodes.filter((n) => n.type === type),
      })).filter((g) => g.nodes.length > 0),
    [graph],
  );

  const selected = selectedId ? index.byId.get(selectedId) : undefined;
  const outgoing = selected ? (index.outgoing.get(selected.id) ?? []) : [];
  const incoming = selected ? (index.incoming.get(selected.id) ?? []) : [];
  const reviews = selected
    ? [selected.review, ...outgoing.map((e) => e.review), ...incoming.map((e) => e.review)].filter(
        (r): r is string => Boolean(r),
      )
    : [];

  return (
    <div className="view map-view concept-map-view">
      <div className="graph-pane">
        <GraphView
          concepts={graph}
          selectedId={selectedId}
          highlightIds={highlightIds}
          directionalSelect={false}
          focus={focus}
          onSelect={setSelectedId}
          large
          theme={theme}
        />
        <Legend variant="type" />

        <details className="concept-index">
          <summary className="concept-index-summary">Browse by type</summary>
          {byType.map(({ type, nodes }) => (
            <div key={type} className="concept-index-group">
              <h3 className="block-heading">
                <span
                  className="type-dot"
                  style={{ background: TYPE_COLORS[type], color: TYPE_COLORS[type] }}
                  aria-hidden
                />
                {NODE_TYPE_LABELS[type]}
                <span className="rel-count">{nodes.length}</span>
              </h3>
              <ul className="concept-index-list">
                {nodes.map((n) => (
                  <li key={n.id}>
                    <button
                      className={`concept-index-item ${n.id === selectedId ? 'concept-index-item-active' : ''}`}
                      onClick={() => selectAndFocus(n.id)}
                    >
                      {n.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>

        {!selected && (
          <p className="map-hint">
            Colour = kind of concept, size = how general it is. Hover a line to read it as a
            sentence. Zoom in for specific concepts and learning goals.
          </p>
        )}

        {selected && (
          <aside className="map-card" key={selected.id}>
            <h2 className="map-card-title">
              <span
                className="type-dot"
                style={{ background: TYPE_COLORS[selected.type], color: TYPE_COLORS[selected.type] }}
                aria-hidden
              />
              {selected.label}
            </h2>
            <p className="map-card-category">
              {NODE_TYPE_LABELS[selected.type]}
              {'domain' in selected.attrs && selected.attrs.domain && ` · ${selected.attrs.domain}`}
            </p>
            {'description' in selected.attrs && (
              <p className="topic-description">{selected.attrs.description}</p>
            )}

            {selected.type === 'equation' && (
              <div className="rel-block concept-equation">
                <p className="concept-equation-formula">{selected.attrs.equation}</p>
                {selected.attrs.variables.length > 0 && (
                  <>
                    <h3 className="block-heading">Variables</h3>
                    <dl className="concept-variables">
                      {selected.attrs.variables.map((v) => (
                        <div key={v.symbol} className="concept-variable">
                          <dt>{v.symbol}</dt>
                          <dd>{v.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
                {selected.attrs.conditions.length > 0 && (
                  <>
                    <h3 className="block-heading">Conditions</h3>
                    <ul className="concept-list">
                      {selected.attrs.conditions.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selected.attrs.representations.length > 0 && (
                  <>
                    <h3 className="block-heading">Representations</h3>
                    <ul className="concept-list">
                      {selected.attrs.representations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {selected.type === 'resource' && (
              <div className="rel-block">
                <a
                  className="concept-resource-link"
                  href={selected.attrs.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open resource ↗
                </a>
                <p className="concept-resource-meta">
                  {selected.attrs.mediaType} · {selected.attrs.estimatedMinutes} min
                </p>
              </div>
            )}

            <div className="rel-block">
              <h3 className="block-heading">Relations</h3>
              {outgoing.length === 0 && incoming.length === 0 && (
                <p className="concept-empty">No relations yet.</p>
              )}
              {outgoing.length > 0 && (
                <RelationGroup
                  heading="From this concept"
                  edges={outgoing}
                  selfId={selected.id}
                  index={index}
                  onPick={selectAndFocus}
                />
              )}
              {incoming.length > 0 && (
                <RelationGroup
                  heading="Into this concept"
                  edges={incoming}
                  selfId={selected.id}
                  index={index}
                  onPick={selectAndFocus}
                />
              )}
            </div>

            {reviews.length > 0 && (
              <div className="concept-review">
                <p className="concept-review-title">Open question for the author</p>
                {[...new Set(reviews)].map((r) => (
                  <p key={r}>{r}</p>
                ))}
              </div>
            )}

            <button className="map-card-close" onClick={() => setSelectedId(null)} aria-label="Close">
              ×
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

function RelationGroup({
  heading,
  edges,
  selfId,
  index,
  onPick,
}: {
  heading: string;
  edges: GraphEdge[];
  selfId: string;
  index: ConceptIndex;
  onPick: (id: string) => void;
}) {
  return (
    <>
      <p className="concept-relations-heading">{heading}</p>
      <ul className="concept-relations">
        {edges.map((e) => (
          <li key={e.id}>
            {sentenceParts(e, index.byId).map((part, i) =>
              typeof part === 'string' ? (
                <Fragment key={i}>{part}</Fragment>
              ) : part.id === selfId ? (
                <strong key={i}>{part.label}</strong>
              ) : (
                <button key={i} className="concept-relation-link" onClick={() => onPick(part.id)}>
                  {part.label}
                </button>
              ),
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
