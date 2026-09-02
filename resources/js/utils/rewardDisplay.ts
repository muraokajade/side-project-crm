import { Project } from '../types/project';

/**
 * 報酬の「表示だけ」を読みやすく整える。
 *
 * 構造化データ(JSON-LD)由来の報酬は「5000000〜15000000 JPY (YEAR)」のような
 * 機械的な表記になる。保存済みのreward_text原文は書き換えず、画面表示のときだけ
 * 「年収500万円〜1,500万円」の形へ整える。
 *
 * 円換算に確信が持てない表記(「応相談」「時給2,000円〜」など)は一切加工せず、
 * 元の文字列をそのまま返す。対象は JPY (YEAR) の年収表記だけに限定する。
 */

/** 「<金額>〜<金額> JPY (YEAR)」/「<金額> JPY (YEAR)」だけを対象にする。 */
const ANNUAL_JPY_PATTERN =
  /^\s*([\d,]+)\s*(?:[〜～]\s*([\d,]+)\s*)?JPY\s*\(\s*YEAR\s*\)\s*$/;

/**
 * 円を「500万円」「1,500万円」の形へ。万で割り切れない場合はnullを返し、
 * 端数を丸めた誤った表示にしない。
 */
function toManYen(yen: number): string | null {
  if (!Number.isFinite(yen) || yen <= 0) return null;
  if (yen % 10000 !== 0) return null;

  return `${(yen / 10000).toLocaleString('ja-JP')}万円`;
}

/** 万で表せない額は、桁区切り付きの円表記へ落とす。 */
function toYenDisplay(yen: number): string {
  return toManYen(yen) ?? `${yen.toLocaleString('ja-JP')}円`;
}

/**
 * 年収表記なら整形した文字列を、それ以外なら元の文字列をそのまま返す。
 */
export function formatRewardText(text: string): string {
  const matched = ANNUAL_JPY_PATTERN.exec(text);
  if (!matched) return text;

  const min = Number(matched[1].replace(/,/g, ''));
  const max = matched[2] !== undefined ? Number(matched[2].replace(/,/g, '')) : null;

  // 0や不正値は「0円」等の誤表示を生むため、整形せず原文のまま出す
  // (報酬を0円扱いしない方針を崩さない)。
  if (!Number.isFinite(min) || min <= 0) return text;
  if (max !== null && (!Number.isFinite(max) || max <= 0)) return text;

  if (max === null) {
    return `年収${toYenDisplay(min)}`;
  }

  return `年収${toYenDisplay(min)}〜${toYenDisplay(max)}`;
}

/**
 * カード等で使う報酬の表示文字列。
 * reward_text(ページ上の表記)を優先し、無い場合のみ数値rewardを使う。
 * どちらも無ければ「未掲載」とし、0円や推測値へは変換しない。
 */
export function rewardDisplay(p: Pick<Project, 'reward' | 'reward_text'>): string {
  if (p.reward_text) return formatRewardText(p.reward_text);
  if (p.reward !== null) return `${Number(p.reward).toLocaleString('ja-JP')}円`;
  return '未掲載';
}
