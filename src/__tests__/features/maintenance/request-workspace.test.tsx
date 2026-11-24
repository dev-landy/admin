import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { MaintenanceDetail } from '@/features/maintenance/components/MaintenanceDetail';
import { MaintenanceList } from '@/features/maintenance/components/MaintenanceList';
import type { AdminDetail } from '@/features/maintenance/types';
import { apiClient } from '@/lib/api/client';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearch = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearch),
  usePathname: () => '/maintenance',
}));
jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const mockGet = jest.mocked(apiClient.get);
const detail: AdminDetail = {
  request: { requestId: 10, title: '욕실 수리 요청', category: 'PLUMBING', description: '배관 누수 확인', areaName: '강남구', vendorIds: [], status: 'COLLECTING', closesAt: '2099-10-07T11:00:00', collectionStartedAt: '2026-10-05T11:00:00', createdAt: '2026-10-05T09:00:00', submittedAt: '2026-10-05T10:00:00', processingStatus: 'WAITING' },
  userId: 7, landlordLabel: '임대인 #7',
  counts: { targetCount: 3, receivedCount: 1, pricedQuoteCount: 1, declinedCount: 0, pendingCount: 2, pendingDispatchCount: 1, waitingCount: 1, delayedCount: 1, rejectedCount: 0 },
  photos: [], quotes: [{ quote: { quoteId: 101, requestId: 10, vendorId: 1, vendorName: '한결수리', status: 'RECEIVED', quoteType: 'RANGE', minAmount: 100000, maxAmount: 150000,
    travelFeeIncluded: null, materialsFeeIncluded: true, totalMinAmount: null, totalMaxAmount: null,
    availableDates: [], sentAt: '2026-10-05T11:00:00', respondedAt: '2026-10-05T12:00:00', recordedAt: '2026-10-05T13:00:00', revision: 0 }, vendorPhone: null, operatorNote: '업체와 통화 완료' },
    { quote: { quoteId: 102, requestId: 10, vendorId: 2, vendorName: '두번째 업체', status: 'WAITING', availableDates: [], sentAt: '2026-10-05T11:30:00', revision: 0, processingStatus: 'DELAYED' } },
    { quote: { quoteId: 103, requestId: 10, vendorId: 3, vendorName: '세번째 업체', status: 'PENDING_DISPATCH', availableDates: [], revision: 0, processingStatus: 'WAITING' } },
  ],
  deliveryContent: { title: '욕실 수리 요청', category: 'PLUMBING', description: '누수', areaName: '강남구', preferredTiming: 'ASAP' },
};
function open(content: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>{content}</App></ConfigProvider></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); mockSearch = ''; });

test('알 수 없는 출장비·비교 총액을 0원으로 바꾸지 않고 서버 집계를 표시한다', async () => {
  mockGet.mockResolvedValue({ data: detail });
  open(<MaintenanceDetail requestId={10} />);
  expect(await screen.findByText('한결수리')).toBeInTheDocument();
  expect(screen.getAllByText('미확정').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/^0원$/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('시간 소요 1건')).toBeInTheDocument();
  expect(screen.getByLabelText('대상 업체 3건')).toBeInTheDocument();
  expect(mockGet).toHaveBeenCalledWith('/v1/admin/maintenance-requests/10');
});
test('상세 조회 오류에서 재조회하면 서버 데이터를 다시 보여준다', async () => {
  mockGet.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: detail });
  open(<MaintenanceDetail requestId={10} />);
  fireEvent.click(await screen.findByRole('button', { name: '다시 조회' }));
  expect(await screen.findByText('한결수리')).toBeInTheDocument();
  expect(mockGet).toHaveBeenCalledTimes(2);
});
test('목록의 URL 필터와 1 기반 페이지를 서버에 전달하고 빈 결과를 설명한다', async () => {
  mockSearch = 'page=2&status=COLLECTING&processingStatus=DELAYED&vendorProcessingStatus=WAITING&quoteStatus=WAITING&category=PLUMBING';
  mockGet.mockResolvedValue({ data: { requests: [], page: 2, size: 20, totalElements: 0 } });
  open(<MaintenanceList />);
  expect(await screen.findByText('조건에 맞는 수리 견적 요청이 없습니다.')).toBeInTheDocument();
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/v1/admin/maintenance-requests', { params: expect.objectContaining({
    page: 2, size: 20, status: 'COLLECTING', processingStatus: 'DELAYED', vendorProcessingStatus: 'WAITING', quoteStatus: 'WAITING', category: 'PLUMBING',
  }) }));
});

test('첫 전달 전 요청에는 모집 기한이 아직 정해지지 않았다고 표시한다', async () => {
  mockGet.mockResolvedValue({ data: { ...detail,
    request: { ...detail.request, status: 'SUBMITTED', collectionStartedAt: null, closesAt: null },
    quotes: [detail.quotes[2]],
    counts: { targetCount: 1, receivedCount: 0, pricedQuoteCount: 0, declinedCount: 0, pendingCount: 1, pendingDispatchCount: 1, waitingCount: 0, delayedCount: 0, rejectedCount: 0 },
  } });
  open(<MaintenanceDetail requestId={10} />);
  expect(await screen.findByText('첫 전달 전 · 마감 미정')).toBeInTheDocument();
});
test('목록 행을 누르면 펼치지 않고 현재 필터를 유지한 채 상세로 이동한다', async () => {
  mockSearch = 'status=SUBMITTED';
  mockGet.mockResolvedValue({ data: { requests: [{ requestId: 14, userId: 8, landlordLabel: '임대인 #8', title: 'asdf', status: 'SUBMITTED', processingStatus: 'WAITING', createdAt: '2026-10-05T09:00:00', counts: detail.counts }], page: 1, size: 20, totalElements: 1 } });
  open(<MaintenanceList />);
  const title = await screen.findByText('asdf');
  const row = title.closest('tr')!;
  fireEvent.click(row.querySelector('td:last-child')!);
  expect(mockPush).toHaveBeenCalledWith('/maintenance/14?list=status%3DSUBMITTED');
  expect(row).not.toHaveAttribute('aria-expanded');
});
test('회신을 등록하면 견적 내용이 채워진 임대인 알림 창을 바로 띄운다', async () => {
  const waiting = detail.quotes[1];
  const saved: AdminDetail = { ...detail, counts: { ...detail.counts, receivedCount: 2 }, quotes: [detail.quotes[0],
    { ...waiting, quote: { ...waiting.quote, status: 'RECEIVED', quoteType: 'RANGE', minAmount: 80000, maxAmount: 80000, totalMinAmount: 80000, totalMaxAmount: 80000, respondedAt: '2026-10-05T12:00:00', recordedAt: '2026-10-05T12:00:00' } }, detail.quotes[2]] };
  mockGet.mockResolvedValue({ data: detail });
  jest.mocked(apiClient.put).mockResolvedValue({ data: saved });
  open(<MaintenanceDetail requestId={10} />);
  const card = (await screen.findByText('두번째 업체')).closest('.ant-card') as HTMLElement;
  fireEvent.click(within(card).getByRole('button', { name: '회신 등록' }));
  const form = await screen.findByRole('dialog');
  fireEvent.change(within(form).getByLabelText('작업비 최소 (원)'), { target: { value: '80000' } });
  fireEvent.change(within(form).getByLabelText('작업비 최대 (원)'), { target: { value: '80000' } });
  fireEvent.click(within(form).getByRole('button', { name: '앱에 반영' }));
  expect(await screen.findByText('회신을 저장했어요. 임대인에게 바로 알릴까요?')).toBeInTheDocument();
  const sheet = screen.getByText('회신을 저장했어요. 임대인에게 바로 알릴까요?').closest('[role="dialog"]') as HTMLElement;
  expect(within(sheet).getByLabelText('제목')).toHaveValue('수리 견적이 도착했어요');
  expect(within(sheet).getByLabelText('내용')).toHaveValue('[욕실 수리 요청] 두번째 업체 견적 80,000원이 도착했어요.\n업체 3곳 중 2곳이 회신했어요. 앱에서 확인해 주세요.');
  expect(within(sheet).getByRole('button', { name: '나중에' })).toBeInTheDocument();
  jest.mocked(apiClient.post).mockResolvedValue({ data: { notificationId: 90, sent: 0, failed: 0, skipped: 0, alreadyClaimed: 0 } });
  fireEvent.click(within(sheet).getByRole('button', { name: '발송' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/v1/admin/notifications/send', {
    userId: 7, maintenanceRequestId: 10, title: '수리 견적이 도착했어요',
    body: '[욕실 수리 요청] 두번째 업체 견적 80,000원이 도착했어요.\n업체 3곳 중 2곳이 회신했어요. 앱에서 확인해 주세요.',
  }));
});
