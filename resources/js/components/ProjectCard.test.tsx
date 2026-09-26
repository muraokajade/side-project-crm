import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ProjectCard, { ProjectListHeader, deadlineState } from './ProjectCard';
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

/** 行ぜんぶが「詳細を開く」導線。読み上げ名は案件名を含む。 */
const row = (name = 'テスト案件') => screen.getByRole('button', { name: `${name} の詳細を開く` });

describe('ProjectCard 一覧行が出す情報', () => {
  it('案件名・会社名・報酬・締切・ステータス・種別だけを出す', () => {
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
        onOpen={() => {}}
      />
    );

    expect(screen.getByText('フロント改修')).toBeInTheDocument();
    expect(screen.getByText('株式会社サンプル')).toBeInTheDocument();
    expect(screen.getByText('80,000円')).toBeInTheDocument();
    expect(screen.getByText('2099-12-31')).toBeInTheDocument();
    expect(screen.getByText('応募済み')).toBeInTheDocument();
    expect(screen.getByText('副業')).toBeInTheDocument();
  });

  it('募集内容の抜粋は一覧に出さない(詳細に任せる)', () => {
    const long = 'あ'.repeat(400);
    const { container } = render(
      <ProjectCard project={makeProject({ description: long })} onOpen={() => {}} />
    );

    expect(screen.queryByText(new RegExp('^あ+…?$'))).not.toBeInTheDocument();
    // DOMにも本文を載せない。
    expect(container.textContent).not.toContain('あああ');
  });

  it('カテゴリ・応募日・次アクション・URL・職種などは一覧に出さない', () => {
    const { container } = render(
      <ProjectCard
        project={makeProject({
          type: 'career',
          category: 'Web開発',
          applied_date: '2026-08-01',
          next_action: '面談日程を調整',
          memo: 'メモ本文',
          project_url: 'https://type.jp/job-1/1350132_detail/',
          job_type: 'Webバックエンド',
          location: '東京',
          employment_type: 'FULL_TIME',
        })}
        onOpen={() => {}}
      />
    );

    for (const text of ['Web開発', '2026-08-01', '面談日程を調整', 'メモ本文',
                        'https://type.jp/job-1/1350132_detail/', 'Webバックエンド', '東京', '正社員']) {
      expect(container.textContent).not.toContain(text);
    }
  });

  it('クライアント名が無ければ媒体を代わりに出す', () => {
    render(<ProjectCard project={makeProject({ client_name: null, media: 'CrowdWorks' })} onOpen={() => {}} />);

    expect(screen.getByText('CrowdWorks')).toBeInTheDocument();
  });

  it('クライアント名があれば媒体は一覧に出さない', () => {
    render(
      <ProjectCard project={makeProject({ client_name: '株式会社サンプル', media: 'CrowdWorks' })} onOpen={() => {}} />
    );

    expect(screen.getByText('株式会社サンプル')).toBeInTheDocument();
    expect(screen.queryByText('CrowdWorks')).not.toBeInTheDocument();
  });

  it('報酬が無ければ「未掲載」とし、0円にしない', () => {
    render(<ProjectCard project={makeProject()} onOpen={() => {}} />);

    expect(screen.getByText('未掲載')).toBeInTheDocument();
  });

  it('機械的な年収表記は一覧でも読みやすい形にする', () => {
    render(<ProjectCard project={makeProject({ reward_text: '5000000〜15000000 JPY (YEAR)' })} onOpen={() => {}} />);

    expect(screen.getByText('年収500万円〜1,500万円')).toBeInTheDocument();
  });

  it('締切が無ければ締切の表示を出さない', () => {
    render(<ProjectCard project={makeProject({ deadline: null })} onOpen={() => {}} />);

    expect(screen.queryByText('締切')).not.toBeInTheDocument();
  });
});

describe('ProjectCard 行を開く導線', () => {
  it('行ぜんぶが押せて、押すとonOpenへその案件を渡す', () => {
    const onOpen = vi.fn();
    const project = makeProject({ name: 'フロント改修' });
    render(<ProjectCard project={project} onOpen={onOpen} />);

    fireEvent.click(row('フロント改修'));

    expect(onOpen).toHaveBeenCalledWith(project);
  });

  it('行の中に別のボタンを置かない(押し先が競合しない)', () => {
    render(<ProjectCard project={makeProject()} onOpen={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('編集・削除の導線は一覧に出さない(詳細パネルに集約する)', () => {
    render(<ProjectCard project={makeProject()} onOpen={() => {}} />);

    for (const name of ['編集', 'ゴミ箱へ移動', '復元', '完全削除']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('選択中の行は面を変えて、詳細パネルとの対応を示す', () => {
    const { rerender } = render(<ProjectCard project={makeProject()} onOpen={() => {}} />);
    expect(row().className).toContain('bg-white');

    rerender(<ProjectCard project={makeProject()} selected onOpen={() => {}} />);
    expect(row().className).toContain('bg-slate-100');
  });
});

describe('ProjectCard 一覧の読みやすさ', () => {
  it('長い案件名は1行truncateで省略する', () => {
    const longName = 'とても長い案件名'.repeat(12);
    render(<ProjectCard project={makeProject({ name: longName })} onOpen={() => {}} />);

    const title = screen.getByText(longName);
    expect(title.className).toContain('truncate');
    expect(title.className).not.toContain('line-clamp-2');
  });

  it('PCでは案件名・会社・報酬・締切が同じ列に揃う', () => {
    render(<ProjectCard project={makeProject()} onOpen={() => {}} />);

    // 行と列見出しが同じグリッド定義を共有していることを、クラス名で確認する。
    expect(row().className).toContain('md:grid-cols-');
  });

  it('PCの列幅(ステータス列6rem・案件名列の可変幅)は変えていない', () => {
    render(<ProjectCard project={makeProject()} onOpen={() => {}} />);

    expect(row()).toHaveClass('md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_7rem_5.5rem_6rem_2.5rem]');
  });

  it('列見出しは行と同じグリッド定義を使う', () => {
    const { container } = render(<ProjectListHeader />);

    const header = container.firstElementChild!;
    expect(header.className).toContain('md:grid-cols-');
    for (const label of ['案件名', '会社名', '報酬', '締切', 'ステータス']) {
      expect(header.textContent).toContain(label);
    }
  });

  it('一覧では会社名・報酬の項目名を出さない(値だけで嵩張らせない)', () => {
    const { container } = render(
      <ProjectCard
        project={makeProject({ reward_text: '年収500万円', client_name: '株式会社サンプル' })}
        onOpen={() => {}}
      />
    );

    expect(container.textContent).not.toContain('クライアント');
    expect(container.textContent).not.toContain('報酬');
  });
});

// jsdomはCSSを適用しないため、狭幅の段組みは order の指定で確認する。
describe('ProjectCard スマホの情報階層', () => {
  const renderSample = () =>
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
        onOpen={() => {}}
      />
    );
  /** order指定を持つ、行の中の要素(値の入れ物)。 */
  const cell = (text: string) => screen.getByText(text).closest('[class*="max-md:order-"]')!;

  it('1段目は案件名とステータス、2段目は会社名・報酬、その後ろに締切・種別の順で並ぶ', () => {
    renderSample();

    expect(cell('フロント改修')).toHaveClass('max-md:order-1');
    expect(cell('応募済み')).toHaveClass('max-md:order-2');
    expect(cell('株式会社サンプル')).toHaveClass('max-md:order-4');
    expect(cell('80,000円')).toHaveClass('max-md:order-5');
    expect(cell('2099-12-31')).toHaveClass('max-md:order-6');
    expect(cell('副業')).toHaveClass('max-md:order-7');
  });

  it('1段目と2段目の間で必ず折り返し、区切りはPCでは出さない', () => {
    const { container } = renderSample();

    const breaker = container.querySelector('.max-md\\:order-3')!;
    expect(breaker).toHaveClass('max-md:basis-full', 'md:hidden');
    expect(breaker.textContent).toBe('');
  });

  it('案件名を最も強く、ステータスはそれより控えめに出す', () => {
    renderSample();

    expect(screen.getByText('フロント改修')).toHaveClass('text-sm', 'font-medium', 'text-slate-800');
    // ステータスの文字は親の text-xs を受け継ぎ、案件名より小さい。
    expect(cell('応募済み')).not.toHaveClass('text-sm');
    expect(cell('応募済み')).toHaveClass('max-md:shrink-0');
  });

  it('締切・種別は右へ寄せ、種別はステータスの隣に置かない', () => {
    renderSample();

    expect(cell('2099-12-31')).toHaveClass('max-md:ml-auto');
    expect(cell('副業')).toHaveClass('max-md:ml-0');
  });

  it('PCの列はDOM順で決まるため、案件名・会社・報酬・締切・ステータス・種別の順を保つ', () => {
    renderSample();

    const text = row('フロント改修').textContent!;
    const order = ['フロント改修', '株式会社サンプル', '80,000円', '2099-12-31', '応募済み', '副業'].map(t =>
      text.indexOf(t)
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order).not.toContain(-1);
  });
});

describe('ProjectCard ステータス表示', () => {
  /** 一覧のステータスは「段階メーター + 色付き文字」で1つのまとまり。 */
  const meter = () => screen.getByRole('img', { name: /^進み具合/ });
  const segments = () => Array.from(meter().children);
  const filledCount = () => meter().querySelectorAll('[data-filled="true"]').length;
  const renderStatus = (status: string, type: Project['type'] = 'career') =>
    render(<ProjectCard project={makeProject({ status, type })} onOpen={() => {}} />);

  it('ステータス名の直前に、常に6マスの段階メーターを置く', () => {
    renderStatus('書類選考');

    const status = screen.getByText('書類選考').parentElement!;
    expect(status).toContainElement(meter());
    expect(status.firstElementChild).toBe(meter());
    expect(segments()).toHaveLength(6);
  });

  it('到達した段階の数だけマスを塗り、aria-labelでも同じ数を読めるようにする', () => {
    const cases: [string, Project['type'], number][] = [
      ['気になる', 'career', 0],
      ['書類選考', 'career', 3],
      ['内定', 'career', 6],
      ['契約', 'side_job', 4],
      ['完了', 'side_job', 6],
    ];
    for (const [status, type, step] of cases) {
      const { unmount } = renderStatus(status, type);
      expect(filledCount()).toBe(step);
      expect(meter()).toHaveAccessibleName(`進み具合 ${step}/6`);
      unmount();
    }
  });

  it('塗られたマスは進捗グループの色、未到達のマスは薄いslateにする', () => {
    renderStatus('書類選考');

    const [filled, , , empty] = segments();
    expect(filled).toHaveClass('bg-blue-500');
    expect(empty).toHaveClass('bg-slate-200');
  });

  it('見送りは段階として数えず、マスの代わりに終了を示す線を出す', () => {
    renderStatus('見送り');

    expect(meter()).toHaveAccessibleName('進み具合 終了');
    expect(meter().querySelectorAll('[data-filled]')).toHaveLength(0);
    expect(meter().querySelector('.border-dashed')).not.toBeNull();
    expect(screen.getByText('見送り').parentElement).toHaveClass('text-slate-400');
  });

  it('ステータス名は進捗グループの色で出し、塗りバッジにしない', () => {
    renderStatus('内定');

    const status = screen.getByText('内定').parentElement!;
    expect(status).toHaveClass('text-green-700');
    expect(status.className).not.toContain('bg-');
  });

  it('未知のステータスでも色で意味を作らず、0段階・中立の見た目で出す', () => {
    renderStatus('未知の状態');

    expect(filledCount()).toBe(0);
    expect(screen.getByText('未知の状態').parentElement).toHaveClass('text-slate-600');
  });

  it('列幅が足りないときは、メーターを残してステータス名の方を省略する', () => {
    renderStatus('書類選考');

    expect(meter()).toHaveClass('shrink-0');
    expect(screen.getByText('書類選考')).toHaveClass('min-w-0', 'truncate');
  });

  it('案件名の手前には状態の印を置かない', () => {
    render(<ProjectCard project={makeProject({ name: 'フロント改修' })} onOpen={() => {}} />);

    const nameCell = screen.getByText('フロント改修').parentElement!;
    expect(within(nameCell).queryByRole('img', { name: /^進み具合/ })).toBeNull();
  });

  it('メーターの上を押しても、行と同じく詳細が開く', () => {
    const onOpen = vi.fn();
    const project = makeProject({ status: '面接', type: 'career' });
    render(<ProjectCard project={project} onOpen={onOpen} />);

    fireEvent.click(meter());

    expect(onOpen).toHaveBeenCalledWith(project);
  });

  it('種別は背景バッジにせず、文字だけで出す', () => {
    render(<ProjectCard project={makeProject({ type: 'career' })} onOpen={() => {}} />);

    const type = screen.getByText('転職');
    expect(type.className).not.toContain('bg-purple');
    expect(type.className).not.toContain('bg-emerald');
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
    render(<ProjectCard project={makeProject({ deadline: '2026-08-31' })} onOpen={() => {}} />);
    expect(screen.getByText('2026-08-31').className).toContain('text-red-600');
  });

  it('締切7日以内は黄字で強調する', () => {
    render(<ProjectCard project={makeProject({ deadline: '2026-09-05' })} onOpen={() => {}} />);
    expect(screen.getByText('2026-09-05').className).toContain('text-amber-600');
  });

  it('まだ余裕がある締切は強調しない', () => {
    render(<ProjectCard project={makeProject({ deadline: '2026-12-31' })} onOpen={() => {}} />);
    const el = screen.getByText('2026-12-31');
    expect(el.className).not.toContain('text-red-600');
    expect(el.className).not.toContain('text-amber-600');
  });

  it('deadlineStateの判定ルールは維持する', () => {
    const today = new Date(2026, 8, 1);
    expect(deadlineState('2026-08-31', today)).toBe('overdue');
    expect(deadlineState('2026-09-05', today)).toBe('soon');
    expect(deadlineState('2026-12-31', today)).toBe('normal');
  });
});
