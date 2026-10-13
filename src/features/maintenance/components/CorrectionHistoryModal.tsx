'use client';
import { useState } from 'react';
import { Button, Card, Empty, Modal, Spin, Typography } from 'antd';
import { QueryErrorAlert } from '@/components/QueryErrorAlert';
import { formatTechnicalDateTime } from '@/lib/format/date';
import { useCorrections } from '../hooks';
import { ResponseSummary } from './ResponseSummary';
import styles from './maintenance.module.css';
export function CorrectionHistoryModal({quoteId,onClose}:{quoteId:number;onClose:()=>void}) {
  const [page,setPage] = useState(1);
  const query = useCorrections(quoteId,page);
  return <Modal open title="견적 정정 이력 · 관리자 전용" onCancel={onClose} footer={<Button onClick={onClose}>닫기</Button>} width={1000}>
    <QueryErrorAlert error={query.error} hasData={!!query.data} onRetry={query.refetch} isRetrying={query.isFetching} />
    {query.isLoading ? <Spin /> : query.data && <div className={styles.stack}>
      {query.data.items.length === 0 && <Empty description="정정 이력이 없습니다." />}
      {query.data.items.map(item => <Card key={item.correctionId} title={`정정 ${item.revision} · 운영자 #${item.correctedByUserId}`}>
        <Typography.Paragraph>{formatTechnicalDateTime(item.correctedAt)} (서울)</Typography.Paragraph>
        <Typography.Paragraph className={styles.pre}>{item.reason}</Typography.Paragraph>
        <div className={styles.twoColumns}><section aria-label="정정 전"><Typography.Title level={5}>정정 전</Typography.Title><ResponseSummary response={item.before} /></section>
          <section aria-label="정정 후"><Typography.Title level={5}>정정 후</Typography.Title><ResponseSummary response={item.after} /></section></div>
      </Card>)}
      <div className="admin-actions"><Button disabled={page===1 || query.isFetching} onClick={()=>setPage(page-1)}>이전</Button><span>{page}페이지</span><Button disabled={!query.data.hasNext || query.isFetching} onClick={()=>setPage(page+1)}>다음</Button></div>
    </div>}
  </Modal>;
}
