import { useState, useEffect } from 'react';
import { Project, ProjectFormData, ProjectType } from './types/project';
import { MEDIA_OPTIONS, CATEGORY_OPTIONS, statusOptionsForType } from './constants/projectOptions';
import { emptyFormData, projectToFormData } from './utils/toFormData';

export interface ProjectModalNotice {
  fetchStatus: 'success' | 'partial';
  warnings: string[];
}

interface ProjectModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  project: Project | null;
  initialData?: ProjectFormData;
  notice?: ProjectModalNotice | null;
  isSubmitting?: boolean;
  errors?: Record<string, string[]>;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

export default function ProjectModal({
  open,
  mode,
  project,
  initialData,
  notice,
  isSubmitting,
  errors,
  onClose,
  onSubmit,
}: ProjectModalProps) {
  const [form, setForm] = useState<ProjectFormData>(emptyFormData());
  const [error, setError] = useState('');

  const fieldError = (name: string) => errors?.[name]?.[0];

  useEffect(() => {
    if (mode === 'edit' && project) {
      setForm(projectToFormData(project));
    } else if (initialData) {
      setForm(initialData);
    } else {
      setForm(emptyFormData());
    }
    setError('');
  }, [mode, project, initialData, open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value as ProjectType;
    setForm(prev => {
      const nextStatusOptions = statusOptionsForType(nextType);
      const status = nextStatusOptions.includes(prev.status) ? prev.status : nextStatusOptions[0];
      return { ...prev, type: nextType, status };
    });
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

  const statusOptions = statusOptionsForType(form.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {mode === 'create' ? '案件を登録' : '案件を編集'}
        </h2>

        {notice && (
          <div className={`mb-4 rounded-md p-3 text-sm ${notice.fetchStatus === 'partial' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
            <p className="font-medium">
              {notice.fetchStatus === 'partial' ? '一部の項目を自動取得できませんでした。内容を確認し、必要な項目を入力してください。' : 'URLからの取得に成功しました。内容を確認してください。'}
            </p>
            {notice.warnings.length > 0 && (
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {notice.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

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
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">種別</label>
              <select id="type" name="type" value={form.type} onChange={handleTypeChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="career">転職</option>
                <option value="side_job">副業</option>
              </select>
              {fieldError('type') && <p className="text-red-600 text-xs mt-1">{fieldError('type')}</p>}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">クライアント/会社名</label>
              <input type="text" name="client_name" value={form.client_name} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('client_name') && <p className="text-red-600 text-xs mt-1">{fieldError('client_name')}</p>}
            </div>
            <div>
              <label htmlFor="project_url" className="block text-sm font-medium text-slate-700 mb-1">案件URL</label>
              <input id="project_url" type="url" name="project_url" value={form.project_url} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('project_url') && <p className="text-red-600 text-xs mt-1">{fieldError('project_url')}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">募集内容（抜粋）</label>
              <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('description') && <p className="text-red-600 text-xs mt-1">{fieldError('description')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">応募日</label>
              <input type="date" name="applied_date" value={form.applied_date} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('applied_date') && <p className="text-red-600 text-xs mt-1">{fieldError('applied_date')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">応募期限</label>
              <input type="date" name="deadline" value={form.deadline} onChange={handleChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('deadline') && <p className="text-red-600 text-xs mt-1">{fieldError('deadline')}</p>}
            </div>
            <div>
              <label htmlFor="reward_text" className="block text-sm font-medium text-slate-700 mb-1">報酬</label>
              <input id="reward_text" type="text" name="reward_text" value={form.reward_text} onChange={handleChange}
                placeholder="例: 80,000円 / 時給2,000円 / 応相談"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('reward_text') && <p className="text-red-600 text-xs mt-1">{fieldError('reward_text')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">稼働時間</label>
              <input type="text" name="working_hours" value={form.working_hours} onChange={handleChange} placeholder="例: 週10時間"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              {fieldError('working_hours') && <p className="text-red-600 text-xs mt-1">{fieldError('working_hours')}</p>}
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

            {form.type === 'career' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <p className="md:col-span-2 text-xs font-medium text-slate-500">転職専用項目</p>
                <div>
                  <label htmlFor="job_type" className="block text-sm font-medium text-slate-700 mb-1">職種</label>
                  <input id="job_type" type="text" name="job_type" value={form.job_type} onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('job_type') && <p className="text-red-600 text-xs mt-1">{fieldError('job_type')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">勤務地</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('location') && <p className="text-red-600 text-xs mt-1">{fieldError('location')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">リモート区分</label>
                  <input type="text" name="remote_type" value={form.remote_type} onChange={handleChange} placeholder="例: フルリモート"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('remote_type') && <p className="text-red-600 text-xs mt-1">{fieldError('remote_type')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
                  <input type="text" name="employment_type" value={form.employment_type} onChange={handleChange} placeholder="例: 正社員"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('employment_type') && <p className="text-red-600 text-xs mt-1">{fieldError('employment_type')}</p>}
                </div>
              </div>
            )}

            {form.type === 'side_job' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <p className="md:col-span-2 text-xs font-medium text-slate-500">副業専用項目</p>
                <div>
                  <label htmlFor="contract_type" className="block text-sm font-medium text-slate-700 mb-1">契約形態</label>
                  <input id="contract_type" type="text" name="contract_type" value={form.contract_type} onChange={handleChange} placeholder="例: 業務委託"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('contract_type') && <p className="text-red-600 text-xs mt-1">{fieldError('contract_type')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">納品日</label>
                  <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleChange}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  {fieldError('delivery_date') && <p className="text-red-600 text-xs mt-1">{fieldError('delivery_date')}</p>}
                </div>
              </div>
            )}

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
