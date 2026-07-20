import { useMemo, useState } from 'react';
import type { Topic } from '../data/types';
import {
  buildTopicMap,
  dependentsMap,
  descendantsOf,
  parseUnitId,
  subtopicsInOrder,
  topicDone,
} from '../graph/dag';
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
  onOpenTopic: (id: string) => void;
  focus?: { id: string | null; tick: number };
}

export default function MapView({
  topics,
  progress,
  selectedId,
  onSelect,
  onMakeGoal,
  onOpenTopic,
  focus,
}: MapViewProps) {
  const map = useMemo(() => buildTopicMap(topics), [topics]);
  const dependents = useMemo(() => dependentsMap(topics), [topics]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const parsed = selectedId ? parseUnitId(selectedId) : null;
  const selectedTopic = parsed ? map.get(parsed.topicId) : undefined;
  const selectedSub = parsed?.subId
    ? selectedTopic?.subtopics?.find((s) => s.id === parsed.subId)
    : undefined;

  // Direct forward neighbours (topics that list this as a prerequisite) and
  // the full transitive count of everything it is ultimately used in.
  const directUses = selectedTopic && !selectedSub ? (dependents.get(selectedTopic.id) ?? []) : [];
  const totalUses = useMemo(
    () => (selectedTopic && !selectedSub ? descendantsOf(selectedTopic.id, topics).size : 0),
    [selectedTopic, selectedSub, topics],
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
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
        />
        <Legend />
        {!selectedTopic && (
          <p className="map-hint">
            Click a concept to keep its whole tree lit — <span className="ink-pre">silver</span> is
            what it builds on, <span className="ink-post">gold</span> is everything it unlocks.
            Double-click a topic with subtopics to open it up.
          </p>
        )}

        {selectedTopic && selectedSub && (
          <aside className="map-card" key={selectedId}>
            <h2 className="map-card-title">
              <span
                className="level-dot"
                style={{ background: LEVEL_COLORS[selectedTopic.level], color: LEVEL_COLORS[selectedTopic.level] }}
                aria-hidden
              />
              {selectedSub.title}
            </h2>
            <p className="map-card-level">Subtopic of {selectedTopic.title}</p>
            {selectedSub.description && <p className="topic-description">{selectedSub.description}</p>}
            {(selectedSub.objectives?.length ?? 0) > 0 && (
              <div className="objectives">
                <p className="objectives-label">After this step you can:</p>
                <ul className="objectives-list">
                  {selectedSub.objectives!.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="map-card-actions">
              <button className="map-card-goal" onClick={() => onMakeGoal(selectedId!)}>
                Focus this path →
              </button>
              <button className="pdf-button" onClick={() => onOpenTopic(selectedTopic.id)}>
                Open topic page →
              </button>
            </div>
            <button className="map-card-close" onClick={() => onSelect(null)} aria-label="Close">
              ×
            </button>
          </aside>
        )}

        {selectedTopic && !selectedSub && (
          <aside className="map-card" key={selectedTopic.id}>
            <h2 className="map-card-title">
              <span
                className="level-dot"
                style={{ background: LEVEL_COLORS[selectedTopic.level], color: LEVEL_COLORS[selectedTopic.level] }}
                aria-hidden
              />
              {selectedTopic.title}
            </h2>
            <p className="map-card-level">{LEVEL_LABELS[selectedTopic.level]}</p>
            <p className="topic-description">{selectedTopic.description}</p>
            {(selectedTopic.objectives?.length ?? 0) > 0 && (
              <div className="objectives">
                <p className="objectives-label">After this topic you can:</p>
                <ul className="objectives-list">
                  {selectedTopic.objectives!.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {(selectedTopic.prerequisites.length > 0 ||
              (selectedTopic.optionalPrerequisites?.length ?? 0) > 0) && (
              <div className="rel-block">
                <h3 className="block-heading">
                  <span className="rel-swatch rel-swatch-pre" aria-hidden /> Builds on
                </h3>
                <div className="prereq-chips">
                  {selectedTopic.prerequisites.map((p) => (
                    <button key={p} className="prereq-chip" onClick={() => onSelect(p)}>
                      {map.get(p)?.title ?? p}
                    </button>
                  ))}
                  {(selectedTopic.optionalPrerequisites ?? []).map((p) => (
                    <button
                      key={p}
                      className="prereq-chip prereq-chip-optional"
                      onClick={() => onSelect(p)}
                    >
                      {map.get(p)?.title ?? p} <span className="chip-suffix">· optional</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedTopic.subtopics?.length ?? 0) > 0 && (
              <div className="rel-block">
                <h3 className="block-heading">Subtopics — pick one for its minimal path</h3>
                <div className="prereq-chips">
                  {subtopicsInOrder(selectedTopic).map((s) => (
                    <button
                      key={s.id}
                      className="prereq-chip subtopic-chip"
                      onClick={() => onMakeGoal(`${selectedTopic.id}/${s.id}`)}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
                <button className="expand-map-btn" onClick={() => toggleExpand(selectedTopic.id)}>
                  {expandedIds.has(selectedTopic.id) ? '⊖ Hide on map' : '⊕ Show subtopics on map'}
                </button>
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
                  checked={topicDone(selectedTopic, progress.done)}
                  onChange={() => {
                    const t = selectedTopic;
                    const subKeys = (t.subtopics ?? []).map((s) => `${t.id}/${s.id}`);
                    if (topicDone(t, progress.done)) progress.setMany([t.id, ...subKeys], false);
                    else progress.setMany([t.id], true);
                  }}
                />
                Learned this
              </label>
              <button className="map-card-goal" onClick={() => onMakeGoal(selectedTopic.id)}>
                Full curriculum →
              </button>
            </div>
            <button className="map-card-open" onClick={() => onOpenTopic(selectedTopic.id)}>
              Open topic page →
            </button>
            <button className="map-card-close" onClick={() => onSelect(null)} aria-label="Close">
              ×
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
