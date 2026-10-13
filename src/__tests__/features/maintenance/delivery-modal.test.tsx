import '@/test-utils/antd';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { DeliveryModal } from '@/features/maintenance/components/DeliveryModal';
import type { AdminDetail, AdminQuote } from '@/features/maintenance/types';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const mockPut = jest.mocked(apiClient.put);
const onClose = jest.fn();
const entry: AdminQuote = {
  quote: { quoteId: 101, requestId: 10, vendorId: 1, vendorName: '한결수리', status: 'PENDING_DISPATCH',
    availableDates: [], revision: 0, processingStatus: 'WAITING' },
  vendorPhone: '02-123-4567', deliveryChannel: 'PHONE',
};
const detail: AdminDetail = {
  request: { requestId: 10, title: '욕실 수리 요청', vendorIds: [], status: 'COLLECTING', createdAt: '2026-10-05T09:00:00',
    submittedAt: '2026-10-05T10:00:00', collectionStartedAt: '2026-10-05T11:00:00', closesAt: '2099-10-07T11:00:00', processingStatus: 'WAITING' },
  userId: 7, landlordLabel: '임대인 #7',
  counts: { targetCount: 1, receivedCount: 0, pricedQuoteCount: 0, declinedCount: 0, pendingCount: 1, pendingDispatchCount: 0, waitingCount: 1, delayedCount: 0, rejectedCount: 0 },
  photos: [], quotes: [entry], deliveryContent: { title: '욕실 수리 요청', category: 'PLUMBING', description: '누수', areaName: '강남구', preferredTiming: 'ASAP' },
};
function open(target: AdminQuote = entry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <DeliveryModal detail={detail} entry={target} onClose={onClose} />
  </App></ConfigProvider></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); mockPut.mockResolvedValue({ data: detail }); });

test('전달 저장 중에는 중복 제출과 취소를 막고 완료 후 닫는다', async () => {
  let finish!: (result: { data: AdminDetail }) => void;
  mockPut.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  open();
  const dialog = await screen.findByRole('dialog');
  const time = within(dialog).getByLabelText('실제 전달 시각 (서울)');
  fireEvent.change(time, { target: { value: '2026-10-05T11:00:00.123456' } });
  const save = within(dialog).getByRole('button', { name: '전달 기록 저장' });
  fireEvent.click(save);
  fireEvent.click(save);
  await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
  expect(mockPut).toHaveBeenCalledWith('/v1/admin/maintenance-quotes/101/delivery', {
    deliveryChannel: 'PHONE', sentAt: '2026-10-05T11:00:00.123456',
  });
  expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
  expect(time).toBeDisabled();
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape', keyCode: 27 });
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { finish({ data: detail }); });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
