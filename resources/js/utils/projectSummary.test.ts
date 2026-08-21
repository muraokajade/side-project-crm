import { describe, it, expect } from 'vitest';
import { computeSummary, computeNextActions } from './projectSummary';
import { Project } from '../types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'テスト案件',
    project_url: null,
    client_name: null,
    media: null,
    category: null,
    applied_date: null,
    status: '未応募',
    reward: null,
    working_hours: null,
    applicant_count: null,
    recruitment_count: null,
    application_text: null,
    next_action: null,
    next_action_date: null,
    memo: null,
    priority: null,
    is_favorite: false,
    created_at: '2026-08-01T00:00:00.000000Z',
    updated_at: '2026-08-01T00:00:00.000000Z',
    ...overrides,
  };
}

describe('computeSummary', () => {
  it('空配列の場合すべて0を返す', () => {
    expect(computeSummary([])).toEqual({
      total: 0,
      interview: 0,
      waiting: 0,
      contracted: 0,
      completed: 0,
    });
  });

  it('ステータスごとの件数を正しく集計する', () => {
    const projects = [
      makeProject({ id: 1, status: '面談予定' }),
      makeProject({ id: 2, status: '面談予定' }),
      makeProject({ id: 3, status: '返信待ち' }),
      makeProject({ id: 4, status: '契約済み' }),
      makeProject({ id: 5, status: '完了' }),
      makeProject({ id: 6, status: '未応募' }),
    ];
    expect(computeSummary(projects)).toEqual({
      total: 6,
      interview: 2,
      waiting: 1,
      contracted: 1,
      completed: 1,
    });
  });

  it('totalは常に配列の長さと一致する', () => {
    const projects = [makeProject({ id: 1 }), makeProject({ id: 2 }), makeProject({ id: 3 })];
    expect(computeSummary(projects).total).toBe(projects.length);
  });
});

describe('computeNextActions', () => {
  it('next_action_dateがnullの案件を除外する', () => {
    const projects = [
      makeProject({ id: 1, next_action_date: null }),
      makeProject({ id: 2, next_action_date: '2026-09-01T00:00:00.000000Z' }),
    ];
    const result = computeNextActions(projects);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('next_action_dateの昇順でソートする', () => {
    const projects = [
      makeProject({ id: 1, next_action_date: '2026-09-10T00:00:00.000000Z' }),
      makeProject({ id: 2, next_action_date: '2026-08-25T00:00:00.000000Z' }),
      makeProject({ id: 3, next_action_date: '2026-09-01T00:00:00.000000Z' }),
    ];
    const result = computeNextActions(projects);
    expect(result.map(p => p.id)).toEqual([2, 3, 1]);
  });

  it('全件next_action_dateがnullの場合は空配列を返す', () => {
    const projects = [makeProject({ id: 1 }), makeProject({ id: 2 })];
    expect(computeNextActions(projects)).toEqual([]);
  });
});
