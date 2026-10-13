import { actionsFor, canProcessRequest } from '@/features/maintenance/state';
import type { Quote, RequestInfo } from '@/features/maintenance/types';

const now = '2026-10-06T12:00:00';
const request: RequestInfo = {
  requestId: 10, status: 'COLLECTING', vendorIds: [], createdAt: '2026-10-05T09:00:00',
  submittedAt: '2026-10-05T10:00:00', collectionStartedAt: '2026-10-05T11:00:00',
  closesAt: '2026-10-07T11:00:00', processingStatus: 'WAITING',
};
const quote: Quote = {
  quoteId: 101, requestId: 10, vendorId: 1, vendorName: '수리 업체', status: 'WAITING',
  sentAt: '2026-10-05T11:00:00', availableDates: [], revision: 0, processingStatus: 'WAITING',
};


test('미전달 업체에는 전달과 처리 변경만 허용한다', () => {
  expect(actionsFor(request, { ...quote, status: 'PENDING_DISPATCH', sentAt: undefined }, now))
    .toEqual({ deliver: true, respond: false, correct: false, process: true });
});
test('전달한 미회신 업체에는 회신과 처리 변경을 허용한다', () => {
  expect(actionsFor(request, quote, now)).toEqual({ deliver: false, respond: true, correct: false, process: true });
});
test.each(['RECEIVED', 'DECLINED'] as const)('기존 %s 회신은 일반 마감 이후에도 정정할 수 있다', status => {
  expect(actionsFor({ ...request, status: 'CLOSED', closeReason: 'MANUAL', closedAt: now }, { ...quote, status }, now))
    .toEqual({ deliver: false, respond: false, correct: true, process: false });
});
test('기한 만료 업체에도 과거 회신을 등록할 수 있다', () => {
  expect(actionsFor({ ...request, status: 'CLOSED', closeReason: 'DEADLINE' }, { ...quote, status: 'EXPIRED' }, now))
    .toEqual({ deliver: false, respond: true, correct: false, process: false });
});
test('미전달 마감 업체에는 회신을 등록할 수 없다', () => {
  expect(actionsFor({ ...request, status: 'CLOSED' }, { ...quote, status: 'EXPIRED', sentAt: undefined }, now).respond).toBe(false);
});
test('요청 반려는 기존 회신의 정정도 차단한다', () => {
  expect(actionsFor({ ...request, status: 'CLOSED', closeReason: 'REJECTED', processingStatus: 'REJECTED' }, { ...quote, status: 'RECEIVED' }, now))
    .toEqual({ deliver: false, respond: false, correct: false, process: false });
});
test('개별 업체 반려는 신규 기록을 모두 차단한다', () => {
  expect(actionsFor(request, { ...quote, status: 'CLOSED', processingStatus: 'REJECTED' }, now))
    .toEqual({ deliver: false, respond: false, correct: false, process: false });
});
test('마감 시각과 같은 시점부터 처리 변경을 차단한다', () => {
  expect(canProcessRequest({ ...request, closesAt: now }, now)).toBe(false);
  expect(canProcessRequest({ ...request, closesAt: '2026-10-06T12:00:00.000001' }, now)).toBe(true);
});
test('첫 전달 전 제출 요청은 처리 변경할 수 있다', () => {
  expect(canProcessRequest({ ...request, status: 'SUBMITTED', closesAt: undefined }, now)).toBe(true);
  expect(canProcessRequest({ ...request, status: 'DRAFT', closesAt: undefined }, now)).toBe(false);
});
