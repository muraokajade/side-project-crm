import { useEffect, useRef, useState } from 'react';
import { Project } from '../types/project';
import { listTrash, restoreProject, forceDeleteProject } from '../api/projects';
import ProjectCard from './ProjectCard';

interface TrashViewProps {
  onClose: () => void;
}

export default function TrashView({ onClose }: TrashViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [forceDeletingId, setForceDeletingId] = useState<number | null>(null);
  const restoringIdsRef = useRef<Set<number>>(new Set());
  const forceDeletingIdsRef = useRef<Set<number>>(new Set());

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await listTrash(new URLSearchParams());
      const json = await res.json();
      setProjects(json.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (id: number) => {
    if (restoringIdsRef.current.has(id)) return;
    restoringIdsRef.current.add(id);
    setRestoringId(id);
    try {
      const res = await restoreProject(id);
      if (res.status === 200) {
        await fetchTrash();
      } else if (res.status === 409 || res.status === 404) {
        const json = await res.json();
        window.alert(json.message || '復元できませんでした。');
      } else {
        window.alert('復元に失敗しました。もう一度お試しください。');
      }
    } catch {
      window.alert('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      restoringIdsRef.current.delete(id);
      setRestoringId(null);
    }
  };

  const handleForceDelete = async (id: number) => {
    if (forceDeletingIdsRef.current.has(id)) return;
    if (!window.confirm('この案件を完全に削除します。この操作は取り消せません。よろしいですか？')) return;
    forceDeletingIdsRef.current.add(id);
    setForceDeletingId(id);
    try {
      const res = await forceDeleteProject(id);
      if (res.status === 204) {
        await fetchTrash();
      } else if (res.status === 409 || res.status === 404) {
        const json = await res.json();
        window.alert(json.message || '完全削除できませんでした。');
      } else {
        window.alert('完全削除に失敗しました。もう一度お試しください。');
      }
    } catch {
      window.alert('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      forceDeletingIdsRef.current.delete(id);
      setForceDeletingId(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          ゴミ箱 <span className="text-slate-400 font-normal">{projects.length}件</span>
        </h2>
        <button onClick={onClose}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
          一覧へ戻る
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-8">読み込み中...</p>}

      {!loading && projects.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">ゴミ箱は空です</p>
      )}

      {!loading && projects.length > 0 && (
        <div className="space-y-2">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              variant="trash"
              onRestore={handleRestore}
              onForceDelete={handleForceDelete}
              restoring={restoringId === p.id}
              forceDeleting={forceDeletingId === p.id}
            />
          ))}
        </div>
      )}
    </main>
  );
}
