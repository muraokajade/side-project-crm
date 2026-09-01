import { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProjectFormData, ApiValidationErrors, ProjectType } from './types/project';
import { computeStatusSummary } from './utils/projectSummary';
import { listProjects, createProject, updateProject, deleteProject } from './api/projects';
import ProjectModal, { ProjectModalNotice } from './ProjectModal';
import ProjectCard from './components/ProjectCard';
import UrlImportModal from './components/UrlImportModal';
import TrashView from './components/TrashView';
import AuthScreen from './components/AuthScreen';
import { AuthUser, fetchMe, logout as logoutRequest } from './api/auth';

type TypeFilter = 'all' | ProjectType;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'career', label: '転職' },
  { value: 'side_job', label: '副業' },
];

const SEARCH_DEBOUNCE_MS = 400;

function AppRoot() {
  // 認証状態が確定するまでは案件データを一切取得・描画しない。
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<'list' | 'trash'>('list');
  const [projects, setProjects] = useState<Project[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [createInitialData, setCreateInitialData] = useState<ProjectFormData | undefined>(undefined);
  const [createNotice, setCreateNotice] = useState<ProjectModalNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // isSubmitting/deletingId (state) はボタンのdisabled表示用。
  // 以下のrefは、Reactのstate反映(再レンダリング)を待たずに二重送信を同期的に拒否するためのガード。
  const isSubmittingRef = useRef(false);
  const deletingIdsRef = useRef<Set<number>>(new Set());

  // 初回マウント時にログイン状態を確認する。
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchMe();
        setAuthUser(res.status === 200 ? (await res.json()).data : null);
      } catch {
        setAuthUser(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const fetchProjects = async () => {
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (appliedSearch) params.set('keyword', appliedSearch);
    const res = await listProjects(params);

    // セッション切れ(ログアウト・期限切れ)の場合はログイン画面へ戻す。
    if (res.status === 401) {
      setAuthUser(null);
      setProjects([]);
      return;
    }

    const json = await res.json();
    setProjects(json.data ?? []);
  };

  useEffect(() => {
    if (!authUser) return;
    fetchProjects();
  }, [authUser, typeFilter, appliedSearch]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      // 前ユーザーのデータが画面に残らないよう、状態を明示的に空へ戻す。
      setAuthUser(null);
      setProjects([]);
      setView('list');
      setSearchInput('');
      setAppliedSearch('');
    }
  };

  // 入力のたびに毎回APIへ問い合わせない(過剰通信防止)ためのdebounce。
  useEffect(() => {
    const handle = setTimeout(() => setAppliedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const clearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
  };

  const summary = useMemo(() => computeStatusSummary(projects), [projects]);

  // 0件の理由が「まだ登録していない」のか「絞り込みの結果」なのかで空状態を出し分ける。
  const hasActiveFilter = typeFilter !== 'all' || appliedSearch !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setSearchInput('');
    setAppliedSearch('');
  };

  const buildSubmitBody = (data: ProjectFormData, isCreate: boolean) => {
    const body: Record<string, unknown> = { ...data };
    const numericFields: (keyof ProjectFormData)[] = ['reward', 'applicant_count', 'recruitment_count'];
    numericFields.forEach(key => {
      const value = data[key] as string;
      if (value) body[key] = Number(value);
      else if (isCreate) delete body[key];
      else body[key] = null;
    });
    Object.keys(body).forEach(k => {
      if (body[k] === '') body[k] = isCreate ? undefined : null;
    });
    Object.keys(body).forEach(k => { if (body[k] === undefined) delete body[k]; });
    return body;
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
    setModalErrors(undefined);
    setCreateInitialData(undefined);
    setCreateNotice(null);
  };

  const handleCreate = async (data: ProjectFormData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const body = buildSubmitBody(data, true);

    setIsSubmitting(true);
    setModalErrors(undefined);
    try {
      const res = await createProject(body);
      if (res.status === 201) {
        closeModal();
        setView('list');
        await fetchProjects();
      } else if (res.status === 422) {
        const json: ApiValidationErrors = await res.json();
        setModalErrors(json.errors);
      } else {
        window.alert('保存に失敗しました。もう一度お試しください。');
      }
    } catch {
      window.alert('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editingProject) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const body = buildSubmitBody(data, false);
    body.name = data.name;
    body.status = data.status;
    body.type = data.type;

    setIsSubmitting(true);
    setModalErrors(undefined);
    try {
      const res = await updateProject(editingProject.id, body);
      if (res.status === 200) {
        closeModal();
        await fetchProjects();
      } else if (res.status === 422) {
        const json: ApiValidationErrors = await res.json();
        setModalErrors(json.errors);
      } else {
        window.alert('保存に失敗しました。もう一度お試しください。');
      }
    } catch {
      window.alert('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    // window.confirm()自体が同期的にブロックするため単独でも同一idの多重実行は起きないが、
    // confirm()をモックする(テスト等)環境も想定し、refで同期的に二重削除を防ぐ。
    if (deletingIdsRef.current.has(id)) return;
    if (!window.confirm('この案件を削除しますか？')) return;
    deletingIdsRef.current.add(id);
    setDeletingId(id);
    try {
      const res = await deleteProject(id);
      if (res.status === 204) {
        await fetchProjects();
      } else {
        window.alert('削除に失敗しました。もう一度お試しください。');
      }
    } catch {
      window.alert('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      deletingIdsRef.current.delete(id);
      setDeletingId(null);
    }
  };

  const openCreate = () => {
    setEditingProject(null);
    setCreateInitialData(undefined);
    setCreateNotice(null);
    setModalErrors(undefined);
    setView('list');
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setCreateInitialData(undefined);
    setCreateNotice(null);
    setModalErrors(undefined);
    setModalOpen(true);
  };

  const handlePreviewReady = (formData: ProjectFormData, notice: ProjectModalNotice) => {
    setImportOpen(false);
    setEditingProject(null);
    setCreateInitialData(formData);
    setCreateNotice(notice);
    setModalErrors(undefined);
    setView('list');
    setModalOpen(true);
  };

  // ログイン状態の確認が終わるまでは何も出さない(未ログイン時に一瞬でも一覧を見せないため)。
  if (!authChecked) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!authUser) {
    return <AuthScreen onAuthenticated={setAuthUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold text-slate-800">転職＋副業 管理</h1>

          <div className="flex flex-col items-start gap-2 md:items-end">
          {/* 主操作(登録)だけをボタンとして目立たせる。 */}
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)}
              className="px-3 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700">
              URLから登録
            </button>
            <button onClick={openCreate}
              className="px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">
              手入力
            </button>
          </div>

          {/* ゴミ箱・ログアウトは誤操作しにくいよう、主操作と分けた控えめな並びにまとめる。 */}
          <div className="flex items-center gap-3 text-xs text-slate-500 max-w-full">
            <span className="truncate">{authUser.email}</span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <button onClick={() => setView('trash')} className="underline hover:text-slate-700 shrink-0">
              ゴミ箱
            </button>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <button onClick={handleLogout} className="underline hover:text-slate-700 shrink-0">
              ログアウト
            </button>
          </div>
          </div>
        </div>
      </header>

      {view === 'trash' ? (
        <TrashView onClose={() => setView('list')} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: '総数', value: summary.total, color: 'border-t-slate-400' },
              { label: '対応中', value: summary.open, color: 'border-t-blue-400' },
              { label: '終了', value: summary.closed, color: 'border-t-gray-400' },
              { label: 'お気に入り', value: summary.favorite, color: 'border-t-amber-400' },
            ].map(card => (
              <div key={card.label} className={`bg-white rounded-lg shadow-sm p-4 border-t-4 ${card.color}`}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Type tabs & Search */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex gap-2">
              {TYPE_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setTypeFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    typeFilter === tab.value
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="案件名・クライアント・概要・メモを検索"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full border border-slate-300 rounded-md pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="検索をクリア"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 px-1">
              案件一覧 <span className="text-slate-400 font-normal">{projects.length}件</span>
            </h2>
            {projects.length === 0 && (
              hasActiveFilter ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-sm text-slate-600">条件に一致する案件がありません。</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    条件をクリア
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">まだ案件がありません</p>
                  <p className="mt-1 text-sm text-slate-500">
                    求人ページのURLを貼り付けると、案件名や報酬を取り込んで登録できます。
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setImportOpen(true)}
                      className="px-4 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700"
                    >
                      URLから登録
                    </button>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      手入力で登録
                    </button>
                  </div>
                </div>
              )
            )}
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                variant="active"
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deletingId === p.id}
              />
            ))}
          </div>
        </main>
      )}

      <ProjectModal
        open={modalOpen}
        mode={editingProject ? 'edit' : 'create'}
        project={editingProject}
        initialData={editingProject ? undefined : createInitialData}
        notice={editingProject ? null : createNotice}
        isSubmitting={isSubmitting}
        errors={modalErrors}
        onClose={closeModal}
        onSubmit={editingProject ? handleUpdate : handleCreate}
      />

      <UrlImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPreviewReady={handlePreviewReady}
      />
    </div>
  );
}

export default AppRoot;
