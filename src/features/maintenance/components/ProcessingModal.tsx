'use client';
import { Alert, Checkbox, Form, Input, Modal, Select, Typography } from 'antd';
import type { AdminDetail, AdminQuote, ProcessingInput } from '../types';
import { buildProcessing } from '../validation';
import { actionsFor } from '../state';
import { options, processingLabels } from '../presentation';
import { useEditor } from './useEditor';
export function ProcessingModal({ detail, entry, onClose }: { detail: AdminDetail; entry?: AdminQuote; onClose: () => void }) {
  const [form] = Form.useForm<ProcessingInput & { confirmed?: boolean }>();
  const editor = useEditor(detail.request.requestId, onClose);
  const status = Form.useWatch('status',form) ?? (entry?.quote.processingStatus ?? detail.request.processingStatus ?? 'WAITING');
  async function submit() {
    if (editor.pending || editor.needsReview) return;
    try {
      const values = await form.validateFields();
      await editor.save(() => {
        if (entry && !actionsFor(detail.request, entry.quote).process) throw new Error('이 업체의 처리 상태는 변경할 수 없습니다.');
        const body = buildProcessing(values, detail.request);
        return entry ? {type:'quoteProcessing',quoteId:entry.quote.quoteId,body} : {type:'requestProcessing',body};
      });
    } catch { /* Field errors are shown by Form. */ }
  }
  return <Modal open title={`${entry?.quote.vendorName ?? '요청 전체'} · 처리 상태`} onOk={() => void submit()} onCancel={editor.close}
    okText="처리 상태 반영" cancelText="취소" confirmLoading={editor.pending} okButtonProps={{disabled:editor.pending || editor.needsReview,danger:status==='REJECTED'}}
    cancelButtonProps={{disabled:editor.pending}} closable={!editor.pending} mask={{closable:false}} keyboard={!editor.pending}>
    <Typography.Paragraph type="secondary">처리 상태와 사유는 임대인에게 공개됩니다. 업체 한 곳의 시간 소요도 요청 전체의 공통 마감을 연장합니다.</Typography.Paragraph>
    {editor.error && <Alert type="error" title="저장 결과 확인" description={editor.error} showIcon />}
    <Form name="maintenance-processing" form={form} layout="vertical" disabled={editor.pending} onValuesChange={editor.changed}
      initialValues={{ status:entry?.quote.processingStatus ?? detail.request.processingStatus ?? 'WAITING', reason:entry ? entry.quote.processingReason : detail.request.processingReason, closesAt:detail.request.closesAt }}>
      <Form.Item name="status" label="처리 상태" rules={[{required:true}]}><Select options={options(processingLabels)} /></Form.Item>
      {status !== 'WAITING' && <Form.Item name="reason" label="처리 사유 (임대인 공개)" rules={[{required:status==='REJECTED',whitespace:true,message:'반려 사유를 입력하세요.'},{max:1000}]}><Input.TextArea rows={4} maxLength={1000} showCount /></Form.Item>}
      {status === 'DELAYED' && <Form.Item name="closesAt" label="새 공통 마감 시각 (서울)" extra="YYYY-MM-DDTHH:mm:ss · 기존 마감 이상인 미래 시각" rules={[{required:true,message:'공통 마감 시각을 입력하세요.'}]}><Input placeholder="2026-10-08T18:00:00" /></Form.Item>}
      {status === 'WAITING' && <Typography.Paragraph>사유는 비워지고, 연장한 마감은 유지됩니다.</Typography.Paragraph>}
      {status === 'REJECTED' && <><Alert type="warning" title={entry ? '이 업체에 대한 추가 전달·회신이 차단됩니다.' : '요청을 종료하고 모든 업체의 추가 전달·회신·정정을 차단합니다.'} description="반려는 취소하거나 사유를 수정할 수 없습니다. 기존 공개 견적은 유지됩니다." />
        <Form.Item name="confirmed" valuePropName="checked" rules={[{validator:(_,value) => value ? Promise.resolve() : Promise.reject(new Error('반려의 영향을 확인하세요.'))}]}><Checkbox>반려 후 되돌릴 수 없음을 확인했습니다.</Checkbox></Form.Item></>}
    </Form>
  </Modal>;
}
