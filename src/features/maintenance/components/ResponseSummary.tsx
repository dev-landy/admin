import { Descriptions, Typography } from 'antd';
import { formatTechnicalDateTime } from '@/lib/format/date';
import { moneyRange, feeLabel } from '../presentation';
import type { Quote, ResponseInput } from '../types';
import styles from './maintenance.module.css';
export function ResponseSummary({ response, operatorNote, showTotals = false }: { response: Quote | ResponseInput; operatorNote?: string | null; showTotals?: boolean }) {
  const declined = response.status === 'DECLINED';
  return <Descriptions size="small" column={{ xs:1, sm:2 }} items={[
    {key:'kind',label:'회신',children:declined ? '작업 불가' : response.quoteType === 'SITE_VISIT_REQUIRED' ? '현장 확인 필요' : '범위 견적'},
    ...(!declined ? [
      {key:'amount',label:'작업비',children:response.quoteType === 'SITE_VISIT_REQUIRED' ? '현장 확인 후 확정' : moneyRange(response.minAmount,response.maxAmount)},
      {key:'travel',label:'출장비',children:feeLabel(response.travelFeeIncluded,response.travelFeeMin,response.travelFeeMax)},
      {key:'materials',label:'자재비',children:feeLabel(response.materialsFeeIncluded,response.materialsFeeMin,response.materialsFeeMax)},
      ...(showTotals && 'quoteId' in response ? [{key:'total',label:'서버 비교 총액',children:<Typography.Text strong>{moneyRange(response.totalMinAmount,response.totalMaxAmount)}</Typography.Text>}] : []),
      {key:'dates',label:'방문 가능일 (제안)',children:response.availableDates.join(', ') || '미정'},
      {key:'conditions',label:'조건 · 임대인 공개',children:<span className={styles.pre}>{response.conditions || '-'}</span>,span:2},
    ] : [{key:'decline',label:'작업 불가 사유 · 임대인 공개',children:<span className={styles.pre}>{response.declineReason || '-'}</span>,span:2}]),
    {key:'responded',label:'실제 회신 (서울)',children:formatTechnicalDateTime(response.respondedAt)},
    {key:'note',label:'운영 메모 · 관리자 전용',children:<span className={styles.pre}>{operatorNote ?? ('operatorNote' in response ? response.operatorNote : null) ?? '-'}</span>,span:2},
  ]} />;
}
