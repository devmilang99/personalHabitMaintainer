import { useState, useEffect } from 'react';
import { ScheduleBlock, DayRecord, DayTopics } from '../types';
import { fmtTime, toMin } from '../utils';

interface TimelineSectionProps {
  blocks: ScheduleBlock[];
  todayRecord: DayRecord;
  todayTopics: DayTopics;
  onToggleBlock: (id: string) => void;
  onAddBlock: (newBlock: ScheduleBlock) => void;
  onUpdateBlock: (updatedBlock: ScheduleBlock) => void;
  onDeleteBlock: (id: string) => void;
  onResetToDefaultBlocks: () => void;
}

export default function TimelineSection({
  blocks,
  todayRecord,
  todayTopics,
  onToggleBlock,
}: TimelineSectionProps) {
  const [nowMin, setNowMin] = useState(0);

  useEffect(() => {
    const calcMin = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    calcMin();
    const interval = setInterval(calcMin, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const renderBadge = (cat: string) => {
    switch (cat) {
      case 'study':
        return <span className="badge study">Study</span>;
      case 'jobsearch':
        return <span className="badge jobsearch">Job Prep</span>;
      case 'communication':
        return <span className="badge communication font-semibold text-slate-700 bg-sky-100 hover:opacity-90">STAR / Tech Pitching</span>;
      case 'review':
        return <span className="badge review">Review</span>;
      case 'meal':
        return <span className="badge meal">Meal</span>;
      default:
        return null;
    }
  };

  const PERIODS = [
    {
      id: 'Morning',
      label: 'Morning Focus Block',
      icon: '🌅',
      style: 'border-l-4 border-l-[var(--sap)] bg-slate-50/50 dark:bg-slate-900/10',
      badgeClass: 'bg-[var(--sap2)] text-[var(--sap)]',
      desc: 'Dedicated study block, prime learning intervals, body & mind prep'
    },
    {
      id: 'Afternoon',
      label: 'Afternoon Outreach & Prep',
      icon: '☀️',
      style: 'border-l-4 border-l-[var(--em)] bg-slate-50/50 dark:bg-slate-900/10',
      badgeClass: 'bg-[var(--em2)] text-[var(--em)]',
      desc: 'Active job applications, networking outreach, technical coding drills'
    },
    {
      id: 'Evening',
      label: 'Evening Reflection & Review',
      icon: '🌙',
      style: 'border-l-4 border-l-[var(--tang)] bg-slate-50/50 dark:bg-slate-900/10',
      badgeClass: 'bg-[var(--tang2)] text-[var(--tang)]',
      desc: 'Spaced repetition flashcards, note keeping, logs reflection and schedule prep'
    }
  ];

  // Sort blocks chronologically
  const sortedBlocks = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start));

  return (
    <div className="space-y-6 mt-8">
      {/* SECTION HEADER CONTROL */}
      <div className="border-b border-[var(--b0)] pb-3">
        <h2 className="text-[var(--tx)] text-[14px] font-bold tracking-[0.1em] uppercase">Daily Calendar Tracks</h2>
        <p className="text-xs text-[var(--tx2)] mt-1">
          Each block triggers automatically. Tick off tasks as you navigate through the day.
        </p>
      </div>

      {/* RENDER MORNING, AFTERNOON, EVENING CARDS SEPARATELY */}
      <div className="grid grid-cols-1 gap-6">
        {PERIODS.map(period => {
          const periodBlocks = sortedBlocks.filter(b => b.period === period.id);
          if (periodBlocks.length === 0) return null;

          const rangeStr = `${fmtTime(periodBlocks[0].start)} – ${fmtTime(periodBlocks[periodBlocks.length - 1].end)}`;

          return (
            <div 
              key={period.id} 
              className={`bg-[var(--s0)] border border-[var(--b0)] rounded-xl shadow-sm overflow-hidden p-5 transition-all hover:shadow-md ${period.style}`}
            >
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[var(--b0)] pb-3.5 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl select-none" role="img" aria-label={period.id}>
                    {period.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--tx)] tracking-wide flex items-center gap-2">
                      {period.label}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${period.badgeClass}`}>
                        {rangeStr}
                      </span>
                    </h3>
                    <p className="text-[11.5px] text-[var(--tx2)] mt-0.5">{period.desc}</p>
                  </div>
                </div>
              </div>

              {/* Card List of activities */}
              <div className="space-y-3">
                {periodBlocks.map((b, bIdx) => {
                  const startVal = toMin(b.start);
                  const endVal = b.start === b.end ? startVal + 15 : toMin(b.end);
                  const isNow = nowMin >= startVal && nowMin < endVal;
                  const isChecked = !!todayRecord.checked[b.id];

                  // Associated checklist items
                  let associatedTopicsHTML = null;
                  if (b.topic) {
                    const list = todayTopics[b.topic] || [];
                    const targetTopics = list.filter(t => !t.done).slice(0, 4);
                    if (targetTopics.length > 0) {
                      associatedTopicsHTML = (
                        <div className="row-topics has-topics mt-2 flex flex-wrap gap-1.5 pl-1.5 border-l border-[var(--b1)] ml-1">
                          {targetTopics.map((topic, tIdx) => (
                            <div className="rt-item flex items-center gap-1.5 text-xs bg-[var(--s2)] border border-[var(--b0)] px-2 py-0.5 rounded" key={topic.id || tIdx}>
                              <span className={`w-1.5 h-1.5 rounded-full ${b.topic === 'android' ? 'bg-lime-500' : 'bg-sky-500'}`}></span>
                              <span className="rt-text text-[11px] font-mono text-[var(--tx2)]">{topic.text}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  }

                  return (
                    <div 
                      key={b.id || bIdx}
                      className={`flex justify-between items-start p-3.5 rounded-xl border transition-all ${
                        isChecked 
                          ? 'bg-[var(--s1)]/40 border-[var(--b0)] opacity-70' 
                          : isNow 
                            ? 'bg-[var(--sap2)] border-[var(--sap)] shadow-sm font-medium' 
                            : 'bg-[var(--s2)] border-[var(--b0)] hover:border-[var(--b1)]'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="text-[11px] font-mono font-medium text-[var(--tx2)]">
                            {fmtTime(b.start)}{b.start !== b.end && ` – ${fmtTime(b.end)}`}
                          </span>
                          
                          {isNow && (
                            <span className="animate-pulse bg-[var(--sap)] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                              LIVE NOW
                            </span>
                          )}

                          {renderBadge(b.cat)}
                        </div>

                        <h4 className={`text-sm text-[var(--tx)] font-semibold leading-snug tracking-tight ${isChecked ? 'line-through text-[var(--tx3)]' : ''}`}>
                          {b.title}
                        </h4>

                        {b.desc && (
                          <p 
                            className="text-[11.5px] text-[var(--tx2)] mt-1 ml-0.5 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: b.desc }} 
                          />
                        )}

                        {associatedTopicsHTML}
                      </div>

                      {/* Satisfying check checkbox */}
                      <label className="ck shrink-0 ml-1 select-none">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => onToggleBlock(b.id)}
                        />
                        <span className="ckm border border-[var(--b1)] rounded-lg transition-transform hover:scale-105">
                          <svg viewBox="0 0 11 11" fill="none">
                            <path 
                              d="M1.5 5.5l3 3 5-6" 
                              stroke="#ffffff" 
                              strokeWidth="2.2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          </svg>
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
