import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UrlImportModal from './UrlImportModal';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    json: async () => body,
  } as Response;
}

describe('UrlImportModal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fillUrlAndSubmit = (url: string) => {
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: url } });
    fireEvent.click(screen.getByRole('button', { name: '取得する' }));
  };

  it('preview成功時、取得内容をonPreviewReadyへフォームデータとして渡す', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(200, {
      data: {
        project_url: 'https://example.com/job/1',
        type: 'side_job',
        name: 'OGP案件タイトル',
        description: 'OGPの説明文',
        client_name: null,
        media: 'example.com',
        category: null,
        reward: 60000,
        reward_text: '固定報酬制 60,000円',
        working_hours: null,
        applicant_count: null,
        recruitment_count: null,
        deadline: null,
        job_type: null,
        location: null,
        remote_type: null,
        employment_type: null,
        contract_type: null,
        delivery_date: null,
        fetched_at: '2026-08-22T00:00:00+00:00',
        fetch_status: 'success',
        warnings: [],
      },
    }));

    const onPreviewReady = vi.fn();
    render(<UrlImportModal open onClose={() => {}} onPreviewReady={onPreviewReady} />);

    fillUrlAndSubmit('https://example.com/job/1');

    await waitFor(() => expect(onPreviewReady).toHaveBeenCalledTimes(1));
    const [formData, notice] = onPreviewReady.mock.calls[0];
    expect(formData.name).toBe('OGP案件タイトル');
    expect(formData.description).toBe('OGPの説明文');
    expect(formData.reward).toBe('60000');
    expect(formData.reward_text).toBe('固定報酬制 60,000円');
    expect(formData.project_url).toBe('https://example.com/job/1');
    expect(notice).toEqual({ fetchStatus: 'success', warnings: [] });
  });

  it('fetch_status=partialとwarningsをそのままnoticeへ渡す', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(200, {
      data: {
        project_url: 'https://example.com/',
        type: 'side_job',
        name: null,
        description: null,
        client_name: null,
        media: 'example.com',
        category: null,
        reward: null,
        reward_text: null,
        working_hours: null,
        applicant_count: null,
        recruitment_count: null,
        deadline: null,
        job_type: null,
        location: null,
        remote_type: null,
        employment_type: null,
        contract_type: null,
        delivery_date: null,
        fetched_at: '2026-08-22T00:00:00+00:00',
        fetch_status: 'partial',
        warnings: ['ページからタイトルを取得できなかったため、手入力が必要です。'],
      },
    }));

    const onPreviewReady = vi.fn();
    render(<UrlImportModal open onClose={() => {}} onPreviewReady={onPreviewReady} />);

    fillUrlAndSubmit('https://example.com/');

    await waitFor(() => expect(onPreviewReady).toHaveBeenCalledTimes(1));
    const [, notice] = onPreviewReady.mock.calls[0];
    expect(notice.fetchStatus).toBe('partial');
    expect(notice.warnings).toEqual(['ページからタイトルを取得できなかったため、手入力が必要です。']);
  });

  it('取得失敗時(SSRF拒否等)はエラーメッセージを表示し、onPreviewReadyは呼ばれない', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(422, {
      message: 'アクセスが許可されていないホストです。',
      error_code: 'blocked_host',
    }));

    const onPreviewReady = vi.fn();
    render(<UrlImportModal open onClose={() => {}} onPreviewReady={onPreviewReady} />);

    fillUrlAndSubmit('http://127.0.0.1/');

    await waitFor(() => expect(screen.getByText('アクセスが許可されていないホストです。')).toBeInTheDocument());
    expect(onPreviewReady).not.toHaveBeenCalled();
  });

  it('通信自体に失敗した場合は汎用エラーを表示する', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    render(<UrlImportModal open onClose={() => {}} onPreviewReady={() => {}} />);

    fillUrlAndSubmit('https://example.com/');

    await waitFor(() => expect(screen.getByText('通信に失敗しました。ネットワーク状態を確認してください。')).toBeInTheDocument());
  });

  it('取得中に連続でクリックしても取得リクエストは1回だけ送信される', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<Response>(resolve => { resolveFetch = resolve; })
    );

    render(<UrlImportModal open onClose={() => {}} onPreviewReady={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://example.com/' } });
    const button = screen.getByRole('button', { name: '取得する' });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse(200, {
      data: {
        project_url: 'https://example.com/', type: 'side_job', name: 'タイトル', description: null,
        client_name: null, media: null, category: null, reward: null, reward_text: null, working_hours: null,
        applicant_count: null, recruitment_count: null, deadline: null, job_type: null, location: null,
        remote_type: null, employment_type: null, contract_type: null, delivery_date: null,
        fetched_at: '2026-08-22T00:00:00+00:00', fetch_status: 'success', warnings: [],
      },
    }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
