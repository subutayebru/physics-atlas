import { useRef, useState } from 'react';
import type { Topic } from '../data/types';
import { LEVEL_COLORS } from '../graph/levelColors';

interface SearchBoxProps {
  topics: Topic[];
  onPick: (id: string) => void;
  hero?: boolean;
  placeholder?: string;
}

const MAX_RESULTS = 8;

export default function SearchBox({ topics, onPick, hero, placeholder }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? topics.filter((t) => t.title.toLowerCase().includes(q) || t.id.includes(q)).slice(0, MAX_RESULTS)
    : [];

  const pick = (id: string) => {
    setQuery('');
    setActive(0);
    inputRef.current?.blur();
    onPick(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)].id);
    } else if (e.key === 'Escape') {
      setQuery('');
      setActive(0);
    }
  };

  return (
    <div
      className={`search ${hero ? 'search-hero' : ''}`}
      role="combobox"
      aria-expanded={results.length > 0}
      aria-haspopup="listbox"
    >
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder={placeholder ?? 'Search topics…'}
        value={query}
        aria-label="Search topics"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((t, i) => (
            <li key={t.id} role="option" aria-selected={i === active}>
              <button
                className={`search-result ${i === active ? 'search-result-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                // onMouseDown so the pick happens before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(t.id);
                }}
              >
                <span className="level-dot" style={{ background: LEVEL_COLORS[t.level], color: LEVEL_COLORS[t.level] }} aria-hidden />
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
