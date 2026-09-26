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

  /*
    狭幅だけ16px(text-base)。iOS Safariは16px未満の入力欄でフォーカスすると
    画面を自動拡大し、`maximum-scale`未指定のため戻らない。
    ログインは最初に触る画面なので、ここで拡大されると第一印象を損なう。
    高さも狭幅では44pxを確保する。
  */
  const inputClass =
    'min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:ring-2 focus:ring-slate-400 focus:outline-none sm:min-h-9 sm:text-sm';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[26rem] rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/*
          初見の人が最初に見る画面なので、名前の次に「何のサービスか」を置く。
          モードごとの案内文(「ログインしてください。」等)は、
          入力欄を見れば分かることを繰り返しているだけなので外した。
        */}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">JobHunt</h1>
        <p className="mt-1.5 mb-7 text-sm text-slate-500">求人探しから応募管理まで、ひとつに。</p>

        {generalError && <p className="text-red-600 text-sm mb-3">{generalError}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
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
            className="min-h-11 w-full rounded-lg bg-slate-800 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50">
            {mode === 'login' ? 'ログイン' : '登録する'}
          </button>

          {/*
            パスワード再設定は、この時点でAPIにもルートにも実装が無い
            (routes/api.php・AuthControllerに該当なし)。
            押しても何も起きないリンクを置くと初見の人を迷わせるだけなので、
            リンクにはせず連絡先だけを案内する。
            メール基盤とリセット機能ができたら、ここをリンクに差し替える。
          */}
          {mode === 'login' && (
            <p className="text-center text-xs text-slate-400">
              パスワードを忘れた方は管理者へご連絡ください。
            </p>
          )}
        </form>

        {/*
          切替は「説明文の中の下線リンク」ではなく、線で区切った副ボタンにする。
          主ボタン(ログイン)と強さがはっきり分かれ、押せる場所も迷わない。
        */}
        <div className="mt-7 border-t border-slate-200 pt-5 text-center">
          {mode === 'login' ? (
            <>
              <p className="text-xs text-slate-500">はじめての方</p>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                無料で始める
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">すでにアカウントをお持ちの方</p>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                ログイン
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
