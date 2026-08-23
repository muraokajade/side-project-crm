/**
 * fetch呼び出しの共通ヘッダー付与だけを担う薄いラッパー。ステータス分岐は呼び出し側(AppRoot等)が行う。
 */
function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
}

export function listProjects(params: URLSearchParams): Promise<Response> {
  return apiFetch(`/api/projects?${params.toString()}`);
}

export function listTrash(params: URLSearchParams): Promise<Response> {
  return apiFetch(`/api/projects/trash?${params.toString()}`);
}

export function createProject(body: Record<string, unknown>): Promise<Response> {
  return apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) });
}

export function updateProject(id: number, body: Record<string, unknown>): Promise<Response> {
  return apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteProject(id: number): Promise<Response> {
  return apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
}

export function restoreProject(id: number): Promise<Response> {
  return apiFetch(`/api/projects/${id}/restore`, { method: 'POST' });
}

export function forceDeleteProject(id: number): Promise<Response> {
  return apiFetch(`/api/projects/${id}/force`, { method: 'DELETE' });
}

export function previewImportUrl(url: string, type: string): Promise<Response> {
  return apiFetch('/api/import/preview', { method: 'POST', body: JSON.stringify({ url, type }) });
}
