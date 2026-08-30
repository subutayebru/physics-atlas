import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER } from '../graph/categoryColors';

export default function Legend() {
  return (
    <div className="legend">
      {CATEGORY_ORDER.map((category) => (
        <span key={category} className="legend-entry">
          <span
            className="cat-dot"
            style={{ background: CATEGORY_COLORS[category], color: CATEGORY_COLORS[category] }}
            aria-hidden
          />
          {CATEGORY_LABELS[category]}
        </span>
      ))}
      <span className="legend-entry">
        <span className="legend-dash" aria-hidden />
        optional prerequisite
      </span>
    </div>
  );
}
