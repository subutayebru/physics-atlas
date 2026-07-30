import type { Outcome, Topic } from '../data/types';
import { groupRequirements, outcomesInOrder } from '../graph/dag';

interface OutcomeMapProps {
  /** The goal's own outcomes = its subgoals */
  subgoals?: Outcome[];
  /** Outcome refs the goal depends on ("unit#outcomeId") */
  requires?: string[];
  topics: Topic[];
}

/**
 * Sophie's detail map for a goal: the subgoals, then the prerequisite
 * competencies grouped by their home category and shown in within-category
 * (`needs`) order.
 */
export default function OutcomeMap({ subgoals, requires, topics }: OutcomeMapProps) {
  const orderedSubgoals = subgoals?.length ? outcomesInOrder(subgoals) : [];
  const groups = requires?.length ? groupRequirements(requires, topics).filter((g) => g.outcomes.length) : [];
  if (orderedSubgoals.length === 0 && groups.length === 0) return null;

  return (
    <section className="outcome-map">
      {orderedSubgoals.length > 0 && (
        <div className="outcome-block">
          <h3 className="block-heading">Subgoals — what you'll be able to do</h3>
          <ul className="objectives-list">
            {orderedSubgoals.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
        </div>
      )}
      {groups.length > 0 && (
        <div className="outcome-block">
          <h3 className="block-heading">Competencies to get there</h3>
          <p className="outcome-hint">Grouped by area, in the order to build them.</p>
          {groups.map((g) => (
            <div key={g.unitId} className="outcome-group">
              <p className="outcome-group-title">{g.title}</p>
              <ol className="outcome-list">
                {g.outcomes.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
