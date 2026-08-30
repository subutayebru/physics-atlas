import { useEffect, useMemo, useRef, useState } from 'react';
import type { Topic } from '../data/types';
import {
  buildTopicMap,
  dependentsMap,
  descendantsOf,
  goalPathFor,
  parseUnitId,
  subtopicsInOrder,
  topicDone,
} from '../graph/dag';
import { CATEGORY_COLORS, CATEGORY_LABELS, categoryOf } from '../graph/categoryColors';
import GraphView from './GraphView';
import Legend from './Legend';
import SubgoalChecklist from './SubgoalChecklist';
import type { Progress } from '../lib/useProgress';

interface MapViewProps {
  topics: Topic[];
  progress: Progress;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMakeGoal: (id: string) => void;
  onOpenTopic: (id: string) => void;
  focus?: { id: string | null; tick: number };
  theme?: 'dark' | 'light';
}

export default function MapView({
  topics,
  progress,
  selectedId,
  onSelect,
  onMakeGoal,
  onOpenTopic,
  focus,
  theme,
}: MapViewProps) {
  const map = useMemo(() => buildTopicMap(topics), [topics]);
  const dependents = useMemo(() => dependentsMap(topics), [topics]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [goalPick, setGoalPick] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goalPath = useMemo(
    () => (goalPick ? goalPathFor(goalPick, topics) : null),
    [goalPick, topics],
  );

  // Auto-expand the topics the goal path needs, without fighting the manual
  // ⊕/double-click toggle: remember exactly which ids we added, and remove
  // only those again on the next goal change or clear.
  const autoAddedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of autoAddedRef.current) next.delete(id);
      const added = new Set<string>();
      if (goalPath) {
        for (const id of goalPath.expand) {
          if (!next.has(id)) {
            next.add(id);
            added.add(id);
          }
        }
      }
      autoAddedRef.current = added;
      return next;
    });
  }, [goalPath]);

  const parsed = selectedId ? parseUnitId(selectedId) : null;
  const selectedTopic = parsed ? map.get(parsed.topicId) : undefined;
  const selectedSub = parsed?.subId
    ? selectedTopic?.subtopics?.find((s) => s.id === parsed.subId)
    : undefined;

  const goalParsed = goalPick ? parseUnitId(goalPick) : null;
  const goalTopic = goalParsed ? map.get(goalParsed.topicId) : undefined;
  const goalUnit = goalParsed?.subId
    ? goalTopic?.subtopics?.find((s) => s.id === goalParsed.subId)
    : goalTopic;
  const goalTitle = goalUnit?.title ?? goalPick;

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
          highlightIds={goalPath?.highlight ?? null}
          doneIds={progress.done}
          focus={focus}
          onSelect={onSelect}
          large
          directionalSelect={goalPick === null}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          theme={theme}
          goalId={goalPick}
          unitPathIds={goalPath?.units ?? null}
        />
        <Legend />
        {goalPick && goalPath && (
          <div className="goal-bar" role="status" aria-live="polite">
            <span className="goal-bar-title">★ Goal: {goalTitle}</span>
            <span className="goal-bar-count">
              {goalPath.units.size} step{goalPath.units.size === 1 ? '' : 's'} on this path
            </span>
            <button className="goal-bar-open" onClick={() => onMakeGoal(goalPick)}>
              Open curriculum →
            </button>
            <button className="goal-bar-clear" onClick={() => setGoalPick(null)}>
              Clear
            </button>
          </div>
        )}
        {!selectedTopic && !goalPick && (
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
                className="cat-dot"
                style={{ background: CATEGORY_COLORS[categoryOf(selectedTopic)], color: CATEGORY_COLORS[categoryOf(selectedTopic)] }}
                aria-hidden
              />
              {selectedSub.title}
            </h2>
            <p className="map-card-category">Subtopic of {selectedTopic.title}</p>
            {selectedSub.description && <p className="topic-description">{selectedSub.description}</p>}
            {(selectedSub.outcomes?.length ?? 0) > 0 && (
              <SubgoalChecklist
                subgoals={selectedSub.outcomes!}
                unitId={selectedId!}
                progress={progress}
              />
            )}
            <div className="map-card-cta">
              <button className="map-card-open" onClick={() => onOpenTopic(selectedTopic.id)}>
                Open topic page →
              </button>
              <button className="map-card-goal" onClick={() => setGoalPick(selectedId!)}>
                ★ Show this path
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
                className="cat-dot"
                style={{ background: CATEGORY_COLORS[categoryOf(selectedTopic)], color: CATEGORY_COLORS[categoryOf(selectedTopic)] }}
                aria-hidden
              />
              {selectedTopic.title}
            </h2>
            <p className="map-card-category">{CATEGORY_LABELS[categoryOf(selectedTopic)]}</p>
            <p className="topic-description">{selectedTopic.description}</p>
            {(selectedTopic.outcomes?.length ?? 0) > 0 && (
              <SubgoalChecklist
                subgoals={selectedTopic.outcomes!}
                unitId={selectedTopic.id}
                progress={progress}
              />
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
                <h3 className="block-heading">Learning goals — pick one to light up its path</h3>
                <div className="prereq-chips">
                  {subtopicsInOrder(selectedTopic).map((s) => (
                    <button
                      key={s.id}
                      className="prereq-chip subtopic-chip"
                      onClick={() => setGoalPick(`${selectedTopic.id}/${s.id}`)}
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

            <div className="map-card-cta">
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
              <button className="map-card-open" onClick={() => onOpenTopic(selectedTopic.id)}>
                Open topic page →
              </button>
              <button className="map-card-goal" onClick={() => onMakeGoal(selectedTopic.id)}>
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
