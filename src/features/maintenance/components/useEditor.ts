'use client';
import { useRef, useState } from 'react';
import { App } from 'antd';
import { isAxiosError } from 'axios';
import { useUnsavedChanges } from '@/components/NavigationGuard';
import { parseProblemDetail } from '@/lib/api/problem';
import { useMaintenanceMutation, type MaintenanceAction } from '../hooks';
export function useEditor(requestId: number, onClose: () => void) {
  const mutation = useMaintenanceMutation(requestId);
  const { message, modal } = App.useApp();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string>();
  const [needsReview, setNeedsReview] = useState(false);
  const lock = useRef(false);
  const clearGuard = useUnsavedChanges(dirty || mutation.isPending);
  function close() {
    if (lock.current) return;
    const finish = () => { clearGuard?.(); onClose(); };
    if (dirty) modal.confirm({ title: '입력 내용을 버릴까요?', content: '저장하지 않은 입력은 사라집니다.', okText: '버리고 닫기', cancelText: '계속 작성', onOk: finish });
    else finish();
  }
  async function save(build: () => MaintenanceAction) {
    if (lock.current || needsReview) return;
    lock.current = true;
    setError(undefined);
    try {
      const action = build();
      await mutation.mutateAsync(action);
      clearGuard?.();
      message.success('저장했습니다. 임대인 앱 조회에 반영됩니다.');
      onClose();
    } catch (err) {
      const problem = parseProblemDetail(err);
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const uncertain = isAxiosError(err) && (status === undefined || status === 409 || status >= 500);
      setNeedsReview(uncertain);
      setError(`${problem?.detail || (err instanceof Error ? err.message : '저장하지 못했습니다.')}${uncertain ? ' 입력은 유지됩니다. 닫은 뒤 최신 상세를 확인하고 다시 작업하세요.' : ''}`);
    } finally { lock.current = false; }
  }
  return { pending: mutation.isPending, error, needsReview, close, save, changed: () => setDirty(true) };
}
