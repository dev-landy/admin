import type { AdminDetail } from './types';
import { categoryLabels, moneyRange } from './presentation';

/** 회신 저장 직후 임대인에게 보낼 푸시 초안. 운영자가 발송 전에 고칠 수 있다. */
export function buildQuoteNotification(detail: AdminDetail, quoteId: number): { title: string; body: string } | undefined {
  const quote = detail.quotes.find(entry => entry.quote.quoteId === quoteId)?.quote;
  if (!quote || (quote.status !== 'RECEIVED' && quote.status !== 'DECLINED')) return;
  const subject = `${categoryLabels[detail.deliveryContent.category]} 요청`;
  const { receivedCount, targetCount } = detail.counts;
  const result = quote.status === 'DECLINED' ? '작업이 어렵다고 회신했어요.'
    : quote.quoteType === 'SITE_VISIT_REQUIRED' ? '현장 확인 후 견적을 안내하기로 했어요.'
    : `견적 ${moneyRange(quote.totalMinAmount ?? quote.minAmount, quote.totalMaxAmount ?? quote.maxAmount)}이 도착했어요.`;
  return {
    title: quote.status === 'DECLINED' ? '업체 회신이 도착했어요' : '수리 견적이 도착했어요',
    body: `[${subject}] ${quote.vendorName} ${result}\n업체 ${targetCount}곳 중 ${receivedCount}곳이 회신했어요. 앱에서 확인해 주세요.`,
  };
}
