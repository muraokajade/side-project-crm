import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrashView from './TrashView';
import { Project } from '../types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    type: 'side_job',
    name: '削除済み案件',
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
    deleted_at: '2026-08-22T00:00:00.000000Z',
    created_at: '2026-08-01T00:00:00.000000Z',
    updated_at: '2026-08-01T00:00:00.000000Z',
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

describe('TrashView', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('0件のとき「ゴミ箱は空です」を表示する', async () => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [] })));
    vi.stubGlobal('fetch', fetchMock);

    render(<TrashView onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('ゴミ箱は空です')).toBeInTheDocument());
  });

  it('削除済みProjectの一覧を表示する', async () => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [makeProject()] })));
    vi.stubGlobal('fetch', fetchMock);

    render(<TrashView onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('削除済み案件')).toBeInTheDocument());
  });

  it('復元ボタンでPOST /api/projects/{id}/restoreを呼び出し、一覧を再取得する', async () => {
    let restoreCalled = false;
    fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes('/restore')) {
        restoreCalled = true;
        return Promise.resolve(jsonResponse(200, { data: makeProject() }));
      }
      // 復元後の再取得では空配列を返す(ゴミ箱から消えたことを表現)
      return Promise.resolve(jsonResponse(200, { data: restoreCalled ? [] : [makeProject()] }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TrashView onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('削除済み案件')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: '復元' }));

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        call => String(call[0]).includes('/api/projects/1/restore') && (call[1] as RequestInit)?.method === 'POST'
      );
      expect(called).toBe(true);
    });
    await waitFor(() => expect(screen.getByText('ゴミ箱は空です')).toBeInTheDocument());
  });

  it('完全削除は確認ダイアログを表示し、キャンセルすればDELETEを送信しない', async () => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [makeProject()] })));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => false));

    render(<TrashView onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('削除済み案件')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: '完全削除' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(call => (call[1] as RequestInit)?.method === 'DELETE')).toBe(false);
  });

  it('完全削除を確認するとDELETE /api/projects/{id}/forceを呼び出す', async () => {
    fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes('/force') && options?.method === 'DELETE') {
        return Promise.resolve({ status: 204, json: async () => ({}) } as Response);
      }
      return Promise.resolve(jsonResponse(200, { data: [makeProject()] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(<TrashView onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('削除済み案件')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: '完全削除' }));

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(
        call => String(call[0]).includes('/api/projects/1/force') && (call[1] as RequestInit)?.method === 'DELETE'
      );
      expect(called).toBe(true);
    });
  });

  it('「一覧へ戻る」ボタンでonCloseを呼び出す', async () => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [] })));
    vi.stubGlobal('fetch', fetchMock);
    const onClose = vi.fn();

    render(<TrashView onClose={onClose} />);
    await waitFor(() => expect(screen.getByText('ゴミ箱は空です')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '一覧へ戻る' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
