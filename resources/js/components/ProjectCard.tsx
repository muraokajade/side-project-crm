import { useState } from 'react';
import { Project } from '../types/project';
import { STATUS_COLORS } from '../constants/projectOptions';
import { rewardDisplay } from '../utils/rewardDisplay';
import { resolveMediaForDisplay } from '../utils/mediaFromUrl';
import { employmentTypeDisplay } from '../utils/employmentType';

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

/**
 * 詳細の「項目名 + 値」。値が無い項目は出さない。
 * 募集内容の段落・改行は whitespace-pre-wrap で維持し、長い値は折り返す。
 */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-700 whitespace-pre-wrap break-words">{value}</dd>
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
  // DBの媒体が古い値でも、案件URLから判定できる場合はそちらで表示する(DBは書き換えない)。
  const media = resolveMediaForDisplay(p);
  // 一覧の1スロットに収めるため、クライアント名が無い案件は媒体で代替する。
  const company = p.client_name || media;
  const reward = rewardDisplay(p);
  const detailId = `project-detail-${p.id}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-shadow hover:shadow-md hover:border-slate-300">
      {/*
        一覧は「読む」ではなく「探す」ための密度にする。
        PCでは1案件=1行、スマホでは折り返して縦積みにする。
        媒体・カテゴリ・URL全文・職種等は一覧に出さず、詳細を開いたときだけ出す。
      */}
      <div className="px-3 py-2">
        {/*
          PCでは1行に収め、スマホでは自然に縦へ折り返す。
          並びは 案件名 → ステータス → 会社名 → 報酬 → 締切 → 詳細。
          会社名は無ければ媒体で代替し、1スロットに収める(項目は増やさない)。
        */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-1.5 min-w-0 md:flex-1">
            {p.is_favorite && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0" role="img" aria-label="お気に入り">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            )}
            <h3 className="min-w-0 flex-1 text-sm font-medium text-slate-800 truncate">{p.name}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs md:shrink-0 md:flex-nowrap">
            <span className={`shrink-0 px-2 py-0.5 rounded ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
              {p.status}
            </span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded ${TYPE_BADGE_CLASSES[p.type]}`}>
              {TYPE_LABELS[p.type]}
            </span>
            {company && (
              <span className="min-w-0 max-w-[10rem] truncate text-slate-600">{company}</span>
            )}
            {reward && <span className="shrink-0 text-slate-700 font-medium">{reward}</span>}
            {deadline && (
              <span className="shrink-0 whitespace-nowrap">
                <span className="text-slate-400">締切 </span>
                <span className={DEADLINE_CLASSES[deadlineState(deadline)]}>{deadline}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls={detailId}
              className="shrink-0 px-2 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
            >
              {expanded ? '詳細を閉じる' : '詳細を開く'}
            </button>
          </div>
        </div>

        {/* 概要は1行だけ。全文は詳細に任せる。 */}
        {excerpt && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{excerpt}</p>
        )}
      </div>

      {expanded && (
        <div id={detailId} className="px-4 py-4 border-t border-slate-100 space-y-4">
          {/* 募集内容は全文。段落・改行はFieldのwhitespace-pre-wrapで維持する。 */}
          <dl>
            <Field label="募集内容" value={p.description} />
          </dl>

          {p.project_url && (
            <dl>
              <dt className="text-xs text-slate-400 mb-0.5">案件URL</dt>
              <dd className="min-w-0">
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
                  <span className="text-sm text-slate-700 break-all">{p.project_url}</span>
                )}
              </dd>
            </dl>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            <Field label="報酬" value={rewardDisplay(p)} />
            <Field label="媒体" value={media} />
            <Field label="クライアント" value={p.client_name} />
            <Field label="カテゴリ" value={p.category} />
            <Field label="応募日" value={p.applied_date?.slice(0, 10)} />
            <Field label="次アクション" value={p.next_action} />
            <Field label="次アクション日" value={p.next_action_date?.slice(0, 10)} />
          </dl>

          <dl>
            <Field label="メモ" value={p.memo} />
          </dl>

          {p.type === 'career' && (p.job_type || p.location || p.remote_type || p.employment_type) && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">転職専用項目</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <Field label="職種" value={p.job_type} />
                <Field label="勤務地" value={p.location} />
                <Field label="リモート区分" value={p.remote_type} />
                <Field label="雇用形態" value={employmentTypeDisplay(p.employment_type)} />
              </dl>
            </div>
          )}

          {p.type === 'side_job' && (p.contract_type || p.delivery_date) && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">副業専用項目</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <Field label="契約形態" value={p.contract_type} />
                <Field label="納品日" value={p.delivery_date?.slice(0, 10)} />
              </dl>
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
