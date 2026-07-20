import { useCallback, useEffect, useState } from 'react';
import type { TopicGraph } from './data/types';
import rawData from './data/topics.json';
import Home from './components/Home';
import GoalView from './components/GoalView';
import MapView from './components/MapView';
import SearchBox from './components/SearchBox';
import Starfield from './components/Starfield';
import { expandedCurriculumFor, parseUnitId } from './graph/dag';
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

function isValidRef(ref: string): boolean {
  const { topicId, subId } = parseUnitId(ref);
  const t = data.topics.find((t) => t.id === topicId);
  if (!t) return false;
  return !subId || (t.subtopics ?? []).some((s) => s.id === subId);
}

function initialGoal(): string {
  const g = new URLSearchParams(window.location.search).get('goal');
  if (!g) return 'cosmology';
  if (isValidRef(g)) return g;
  const { topicId } = parseUnitId(g);
  return data.topics.some((t) => t.id === topicId) ? topicId : 'cosmology';
}

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [goalRef, setGoalRef] = useState(initialGoal);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string | null; tick: number }>({ id: null, tick: 0 });
  const progress = useProgress();

  useEffect(() => {
    const url =
      mode === 'home'
        ? window.location.pathname
        : mode === 'goal'
          ? `?mode=goal&goal=${encodeURIComponent(goalRef)}`
          : `?mode=${mode}`;
    window.history.replaceState(null, '', url);
  }, [mode, goalRef]);

  const pickGoal = useCallback((ref: string) => {
    setGoalRef(ref);
    setSelectedId(null);
    setMode('goal');
  }, []);

  // Subtopics have no map node — the graph centers on the parent topic
  const focusOn = useCallback((ref: string) => {
    setSelectedId(ref);
    setFocus((f) => ({ id: parseUnitId(ref).topicId, tick: f.tick + 1 }));
  }, []);

  // Home search lands on the full map, centered on the hit;
  // a subtopic hit becomes a learning goal directly.
  const homeSearchPick = useCallback(
    (ref: string) => {
      if (parseUnitId(ref).subId) {
        pickGoal(ref);
        return;
      }
      setMode('map');
      focusOn(ref);
    },
    [focusOn, pickGoal],
  );

  // Header search: select + center. Subtopic hits become the goal; in goal
  // mode a topic outside the current curriculum becomes the new goal
  // (a humbler ending).
  const headerSearchPick = useCallback(
    (ref: string) => {
      if (parseUnitId(ref).subId) {
        pickGoal(ref);
        return;
      }
      if (
        mode === 'goal' &&
        !expandedCurriculumFor(goalRef, data.topics).some((g) => g.topic.id === ref)
      ) {
        setGoalRef(ref);
      }
      focusOn(ref);
    },
    [mode, goalRef, focusOn, pickGoal],
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
          skills={data.skills ?? []}
          progress={progress}
          goalRef={goalRef}
          onPickGoal={(ref) => {
            setGoalRef(ref);
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
