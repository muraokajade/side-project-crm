import { apiGet, NetworkError } from './client';
import { Project, ProjectsResult, ProjectType } from './types';

interface FetchProjectsParams {
  type: ProjectType;
  search?: string;
}

/**
 * GET /api/projects?type=...&keyword=...
 * Laravel側 apps/quantitative... ではなく side-project-crm の
 * ProjectController::index() と同じ`type`/`keyword`パラメータ名を使う。
 */
export async function fetchProjects({ type, search }: FetchProjectsParams): Promise<ProjectsResult> {
  const params = new URLSearchParams({ type });
  if (search) params.set('keyword', search);

  try {
    const res = await apiGet('/api/projects', params);

    if (!res.ok) {
      return { kind: 'http_error', status: res.status };
    }

    const json = (await res.json()) as { data?: Project[] };
    return { kind: 'success', data: json.data ?? [] };
  } catch (error) {
    if (error instanceof NetworkError) {
      return { kind: 'network_error', message: error.message };
    }
    return { kind: 'network_error', message: '不明な通信エラーが発生しました' };
  }
}
