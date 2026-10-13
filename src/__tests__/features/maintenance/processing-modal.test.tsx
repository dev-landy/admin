import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { ProcessingModal } from '@/features/maintenance/components/ProcessingModal';
import type { AdminDetail, AdminQuote } from '@/features/maintenance/types';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const mockPatch = jest.mocked(apiClient.patch);
const onClose = jest.fn();
const entry: AdminQuote = {
  quote: { quoteId: 101, requestId: 10, vendorId: 1, vendorName: '한결수리', status: 'WAITING',
    availableDates: [], sentAt: '2026-10-05T11:00:00', revision: 0, processingStatus: 'WAITING' },
  vendorPhone: '02-123-4567', deliveryChannel: 'PHONE',
};
const detail: AdminDetail = {
  request: { requestId: 10, title: '욕실 수리 요청', vendorIds: [], status: 'COLLECTING', createdAt: '2026-10-05T09:00:00',
    submittedAt: '2026-10-05T10:00:00', collectionStartedAt: '2026-10-05T11:00:00', closesAt: '2099-10-07T11:00:00', processingStatus: 'WAITING' },
  userId: 7, landlordLabel: '임대인 #7',
  counts: { targetCount: 1, receivedCount: 0, pricedQuoteCount: 0, declinedCount: 0, pendingCount: 1, pendingDispatchCount: 0, waitingCount: 1, delayedCount: 0, rejectedCount: 0 },
  photos: [], quotes: [entry], deliveryContent: { title: '욕실 수리 요청', category: 'PLUMBING', description: '누수', areaName: '강남구', preferredTiming: 'ASAP' },
};
function open(target?: AdminQuote) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <ProcessingModal detail={detail} entry={target} onClose={onClose} />
  </App></ConfigProvider></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); mockPatch.mockResolvedValue({ data: detail }); });

test('요청 전체 대기 처리는 요청 경로로 반영한다', async () => {
  open();
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '처리 상태 반영' }));
  await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/v1/admin/maintenance-requests/10/processing', expect.objectContaining({ status: 'WAITING' })));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});
test('업체별 대기 처리는 업체 견적 경로로 반영한다', async () => {
  open(entry);
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: '처리 상태 반영' }));
  await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/v1/admin/maintenance-quotes/101/processing', expect.objectContaining({ status: 'WAITING' })));
});
