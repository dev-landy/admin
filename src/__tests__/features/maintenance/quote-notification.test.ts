import { buildQuoteNotification } from '@/features/maintenance/quoteNotification';
import type { AdminDetail, Quote } from '@/features/maintenance/types';

const base: Quote = { quoteId: 1, requestId: 10, vendorId: 1, vendorName: '한결수리', status: 'RECEIVED', availableDates: [], revision: 0 };
const detailWith = (quote: Partial<Quote>): AdminDetail => ({
  request: { requestId: 10, vendorIds: [], status: 'COLLECTING', createdAt: '2026-10-05T09:00:00' },
  userId: 7, landlordLabel: '임대인 #7', photos: [], quotes: [{ quote: { ...base, ...quote } }],
  counts: { targetCount: 3, receivedCount: 1, pricedQuoteCount: 1, declinedCount: 0, pendingCount: 2, pendingDispatchCount: 0, waitingCount: 2, delayedCount: 0, rejectedCount: 0 },
  deliveryContent: { category: 'PLUMBING', description: '', preferredTiming: 'ASAP' },
});

test('범위 견적은 서비스 분야·비교 총액·회신 현황을 알림 초안에 담는다', () => {
  expect(buildQuoteNotification(detailWith({ quoteType: 'RANGE', minAmount: 1, maxAmount: 2, totalMinAmount: 100000, totalMaxAmount: 150000 }), 1)).toEqual({
    title: '수리 견적이 도착했어요',
    body: '[배관·누수 요청] 한결수리 견적 100,000 ~ 150,000원이 도착했어요.\n업체 3곳 중 1곳이 회신했어요. 앱에서 확인해 주세요.',
  });
});
test('현장 확인과 작업 불가 회신은 각각의 문구를 쓴다', () => {
  expect(buildQuoteNotification(detailWith({ quoteType: 'SITE_VISIT_REQUIRED' }), 1)?.body).toContain('현장 확인 후 견적을 안내하기로 했어요.');
  expect(buildQuoteNotification(detailWith({ status: 'DECLINED' }), 1)).toMatchObject({ title: '업체 회신이 도착했어요' });
});
test('회신 전이거나 없는 견적이면 초안을 만들지 않는다', () => {
  expect(buildQuoteNotification(detailWith({ status: 'WAITING' }), 1)).toBeUndefined();
  expect(buildQuoteNotification(detailWith({}), 999)).toBeUndefined();
});
