import type { ResponseFormValues, Quote, RequestInfo, ResponseInput, ProcessingInput, DeliveryInput, FeeMode } from './types';
import { actionsFor, canProcessRequest } from './state';
import { compareTime, normalizeTime, seoulNow, validDate } from './time';
export type { ResponseFormValues } from './types';
const clean = (value?: string | null) => value?.trim() || null;
function range(min: number | null | undefined, max: number | null | undefined, label: string): [number, number] {
  if (min == null || max == null || !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || min > max || max > 1_000_000_000_000) throw new Error(`${label}: 0 이상 1조 이하의 정수 범위를 입력하세요.`);
  return [min, max];
}
function fee(mode: FeeMode | undefined, min: number | null | undefined, max: number | null | undefined, label: string): [boolean | null, number | null, number | null] {
  if (mode === 'INCLUDED') return [true, null, null];
  if (mode === 'SEPARATE') return [false, ...range(min, max, label)];
  return [null, null, null];
}
export function buildResponse(values: ResponseFormValues, quote: Quote, request: RequestInfo, now = seoulNow()): ResponseInput {
  const actions = actionsFor(request, quote, now);
  if (!actions.respond && !actions.correct) throw new Error('현재 상태에서는 회신을 등록하거나 정정할 수 없습니다.');
  const respondedAt = normalizeTime(values.respondedAt);
  if (!quote.sentAt || compareTime(respondedAt, quote.sentAt) < 0 || compareTime(respondedAt, now) > 0) throw new Error('실제 회신 시각은 전달 시각 이후, 현재 이전이어야 합니다.');
  const limits = [request.closesAt, request.closedAt, actions.correct ? quote.recordedAt : null].filter((v): v is string => !!v);
  if (limits.some(limit => compareTime(respondedAt, limit) > 0)) throw new Error('실제 회신은 모집 마감과 최초 등록 시각 이전이어야 합니다.');
  const declined = values.kind === 'DECLINED';
  const declineReason = declined ? clean(values.declineReason) : null;
  if (declined && !declineReason) throw new Error('작업 불가 사유를 입력하세요.');
  const [minAmount, maxAmount] = values.kind === 'RANGE' ? range(values.minAmount, values.maxAmount, '작업비') : [null, null];
  const [travelFeeIncluded, travelFeeMin, travelFeeMax] = declined ? [null, null, null] : fee(values.travelFeeMode, values.travelFeeMin, values.travelFeeMax, '출장비');
  const [materialsFeeIncluded, materialsFeeMin, materialsFeeMax] = declined ? [null, null, null] : fee(values.materialsFeeMode, values.materialsFeeMin, values.materialsFeeMax, '자재비');
  const availableDates = declined ? [] : [...new Set((values.availableDates ?? '').split(/[,\s]+/).filter(Boolean))];
  if (availableDates.length > 30) throw new Error('방문 가능일은 최대 30개입니다.');
  for (const [value, max] of [[values.conditions, 5000], [values.operatorNote, 5000], [values.declineReason, 1000]] as const) {
    if (value && value.length > max) throw new Error(`입력은 ${max}자 이하로 작성하세요.`);
  }
  if (availableDates.some(date => !validDate(date))) throw new Error('방문 가능일을 YYYY-MM-DD 형식으로 입력하세요.');
  return { status: declined ? 'DECLINED' : 'RECEIVED', quoteType: declined ? null : values.kind as 'RANGE' | 'SITE_VISIT_REQUIRED', respondedAt, minAmount, maxAmount,
    travelFeeIncluded, travelFeeMin, travelFeeMax, materialsFeeIncluded, materialsFeeMin, materialsFeeMax, availableDates,
    conditions: declined ? null : clean(values.conditions), declineReason, operatorNote: clean(values.operatorNote) };
}
export function buildProcessing(values: ProcessingInput, request: RequestInfo, now = seoulNow()): ProcessingInput {
  if (!canProcessRequest(request, now)) throw new Error('마감되거나 반려된 요청은 처리 상태를 변경할 수 없습니다.');
  const reason = clean(values.reason);
  if (reason && reason.length > 1000) throw new Error('사유는 1000자 이하로 입력하세요.');
  if (values.status === 'WAITING') return { status: 'WAITING' };
  if (values.status === 'REJECTED') {
    if (!reason) throw new Error('반려 사유를 입력하세요.');
    return { status: 'REJECTED', reason };
  }
  if (!values.closesAt) throw new Error('새 공통 마감 시각을 입력하세요.');
  const closesAt = normalizeTime(values.closesAt);
  if (compareTime(closesAt, now) <= 0 || (request.closesAt && compareTime(closesAt, request.closesAt) < 0)) throw new Error('공통 마감은 현재 이후이며 기존 기한 이상이어야 합니다.');
  return { status: 'DELAYED', reason, closesAt };
}
export function buildDelivery(values: DeliveryInput, request: RequestInfo, now = seoulNow()): DeliveryInput {
  if (!canProcessRequest(request, now)) throw new Error('모집 중인 요청만 전달을 기록할 수 있습니다.');
  const sentAt = normalizeTime(values.sentAt);
  if (compareTime(sentAt, now) > 0 || (request.submittedAt && compareTime(sentAt, request.submittedAt) < 0) || (request.collectionStartedAt && compareTime(sentAt, request.collectionStartedAt) < 0)) throw new Error('전달 시각은 접수·최초 전달 이후이며 현재 이전이어야 합니다.');
  if (!request.collectionStartedAt && !request.closesAt && Date.parse(`${sentAt}+09:00`) + 48 * 60 * 60 * 1000 <= Date.parse(`${now}+09:00`)) throw new Error('최초 전달로부터 48시간이 지났습니다. 먼저 시간 소요 처리로 기한을 지정하세요.');
  return { sentAt, deliveryChannel: values.deliveryChannel };
}
