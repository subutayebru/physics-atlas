import { useCallback, useEffect, useState } from 'react';
import type { TopicGraph } from './data/types';
import rawData from './data/topics.json';
import Home from './components/Home';
import GoalView from './components/GoalView';
import MapView from './components/MapView';
import SearchBox from './components/SearchBox';
import Starfield from './components/Starfield';
import { curriculumFor } from './graph/dag';
import { useProgress } from './lib/useProgress';
import './App.css';

const data = rawData as TopicGraph;

type Mode = 'home' | 'map' | 'goal';

function initialMode(): Mode {
  const m = new URLSearchParams(window.location.search).get('mode');
  if (m === 'map' || m === 'explore') return 'map';
  if (m === 'goal') return 'goal';
  return 'home';
}

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [goalId, setGoalId] = useState('cosmology');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string | null; tick: number }>({ id: null, tick: 0 });
  const progress = useProgress();

  useEffect(() => {
    const url = mode === 'home' ? window.location.pathname : `?mode=${mode}`;
    window.history.replaceState(null, '', url);
  }, [mode]);

  const pickGoal = useCallback((id: string) => {
    setGoalId(id);
    setSelectedId(null);
    setMode('goal');
  }, []);

  const focusOn = useCallback((id: string) => {
    setSelectedId(id);
    setFocus((f) => ({ id, tick: f.tick + 1 }));
  }, []);

  // Home search lands on the full map, centered on the hit
  const homeSearchPick = useCallback(
    (id: string) => {
      setMode('map');
      focusOn(id);
    },
    [focusOn],
  );

  // Header search: select + center. In goal mode a topic outside the current
  // goal's subgraph becomes the new goal (a humbler ending).
  const headerSearchPick = useCallback(
    (id: string) => {
      if (mode === 'goal' && !curriculumFor(goalId, data.topics).some((t) => t.id === id)) {
        setGoalId(id);
      }
      focusOn(id);
    },
    [mode, goalId, focusOn],
  );

  return (
    <div className="app">
      <Starfield />
      <div className="nebula nebula-a" aria-hidden />
      <div className="nebula nebula-b" aria-hidden />
      <div className="nebula nebula-c" aria-hidden />
      {mode !== 'home' && (
        <header className="app-header">
          <button className="app-wordmark" onClick={() => setMode('home')}>
            <h1 className="app-title">Physics Atlas</h1>
          </button>
          <SearchBox topics={data.topics} onPick={headerSearchPick} />
          <nav className="mode-tabs" aria-label="View mode">
            <button
              className={`mode-tab ${mode === 'map' ? 'mode-tab-active' : ''}`}
              onClick={() => setMode('map')}
            >
              Full map
            </button>
            <button
              className={`mode-tab ${mode === 'goal' ? 'mode-tab-active' : ''}`}
              onClick={() => setMode('goal')}
            >
              Learning goal
            </button>
          </nav>
        </header>
      )}
      {mode === 'home' && (
        <Home
          topics={data.topics}
          onSearchPick={homeSearchPick}
          onExplore={() => setMode('map')}
          onPickGoal={pickGoal}
        />
      )}
      {mode === 'map' && (
        <MapView
          topics={data.topics}
          progress={progress}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMakeGoal={pickGoal}
          focus={focus}
        />
      )}
      {mode === 'goal' && (
        <GoalView
          topics={data.topics}
          progress={progress}
          goalId={goalId}
          onPickGoal={(id) => {
            setGoalId(id);
            setSelectedId(null);
          }}
          selectedId={selectedId}
          onSelect={setSelectedId}
          focus={focus}
        />
      )}
    </div>
  );
}
