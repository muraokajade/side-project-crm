export const STATUS_OPTIONS = [
  '未応募', '応募済み', '返信待ち', '面談予定', '選考中',
  '契約済み', '作業中', '納品済み', '検収待ち', '完了', '不採用', '辞退',
] as const;

export const MEDIA_OPTIONS = ['CrowdWorks', 'MENTA', 'Lancers', 'その他'] as const;

export const CATEGORY_OPTIONS = ['Web開発', 'AI', 'DX・業務改善', 'システム開発', 'コンサル', 'その他'] as const;

export const PRIORITY_OPTIONS = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'] as const;

export const STATUS_COLORS: Record<string, string> = {
  '未応募': 'bg-gray-100 text-gray-700',
  '応募済み': 'bg-slate-100 text-slate-700',
  '返信待ち': 'bg-amber-100 text-amber-700',
  '面談予定': 'bg-blue-100 text-blue-700',
  '選考中': 'bg-indigo-100 text-indigo-700',
  '契約済み': 'bg-violet-100 text-violet-700',
  '作業中': 'bg-cyan-100 text-cyan-700',
  '納品済み': 'bg-sky-100 text-sky-700',
  '検収待ち': 'bg-orange-100 text-orange-700',
  '完了': 'bg-green-100 text-green-700',
  '不採用': 'bg-red-100 text-red-700',
  '辞退': 'bg-gray-100 text-gray-500',
};
