export type ProjectType = 'career' | 'side_job';

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
  reward_text: string | null;
  working_hours: string | null;
  applicant_count: number | null;
  recruitment_count: number | null;
  application_text: string | null;
  next_action: string | null;
  next_action_date: string | null;
  memo: string | null;
  priority: string | null;
  is_favorite: boolean;
  // career専用項目
  job_type: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  // side_job専用項目
  contract_type: string | null;
  delivery_date: string | null;
  fetched_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiValidationErrors {
  message: string;
  errors: Record<string, string[]>;
}

/**
 * error_code形式のエラー(URL取込のSSRF/取得失敗等)。
 * ApiValidationErrorsとは異なり`errors`(フィールド別)を持たず、`message`をそのまま利用者へ表示する。
 */
export interface ApiErrorCodeResponse {
  message: string;
  error_code: string;
}

export interface ProjectFormData {
  type: ProjectType;
  name: string;
  project_url: string;
  client_name: string;
  media: string;
  category: string;
  description: string;
  applied_date: string;
  deadline: string;
  status: string;
  reward: string;
  reward_text: string;
  working_hours: string;
  applicant_count: string;
  recruitment_count: string;
  application_text: string;
  next_action: string;
  next_action_date: string;
  memo: string;
  is_favorite: boolean;
  job_type: string;
  location: string;
  remote_type: string;
  employment_type: string;
  contract_type: string;
  delivery_date: string;
}

/**
 * POST /api/import/previewのレスポンス(`data`)。projectsテーブルには未保存の確認用データ。
 */
export interface ProjectPreviewData {
  project_url: string;
  type: ProjectType;
  name: string | null;
  description: string | null;
  client_name: string | null;
  media: string | null;
  category: string | null;
  reward: number | null;
  reward_text: string | null;
  working_hours: string | null;
  applicant_count: number | null;
  recruitment_count: number | null;
  deadline: string | null;
  job_type: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  contract_type: string | null;
  delivery_date: string | null;
  fetched_at: string;
  fetch_status: 'success' | 'partial';
  warnings: string[];
}
