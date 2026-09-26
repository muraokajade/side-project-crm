import { describe, it, expect } from 'vitest';
import { CAREER_STATUS_OPTIONS, SIDE_JOB_STATUS_OPTIONS, statusGroupOf, statusStepOf } from './projectOptions';

describe('statusGroupOf', () => {
  it('careerの全ステータスを、未着手・選考中・成功・見送りへ振り分ける', () => {
    expect(CAREER_STATUS_OPTIONS.map(s => [s, statusGroupOf(s)])).toEqual([
      ['気になる', 'todo'],
      ['応募準備', 'todo'],
      ['応募済み', 'active'],
      ['書類選考', 'active'],
      ['面接', 'active'],
      ['最終面接', 'active'],
      ['内定', 'success'],
      ['見送り', 'closed'],
    ]);
  });

  it('side_jobの全ステータスを、未着手・進行中・完了・見送りへ振り分ける', () => {
    expect(SIDE_JOB_STATUS_OPTIONS.map(s => [s, statusGroupOf(s)])).toEqual([
      ['気になる', 'todo'],
      ['応募準備', 'todo'],
      ['応募済み', 'active'],
      ['返信待ち', 'active'],
      ['面談', 'active'],
      ['選考中', 'active'],
      ['契約', 'active'],
      ['作業中', 'active'],
      ['納品', 'active'],
      ['検収待ち', 'active'],
      ['完了', 'success'],
      ['見送り', 'closed'],
    ]);
  });

  it('未知のステータスは未着手と同じ中立の扱いにする', () => {
    expect(statusGroupOf('旧ステータス')).toBe('todo');
  });
});

describe('statusStepOf', () => {
  it('careerの全ステータスを0〜6段階へ割り当て、見送りは段階を持たない', () => {
    expect(CAREER_STATUS_OPTIONS.map(s => [s, statusStepOf('career', s)])).toEqual([
      ['気になる', 0],
      ['応募準備', 1],
      ['応募済み', 2],
      ['書類選考', 3],
      ['面接', 4],
      ['最終面接', 5],
      ['内定', 6],
      ['見送り', null],
    ]);
  });

  it('side_jobの全ステータスを同じ6段階へまとめ、見送りは段階を持たない', () => {
    expect(SIDE_JOB_STATUS_OPTIONS.map(s => [s, statusStepOf('side_job', s)])).toEqual([
      ['気になる', 0],
      ['応募準備', 1],
      ['応募済み', 2],
      ['返信待ち', 2],
      ['面談', 3],
      ['選考中', 3],
      ['契約', 4],
      ['作業中', 5],
      ['納品', 5],
      ['検収待ち', 5],
      ['完了', 6],
      ['見送り', null],
    ]);
  });

  it('種別の定義に無いステータスは0段階として扱う', () => {
    expect(statusStepOf('career', '旧ステータス')).toBe(0);
    expect(statusStepOf('career', '契約')).toBe(0);
  });
});
