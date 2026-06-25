import { ScheduleBlock, TopicItem, DayRecord } from './types';

// Convert "HH:MM" format to minutes from midnight
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

// Convert "08:30" format to "8:30 AM" or similar
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const p = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

// Get string key formatted in YYYY-MM-DD
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Get today's key string
export function todayKey(): string {
  return dateKey(new Date());
}

// Format date nicely: "Thu, Jun 18"
export function niceDate(k: string): string {
  const [y, m, d] = k.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return k;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Format ISO date string to short time: "11:22 AM"
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Standard baseline setup of structured blocks
export function getDefaultBlocks(): ScheduleBlock[] {
  return [
    { id: 'wake',    start: '05:00', end: '05:30', title: 'Wake & hydrate',          cat: 'foundation', period: 'Morning',   desc: '<em>Water first.</em> Prepare your day with mindfulness.' },
    { id: 'move',    start: '05:30', end: '06:10', title: 'Morning movement',        cat: 'foundation', period: 'Morning',   desc: 'Stretch, run, or light exercise — <em>prime the body before the mind.</em>' },
    { id: 'ready',   start: '06:10', end: '06:30', title: 'Ready & shower',          cat: 'foundation', period: 'Morning',   desc: '<em>Show up</em> as if there is somewhere to be.' },
    
    // Study session 6:30am to 12:30pm
    { id: 'study_p1', start: '06:30', end: '09:00', title: 'Planner 1st Session',     cat: 'study',      period: 'Morning',   desc: '<em>Initial Planner block.</em> Focused productivity and high-leverage learning.' },
    { id: 'breakfast', start: '09:00', end: '09:30', title: 'Breakfast',             cat: 'meal',       period: 'Morning',   desc: 'Nutritious breakfast to fuel your morning study.' },
    { id: 'study_p2', start: '09:30', end: '12:30', title: 'Planner second session',  cat: 'study',      period: 'Morning',   desc: '<em>Second Planner block.</em> Continued core system implementation and architecture.' },
    
    // Afternoon breaks and 1.5 hr each for Flutter & Android
    { id: 'study_brk1', start: '12:30', end: '12:45', title: 'Afternoon Break (Part 1)', cat: 'foundation', period: 'Afternoon', desc: 'Step away from screen. Hydrate and relax your eyes.' },
    { id: 'flutter', start: '12:45', end: '14:15', title: 'Study — Flutter',          cat: 'study',      period: 'Afternoon', desc: '<em>1.5 Hr interactive focus.</em> Construct state pipelines or widget prototypes.', topic: 'flutter' },
    { id: 'study_brk2', start: '14:15', end: '14:30', title: 'Afternoon Break (Part 2)', cat: 'foundation', period: 'Afternoon', desc: 'Take deep breaths. Walk around a bit.' },
    { id: 'android', start: '14:30', end: '16:00', title: 'Study — Android Studio',   cat: 'study',      period: 'Afternoon', desc: '<em>1.5 Hr interactive focus.</em> Deep dive into Compose, Kotlin flows, or architecture.', topic: 'android' },
    
    // Lunch around 4 PM
    { id: 'lunch',   start: '16:00', end: '16:30', title: 'Lunch',                   cat: 'meal',       period: 'Afternoon', desc: 'Enjoy your afternoon lunch around 4 PM.' },
    
    // Skills development (Job search 1 hr, Communication 2 hrs, divided afternoon breaks)
    { id: 'comm_star', start: '16:30', end: '17:30', title: 'Communication — Interview STAR prep', cat: 'communication', period: 'Afternoon', desc: 'Develop behavioral STAR structures and resume story narratives.' },
    { id: 'jobsearch', start: '17:30', end: '18:30', title: 'Job Search & Outreach',  cat: 'jobsearch',  period: 'Afternoon', desc: '<em>1 Hour high-focus speed.</em> Core applications, tailored CVs, and recruiter outreach.' },
    { id: 'comm_tech', start: '18:30', end: '19:30', title: 'Communication — Tech Explanations', cat: 'communication', period: 'Afternoon', desc: 'Practice explaining complex technical tasks verbally.' },
    
    // Evening blocks starting from Dinner at 7:30pm
    { id: 'dinner',  start: '19:30', end: '20:00', title: 'Dinner',                  cat: 'meal',       period: 'Evening',   desc: 'Relaxing evening dinner with absolutely zero screen exposure.' },
    { id: 'study_brk3', start: '20:00', end: '20:15', title: 'Afternoon Break (Part 3)', cat: 'foundation', period: 'Evening',   desc: 'Stretch and relax right after Dinner.' },
    { id: 'revise',  start: '20:15', end: '21:00', title: 'Revision and next day planning', cat: 'review', period: 'Evening',   desc: '<em>Commit wins</em> and prepare tomorrow\'s target checklists.' },
    { id: 'study_brk4', start: '21:00', end: '21:15', title: 'Afternoon Break (Part 4)', cat: 'foundation', period: 'Evening',   desc: 'Final break block to complete the 1-hour divided downtime.' },
    { id: 'swind',   start: '21:15', end: '22:00', title: 'Sleep wind-down',         cat: 'foundation', period: 'Evening',   desc: 'Read a book or try screen-free off-device reflection.' },
    { id: 'sleep',   start: '22:00', end: '22:15', title: 'Sleep transition',        cat: 'foundation', period: 'Evening',   desc: 'Lights out. Rest and recuperate.' }
  ];
}

// Compute the current streak of completed days (percentage >= threshold)
export function computeStreak(records: Record<string, DayRecord>, targetThreshold = 70): number {
  let streak = 0;
  const d = new Date();
  
  // If today's completion is less than threshold, we check from yesterday backwards
  const todayK = todayKey();
  const todayRec = records[todayK];
  if (!todayRec || todayRec.percentage < targetThreshold) {
    d.setDate(d.getDate() - 1);
  }
  
  while (true) {
    const k = dateKey(d);
    const r = records[k];
    if (r && r.percentage >= targetThreshold) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
