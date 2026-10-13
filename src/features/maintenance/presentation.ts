import type { Category, ProcessingStatus, QuoteStatus, RequestStatus, Timing } from './types';
export const categoryLabels: Record<Category, string> = { CLEANING: '청소', PLUMBING: '배관·누수', ELECTRICAL: '전기', WALLPAPER_FLOORING: '도배·장판', APPLIANCE: '가전', OTHER: '기타' };
export const requestLabels: Record<RequestStatus, string> = { DRAFT: '초안', SUBMITTED: '접수', COLLECTING: '견적 수집 중', CLOSED: '마감' };
export const quoteLabels: Record<QuoteStatus, string> = { PENDING_DISPATCH: '전달 전', WAITING: '회신 대기', RECEIVED: '견적 도착', DECLINED: '작업 불가', EXPIRED: '기한 종료', CLOSED: '종료' };
export const processingLabels: Record<ProcessingStatus, string> = { WAITING: '대기', DELAYED: '시간 소요', REJECTED: '반려' };
export const timingLabels: Record<Timing, string> = { ASAP: '가능한 빨리', THIS_WEEK: '이번 주', NEXT_WEEK: '다음 주', FLEXIBLE: '일정 협의' };
export const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
export function moneyRange(min?: number | null, max?: number | null) { return min == null || max == null ? '미확정' : min === max ? `${min.toLocaleString('ko-KR')}원` : `${min.toLocaleString('ko-KR')} ~ ${max.toLocaleString('ko-KR')}원`; }
export function feeLabel(included?: boolean | null, min?: number | null, max?: number | null) { return included === true ? '작업비에 포함' : included === false ? `별도 · ${moneyRange(min, max)}` : '미확정'; }
