'use client';
import { Alert, Form, Input, Modal, Select, Typography } from 'antd';
import type { AdminDetail, AdminQuote, DeliveryInput } from '../types';
import { buildDelivery } from '../validation';
import { actionsFor } from '../state';
import { seoulNow } from '../time';
import { useEditor } from './useEditor';
export function DeliveryModal({ detail, entry, onClose }: { detail: AdminDetail; entry: AdminQuote; onClose: () => void }) {
  const [form] = Form.useForm<DeliveryInput>();
  const editor = useEditor(detail.request.requestId, onClose);
  async function submit() {
    if (editor.pending || editor.needsReview) return;
    try {
      const values = await form.validateFields();
      await editor.save(() => {
        if (!actionsFor(detail.request,entry.quote).deliver) throw new Error('현재 상태에서는 전달을 기록할 수 없습니다.');
        return {type:'delivery',quoteId:entry.quote.quoteId,body:buildDelivery(values,detail.request)};
      });
    } catch { /* Form owns field errors. */ }
  }
  return <Modal open title={`${entry.quote.vendorName} · 전달 기록`} onOk={() => void submit()} onCancel={editor.close} okText="전달 기록 저장" cancelText="취소"
    confirmLoading={editor.pending} okButtonProps={{disabled:editor.pending || editor.needsReview}} cancelButtonProps={{disabled:editor.pending}}
    closable={!editor.pending} keyboard={!editor.pending} mask={{closable:false}}>
    <Typography.Paragraph>이미 업체에 연락한 사실을 기록합니다. 이 버튼은 문자나 메시지를 발송하지 않습니다.</Typography.Paragraph>
    {editor.error && <Alert type="error" title="저장 결과 확인" description={editor.error} showIcon />}
    <Form name="maintenance-delivery" form={form} layout="vertical" initialValues={{sentAt:seoulNow(),deliveryChannel:'PHONE'}} disabled={editor.pending} onValuesChange={editor.changed}>
      <Form.Item name="deliveryChannel" label="전달 채널" rules={[{required:true}]}><Select options={[{value:'PHONE',label:'전화'},{value:'SMS',label:'문자'},{value:'MESSENGER',label:'메신저'},{value:'OTHER',label:'기타'}]} /></Form.Item>
      <Form.Item name="sentAt" label="실제 전달 시각 (서울)" extra="YYYY-MM-DDTHH:mm:ss" rules={[{required:true,message:'실제 전달 시각을 입력하세요.'}]}><Input /></Form.Item>
    </Form>
  </Modal>;
}
