import type { ProjectStatus } from '../types';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  archived: 'Archived',
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  in_progress: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['in_progress', 'review', 'completed', 'archived'];
