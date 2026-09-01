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
    created_at: '2026-08-01T00:00:00.000000Z',
    updated_at: '2026-08-01T00:00:00.000000Z',
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

const AUTH_USER = { id: 1, name: 'モニターA', email: 'a@example.com' };

describe('AppRoot', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url: string) => {
      // 既存の一覧・検索テストはログイン済みを前提とする。
      if (url.includes('/api/auth/me')) {
        return Promise.resolve(jsonResponse(200, { data: AUTH_USER }));
      }
      if (url.includes('/api/auth/logout')) {
        return Promise.resolve(jsonResponse(200, { data: null }));
      }
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

  it('未登録で0件のときはURL取込へ誘導する空状態を表示する', async () => {
    render(<AppRoot />);

    await waitFor(() => expect(screen.getByText('まだ案件がありません')).toBeInTheDocument());

    // 空状態からURL取込・手入力の両方へ進める。
    expect(screen.getAllByRole('button', { name: 'URLから登録' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '手入力で登録' })).toBeInTheDocument();
  });

  it('空状態の「URLから登録」からURL取込モーダルを開ける', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('まだ案件がありません')).toBeInTheDocument());

    const buttons = screen.getAllByRole('button', { name: 'URLから登録' });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByText('案件ページのURL')).toBeInTheDocument();
  });

  it('絞り込みの結果0件のときは、未登録とは別の空状態を出して条件をクリアできる', async () => {
    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('まだ案件がありません')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '転職' }));

    await waitFor(() => expect(screen.getByText('条件に一致する案件がありません。')).toBeInTheDocument());
    expect(screen.queryByText('まだ案件がありません')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '条件をクリア' }));

    await waitFor(() => expect(screen.getByText('まだ案件がありません')).toBeInTheDocument());
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

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゴミ箱へ移動' }));

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

  it('未ログイン(/api/auth/meが401)ならログイン画面を表示し、案件APIを呼ばない', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(401, { message: 'Unauthenticated.' }));
      return Promise.resolve(jsonResponse(200, { data: [] }));
    });

    render(<AppRoot />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument());

    // 案件一覧APIは一度も呼ばれない。
    const calledProjects = fetchMock.mock.calls.some(call => String(call[0]).includes('/api/projects'));
    expect(calledProjects).toBe(false);
  });

  it('未ログインでは案件データやヘッダー操作を一切表示しない', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(401, { message: 'Unauthenticated.' }));
      return Promise.resolve(jsonResponse(200, { data: [makeProject({ name: '見えてはいけない案件' })] }));
    });

    render(<AppRoot />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument());

    expect(screen.queryByText('見えてはいけない案件')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '手入力' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ゴミ箱' })).not.toBeInTheDocument();
  });

  it('ログイン済みならログインユーザーのメールとログアウトボタンを表示する', async () => {
    render(<AppRoot />);

    await waitFor(() => expect(screen.getByText('a@example.com')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('ログアウトするとログイン画面へ戻り、前ユーザーの案件が画面に残らない', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, { data: AUTH_USER }));
      if (url.includes('/api/auth/logout')) return Promise.resolve(jsonResponse(200, { data: null }));
      return Promise.resolve(jsonResponse(200, { data: [makeProject({ name: 'Aの案件' })] }));
    });

    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('Aの案件')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument());
    expect(screen.queryByText('Aの案件')).not.toBeInTheDocument();
  });

  it('一覧取得が401になった場合はログイン画面へ戻す(セッション切れ)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, { data: AUTH_USER }));
      if (url.includes('/api/projects')) return Promise.resolve(jsonResponse(401, { message: 'Unauthenticated.' }));
      return Promise.resolve(jsonResponse(200, { data: [] }));
    });

    render(<AppRoot />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument());
  });

  it('URL取込で手入力へ進むと、URLと種別を保持した登録フォームが開く', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, { data: AUTH_USER }));
      if (url.includes('/api/import/preview')) {
        return Promise.resolve(jsonResponse(422, {
          message: 'このURLはログインが必要なページのため、求人情報を自動取得できません。',
          error_code: 'requires_manual_entry',
          requires_manual_entry: true,
        }));
      }
      return Promise.resolve(jsonResponse(200, { data: [] }));
    });

    render(<AppRoot />);
    await waitFor(() => expect(screen.getByText('まだ案件がありません')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'URLから登録' })[0]);
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://type.jp/entry_history/entry_message_list/12345/' },
    });
    fireEvent.change(screen.getByLabelText('種別'), { target: { value: 'career' } });
    fireEvent.click(screen.getByRole('button', { name: '手入力で続ける' }));

    // 登録フォームへ遷移し、URLと種別が引き継がれている。
    await waitFor(() => expect(screen.getByText('案件を登録')).toBeInTheDocument());
    expect((screen.getByLabelText('案件URL') as HTMLInputElement).value)
      .toBe('https://type.jp/entry_history/entry_message_list/12345/');
    expect((screen.getByLabelText('種別') as HTMLSelectElement).value).toBe('career');
  });
});
