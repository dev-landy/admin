import '@/test-utils/antd';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { MaintenanceDetail } from '@/features/maintenance/components/MaintenanceDetail';
import { MaintenanceList } from '@/features/maintenance/components/MaintenanceList';
import { useAdminViewport } from '@/components/useAdminViewport';
import type { AdminDetail, AdminSummary } from '@/features/maintenance/types';
import { apiClient } from '@/lib/api/client';

// 서버 명세에서 요청 제목·동네 칼럼이 삭제돼 요청은 번호·서비스 분야로만 식별한다.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/maintenance',
}));
jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
jest.mock('@/components/useAdminViewport', () => ({ useAdminViewport: jest.fn(() => 'wide') }));
const mockGet = jest.mocked(apiClient.get);
const viewport = jest.mocked(useAdminViewport);

const counts = { targetCount: 2, receivedCount: 0, pricedQuoteCount: 0, declinedCount: 0, pendingCount: 2, pendingDispatchCount: 2, waitingCount: 0, delayedCount: 0, rejectedCount: 0 };
const summary: AdminSummary = { requestId: 15, userId: 8, landlordLabel: '임대인 #8', category: 'CLEANING', status: 'SUBMITTED', submittedAt: '2026-11-24T10:00:00', createdAt: '2026-11-24T09:00:00', counts };
const detail: AdminDetail = {
  request: { requestId: 15, category: 'CLEANING', description: '입주 전 전체 청소', addressSnapshot: '서울시 강남구 예시로 10', vendorIds: [], status: 'SUBMITTED', createdAt: '2026-11-24T09:00:00', submittedAt: '2026-11-24T10:00:00' },
  userId: 8, landlordLabel: '임대인 #8', counts, photos: [], quotes: [],
  deliveryContent: { category: 'CLEANING', description: '입주 전 전체 청소', preferredTiming: 'THIS_WEEK' },
};
function open(content: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>{content}</App></ConfigProvider></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); viewport.mockReturnValue('wide'); });

test('목록은 요청 번호로 행을 표시하고 보조 줄에 번호를 반복하지 않는다', async () => {
  mockGet.mockResolvedValue({ data: { requests: [summary], page: 1, size: 20, totalElements: 1 } });
  open(<MaintenanceList />);
  const row = (await screen.findByRole('link', { name: '요청 #15' })).closest('tr')!;
  expect(within(row).getByText('임대인 #8')).toBeInTheDocument();
  expect(within(row).queryByText(/#15 · /)).not.toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '분야' })).toBeInTheDocument();
  expect(within(row).getByText('청소').closest('td')).toHaveTextContent(/^청소$/);
});

test('모바일 카드는 임대인 옆에 서비스 분야를 표시한다', async () => {
  viewport.mockReturnValue('mobile');
  mockGet.mockResolvedValue({ data: { requests: [summary], page: 1, size: 20, totalElements: 1 } });
  open(<MaintenanceList />);
  expect(await screen.findByRole('link', { name: '요청 #15' })).toBeInTheDocument();
  expect(screen.getByText('임대인 #8 · 청소')).toBeInTheDocument();
});

test('상세는 요청 번호를 제목으로 쓰고 업체 전달 문안에 요청·지역 줄을 넣지 않는다', async () => {
  mockGet.mockResolvedValue({ data: detail });
  open(<MaintenanceDetail requestId={15} />);
  const message = await screen.findByText(/\[수리 견적 요청\]/);
  expect(message).toHaveTextContent('▪ 분야: 청소');
  expect(message.textContent).not.toMatch(/요청: |지역: /);
  expect(screen.getByRole('heading', { name: '수리 요청 #15' })).toBeInTheDocument();
  expect(screen.getByText('임대인 #8 · 모든 시각은 서울 기준입니다.')).toBeInTheDocument();
});

test('임대인 알림 기본 본문은 요청 번호와 서비스 분야로 시작한다', async () => {
  mockGet.mockResolvedValue({ data: detail });
  open(<MaintenanceDetail requestId={15} />);
  fireEvent.click(await screen.findByRole('button', { name: '임대인에게 알림' }));
  const body = await screen.findByLabelText('내용') as HTMLTextAreaElement;
  expect(body.value).toMatch(/^요청 #15 · 청소\n수리 견적 진행 상황/);
});
