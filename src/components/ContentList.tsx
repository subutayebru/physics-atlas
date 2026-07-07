import { useEffect, useState } from 'react';
import type { ContentItem, ContentType } from '../data/types';

const TYPE_ICONS: Record<ContentType, string> = {
  book: '📖',
  video: '▶',
  course: '🎓',
  notes: '✎',
  article: '¶',
};

export default function ContentList({ items }: { items: ContentItem[] }) {
  const [filter, setFilter] = useState<ContentType | 'all'>('all');

  // New topic → new resource list → reset the filter
  useEffect(() => setFilter('all'), [items]);

  if (items.length === 0) return <p className="content-empty">No resources attached yet.</p>;

  const types = [...new Set(items.map((c) => c.type))];
  const shown = filter === 'all' ? items : items.filter((c) => c.type === filter);

  return (
    <div>
      {types.length > 1 && (
        <div className="content-filter" role="group" aria-label="Filter resources by type">
          <button
            className={`filter-chip ${filter === 'all' ? 'filter-chip-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            all · {items.length}
          </button>
          {types.map((type) => (
            <button
              key={type}
              className={`filter-chip ${filter === type ? 'filter-chip-active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {TYPE_ICONS[type]} {type} · {items.filter((c) => c.type === type).length}
            </button>
          ))}
        </div>
      )}
      <ul className="content-list">
        {shown.map((c, i) => (
          <li key={i} className="content-item">
            <span className={`content-type content-type-${c.type}`} title={c.type}>
              {TYPE_ICONS[c.type]} {c.type}
            </span>
            <div className="content-body">
              <span className="content-title">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.title}
                  </a>
                ) : (
                  c.title
                )}
                {c.author && <span className="content-author"> — {c.author}</span>}
              </span>
              {c.note && <span className="content-note">{c.note}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
