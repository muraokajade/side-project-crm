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

export const MEDIA_OPTIONS = ['CrowdWorks', 'MENTA', 'Lancers', 'その他'] as const;

export const CATEGORY_OPTIONS = ['Web開発', 'AI', 'DX・業務改善', 'システム開発', 'コンサル', 'その他'] as const;

/**
 * apps/Support/ProjectStatus.php(バックエンド側の正規ラベル定義)と対応する表示色。
 * career/side_jobで重複するラベル(気になる・応募準備・応募済み・見送り)は1つの定義を共有する。
 */
export const STATUS_COLORS: Record<string, string> = {
  '気になる': 'bg-gray-100 text-gray-700',
  '応募準備': 'bg-slate-100 text-slate-700',
  '応募済み': 'bg-blue-100 text-blue-700',
  '見送り': 'bg-gray-100 text-gray-500',
  // career専用
  '書類選考': 'bg-indigo-100 text-indigo-700',
  '面接': 'bg-cyan-100 text-cyan-700',
  '最終面接': 'bg-teal-100 text-teal-700',
  '内定': 'bg-green-100 text-green-700',
  // side_job専用
  '返信待ち': 'bg-amber-100 text-amber-700',
  '面談': 'bg-blue-100 text-blue-700',
  '選考中': 'bg-indigo-100 text-indigo-700',
  '契約': 'bg-violet-100 text-violet-700',
  '作業中': 'bg-cyan-100 text-cyan-700',
  '納品': 'bg-sky-100 text-sky-700',
  '検収待ち': 'bg-orange-100 text-orange-700',
  '完了': 'bg-green-100 text-green-700',
};
