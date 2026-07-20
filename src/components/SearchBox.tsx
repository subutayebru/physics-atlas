import { useMemo, useRef, useState } from 'react';
import type { Topic, TopicLevel } from '../data/types';
import { LEVEL_COLORS } from '../graph/levelColors';

interface SearchBoxProps {
  topics: Topic[];
  /** Receives a topic id or a 'topic/subtopic' unit ref */
  onPick: (ref: string) => void;
  hero?: boolean;
  placeholder?: string;
}

interface SearchEntry {
  ref: string;
  title: string;
  /** Parent topic title, set for subtopic entries */
  context?: string;
  level: TopicLevel;
}

const MAX_RESULTS = 8;

export default function SearchBox({ topics, onPick, hero, placeholder }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Topics first so whole-topic hits always rank above subtopic hits
  const entries = useMemo<SearchEntry[]>(
    () => [
      ...topics.map((t) => ({ ref: t.id, title: t.title, level: t.level })),
      ...topics.flatMap(
        (t) =>
          t.subtopics?.map((s) => ({
            ref: `${t.id}/${s.id}`,
            title: s.title,
            context: t.title,
            level: t.level,
          })) ?? [],
      ),
    ],
    [topics],
  );

  const q = query.trim().toLowerCase();
  const results = q
    ? entries.filter((e) => e.title.toLowerCase().includes(q) || e.ref.includes(q)).slice(0, MAX_RESULTS)
    : [];

  const pick = (ref: string) => {
    setQuery('');
    setActive(0);
    inputRef.current?.blur();
    onPick(ref);
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
      pick(results[Math.min(active, results.length - 1)].ref);
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
          {results.map((r, i) => (
            <li key={r.ref} role="option" aria-selected={i === active}>
              <button
                className={`search-result ${i === active ? 'search-result-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                // onMouseDown so the pick happens before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r.ref);
                }}
              >
                <span className="level-dot" style={{ background: LEVEL_COLORS[r.level], color: LEVEL_COLORS[r.level] }} aria-hidden />
                {r.title}
                {r.context && <span className="search-result-context"> — {r.context}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
