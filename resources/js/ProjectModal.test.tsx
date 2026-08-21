import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectModal from './ProjectModal';

describe('ProjectModal', () => {
  it('errorsで渡されたフィールド別エラーを対応する項目の下に表示する', () => {
    render(
      <ProjectModal
        open
        mode="create"
        project={null}
        errors={{ reward: ['The reward field must be at least 0.'] }}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );
    expect(screen.getByText('The reward field must be at least 0.')).toBeInTheDocument();
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
});
