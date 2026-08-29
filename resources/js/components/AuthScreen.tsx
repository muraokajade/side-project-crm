import { useState } from 'react';
import { AuthUser, login as loginRequest, register as registerRequest } from '../api/auth';

type Mode = 'login' | 'register';

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

/**
 * 未ログイン時に表示するログイン / 新規登録画面。
 * 案件データは一切表示せず、認証に成功して初めてAppRootが一覧を描画する。
 */
export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldError = (field: string) => errors[field]?.[0];

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});
    setGeneralError('');

    try {
      const res = mode === 'login'
        ? await loginRequest(email, password)
        : await registerRequest({ name, email, password, password_confirmation: passwordConfirmation });

      if (res.status === 200 || res.status === 201) {
        const json = await res.json();
        onAuthenticated(json.data);
        return;
      }

      if (res.status === 422) {
        const json = await res.json();
        setErrors(json.errors ?? {});
        return;
      }

      if (res.status === 429) {
        setGeneralError('試行回数が多すぎます。しばらく待ってからもう一度お試しください。');
        return;
      }

      setGeneralError('通信に失敗しました。時間をおいて再度お試しください。');
    } catch {
      setGeneralError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">転職＋副業 管理</h1>
        <p className="text-sm text-slate-500 mb-5">
          {mode === 'login' ? 'ログインしてください。' : 'アカウントを作成します。'}
        </p>

        {generalError && <p className="text-red-600 text-sm mb-3">{generalError}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">お名前</label>
              <input id="auth-name" name="name" type="text" value={name} autoComplete="name"
                onChange={e => setName(e.target.value)} className={inputClass} />
              {fieldError('name') && <p className="text-red-600 text-xs mt-1">{fieldError('name')}</p>}
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
            <input id="auth-email" name="email" type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)} className={inputClass} />
            {fieldError('email') && <p className="text-red-600 text-xs mt-1">{fieldError('email')}</p>}
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">パスワード</label>
            <input id="auth-password" name="password" type="password" value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={e => setPassword(e.target.value)} className={inputClass} />
            {fieldError('password') && <p className="text-red-600 text-xs mt-1">{fieldError('password')}</p>}
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-password-confirmation" className="block text-sm font-medium text-slate-700 mb-1">
                パスワード（確認）
              </label>
              <input id="auth-password-confirmation" name="password_confirmation" type="password"
                value={passwordConfirmation} autoComplete="new-password"
                onChange={e => setPasswordConfirmation(e.target.value)} className={inputClass} />
            </div>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50">
            {mode === 'login' ? 'ログイン' : '登録する'}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          {mode === 'login' ? (
            <>
              アカウントをお持ちでない場合は{' '}
              <button type="button" onClick={() => switchMode('register')} className="text-slate-800 underline">
                新規登録
              </button>
            </>
          ) : (
            <>
              すでにアカウントをお持ちの場合は{' '}
              <button type="button" onClick={() => switchMode('login')} className="text-slate-800 underline">
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
