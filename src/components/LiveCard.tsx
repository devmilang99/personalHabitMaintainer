import { useState, useEffect } from 'react';
import { ScheduleBlock, DayTopics } from '../types';
import { toMin, fmtTime } from '../utils';

interface LiveCardProps {
  blocks: ScheduleBlock[];
  todayTopics: DayTopics;
}

export default function LiveCard({ blocks, todayTopics }: LiveCardProps) {
  const [activeInfo, setActiveInfo] = useState<{
    currentBlock: ScheduleBlock | null;
    minutesLeft: number;
    pctDone: number;
    nextBlock: ScheduleBlock | null;
  }>({
    currentBlock: null,
    minutesLeft: 0,
    pctDone: 0,
    nextBlock: null,
  });

  useEffect(() => {
    const updateActive = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      let currentBlock: ScheduleBlock | null = null;
      let nextBlock: ScheduleBlock | null = null;
      let minutesLeft = 0;
      let pctDone = 0;

      // Find current and next blocks
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const s = toMin(b.start);
        const e = b.start === b.end ? s + 15 : toMin(b.end);

        if (nowMin >= s && nowMin < e) {
          currentBlock = b;
          minutesLeft = e - nowMin;
          const totalDuration = e - s;
          pctDone = (nowMin - s) / Math.max(totalDuration, 1);
          
          // find next
          if (i + 1 < blocks.length) {
            nextBlock = blocks[i + 1];
          }
          break;
        }
      }

      // If no active block found, see if we are in-between blocks, or starting soon, or done.
      if (!currentBlock) {
        // Find next block scheduled
        const futureBlocks = blocks.filter(b => toMin(b.start) > nowMin);
        if (futureBlocks.length > 0) {
          nextBlock = futureBlocks[0];
        }
      }

      setActiveInfo({ currentBlock, minutesLeft, pctDone, nextBlock });
    };

    updateActive();
    const interval = setInterval(updateActive, 1000 * 15); // Update every 15 seconds to stay snappy
    return () => clearInterval(interval);
  }, [blocks]);

  const ARC = 138.2;
  const { currentBlock, minutesLeft, pctDone, nextBlock } = activeInfo;

  // Category specific accent colors mapping
  const CAT_ACCENT: Record<string, string> = {
    study: 'var(--sap)',
    jobsearch: 'var(--em)',
    review: 'var(--tang)',
    meal: 'var(--amb)',
    foundation: 'var(--b2)',
  };

  const accentColor = currentBlock ? (CAT_ACCENT[currentBlock.cat] || 'var(--sap)') : 'var(--sap)';
  const dashOffset = ARC * (1 - Math.min(Math.max(pctDone, 0), 1));

  // Extract pending study topics for active study blocks
  let pendingTopicsText = '';
  let showTopicsLine = false;
  let topicSystemLabel = '';
  
  if (currentBlock && currentBlock.topic) {
    const list = todayTopics[currentBlock.topic] || [];
    const pending = list.filter(t => !t.done);
    if (pending.length > 0) {
      showTopicsLine = true;
      topicSystemLabel = currentBlock.topic === 'flutter' ? 'Flutter' : 'Android';
      pendingTopicsText = pending.map(t => t.text).join(' · ');
    }
  }

  return (
    <div className="now-card" id="nowCard">
      <div className="now-accent" style={{ background: accentColor }}></div>
      <div className="now-inner">
        <div className="now-orb" style={{ borderColor: `color-mix(in srgb, ${accentColor} 50%, transparent)` }}>
          <svg className="orb-icon" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill={accentColor} />
            <circle cx="9" cy="9" r="6" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.4" fill="none" />
            <circle cx="9" cy="9" r="8.5" stroke={accentColor} strokeWidth="1" strokeOpacity="0.15" fill="none" />
          </svg>
        </div>
        
        <div className="now-body">
          <div className="now-tag" style={{ color: accentColor }}>
            <span className="dot" style={{ background: accentColor }}></span>Live · Right Now
          </div>
          
          <div className="now-title">
            {currentBlock ? currentBlock.title : (nextBlock ? "In between blocks..." : "Day complete")}
          </div>
          
          <div className="now-sub">
            {currentBlock ? (
              `${minutesLeft}m remaining (until ${fmtTime(currentBlock.end)})`
            ) : nextBlock ? (
              `Next: ${nextBlock.title} at ${fmtTime(nextBlock.start)}`
            ) : (
              "Rest well — review notes or prepare for tomorrow 🌙"
            )}
          </div>

          {showTopicsLine && (
            <div className="now-topic-line">
              <span 
                className="tl-label" 
                style={{ color: currentBlock?.topic === 'flutter' ? 'var(--sky)' : 'var(--lime)' }}
              >
                {topicSystemLabel}
              </span>
              <span className="tl-text">{pendingTopicsText}</span>
            </div>
          )}
        </div>

        <div className="now-arc-wrap">
          <svg className="arc-svg" width="54" height="54" viewBox="0 0 54 54">
            <circle className="arc-bg" cx="27" cy="27" r="22" />
            <circle 
              className="arc-fg" 
              cx="27" 
              cy="27" 
              r="22" 
              stroke={accentColor}
              strokeDasharray={ARC} 
              strokeDashoffset={dashOffset} 
            />
          </svg>
          <div className="arc-label">
            {currentBlock ? `${minutesLeft}m` : (nextBlock ? 'Wait' : '✓')}
          </div>
        </div>
      </div>
    </div>
  );
}
