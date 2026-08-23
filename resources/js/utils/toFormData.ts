import { Project, ProjectFormData, ProjectPreviewData, ProjectType } from '../types/project';

export const emptyFormData = (type: ProjectType = 'side_job'): ProjectFormData => ({
  type,
  name: '',
  project_url: '',
  client_name: '',
  media: '',
  category: '',
  description: '',
  applied_date: '',
  deadline: '',
  status: '気になる',
  reward: '',
  working_hours: '',
  applicant_count: '',
  recruitment_count: '',
  application_text: '',
  next_action: '',
  next_action_date: '',
  memo: '',
  is_favorite: false,
  job_type: '',
  location: '',
  remote_type: '',
  employment_type: '',
  contract_type: '',
  delivery_date: '',
});

/**
 * 編集フォームの初期値。日付/日時はinput[type=date]用に先頭10文字(YYYY-MM-DD)へ切り詰める。
 */
export function projectToFormData(project: Project): ProjectFormData {
  return {
    type: project.type,
    name: project.name,
    project_url: project.project_url || '',
    client_name: project.client_name || '',
    media: project.media || '',
    category: project.category || '',
    description: project.description || '',
    applied_date: project.applied_date ? project.applied_date.slice(0, 10) : '',
    deadline: project.deadline ? project.deadline.slice(0, 10) : '',
    status: project.status,
    reward: project.reward !== null ? String(project.reward) : '',
    working_hours: project.working_hours || '',
    applicant_count: project.applicant_count !== null ? String(project.applicant_count) : '',
    recruitment_count: project.recruitment_count !== null ? String(project.recruitment_count) : '',
    application_text: project.application_text || '',
    next_action: project.next_action || '',
    next_action_date: project.next_action_date ? project.next_action_date.slice(0, 10) : '',
    memo: project.memo || '',
    is_favorite: project.is_favorite,
    job_type: project.job_type || '',
    location: project.location || '',
    remote_type: project.remote_type || '',
    employment_type: project.employment_type || '',
    contract_type: project.contract_type || '',
    delivery_date: project.delivery_date ? project.delivery_date.slice(0, 10) : '',
  };
}

/**
 * URL取込プレビュー結果(POST /api/import/preview)を、登録フォームの初期値へ変換する。
 * プレビューはprojectsテーブルへ未保存のため、取得できなかった項目はempty(手入力可能)にする。
 */
export function previewToFormData(preview: ProjectPreviewData): ProjectFormData {
  return {
    ...emptyFormData(preview.type),
    project_url: preview.project_url,
    name: preview.name || '',
    description: preview.description || '',
    client_name: preview.client_name || '',
    media: preview.media || '',
    category: preview.category || '',
    reward: preview.reward !== null ? String(preview.reward) : '',
    working_hours: preview.working_hours || '',
    applicant_count: preview.applicant_count !== null ? String(preview.applicant_count) : '',
    recruitment_count: preview.recruitment_count !== null ? String(preview.recruitment_count) : '',
    deadline: preview.deadline ? preview.deadline.slice(0, 10) : '',
    job_type: preview.job_type || '',
    location: preview.location || '',
    remote_type: preview.remote_type || '',
    employment_type: preview.employment_type || '',
    contract_type: preview.contract_type || '',
    delivery_date: preview.delivery_date ? preview.delivery_date.slice(0, 10) : '',
  };
}
