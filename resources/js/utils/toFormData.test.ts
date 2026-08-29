import { describe, it, expect } from 'vitest';
import { projectToFormData, previewToFormData } from './toFormData';
import { Project, ProjectPreviewData } from '../types/project';

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
    status: '気になる',
    reward: null,
    reward_text: null,
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
    created_at: '2026-08-29T00:00:00+09:00',
    updated_at: '2026-08-29T00:00:00+09:00',
    ...overrides,
  };
}

describe('projectToFormData 報酬表記', () => {
  it('reward_textがあれば一切加工せずそのまま使う', () => {
    const form = projectToFormData(makeProject({ reward_text: '応相談', reward: null }));
    expect(form.reward_text).toBe('応相談');
  });

  it('reward_textとrewardが両方あってもreward_textを加工せず優先する', () => {
    const form = projectToFormData(makeProject({ reward_text: '時給 2,000円', reward: 2000 }));
    expect(form.reward_text).toBe('時給 2,000円');
  });

  it('reward_textが空の旧データはrewardから桁区切り付きで補完する(表記が退行しない)', () => {
    const form = projectToFormData(makeProject({ reward_text: null, reward: 80000 }));
    expect(form.reward_text).toBe('80,000円');
  });

  it('補完時の桁区切りは4桁以上でも表示と一致する', () => {
    expect(projectToFormData(makeProject({ reward: 1234567 })).reward_text).toBe('1,234,567円');
    expect(projectToFormData(makeProject({ reward: 500 })).reward_text).toBe('500円');
  });

  it('reward_textもrewardも無ければ空欄のままにする(0円で埋めない)', () => {
    const form = projectToFormData(makeProject({ reward_text: null, reward: null }));
    expect(form.reward_text).toBe('');
  });

  it('旧rewardの数値そのものはフォーム上も保持される(API互換のため)', () => {
    const form = projectToFormData(makeProject({ reward: 80000 }));
    expect(form.reward).toBe('80000');
  });
});

describe('previewToFormData 報酬表記', () => {
  const basePreview: ProjectPreviewData = {
    project_url: 'https://example.com/job/1',
    type: 'side_job',
    name: '取込案件',
    description: null,
    client_name: null,
    media: null,
    category: null,
    reward: null,
    reward_text: null,
    working_hours: null,
    applicant_count: null,
    recruitment_count: null,
    deadline: null,
    job_type: null,
    location: null,
    remote_type: null,
    employment_type: null,
    contract_type: null,
    delivery_date: null,
    fetched_at: '2026-08-29T00:00:00+09:00',
    fetch_status: 'success',
    warnings: [],
  };

  it('取込結果のreward_textをそのまま引き継ぐ', () => {
    const form = previewToFormData({ ...basePreview, reward_text: '応相談', reward: null });
    expect(form.reward_text).toBe('応相談');
    expect(form.reward).toBe('');
  });

  it('報酬を取得できなかった場合は空欄にする(0円で埋めない)', () => {
    const form = previewToFormData({ ...basePreview, reward_text: null, reward: null });
    expect(form.reward_text).toBe('');
    expect(form.reward).toBe('');
  });
});
