export interface TopicItem {
  id: string;
  text: string;
  added: string; // ISO string
  done: boolean;
}

export type CategoryType = 'study' | 'jobsearch' | 'communication' | 'review' | 'meal' | 'foundation';
export type PeriodType = 'Morning' | 'Afternoon' | 'Evening';

export interface ScheduleBlock {
  id: string;
  start: string; // "HH:MM" format
  end: string;   // "HH:MM" format
  title: string;
  cat: CategoryType;
  period: PeriodType;
  desc: string;
  topic?: 'flutter' | 'android';
  isCustom?: boolean;
}

export interface DayRecord {
  checked: Record<string, boolean>; // key: block.id, value: completed status
  note: string;
  percentage: number;
}

export interface DayTopics {
  flutter: TopicItem[];
  android: TopicItem[];
}

export interface AppMetadata {
  bestStreak: number;
}
