import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ProjectCard from './ProjectCard';
import { Project } from '../types/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    type: 'side_job',
    name: 'テスト案件',
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
    fetched_at: null,
    deleted_at: null,
    created_at: '2026-08-01T00:00:00.000000Z',
    updated_at: '2026-08-01T00:00:00.000000Z',
    ...overrides,
  };
}

describe('ProjectCard 詳細の開閉', () => {
  it('初期状態では詳細項目(URL・メモ等)を表示しない', () => {
    render(<ProjectCard project={makeProject({ memo: 'メモ本文', project_url: 'https://example.com/1' })} variant="active" />);
    expect(screen.queryByText('メモ本文')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('「詳細を開く」を押したときだけ詳細項目が表示される', () => {
    render(<ProjectCard project={makeProject({ memo: 'メモ本文' })} variant="active" />);
    expect(screen.queryByText('メモ本文')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.getByText('メモ本文')).toBeInTheDocument();
  });

  it('「詳細を閉じる」で再び閉じる', () => {
    render(<ProjectCard project={makeProject({ memo: 'メモ本文' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.getByText('メモ本文')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '詳細を閉じる' }));

    expect(screen.queryByText('メモ本文')).not.toBeInTheDocument();
  });

  it('開閉状態をaria-expandedで伝える', () => {
    render(<ProjectCard project={makeProject()} variant="active" />);
    const toggle = screen.getByRole('button', { name: '詳細を開く' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: '詳細を閉じる' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('複数カードを同時に展開できる', () => {
    render(
      <>
        <ProjectCard project={makeProject({ id: 1, name: '案件A', memo: 'メモA' })} variant="active" />
        <ProjectCard project={makeProject({ id: 2, name: '案件B', memo: 'メモB' })} variant="active" />
      </>
    );
    const toggles = screen.getAllByRole('button', { name: '詳細を開く' });
    fireEvent.click(toggles[0]);
    fireEvent.click(toggles[1]);

    expect(screen.getByText('メモA')).toBeInTheDocument();
    expect(screen.getByText('メモB')).toBeInTheDocument();
  });

  it('カード見出し自体はボタンにせず、誤操作で開かないようにする', () => {
    render(<ProjectCard project={makeProject({ memo: 'メモ本文' })} variant="active" />);

    // 「詳細を開く」以外に開閉のトリガーとなるボタンが無いこと。
    expect(screen.queryByRole('button', { name: /テスト案件/ })).not.toBeInTheDocument();
  });
});

describe('ProjectCard 一覧の通常表示', () => {
  it('案件名・種別・ステータス・報酬・応募締切・クライアントを表示する', () => {
    render(
      <ProjectCard
        project={makeProject({
          name: 'フロント改修',
          type: 'side_job',
          status: '応募済み',
          reward_text: '80,000円',
          deadline: '2099-12-31',
          client_name: '株式会社サンプル',
        })}
        variant="active"
      />
    );

    expect(screen.getByText('フロント改修')).toBeInTheDocument();
    expect(screen.getByText('副業')).toBeInTheDocument();
    expect(screen.getByText('応募済み')).toBeInTheDocument();
    expect(screen.getByText('80,000円')).toBeInTheDocument();
    expect(screen.getByText('2099-12-31')).toBeInTheDocument();
    expect(screen.getByText('株式会社サンプル')).toBeInTheDocument();
  });

  it('クライアント名が無ければ媒体を代わりに表示する', () => {
    render(<ProjectCard project={makeProject({ client_name: null, media: 'CrowdWorks' })} variant="active" />);

    expect(screen.getByText('媒体')).toBeInTheDocument();
    expect(screen.getByText('CrowdWorks')).toBeInTheDocument();
  });

  it('通常表示では詳細のみの項目(カテゴリ・応募日・次アクション)を出さない', () => {
    render(
      <ProjectCard
        project={makeProject({
          category: 'Web開発',
          applied_date: '2026-08-01',
          next_action: '面談日程を調整',
        })}
        variant="active"
      />
    );

    expect(screen.queryByText('Web開発')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-08-01')).not.toBeInTheDocument();
    expect(screen.queryByText('面談日程を調整')).not.toBeInTheDocument();
  });
});

describe('ProjectCard 募集内容の抜粋', () => {
  it('一覧には概要の全文を出さず、2行クランプ付きの抜粋だけを出す', () => {
    const long = 'あ'.repeat(400);
    render(<ProjectCard project={makeProject({ description: long })} variant="active" />);

    const excerpt = screen.getByText(/^あ+…$/);
    expect(excerpt.tagName).toBe('P');
    expect(excerpt.className).toContain('line-clamp-2');
    // DOMにも全文を載せない(見た目のクランプだけに頼らない)。
    expect(excerpt.textContent!.length).toBeLessThan(long.length);
    expect(screen.queryByText(long)).not.toBeInTheDocument();
  });

  it('抜粋では改行・連続空白を1つにまとめる', () => {
    render(<ProjectCard project={makeProject({ description: '前半\n\n   後半' })} variant="active" />);

    expect(screen.getByText('前半 後半')).toBeInTheDocument();
  });

  it('短い概要は省略記号を付けずそのまま出す', () => {
    render(<ProjectCard project={makeProject({ description: '短い概要' })} variant="active" />);

    expect(screen.getByText('短い概要')).toBeInTheDocument();
  });

  it('概要が無ければ抜粋行自体を出さない', () => {
    const { container } = render(<ProjectCard project={makeProject({ description: null })} variant="active" />);

    // 抜粋の段落そのものが出ない(案件名にも同じクランプが付くため、pに限定して確認する)。
    expect(container.querySelector('p.line-clamp-2')).toBeNull();
  });

  it('詳細を開くと概要の全文を表示する', () => {
    const long = 'あ'.repeat(400);
    render(<ProjectCard project={makeProject({ description: long })} variant="active" />);

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.getByText(long)).toBeInTheDocument();
  });
});

describe('ProjectCard 応募締切の切迫度', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T09:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('締切超過は赤字で強調する', () => {
    render(<ProjectCard project={makeProject({ deadline: '2026-08-31' })} variant="active" />);
    expect(screen.getByText('2026-08-31').className).toContain('text-red-600');
  });

  it('締切7日以内は黄字で強調する', () => {
    render(<ProjectCard project={makeProject({ deadline: '2026-09-05' })} variant="active" />);
    expect(screen.getByText('2026-09-05').className).toContain('text-amber-600');
  });

  it('まだ余裕がある締切は強調しない', () => {
    render(<ProjectCard project={makeProject({ deadline: '2026-12-31' })} variant="active" />);
    const el = screen.getByText('2026-12-31');
    expect(el.className).not.toContain('text-red-600');
    expect(el.className).not.toContain('text-amber-600');
  });

  it('締切が無ければ応募締切の行を出さない', () => {
    render(<ProjectCard project={makeProject({ deadline: null })} variant="active" />);
    expect(screen.queryByText('応募締切')).not.toBeInTheDocument();
  });
});

describe('ProjectCard ステータス表示', () => {
  it('career新ステータス「内定」を色付きバッジで表示する', () => {
    render(<ProjectCard project={makeProject({ type: 'career', status: '内定' })} variant="active" />);
    const badge = screen.getByText('内定');
    expect(badge.className).toContain('bg-green-100');
  });

  it('side_job新ステータス「契約」を色付きバッジで表示する', () => {
    render(<ProjectCard project={makeProject({ status: '契約' })} variant="active" />);
    const badge = screen.getByText('契約');
    expect(badge.className).toContain('bg-violet-100');
  });
});

describe('ProjectCard priority非表示', () => {
  it('priorityが設定されていても画面に表示しない', () => {
    render(<ProjectCard project={makeProject({ priority: '3.0' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.queryByText('3.0')).not.toBeInTheDocument();
  });
});

describe('ProjectCard URL表示', () => {
  it('https URLはリンクとして表示する', () => {
    render(<ProjectCard project={makeProject({ project_url: 'https://example.com/job/1' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    const link = screen.getByRole('link', { name: 'https://example.com/job/1' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('http/https以外のスキームはリンク化しない', () => {
    render(<ProjectCard project={makeProject({ project_url: 'javascript:alert(1)' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });
});

describe('ProjectCard type専用項目', () => {
  it('career用項目(職種)を表示し、side_job用項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ type: 'career', job_type: 'バックエンド', contract_type: null })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.getByText('バックエンド')).toBeInTheDocument();
    expect(screen.queryByText('副業専用項目')).not.toBeInTheDocument();
  });

  it('side_job用項目(契約形態)を表示し、career用項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ contract_type: '業務委託' })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.getByText('業務委託')).toBeInTheDocument();
    expect(screen.queryByText('転職専用項目')).not.toBeInTheDocument();
  });
});

describe('ProjectCard 報酬表示', () => {
  it('reward_textがあればそれを優先して表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '応相談', reward: null })} variant="active" />);
    expect(screen.getByText('応相談')).toBeInTheDocument();
  });

  it('reward_textが空でrewardがあれば数値から整形して表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: null, reward: 80000 })} variant="active" />);
    expect(screen.getByText('80,000円')).toBeInTheDocument();
  });

  it('reward_textとrewardが両方あってもreward_textを表示する(数値へ丸めない)', () => {
    render(<ProjectCard project={makeProject({ reward_text: '時給 2,000円', reward: 2000 })} variant="active" />);
    expect(screen.getByText('時給 2,000円')).toBeInTheDocument();
    expect(screen.queryByText('2,000円')).not.toBeInTheDocument();
  });

  it('reward_textもrewardも無ければ「未掲載」と表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: null, reward: null })} variant="active" />);
    expect(screen.getByText('未掲載')).toBeInTheDocument();
  });
});

describe('ProjectCard 年収表記の整形表示', () => {
  it('一覧では機械的な年収表記を読みやすい形で表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '5000000〜15000000 JPY (YEAR)' })} variant="active" />);

    expect(screen.getByText('年収500万円〜1,500万円')).toBeInTheDocument();
    expect(screen.queryByText('5000000〜15000000 JPY (YEAR)')).not.toBeInTheDocument();
  });

  it('詳細でも同じ整形結果を表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '5000000 JPY (YEAR)' })} variant="active" />);

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    // 一覧と詳細の両方に出るため、2箇所で同じ表記になる。
    expect(screen.getAllByText('年収500万円').length).toBe(2);
  });

  it('「応相談」は加工せずそのまま表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '応相談' })} variant="active" />);
    expect(screen.getByText('応相談')).toBeInTheDocument();
  });

  it('時給表記は加工せずそのまま表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '時給2,000円〜' })} variant="active" />);
    expect(screen.getByText('時給2,000円〜')).toBeInTheDocument();
  });

  it('整形対象でも0を含む場合は原文のままにし、0円表示にしない', () => {
    render(<ProjectCard project={makeProject({ reward_text: '0 JPY (YEAR)' })} variant="active" />);
    expect(screen.getByText('0 JPY (YEAR)')).toBeInTheDocument();
    expect(screen.queryByText('年収0円')).not.toBeInTheDocument();
  });
});

describe('ProjectCard 媒体のURL判定表示', () => {
  it('既存type.jp案件(媒体=その他)を一覧・詳細でtypeと表示する', () => {
    render(<ProjectCard project={makeProject({
      client_name: null, media: 'その他', project_url: 'https://type.jp/job-1/1344057_detail/',
    })} variant="active" />);

    // 一覧(クライアント名が無いので媒体を出す)
    expect(screen.getByText('type')).toBeInTheDocument();
    expect(screen.queryByText('その他')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    // 詳細の媒体欄
    expect(screen.getAllByText('type').length).toBeGreaterThanOrEqual(1);
  });

  it('フリーランスハブのURLはフリーランスハブと表示する', () => {
    render(<ProjectCard project={makeProject({
      client_name: null, media: null, project_url: 'https://freelance-hub.jp/project/detail/1/',
    })} variant="active" />);

    expect(screen.getByText('フリーランスハブ')).toBeInTheDocument();
  });

  it('利用者が選んだ媒体はURLで上書きしない', () => {
    render(<ProjectCard project={makeProject({
      client_name: null, media: 'MENTA', project_url: 'https://type.jp/job-1/1/',
    })} variant="active" />);

    expect(screen.getByText('MENTA')).toBeInTheDocument();
    expect(screen.queryByText('type')).not.toBeInTheDocument();
  });
});

describe('ProjectCard 英語の内部値を出さない', () => {
  it('雇用形態は日本語で表示する', () => {
    render(<ProjectCard project={makeProject({
      type: 'career', employment_type: 'FULL_TIME,CONTRACTOR',
    })} variant="active" />);

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.getByText('正社員/契約社員')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('FULL_TIME');
    expect(document.body.textContent).not.toContain('CONTRACTOR');
  });

  it('報酬のJPY/YEN表記を日本語で表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '350000 YEN (MONTH)' })} variant="active" />);

    expect(screen.getByText('月給35万円')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('YEN');
    expect(document.body.textContent).not.toContain('MONTH');
  });

  it('年収レンジも日本語で表示する', () => {
    render(<ProjectCard project={makeProject({ reward_text: '5000000〜7000000 JPY (YEAR)' })} variant="active" />);

    expect(screen.getByText('年収500万円〜700万円')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('JPY');
  });
});

describe('ProjectCard 媒体の自由入力値', () => {
  it('未知の媒体名(Green等)をそのまま表示する', () => {
    render(<ProjectCard project={makeProject({
      client_name: null, media: 'Green', project_url: 'https://type.jp/job-1/1/',
    })} variant="active" />);

    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});

describe('ProjectCard 一覧の読みやすさ', () => {
  it('長い案件名は2行までのクランプで省略する', () => {
    const longName = 'とても長い案件名'.repeat(12);
    render(<ProjectCard project={makeProject({ name: longName })} variant="active" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.className).toContain('line-clamp-2');
    expect(heading.className).toContain('break-words');
  });

  it('一覧では報酬・応募締切・媒体・クライアントを出す', () => {
    render(<ProjectCard project={makeProject({
      reward_text: '年収500万円', deadline: '2099-12-31',
      media: 'type', client_name: '株式会社サンプル',
    })} variant="active" />);

    expect(screen.getByText('報酬')).toBeInTheDocument();
    expect(screen.getByText('応募締切')).toBeInTheDocument();
    expect(screen.getByText('媒体')).toBeInTheDocument();
    expect(screen.getByText('クライアント')).toBeInTheDocument();
    expect(screen.getByText('株式会社サンプル')).toBeInTheDocument();
  });

  it('一覧にはURL全文や職種・勤務地・雇用形態を常時出さない', () => {
    render(<ProjectCard project={makeProject({
      type: 'career',
      project_url: 'https://type.jp/job-1/1350132_detail/?pathway=116',
      job_type: 'Webバックエンド', location: '東京', employment_type: 'FULL_TIME',
    })} variant="active" />);

    expect(screen.queryByText('https://type.jp/job-1/1350132_detail/?pathway=116')).not.toBeInTheDocument();
    expect(screen.queryByText('Webバックエンド')).not.toBeInTheDocument();
    expect(screen.queryByText('東京')).not.toBeInTheDocument();
    expect(screen.queryByText('正社員')).not.toBeInTheDocument();
  });

  it('締切の色分けルールは維持する', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T09:00:00+09:00'));
    try {
      render(<ProjectCard project={makeProject({ deadline: '2026-09-01' })} variant="active" />);
      expect(screen.getByText('2026-09-01').className).toContain('text-red-600');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ProjectCard 詳細の表示', () => {
  const detailed = makeProject({
    type: 'career',
    name: '案件',
    description: '一行目\n\n三行目',
    project_url: 'https://type.jp/job-1/1350132_detail/?pathway=116',
    reward_text: '5000000 JPY (YEAR)',
    media: 'type',
    client_name: '株式会社サンプル',
    job_type: 'Webバックエンド',
    location: '東京',
    employment_type: 'FULL_TIME',
    memo: '面談メモ',
  });

  it('詳細を開くと各項目が表示される', () => {
    render(<ProjectCard project={detailed} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    // 一覧にも同じ項目名が出るため、詳細領域に限定して確認する。
    const detail = within(document.getElementById('project-detail-1')!);
    for (const label of ['募集内容', '案件URL', '報酬', '媒体', 'クライアント', '職種', '勤務地', '雇用形態', 'メモ']) {
      expect(detail.getByText(label)).toBeInTheDocument();
    }
    expect(detail.getByText('転職専用項目')).toBeInTheDocument();
  });

  it('募集内容は全文を段落・改行を維持して表示する', () => {
    render(<ProjectCard project={detailed} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    const detail = within(document.getElementById('project-detail-1')!);
    const body = detail.getByText(/一行目/);
    expect(body.className).toContain('whitespace-pre-wrap');
    expect(body.textContent).toContain('三行目');
  });

  it('長いURLは折り返せるようにする', () => {
    render(<ProjectCard project={detailed} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    const link = screen.getByRole('link');
    expect(link.className).toContain('break-all');
  });

  it('空欄の項目は表示しない', () => {
    render(<ProjectCard project={makeProject({ memo: null, category: null })} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.queryByText('メモ')).not.toBeInTheDocument();
    expect(screen.queryByText('カテゴリ')).not.toBeInTheDocument();
  });

  it('英語の内部値と取込ノイズが詳細に出ない', () => {
    render(<ProjectCard project={{ ...detailed, description: '■仕事内容 ===== 本文 END' }} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    const text = document.body.textContent ?? '';
    expect(text).not.toContain('FULL_TIME');
    expect(text).not.toContain('JPY');
    expect(text).not.toContain('YEN');
    // 保存済みの値はそのまま出すが、雇用形態・報酬は日本語表示になる。
    const detail = within(document.getElementById('project-detail-1')!);
    expect(detail.getByText('正社員')).toBeInTheDocument();
    expect(detail.getByText('年収500万円')).toBeInTheDocument();
  });

  it('編集・ゴミ箱へ移動は詳細の最下部にまとめる', () => {
    render(<ProjectCard project={detailed} variant="active" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.getByText('操作')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ゴミ箱へ移動' })).toBeInTheDocument();
  });
});

describe('ProjectCard variant別の操作', () => {
  it('編集・削除は一覧では出さず、詳細を開いたときだけ出す(誤操作防止)', () => {
    render(<ProjectCard project={makeProject()} variant="active" />);

    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ゴミ箱へ移動' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));

    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ゴミ箱へ移動' })).toBeInTheDocument();
  });

  it('variant=trashでは復元・完全削除ボタンを表示する', () => {
    render(<ProjectCard project={makeProject()} variant="trash" />);
    fireEvent.click(screen.getByRole('button', { name: '詳細を開く' }));
    expect(screen.getByRole('button', { name: '復元' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '完全削除' })).toBeInTheDocument();
  });
});
