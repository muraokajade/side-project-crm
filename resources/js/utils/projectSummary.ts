import { Project } from '../types/project';

export interface ProjectSummary {
  total: number;
  interview: number;
  waiting: number;
  contracted: number;
  completed: number;
}

export function computeSummary(projects: Project[]): ProjectSummary {
  return {
    total: projects.length,
    interview: projects.filter(p => p.status === '面談予定').length,
    waiting: projects.filter(p => p.status === '返信待ち').length,
    contracted: projects.filter(p => p.status === '契約済み').length,
    completed: projects.filter(p => p.status === '完了').length,
  };
}

export function computeNextActions(projects: Project[]): Project[] {
  return projects
    .filter(p => p.next_action_date)
    .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''));
}
