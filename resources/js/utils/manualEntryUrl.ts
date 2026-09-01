/**
 * 「ログインが必要で自動取得できないURL」の事前判定。
 * サーバー側の App\Services\UrlImport\ManualEntryUrlDetector と同じ規則を持ち、
 * 送信前に手入力導線を主ボタンとして出すために使う。
 *
 * 認証Cookieやログイン情報は一切扱わない。URLの形だけで判定する。
 */
const LOGIN_REQUIRED_PATH_FRAGMENTS: Record<string, string[]> = {
  'type.jp': ['entry_history', 'entry_message_list'],
};

export function isManualEntryUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (trimmed === '') return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // URLとして解釈できない場合はここでは判定しない(通常のバリデーションに任せる)。
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const fragments = LOGIN_REQUIRED_PATH_FRAGMENTS[host];
  if (!fragments) return false;

  return fragments.some(fragment => parsed.pathname.includes(fragment));
}

/**
 * 取得失敗時に画面へ出す文言。サーバーの生メッセージやレスポンス本文は使わず、
 * error_codeから利用者向けの説明へ変換する(詳細は開発用ログに留める方針)。
 */
export function fetchErrorMessage(errorCode: string | undefined, httpStatus: number): string {
  if (httpStatus === 401) {
    return 'セッションが切れました。ページを再読み込みしてログインし直してください。';
  }

  switch (errorCode) {
    case 'not_found':
      return 'ページが見つかりませんでした。URLをご確認ください。';
    case 'timeout':
    case 'connection_failed':
      return '取得先に接続できませんでした。時間をおいて再試行してください。';
    case 'rate_limited':
      return '取得先の制限により取得できませんでした。時間をおいて再試行してください。';
    case 'upstream_server_error':
      return '取得先でエラーが発生しました。時間をおいて再試行してください。';
    case 'unsupported_content_type':
      return 'このURLはHTMLページではないため取得できません。';
    case 'response_too_large':
      return 'ページのサイズが大きいため取得できませんでした。';
    case 'internal_error':
      return '取得中に問題が発生しました。時間をおいて再試行してください。';
    default:
      if (httpStatus === 422) {
        return 'このURLは取得できません。公開されている求人ページのURLかご確認ください。';
      }
      return '取得に失敗しました。もう一度お試しください。';
  }
}
