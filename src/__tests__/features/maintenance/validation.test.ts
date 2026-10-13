import { buildDelivery, buildProcessing, buildResponse } from '@/features/maintenance/validation';
import type { ResponseFormValues } from '@/features/maintenance/validation';
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


const values: ResponseFormValues = {
  kind: 'RANGE', respondedAt: '2026-10-06T10:00:00.123456', minAmount: 100000, maxAmount: 150000,
  travelFeeMode: 'INCLUDED', materialsFeeMode: 'SEPARATE', materialsFeeMin: 10000, materialsFeeMax: 20000,
  availableDates: '2026-10-08, 2026-10-09\n2026-10-10', conditions: ' 현장 상황에 따라 변동 ', operatorNote: ' 전화 확인 ',
};
test('회신 입력을 비용과 날짜 API 계약으로 변환하고 마이크로초를 보존한다', () => {
  expect(buildResponse(values, quote, request, now)).toMatchObject({
    status: 'RECEIVED', quoteType: 'RANGE', respondedAt: '2026-10-06T10:00:00.123456', minAmount: 100000, maxAmount: 150000,
    travelFeeIncluded: true, travelFeeMin: null, travelFeeMax: null,
    materialsFeeIncluded: false, materialsFeeMin: 10000, materialsFeeMax: 20000,
    availableDates: ['2026-10-08', '2026-10-09', '2026-10-10'], conditions: '현장 상황에 따라 변동', operatorNote: '전화 확인',
  });
});
test('미확정 비용은 0원이 아닌 null로 전송한다', () => {
  expect(buildResponse({ ...values, travelFeeMode: 'UNKNOWN', travelFeeMin: 50, travelFeeMax: 100 }, quote, request, now))
    .toMatchObject({ travelFeeIncluded: null, travelFeeMin: null, travelFeeMax: null });
});
test('현장 확인 유형은 이전 작업비를 제거한다', () => {
  expect(buildResponse({ ...values, kind: 'SITE_VISIT_REQUIRED' }, quote, request, now))
    .toMatchObject({ status: 'RECEIVED', quoteType: 'SITE_VISIT_REQUIRED', minAmount: null, maxAmount: null });
});
test('작업 불가 유형은 이전 비용과 방문 가능일을 제거한다', () => {
  expect(buildResponse({ ...values, kind: 'DECLINED', declineReason: ' 일정 불가 ' }, quote, request, now))
    .toMatchObject({ status: 'DECLINED', quoteType: null, minAmount: null, maxAmount: null, travelFeeIncluded: null,
      travelFeeMin: null, travelFeeMax: null, materialsFeeIncluded: null, materialsFeeMin: null, materialsFeeMax: null,
      availableDates: [], declineReason: '일정 불가' });
});
test.each([
  { minAmount: -1 }, { minAmount: 0.5 }, { minAmount: 200000 }, { maxAmount: 1000000000001 },
  { travelFeeMode: 'SEPARATE' as const, travelFeeMin: 100, travelFeeMax: 99 },
  { materialsFeeMin: undefined }, { availableDates: '2026-02-30' },
  { kind: 'DECLINED' as const, declineReason: '   ' },
])('유효하지 않은 회신 입력 %j를 거절한다', patch => {
  expect(() => buildResponse({ ...values, ...patch }, quote, request, now)).toThrow();
});
test.each(['2026-10-05T10:59:59.999999', '2026-10-06T12:00:00.000001', '2026-02-30T10:00:00'])('잘못된 실제 회신 시각 %s를 거절한다', respondedAt => {
  expect(() => buildResponse({ ...values, respondedAt }, quote, request, now)).toThrow();
});
test('일반 마감 이후라도 마감 전 실제 회신은 등록할 수 있다', () => {
  expect(() => buildResponse(values, { ...quote, status: 'CLOSED' }, { ...request, status: 'CLOSED', closeReason: 'MANUAL', closedAt: '2026-10-06T11:00:00' }, now)).not.toThrow();
});
test('수동 마감 이후의 실제 회신은 등록할 수 없다', () => {
  expect(() => buildResponse(values, { ...quote, status: 'CLOSED' }, { ...request, status: 'CLOSED', closeReason: 'MANUAL', closedAt: '2026-10-06T09:00:00' }, now)).toThrow();
});
test('정정 회신 시각은 최초 기록 시각을 넘을 수 없다', () => {
  expect(() => buildResponse(values, { ...quote, status: 'RECEIVED', recordedAt: '2026-10-06T09:00:00' }, request, now)).toThrow();
});
test('미전달 업체에는 회신을 입력할 수 없다', () => {
  expect(() => buildResponse(values, { ...quote, sentAt: undefined, status: 'PENDING_DISPATCH' }, request, now)).toThrow();
});
test('반려한 요청에는 회신을 입력할 수 없다', () => {
  expect(() => buildResponse(values, quote, { ...request, processingStatus: 'REJECTED', closeReason: 'REJECTED', status: 'CLOSED' }, now)).toThrow();
});
test('시간 소요는 기존 공통 마감과 같은 미래 시각도 허용한다', () => {
  expect(buildProcessing({ status: 'DELAYED', closesAt: request.closesAt, reason: ' 일정 확인 ' }, request, now))
    .toMatchObject({ status: 'DELAYED', closesAt: '2026-10-07T11:00:00', reason: '일정 확인' });
});
test.each([
  { status: 'REJECTED' as const, reason: ' ' },
  { status: 'DELAYED' as const },
  { status: 'DELAYED' as const, closesAt: now },
  { status: 'DELAYED' as const, closesAt: '2026-10-07T10:59:59.999999' },
  { status: 'REJECTED' as const, reason: 'a'.repeat(1001) },
])('잘못된 처리 변경 %j를 거절한다', input => {
  expect(() => buildProcessing(input, request, now)).toThrow();
});
test('전달 입력의 정밀 시각을 보존한다', () => {
  expect(buildDelivery({ sentAt: '2026-10-05T11:00:00.123456', deliveryChannel: 'PHONE' }, request, now))
    .toEqual({ sentAt: '2026-10-05T11:00:00.123456', deliveryChannel: 'PHONE' });
});
test.each(['2026-10-05T09:00:00', '2026-10-05T10:59:59.999999', '2026-10-06T12:00:00.000001'])('허용 범위를 벗어난 전달 시각 %s를 거절한다', sentAt => {
  expect(() => buildDelivery({ sentAt, deliveryChannel: 'PHONE' }, request, now)).toThrow();
});
test('이미 48시간이 지난 최초 전달 기록은 거절한다', () => {
  expect(() => buildDelivery({ sentAt: '2026-10-03T12:00:00', deliveryChannel: 'PHONE' },
    { ...request, submittedAt: '2026-10-03T10:00:00', collectionStartedAt: undefined, closesAt: undefined }, now)).toThrow();
});


test.each([
  { conditions: 'a'.repeat(5001) },
  { operatorNote: 'a'.repeat(5001) },
  { kind: 'DECLINED' as const, declineReason: 'a'.repeat(1001) },
  { availableDates: Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`).join(',') },
])('서버 저장 한도를 넘는 회신은 전송 전에 거절한다 %#', patch => {
  expect(() => buildResponse({ ...values, ...patch }, quote, request, now)).toThrow();
});
test('서버 허용 한도 5000자와 방문 가능일 30개까지 허용한다', () => {
  expect(() => buildResponse({ ...values, conditions: 'a'.repeat(5000), operatorNote: 'b'.repeat(5000),
    availableDates: Array.from({ length: 30 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`).join(','),
  }, quote, request, now)).not.toThrow();
});
