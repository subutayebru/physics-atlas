import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopicGraph } from './data/types';
import rawData from './data/topics.json';
import Home from './components/Home';
import GoalView from './components/GoalView';
import MapView from './components/MapView';
import TopicPage from './components/TopicPage';
import SearchBox from './components/SearchBox';
import Starfield from './components/Starfield';
import { expandedCurriculumFor, parseUnitId } from './graph/dag';
import { useProgress } from './lib/useProgress';
import './App.css';

const data = rawData as TopicGraph;

type Mode = 'home' | 'map' | 'goal' | 'topic';

function initialMode(): Mode {
  const m = new URLSearchParams(window.location.search).get('mode');
  if (m === 'map' || m === 'explore') return 'map';
  if (m === 'goal') return 'goal';
  if (m === 'topic') return 'topic';
  return 'home';
}

function initialTopicId(): string {
  const id = new URLSearchParams(window.location.search).get('id');
  return id && data.topics.some((t) => t.id === id) ? id : data.topics[0].id;
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
  const [topicPageId, setTopicPageId] = useState(initialTopicId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string | null; tick: number }>({ id: null, tick: 0 });
  const progress = useProgress();

  // URL sync with real history entries: each navigation pushes, so browser
  // back/forward walks through visited views. popstate restores state from
  // the URL; the effect then recomputes the same URL and skips the push —
  // no guard flag needed, no loop.
  const firstUrlSync = useRef(true);
  useEffect(() => {
    const target =
      mode === 'home'
        ? ''
        : mode === 'goal'
          ? `?mode=goal&goal=${encodeURIComponent(goalRef)}`
          : mode === 'topic'
            ? `?mode=topic&id=${encodeURIComponent(topicPageId)}`
            : `?mode=${mode}`;
    if (window.location.search === target) {
      firstUrlSync.current = false;
      return;
    }
    const url = target || window.location.pathname;
    // Initial normalization (e.g. legacy ?mode=explore) replaces instead of
    // stacking an extra entry under the very first view.
    if (firstUrlSync.current) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    firstUrlSync.current = false;
  }, [mode, goalRef, topicPageId]);

  useEffect(() => {
    const onPop = () => {
      setMode(initialMode());
      setGoalRef(initialGoal());
      setTopicPageId(initialTopicId());
      setSelectedId(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const pickGoal = useCallback((ref: string) => {
    setGoalRef(ref);
    setSelectedId(null);
    setMode('goal');
  }, []);

  const openTopic = useCallback((id: string) => {
    setTopicPageId(parseUnitId(id).topicId);
    setMode('topic');
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
      if (mode === 'topic') {
        openTopic(ref);
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
    [mode, goalRef, focusOn, pickGoal, openTopic],
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
          onOpenTopic={openTopic}
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
          onOpenTopic={openTopic}
          selectedId={selectedId}
          onSelect={setSelectedId}
          focus={focus}
        />
      )}
      {mode === 'topic' && (
        <TopicPage
          topics={data.topics}
          progress={progress}
          topicId={topicPageId}
          onOpenTopic={openTopic}
          onMakeGoal={pickGoal}
          onShowOnMap={(id) => {
            setMode('map');
            focusOn(id);
          }}
        />
      )}
    </div>
  );
}
