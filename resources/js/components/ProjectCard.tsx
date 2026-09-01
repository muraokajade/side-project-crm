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

/**
 * 一覧に出す募集内容の最大文字数。
 * 表示は line-clamp-2 で2行に抑えるが、DOMへ全文を載せないためにここでも切り詰める
 * (「求人概要の全文は一覧に出さない」を、見た目だけでなくDOM上でも満たす)。
 */
const LIST_EXCERPT_LENGTH = 100;

/** 応募締切が近いことを警告し始める日数。 */
const DEADLINE_SOON_DAYS = 7;

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

/** 一覧用に、改行・連続空白をつぶして先頭だけを抜き出す。 */
export function listExcerpt(text: string | null): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized === '') return null;
  return normalized.length <= LIST_EXCERPT_LENGTH
    ? normalized
    : `${normalized.slice(0, LIST_EXCERPT_LENGTH)}…`;
}

type DeadlineState = 'overdue' | 'soon' | 'normal';

/**
 * 応募締切の切迫度。'YYYY-MM-DD'同士の比較にするため、時刻・タイムゾーンの影響を受けないよう
 * UTCの日付として揃えて日数差を取る。
 */
export function deadlineState(deadline: string, today: Date = new Date()): DeadlineState {
  const toUtcDay = (y: number, m: number, d: number) => Date.UTC(y, m, d);
  const [y, m, d] = deadline.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return 'normal';

  const deadlineDay = toUtcDay(y, m - 1, d);
  const todayDay = toUtcDay(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((deadlineDay - todayDay) / 86_400_000);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= DEADLINE_SOON_DAYS) return 'soon';
  return 'normal';
}

const DEADLINE_CLASSES: Record<DeadlineState, string> = {
  overdue: 'text-red-600 font-medium',
  soon: 'text-amber-600 font-medium',
  normal: 'text-slate-600',
};

/** 一覧の1行に出す「項目名 + 値」。値が無い項目は行ごと出さない。 */
function MetaItem({ label, value, className }: { label: string; value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-baseline gap-1 min-w-0">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`truncate ${className ?? 'text-slate-600'}`}>{value}</span>
    </span>
  );
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

  const excerpt = listExcerpt(p.description);
  const deadline = p.deadline?.slice(0, 10) ?? null;
  // クライアント名が無い場合は媒体で代替する(「どこの案件か」を必ず1つ出す)。
  const sourceLabel = p.client_name ? 'クライアント' : '媒体';
  const sourceValue = p.client_name || p.media;

  const detailId = `project-detail-${p.id}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* 通常表示: 案件名 / 種別 / ステータス / 報酬 / 応募締切 / クライアント(媒体) のみ */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {p.is_favorite && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0" role="img" aria-label="お気に入り">
                  <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
                </svg>
              )}
              <h3 className="font-medium text-slate-800 break-words min-w-0">{p.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${TYPE_BADGE_CLASSES[p.type]}`}>
                {TYPE_LABELS[p.type]}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
                {p.status}
              </span>
            </div>

            {excerpt && (
              <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 break-words">{excerpt}</p>
            )}

            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
              <MetaItem label="報酬" value={rewardDisplay(p)} className="text-slate-700 font-medium" />
              <MetaItem
                label="応募締切"
                value={deadline}
                className={deadline ? DEADLINE_CLASSES[deadlineState(deadline)] : undefined}
              />
              <MetaItem label={sourceLabel} value={sourceValue} />
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls={detailId}
              className="px-2.5 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
            >
              {expanded ? '詳細を閉じる' : '詳細を開く'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div id={detailId} className="px-4 py-4 border-t border-slate-100 space-y-3">
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

          {/* 編集・削除は詳細を開いたときだけ、末尾にまとめて出す(一覧での誤操作を防ぐ)。 */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">操作</p>
            <div className="flex flex-wrap gap-2">
              {variant === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit?.(p)}
                    className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(p.id)}
                    disabled={deleting}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? '削除中...' : 'ゴミ箱へ移動'}
                  </button>
                </>
              )}
              {variant === 'trash' && (
                <>
                  <button
                    type="button"
                    onClick={() => onRestore?.(p.id)}
                    disabled={restoring}
                    className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
                  >
                    {restoring ? '復元中...' : '復元'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onForceDelete?.(p.id)}
                    disabled={forceDeleting}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {forceDeleting ? '完全削除中...' : '完全削除'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
