import type { RequestInfo, Quote } from './types';
import { compareTime, seoulNow } from './time';
export function canProcessRequest(request: RequestInfo, now = seoulNow()): boolean {
  return (request.status === 'SUBMITTED' || request.status === 'COLLECTING') && request.processingStatus !== 'REJECTED' && request.closeReason !== 'REJECTED' && (!request.closesAt || compareTime(now, request.closesAt) < 0);
}
export function actionsFor(request: RequestInfo, quote: Quote, now = seoulNow()) {
  const blocked = request.status === 'DRAFT' || request.processingStatus === 'REJECTED' || request.closeReason === 'REJECTED' || quote.processingStatus === 'REJECTED';
  const completed = quote.status === 'RECEIVED' || quote.status === 'DECLINED';
  const open = canProcessRequest(request, now);
  return {
    deliver: !blocked && open && quote.status === 'PENDING_DISPATCH',
    respond: !blocked && !completed && !!quote.sentAt && ['WAITING', 'EXPIRED', 'CLOSED'].includes(quote.status),
    correct: !blocked && completed,
    process: !blocked && open && ['PENDING_DISPATCH', 'WAITING'].includes(quote.status),
  };
}
