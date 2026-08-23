import { useRef, useState } from 'react';
import { ProjectFormData, ProjectPreviewData, ProjectType } from '../types/project';
import { previewImportUrl } from '../api/projects';
import { previewToFormData } from '../utils/toFormData';
import { ProjectModalNotice } from '../ProjectModal';

interface UrlImportModalProps {
  open: boolean;
  onClose: () => void;
  onPreviewReady: (formData: ProjectFormData, notice: ProjectModalNotice) => void;
}

export default function UrlImportModal({ open, onClose, onPreviewReady }: UrlImportModalProps) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ProjectType>('side_job');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // isLoadingRefは、Reactのstate反映を待たずに同期的に多重送信(連続クリック)を防ぐためのガード。
  const isLoadingRef = useRef(false);

  if (!open) return null;

  const handleClose = () => {
    setUrl('');
    setType('side_job');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingRef.current) return;
    if (!url.trim()) {
      setError('URLを入力してください。');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await previewImportUrl(url.trim(), type);
      const json = await res.json();

      if (res.status === 200) {
        const data = json.data as ProjectPreviewData;
        onPreviewReady(previewToFormData(data), {
          fetchStatus: data.fetch_status,
          warnings: data.warnings,
        });
        setUrl('');
        setType('side_job');
      } else if (res.status === 422 && json.errors) {
        const firstError = Object.values(json.errors as Record<string, string[]>)[0]?.[0];
        setError(firstError || json.message || '入力内容を確認してください。');
      } else {
        // SSRF安全性エラー(422/error_code)、取得失敗(502)等。内部情報は含まれないmessageをそのまま表示する。
        setError(json.message || '取得に失敗しました。もう一度お試しください。');
      }
    } catch {
      setError('通信に失敗しました。ネットワーク状態を確認してください。');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">URLから登録</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">案件ページのURL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">種別</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ProjectType)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="side_job">副業</option>
              <option value="career">転職</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">
            取得できなかった項目は、次の画面で手入力できます。
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
              キャンセル
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? '取得中...' : '取得する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
