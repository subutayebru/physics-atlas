import { useEffect, useMemo, useState } from 'react';
import type { Topic } from '../data/types';
import {
  ancestorsOf,
  buildTopicMap,
  dependentsMap,
  descendantsOf,
  subtopicsInOrder,
  topicDone,
  unitDone,
  buildUnitGraph,
} from '../graph/dag';
import { LEVEL_COLORS, LEVEL_LABELS } from '../graph/levelColors';
import ContentList from './ContentList';
import SubgoalChecklist from './SubgoalChecklist';
import GraphView from './GraphView';
import Legend from './Legend';
import TopicPrintSheet from './TopicPrintSheet';
import type { Progress } from '../lib/useProgress';

interface TopicPageProps {
  topics: Topic[];
  progress: Progress;
  topicId: string;
  onOpenTopic: (id: string) => void;
  onMakeGoal: (ref: string) => void;
  onShowOnMap: (id: string) => void;
  theme?: 'dark' | 'light';
}

export default function TopicPage({
  topics,
  progress,
  topicId,
  onOpenTopic,
  onMakeGoal,
  onShowOnMap,
  theme,
}: TopicPageProps) {
  const map = useMemo(() => buildTopicMap(topics), [topics]);
  const dependents = useMemo(() => dependentsMap(topics), [topics]);
  const unitMap = useMemo(() => buildUnitGraph(topics), [topics]);
  const topic = map.get(topicId);
  // Which learning goal the side panel is showing (a subtopic id of this topic)
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  // The relations map draws this topic opened up, so its learning goals are
  // clickable nodes. Memoized — GraphView rebuilds when this identity changes.
  const expandedIds = useMemo(
    () => (topic?.subtopics?.length ? new Set([topic.id]) : new Set<string>()),
    [topic],
  );

  useEffect(() => setOpenSubId(null), [topicId]);
  useEffect(() => {
    if (!openSubId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenSubId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSubId]);

  // The topic's whole relation tree: everything it builds on plus everything
  // it unlocks, as an induced subgraph for the mini relations map.
  const relatedTopics = useMemo(() => {
    if (!map.has(topicId)) return [];
    const keep = ancestorsOf(topicId, map);
    keep.add(topicId);
    for (const d of descendantsOf(topicId, topics)) keep.add(d);
    return topics.filter((t) => keep.has(t.id));
  }, [topicId, topics, map]);

  if (!topic) return <div className="view topic-page">Topic not found.</div>;

  const subtopics = subtopicsInOrder(topic);
  const openSub = openSubId ? subtopics.find((s) => s.id === openSubId) : undefined;
  const usedIn = dependents.get(topic.id) ?? [];
  const color = LEVEL_COLORS[topic.level];

  return (
    <div className={`view topic-page ${openSub ? 'topic-page-with-panel' : ''}`}>
      <article className="topic-page-inner">
        <header className="topic-page-header">
          <h2 className="topic-page-title">
            <span className="level-dot" style={{ background: color, color }} aria-hidden />
            {topic.title}
          </h2>
          <p className="topic-page-level">{LEVEL_LABELS[topic.level]}</p>
          <p className="topic-description">{topic.description}</p>
          {(topic.outcomes?.length ?? 0) > 0 && (
            <SubgoalChecklist
              subgoals={topic.outcomes!}
              unitId={topic.id}
              progress={progress}
              label="Subgoals — what you can do"
            />
          )}
          <div className="topic-page-actions">
            <button className="pdf-button" onClick={() => onMakeGoal(topic.id)}>
              Set as learning goal →
            </button>
            <button className="pdf-button" onClick={() => onShowOnMap(topic.id)}>
              Show on map
            </button>
            <button
              className="pdf-button"
              onClick={() => window.print()}
              title="Opens the print dialog — choose 'Save as PDF'"
            >
              Download PDF
            </button>
          </div>
        </header>

        {relatedTopics.length > 1 && (
          <section className="topic-page-rel">
            <h3 className="block-heading">Relations map</h3>
            <p className="topic-page-hint">
              <span className="ink-pre">Silver</span> is what this builds on,{' '}
              <span className="ink-post">gold</span> is everything it unlocks. Click another topic to
              open its page, or one of this topic's learning goals to see it here.
            </p>
            <div className="topic-page-graph">
              <GraphView
                topics={relatedTopics}
                selectedId={openSubId ? `${topic.id}/${openSubId}` : topic.id}
                highlightIds={null}
                doneIds={progress.done}
                directionalSelect
                expandedIds={expandedIds}
                theme={theme}
                onSelect={(id) => {
                  if (!id || id === topic.id) return;
                  // A learning goal of this topic opens the side panel; any
                  // other node is a different topic — navigate to its page.
                  if (id.startsWith(`${topic.id}/`)) setOpenSubId(id.slice(topic.id.length + 1));
                  else onOpenTopic(id);
                }}
              />
              <Legend />
            </div>
          </section>
        )}

        {(topic.prerequisites.length > 0 || (topic.optionalPrerequisites?.length ?? 0) > 0) && (
          <section className="topic-page-rel">
            <h3 className="block-heading">Builds on</h3>
            <div className="prereq-chips">
              {topic.prerequisites.map((p) => (
                <button key={p} className="prereq-chip" onClick={() => onOpenTopic(p)}>
                  {map.get(p)?.title ?? p}
                </button>
              ))}
              {(topic.optionalPrerequisites ?? []).map((p) => (
                <button
                  key={p}
                  className="prereq-chip prereq-chip-optional"
                  onClick={() => onOpenTopic(p)}
                >
                  {map.get(p)?.title ?? p} <span className="chip-suffix">· optional</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {usedIn.length > 0 && (
          <section className="topic-page-rel">
            <h3 className="block-heading">Used in</h3>
            <div className="prereq-chips">
              {usedIn.map((d) => (
                <button
                  key={d}
                  className="prereq-chip prereq-chip-post"
                  onClick={() => onOpenTopic(d)}
                >
                  {map.get(d)?.title ?? d}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="topic-page-content">
          <h3 className="block-heading">Resources</h3>
          <ContentList items={topic.content} />
        </section>

        {subtopics.length > 0 && (
          <section className="topic-page-subtopics">
            <h3 className="block-heading">Learning goals</h3>
            <p className="topic-page-hint">
              {topicDone(topic, progress.done)
                ? 'You have marked this whole topic as learned.'
                : 'Pick a learning goal to see its subgoals and resources, or focus one to build the minimal path to it.'}
            </p>
            <ul className="learning-goal-list">
              {subtopics.map((s) => {
                const unitId = `${topic.id}/${s.id}`;
                const unit = unitMap.get(unitId)!;
                const total = s.outcomes?.length ?? 0;
                const ticked = (s.outcomes ?? []).filter((o) =>
                  progress.isDone(`${unitId}#${o.id}`),
                ).length;
                return (
                  <li key={s.id} className="learning-goal-item">
                    <button
                      className={`learning-goal-button ${
                        openSubId === s.id ? 'learning-goal-active' : ''
                      }`}
                      aria-expanded={openSubId === s.id}
                      onClick={() => setOpenSubId(openSubId === s.id ? null : s.id)}
                    >
                      <span className="learning-goal-title">{s.title}</span>
                      {total > 0 && (
                        <span className="learning-goal-count">
                          {ticked}/{total}
                        </span>
                      )}
                      {unitDone(unit, progress.done) && (
                        <span className="subtopic-done-tag">learned</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>

      {openSub && (
        <aside
          className="subtopic-panel"
          role="dialog"
          aria-label={`${openSub.title} — learning goal`}
        >
          <div className="subtopic-panel-head">
            <h3 className="subtopic-panel-title">{openSub.title}</h3>
            <button
              className="subtopic-panel-close"
              onClick={() => setOpenSubId(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="subtopic-panel-parent">Learning goal of {topic.title}</p>
          <div className="subtopic-panel-body">
            {openSub.description && <p className="topic-description">{openSub.description}</p>}
            {(openSub.outcomes?.length ?? 0) > 0 && (
              <SubgoalChecklist
                subgoals={openSub.outcomes!}
                unitId={`${topic.id}/${openSub.id}`}
                progress={progress}
                label="Subgoals"
              />
            )}
            {(openSub.content?.length ?? 0) === 0 ? (
              <>
                <p className="curriculum-fallback-note">Resources from {topic.title}:</p>
                <ContentList items={topic.content} />
              </>
            ) : (
              <ContentList items={openSub.content!} />
            )}
            <div className="subtopic-actions">
              <label className="learned-toggle">
                <input
                  type="checkbox"
                  checked={unitDone(unitMap.get(`${topic.id}/${openSub.id}`)!, progress.done)}
                  onChange={() => progress.toggle(`${topic.id}/${openSub.id}`)}
                />
                Learned this
              </label>
              <button
                className="pdf-button"
                onClick={() => onMakeGoal(`${topic.id}/${openSub.id}`)}
              >
                Focus this path →
              </button>
            </div>
          </div>
        </aside>
      )}
      <TopicPrintSheet topic={topic} map={map} usedIn={usedIn} done={progress.done} />
    </div>
  );
}
