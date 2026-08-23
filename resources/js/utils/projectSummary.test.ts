import { describe, it, expect } from 'vitest';
import { computeSummary, computeNextActions, computeStatusSummary } from './projectSummary';
import { Project } from '../types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    type: 'side_job',
    name: 'テスト案件',
    project_url: null,
    client_name: null,
    media: null,
    category: null,
    description: null,
    applied_date: null,
    deadline: null,
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
    job_type: null,
    location: null,
    remote_type: null,
    employment_type: null,
    contract_type: null,
    delivery_date: null,
    fetched_at: null,
    deleted_at: null,
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

describe('computeStatusSummary', () => {
  it('空配列の場合すべて0を返す', () => {
    expect(computeStatusSummary([])).toEqual({ total: 0, open: 0, closed: 0, favorite: 0 });
  });

  it('内定・完了・見送りをclosed、それ以外をopenとして数える', () => {
    const projects = [
      makeProject({ id: 1, status: '気になる' }),
      makeProject({ id: 2, status: '書類選考' }),
      makeProject({ id: 3, status: '内定' }),
      makeProject({ id: 4, status: '完了' }),
      makeProject({ id: 5, status: '見送り' }),
    ];

    expect(computeStatusSummary(projects)).toEqual({ total: 5, open: 2, closed: 3, favorite: 0 });
  });

  it('is_favorite=trueの件数を数える', () => {
    const projects = [
      makeProject({ id: 1, is_favorite: true }),
      makeProject({ id: 2, is_favorite: false }),
      makeProject({ id: 3, is_favorite: true }),
    ];

    expect(computeStatusSummary(projects).favorite).toBe(2);
  });

  it('typeで事前に絞り込んだ配列を渡せば、その範囲だけを集計する(呼び出し側の責務)', () => {
    const careerOnly = [
      makeProject({ id: 1, type: 'career', status: '内定' }),
    ];

    expect(computeStatusSummary(careerOnly)).toEqual({ total: 1, open: 0, closed: 1, favorite: 0 });
  });
});
