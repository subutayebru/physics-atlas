import { useMemo } from 'react';
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
import GraphView from './GraphView';
import Legend from './Legend';
import type { Progress } from '../lib/useProgress';

interface TopicPageProps {
  topics: Topic[];
  progress: Progress;
  topicId: string;
  onOpenTopic: (id: string) => void;
  onMakeGoal: (ref: string) => void;
  onShowOnMap: (id: string) => void;
}

export default function TopicPage({
  topics,
  progress,
  topicId,
  onOpenTopic,
  onMakeGoal,
  onShowOnMap,
}: TopicPageProps) {
  const map = useMemo(() => buildTopicMap(topics), [topics]);
  const dependents = useMemo(() => dependentsMap(topics), [topics]);
  const unitMap = useMemo(() => buildUnitGraph(topics), [topics]);
  const topic = map.get(topicId);

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
  const usedIn = dependents.get(topic.id) ?? [];
  const color = LEVEL_COLORS[topic.level];

  return (
    <div className="view topic-page">
      <article className="topic-page-inner">
        <header className="topic-page-header">
          <h2 className="topic-page-title">
            <span className="level-dot" style={{ background: color, color }} aria-hidden />
            {topic.title}
          </h2>
          <p className="topic-page-level">{LEVEL_LABELS[topic.level]}</p>
          <p className="topic-description">{topic.description}</p>
          {(topic.objectives?.length ?? 0) > 0 && (
            <div className="objectives">
              <p className="objectives-label">After this topic you can:</p>
              <ul className="objectives-list">
                {topic.objectives!.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="topic-page-actions">
            <button className="pdf-button" onClick={() => onMakeGoal(topic.id)}>
              Set as learning goal →
            </button>
            <button className="pdf-button" onClick={() => onShowOnMap(topic.id)}>
              Show on map
            </button>
          </div>
        </header>

        {relatedTopics.length > 1 && (
          <section className="topic-page-rel">
            <h3 className="block-heading">Relations map</h3>
            <p className="topic-page-hint">
              <span className="ink-pre">Silver</span> is what this builds on,{' '}
              <span className="ink-post">gold</span> is everything it unlocks. Click a topic to open
              its page.
            </p>
            <div className="topic-page-graph">
              <GraphView
                topics={relatedTopics}
                selectedId={topic.id}
                highlightIds={null}
                doneIds={progress.done}
                directionalSelect
                onSelect={(id) => {
                  if (id && id !== topic.id) onOpenTopic(id);
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
            <h3 className="block-heading">Subtopics</h3>
            <p className="topic-page-hint">
              {topicDone(topic, progress.done)
                ? 'You have marked this whole topic as learned.'
                : 'Open a subtopic to read its material, or focus a single one to build the minimal path to it.'}
            </p>
            {subtopics.map((s) => {
              const unit = unitMap.get(`${topic.id}/${s.id}`)!;
              const ownContent = s.content ?? [];
              return (
                <details key={s.id} className="subtopic-block">
                  <summary className="subtopic-summary">
                    <span className="subtopic-summary-title">{s.title}</span>
                    {unitDone(unit, progress.done) && (
                      <span className="subtopic-done-tag">learned</span>
                    )}
                  </summary>
                  <div className="subtopic-body">
                    {s.description && <p className="topic-description">{s.description}</p>}
                    {(s.objectives?.length ?? 0) > 0 && (
                      <div className="objectives">
                        <p className="objectives-label">After this step you can:</p>
                        <ul className="objectives-list">
                          {s.objectives!.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ownContent.length === 0 ? (
                      <>
                        <p className="curriculum-fallback-note">Resources from {topic.title}:</p>
                        <ContentList items={topic.content} />
                      </>
                    ) : (
                      <ContentList items={ownContent} />
                    )}
                    <div className="subtopic-actions">
                      <label className="learned-toggle">
                        <input
                          type="checkbox"
                          checked={unitDone(unit, progress.done)}
                          onChange={() => progress.toggle(unit.id)}
                        />
                        Learned this
                      </label>
                      <button
                        className="pdf-button"
                        onClick={() => onMakeGoal(`${topic.id}/${s.id}`)}
                      >
                        Focus this path →
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </section>
        )}
      </article>
    </div>
  );
}
