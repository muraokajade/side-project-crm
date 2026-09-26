import { Project } from '../types/project';
import { STATUS_DOT_COLORS, STATUS_DOT_FALLBACK } from '../constants/projectOptions';
import { rewardDisplay } from '../utils/rewardDisplay';
import { resolveMediaForDisplay } from '../utils/mediaFromUrl';

/**
 * 一覧の1行。
 *
 * この画面は20〜100件を上から下へ読み飛ばすためのものなので、
 * 1件につき出すのは「比べるために要る値」だけにしてある。
 * 募集内容の抜粋・URL・職種・メモなどは行に出さず、詳細パネルに任せる。
 * (すべてを少しずつ見せると、行が増えたときに文字の壁になる)
 *
 * PCでは各値を固定幅の列に入れて、案件名の開始位置・会社・報酬・締切が
 * 全行で縦に揃うようにしている。揃っていることが、そのまま比較しやすさになる。
 * 狭幅では列をやめ、2段に折り返す。
 */

interface ProjectCardProps {
  project: Project;
  /** 選択中の行は面を変えて、詳細パネルとの対応を示す。 */
  selected?: boolean;
  /** 押すと詳細パネルを開く。 */
  onOpen: (project: Project) => void;
}

const TYPE_LABELS: Record<Project['type'], string> = {
  career: '転職',
  side_job: '副業',
};

/** 応募締切が近いことを警告し始める日数。 */
const DEADLINE_SOON_DAYS = 7;

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
  normal: 'text-slate-500',
};

/**
 * PC(md以上)の列幅。一覧のヘッダー行(ProjectListHeader)と同じ値を使う。
 * ここを直すときは必ず両方そろえる。
 */
export const LIST_GRID_CLASS =
  'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_7rem_5.5rem_6rem_2.5rem] md:items-center md:gap-x-4';

/** 一覧の列見出し。PCでだけ出す(狭幅は列ではなく2段の折り返しになるため)。 */
export function ProjectListHeader() {
  return (
    <div
      className={`hidden border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-400 ${LIST_GRID_CLASS}`}
      aria-hidden="true"
    >
      <span>案件名</span>
      <span>会社名</span>
      <span className="text-right">報酬</span>
      <span className="text-right">締切</span>
      <span>ステータス</span>
      <span />
    </div>
  );
}

export default function ProjectCard({ project: p, selected, onOpen }: ProjectCardProps) {
  const deadline = p.deadline?.slice(0, 10) ?? null;
  // DBの媒体が古い値でも、案件URLから判定できる場合はそちらで表示する(DBは書き換えない)。
  const media = resolveMediaForDisplay(p);
  // 一覧の1スロットに収めるため、クライアント名が無い案件は媒体で代替する。
  const company = p.client_name || media;
  const reward = rewardDisplay(p);

  return (
    /*
      行ぜんぶを開く導線にする。行の中に別のボタンを置いていないので、
      押し先が競合しない。読み上げには「詳細を開く」と案件名を渡す。
    */
    <button
      type="button"
      onClick={() => onOpen(p)}
      aria-label={`${p.name} の詳細を開く`}
      className={`block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 ${LIST_GRID_CLASS} ${
        selected ? 'bg-slate-100' : 'bg-white'
      }`}
    >
      {/* 案件名。ステータスの点を頭に置き、名前は必ず1行で切る。 */}
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[p.status] ?? STATUS_DOT_FALLBACK}`}
        />
        {p.is_favorite && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-amber-400" role="img" aria-label="お気に入り">
            <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
          </svg>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.name}</span>
      </span>

      {/*
        会社名・報酬・締切・ステータスの4項目。

        PC(md以上)では md:contents でこの入れ物自体を消し、
        4つをそのまま一覧の列(col2〜col5)へ流し込む。
        狭幅では入れ物がflexとして働き、案件名の下へ1段に折り返す。
        こうすると値をDOMへ二重に置かずに、PCと狭幅で並べ方だけを変えられる。
      */}
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 pl-3.5 text-xs md:mt-0 md:contents">
        <span className="min-w-0 truncate text-slate-500">{company}</span>

        <span className="text-slate-600 tabular-nums md:truncate md:text-right">{reward}</span>

        <span className="whitespace-nowrap tabular-nums md:text-right">
          {deadline && (
            <>
              {/* PCは列見出しが「締切」を示すので、ラベルは狭幅だけに出す。 */}
              <span className="text-slate-400 md:hidden">締切 </span>
              <span className={DEADLINE_CLASSES[deadlineState(deadline)]}>{deadline}</span>
            </>
          )}
        </span>

        <span className="md:truncate">
          <span className="text-slate-500">{p.status}</span>
          <span className="ml-1.5 text-slate-400">{TYPE_LABELS[p.type]}</span>
        </span>
      </span>

      {/* 開く方向の記号。行そのものが押せるので、これは印であって独立したボタンではない。 */}
      <span aria-hidden="true" className="hidden justify-end text-slate-300 md:flex">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M7.5 5l5 5-5 5" />
        </svg>
      </span>
    </button>
  );
}
