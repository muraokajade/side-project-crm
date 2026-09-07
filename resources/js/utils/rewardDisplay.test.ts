import { describe, it, expect } from 'vitest';
import { formatRewardText, rewardDisplay } from './rewardDisplay';

describe('formatRewardText 年収表記の整形', () => {
  it('レンジの年収を「年収500万円〜1,500万円」へ整形する', () => {
    expect(formatRewardText('5000000〜15000000 JPY (YEAR)')).toBe('年収500万円〜1,500万円');
  });

  it('単額の年収を「年収500万円」へ整形する', () => {
    expect(formatRewardText('5000000 JPY (YEAR)')).toBe('年収500万円');
  });

  it('全角チルダのレンジも整形する', () => {
    expect(formatRewardText('4000000～6000000 JPY (YEAR)')).toBe('年収400万円〜600万円');
  });

  it('桁区切り付きの入力も整形する', () => {
    expect(formatRewardText('5,000,000 JPY (YEAR)')).toBe('年収500万円');
  });

  it('万で割り切れない額は円表記へ落とし、端数を丸めない', () => {
    expect(formatRewardText('5005000 JPY (YEAR)')).toBe('年収5,005,000円');
    expect(formatRewardText('355000 JPY (MONTH)')).toBe('月給355,000円');
  });
});

describe('formatRewardText 月給・YEN表記', () => {
  it('JPY (MONTH) を月給表記へ整形する', () => {
    expect(formatRewardText('350000 JPY (MONTH)')).toBe('月給35万円');
  });

  it('YEN (MONTH) も同じく整形する', () => {
    expect(formatRewardText('350000 YEN (MONTH)')).toBe('月給35万円');
  });

  it('YEN (YEAR) を年収表記へ整形する', () => {
    expect(formatRewardText('5000000 YEN (YEAR)')).toBe('年収500万円');
  });

  it('月給のレンジを整形する', () => {
    expect(formatRewardText('350000〜500000 JPY (MONTH)')).toBe('月給35万円〜50万円');
  });

  it('年収のレンジを整形する', () => {
    expect(formatRewardText('5000000〜7000000 JPY (YEAR)')).toBe('年収500万円〜700万円');
  });

  it('画面にJPY/YENの内部値を出さない', () => {
    for (const input of ['350000 JPY (MONTH)', '5000000 YEN (YEAR)']) {
      const out = formatRewardText(input);
      expect(out).not.toContain('JPY');
      expect(out).not.toContain('YEN');
      expect(out).not.toContain('MONTH');
      expect(out).not.toContain('YEAR');
    }
  });
});

describe('formatRewardText 加工しない値', () => {
  it('「応相談」はそのまま返す', () => {
    expect(formatRewardText('応相談')).toBe('応相談');
  });

  it('時給・日給表記はそのまま返す', () => {
    expect(formatRewardText('時給2,000円〜')).toBe('時給2,000円〜');
    expect(formatRewardText('2000 JPY (HOUR)')).toBe('2000 JPY (HOUR)');
    expect(formatRewardText('20000 JPY (DAY)')).toBe('20000 JPY (DAY)');
  });

  it('日本語の固定報酬表記はそのまま返す', () => {
    expect(formatRewardText('固定報酬制 80,000円')).toBe('固定報酬制 80,000円');
  });

  it('通貨がJPY以外なら加工しない', () => {
    expect(formatRewardText('50000 USD (YEAR)')).toBe('50000 USD (YEAR)');
  });

  it('0を含む年収表記は整形せず原文のまま返す(0円扱いにしない)', () => {
    expect(formatRewardText('0 JPY (YEAR)')).toBe('0 JPY (YEAR)');
    expect(formatRewardText('0〜15000000 JPY (YEAR)')).toBe('0〜15000000 JPY (YEAR)');
  });
});

describe('rewardDisplay 表示の優先順位', () => {
  const base = { reward: null as number | null, reward_text: null as string | null };

  it('reward_textがあれば整形して表示する', () => {
    expect(rewardDisplay({ ...base, reward_text: '5000000〜15000000 JPY (YEAR)' }))
      .toBe('年収500万円〜1,500万円');
  });

  it('reward_textが加工対象外ならそのまま表示する', () => {
    expect(rewardDisplay({ ...base, reward_text: '応相談' })).toBe('応相談');
  });

  it('reward_textとrewardが両方あってもreward_textを優先する', () => {
    expect(rewardDisplay({ reward: 2000, reward_text: '時給 2,000円' })).toBe('時給 2,000円');
  });

  it('reward_textが空ならrewardを桁区切りで表示する', () => {
    expect(rewardDisplay({ ...base, reward: 80000 })).toBe('80,000円');
  });

  it('どちらも無ければ「未掲載」とし、0円にしない', () => {
    expect(rewardDisplay(base)).toBe('未掲載');
  });
});
