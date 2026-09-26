import { describe, it, expect } from 'vitest';
import { buildDemoProjects } from './demoProjects';
import { deadlineState } from '../components/ProjectCard';

describe('buildDemoProjects', () => {
  const base = new Date(2026, 8, 23); // 2026-09-23（ローカル日付）

  it('転職3件・副業1件で、機能をひと通り見せられる件数になっている', () => {
    const demo = buildDemoProjects(base);

    expect(demo).toHaveLength(4);
    expect(demo.filter(p => p.type === 'career')).toHaveLength(3);
    expect(demo.filter(p => p.type === 'side_job')).toHaveLength(1);
  });

  it('副業可否はOK/NG/不明がそろっている', () => {
    const demo = buildDemoProjects(base);
    const allowed = demo
      .filter(p => p.type === 'career')
      .map(p => p.side_job_allowed)
      .sort();

    expect(allowed).toEqual(['ng', 'ok', 'unknown']);
  });

  it('idは負の数で、実案件(正の自動採番)と衝突しない', () => {
    const demo = buildDemoProjects(base);

    demo.forEach(p => expect(p.id).toBeLessThan(0));
    // 同じidが混ざっていない（Reactのkeyとして使うため）。
    expect(new Set(demo.map(p => p.id)).size).toBe(demo.length);
  });

  it('URLは文書用に予約されたexample.comだけを使う（実在求人を指さない）', () => {
    buildDemoProjects(base).forEach(p => {
      expect(p.project_url).toMatch(/^https:\/\/example\.com\//);
    });
  });

  it('会社名は架空で、個人名やメールアドレスを含まない', () => {
    const demo = buildDemoProjects(base);
    const text = JSON.stringify(demo);

    expect(demo.map(p => p.client_name)).toEqual([
      '架空テック株式会社',
      'サンプル商会株式会社',
      'デモラボ合同会社',
      'テストワークス株式会社',
    ]);
    // メールアドレス・電話番号らしき文字列を含まない。
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text).not.toMatch(/0\d{1,4}-\d{1,4}-\d{3,4}/);
  });

  it('締切は基準日からの相対日付なので、時間が経っても全部が期限切れにならない', () => {
    const demo = buildDemoProjects(base);
    const deadlines = demo.map(p => p.deadline).filter((d): d is string => d !== null);

    expect(deadlines.length).toBeGreaterThan(0);
    deadlines.forEach(d => expect(deadlineState(d, base)).not.toBe('overdue'));
    // 「締切間近(soon)」と「通常」の両方があり、色分けがデモとして成立する。
    expect(deadlines.some(d => deadlineState(d, base) === 'soon')).toBe(true);
    expect(deadlines.some(d => deadlineState(d, base) === 'normal')).toBe(true);
  });

  it('実データを一切参照せず、呼ぶたびに同じ内容を新しく作る（共有状態を持たない）', () => {
    const a = buildDemoProjects(base);
    const b = buildDemoProjects(base);

    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b[0]);
  });
});
