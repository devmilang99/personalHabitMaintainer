interface StatsGridProps {
  percentage: number;
  streak: number;
  topicsCount: number;
  bestStreak: number;
  studyMins: number;
  jobMins: number;
  commMins: number;
  reviewMins: number;
  fndMins: number;
}

export default function StatsGrid({
  percentage,
  streak,
  topicsCount,
  bestStreak,
  studyMins,
  jobMins,
  commMins,
  reviewMins,
  fndMins,
}: StatsGridProps) {
  const formatSecs = (totalMins: number) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
    return `${hrs}h ${mins}m`;
  };

  const totalAllocated = studyMins + jobMins + commMins + reviewMins + fndMins || 1;
  const studyPct = (studyMins / totalAllocated) * 100;
  const jobPct = (jobMins / totalAllocated) * 100;
  const commPct = (commMins / totalAllocated) * 100;
  const reviewPct = (reviewMins / totalAllocated) * 100;
  const fndPct = (fndMins / totalAllocated) * 100;

  return (
    <div className="space-y-4 mb-6">
      {/* Prime Stats Cards */}
      <div className="stats border-0 p-0 !grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat" id="stat-today">
          <div className="num font-mono">{percentage}%</div>
          <div className="lbl font-sans">Blocks Done</div>
        </div>
        <div className="stat em" id="stat-streak">
          <div className="num font-mono">{streak}</div>
          <div className="lbl font-sans font-medium">Daily Streak</div>
        </div>
        <div className="stat tang" id="stat-topics">
          <div className="num font-mono">{topicsCount}</div>
          <div className="lbl font-sans">Active Topics</div>
        </div>
        <div className="stat sky" id="stat-best">
          <div className="num font-mono">{bestStreak}</div>
          <div className="lbl font-sans">Best Streak</div>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-1 text-xs text-slate-500 font-mono">
          <span>DAILY COMPLETION TRACKER</span>
          <span>{percentage}%</span>
        </div>
        <div className="prog-track">
          <div 
            className="prog-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* NEW: ALLOCATION STATS DASHBOARD */}
      <div className="bg-[var(--s0)] border border-[var(--b0)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--b0)] pb-2 mb-3">
          <span className="text-xs font-bold tracking-[0.1em] text-[var(--tx2)] uppercase">Time Allocation Meter</span>
          <span className="text-[11.5px] font-mono text-[var(--tx2)]">Total Calendar: {formatSecs(studyMins + jobMins + commMins + reviewMins + fndMins)}</span>
        </div>

        {/* Dynamic Horizontal Strip */}
        <div className="h-2.5 rounded-full overflow-hidden flex bg-[var(--s3)] mb-3">
          <div style={{ width: `${studyPct}%` }} className="bg-[var(--sap)]" title={`Study: ${formatSecs(studyMins)}`} />
          <div style={{ width: `${jobPct}%` }} className="bg-[var(--em)]" title={`Job Search: ${formatSecs(jobMins)}`} />
          <div style={{ width: `${commPct}%` }} className="bg-[var(--sky)]" title={`Communication: ${formatSecs(commMins)}`} />
          <div style={{ width: `${reviewPct}%` }} className="bg-[var(--tang)]" title={`Review: ${formatSecs(reviewMins)}`} />
          <div style={{ width: `${fndPct}%` }} className="bg-[var(--found)]" title={`Downtime & Meals: ${formatSecs(fndMins)}`} />
        </div>

        {/* Dynamic legend read-outs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-[var(--s1)] transition-colors">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--sap)] mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--tx2)] uppercase tracking-wider">Morning Study</div>
              <div className="text-sm font-bold font-mono text-[var(--tx)]">{formatSecs(studyMins)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-[var(--s1)] transition-colors">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--em)] mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--tx2)] uppercase tracking-wider font-sans">Job Search</div>
              <div className="text-sm font-bold font-mono text-[var(--tx)]">{formatSecs(jobMins)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-[var(--s1)] transition-colors">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--sky)] mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--tx2)] uppercase tracking-wider font-sans">Communication</div>
              <div className="text-sm font-bold font-mono text-[var(--tx)]">{formatSecs(commMins)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-[var(--s1)] transition-colors">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--tang)] mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--tx2)] uppercase tracking-wider font-sans font-sans">Review & Plan</div>
              <div className="text-sm font-bold font-mono text-[var(--tx)]">{formatSecs(reviewMins)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-[var(--s1)] transition-colors">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--found)] mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--tx2)] uppercase tracking-wider">Downtime & Meals</div>
              <div className="text-sm font-bold font-mono text-[var(--tx)]">{formatSecs(fndMins)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
