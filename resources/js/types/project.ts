export interface Project {
  id: number;
  name: string;
  project_url: string | null;
  client_name: string | null;
  media: string | null;
  category: string | null;
  applied_date: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface ProjectFormData {
  name: string;
  project_url: string;
  client_name: string;
  media: string;
  category: string;
  applied_date: string;
  status: string;
  reward: string;
  working_hours: string;
  applicant_count: string;
  recruitment_count: string;
  application_text: string;
  next_action: string;
  next_action_date: string;
  memo: string;
  priority: string;
  is_favorite: boolean;
}
