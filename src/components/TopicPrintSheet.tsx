import type { Topic } from '../data/types';
import { subtopicsInOrder, topicDone, type TopicMap } from '../graph/dag';
import { LEVEL_LABELS } from '../graph/levelColors';
import { PrintResources } from './PrintSheet';

interface TopicPrintSheetProps {
  topic: Topic;
  map: TopicMap;
  usedIn: string[];
  done: Set<string>;
}

export default function TopicPrintSheet({ topic, map, usedIn, done }: TopicPrintSheetProps) {
  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subs = subtopicsInOrder(topic);
  const name = (id: string) => map.get(id)?.title ?? id;
  const optionalPrereqs = topic.optionalPrerequisites ?? [];

  return (
    <div className="print-sheet">
      <h1 className="print-title">Physics Atlas — {topic.title}</h1>
      <p className="print-meta">
        {date} · {LEVEL_LABELS[topic.level]}
        {topicDone(topic, done) && <> · learned ☑</>}
      </p>
      <p className="print-desc">{topic.description}</p>
      {(topic.objectives?.length ?? 0) > 0 && (
        <>
          <p className="print-objectives-label">After this topic you can:</p>
          <ul className="print-objectives">
            {topic.objectives!.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </>
      )}
      {(topic.prerequisites.length > 0 || optionalPrereqs.length > 0) && (
        <p className="print-desc">
          <strong>Builds on:</strong> {topic.prerequisites.map(name).join(', ')}
          {optionalPrereqs.length > 0 && (
            <span className="print-optional"> · optional: {optionalPrereqs.map(name).join(', ')}</span>
          )}
        </p>
      )}
      {usedIn.length > 0 && (
        <p className="print-desc">
          <strong>Used in:</strong> {usedIn.map(name).join(', ')}
        </p>
      )}

      <h2 className="print-group-head">Resources</h2>
      <PrintResources items={topic.content} />

      {subs.length > 0 && (
        <>
          <h2 className="print-group-head">Subtopics</h2>
          {subs.map((s) => {
            const learned = done.has(`${topic.id}/${s.id}`) || done.has(topic.id);
            const own = s.content ?? [];
            return (
              <div key={s.id} className="print-step">
                <p className="print-step-head">
                  <span className="print-check">{learned ? '☑' : '☐'}</span>{' '}
                  <span className="print-step-title">{s.title}</span>
                </p>
                {s.description && <p className="print-desc">{s.description}</p>}
                {(s.objectives?.length ?? 0) > 0 && (
                  <>
                    <p className="print-objectives-label">After this step you can:</p>
                    <ul className="print-objectives">
                      {s.objectives!.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </>
                )}
                {own.length === 0 ? (
                  <p className="print-fallback-note">Resources: see the topic resources above.</p>
                ) : (
                  <PrintResources items={own} />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
