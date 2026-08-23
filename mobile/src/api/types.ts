export type ProjectType = 'career' | 'side_job';

/**
 * Laravel側 app/Http/Resources/ProjectResource.php の返却フィールドと一致させる。
 * (side-project-crm/resources/js/types/project.ts のProject型と同一の契約)
 */
export interface Project {
  id: number;
  type: ProjectType;
  name: string;
  project_url: string | null;
  client_name: string | null;
  media: string | null;
  category: string | null;
  description: string | null;
  applied_date: string | null;
  deadline: string | null;
  status: string;
  reward: number | null;
  working_hours: string | null;
  applicant_count: number | null;
  recruitment_count: number | null;
  application_text: string | null;
  next_action: string | null;
  next_action_date: string | null;
  memo: string | null;
  priority: string | null;
  is_favorite: boolean;
  job_type: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  contract_type: string | null;
  delivery_date: string | null;
  fetched_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/projects の呼び出し結果。
 * HTTPエラー(4xx/5xx)・通信エラー(fetch自体の失敗)・成功(0件含む)を区別して呼び出し側へ返す。
 */
export type ProjectsResult =
  | { kind: 'success'; data: Project[] }
  | { kind: 'http_error'; status: number }
  | { kind: 'network_error'; message: string };
