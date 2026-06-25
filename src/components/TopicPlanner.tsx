import React, { useState } from 'react';
import { DayTopics, TopicItem } from '../types';
import { dateKey, niceDate, fmtDateTime } from '../utils';

interface TopicPlannerProps {
  todayTopics: DayTopics;
  allTopics: Record<string, DayTopics>;
  onAddTopic: (type: 'flutter' | 'android', text: string) => void;
  onToggleTopic: (type: 'flutter' | 'android', index: number) => void;
  onEditTopic: (type: 'flutter' | 'android', index: number, newText: string) => void;
  onDeleteTopic: (type: 'flutter' | 'android', index: number) => void;
}

type TabType = 'flutter' | 'android' | 'history';

export default function TopicPlanner({
  todayTopics,
  allTopics,
  onAddTopic,
  onToggleTopic,
  onEditTopic,
  onDeleteTopic
}: TopicPlannerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('flutter');
  const [inputText, setInputText] = useState('');

  const handleAdd = (textValue?: string) => {
    if (activeTab === 'history') return;
    const textStr = (textValue || inputText).trim();
    if (!textStr) return;
    onAddTopic(activeTab, textStr);
    if (!textValue) {
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  // Quick Preset Tags for very fast input!
  const PRESETS_FLUTTER = [
    'Riverpod State',
    'Bloc / Cubit',
    'Navigator 2.0',
    'Widget Testing',
    'Method Channels',
    'Custom Painters',
    'Local SQLite',
    'CI/CD Workflows'
  ];

  const PRESETS_ANDROID = [
    'Jetpack Compose',
    'Coroutines & Flow',
    'ViewModel Lifecycle',
    'Room Database',
    'Dagger Hilt DI',
    'Retrofit / API',
    'WorkManager Tasks',
    'DS & Algo Prep'
  ];

  const activePresets = activeTab === 'flutter' ? PRESETS_FLUTTER : PRESETS_ANDROID;

  // Group topics history list
  const historyDateKeys = Object.keys(allTopics)
    .filter(k => {
      const dayData = allTopics[k];
      return (dayData.flutter && dayData.flutter.length > 0) || (dayData.android && dayData.android.length > 0);
    })
    .sort((a, b) => b.localeCompare(a)); // Descending chronological

  const renderHistory = () => {
    if (historyDateKeys.length === 0) {
      return <div className="hist-empty">No logged topics yet. Start planning above!</div>;
    }

    return (
      <div className="hist-list">
        {historyDateKeys.map(k => {
          const dayData = allTopics[k];
          const allItems = [
            ...(dayData.flutter || []).map(t => ({ ...t, type: 'flutter' as const })),
            ...(dayData.android || []).map(t => ({ ...t, type: 'android' as const }))
          ];

          if (allItems.length === 0) return null;

          return (
            <div className="hist-day" key={k}>
              <div className="hist-day-header">
                <span className="hist-day-date">{niceDate(k)}</span>
                <span className="hist-day-count">
                  {allItems.length} topic{allItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="hist-entries">
                {allItems.map((item, idx) => (
                  <div className="hist-entry" key={idx}>
                    <span className={`he-dot ${item.type}`}></span>
                    <span 
                      className="he-text" 
                      style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.6 : 1 }}
                    >
                      {item.text}
                    </span>
                    <span className="he-time">{fmtDateTime(item.added)}</span>
                    <span className={`he-badge ${item.type}`}>
                      {item.type === 'flutter' ? 'Flutter' : 'Android'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const listItems = activeTab === 'flutter' ? todayTopics.flutter : todayTopics.android;

  return (
    <div className="topic-card">
      <div className="topic-card-header">
        <div className="tc-icon flutter-ic">🎯</div>
        <div>
          <div className="tc-title">Today's Study Checklist</div>
          <div className="tc-sub">Add specific topics for your {activeTab !== 'history' ? activeTab : 'daily'} sessions. Use the quick presets helper below to add items instantly!</div>
        </div>
      </div>

      <div className="topic-tabs">
        <button 
          className={`topic-tab flutter ${activeTab === 'flutter' ? 'active' : ''}`}
          onClick={() => { setActiveTab('flutter'); setInputText(''); }}
        >
          Flutter Checklist ({todayTopics.flutter.length})
        </button>
        <button 
          className={`topic-tab android ${activeTab === 'android' ? 'active' : ''}`}
          onClick={() => { setActiveTab('android'); setInputText(''); }}
        >
          Android Checklist ({todayTopics.android.length})
        </button>
        <button 
          className={`topic-tab history ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); setInputText(''); }}
        >
          History Logs
        </button>
      </div>

      {activeTab !== 'history' ? (
        <div>
          {/* Quick-Add Presets helper bar */}
          <div className="mb-4">
            <span className="block text-[11px] font-bold tracking-wider text-[var(--tx2)] mb-1.5 uppercase">Quick-Add Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {activePresets.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAdd(tag)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--s1)] hover:bg-[var(--sap2)] border border-[var(--b0)] text-[var(--tx2)] hover:text-[var(--sap)] transition-all cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="topic-input-row">
            <input 
              className={`topic-input ${activeTab === 'android' ? 'android-focus' : ''}`} 
              type="text" 
              placeholder={activeTab === 'flutter' ? "Type a topic (e.g. Riverpod Providers, Navigator 2.0)..." : "Type a topic (e.g. Jetpack Compose States, Flow)..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              className={`add-btn ${activeTab === 'android' ? 'android' : ''}`}
              onClick={() => handleAdd()}
            >
              + Add Item
            </button>
          </div>

          <div className="topic-list">
            {listItems.length === 0 ? (
              <div className="topic-empty">No active {activeTab} topics listed for today. Type one or click a preset above to begin!</div>
            ) : (
              listItems.map((item, idx) => {
                return (
                  <div className={`topic-item ${item.done ? 'done' : ''}`} key={item.id || idx}>
                    <label className={`t-check-wrap ${activeTab === 'android' ? 'android' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={item.done}
                        onChange={() => onToggleTopic(activeTab, idx)}
                      />
                      <span className="t-checkmark">
                        <svg viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#05070d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </label>

                    <span className={`t-dot ${activeTab === 'android' ? 'android' : ''}`}></span>
                    <span className="t-text select-none">
                      {item.text}
                    </span>
                    <span className="t-time">{fmtDateTime(item.added)}</span>
                    <button 
                      className="t-del" 
                      onClick={() => onDeleteTopic(activeTab, idx)}
                      title="Remove item"
                    >
                      × Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        renderHistory()
      )}
    </div>
  );
}
