import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trash2, FileText, CheckCircle } from 'lucide-react';
import { DayRecord, ScheduleBlock } from '../types';
import { dateKey, niceDate, todayKey, toMin } from '../utils';

interface TopPanelsProps {
  todayRecord: DayRecord;
  allRecords: Record<string, DayRecord>;
  onUpdateNote: (note: string) => void;
  onDeletePastNote: (dateKey: string) => void;
  onResetToday: () => void;
  activeBlock: ScheduleBlock | null;
}

type NoteTabType = 'write' | 'view';

// Dynamic pomodoro split generator
function generateSessions(allocatedMins: number) {
  const sessions: { type: 'study' | 'break'; duration: number; id: string; label: string }[] = [];
  let remaining = allocatedMins;
  let cycle = 1;
  while (remaining > 0) {
    if (remaining >= 60) {
      sessions.push({ type: 'study', duration: 50, id: `c_${cycle}_study`, label: `Session ${cycle}: Study` });
      sessions.push({ type: 'break', duration: 10, id: `c_${cycle}_break`, label: `Session ${cycle}: Break` });
      remaining -= 60;
    } else if (remaining > 10) {
      sessions.push({ type: 'study', duration: remaining - 10, id: `c_${cycle}_study`, label: `Session ${cycle}: Study` });
      sessions.push({ type: 'break', duration: 10, id: `c_${cycle}_break`, label: `Session ${cycle}: Break` });
      remaining = 0;
    } else {
      sessions.push({ type: 'study', duration: remaining, id: `c_${cycle}_study`, label: `Session ${cycle}: Study` });
      remaining = 0;
    }
    cycle++;
  }
  return sessions;
}

export default function TopPanels({
  todayRecord,
  allRecords,
  onUpdateNote,
  onDeletePastNote,
  onResetToday,
  activeBlock,
}: TopPanelsProps) {
  /* ─────────────────────────────────────────────────
     STUDY DETECTOR & SIMULATOR
  ───────────────────────────────────────────────── */
  const [devForgeStudy, setDevForgeStudy] = useState(false);
  
  // Real active study block or Simulated forge block
  const simulatedBlock: ScheduleBlock = {
    id: 'simulated_study',
    start: '09:00',
    end: '12:00', // 3 hours
    title: 'Simulated Study Slot (3 Hrs)',
    cat: 'study',
    period: 'Morning',
    desc: 'Simulating focus cycles for testing context.',
  };

  const isStudyTime = (activeBlock && activeBlock.cat === 'study') || devForgeStudy;
  const currentStudyBlock = isStudyTime 
    ? (activeBlock && activeBlock.cat === 'study' ? activeBlock : simulatedBlock)
    : null;

  // Calculate allocated minutes from active block
  const allocatedMins = currentStudyBlock 
    ? (toMin(currentStudyBlock.end) - toMin(currentStudyBlock.start)) 
    : 0;

  // Generate sessions list
  const sessions = currentStudyBlock ? generateSessions(allocatedMins) : [];

  /* ─────────────────────────────────────────────────
     ADAPTIVE FOCUS TIMER STATE & LOGIC
  ───────────────────────────────────────────────── */
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<Record<string, boolean>>({});
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Timer when Study block or simulated block is evaluated
  const currentSession = sessions[currentSessionIndex];

  useEffect(() => {
    if (isStudyTime && currentSession) {
      setTimerLeft(currentSession.duration * 60);
      setTimerRunning(false);
    }
  }, [currentSessionIndex, isStudyTime, currentStudyBlock?.id]);

  // Handle count-down tik-tok
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, currentSessionIndex, sessions.length]);

  // Synthesis Beep Feedback (HTML5 Web Audio API)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime); // Pitch
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio Context error (benign in sandboxes):', e);
    }
  };

  const handleCompleteSession = () => {
    setTimerRunning(false);
    playBeep();
    
    if (currentSession) {
      setCompletedSessions(prev => ({ ...prev, [currentSession.id]: true }));
    }

    // Progress to next session automatically
    if (currentSessionIndex + 1 < sessions.length) {
      setCurrentSessionIndex((idx) => idx + 1);
    }
  };

  const handleTimerToggle = () => {
    setTimerRunning(!timerRunning);
  };

  const handleTimerReset = () => {
    setTimerRunning(false);
    if (currentSession) {
      setTimerLeft(currentSession.duration * 60);
    }
  };

  const formatTimerDisplay = (seconds: number) => {
    const minStr = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secStr = String(seconds % 60).padStart(2, '0');
    return `${minStr}:${secStr}`;
  };

  /* ─────────────────────────────────────────────────
     NOTE EDITING & PERSISTENT SAVE
  ───────────────────────────────────────────────── */
  const [noteText, setNoteText] = useState(todayRecord.note || '');
  const [saveStatus, setSaveStatus] = useState<'empty' | 'saving' | 'saved' | 'notsaved'>('empty');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNoteText(todayRecord.note || '');
    setSaveStatus(todayRecord.note ? 'saved' : 'empty');
  }, [todayRecord.note]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      onUpdateNote(val);
      setSaveStatus('saved');
    }, 1200);
  };

  const triggerManualSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    onUpdateNote(noteText);
    setSaveStatus('saved');
  };

  /* ─────────────────────────────────────────────────
     TABS & CONFIRMATION DIALOGUES
  ───────────────────────────────────────────────── */
  const [activeNoteTab, setActiveNoteTab] = useState<NoteTabType>('write');
  const [confirmReset, setConfirmReset] = useState(false);

  const todayK = todayKey();
  const pastNoteKeys = Object.keys(allRecords)
    .filter(k => k !== '_meta' && allRecords[k] && allRecords[k].note && allRecords[k].note.trim())
    .sort((a, b) => b.localeCompare(a));

  const handleTabSwitch = (tab: NoteTabType) => {
    if (saveStatus === 'saving') {
      triggerManualSave();
    }
    setActiveNoteTab(tab);
  };

  const renderLast7DaysGraph = () => {
    const bars = [];
    const labels = [];
    const THRESHOLD = 70;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const rec = allRecords[k];
      const pct = rec ? rec.percentage : 0;
      const isHit = pct >= THRESHOLD;

      bars.push(
        <div 
          className={`bar ${isHit ? 'hit' : ''}`} 
          style={{ height: `${Math.max(pct, 3)}%` }} 
          title={`${k}: ${pct}% completion`}
          key={i}
        />
      );

      const weekdayLabel = ['S','M','T','W','T','F','S'][d.getDay()];
      labels.push(<span key={i}>{weekdayLabel}</span>);
    }

    return (
      <div className="mt-4">
        <div className="strip-title">Last 7 Days Progress</div>
        <div className="strip">{bars}</div>
        <div className="strip-lbl">{labels}</div>
      </div>
    );
  };

  return (
    <div className="top-panels">
      {/* TIMER PANEL - Conditional display */}
      <div className="panel flex flex-col justify-between relative min-h-[300px]">
        {isStudyTime && currentSession ? (
          <div>
            <div className="flex items-center justify-between border-b border-[var(--b0)] pb-2 mb-4">
              <div className="panel-label">
                <span className="pip"></span>Focus Timer: {currentStudyBlock?.title}
              </div>
              <span className="text-[11px] font-mono select-none px-2 py-0.5 rounded-full bg-[var(--sap2)] text-[var(--sap)] uppercase font-semibold">
                Allocation: {allocatedMins}m
              </span>
            </div>

            {/* Countdown layout */}
            <div className="timer-wrap !mt-0 !pt-0">
              <div className="timer-num font-mono text-[var(--tx)] leading-none my-1 select-none">
                {formatTimerDisplay(timerLeft)}
              </div>
              <div className="text-xs font-semibold text-[var(--tx2)] mb-3 flex items-center justify-center gap-1.5 uppercase">
                {currentSession.type === 'study' ? '📚 Work Focus Cycle' : '☕ Break Relax Cycle'}
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sap)] animate-ping" />
              </div>

              {/* DYNAMIC SESSION CHECKPOINTS WITH COLORS! */}
              <div className="mb-4 bg-[var(--s2)] border border-[var(--b0)] rounded-xl p-3">
                <div className="text-[11px] font-bold text-[var(--tx2)] uppercase tracking-wider mb-2.5 text-center">
                  Session Node Progress
                </div>
                
                <div className="flex flex-col gap-2">
                  {sessions.map((sess, idx) => {
                    const isCompleted = completedSessions[sess.id] || idx < currentSessionIndex;
                    const isActive = idx === currentSessionIndex;
                    
                    // Style indicators
                    let badgeColorClass = 'bg-slate-150 text-slate-500 border-slate-200';
                    let bgMarker = 'bg-slate-300';
                    let labelWeight = 'font-normal text-[var(--tx2)]';

                    if (isCompleted) {
                      badgeColorClass = 'bg-[var(--em2)] text-[var(--em)] border-[var(--em)]';
                      bgMarker = 'bg-[var(--em)]';
                      labelWeight = 'font-medium line-through opacity-70 text-[var(--tx2)]';
                    } else if (isActive) {
                      badgeColorClass = 'bg-[var(--sap2)] text-[var(--sap)] border-[var(--sap)] animate-pulse';
                      bgMarker = 'bg-[var(--sap)]';
                      labelWeight = 'font-bold text-[var(--tx)]';
                    }

                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => {
                          setCurrentSessionIndex(idx);
                        }}
                        className={`flex items-center justify-between text-left p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          isActive ? 'border-[var(--sap)] bg-[var(--s0)] shadow-sm' : 'border-transparent hover:bg-[var(--s1)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${bgMarker}`} />
                          <span className={labelWeight}>{sess.label}</span>
                        </div>
                        <span className="font-mono opacity-80">{sess.duration}m</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Control triggers */}
              <div className="timer-btns">
                <button 
                  className={`btn primary ${timerRunning ? '!bg-[var(--found)] !border-[var(--found)]' : ''}`} 
                  onClick={handleTimerToggle}
                >
                  {timerRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button className="btn" onClick={handleTimerReset}>
                  Reset
                </button>
              </div>

              {devForgeStudy && (
                <button 
                  onClick={() => {
                    setDevForgeStudy(false);
                    setCompletedSessions({});
                    setCurrentSessionIndex(0);
                  }}
                  className="mt-4 text-[11px] underline text-orange-600 font-sans hover:text-orange-500 cursor-pointer block mx-auto"
                >
                  Disconnect Forge Simulator
                </button>
              )}
            </div>
          </div>
        ) : (
          /* LOCKED FOCUS TIMING CARD */
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--b0)] pb-2 mb-4">
                <div className="panel-label">
                  <span className="pip !bg-orange-400"></span>Focus Timer Locked
                </div>
                <span className="text-[11px] font-mono bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full uppercase">
                  Inactive
                </span>
              </div>
              
              <div className="text-center py-6 px-4">
                <div className="text-4xl mb-3 select-none">🔒</div>
                <h4 className="text-sm font-bold text-[var(--tx)] mb-2">Timer Unlocks During Study Blocks</h4>
                <p className="text-xs text-[var(--tx2)] max-w-[280px] mx-auto leading-relaxed">
                  Focus cycles automatically configure based on the currently allocated block duration (50m study intervals + 10m refreshments).
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--s2)] rounded-lg text-center border border-[var(--b0)]">
              <div className="text-xs text-[var(--tx2)] mb-2">Evaluating code or testing? Force focus block immediately:</div>
              <button
                type="button"
                onClick={() => setDevForgeStudy(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--sap)] hover:opacity-90 text-white cursor-pointer transition-all shadow-sm"
              >
                ✨ Forge Study Block Simulator
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DAILY NOTES PANEL */}
      <div className="panel flex flex-col justify-between min-h-[300px]">
        <div>
          <div className="panel-label flex items-center gap-1.5 font-bold">
            <span className="pip em"></span>
            Daily Reflection Logs
          </div>
          
          <div className="note-tabs2">
            <button 
              className={`ntab ${activeNoteTab === 'write' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('write')}
            >
              Write Notes
            </button>
            <button 
              className={`ntab ${activeNoteTab === 'view' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('view')}
            >
              History
            </button>
          </div>

          {activeNoteTab === 'write' ? (
            <div id="noteWritePane" className="space-y-3">
              <textarea 
                placeholder="Write down daily wins, blockers, or ideas..."
                value={noteText}
                onChange={handleNoteChange}
                onBlur={triggerManualSave}
                className="w-full min-h-[140px] p-3 text-sm rounded-lg bg-[var(--s2)] border border-[var(--b0)] text-[var(--tx)] focus:outline-none focus:border-[var(--sap)] transition-all resize-y font-sans leading-relaxed shadow-inner"
              />
              
              {/* Quick Prompt Templates */}
              <div className="flex flex-col gap-1.5 pt-1.5">
                <span className="text-[10px] font-bold text-[var(--tx2)] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-[var(--em)]" /> Add Journal Template:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = `• Wins & Milestones Today:\n  - \n\n• Roadblocks & Obstacles:\n  - \n\n• Game Plan Tomorrow:\n  - `;
                      if (noteText.trim() && !window.confirm("Append this template to your current notes?")) return;
                      const newVal = noteText ? noteText + "\n\n" + t : t;
                      setNoteText(newVal);
                      onUpdateNote(newVal);
                      setSaveStatus('saved');
                    }}
                    className="text-[11px] px-2.5 py-1 text-[var(--tx)] rounded-md bg-[var(--s1)] border border-[var(--b0)] hover:bg-[var(--s3)] cursor-pointer transition-colors flex items-center gap-1.5 font-medium"
                  >
                    📈 Wins & Blockers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = `• I am Grateful for:\n  - \n\n• Today's Breakthrough:\n  - \n\n• Daily Learning Insight:\n  - `;
                      if (noteText.trim() && !window.confirm("Append this template to your current notes?")) return;
                      const newVal = noteText ? noteText + "\n\n" + t : t;
                      setNoteText(newVal);
                      onUpdateNote(newVal);
                      setSaveStatus('saved');
                    }}
                    className="text-[11px] px-2.5 py-1 text-[var(--tx)] rounded-md bg-[var(--s1)] border border-[var(--b0)] hover:bg-[var(--s3)] cursor-pointer transition-colors flex items-center gap-1.5 font-medium"
                  >
                    🙏 Gratitude & Learnings
                  </button>
                </div>
              </div>

              {/* Counters and Save status */}
              <div className="note-save-row flex items-center justify-between mt-3 text-xs border-t border-[var(--b0)] pt-2.5">
                <div className="save-status flex items-center gap-1.5 text-slate-500 font-mono">
                  <span className={`sdot ${saveStatus === 'saved' ? 'saved' : ''} ${saveStatus === 'saving' ? 'saving' : ''}`}></span>
                  <span>
                    {saveStatus === 'saved' && 'Saved automatically'}
                    {saveStatus === 'saving' && 'Autosaving...'}
                    {saveStatus === 'empty' && 'Notes empty'}
                    {saveStatus === 'notsaved' && 'Changes unsaved'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--tx2)] font-mono">
                  {noteText.trim() ? noteText.trim().split(/\s+/).length : 0} words | {noteText.length} chars
                </div>
              </div>
            </div>
          ) : (
            <div id="noteViewPane">
              <div className="past-notes space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {pastNoteKeys.length === 0 ? (
                  <div className="no-data py-8 text-center text-xs text-[var(--tx2)] bg-[var(--s1)] rounded-lg border border-dashed border-[var(--b0)]">
                    No logs recorded. Select Write Notes to document today's thoughts.
                  </div>
                ) : (
                  pastNoteKeys.map(k => {
                    const record = allRecords[k];
                    const isToday = k === todayK;
                    return (
                      <div className={`pn-item p-3.5 rounded-xl border transition-all ${
                        isToday ? 'border-[var(--sap)] bg-[rgba(79,142,247,0.03)]' : 'border-[var(--b0)] bg-[var(--s0)] shadow-sm'
                      }`} key={k}>
                        <div className="pn-date flex items-center justify-between pb-2 mb-2 border-b border-[var(--b0)]">
                          <div className="pn-date-left flex items-center gap-2">
                            {isToday ? (
                              <span className="text-xs font-bold text-[var(--sap)] flex items-center gap-1">
                                <span>{niceDate(k)}</span>
                                <span className="text-[9px] bg-[var(--sap2)] text-[var(--sap)] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold">Today</span>
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[var(--tx)]">{niceDate(k)}</span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 roundedbg rounded-md bg-[var(--s2)] text-[var(--tx2)]">
                              {record.percentage || 0}% Completion
                            </span>
                          </div>
                          <button 
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer" 
                            title="Delete note log"
                            onClick={() => onDeletePastNote(k)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="pn-text text-xs text-[var(--tx2)] whitespace-pre-wrap leading-relaxed font-sans mt-1 pl-1">
                          {record.note}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {renderLast7DaysGraph()}
            </div>
          )}
        </div>

        {/* Dynamic inline reset dialogue at bottom of notes */}
        <div className="reset-row" id="resetRow">
          {confirmReset ? (
            <div className="flex flex-col bg-[var(--s2)] border border-[var(--b0)] rounded-lg p-2.5 w-full mt-3">
              <span className="confirm-text text-center mb-2">
                Really reset today's checkmarks and study topics?
              </span>
              <div className="flex gap-2 justify-center">
                <button 
                  className="btn primary py-1 px-3 text-xs bg-red-600 border-red-600 hover:opacity-95" 
                  onClick={() => {
                    onResetToday();
                    setConfirmReset(false);
                  }}
                >
                  Yes, Reset Today File
                </button>
                <button 
                  className="btn py-1 px-3 text-xs" 
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn text-xs mt-3 shrink-0" 
              onClick={() => setConfirmReset(true)}
            >
              Reset Today's Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
