'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { App, Alert, Button, Card, Descriptions, Empty, Spin, Tag, Typography } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { ClientLinkButton } from '@/components/ClientLinkButton';
import { RefreshButton } from '@/components/RefreshButton';
import { QueryErrorAlert } from '@/components/QueryErrorAlert';
import { SendNotificationModal } from '@/features/notifications/components/SendNotificationModal';
import { formatDateTime, formatTechnicalDateTime } from '@/lib/format/date';
import { useRequest } from '../hooks';
import { actionsFor, canProcessRequest } from '../state';
import { categoryLabels, processingLabels, quoteLabels, requestLabels, timingLabels } from '../presentation';
import type { AdminQuote, Counts } from '../types';
import { QuoteResponseModal } from './QuoteResponseModal';
import { ProcessingModal } from './ProcessingModal';
import { DeliveryModal } from './DeliveryModal';
import { CorrectionHistoryModal } from './CorrectionHistoryModal';
import { RequestPhotos } from './RequestPhotos';
import { ResponseSummary } from './ResponseSummary';
import styles from './maintenance.module.css';
type Dialog = { type:'delivery'|'response'|'processing'; entry:AdminQuote } | { type:'requestProcessing' } | { type:'history';quoteId:number } | {type:'notification'};
const countLabels: [keyof Counts,string][]=[['targetCount','대상 업체'],['receivedCount','견적 도착'],['pendingDispatchCount','전달 전'],['waitingCount','회신 대기'],['pricedQuoteCount','금액 견적'],['declinedCount','작업 불가'],['delayedCount','시간 소요'],['rejectedCount','반려']];
export function MaintenanceDetail({requestId}:{requestId:number}) {
  const query=useRequest(requestId); const search=useSearchParams(); const {message}=App.useApp(); const [dialog,setDialog]=useState<Dialog>();
  const data=query.data; const close=()=>setDialog(undefined);
  const back=<ClientLinkButton href={`/maintenance${search.get('list')?`?${search.get('list')}`:''}`}>목록으로</ClientLinkButton>;
  if(!data) return <><PageHeader title="수리 견적 상세" extra={back}/><QueryErrorAlert error={query.error} onRetry={query.refetch} isRetrying={query.isFetching}/>{query.isLoading&&<Spin aria-label="수리 요청을 불러오는 중" />}</>;
  const r=data.request;
  const editable=!query.error && !query.isFetching;
  const content=data.deliveryContent;
  const deliveryText=[content.title,`분야: ${categoryLabels[content.category]}`,`동네: ${content.areaName}`,`희망 시기: ${timingLabels[content.preferredTiming]}`,content.description].join('\n');
  async function copy(){try{await navigator.clipboard.writeText(deliveryText);message.success('업체 전달 내용을 복사했습니다.');}catch{message.error('복사하지 못했습니다. 아래 내용을 선택해 복사하세요.');}}
  const reasonLabel=r.closeReason==='REJECTED'?'관리자 반려':r.closeReason==='MANUAL'?'임대인 수동 마감':r.closeReason==='DEADLINE'?'모집 기한 종료':'-';
  return <div className={styles.stack}>
    <PageHeader title={r.title || `수리 요청 #${requestId}`} description={`요청 #${requestId} · ${data.landlordLabel} · 모든 시각은 서울 기준입니다.`}
      extra={<>{back}<RefreshButton loading={query.isFetching} onClick={()=>query.refetch()}>새로고침</RefreshButton><Button disabled={!editable} onClick={()=>setDialog({type:'notification'})}>임대인에게 알림</Button>
        <Button type="primary" disabled={!editable || !canProcessRequest(r)} onClick={()=>setDialog({type:'requestProcessing'})}>요청 처리 상태</Button></>} />
    <QueryErrorAlert error={query.error} onRetry={query.refetch} isRetrying={query.isFetching} hasData />
    <div className={styles.metrics}>{countLabels.map(([key,label])=><div className={styles.metric} key={key} aria-label={`${label} ${data.counts[key]}건`}><Typography.Text type="secondary">{label}</Typography.Text><strong>{data.counts[key]}<Typography.Text type="secondary"> 건</Typography.Text></strong></div>)}</div>
    <Card title="요청 정보">
      <Descriptions column={{xs:1,sm:2,lg:3}} items={[
        {key:'status',label:'요청 상태',children:<Tag>{requestLabels[r.status]}</Tag>},
        {key:'processing',label:'운영 처리',children:r.processingStatus?<Tag color={r.processingStatus==='REJECTED'?'red':r.processingStatus==='DELAYED'?'orange':'default'}>{processingLabels[r.processingStatus]}</Tag>:'-'},
        {key:'category',label:'서비스 분야',children:r.category?categoryLabels[r.category]:'-'},
        {key:'timing',label:'희망 시기',children:r.preferredTiming?timingLabels[r.preferredTiming]:'-'},
        {key:'submitted',label:'접수',children:formatDateTime(r.submittedAt)},
        {key:'closes',label:'공통 마감',children:r.closesAt?formatTechnicalDateTime(r.closesAt):'첫 전달 전 · 마감 미정'},
        {key:'closed',label:'종료 사유',children:reasonLabel},
        {key:'counts',label:'미회신 합계',children:`${data.counts.pendingCount}곳 (시간 소요 포함)`},
        {key:'updated',label:'처리 변경',children:formatDateTime(r.processingUpdatedAt)},
        {key:'reason',label:'처리 사유 · 임대인 공개',children:<span className={styles.pre}>{r.processingReason || '-'}</span>,span:3},
        {key:'address',label:'요청 주소',children:r.addressSnapshot || '-',span:3},
        {key:'location',label:'위치 설명',children:<span className={styles.pre}>{r.locationDetail || '-'}</span>,span:3},
        {key:'description',label:'문제 설명',children:<span className={styles.pre}>{r.description || '-'}</span>,span:3},
      ]}/>
    </Card>
    <div className={styles.twoColumns}>
      <Card title="업체 전달 내용" extra={<Button onClick={()=>void copy()}>내용 복사</Button>}><Typography.Paragraph type="secondary">상세주소와 운영 메모는 포함하지 않습니다. 자유 입력 내용의 개인정보는 전달 전에 직접 확인하세요.</Typography.Paragraph><p className={styles.pre}>{deliveryText}</p></Card>
      <Card title={`요청 사진 · ${data.photos.length}장`}><RequestPhotos requestId={requestId} photos={data.photos}/></Card>
    </div>
    <section className={styles.stack} aria-label="업체별 견적">
      <Typography.Title level={2} style={{margin:0}}>업체별 견적</Typography.Title>
      {data.quotes.length===0&&<Empty description="대상 업체가 없습니다."/>}
      {data.quotes.map(entry=>{
        const q=entry.quote;const actions=actionsFor(r,q);const replied=q.status==='RECEIVED'||q.status==='DECLINED';
        return <Card key={q.quoteId} title={<div className={styles.quoteHeader}><span>{q.vendorName}</span><span><Tag>{quoteLabels[q.status]}</Tag>{q.processingStatus&&<Tag color={q.processingStatus==='REJECTED'?'red':q.processingStatus==='DELAYED'?'orange':'default'}>{processingLabels[q.processingStatus]}</Tag>}</span></div>}>
          <div className={styles.stack}>
            <Descriptions size="small" column={{xs:1,sm:2,lg:3}} items={[
              {key:'phone',label:'업체 연락처',children:entry.vendorPhone||'등록된 연락처 없음'},
              {key:'sent',label:'실제 전달',children:formatTechnicalDateTime(q.sentAt)},
              {key:'channel',label:'전달 채널',children:({PHONE:'전화',SMS:'문자',MESSENGER:'메신저',OTHER:'기타'} as Record<string,string>)[entry.deliveryChannel??'']??'-'},
              {key:'reason',label:'처리 사유 · 임대인 공개',children:<span className={styles.pre}>{q.processingReason||'-'}</span>,span:3},
            ]}/>
            {replied ? <ResponseSummary response={q} operatorNote={entry.operatorNote} showTotals/> : <Typography.Text type="secondary">아직 등록된 업체 회신이 없습니다.</Typography.Text>}
            {q.correctedAt&&<Typography.Text type="secondary">정정 {q.revision}회 · {formatTechnicalDateTime(q.correctedAt)}</Typography.Text>}
            <div className="admin-actions">
              {actions.deliver&&<Button disabled={!editable} onClick={()=>setDialog({type:'delivery',entry})}>전달 기록</Button>}
              {actions.respond&&<Button type="primary" disabled={!editable} onClick={()=>setDialog({type:'response',entry})}>회신 등록</Button>}
              {actions.correct&&<Button disabled={!editable} onClick={()=>setDialog({type:'response',entry})}>견적 정정</Button>}
              {actions.process&&<Button disabled={!editable} onClick={()=>setDialog({type:'processing',entry})}>업체 처리 상태</Button>}
              {q.revision>0&&<Button onClick={()=>setDialog({type:'history',quoteId:q.quoteId})}>정정 이력</Button>}
            </div>
          </div>
        </Card>;
      })}
    </section>
    <Alert type="info" showIcon title="견적과 처리 사유를 저장하면 임대인 앱에 즉시 반영됩니다." description="저장만으로 알림이 발송되지는 않습니다. 필요한 경우 ‘임대인에게 알림’에서 내용을 검토한 뒤 발송하세요."/>
    {dialog?.type==='delivery'&&<DeliveryModal detail={data} entry={dialog.entry} onClose={close}/>}
    {dialog?.type==='response'&&<QuoteResponseModal detail={data} entry={dialog.entry} onClose={close}/>}
    {(dialog?.type==='processing'||dialog?.type==='requestProcessing')&&<ProcessingModal detail={data} entry={dialog.type==='processing'?dialog.entry:undefined} onClose={close}/>}
    {dialog?.type==='history'&&<CorrectionHistoryModal quoteId={dialog.quoteId} onClose={close}/>}
    {dialog?.type==='notification'&&<SendNotificationModal open onClose={close} recipient={{userId:data.userId,label:data.landlordLabel}}
      defaults={{title:'수리 견적 안내',body:`요청 #${requestId} · ${r.title || '수리 요청'}\n${r.processingReason || '수리 견적 진행 상황과 등록된 견적을 앱에서 확인해 주세요.'}`}}/>}
  </div>;
}
