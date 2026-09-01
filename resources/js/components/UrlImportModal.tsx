import { useRef, useState } from 'react';
import { ProjectFormData, ProjectPreviewData, ProjectType } from '../types/project';
import { previewImportUrl } from '../api/projects';
import { previewToFormData } from '../utils/toFormData';
import { isManualEntryUrl, fetchErrorMessage } from '../utils/manualEntryUrl';
import { ProjectModalNotice } from '../ProjectModal';

interface UrlImportModalProps {
  open: boolean;
  onClose: () => void;
  onPreviewReady: (formData: ProjectFormData, notice: ProjectModalNotice) => void;
  /** URLと種別を保持したまま手入力登録へ進む。 */
  onManualEntry: (url: string, type: ProjectType) => void;
}

/**
 * 取得できなかったときの状態。
 * - manual: ログインが必要で自動取得できない。手入力へ誘導する。
 * - error : それ以外の失敗。再試行と手入力の両方を選べるようにする。
 */
type Outcome =
  | { kind: 'manual'; message: string }
  | { kind: 'error'; message: string }
  | null;

const MANUAL_ENTRY_GUIDANCE =
  'このURLはログインが必要なページのため、求人情報を自動取得できません。'
  + 'URLを保持したまま、会社名・求人名・年収などを手入力して登録できます。';

export default function UrlImportModal({ open, onClose, onPreviewReady, onManualEntry }: UrlImportModalProps) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ProjectType>('side_job');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(null);
  // isLoadingRefは、Reactのstate反映を待たずに同期的に多重送信(連続クリック)を防ぐためのガード。
  const isLoadingRef = useRef(false);

  if (!open) return null;

  // URLの形だけで「ログイン必須」と分かる場合は、送信前から手入力を主導線にする。
  const preDetectedManual = isManualEntryUrl(url);
  const showManualGuidance = outcome?.kind === 'manual' || preDetectedManual;

  const reset = () => {
    setUrl('');
    setType('side_job');
    setValidationError('');
    setOutcome(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // URLを直したら、前回の失敗表示は消す(入力済みURLは保持する)。
    setOutcome(null);
    setValidationError('');
  };

  /** URLと種別を保持したまま手入力登録へ。取得は行わない。 */
  const handleManualEntry = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('URLを入力してください。');
      return;
    }
    onManualEntry(trimmed, type);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingRef.current) return;
    if (!url.trim()) {
      setValidationError('URLを入力してください。');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setValidationError('');
    setOutcome(null);

    try {
      const res = await previewImportUrl(url.trim(), type);
      const json = await res.json().catch(() => ({}));

      if (res.status === 200) {
        const data = json.data as ProjectPreviewData;
        onPreviewReady(previewToFormData(data), {
          fetchStatus: data.fetch_status,
          warnings: data.warnings,
        });
        reset();
        return;
      }

      // ログインが必要で取得できない場合は、失敗ではなく手入力誘導として扱う。
      if (json.requires_manual_entry) {
        setOutcome({ kind: 'manual', message: MANUAL_ENTRY_GUIDANCE });
        return;
      }

      if (res.status === 422 && json.errors) {
        // URL形式などの入力エラー。サーバー文言をそのまま出さず、定型文にする。
        setValidationError('URLの形式が正しくありません。');
        return;
      }

      // 生のエラー文言・レスポンス本文は表示しない(error_codeから定型文へ変換する)。
      setOutcome({ kind: 'error', message: fetchErrorMessage(json.error_code, res.status) });
    } catch {
      setOutcome({ kind: 'error', message: '通信に失敗しました。ネットワーク状態を確認してください。' });
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  const primaryClass =
    'px-4 py-2 text-sm text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed';
  const secondaryClass =
    'px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">URLから登録</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && <p className="text-red-600 text-sm">{validationError}</p>}

          {showManualGuidance && (
            <div className="rounded-md bg-amber-50 text-amber-800 p-3 text-sm">
              {MANUAL_ENTRY_GUIDANCE}
            </div>
          )}

          {outcome?.kind === 'error' && (
            <div className="rounded-md bg-red-50 text-red-700 p-3 text-sm">{outcome.message}</div>
          )}

          <div>
            <label htmlFor="import-url" className="block text-sm font-medium text-slate-700 mb-1">
              案件ページのURL
            </label>
            <input
              id="import-url"
              type="url"
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label htmlFor="import-type" className="block text-sm font-medium text-slate-700 mb-1">種別</label>
            <select
              id="import-type"
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

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
              キャンセル
            </button>

            {showManualGuidance ? (
              <>
                {/* 取得しても失敗する可能性が高いため、手入力を主ボタンにする。 */}
                <button type="submit" disabled={loading} className={secondaryClass}>
                  {loading ? '取得中...' : outcome?.kind === 'manual' ? '再試行' : '取得する'}
                </button>
                <button type="button" onClick={handleManualEntry} className={primaryClass}>
                  手入力で続ける
                </button>
              </>
            ) : outcome?.kind === 'error' ? (
              <>
                <button type="button" onClick={handleManualEntry} className={secondaryClass}>
                  手入力で続ける
                </button>
                <button type="submit" disabled={loading} className={primaryClass}>
                  {loading ? '取得中...' : '再試行'}
                </button>
              </>
            ) : (
              <button type="submit" disabled={loading} className={primaryClass}>
                {loading ? '取得中...' : '取得する'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
