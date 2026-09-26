import { Project } from '../types/project';

/**
 * ポートフォリオ用のデモ案件（架空）。
 *
 * これはJobHuntを初めて見た人が、登録しなくても使い方を把握できるようにするための
 * 表示専用データ。実データとは次の点で完全に分かれている。
 *
 * - DB(Neon)にもAPIにも一切送らない。生成も保持もブラウザのメモリ内だけで行う。
 * - idを負の数にしてある。projectsテーブルのidは自動採番の正の整数なので、
 *   実案件と衝突しないうえ、万一APIへ渡ってしまっても既存案件を書き換えられない。
 * - デモ表示中はProjectCardをvariant="demo"で描画し、編集・削除の導線自体を出さない。
 *
 * 内容についての約束。
 * - 会社名・案件名はすべて架空。実在の企業・求人は使わない。
 * - 個人名・メールアドレス・電話番号などの個人情報は含めない。
 * - URLはRFC 2606で文書用に予約されている example.com のみを使う。
 *
 * 締切は「今日から何日後」で作る。固定日付にすると時間が経つほど
 * すべて締切超過(赤)になり、締切の色分けがデモとして成立しなくなるため。
 */

/** デモ案件のid。負の数にして実案件(正の自動採番)と必ず区別する。 */
const DEMO_ID_BASE = -101;

/** 基準日からの相対日付を 'YYYY-MM-DD' で返す。 */
function isoDate(base: Date, offsetDays: number): string {
  const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** 未使用項目をnullで埋めた土台。各案件は必要な項目だけを上書きする。 */
function demoBase(index: number, base: Date): Project {
  const createdAt = `${isoDate(base, -(index + 1) * 3)}T00:00:00.000000Z`;

  return {
    id: DEMO_ID_BASE - index,
    type: 'career',
    name: '',
    project_url: null,
    client_name: null,
    media: null,
    category: null,
    description: null,
    applied_date: null,
    deadline: null,
    status: '気になる',
    reward: null,
    reward_text: null,
    working_hours: null,
    applicant_count: null,
    recruitment_count: null,
    application_text: null,
    next_action: null,
    next_action_date: null,
    memo: null,
    priority: null,
    is_favorite: false,
    job_type: null,
    location: null,
    remote_type: null,
    employment_type: null,
    contract_type: null,
    delivery_date: null,
    side_job_allowed: 'unknown',
    fetched_at: null,
    deleted_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * デモ案件を作る。引数の基準日は締切の相対計算とテストのためだけに使う。
 *
 * 転職3件で副業可否のOK/NG/不明をひと通り、副業1件で副業側の項目を見せる。
 * 報酬も「年収レンジ」「固定額」「未掲載」を混ぜて、表示の違いが分かるようにしている。
 */
export function buildDemoProjects(base: Date = new Date()): Project[] {
  return [
    {
      ...demoBase(0, base),
      type: 'career',
      name: 'バックエンドエンジニア（Go / 決済基盤）',
      client_name: '架空テック株式会社',
      media: 'type',
      category: 'システム開発',
      project_url: 'https://example.com/jobs/backend-go',
      description:
        '決済基盤のAPI開発を担当します。\nGoでのサーバーサイド開発経験が2年以上ある方を想定しています。',
      status: '面接',
      // 「6000000〜9000000 JPY (YEAR)」は求人ページの構造化データでよくある表記。
      // 画面では rewardDisplay が「年収600万円〜900万円」へ整えるので、その挙動も一緒に見せる。
      reward_text: '6000000〜9000000 JPY (YEAR)',
      deadline: isoDate(base, 4),
      applied_date: isoDate(base, -6),
      next_action: '二次面接の日程調整',
      next_action_date: isoDate(base, 2),
      memo: 'リモート中心。副業可と明記あり。',
      is_favorite: true,
      job_type: 'バックエンドエンジニア',
      location: '東京都（フルリモート可）',
      remote_type: 'フルリモート',
      employment_type: 'FULL_TIME',
      side_job_allowed: 'ok',
    },
    {
      ...demoBase(1, base),
      type: 'career',
      name: 'フロントエンドエンジニア（React / 自社SaaS）',
      client_name: 'サンプル商会株式会社',
      media: 'type',
      category: 'Web開発',
      project_url: 'https://example.com/jobs/frontend-react',
      description: '自社SaaSの管理画面をReactで刷新するポジションです。',
      status: '書類選考',
      reward_text: '5000000〜7000000 JPY (YEAR)',
      deadline: isoDate(base, 21),
      applied_date: isoDate(base, -2),
      job_type: 'フロントエンドエンジニア',
      location: '大阪府',
      remote_type: '週2出社',
      employment_type: 'FULL_TIME',
      side_job_allowed: 'ng',
    },
    {
      ...demoBase(2, base),
      type: 'career',
      name: '社内DXエンジニア（業務システム改善）',
      client_name: 'デモラボ合同会社',
      media: 'その他',
      category: 'DX・業務改善',
      project_url: 'https://example.com/jobs/dx-engineer',
      description: '社内の業務システムを整理し、手作業を減らす仕事です。',
      status: '応募済み',
      // 報酬の記載が無い求人。rewardDisplayは「未掲載」を出し、0円や推測値にはしない。
      applied_date: isoDate(base, -1),
      job_type: '社内SE',
      location: '福岡県',
      remote_type: 'ハイブリッド',
      // 副業可否がページに書かれていない求人。推測せず「不明」のまま扱う。
      side_job_allowed: 'unknown',
    },
    {
      ...demoBase(3, base),
      type: 'side_job',
      name: 'コーポレートサイトのリニューアル',
      client_name: 'テストワークス株式会社',
      media: 'CrowdWorks',
      category: 'Web開発',
      project_url: 'https://example.com/works/corporate-site',
      description: '10ページ程度のコーポレートサイトを作り直す案件です。',
      status: '作業中',
      reward: 180000,
      deadline: isoDate(base, 10),
      applied_date: isoDate(base, -14),
      working_hours: '週10時間程度',
      contract_type: '業務委託（準委任）',
      delivery_date: isoDate(base, 30),
      next_action: 'トップページのデザイン確認',
      next_action_date: isoDate(base, 3),
    },
  ];
}
