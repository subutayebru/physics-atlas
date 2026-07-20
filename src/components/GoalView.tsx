import { useMemo, useState } from 'react';
import type { Skill, Topic } from '../data/types';
import {
  expandedCurriculumFor,
  parseUnitId,
  buildTopicMap,
  ancestorsOf,
  unitDone,
  type CurriculumUnit,
} from '../graph/dag';
import { LEVEL_COLORS } from '../graph/levelColors';
import GraphView from './GraphView';
import ContentList from './ContentList';
import Legend from './Legend';
import SkillsPanel from './SkillsPanel';
import PrintSheet from './PrintSheet';
import type { Progress } from '../lib/useProgress';

interface GoalViewProps {
  topics: Topic[];
  skills: Skill[];
  progress: Progress;
  goalRef: string;
  onPickGoal: (ref: string) => void;
  onOpenTopic: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focus?: { id: string | null; tick: number };
}

export default function GoalView({
  topics,
  skills,
  progress,
  goalRef,
  onPickGoal,
  onOpenTopic,
  selectedId,
  onSelect,
  focus,
}: GoalViewProps) {
  const featured = topics.filter((t) => t.featured);
  const annotated = topics.filter((t) => t.subtopics && t.subtopics.length > 0);
  const [showOptional, setShowOptional] = useState(true);

  const groups = useMemo(() => expandedCurriculumFor(goalRef, topics), [goalRef, topics]);
  const graphTopics = useMemo(() => groups.map((g) => g.topic), [groups]);
  const optionalCount = groups.reduce((n, g) => n + g.units.filter((e) => e.optional).length, 0);

  const visibleGroups = useMemo(
    () =>
      showOptional
        ? groups
        : groups
            .map((g) => ({ ...g, units: g.units.filter((e) => !e.optional) }))
            .filter((g) => g.units.length > 0),
    [groups, showOptional],
  );
  const visibleEntries = visibleGroups.flatMap((g) => g.units);

  const { topicId: goalTopicId, subId: goalSubId } = parseUnitId(goalRef);
  const goalTopic = topics.find((t) => t.id === goalTopicId);
  const goalTitle = goalSubId
    ? (goalTopic?.subtopics?.find((s) => s.id === goalSubId)?.title ?? goalTopic?.title)
    : goalTopic?.title;

  const selectedTopicId = selectedId ? parseUnitId(selectedId).topicId : null;
  const highlight = useMemo(() => {
    if (!selectedTopicId) return null;
    const set = ancestorsOf(selectedTopicId, buildTopicMap(topics));
    set.add(selectedTopicId);
    return set;
  }, [selectedTopicId, topics]);

  const doneCount = visibleEntries.filter((e) => unitDone(e.unit, progress.done)).length;
  const donePct = visibleEntries.length
    ? Math.round((doneCount / visibleEntries.length) * 100)
    : 0;

  const toggleUnit = (e: CurriculumUnit) => {
    const u = e.unit;
    if (u.subtopic && progress.done.has(u.topic.id)) {
      // The whole topic was ticked: unticking one part converts the topic key
      // into explicit keys for the remaining siblings.
      const others = (u.topic.subtopics ?? [])
        .map((s) => `${u.topic.id}/${s.id}`)
        .filter((k) => k !== u.id);
      progress.setMany([u.topic.id, u.id], false);
      progress.setMany(others, true);
    } else {
      progress.toggle(u.id);
    }
  };

  let step = 0;
  const renderUnit = (e: CurriculumUnit, groupOptional: boolean) => {
    const u = e.unit;
    step += 1;
    const index = step;
    const isSub = u.subtopic !== undefined;
    const title = isSub ? u.subtopic!.title : u.topic.title;
    const description = isSub ? u.subtopic!.description : u.topic.description;
    const objectives = isSub ? u.subtopic!.objectives : u.topic.objectives;
    const ownContent = isSub ? (u.subtopic!.content ?? []) : u.topic.content;
    const done = unitDone(u, progress.done);
    const open = u.id === selectedId;
    return (
      <li
        key={u.id}
        className={`curriculum-item ${open ? 'curriculum-item-open' : ''} ${
          done ? 'curriculum-item-done' : ''
        }`}
      >
        <div className="curriculum-row">
          <input
            type="checkbox"
            className="curriculum-check"
            checked={done}
            onChange={() => toggleUnit(e)}
            aria-label={
              isSub
                ? `Mark ${title} (${u.topic.title}) as learned`
                : `Mark ${title} as learned`
            }
          />
          <button className="curriculum-head" onClick={() => onSelect(open ? null : u.id)}>
            <span className="curriculum-index">{index}</span>
            {!isSub && (
              <span
                className="level-dot"
                style={{ background: LEVEL_COLORS[u.topic.level], color: LEVEL_COLORS[u.topic.level] }}
                aria-hidden
              />
            )}
            <span className="curriculum-name">{title}</span>
            {e.optional && !groupOptional && <span className="optional-badge">optional</span>}
          </button>
        </div>
        {open && (
          <div className="curriculum-detail">
            {description && <p className="topic-description">{description}</p>}
            {objectives && objectives.length > 0 && (
              <div className="objectives">
                <p className="objectives-label">After this step you can:</p>
                <ul className="objectives-list">
                  {objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {isSub && ownContent.length === 0 ? (
              <>
                <p className="curriculum-fallback-note">Resources from {u.topic.title}:</p>
                <ContentList items={u.topic.content} />
              </>
            ) : (
              <ContentList items={ownContent} />
            )}
            <button className="open-topic-link" onClick={() => onOpenTopic(u.topic.id)}>
              Open {u.topic.title} page →
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="view goal-view">
      <div className="goal-picker">
        <span className="goal-picker-label">Learning goal:</span>
        {featured.map((t) => (
          <button
            key={t.id}
            className={`goal-chip ${t.id === goalRef ? 'goal-chip-active' : ''}`}
            style={{ '--chip-color': LEVEL_COLORS[t.level] } as React.CSSProperties}
            onClick={() => onPickGoal(t.id)}
          >
            {t.title}
          </button>
        ))}
        <select
          className="goal-select"
          value={featured.some((t) => t.id === goalRef) ? '' : goalRef}
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
          {annotated.map((t) => (
            <optgroup key={t.id} label={`${t.title} — subtopics`}>
              {t.subtopics!.map((s) => (
                <option key={s.id} value={`${t.id}/${s.id}`}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="workspace">
        <div className="graph-pane">
          <GraphView
            topics={graphTopics}
            selectedId={selectedTopicId}
            highlightIds={highlight}
            doneIds={progress.done}
            focus={focus}
            onSelect={onSelect}
          />
          <Legend />
        </div>

        <aside className="sidebar">
          <h2 className="sidebar-title">
            Curriculum — {goalTitle}
            <span className="sidebar-count">
              {doneCount}/{visibleEntries.length} · {donePct}%
            </span>
          </h2>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={donePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress towards ${goalTitle}`}
          >
            <div className="progress-fill" style={{ width: `${donePct}%` }} />
          </div>
          <div className="sidebar-actions">
            <button
              className="pdf-button"
              onClick={() => window.print()}
              title="Opens the print dialog — choose 'Save as PDF'"
            >
              Download PDF
            </button>
          </div>
          <p className="sidebar-hint">
            In order: every step below builds only on the ones above it. Click a step to see it in
            the graph and its resources; tick it off when learned.
          </p>
          {optionalCount > 0 && (
            <label className="optional-toggle">
              <input
                type="checkbox"
                checked={showOptional}
                onChange={(e) => setShowOptional(e.target.checked)}
              />
              show {optionalCount} optional step{optionalCount === 1 ? '' : 's'}
            </label>
          )}
          <ol className="curriculum">
            {visibleGroups.map((g) => {
              // Single-row groups have no group head — the row carries the badge
              if (!g.topic.subtopics?.length) return renderUnit(g.units[0], false);
              const partialVisible = g.units.length < g.topic.subtopics.length;
              return (
                <li key={g.topic.id} className="curriculum-group">
                  <div className="curriculum-group-head">
                    <span
                      className="level-dot"
                      style={{ background: LEVEL_COLORS[g.topic.level], color: LEVEL_COLORS[g.topic.level] }}
                      aria-hidden
                    />
                    <span className="curriculum-group-name">{g.topic.title}</span>
                    {g.optional && <span className="optional-badge">optional</span>}
                    {partialVisible && (
                      <span className="curriculum-only">
                        only: {g.units.map((e) => e.unit.subtopic!.title).join(', ')}
                      </span>
                    )}
                  </div>
                  <ol className="curriculum-units">
                    {g.units.map((e) => renderUnit(e, g.optional))}
                  </ol>
                </li>
              );
            })}
          </ol>
          <SkillsPanel skills={skills} />
        </aside>
      </div>

      <PrintSheet
        goalTitle={goalTitle ?? goalRef}
        groups={visibleGroups}
        hiddenOptionalCount={showOptional ? 0 : optionalCount}
        done={progress.done}
        skills={skills}
      />
    </div>
  );
}
