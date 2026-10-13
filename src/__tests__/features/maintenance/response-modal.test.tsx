import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { AxiosError, AxiosHeaders } from 'axios';
import { QuoteResponseModal } from '@/features/maintenance/components/QuoteResponseModal';
import type { AdminDetail, AdminQuote } from '@/features/maintenance/types';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const mockPut = jest.mocked(apiClient.put);
const mockPost = jest.mocked(apiClient.post);
const onClose = jest.fn();
const entry: AdminQuote = {
  quote: { quoteId: 101, requestId: 10, vendorId: 1, vendorName: '한결수리', status: 'RECEIVED', quoteType: 'RANGE',
    minAmount: 100000, maxAmount: 150000, travelFeeIncluded: true, materialsFeeIncluded: true,
    availableDates: ['2026-10-08'], conditions: '욕실 수리', sentAt: '2026-10-05T11:00:00',
    respondedAt: '2026-10-05T12:00:00.123456', recordedAt: '2026-10-05T13:00:00', revision: 3 },
  vendorPhone: '02-123-4567', deliveryChannel: 'PHONE', operatorNote: '전화 확인',
};
const detail: AdminDetail = {
  request: { requestId: 10, title: '욕실 수리 요청', vendorIds: [], status: 'COLLECTING', createdAt: '2026-10-05T09:00:00',
    submittedAt: '2026-10-05T10:00:00', collectionStartedAt: '2026-10-05T11:00:00', closesAt: '2099-10-07T11:00:00' },
  userId: 7, landlordLabel: '임대인 #7',
  counts: { targetCount: 1, receivedCount: 1, pricedQuoteCount: 1, declinedCount: 0, pendingCount: 0, pendingDispatchCount: 0, waitingCount: 0, delayedCount: 0, rejectedCount: 0 },
  photos: [], quotes: [entry], deliveryContent: { title: '욕실 수리 요청', category: 'PLUMBING', description: '누수', areaName: '강남구', preferredTiming: 'ASAP' },
};
function open(target = entry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['maintenance', 'detail', 10], detail);
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <QuoteResponseModal detail={detail} entry={target} onClose={onClose} />
  </App></ConfigProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => { jest.clearAllMocks(); });

test('기존 견적 정정은 revision과 정밀 회신 시각을 보존하여 앱에 반영한다', async () => {
  mockPost.mockResolvedValue({ data: detail });
  open();
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByLabelText('작업비 최소 (원)')).toHaveValue('100000'));
  fireEvent.change(within(dialog).getByLabelText('작업비 최소 (원)'), { target: { value: '110000' } });
  fireEvent.change(within(dialog).getByLabelText('정정 사유 (관리자 전용)'), { target: { value: ' 업체와 재확인 ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '정정 반영' }));
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/admin/maintenance-quotes/101/corrections', expect.objectContaining({
    expectedRevision: 3, reason: '업체와 재확인', response: expect.objectContaining({ minAmount: 110000, respondedAt: '2026-10-05T12:00:00.123456', operatorNote: '전화 확인' }),
  })));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(mockPut).not.toHaveBeenCalled();
});

test('정정 사유가 없으면 정정 요청을 보내지 않고 폼을 유지한다', async () => {
  open();
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '정정 반영' }));
  await waitFor(() => expect(within(dialog).getByLabelText('정정 사유 (관리자 전용)')).toHaveAttribute('aria-invalid', 'true'));
  expect(mockPost).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('409 충돌이면 입력한 수정 내용을 보존하고 기존 상세 캐시를 무효화한다', async () => {
  const headers = new AxiosHeaders();
  mockPost.mockRejectedValue(new AxiosError('conflict', undefined, undefined, undefined, {
    status: 409, statusText: 'Conflict', headers, config: { headers },
    data: { type: '/problems/maintenance-state-conflict', title: '다른 관리자가 먼저 수정했습니다', status: 409, detail: '최신 견적을 확인해 주세요.' },
  }));
  const client = open();
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByLabelText('작업비 최소 (원)')).toHaveValue('100000'));
  fireEvent.change(within(dialog).getByLabelText('작업비 최소 (원)'), { target: { value: '120000' } });
  fireEvent.change(within(dialog).getByLabelText('정정 사유 (관리자 전용)'), { target: { value: '금액 재확인' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '정정 반영' }));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(client.getQueryState(['maintenance', 'detail', 10])?.isInvalidated).toBe(true));
  expect(within(dialog).getByLabelText('작업비 최소 (원)')).toHaveValue('120000');
  expect(within(dialog).getByLabelText('정정 사유 (관리자 전용)')).toHaveValue('금액 재확인');
  expect(onClose).not.toHaveBeenCalled();
});

test('범위 견적을 작업 불가로 정정하면 숨겨진 이전 금액과 방문일을 전송하지 않는다', async () => {
  mockPost.mockResolvedValue({ data: detail });
  open();
  const dialog = await screen.findByRole('dialog');
  fireEvent.mouseDown(within(dialog).getByLabelText('회신 유형'));
  fireEvent.click(await screen.findByText('작업 불가', { selector: '.ant-select-item-option-content' }));
  const reason = await within(dialog).findByLabelText('작업 불가 사유 (임대인 공개)');
  fireEvent.change(reason, { target: { value: '일정 조정 불가' } });
  fireEvent.change(within(dialog).getByLabelText('정정 사유 (관리자 전용)'), { target: { value: '업체 회신 재확인' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '정정 반영' }));
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/v1/admin/maintenance-quotes/101/corrections', expect.objectContaining({
    response: expect.objectContaining({ status: 'DECLINED', quoteType: null, declineReason: '일정 조정 불가',
      minAmount: null, maxAmount: null, travelFeeIncluded: null, materialsFeeIncluded: null, availableDates: [] }),
  })));
});
