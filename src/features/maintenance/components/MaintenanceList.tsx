'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Select, Tag, Typography, type TableColumnsType } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { FilterSection } from '@/components/FilterSection';
import { FilterMore } from '@/components/FilterMore';
import { FilterActions } from '@/components/FilterActions';
import { FilterQuickViews } from '@/components/FilterQuickViews';
import { FilterSummary } from '@/components/FilterSummary';
import { QueryErrorAlert } from '@/components/QueryErrorAlert';
import { RefreshButton } from '@/components/RefreshButton';
import { PagedTable } from '@/components/PagedTable';
import { formatDateTime } from '@/lib/format/date';
import { useRequests } from '../hooks';
import { parseFilters } from '../filters';
import { categoryLabels, processingLabels, quoteLabels, requestLabels, options } from '../presentation';
import { compareTime, normalizeTime } from '../time';
import type { AdminSummary, ListParams } from '../types';
export function MaintenanceList() {
  const search=useSearchParams(); const router=useRouter(); const [form]=Form.useForm();
  const params=parseFilters(search); const query=useRequests(params); const raw=search.toString();
  useEffect(()=>{form.setFieldsValue(parseFilters(new URLSearchParams(raw)));},[form,raw]);
  function navigate(changes:Record<string,unknown>) {
    const next=new URLSearchParams(raw);next.set('page','1');
    for(const [key,value] of Object.entries(changes)) {if(value===undefined || value===null || value==='')next.delete(key);else next.set(key,String(value));}
    router.push(`/maintenance?${next}`);
  }
  function reset(){form.resetFields();router.push('/maintenance');}
  const href=(id:number)=>`/maintenance/${id}?list=${encodeURIComponent(raw)}`;
  const status=(row:AdminSummary)=><><Tag>{requestLabels[row.status]}</Tag>{row.processingStatus && <Tag color={row.processingStatus==='REJECTED'?'red':row.processingStatus==='DELAYED'?'orange':'default'}>{processingLabels[row.processingStatus]}</Tag>}</>;
  const counts=(row:AdminSummary)=>`견적 ${row.counts.receivedCount}/${row.counts.targetCount} · 전달 전 ${row.counts.pendingDispatchCount} · 대기 ${row.counts.waitingCount}`;
  const columns:TableColumnsType<AdminSummary>=[
    {key:'request',title:'수리 요청',width:260,render:(_,row)=><><Link href={href(row.requestId)}>{row.title || `요청 #${row.requestId}`}</Link><div><Typography.Text type="secondary">#{row.requestId} · {row.landlordLabel}</Typography.Text></div></>},
    {key:'category',title:'분야 · 동네',width:150,render:(_,row)=><>{row.category?categoryLabels[row.category]:'-'}<div>{row.areaName || '-'}</div></>},
    {key:'status',title:'진행 상태',width:175,render:(_,row)=><>{status(row)}{row.processingReason && <Typography.Paragraph ellipsis={{rows:2,tooltip:row.processingReason}}>{row.processingReason}</Typography.Paragraph>}</>},
    {key:'counts',title:'업체 현황',width:240,render:(_,row)=><>{counts(row)}<div><Typography.Text type="secondary">시간 소요 {row.counts.delayedCount} · 반려 {row.counts.rejectedCount} · 작업 불가 {row.counts.declinedCount}</Typography.Text></div></>},
    {key:'times',title:'접수 · 마감 (서울)',width:195,render:(_,row)=><>{formatDateTime(row.submittedAt)}<div><Typography.Text type="secondary">{row.closesAt?formatDateTime(row.closesAt):'첫 전달 전 · 마감 미정'}</Typography.Text></div></>},
  ];
  const filterLabels:Record<string,string>={status:'요청 상태',category:'서비스 분야',quoteStatus:'업체 견적 상태',processingStatus:'요청 처리',vendorProcessingStatus:'업체 처리',submittedFrom:'접수 시작',submittedTo:'접수 종료 (미만)'};
  const valueLabels:Record<string,string>={...requestLabels,...quoteLabels,...categoryLabels,...processingLabels};
  const active=Object.entries(params).filter(([key,value])=>key!=='page'&&key!=='size'&&value!==undefined).map(([key,value])=>({label:filterLabels[key],value:valueLabels[String(value)]??String(value),onRemove:()=>navigate({[key]:undefined})}));
  const dateRule={validator:(_:unknown,value:string)=>{if(!value)return Promise.resolve();try{normalizeTime(value);return Promise.resolve();}catch{return Promise.reject(new Error('서울 시각 YYYY-MM-DDTHH:mm:ss 형식으로 입력하세요.'));}}};
  return <>
    <PageHeader title="수리 견적" description="접수된 요청을 확인하고 업체의 견적과 처리 사유를 관리합니다." extra={<RefreshButton loading={query.isFetching} onClick={()=>query.refetch()}>새로고침</RefreshButton>} />
    <FilterQuickViews views={[{label:'전달할 요청',active:params.quoteStatus==='PENDING_DISPATCH',onClick:()=>navigate({quoteStatus:params.quoteStatus==='PENDING_DISPATCH'?undefined:'PENDING_DISPATCH'})},{label:'시간 소요',active:params.processingStatus==='DELAYED',onClick:()=>navigate({processingStatus:params.processingStatus==='DELAYED'?undefined:'DELAYED'})},{label:'반려',active:params.processingStatus==='REJECTED',onClick:()=>navigate({processingStatus:params.processingStatus==='REJECTED'?undefined:'REJECTED'})}]} />
    <FilterSection><Form name="maintenance-filters" form={form} layout="vertical" initialValues={params} className="admin-filter-bar" onFinish={(values:ListParams)=>navigate({...values,page:1})}>
      <Form.Item name="status" label="요청 상태"><Select className="admin-filter-field" allowClear placeholder="전체" options={options({SUBMITTED:'접수',COLLECTING:'견적 수집 중',CLOSED:'마감'})} /></Form.Item>
      <Form.Item name="category" label="서비스 분야"><Select className="admin-filter-field" allowClear placeholder="전체 분야" options={options(categoryLabels)} /></Form.Item>
      <Form.Item name="processingStatus" label="요청 처리"><Select className="admin-filter-field" allowClear placeholder="전체" options={options(processingLabels)} /></Form.Item>
      <FilterActions><div className="admin-actions"><Button type="primary" htmlType="submit">조회</Button><Button onClick={reset}>초기화</Button></div></FilterActions>
      <FilterMore>
        <Form.Item name="quoteStatus" label="업체 견적 상태"><Select className="admin-filter-field" allowClear placeholder="전체" options={options(quoteLabels)} /></Form.Item>
        <Form.Item name="vendorProcessingStatus" label="업체 처리"><Select className="admin-filter-field" allowClear placeholder="전체" options={options(processingLabels)} /></Form.Item>
        <Form.Item name="submittedFrom" label="접수 시작 (서울)" rules={[dateRule]}><Input placeholder="2026-10-01T00:00:00" /></Form.Item>
        <Form.Item name="submittedTo" label="접수 종료 미만 (서울)" dependencies={['submittedFrom']} rules={[dateRule,({getFieldValue})=>({validator:(_,value)=>{const from=getFieldValue('submittedFrom');try{if(value&&from&&compareTime(from,value)>=0)return Promise.reject(new Error('종료는 시작보다 이후여야 합니다.'));}catch{}return Promise.resolve();}})]}><Input placeholder="2026-11-01T00:00:00" /></Form.Item>
      </FilterMore>
    </Form></FilterSection>
    <FilterSummary filters={active} onReset={reset} />
    <Typography.Paragraph type="secondary">접수 시각이 오래된 순서입니다. 모든 시각은 서울 기준입니다.</Typography.Paragraph>
    <QueryErrorAlert error={query.error} hasData={query.data!==undefined} onRetry={query.refetch} isRetrying={query.isFetching} title="수리 견적 목록을 불러오지 못했습니다." />
    {(!query.error || query.data) && <PagedTable rowKey="requestId" ariaLabel="수리 견적 요청 목록" columns={columns} compactColumns={[columns[0],columns[2],columns[3]]}
      dataSource={query.data?.requests??[]} loading={query.isLoading} page={params.page} pageSize={params.size} total={query.data?.totalElements??0}
      emptyText="조건에 맞는 수리 견적 요청이 없습니다." onPageChange={(page,size)=>navigate({page,size})}
      renderCompactDetails={row=><div>{row.category?categoryLabels[row.category]:'-'} · {row.areaName || '-'} · 접수 {formatDateTime(row.submittedAt)} · 마감 {row.closesAt?formatDateTime(row.closesAt):'첫 전달 전 · 마감 미정'}</div>}
      renderCard={row=><article className="admin-record-card"><Link href={href(row.requestId)}>{row.title || `요청 #${row.requestId}`}</Link><div>{row.landlordLabel} · {row.areaName}</div><div>{status(row)}</div><p>{counts(row)}</p><div>접수 {formatDateTime(row.submittedAt)}</div><div>마감 {row.closesAt?formatDateTime(row.closesAt):'첫 전달 전 · 마감 미정'}</div></article>} />}
  </>;
}
