import { LEVEL_COLORS, LEVEL_LABELS, LEVEL_ORDER } from '../graph/levelColors';

export default function Legend() {
  return (
    <div className="legend">
      {LEVEL_ORDER.map((level) => (
        <span key={level} className="legend-entry">
          <span className="level-dot" style={{ background: LEVEL_COLORS[level], color: LEVEL_COLORS[level] }} aria-hidden />
          {LEVEL_LABELS[level]}
        </span>
      ))}
    </div>
  );
}
