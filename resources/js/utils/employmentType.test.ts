import { describe, it, expect } from 'vitest';
import { employmentTypeDisplay } from './employmentType';

describe('employmentTypeDisplay 雇用形態の日本語化', () => {
  it('英語の内部値を日本語へ変換する', () => {
    expect(employmentTypeDisplay('FULL_TIME')).toBe('正社員');
    expect(employmentTypeDisplay('CONTRACTOR')).toBe('契約社員');
    expect(employmentTypeDisplay('FREELANCE')).toBe('業務委託');
    expect(employmentTypeDisplay('INDEPENDENT_CONTRACTOR')).toBe('業務委託');
    expect(employmentTypeDisplay('PART_TIME')).toBe('アルバイト・パート');
    expect(employmentTypeDisplay('TEMPORARY')).toBe('派遣社員');
    expect(employmentTypeDisplay('DISPATCH')).toBe('派遣社員');
  });

  it('複数指定は区切って変換する', () => {
    expect(employmentTypeDisplay('FULL_TIME,CONTRACTOR')).toBe('正社員/契約社員');
    expect(employmentTypeDisplay('FULL_TIME/PART_TIME')).toBe('正社員/アルバイト・パート');
  });

  it('同じ日本語へ寄る値は重複させない', () => {
    expect(employmentTypeDisplay('FREELANCE,INDEPENDENT_CONTRACTOR')).toBe('業務委託');
  });

  it('もともと日本語の値はそのまま返す', () => {
    expect(employmentTypeDisplay('正社員')).toBe('正社員');
    expect(employmentTypeDisplay('正社員/契約社員')).toBe('正社員/契約社員');
  });

  it('未知の値は推測せずそのまま返す', () => {
    expect(employmentTypeDisplay('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('空・nullはnullを返す', () => {
    expect(employmentTypeDisplay(null)).toBeNull();
    expect(employmentTypeDisplay('')).toBeNull();
  });
});
