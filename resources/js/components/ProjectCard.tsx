import { useState } from 'react';
import { Project } from '../types/project';
import { STATUS_COLORS } from '../constants/projectOptions';

interface ProjectCardProps {
  project: Project;
  variant: 'active' | 'trash';
  onEdit?: (project: Project) => void;
  onDelete?: (id: number) => void;
  deleting?: boolean;
  onRestore?: (id: number) => void;
  onForceDelete?: (id: number) => void;
  restoring?: boolean;
  forceDeleting?: boolean;
}

const TYPE_LABELS: Record<Project['type'], string> = {
  career: '転職',
  side_job: '副業',
};

const TYPE_BADGE_CLASSES: Record<Project['type'], string> = {
  career: 'bg-purple-100 text-purple-700',
  side_job: 'bg-emerald-100 text-emerald-700',
};

/** http/https以外のスキームは外部リンクとして開かない(安全な表示のための最小限のガード)。 */
function isSafeExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * 報酬表示はreward_text(ページ上の表記、例: 「応相談」)を優先する。
 * reward_textが空でreward(数値)があればそれを表示し、どちらも無ければ「未掲載」とする
 * (0円・推測値へは変換しない)。
 */
function rewardDisplay(p: Project): string {
  if (p.reward_text) return p.reward_text;
  if (p.reward !== null) return `${Number(p.reward).toLocaleString('ja-JP')}円`;
  return '未掲載';
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

export default function ProjectCard({
  project: p,
  variant,
  onEdit,
  onDelete,
  deleting,
  onRestore,
  onForceDelete,
  restoring,
  forceDeleting,
}: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  const dueLabel = p.next_action_date ? '次アクション日' : p.deadline ? '応募期限' : null;
  const dueValue = (p.next_action_date || p.deadline)?.slice(0, 10) ?? null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {p.is_favorite && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0" aria-label="お気に入り">
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
            </svg>
          )}
          <span className="font-medium text-slate-800 truncate">{p.name}</span>
          <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${TYPE_BADGE_CLASSES[p.type]}`}>
            {TYPE_LABELS[p.type]}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
            {p.status}
          </span>
          {p.client_name && <span className="text-sm text-slate-500 truncate">{p.client_name}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
          {dueLabel && dueValue && <span>{dueLabel}: {dueValue}</span>}
          <span className="text-slate-300">{expanded ? '閉じる' : '詳細'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          <Field label="募集内容（抜粋）" value={p.description} />
          {p.project_url && (
            <div>
              <p className="text-xs text-slate-400">URL</p>
              {isSafeExternalUrl(p.project_url) ? (
                <a
                  href={p.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline break-all"
                >
                  {p.project_url}
                </a>
              ) : (
                <p className="text-sm text-slate-700 break-all">{p.project_url}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="報酬" value={rewardDisplay(p)} />
            <Field label="媒体" value={p.media} />
            <Field label="カテゴリ" value={p.category} />
            <Field label="応募日" value={p.applied_date?.slice(0, 10)} />
            <Field label="次アクション" value={p.next_action} />
            <Field label="次アクション日" value={p.next_action_date?.slice(0, 10)} />
          </div>
          <Field label="メモ" value={p.memo} />

          {p.type === 'career' && (p.job_type || p.location || p.remote_type || p.employment_type) && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">転職専用項目</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="職種" value={p.job_type} />
                <Field label="勤務地" value={p.location} />
                <Field label="リモート区分" value={p.remote_type} />
                <Field label="雇用形態" value={p.employment_type} />
              </div>
            </div>
          )}

          {p.type === 'side_job' && (p.contract_type || p.delivery_date) && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">副業専用項目</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="契約形態" value={p.contract_type} />
                <Field label="納品日" value={p.delivery_date?.slice(0, 10)} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            {variant === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit?.(p)}
                  className="text-slate-600 hover:text-slate-800 text-xs underline"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(p.id)}
                  disabled={deleting}
                  className="text-red-500 hover:text-red-700 text-xs underline disabled:opacity-50 disabled:no-underline"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </>
            )}
            {variant === 'trash' && (
              <>
                <button
                  type="button"
                  onClick={() => onRestore?.(p.id)}
                  disabled={restoring}
                  className="text-blue-600 hover:text-blue-800 text-xs underline disabled:opacity-50 disabled:no-underline"
                >
                  {restoring ? '復元中...' : '復元'}
                </button>
                <button
                  type="button"
                  onClick={() => onForceDelete?.(p.id)}
                  disabled={forceDeleting}
                  className="text-red-500 hover:text-red-700 text-xs underline disabled:opacity-50 disabled:no-underline"
                >
                  {forceDeleting ? '完全削除中...' : '完全削除'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
