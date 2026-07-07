import type { Topic } from '../data/types';
import { LEVEL_COLORS } from '../graph/levelColors';
import Galaxy from './Galaxy';
import SearchBox from './SearchBox';

interface HomeProps {
  topics: Topic[];
  onSearchPick: (id: string) => void;
  onExplore: () => void;
  onPickGoal: (id: string) => void;
}

export default function Home({ topics, onSearchPick, onExplore, onPickGoal }: HomeProps) {
  const featured = topics.filter((t) => t.featured);

  return (
    <div className="home">
      <Galaxy />
      <div className="home-content">
        <p className="home-eyebrow">An atlas of physics</p>
        <h1 className="home-title">
          Every concept.
          <br />
          Everything it stands on.
        </h1>
        <p className="home-lede">
          Physics is a map, not a ladder — from high-school algebra to the edge of the universe.
          Find a concept and see the whole path that leads to it.
        </p>
        <div className="home-search">
          <SearchBox topics={topics} onPick={onSearchPick} hero placeholder="Where do you want to go? Try “cosmology”…" />
        </div>
        <div className="home-goals">
          <span className="home-goals-label">or start from a goal</span>
          {featured.map((t) => (
            <button
              key={t.id}
              className="goal-chip"
              style={{ '--chip-color': LEVEL_COLORS[t.level] } as React.CSSProperties}
              onClick={() => onPickGoal(t.id)}
            >
              {t.title}
            </button>
          ))}
        </div>
        <button className="home-explore" onClick={onExplore}>
          Explore the full map
          <span aria-hidden> →</span>
        </button>
      </div>
    </div>
  );
}
