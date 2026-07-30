import type { ContentItem, Outcome, Skill } from '../data/types';
import { outcomesInOrder, unitDone, type CurriculumGroup, type CurriculumUnit } from '../graph/dag';

interface PrintSheetProps {
  goalTitle: string;
  /** The same visible groups the sidebar renders — print what you see */
  groups: CurriculumGroup[];
  hiddenOptionalCount: number;
  done: Set<string>;
  skills: Skill[];
}

/** A learning goal's subgoals as printed checkboxes, ticked from the same
 *  `${unitId}#${outcomeId}` progress keys the screen uses. */
export function PrintSubgoals({
  subgoals,
  unitId,
  done,
}: {
  subgoals: Outcome[] | undefined;
  unitId: string;
  done: Set<string>;
}) {
  if (!subgoals?.length) return null;
  return (
    <>
      <p className="print-objectives-label">Subgoals:</p>
      <ul className="print-subgoals">
        {outcomesInOrder(subgoals).map((o) => (
          <li key={o.id}>
            <span className="print-check">{done.has(`${unitId}#${o.id}`) ? '☑' : '☐'}</span>{' '}
            {o.text}
          </li>
        ))}
      </ul>
    </>
  );
}

export function PrintResources({ items }: { items: ContentItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="print-resources">
      {items.map((c) => (
        <li key={c.title} className="print-resource">
          <span className="print-res-type">{c.type}</span> · {c.title}
          {c.author && <span className="print-res-author"> — {c.author}</span>}
          {c.note && <span className="print-res-note"> {c.note}</span>}
          {c.url && <span className="print-url"> {c.url}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function PrintSheet({
  goalTitle,
  groups,
  hiddenOptionalCount,
  done,
  skills,
}: PrintSheetProps) {
  const entries = groups.flatMap((g) => g.units);
  const doneCount = entries.filter((e) => unitDone(e.unit, done)).length;
  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let step = 0;
  const renderStep = (e: CurriculumUnit, groupOptional: boolean) => {
    const u = e.unit;
    step += 1;
    const isSub = u.subtopic !== undefined;
    const title = isSub ? u.subtopic!.title : u.topic.title;
    const description = isSub ? u.subtopic!.description : u.topic.description;
    const outcomes = isSub ? u.subtopic!.outcomes : u.topic.outcomes;
    const ownContent = isSub ? (u.subtopic!.content ?? []) : u.topic.content;
    const fallback = isSub && ownContent.length === 0;
    return (
      <li key={u.id} className="print-step">
        <p className="print-step-head">
          <span className="print-check">{unitDone(u, done) ? '☑' : '☐'}</span>{' '}
          <span className="print-index">{step}.</span>{' '}
          <span className="print-step-title">{title}</span>
          {e.optional && !groupOptional && <span className="print-optional"> (optional)</span>}
        </p>
        {description && <p className="print-desc">{description}</p>}
        <PrintSubgoals subgoals={outcomes} unitId={u.id} done={done} />
        {fallback ? (
          <>
            <p className="print-fallback-note">Resources from {u.topic.title}:</p>
            <PrintResources items={u.topic.content} />
          </>
        ) : (
          <PrintResources items={ownContent} />
        )}
      </li>
    );
  };

  return (
    <div className="print-sheet">
      <h1 className="print-title">Physics Atlas — {goalTitle}</h1>
      <p className="print-meta">
        {date} · {doneCount} of {entries.length} steps done
        {hiddenOptionalCount > 0 && <> · {hiddenOptionalCount} optional steps hidden</>}
      </p>
      <ol className="print-steps">
        {groups.map((g) => {
          if (!g.topic.subtopics?.length) return renderStep(g.units[0], false);
          const partialVisible = g.units.length < g.topic.subtopics.length;
          return (
            <li key={g.topic.id} className="print-group">
              <h2 className="print-group-head">
                {g.topic.title}
                {g.optional && <span className="print-optional"> (optional)</span>}
                {partialVisible && (
                  <span className="print-only">
                    {' '}
                    — only: {g.units.map((e) => e.unit.subtopic!.title).join(', ')}
                  </span>
                )}
              </h2>
              <ol>{g.units.map((e) => renderStep(e, g.optional))}</ol>
            </li>
          );
        })}
      </ol>
      {skills.length > 0 && (
        <section className="print-skills">
          <h2>Skills to practice along the way</h2>
          {skills.map((s) => (
            <div key={s.id} className="print-skill">
              <p className="print-skill-title">{s.title}</p>
              <p className="print-skill-desc">{s.description}</p>
              <PrintResources items={s.content ?? []} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
