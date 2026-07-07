import { useMemo } from 'react';
import type { Topic } from '../data/types';
import { buildTopicMap, ancestorsOf } from '../graph/dag';
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
  const selected = selectedId ? map.get(selectedId) : undefined;

  const highlight = useMemo(() => {
    if (!selectedId) return null;
    const set = ancestorsOf(selectedId, map);
    set.add(selectedId);
    return set;
  }, [selectedId, map]);

  return (
    <div className="view map-view">
      <div className="graph-pane">
        <GraphView
          topics={topics}
          selectedId={selectedId}
          highlightIds={highlight}
          doneIds={progress.done}
          focus={focus}
          onSelect={onSelect}
          large
        />
        <Legend />
        {!selected && (
          <p className="map-hint">
            Arrows point from prerequisite to what it unlocks. Click any concept to light up
            everything it stands on.
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
              <div className="prereq-block">
                <h3 className="block-heading">Directly builds on</h3>
                <div className="prereq-chips">
                  {selected.prerequisites.map((p) => (
                    <button key={p} className="prereq-chip" onClick={() => onSelect(p)}>
                      {map.get(p)?.title ?? p}
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
                Build curriculum →
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
