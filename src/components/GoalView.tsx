import { useMemo } from 'react';
import type { Topic } from '../data/types';
import { curriculumFor, buildTopicMap, ancestorsOf } from '../graph/dag';
import { LEVEL_COLORS } from '../graph/levelColors';
import GraphView from './GraphView';
import ContentList from './ContentList';
import Legend from './Legend';
import type { Progress } from '../lib/useProgress';

interface GoalViewProps {
  topics: Topic[];
  progress: Progress;
  goalId: string;
  onPickGoal: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focus?: { id: string | null; tick: number };
}

export default function GoalView({
  topics,
  progress,
  goalId,
  onPickGoal,
  selectedId,
  onSelect,
  focus,
}: GoalViewProps) {
  const featured = topics.filter((t) => t.featured);

  const curriculum = useMemo(() => curriculumFor(goalId, topics), [goalId, topics]);
  const goal = topics.find((t) => t.id === goalId);

  const highlight = useMemo(() => {
    if (!selectedId) return null;
    const set = ancestorsOf(selectedId, buildTopicMap(topics));
    set.add(selectedId);
    return set;
  }, [selectedId, topics]);

  const doneCount = curriculum.filter((t) => progress.isDone(t.id)).length;
  const donePct = Math.round((doneCount / curriculum.length) * 100);

  return (
    <div className="view goal-view">
      <div className="goal-picker">
        <span className="goal-picker-label">Learning goal:</span>
        {featured.map((t) => (
          <button
            key={t.id}
            className={`goal-chip ${t.id === goalId ? 'goal-chip-active' : ''}`}
            style={{ '--chip-color': LEVEL_COLORS[t.level] } as React.CSSProperties}
            onClick={() => onPickGoal(t.id)}
          >
            {t.title}
          </button>
        ))}
        <select
          className="goal-select"
          value={featured.some((t) => t.id === goalId) ? '' : goalId}
          onChange={(e) => e.target.value && onPickGoal(e.target.value)}
        >
          <option value="">any topic…</option>
          {topics
            .filter((t) => !t.featured)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      </div>

      <div className="workspace">
        <div className="graph-pane">
          <GraphView
            topics={curriculum}
            selectedId={selectedId}
            highlightIds={highlight}
            doneIds={progress.done}
            focus={focus}
            onSelect={onSelect}
          />
          <Legend />
        </div>

        <aside className="sidebar">
          <h2 className="sidebar-title">
            Curriculum — {goal?.title}
            <span className="sidebar-count">
              {doneCount}/{curriculum.length} · {donePct}%
            </span>
          </h2>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={donePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress towards ${goal?.title}`}
          >
            <div className="progress-fill" style={{ width: `${donePct}%` }} />
          </div>
          <p className="sidebar-hint">
            In order: every topic below builds only on the ones above it. Click a step to see it in
            the graph and its resources; tick it off when learned.
          </p>
          <ol className="curriculum">
            {curriculum.map((t, i) => (
              <li
                key={t.id}
                className={`curriculum-item ${t.id === selectedId ? 'curriculum-item-open' : ''} ${
                  progress.isDone(t.id) ? 'curriculum-item-done' : ''
                }`}
              >
                <div className="curriculum-row">
                  <input
                    type="checkbox"
                    className="curriculum-check"
                    checked={progress.isDone(t.id)}
                    onChange={() => progress.toggle(t.id)}
                    aria-label={`Mark ${t.title} as learned`}
                  />
                  <button
                    className="curriculum-head"
                    onClick={() => onSelect(t.id === selectedId ? null : t.id)}
                  >
                    <span className="curriculum-index">{i + 1}</span>
                    <span
                      className="level-dot"
                      style={{ background: LEVEL_COLORS[t.level], color: LEVEL_COLORS[t.level] }}
                      aria-hidden
                    />
                    <span className="curriculum-name">{t.title}</span>
                  </button>
                </div>
                {t.id === selectedId && (
                  <div className="curriculum-detail">
                    <p className="topic-description">{t.description}</p>
                    <ContentList items={t.content} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
