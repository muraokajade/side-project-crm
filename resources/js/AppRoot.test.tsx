import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppRoot from './AppRoot';
import { Project } from './types/project';

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

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

describe('AppRoot', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/projects/trash')) {
        return Promise.resolve(jsonResponse(200, { data: [] }));
      }
      return Promise.resolve(jsonResponse(200, { data: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('タブ切替で/api/projects?type=careerを呼び出す(type絞り込み)', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '転職' }));

    await waitFor(() => {
      const calledWithCareer = fetchMock.mock.calls.some(call => String(call[0]).includes('type=career'));
      expect(calledWithCareer).toBe(true);
    });
  });

  it('検索欄に入力すると、debounce後にkeywordパラメータ付きで検索する', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('案件名・クライアント・概要・メモを検索'), {
      target: { value: 'Laravel' },
    });

    await waitFor(
      () => {
        const calledWithKeyword = fetchMock.mock.calls.some(call => String(call[0]).includes('keyword=Laravel'));
        expect(calledWithKeyword).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it('検索クリアボタンで即座に検索条件を解除する', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('案件名・クライアント・概要・メモを検索');
    fireEvent.change(input, { target: { value: 'Laravel' } });

    await waitFor(() => expect(screen.getByLabelText('検索をクリア')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('検索をクリア'));

    expect((input as HTMLInputElement).value).toBe('');
  });

  it('一覧が0件のとき「案件がありません」を表示する', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('案件がありません')).toBeInTheDocument());
  });

  it('削除確認後にDELETE /api/projects/{id}を呼び出し、一覧を再取得する', async () => {
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/projects/1') && options?.method === 'DELETE') {
        return Promise.resolve({ status: 204, json: async () => ({}) } as Response);
      }
      if (url.includes('/api/projects/trash')) {
        return Promise.resolve(jsonResponse(200, { data: [] }));
      }
      return Promise.resolve(jsonResponse(200, { data: [makeProject({ id: 1, name: '削除対象案件' })] }));
    });
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('削除対象案件')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /削除対象案件/ }));
    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    await waitFor(() => {
      const deleteCalled = fetchMock.mock.calls.some(
        call => String(call[0]).includes('/api/projects/1') && (call[1] as RequestInit)?.method === 'DELETE'
      );
      expect(deleteCalled).toBe(true);
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it('「ゴミ箱」ボタンでゴミ箱一覧(GET /api/projects/trash)を表示する', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/projects/trash')) {
        return Promise.resolve(jsonResponse(200, { data: [makeProject({ id: 2, name: '削除済み案件' })] }));
      }
      return Promise.resolve(jsonResponse(200, { data: [] }));
    });

    render(<AppRoot />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'ゴミ箱' }));

    await waitFor(() => expect(screen.getByText('削除済み案件')).toBeInTheDocument());
  });
});
