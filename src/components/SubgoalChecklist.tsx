import type { Outcome } from '../data/types';
import { outcomesInOrder } from '../graph/dag';
import type { Progress } from '../lib/useProgress';

interface SubgoalChecklistProps {
  subgoals: Outcome[];
  /** The learning goal's unit id — checkbox keys are `${unitId}#${outcomeId}`,
   *  so a subgoal's ticked state is shared wherever the goal appears. */
  unitId: string;
  progress: Progress;
  label?: string;
}

/** A learning goal's subgoals as a persistent checkbox list (its "can do X"
 *  breakdown). Ordered by their `needs` edges. */
export default function SubgoalChecklist({
  subgoals,
  unitId,
  progress,
  label = 'Subgoals — what you can do',
}: SubgoalChecklistProps) {
  if (!subgoals.length) return null;
  const ordered = outcomesInOrder(subgoals);
  const done = ordered.reduce((n, o) => n + (progress.isDone(`${unitId}#${o.id}`) ? 1 : 0), 0);

  return (
    <div className="subgoal-checklist">
      <p className="subgoal-head">
        <span>{label}</span>
        <span className="subgoal-count">
          {done}/{ordered.length}
        </span>
      </p>
      <ul className="subgoal-list">
        {ordered.map((o) => {
          const key = `${unitId}#${o.id}`;
          const isDone = progress.isDone(key);
          return (
            <li key={o.id} className={`subgoal-row ${isDone ? 'subgoal-done' : ''}`}>
              <label>
                <input type="checkbox" checked={isDone} onChange={() => progress.toggle(key)} />
                <span>{o.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
