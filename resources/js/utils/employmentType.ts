/**
 * 雇用形態の内部値(schema.orgのemploymentType等)を日本語表示へ変換する。
 *
 * 求人ページの構造化データは FULL_TIME / CONTRACTOR のような英語の定数で入っている。
 * 利用者向けの画面にそのまま出さないため、表示・保存の前に日本語へそろえる。
 * 未知の値や、もともと日本語の値はそのまま返す(推測で置き換えない)。
 */
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: '正社員',
  CONTRACTOR: '契約社員',
  CONTRACT: '契約社員',
  FREELANCE: '業務委託',
  INDEPENDENT_CONTRACTOR: '業務委託',
  PART_TIME: 'アルバイト・パート',
  TEMPORARY: '派遣社員',
  DISPATCH: '派遣社員',
  INTERN: 'インターン',
  OTHER: 'その他',
};

/** 「FULL_TIME,CONTRACTOR」「FULL_TIME/CONTRACTOR」のような複数指定も区切って変換する。 */
export function employmentTypeDisplay(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = value
    .split(/[,/、･・|]/)
    .map(part => part.trim())
    .filter(part => part !== '');

  if (parts.length === 0) return null;

  const labels = parts.map(part => EMPLOYMENT_TYPE_LABELS[part.toUpperCase()] ?? part);

  // 同じ日本語へ寄る場合(CONTRACT/CONTRACTOR等)は重複を除く。
  return [...new Set(labels)].join('/');
}
