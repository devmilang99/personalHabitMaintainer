import { useState, useEffect } from 'react';
import Clock from './components/Clock';
import StatsGrid from './components/StatsGrid';
import LiveCard from './components/LiveCard';
import TopicPlanner from './components/TopicPlanner';
import TopPanels from './components/TopPanels';
import TimelineSection from './components/TimelineSection';

import { ScheduleBlock, DayRecord, DayTopics, TopicItem } from './types';
import { todayKey, dateKey, getDefaultBlocks, computeStreak, toMin } from './utils';

// Multi-backend storage keys
const RECORDS_KEY = 'devlog-focus-records-v7';
const TOPICS_KEY = 'devlog-focus-topics-v7';
const BLOCKS_KEY = 'devlog-focus-blocks-v7';

// Multi-backend storage helpers
const isWindowStorageAvailable = () => {
  return typeof window !== 'undefined' && (window as any).storage && typeof (window as any).storage.get === 'function';
};

const getStoredData = async (key: string): Promise<string | null> => {
  try {
    if (isWindowStorageAvailable()) {
      const res = await (window as any).storage.get(key, false);
      if (res && res.value) return res.value;
    }
  } catch (err) {
    console.warn('Failed reading from custom storage, falling back to local storage', err);
  }
  return localStorage.getItem(key);
};

const setStoredData = async (key: string, value: string): Promise<void> => {
  try {
    if (isWindowStorageAvailable()) {
      await (window as any).storage.set(key, value, false);
    }
  } catch (err) {
    console.warn('Failed writing to custom storage, falling back to local storage', err);
  }
  localStorage.setItem(key, value);
};

export default function App() {
  const [loading, setLoading] = useState(true);
  
  // Theme state switcher
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('devlog-theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // App state
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [topics, setTopics] = useState<Record<string, DayTopics>>({});
  const [activeBlock, setActiveBlock] = useState<ScheduleBlock | null>(null);

  // Sync theme
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('devlog-theme', theme);
  }, [theme]);

  // Fetch initial state
  useEffect(() => {
    const loadAllState = async () => {
      try {
        // Load custom schedule structure
        const storedBlocks = await getStoredData(BLOCKS_KEY);
        if (storedBlocks) {
          setBlocks(JSON.parse(storedBlocks));
        } else {
          const defaults = getDefaultBlocks();
          setBlocks(defaults);
          await setStoredData(BLOCKS_KEY, JSON.stringify(defaults));
        }

        // Load daily record checklist checks & notes
        const storedRecords = await getStoredData(RECORDS_KEY);
        if (storedRecords) {
          setRecords(JSON.parse(storedRecords));
        } else {
          setRecords({});
        }

        // Load study topics checklist list
        const storedTopics = await getStoredData(TOPICS_KEY);
        if (storedTopics) {
          setTopics(JSON.parse(storedTopics));
        } else {
          setTopics({});
        }
      } catch (e) {
        console.error('Error restoring localStorage state, fallback baseline initialized', e);
        setBlocks(getDefaultBlocks());
      } finally {
        setLoading(false);
      }
    };

    loadAllState();
  }, []);

  // Synchronize dynamic active block based on real time
  useEffect(() => {
    const updateActive = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      let currentBlock: ScheduleBlock | null = null;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const s = toMin(b.start);
        const e = b.start === b.end ? s + 15 : toMin(b.end);

        if (nowMin >= s && nowMin < e) {
          currentBlock = b;
          break;
        }
      }
      setActiveBlock(currentBlock);
    };

    updateActive();
    const interval = setInterval(updateActive, 1000 * 15);
    return () => clearInterval(interval);
  }, [blocks]);

  // Today helpers
  const tKey = todayKey();
  
  const getTodayRecord = (): DayRecord => {
    if (records[tKey]) return records[tKey];
    return { checked: {}, note: '', percentage: 0 };
  };

  const getTodayTopics = (): DayTopics => {
    if (topics[tKey]) return topics[tKey];
    return { flutter: [], android: [] };
  };

  const todayRecord = getTodayRecord();
  const todayTopics = getTodayTopics();

  // Helper: recalculates block percentage completion
  const recalculatePct = (checked: Record<string, boolean>, currentBlocks: ScheduleBlock[]): number => {
    if (currentBlocks.length === 0) return 0;
    const checkedCount = Object.values(checked).filter(Boolean).length;
    return Math.round((checkedCount / currentBlocks.length) * 100);
  };

  /* ─────────────────────────────────────────────────
     CRUD: DAILY NOTES
  ───────────────────────────────────────────────── */
  const handleUpdateNote = async (newNote: string) => {
    const updated = { ...records };
    const curr = { ...todayRecord, note: newNote };
    curr.percentage = recalculatePct(curr.checked, blocks);
    updated[tKey] = curr;
    
    setRecords(updated);
    await setStoredData(RECORDS_KEY, JSON.stringify(updated));
  };

  const handleDeletePastNote = async (dateK: string) => {
    const updated = { ...records };
    if (updated[dateK]) {
      // Keep completed checks but clear note
      updated[dateK].note = '';
    }
    setRecords(updated);
    await setStoredData(RECORDS_KEY, JSON.stringify(updated));
  };

  /* ─────────────────────────────────────────────────
     CRUD: TIMELINE BLOCKS
  ───────────────────────────────────────────────── */
  const handleToggleBlock = async (id: string) => {
    const updated = { ...records };
    const curr = { ...todayRecord };
    
    curr.checked = { ...curr.checked, [id]: !curr.checked[id] };
    curr.percentage = recalculatePct(curr.checked, blocks);
    updated[tKey] = curr;

    setRecords(updated);
    await setStoredData(RECORDS_KEY, JSON.stringify(updated));
  };

  const handleAddBlock = async (newBlock: ScheduleBlock) => {
    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    await setStoredData(BLOCKS_KEY, JSON.stringify(updatedBlocks));

    // Force recalculate pct for today in case blocks total changed
    const updatedRecords = { ...records };
    const curr = { ...todayRecord };
    curr.percentage = recalculatePct(curr.checked, updatedBlocks);
    updatedRecords[tKey] = curr;
    setRecords(updatedRecords);
    await setStoredData(RECORDS_KEY, JSON.stringify(updatedRecords));
  };

  const handleUpdateBlock = async (updatedBlock: ScheduleBlock) => {
    const updatedBlocks = blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b);
    setBlocks(updatedBlocks);
    await setStoredData(BLOCKS_KEY, JSON.stringify(updatedBlocks));

    // Force recalculate pct for today
    const updatedRecords = { ...records };
    const curr = { ...todayRecord };
    curr.percentage = recalculatePct(curr.checked, updatedBlocks);
    updatedRecords[tKey] = curr;
    setRecords(updatedRecords);
    await setStoredData(RECORDS_KEY, JSON.stringify(updatedRecords));
  };

  const handleDeleteBlock = async (id: string) => {
    const updatedBlocks = blocks.filter(b => b.id !== id);
    setBlocks(updatedBlocks);
    await setStoredData(BLOCKS_KEY, JSON.stringify(updatedBlocks));

    // Cleanup checks and recalculate pct
    const updatedRecords = { ...records };
    const curr = { ...todayRecord };
    const checkedCopy = { ...curr.checked };
    delete checkedCopy[id];
    curr.checked = checkedCopy;
    curr.percentage = recalculatePct(checkedCopy, updatedBlocks);
    updatedRecords[tKey] = curr;
    setRecords(updatedRecords);
    await setStoredData(RECORDS_KEY, JSON.stringify(updatedRecords));
  };

  const handleResetToDefaultBlocks = async () => {
    const defaults = getDefaultBlocks();
    setBlocks(defaults);
    await setStoredData(BLOCKS_KEY, JSON.stringify(defaults));

    // Recalculate percent
    const updatedRecords = { ...records };
    const curr = { ...todayRecord };
    curr.percentage = recalculatePct(curr.checked, defaults);
    updatedRecords[tKey] = curr;
    setRecords(updatedRecords);
    await setStoredData(RECORDS_KEY, JSON.stringify(updatedRecords));
  };

  const handleResetToday = async () => {
    const updatedRecords = { ...records };
    updatedRecords[tKey] = { checked: {}, note: '', percentage: 0 };
    setRecords(updatedRecords);
    await setStoredData(RECORDS_KEY, JSON.stringify(updatedRecords));

    // Also clear today's topics in reset
    const updatedTopics = { ...topics };
    updatedTopics[tKey] = { flutter: [], android: [] };
    setTopics(updatedTopics);
    await setStoredData(TOPICS_KEY, JSON.stringify(updatedTopics));
  };

  /* ─────────────────────────────────────────────────
     CRUD: STUDY TOPICS
  ───────────────────────────────────────────────── */
  const handleAddTopic = async (type: 'flutter' | 'android', text: string) => {
    const updated = { ...topics };
    const curr = { ...todayTopics };
    
    // Create new TopicItem
    const newItem: TopicItem = {
      id: `topic_${Date.now()}`,
      text,
      added: new Date().toISOString(),
      done: false
    };

    curr[type] = [...curr[type], newItem];
    updated[tKey] = curr;

    setTopics(updated);
    await setStoredData(TOPICS_KEY, JSON.stringify(updated));
  };

  const handleToggleTopic = async (type: 'flutter' | 'android', index: number) => {
    const updated = { ...topics };
    const curr = { ...todayTopics };
    const list = [...curr[type]];
    
    if (list[index]) {
      list[index] = { ...list[index], done: !list[index].done };
    }
    
    curr[type] = list;
    updated[tKey] = curr;

    setTopics(updated);
    await setStoredData(TOPICS_KEY, JSON.stringify(updated));
  };

  const handleEditTopic = async (type: 'flutter' | 'android', index: number, newText: string) => {
    const updated = { ...topics };
    const curr = { ...todayTopics };
    const list = [...curr[type]];

    if (list[index]) {
      list[index] = { ...list[index], text: newText };
    }

    curr[type] = list;
    updated[tKey] = curr;

    setTopics(updated);
    await setStoredData(TOPICS_KEY, JSON.stringify(updated));
  };

  const handleDeleteTopic = async (type: 'flutter' | 'android', index: number) => {
    const updated = { ...topics };
    const curr = { ...todayTopics };
    const list = [...curr[type]];
    
    list.splice(index, 1);
    curr[type] = list;
    updated[tKey] = curr;

    setTopics(updated);
    await setStoredData(TOPICS_KEY, JSON.stringify(updated));
  };

  /* ─────────────────────────────────────────────────
     STREAKS COMPUTATION & TIME ALLOCATIONS
  ───────────────────────────────────────────────── */
  const streak = computeStreak(records);
  const meta = records['_meta'] as any || { bestStreak: 0 };
  const bestStreak = Math.max(meta.bestStreak || 0, streak);

  // Sync meta back database if modified
  useEffect(() => {
    if (bestStreak > (meta.bestStreak || 0)) {
      const updated = { ...records };
      updated['_meta'] = { bestStreak } as any;
      setRecords(updated);
      setStoredData(RECORDS_KEY, JSON.stringify(updated));
    }
  }, [bestStreak, meta.bestStreak, records]);

  // Count active logged topics for today's stat
  const topicsCount = todayTopics.flutter.length + todayTopics.android.length;

  // Calculate allocation minutes dynamically for each category
  const getMinutesForCategory = (cat: string) => {
    return blocks
      .filter(b => b.cat === cat)
      .reduce((total, b) => {
        const s = toMin(b.start);
        const e = b.start === b.end ? s + 15 : toMin(b.end);
        return total + (e - s);
      }, 0);
  };

  const studyMins = getMinutesForCategory('study');
  const jobMins = getMinutesForCategory('jobsearch');
  const commMins = getMinutesForCategory('communication');
  const reviewMins = getMinutesForCategory('review');
  const fndMins = getMinutesForCategory('foundation') + getMinutesForCategory('meal');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="w-12 h-12 border-2 border-[var(--sap)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--tx2)] font-sans font-medium tracking-wide">Initializing Focus Plan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-[90px] transition-colors duration-200">
      <div className="stripe"></div>
      
      <div className="wrap">
        {/* HEADER */}
        <div className="hdr">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow">Dev Log Workspace</span>
              {/* Light/Dark Toggle Badge */}
              <button
                type="button"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="px-2.5 py-0.5 rounded-full border border-[var(--b0)] bg-[var(--s0)] text-[10px] font-bold tracking-wider cursor-pointer select-none uppercase shadow-sm flex items-center gap-1 text-[var(--tx)] hover:bg-[var(--s1)] transition-colors"
                title="Toggle visual style theme"
              >
                {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>
            <h1>Daily <em>focus</em> plan</h1>
            <p className="tagline">
              <b>Study first.</b> Job search in the afternoon. <b>Revise & reflect</b> in the evening.
            </p>
          </div>
          <Clock />
        </div>

        {/* STATS TILES AND PROGRESS WITH ALLOCATED TIME ANALYSIS */}
        <StatsGrid 
          percentage={todayRecord.percentage} 
          streak={streak} 
          topicsCount={topicsCount} 
          bestStreak={bestStreak}
          studyMins={studyMins}
          jobMins={jobMins}
          commMins={commMins}
          reviewMins={reviewMins}
          fndMins={fndMins}
        />

        {/* TIMER AND ACTIVE CARD SECTIONS */}
        <LiveCard blocks={blocks} todayTopics={todayTopics} />

        {/* STUDY TOPICS PLANNER MODULE */}
        <TopicPlanner 
          todayTopics={todayTopics} 
          allTopics={topics} 
          onAddTopic={handleAddTopic}
          onToggleTopic={handleToggleTopic}
          onEditTopic={handleEditTopic}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* TIMER & NOTES PANELS */}
        <TopPanels 
          todayRecord={todayRecord}
          allRecords={records}
          onUpdateNote={handleUpdateNote}
          onDeletePastNote={handleDeletePastNote}
          onResetToday={handleResetToday}
          activeBlock={activeBlock}
        />

        {/* LEGEND KEYS */}
        <div className="legend">
          <div className="legend-item"><span className="lpip study"></span><b>Study</b> — morning</div>
          <div className="legend-item"><span className="lpip job"></span><b>Job Search</b> — afternoon</div>
          <div className="legend-item"><span className="lpip comm"></span><b>Interview Comm</b> — afternoon</div>
          <div className="legend-item"><span className="lpip rev"></span><b>Review</b> — evening</div>
          <div className="legend-item"><span className="lpip meal"></span><b>Meals</b></div>
          <div className="legend-item"><span className="lpip fnd"></span><b>Foundation</b></div>
        </div>

        {/* TIMELINE LIST grouped in Morning / Afternoon / Evening Bento Cards */}
        <TimelineSection 
          blocks={blocks}
          todayRecord={todayRecord}
          todayTopics={todayTopics}
          onToggleBlock={handleToggleBlock}
          onAddBlock={handleAddBlock}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleDeleteBlock}
          onResetToDefaultBlocks={handleResetToDefaultBlocks}
        />
      </div>
    </div>
  );
}
