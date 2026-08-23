import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCard from './ProjectCard';
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
    status: '気になる',
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

describe('ProjectCard アコーディオン', () => {
  it('初期状態では概要等の詳細項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ description: '概要テキスト' })} variant="active" />);
    expect(screen.queryByText('概要テキスト')).not.toBeInTheDocument();
  });

  it('ヘッダーをクリックすると展開し、詳細項目が表示される', () => {
    render(<ProjectCard project={makeProject({ description: '概要テキスト' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.getByText('概要テキスト')).toBeInTheDocument();
  });

  it('展開後に再度クリックすると閉じる', () => {
    render(<ProjectCard project={makeProject({ description: '概要テキスト' })} variant="active" />);
    const header = screen.getByRole('button', { name: /テスト案件/ });
    fireEvent.click(header);
    expect(screen.getByText('概要テキスト')).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText('概要テキスト')).not.toBeInTheDocument();
  });

  it('複数カードを同時に展開できる', () => {
    render(
      <>
        <ProjectCard project={makeProject({ id: 1, name: '案件A', description: '概要A' })} variant="active" />
        <ProjectCard project={makeProject({ id: 2, name: '案件B', description: '概要B' })} variant="active" />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: /案件A/ }));
    fireEvent.click(screen.getByRole('button', { name: /案件B/ }));

    expect(screen.getByText('概要A')).toBeInTheDocument();
    expect(screen.getByText('概要B')).toBeInTheDocument();
  });
});

describe('ProjectCard ステータス表示', () => {
  it('career新ステータス「内定」を色付きバッジで表示する', () => {
    render(<ProjectCard project={makeProject({ type: 'career', status: '内定' })} variant="active" />);
    const badge = screen.getByText('内定');
    expect(badge.className).toContain('bg-green-100');
  });

  it('side_job新ステータス「契約」を色付きバッジで表示する', () => {
    render(<ProjectCard project={makeProject({ status: '契約' })} variant="active" />);
    const badge = screen.getByText('契約');
    expect(badge.className).toContain('bg-violet-100');
  });
});

describe('ProjectCard priority非表示', () => {
  it('priorityが設定されていても画面に表示しない', () => {
    render(<ProjectCard project={makeProject({ priority: '3.0' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.queryByText('3.0')).not.toBeInTheDocument();
  });
});

describe('ProjectCard URL表示', () => {
  it('https URLはリンクとして表示する', () => {
    render(<ProjectCard project={makeProject({ project_url: 'https://example.com/job/1' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    const link = screen.getByRole('link', { name: 'https://example.com/job/1' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('http/https以外のスキームはリンク化しない', () => {
    render(<ProjectCard project={makeProject({ project_url: 'javascript:alert(1)' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });
});

describe('ProjectCard type専用項目', () => {
  it('career用項目(職種)を表示し、side_job用項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ type: 'career', job_type: 'バックエンド', contract_type: null })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.getByText('バックエンド')).toBeInTheDocument();
    expect(screen.queryByText('副業専用項目')).not.toBeInTheDocument();
  });

  it('side_job用項目(契約形態)を表示し、career用項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ contract_type: '業務委託' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.getByText('業務委託')).toBeInTheDocument();
    expect(screen.queryByText('転職専用項目')).not.toBeInTheDocument();
  });
});

describe('ProjectCard variant別の操作', () => {
  it('variant=activeでは編集・削除ボタンを表示する', () => {
    render(<ProjectCard project={makeProject()} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('variant=trashでは復元・完全削除ボタンを表示する', () => {
    render(<ProjectCard project={makeProject()} variant="trash" />);
    fireEvent.click(screen.getByRole('button', { name: /テスト案件/ }));
    expect(screen.getByRole('button', { name: '復元' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '完全削除' })).toBeInTheDocument();
  });
});
