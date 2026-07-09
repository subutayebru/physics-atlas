import { useMemo } from 'react';
import type { Topic } from '../data/types';
import { buildTopicMap, dependentsMap, descendantsOf } from '../graph/dag';
import { LEVEL_COLORS, LEVEL_LABELS } from '../graph/levelColors';
import GraphView from './GraphView';
import Legend from './Legend';
import type { Progress } from '../lib/useProgress';

interface MapViewProps {
  topics: Topic[];
  progress: Progress;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMakeGoal: (id: string) => void;
  focus?: { id: string | null; tick: number };
}

export default function MapView({
  topics,
  progress,
  selectedId,
  onSelect,
  onMakeGoal,
  focus,
}: MapViewProps) {
  const map = useMemo(() => buildTopicMap(topics), [topics]);
  const dependents = useMemo(() => dependentsMap(topics), [topics]);
  const selected = selectedId ? map.get(selectedId) : undefined;

  // Direct forward neighbours (topics that list this as a prerequisite) and
  // the full transitive count of everything it is ultimately used in.
  const directUses = selected ? (dependents.get(selected.id) ?? []) : [];
  const totalUses = useMemo(
    () => (selected ? descendantsOf(selected.id, topics).size : 0),
    [selected, topics],
  );

  return (
    <div className="view map-view">
      <div className="graph-pane">
        <GraphView
          topics={topics}
          selectedId={selectedId}
          highlightIds={null}
          doneIds={progress.done}
          focus={focus}
          onSelect={onSelect}
          large
          directionalSelect
        />
        <Legend />
        {!selected && (
          <p className="map-hint">
            Click a concept to keep its whole tree lit — <span className="ink-pre">silver</span> is
            what it builds on, <span className="ink-post">gold</span> is everything it unlocks.
          </p>
        )}
        {selected && (
          <aside className="map-card" key={selected.id}>
            <h2 className="map-card-title">
              <span
                className="level-dot"
                style={{ background: LEVEL_COLORS[selected.level], color: LEVEL_COLORS[selected.level] }}
                aria-hidden
              />
              {selected.title}
            </h2>
            <p className="map-card-level">{LEVEL_LABELS[selected.level]}</p>
            <p className="topic-description">{selected.description}</p>

            {selected.prerequisites.length > 0 && (
              <div className="rel-block">
                <h3 className="block-heading">
                  <span className="rel-swatch rel-swatch-pre" aria-hidden /> Builds on
                </h3>
                <div className="prereq-chips">
                  {selected.prerequisites.map((p) => (
                    <button key={p} className="prereq-chip" onClick={() => onSelect(p)}>
                      {map.get(p)?.title ?? p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {directUses.length > 0 && (
              <div className="rel-block">
                <h3 className="block-heading">
                  <span className="rel-swatch rel-swatch-post" aria-hidden /> Used in
                  {totalUses > directUses.length && (
                    <span className="rel-count">{totalUses} downstream</span>
                  )}
                </h3>
                <div className="prereq-chips">
                  {directUses.map((d) => (
                    <button key={d} className="prereq-chip prereq-chip-post" onClick={() => onSelect(d)}>
                      {map.get(d)?.title ?? d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="map-card-actions">
              <label className="learned-toggle">
                <input
                  type="checkbox"
                  checked={progress.isDone(selected.id)}
                  onChange={() => progress.toggle(selected.id)}
                />
                Learned this
              </label>
              <button className="map-card-goal" onClick={() => onMakeGoal(selected.id)}>
                Full curriculum →
              </button>
            </div>
            <button className="map-card-close" onClick={() => onSelect(null)} aria-label="Close">
              ×
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
