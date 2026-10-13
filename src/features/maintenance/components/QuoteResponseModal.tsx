'use client';
import { useState } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Select, Typography } from 'antd';
import type { AdminDetail, AdminQuote, FeeMode, ResponseFormValues } from '../types';
import { buildResponse } from '../validation';
import { seoulNow } from '../time';
import { useEditor } from './useEditor';
import styles from './maintenance.module.css';
const feeMode = (value?: boolean | null): FeeMode => value === true ? 'INCLUDED' : value === false ? 'SEPARATE' : 'UNKNOWN';
export function QuoteResponseModal({ detail, entry, onClose }: { detail: AdminDetail; entry: AdminQuote; onClose: () => void }) {
  // Keep the opened revision and original values even if the background query updates.
  const [snapshot] = useState(entry);
  const q = snapshot.quote;
  const correcting = q.status === 'RECEIVED' || q.status === 'DECLINED';
  const [form] = Form.useForm<ResponseFormValues>();
  const editor = useEditor(detail.request.requestId, onClose);
  const kind = Form.useWatch('kind', form) ?? (q.status === 'DECLINED' ? 'DECLINED' : q.quoteType ?? 'RANGE');
  const travel = Form.useWatch('travelFeeMode', form) ?? feeMode(q.travelFeeIncluded);
  const materials = Form.useWatch('materialsFeeMode', form) ?? feeMode(q.materialsFeeIncluded);
  const submit = async () => {
    if (editor.pending || editor.needsReview) return;
    try {
      const values = await form.validateFields();
      await editor.save(() => {
        const response = buildResponse(values, q, detail.request);
        return correcting ? { type: 'correction', quoteId: q.quoteId, body: { expectedRevision: q.revision, reason: values.correctionReason!.trim(), response } }
          : { type: 'response', quoteId: q.quoteId, body: response };
      });
    } catch { /* Form shows validation messages. */ }
  };
  const fees = (prefix: 'travel' | 'materials', label: string, mode: FeeMode) => <>
    <Form.Item name={`${prefix}FeeMode`} label={label}><Select options={[{value:'INCLUDED',label:'작업비에 포함'},{value:'SEPARATE',label:'별도 비용'},{value:'UNKNOWN',label:'미확정'}]} /></Form.Item>
    {mode === 'SEPARATE' && <div className={styles.twoColumns}>
      <Form.Item name={`${prefix}FeeMin`} label={`${label} 최소 (원)`} rules={[{required:true,message:'최소 금액을 입력하세요.'}]}><InputNumber min={0} max={1e12} precision={0} className={styles.full} /></Form.Item>
      <Form.Item name={`${prefix}FeeMax`} label={`${label} 최대 (원)`} rules={[{required:true,message:'최대 금액을 입력하세요.'}]}><InputNumber min={0} max={1e12} precision={0} className={styles.full} /></Form.Item>
    </div>}
  </>;
  return <Modal open title={`${q.vendorName} · ${correcting ? '견적 정정' : '회신 등록'}`} width={720} onOk={() => void submit()} onCancel={editor.close}
    okText={correcting ? '정정 반영' : '앱에 반영'} cancelText="취소" confirmLoading={editor.pending} okButtonProps={{disabled:editor.pending || editor.needsReview}}
    cancelButtonProps={{disabled:editor.pending}} closable={!editor.pending} mask={{closable:false}} keyboard={!editor.pending}>
    <Typography.Paragraph type="secondary">저장하면 임대인 앱에서 바로 조회됩니다. 방문 가능일은 제안 날짜이며 예약 확정이 아닙니다. 알림은 상세 화면에서 별도로 발송합니다.</Typography.Paragraph>
    {editor.error && <Alert type="error" showIcon title="저장 결과 확인" description={editor.error} />}
    <Form name="maintenance-response" form={form} layout="vertical" disabled={editor.pending} onValuesChange={editor.changed} initialValues={{
      kind:q.status === 'DECLINED' ? 'DECLINED' : q.quoteType ?? 'RANGE', respondedAt:q.respondedAt ?? seoulNow(), minAmount:q.minAmount, maxAmount:q.maxAmount,
      travelFeeMode:feeMode(q.travelFeeIncluded),travelFeeMin:q.travelFeeMin,travelFeeMax:q.travelFeeMax,
      materialsFeeMode:feeMode(q.materialsFeeIncluded),materialsFeeMin:q.materialsFeeMin,materialsFeeMax:q.materialsFeeMax,
      availableDates:q.availableDates.join(', '),conditions:q.conditions,declineReason:q.declineReason,operatorNote:snapshot.operatorNote,
    }}>
      <Form.Item name="kind" label="회신 유형" rules={[{required:true}]}><Select options={[{value:'RANGE',label:'범위 견적'},{value:'SITE_VISIT_REQUIRED',label:'현장 확인 필요'},{value:'DECLINED',label:'작업 불가'}]} /></Form.Item>
      <Form.Item name="respondedAt" label="실제 회신 시각 (서울)" rules={[{required:true,message:'실제 회신 시각을 입력하세요.'}]} extra="YYYY-MM-DDTHH:mm:ss · 서버의 정밀 시각도 그대로 유지됩니다."><Input placeholder="2026-10-06T14:30:00" /></Form.Item>
      {kind === 'RANGE' && <div className={styles.twoColumns}>
        <Form.Item name="minAmount" label="작업비 최소 (원)" rules={[{required:true,message:'최소 금액을 입력하세요.'}]}><InputNumber min={0} max={1e12} precision={0} className={styles.full} /></Form.Item>
        <Form.Item name="maxAmount" label="작업비 최대 (원)" rules={[{required:true,message:'최대 금액을 입력하세요.'}]}><InputNumber min={0} max={1e12} precision={0} className={styles.full} /></Form.Item>
      </div>}
      {kind !== 'DECLINED' ? <>{fees('travel','출장비',travel)}{fees('materials','자재비',materials)}
        <Form.Item name="availableDates" label="방문 가능일" extra="YYYY-MM-DD 날짜를 쉼표 또는 줄바꿈으로 구분하세요."><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="conditions" label="조건 (임대인 공개)"><Input.TextArea rows={3} maxLength={5000} /></Form.Item>
      </> : <Form.Item name="declineReason" label="작업 불가 사유 (임대인 공개)" rules={[{required:true,whitespace:true,message:'작업 불가 사유를 입력하세요.'}]}><Input.TextArea rows={3} maxLength={1000} /></Form.Item>}
      <Form.Item name="operatorNote" label="운영 메모 (관리자 전용)"><Input.TextArea rows={2} maxLength={5000} /></Form.Item>
      {correcting && <Form.Item name="correctionReason" label="정정 사유 (관리자 전용)" rules={[{required:true,whitespace:true,message:'정정 사유를 입력하세요.'},{max:1000}]}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>}
    </Form>
  </Modal>;
}
