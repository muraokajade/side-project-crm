import { useState, useEffect, useMemo } from 'react';
import { Project, ProjectFormData } from './types/project';
import { STATUS_OPTIONS, MEDIA_OPTIONS, STATUS_COLORS } from './constants/projectOptions';
import ProjectModal from './ProjectModal';

function AppRoot() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mediaFilter, setMediaFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (statusFilter) params.set('status', statusFilter);
    if (mediaFilter) params.set('media', mediaFilter);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const json = await res.json();
    setProjects(json.data);
  };

  useEffect(() => { fetchProjects(); }, [keyword, statusFilter, mediaFilter]);

  const summary = useMemo(() => ({
    total: projects.length,
    interview: projects.filter(p => p.status === '面談予定').length,
    waiting: projects.filter(p => p.status === '返信待ち').length,
    contracted: projects.filter(p => p.status === '契約済み').length,
    completed: projects.filter(p => p.status === '完了').length,
  }), [projects]);

  const nextActions = useMemo(() =>
    projects
      .filter(p => p.next_action_date)
      .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || '')),
    [projects]
  );

  const today = new Date().toISOString().slice(0, 10);

  const handleCreate = async (data: ProjectFormData) => {
    const body: Record<string, unknown> = { ...data };
    if (data.reward) body.reward = Number(data.reward);
    else delete body.reward;
    if (data.applicant_count) body.applicant_count = Number(data.applicant_count);
    else delete body.applicant_count;
    if (data.recruitment_count) body.recruitment_count = Number(data.recruitment_count);
    else delete body.recruitment_count;
    Object.keys(body).forEach(k => { if (body[k] === '') delete body[k]; });

    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    setModalOpen(false);
    fetchProjects();
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editingProject) return;
    const body: Record<string, unknown> = { ...data };
    if (data.reward) body.reward = Number(data.reward);
    else body.reward = null;
    if (data.applicant_count) body.applicant_count = Number(data.applicant_count);
    else body.applicant_count = null;
    if (data.recruitment_count) body.recruitment_count = Number(data.recruitment_count);
    else body.recruitment_count = null;
    Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
    body.name = data.name;
    body.status = data.status;

    await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    setModalOpen(false);
    setEditingProject(null);
    fetchProjects();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この案件を削除しますか？')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
    fetchProjects();
  };

  const formatReward = (reward: number | null) => {
    if (reward === null) return '-';
    return `¥${reward.toLocaleString()}`;
  };

  const openCreate = () => { setEditingProject(null); setModalOpen(true); };
  const openEdit = (p: Project) => { setEditingProject(p); setModalOpen(true); };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">副業案件管理</h1>
          <button onClick={openCreate}
            className="px-4 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700">
            案件を登録
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: '案件総数', value: summary.total, color: 'border-t-slate-400' },
            { label: '面談予定', value: summary.interview, color: 'border-t-blue-400' },
            { label: '返信待ち', value: summary.waiting, color: 'border-t-amber-400' },
            { label: '契約済み', value: summary.contracted, color: 'border-t-violet-400' },
            { label: '完了', value: summary.completed, color: 'border-t-green-400' },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-lg shadow-sm p-4 border-t-4 ${card.color}`}>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="案件名・メモ検索" value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">すべてのステータス</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">すべての媒体</option>
              {MEDIA_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Next Actions */}
        {nextActions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">次に対応する案件</h2>
            <div className="space-y-2">
              {nextActions.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-md text-sm ${
                  p.next_action_date && p.next_action_date.slice(0, 10) <= today ? 'bg-red-50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    <span className="text-slate-500">{p.next_action}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
                      {p.status}
                    </span>
                    <span className="text-slate-500 text-xs">{p.next_action_date?.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">案件一覧 <span className="text-slate-400 font-normal">{projects.length}件</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">案件名</th>
                  <th className="text-left px-4 py-3 font-medium">媒体</th>
                  <th className="text-left px-4 py-3 font-medium">カテゴリ</th>
                  <th className="text-left px-4 py-3 font-medium">ステータス</th>
                  <th className="text-left px-4 py-3 font-medium">報酬</th>
                  <th className="text-left px-4 py-3 font-medium">次アクション</th>
                  <th className="text-left px-4 py-3 font-medium">予定日</th>
                  <th className="text-left px-4 py-3 font-medium">優先度</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.media || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.category || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatReward(p.reward)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.next_action || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.next_action_date?.slice(0, 10) || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.priority || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)}
                          className="text-slate-600 hover:text-slate-800 text-xs underline">編集</button>
                        <button onClick={() => handleDelete(p.id)}
                          className="text-red-500 hover:text-red-700 text-xs underline">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">案件がありません</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ProjectModal
        open={modalOpen}
        mode={editingProject ? 'edit' : 'create'}
        project={editingProject}
        onClose={() => { setModalOpen(false); setEditingProject(null); }}
        onSubmit={editingProject ? handleUpdate : handleCreate}
      />
    </div>
  );
}

export default AppRoot;
