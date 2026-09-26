import { ProjectType } from '../types/project';

export const CAREER_STATUS_OPTIONS = [
  '気になる', '応募準備', '応募済み', '書類選考', '面接', '最終面接', '内定', '見送り',
] as const;

export const SIDE_JOB_STATUS_OPTIONS = [
  '気になる', '応募準備', '応募済み', '返信待ち', '面談', '選考中',
  '契約', '作業中', '納品', '検収待ち', '完了', '見送り',
] as const;

export function statusOptionsForType(type: ProjectType): readonly string[] {
  return type === 'career' ? CAREER_STATUS_OPTIONS : SIDE_JOB_STATUS_OPTIONS;
}

// 「その他」は受け皿として末尾に置く。既存の選択肢は削除・改名しない。
export const MEDIA_OPTIONS = ['CrowdWorks', 'MENTA', 'Lancers', 'type', 'フリーランスハブ', 'その他'] as const;

export const CATEGORY_OPTIONS = ['Web開発', 'AI', 'DX・業務改善', 'システム開発', 'コンサル', 'その他'] as const;

/**
 * app/Support/ProjectStatus.php(バックエンド側の正規ラベル定義)と対応する表示色。
 * career/side_jobで重複するラベル(気になる・応募準備・応募済み・見送り)は1つの定義を共有する。
 *
 * 一覧には同じバッジが何十個も並ぶため、背景は最も淡い50段階に統一する。
 * 色相は段階の識別を助ける補助であって、主張させるためのものではない。
 * 中立・終了(気になる・応募準備・見送り)はslateへ寄せ、色を使わない。
 */
/**
 * 一覧で使うステータスの色。
 *
 * 一覧には同じ状態表示が20〜100行ぶん並ぶ。背景付きのバッジを行ごとに置くと、
 * 塗り面が縦に積み上がって「探す」ための視線誘導を奪う。
 * そのため一覧では、色は1.5pxの点だけに持たせ、文字は他のメタ情報と同じ濃さに揃える。
 * 色が持つ意味(どの段階か)は変えていない。下のSTATUS_COLORSと同じ色相を使う。
 */
export const STATUS_DOT_COLORS: Record<string, string> = {
  // 中立(最頻出)。色を持たせず、点があること自体で「段階の前半」を示す。
  '気になる': 'bg-slate-300',
  '応募準備': 'bg-slate-300',
  '見送り': 'bg-slate-200',
  '応募済み': 'bg-blue-400',
  // career専用
  '書類選考': 'bg-indigo-400',
  '面接': 'bg-cyan-400',
  '最終面接': 'bg-teal-400',
  '内定': 'bg-green-500',
  // side_job専用
  '返信待ち': 'bg-amber-400',
  '面談': 'bg-blue-400',
  '選考中': 'bg-indigo-400',
  '契約': 'bg-violet-500',
  '作業中': 'bg-cyan-400',
  '納品': 'bg-sky-400',
  '検収待ち': 'bg-orange-400',
  '完了': 'bg-green-500',
};

/** 未知のステータス(将来ラベルが増えた場合)の点。色で意味を作らない。 */
export const STATUS_DOT_FALLBACK = 'bg-slate-300';

/**
 * 背景付きのステータスバッジ。詳細パネルなど、1画面に1つだけ出る場所で使う。
 * 一覧はSTATUS_DOT_COLORSを使う(上記の理由)。
 */
export const STATUS_COLORS: Record<string, string> = {
  // 中立(最頻出。ここが目立つと一覧全体が騒がしくなる)
  '気になる': 'bg-slate-100 text-slate-600',
  '応募準備': 'bg-slate-100 text-slate-600',
  '見送り': 'bg-slate-50 text-slate-400',
  '応募済み': 'bg-blue-50 text-blue-700',
  // career専用
  '書類選考': 'bg-indigo-50 text-indigo-700',
  '面接': 'bg-cyan-50 text-cyan-700',
  '最終面接': 'bg-teal-50 text-teal-700',
  '内定': 'bg-green-50 text-green-700',
  // side_job専用
  '返信待ち': 'bg-amber-50 text-amber-700',
  '面談': 'bg-blue-50 text-blue-700',
  '選考中': 'bg-indigo-50 text-indigo-700',
  '契約': 'bg-violet-50 text-violet-700',
  '作業中': 'bg-cyan-50 text-cyan-700',
  '納品': 'bg-sky-50 text-sky-700',
  '検収待ち': 'bg-orange-50 text-orange-700',
  '完了': 'bg-green-50 text-green-700',
};
