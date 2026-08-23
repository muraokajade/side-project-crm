const DEFAULT_API_URL = 'http://localhost:8000';

const REQUEST_TIMEOUT_MS = 10000;

/**
 * `EXPO_PUBLIC_`接頭辞の環境変数はExpoが自動でMetroバンドルに埋め込む(追加設定不要)。
 * `.env`(git管理外)でlocalhost以外のLAN IP等へ切り替えられる。
 */
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
}

export class NetworkError extends Error {}

/**
 * fetchの共通ラッパー。タイムアウト・JSONヘッダー付与のみを担う。
 * ステータス判定(成功/HTTPエラー/通信エラーの区別)は呼び出し側(src/api/projects.ts)が行う。
 */
export async function apiGet(path: string, params?: URLSearchParams): Promise<Response> {
  const query = params && params.toString() ? `?${params.toString()}` : '';
  const url = `${getApiBaseUrl()}${path}${query}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    throw new NetworkError(error instanceof Error ? error.message : '通信に失敗しました');
  } finally {
    clearTimeout(timeout);
  }
}
