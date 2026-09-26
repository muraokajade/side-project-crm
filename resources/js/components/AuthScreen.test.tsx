import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthScreen from './AuthScreen';

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

describe('AuthScreen', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, { data: { id: 1, name: 'A', email: 'a@example.com' } })));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('サービス名としてJobHuntを表示する', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);
    expect(screen.getByRole('heading', { name: 'JobHunt' })).toBeInTheDocument();
  });

  it('初期表示はログインフォームで、確認用パスワード欄は出さない', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    // 何のサービスかを名前の直下で伝える。
    expect(screen.getByText('求人探しから応募管理まで、ひとつに。')).toBeInTheDocument();
    expect(screen.queryByText('ログインしてください。')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('パスワード（確認）')).not.toBeInTheDocument();
  });

  it('ログイン成功時に onAuthenticated へユーザーを渡す', async () => {
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({ id: 1, name: 'A', email: 'a@example.com' }));

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/login');
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      email: 'a@example.com',
      password: 'password123',
    });
  });

  it('新規登録へ切り替えると名前と確認用パスワードを入力できる', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '無料で始める' }));

    expect(screen.getByLabelText('お名前')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument();
  });

  it('登録は/api/auth/registerへ確認用パスワードを含めて送る', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(201, { data: { id: 2, name: 'B', email: 'b@example.com' } }))
    );
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.click(screen.getByRole('button', { name: '無料で始める' }));
    fireEvent.change(screen.getByLabelText('お名前'), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'b@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('パスワード（確認）'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/register');
    expect(JSON.parse(String((options as RequestInit).body))).toEqual({
      name: 'B',
      email: 'b@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    });
  });

  it('422のバリデーションエラーを項目ごとに表示する', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(422, {
        message: 'validation',
        errors: { email: ['メールアドレスまたはパスワードが正しくありません。'] },
      }))
    );
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() =>
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません。')).toBeInTheDocument()
    );
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('429の場合は試行回数超過を伝える', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(429, { message: 'Too Many Requests' })));
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() =>
      expect(screen.getByText('試行回数が多すぎます。しばらく待ってからもう一度お試しください。')).toBeInTheDocument()
    );
  });
  it('パスワード再設定は未実装のため、リンクではなく連絡先を案内する', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    expect(screen.getByText('パスワードを忘れた方は管理者へご連絡ください。')).toBeInTheDocument();
    // 遷移先の無いリンクは置かない(押しても何も起きない導線を作らない)。
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /パスワード/ })).not.toBeInTheDocument();
  });

  it('新規登録への導線は「はじめての方」「無料で始める」で示す', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    expect(screen.getByText('はじめての方')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '無料で始める' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '無料で始める' }));

    // 登録モードでは逆向きの導線になり、パスワードの案内は出さない。
    expect(screen.getByText('すでにアカウントをお持ちの方')).toBeInTheDocument();
    expect(screen.queryByText('パスワードを忘れた方は管理者へご連絡ください。')).not.toBeInTheDocument();
  });
});
