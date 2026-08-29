import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectModal from './ProjectModal';

describe('ProjectModal', () => {
  it('errorsで渡されたフィールド別エラーを対応する項目の下に表示する', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        errors={{ reward_text: ['The reward text field must not be greater than 255 characters.'] }}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText('The reward text field must not be greater than 255 characters.')).toBeInTheDocument();
  });

  it('複数フィールドのエラーをそれぞれ表示する', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        errors={{
          name: ['The name field is required.'],
          project_url: ['The project url field must be a valid URL.'],
        }}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText('The name field is required.')).toBeInTheDocument();
    expect(screen.getByText('The project url field must be a valid URL.')).toBeInTheDocument();
  });

  it('errorsが未指定の場合はエラー表示が出ない', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(screen.queryByText(/field/)).not.toBeInTheDocument();
  });

  it('isSubmitting=trueのとき送信ボタンがdisabledになる', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        isSubmitting
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '登録中...' })).toBeDisabled();
  });

  it('isSubmitting=falseのとき送信ボタンは有効', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '登録' })).not.toBeDisabled();
  });

  it('mode=createで送信中は「登録中...」を表示する', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        isSubmitting
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '登録中...' })).toBeInTheDocument();
  });

  it('mode=editで送信中は「更新中...」を表示する', () => {
    render(
      <ProjectModal
        open
        mode="edit"
        project={null}
        isSubmitting
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '更新中...' })).toBeInTheDocument();
  });

  it('mode=editで送信中でない場合は「更新」を表示する', () => {
    render(
      <ProjectModal
        open
        mode="edit"
        project={null}
        isSubmitting={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
  });

  it('open=falseのときは何も表示しない', () => {
    const { container } = render(
      <ProjectModal open={false} mode="create" project={null} onClose={() => {}} onSubmit={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('種別=側業(既定)ではside_job用のステータス選択肢を表示する', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    const status = screen.getByLabelText('ステータス') as HTMLSelectElement;
    const optionValues = Array.from(status.options).map(o => o.value);
    expect(optionValues).toContain('契約');
    expect(optionValues).toContain('納品');
    expect(optionValues).not.toContain('書類選考');
  });

  it('種別を転職へ切り替えるとcareer用のステータス選択肢に変わる', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    fireEvent.change(screen.getByLabelText('種別'), { target: { value: 'career' } });

    const status = screen.getByLabelText('ステータス') as HTMLSelectElement;
    const optionValues = Array.from(status.options).map(o => o.value);
    expect(optionValues).toContain('書類選考');
    expect(optionValues).toContain('内定');
    expect(optionValues).not.toContain('契約');
  });

  it('種別=副業では副業専用項目(契約形態)を表示し、転職専用項目は表示しない', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(screen.getByLabelText('契約形態')).toBeInTheDocument();
    expect(screen.queryByLabelText('職種')).not.toBeInTheDocument();
  });

  it('種別を転職へ切り替えると転職専用項目(職種)を表示し、副業専用項目は消える', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    fireEvent.change(screen.getByLabelText('種別'), { target: { value: 'career' } });

    expect(screen.getByLabelText('職種')).toBeInTheDocument();
    expect(screen.queryByLabelText('契約形態')).not.toBeInTheDocument();
  });

  it('優先度(priority)の入力項目は表示しない', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(screen.queryByText('優先度')).not.toBeInTheDocument();
  });

  it('報酬はreward_textを自由テキストで編集できる', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    const rewardInput = screen.getByLabelText('報酬') as HTMLInputElement;
    fireEvent.change(rewardInput, { target: { value: '応相談' } });
    expect(rewardInput.value).toBe('応相談');
  });

  it('募集内容の入力欄ラベルは「募集内容（抜粋）」である', () => {
    render(
      <ProjectModal open mode="create" project={null} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(screen.getByLabelText('募集内容（抜粋）')).toBeInTheDocument();
  });

  it('fetch_status=partialとwarningsがある場合、注意バナーを表示する', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        notice={{ fetchStatus: 'partial', warnings: ['報酬をレンジ表記等のため自動入力できませんでした。'] }}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText(/一部の項目を自動取得できませんでした/)).toBeInTheDocument();
    expect(screen.getByText('報酬をレンジ表記等のため自動入力できませんでした。')).toBeInTheDocument();
  });
});
