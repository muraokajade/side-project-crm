import { useState, useEffect } from 'react';
import { Project, ProjectFormData } from './types/project';
import { STATUS_OPTIONS, MEDIA_OPTIONS, CATEGORY_OPTIONS, PRIORITY_OPTIONS } from './constants/projectOptions';

interface ProjectModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  project: Project | null;
  isSubmitting?: boolean;
  errors?: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

const emptyForm: ProjectFormData = {
  name: '', project_url: '', client_name: '', media: '', category: '',
  applied_date: '', status: '未応募', reward: '', working_hours: '',
  applicant_count: '', recruitment_count: '', application_text: '',
  next_action: '', next_action_date: '', memo: '', priority: '', is_favorite: false,
};

export default function ProjectModal({ open, mode, project, isSubmitting, errors, onClose, onSubmit }: ProjectModalProps) {
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [error, setError] = useState('');

  const fieldError = (name: string) => errors?.[name]?.[0];

  useEffect(() => {
    if (mode === 'edit' && project) {
      setForm({
        name: project.name,
        project_url: project.project_url || '',
        client_name: project.client_name || '',
        media: project.media || '',
        category: project.category || '',
        applied_date: project.applied_date ? project.applied_date.slice(0, 10) : '',
        status: project.status,
        reward: project.reward !== null ? String(project.reward) : '',
        working_hours: project.working_hours || '',
        applicant_count: project.applicant_count !== null ? String(project.applicant_count) : '',
        recruitment_count: project.recruitment_count !== null ? String(project.recruitment_count) : '',
        application_text: project.application_text || '',
        next_action: project.next_action || '',
        next_action_date: project.next_action_date ? project.next_action_date.slice(0, 10) : '',
        memo: project.memo || '',
        priority: project.priority || '',
        is_favorite: project.is_favorite,
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [mode, project, open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('案件名は必須です');
      return;
    }
    setError('');
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {mode === 'create' ? '案件を登録' : '案件を編集'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">案件名 <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('name') && <p className="text-red-600 text-xs mt-1">{fieldError('name')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {fieldError('status') && <p className="text-red-600 text-xs mt-1">{fieldError('status')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">媒体</label>
              <select name="media" value={form.media} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">選択なし</option>
                {MEDIA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {fieldError('media') && <p className="text-red-600 text-xs mt-1">{fieldError('media')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">カテゴリ</label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">選択なし</option>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {fieldError('category') && <p className="text-red-600 text-xs mt-1">{fieldError('category')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">優先度</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">選択なし</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {fieldError('priority') && <p className="text-red-600 text-xs mt-1">{fieldError('priority')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">報酬（円）</label>
              <input type="number" name="reward" value={form.reward} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('reward') && <p className="text-red-600 text-xs mt-1">{fieldError('reward')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">稼働時間</label>
              <input type="text" name="working_hours" value={form.working_hours} onChange={handleChange} placeholder="例: 週10時間"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('working_hours') && <p className="text-red-600 text-xs mt-1">{fieldError('working_hours')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">クライアント名</label>
              <input type="text" name="client_name" value={form.client_name} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('client_name') && <p className="text-red-600 text-xs mt-1">{fieldError('client_name')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">案件URL</label>
              <input type="url" name="project_url" value={form.project_url} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('project_url') && <p className="text-red-600 text-xs mt-1">{fieldError('project_url')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">応募日</label>
              <input type="date" name="applied_date" value={form.applied_date} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('applied_date') && <p className="text-red-600 text-xs mt-1">{fieldError('applied_date')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">応募人数</label>
              <input type="number" name="applicant_count" value={form.applicant_count} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('applicant_count') && <p className="text-red-600 text-xs mt-1">{fieldError('applicant_count')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">募集人数</label>
              <input type="number" name="recruitment_count" value={form.recruitment_count} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('recruitment_count') && <p className="text-red-600 text-xs mt-1">{fieldError('recruitment_count')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">次アクション</label>
              <input type="text" name="next_action" value={form.next_action} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('next_action') && <p className="text-red-600 text-xs mt-1">{fieldError('next_action')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">次アクション予定日</label>
              <input type="date" name="next_action_date" value={form.next_action_date} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('next_action_date') && <p className="text-red-600 text-xs mt-1">{fieldError('next_action_date')}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">応募文</label>
              <textarea name="application_text" value={form.application_text} onChange={handleChange} rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('application_text') && <p className="text-red-600 text-xs mt-1">{fieldError('application_text')}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">メモ</label>
              <textarea name="memo" value={form.memo} onChange={handleChange} rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('memo') && <p className="text-red-600 text-xs mt-1">{fieldError('memo')}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="is_favorite" checked={form.is_favorite} onChange={handleChange}
                  className="rounded border-slate-300" />
                お気に入り
              </label>
              {fieldError('is_favorite') && <p className="text-red-600 text-xs mt-1">{fieldError('is_favorite')}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (mode === 'create' ? '登録中...' : '更新中...') : (mode === 'create' ? '登録' : '更新')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
