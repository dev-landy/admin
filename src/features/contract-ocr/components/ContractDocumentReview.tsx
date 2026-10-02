"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Flex, Form, Image, Modal, Popconfirm, Select, Space, Spin, Switch, Tag, Typography } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

import {
  isContractOcrAnalysisRunning, useContractDocument, useContractDocumentDraft, useContractDocumentFiles,
  useLatestContractOcrAnalysis, useRegisterContractDocument, useRejectContractDocument, useRequestContractOcrAnalysis,
} from "../hooks";
import type { ContractDocument, ContractDocumentRejectionReason, ContractDraftValues } from "../types";
import { fetchTenant } from "@/features/tenants/api";
import {
  TenantInfoFormFields, type TenantInfoFormValues, fromTenantDetail, fromTenantValues,
  isTenantFormComplete, toTenantValues, toUpdateTenantRequest,
} from "@/features/tenants/components/TenantInfoForm";
import { tenantKeys, useUpdateTenant } from "@/features/tenants/hooks";
import { parseProblemDetail } from "@/lib/api/problem";
import styles from "./ContractDocumentReview.module.css";

const { Text, Title } = Typography;
const REJECTION_OPTIONS = [
  { value: "UNREADABLE", label: "내용을 읽을 수 없음" },
  { value: "NOT_A_CONTRACT", label: "계약서가 아님" },
  { value: "EXPIRED", label: "만료된 계약서" },
  { value: "DUPLICATE", label: "중복 제출" },
];
const REJECTION_NOTIFICATION_DEFAULTS: Record<ContractDocumentRejectionReason, boolean> = {
  UNREADABLE: true,
  NOT_A_CONTRACT: true,
  EXPIRED: true,
  DUPLICATE: false,
};
const ANALYSIS_LABELS = {
  QUEUED: "분석 대기", PROCESSING: "분석 중", SUCCEEDED: "분석 완료", FAILED: "분석 실패", TIMED_OUT: "분석 시간 초과",
};
const EMPTY_FORM: TenantInfoFormValues = {
  contractType: "ROOM", parkingEnabled: false, basement: false, billingTiming: "PREPAID", rentBillingCycle: "MONTHLY",
};

function errorMessage(error: unknown, fallback: string) {
  return parseProblemDetail(error)?.detail ?? fallback;
}

function ContractDocumentEditor({ document, initialValues, onCompleted }: {
  document: ContractDocument;
  initialValues: TenantInfoFormValues;
  onCompleted: () => void;
}) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<TenantInfoFormValues>();
  const [initialSnapshot, setInitialSnapshot] = useState(() => JSON.stringify(toTenantValues(initialValues)));
  const [rejectionReason, setRejectionReason] = useState<ContractDocumentRejectionReason>();
  const [rejectionNotifyUser, setRejectionNotifyUser] = useState(true);
  const [rejectionNotificationOverridden, setRejectionNotificationOverridden] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionError, setRejectionError] = useState<string>();
  const actionInProgress = useRef(false);
  const [savedTenantState, setSavedTenantState] = useState<"idle" | "checking" | "failed">("idle");
  const [analysisRequestUncertain, setAnalysisRequestUncertain] = useState(false);
  const [analysisRechecking, setAnalysisRechecking] = useState(false);
  const isPendingReview = document.status === "PENDING_REVIEW";
  const draftQuery = useContractDocumentDraft(document.documentId, isPendingReview);
  const analysisQuery = useLatestContractOcrAnalysis(document.documentId, isPendingReview);
  const registerMutation = useRegisterContractDocument();
  const rejectMutation = useRejectContractDocument();
  const requestAnalysisMutation = useRequestContractOcrAnalysis();
  const updateTenantMutation = useUpdateTenant(document.tenantId ?? 0);
  const watchedValues = Form.useWatch([], form);
  const canSubmit = isTenantFormComplete(watchedValues);
  const isDirty = JSON.stringify(toTenantValues(watchedValues ?? {})) !== initialSnapshot;
  const analysis = analysisQuery.data;
  const analysisRunning = isContractOcrAnalysisRunning(analysis);
  const isBusy = registerMutation.isPending || rejectMutation.isPending || requestAnalysisMutation.isPending || updateTenantMutation.isPending || savedTenantState === "checking" || analysisRechecking;
  const analysisRequestDisabled = isBusy || analysisRunning || analysisQuery.isFetching || analysisQuery.isPending || analysisQuery.isError || analysisRequestUncertain;

  // PATCH는 본문 없이 성공한다. 생략한 필드를 서버가 유지할 수 있으므로 저장 이후에만 확정값을 다시 읽는다.
  async function syncSavedTenant() {
    setSavedTenantState("checking");
    try {
      const savedTenant = await fetchTenant(document.tenantId!);
      const savedValues = fromTenantDetail(savedTenant);
      form.setFieldsValue(savedValues);
      setInitialSnapshot(JSON.stringify(toTenantValues(savedValues)));
      queryClient.setQueryData(tenantKeys.detail(savedTenant.tenantId), savedTenant);
      setSavedTenantState("idle");
      return true;
    } catch {
      setSavedTenantState("failed");
      notification.warning({ title: "저장은 완료했지만 저장된 정보를 불러오지 못했습니다.", description: "다시 저장하지 말고 저장된 정보를 재조회해 주세요." });
      return false;
    }
  }

  async function retrySavedTenantLookup() {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    try { await syncSavedTenant(); } finally { actionInProgress.current = false; }
  }

  async function verifyAnalysisStatus() {
    setAnalysisRechecking(true);
    try {
      const result = await analysisQuery.refetch();
      setAnalysisRequestUncertain(result.isError);
    } finally {
      setAnalysisRechecking(false);
    }
  }

  // refetch 결과는 initialValues로 자동 재적용하지 않는다. 초안과 OCR는 관리자 확인 후에만 폼을 바꾼다.
  function applyValues(values: ContractDraftValues) {
    if (actionInProgress.current) return;
    const formValues = fromTenantValues({
      name: null, roomNumber: null, phone: null, rentPrice: null, maintenanceFee: null,
      depositAmount: null, paymentDay: null, startDate: null, endDate: null, ...values,
    });
    form.setFieldsValue(formValues);
  }

  async function handleSubmit(values: TenantInfoFormValues) {
    if (actionInProgress.current || savedTenantState !== "idle") return;
    actionInProgress.current = true;
    try {
      if (isPendingReview) {
        const registrationValues = toTenantValues(values);
        await registerMutation.mutateAsync({ documentId: document.documentId, values: registrationValues });
        notification.success({ title: "임차인 등록이 완료되었습니다." });
        onCompleted();
      } else {
        const request = toUpdateTenantRequest(values);
        await updateTenantMutation.mutateAsync(request);
        const synchronized = await syncSavedTenant();
        if (synchronized) notification.success({ title: "임차인 정보가 수정되었습니다." });
      }
    } catch (error) {
      notification.error({ title: "저장 실패", description: errorMessage(error, "입력값과 문서 상태를 확인한 뒤 다시 시도해 주세요.") });
    } finally {
      actionInProgress.current = false;
    }
  }

  async function handleReject() {
    if (!rejectionReason || actionInProgress.current) return;
    actionInProgress.current = true;
    setRejectionError(undefined);
    try {
      await rejectMutation.mutateAsync({ documentId: document.documentId, reason: rejectionReason, notifyUser: rejectionNotifyUser });
      notification.success({ title: "계약서를 반려했습니다." });
      setRejectionModalOpen(false);
      onCompleted();
    } catch (error) {
      setRejectionError(errorMessage(error, "문서 상태를 확인한 뒤 다시 시도해 주세요."));
    } finally {
      actionInProgress.current = false;
    }
  }

  function openRejectionModal() {
    if (actionInProgress.current || isBusy) return;
    setRejectionReason(undefined);
    setRejectionNotifyUser(true);
    setRejectionNotificationOverridden(false);
    setRejectionError(undefined);
    setRejectionModalOpen(true);
  }

  function closeRejectionModal() {
    if (actionInProgress.current || isBusy) return;
    setRejectionModalOpen(false);
    setRejectionReason(undefined);
    setRejectionNotifyUser(true);
    setRejectionNotificationOverridden(false);
    setRejectionError(undefined);
  }

  function selectRejectionReason(reason: ContractDocumentRejectionReason) {
    setRejectionReason(reason);
    setRejectionNotifyUser(REJECTION_NOTIFICATION_DEFAULTS[reason]);
    setRejectionNotificationOverridden(false);
  }

  function changeRejectionNotification(notifyUser: boolean) {
    setRejectionNotifyUser(notifyUser);
    setRejectionNotificationOverridden(true);
  }

  async function handleRequestAnalysis() {
    if (actionInProgress.current || analysisRequestDisabled) return;
    actionInProgress.current = true;
    try {
      await requestAnalysisMutation.mutateAsync(document.documentId);
      notification.success({ title: "OCR 분석을 요청했습니다.", description: "완료된 제안 값은 확인 후 직접 적용할 수 있습니다." });
    } catch (error) {
      notification.error({ title: "OCR 요청 결과를 확인하지 못했습니다.", description: errorMessage(error, "서버 접수 여부를 다시 확인합니다.") });
      setAnalysisRequestUncertain(true);
      await verifyAnalysisStatus();
    } finally {
      actionInProgress.current = false;
    }
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card title={isPendingReview ? "임차인 정보" : "등록된 임차인 수정"}>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Text type="secondary">{isPendingReview ? "원본과 입력값을 확인한 뒤 등록해 주세요." : "납부 방식과 청구 주기는 변경할 수 없습니다."}</Text>
          {savedTenantState === "failed" && <Alert type="warning" showIcon title="저장 완료 · 저장된 정보 조회 실패"
            description="중복 저장을 막기 위해 입력을 잠시 잠갔습니다. 저장된 정보를 다시 확인해 주세요."
            action={<Button onClick={retrySavedTenantLookup}>저장된 정보 다시 조회</Button>} />}
          <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit} disabled={isBusy || savedTenantState === "failed"}>
            <TenantInfoFormFields form={form} contractTypeEditable={isPendingReview} billingTimingEditable={isPendingReview} rentBillingCycleEditable={isPendingReview} />
            {isPendingReview ? <div className={styles.actions}>
              <Button type="primary" htmlType="submit" block loading={registerMutation.isPending || updateTenantMutation.isPending}
                disabled={isBusy || savedTenantState !== "idle" || !canSubmit}>계약 등록</Button>
              <Button danger htmlType="button" block disabled={isBusy} onClick={openRejectionModal}>반려</Button>
            </div> : <Button type="primary" htmlType="submit" block loading={updateTenantMutation.isPending}
              disabled={isBusy || savedTenantState !== "idle" || !canSubmit || !isDirty}>수정</Button>}
          </Form>
        </Space>
      </Card>
      {isPendingReview && (
        <Card title="OCR 분석 (선택)" size="small">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text type="secondary">원본을 직접 확인해 등록할 수 있습니다. OCR은 입력을 돕는 제안이며 자동으로 등록하지 않습니다.</Text>
            {analysisQuery.isPending ? <Spin size="small" /> : analysisQuery.isError ? (
              <Alert type="error" showIcon title={errorMessage(analysisQuery.error, "OCR 상태를 불러오지 못했습니다.")}
                action={!analysisRequestUncertain && <Button size="small" loading={analysisRechecking} onClick={verifyAnalysisStatus}>상태 다시 조회</Button>} />
            ) : analysis ? (
              <>
                <Tag color={analysisRunning ? "blue" : analysis.status === "SUCCEEDED" ? "green" : "orange"}>{ANALYSIS_LABELS[analysis.status]}</Tag>
                {(analysis.status === "FAILED" || analysis.status === "TIMED_OUT") && <Text>원본을 직접 검수하거나 OCR 분석을 다시 요청할 수 있습니다.</Text>}
                {analysis.warnings.map((warning, index) => <Alert key={`${warning.field}-${warning.code}-${index}`} type="warning" title={warning.message} showIcon />)}
                {analysis.status === "SUCCEEDED" && analysis.values && (
                  <Popconfirm title="OCR 제안 값을 적용할까요?" description="현재 입력값을 제안 값으로 바꿉니다. 적용 후 원본과 대조해 주세요."
                    okText="적용" cancelText="취소" disabled={isBusy} onConfirm={() => applyValues(analysis.values!)}>
                    <Button disabled={isBusy}>OCR 제안 값 적용</Button>
                  </Popconfirm>
                )}
              </>
            ) : <Text>아직 요청한 OCR 분석이 없습니다.</Text>}
            {analysisRequestUncertain && <Alert type="warning" showIcon title="OCR 접수 여부를 확인해야 새 분석을 요청할 수 있습니다."
              action={<Button size="small" loading={analysisRechecking} onClick={verifyAnalysisStatus}>상태 다시 조회</Button>} />}
            <Popconfirm title={analysis ? "OCR 분석을 다시 요청할까요?" : "OCR 분석을 요청할까요?"}
              description={analysis ? "새 분석은 추가 비용이 발생할 수 있습니다. 현재 입력값은 유지됩니다." : "분석 비용이 발생할 수 있습니다. 현재 입력값은 유지됩니다."}
              okText="분석 요청" cancelText="취소" onConfirm={handleRequestAnalysis}
              disabled={analysisRequestDisabled}>
              <Button loading={requestAnalysisMutation.isPending} disabled={analysisRequestDisabled}>
                {analysis ? "OCR 다시 분석" : "OCR 분석 요청"}
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}
      {isPendingReview && (draftQuery.data || draftQuery.isError) && <Card title="이전 검수 입력" size="small">
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text type="secondary">이전에 보관한 검수 입력값이 있으면 다시 불러올 수 있습니다.</Text>
          {draftQuery.isError ? <Alert type="warning" showIcon
            title={errorMessage(draftQuery.error, "이전 검수 입력을 불러오지 못했습니다. 원본을 확인해 직접 입력할 수 있습니다.")}
            action={<Button size="small" onClick={() => draftQuery.refetch()}>이전 입력 다시 조회</Button>} /> : (
            <Popconfirm title="이전 검수 입력을 불러올까요?" description="현재 입력값을 이전 검수 입력으로 바꿉니다."
              okText="불러오기" cancelText="취소" disabled={isBusy} onConfirm={() => applyValues(draftQuery.data!.values)}>
              <Button disabled={isBusy}>이전 검수 입력 불러오기</Button>
            </Popconfirm>
          )}
        </Space>
      </Card>}
      <Modal title="계약서 반려" open={rejectionModalOpen} onOk={handleReject} onCancel={closeRejectionModal}
        okText="반려 확정" cancelText="취소" confirmLoading={rejectMutation.isPending}
        okButtonProps={{ danger: true, disabled: !rejectionReason || isBusy }} cancelButtonProps={{ disabled: isBusy }}
        closable={!isBusy} mask={{ closable: !isBusy }} keyboard={!isBusy} destroyOnHidden>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Text>사유를 선택한 뒤 반려를 확정해 주세요.</Text>
          <Form layout="vertical">
            <Form.Item label="반려 사유" htmlFor="contract-rejection-reason" required>
              <Select id="contract-rejection-reason" aria-label="반려 사유" placeholder="반려 사유 선택" options={REJECTION_OPTIONS}
                value={rejectionReason} onChange={selectRejectionReason} disabled={isBusy} style={{ width: "100%" }} />
            </Form.Item>
            <Card size="small">
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                <Flex align="center" justify="space-between" gap={12}>
                  <Text id="contract-rejection-notification-label">사용자에게 결과 알림 보내기</Text>
                  <Switch aria-labelledby="contract-rejection-notification-label" aria-describedby="contract-rejection-notification-effect"
                    checkedChildren="켬" unCheckedChildren="끔" checked={rejectionNotifyUser} onChange={changeRejectionNotification}
                    disabled={isBusy || !rejectionReason} />
                </Flex>
                {rejectionReason && <Space size={8}>
                  <Tag>{rejectionNotificationOverridden ? "직접 변경" : "사유 기본값"}</Tag>
                  <Text type="secondary">{REJECTION_NOTIFICATION_DEFAULTS[rejectionReason] ? "기본: 알림 켬" : "기본: 알림 끔"}</Text>
                </Space>}
                <Text id="contract-rejection-notification-effect" type="secondary" aria-live="polite">
                  {!rejectionReason ? "사유를 선택하면 알림 기본값이 적용됩니다." : rejectionNotifyUser
                    ? "이 계약서의 반려 결과를 인앱 알림과 푸시로 알립니다."
                    : "이 계약서는 인앱 알림과 푸시 없이 반려 처리합니다."}
                </Text>
              </Space>
            </Card>
          </Form>
          {rejectionError && <Alert type="error" showIcon title="반려 실패" description={rejectionError} />}
        </Space>
      </Modal>
    </Space>
  );
}

function ContractDocumentForm({ document, onCompleted }: { document: ContractDocument; onCompleted: () => void }) {
  const isRegistered = document.status === "REGISTERED" && document.tenantId != null;
  const [initialTenantValues, setInitialTenantValues] = useState<TenantInfoFormValues | null>(null);
  const tenantQuery = useQuery({
    queryKey: tenantKeys.detail(document.tenantId ?? 0),
    queryFn: () => fetchTenant(document.tenantId!), enabled: isRegistered, refetchOnMount: "always",
  });
  if (document.status === "REJECTED") return <Alert type="info" showIcon title="반려된 계약서입니다." />;
  // 최초 진입에서는 캐시보다 이번 조회 결과를 기준으로 폼을 만든다. 이후 조회는 편집 중인 폼을 유지한다.
  if (isRegistered && initialTenantValues === null && tenantQuery.isFetchedAfterMount && tenantQuery.isSuccess && !tenantQuery.isFetching) {
    setInitialTenantValues(fromTenantDetail(tenantQuery.data));
  }
  if (isRegistered && initialTenantValues === null && !tenantQuery.isError) return <Spin />;
  if (isRegistered && initialTenantValues === null) return <Alert type="error" showIcon
    title={errorMessage(tenantQuery.error, "등록된 임차인 정보를 불러오지 못했습니다.")}
    action={<Button onClick={() => tenantQuery.refetch()}>다시 조회</Button>} />;
  if (document.status === "REGISTERED" && !isRegistered) return <Alert type="warning" title="연결된 임차인 정보가 없습니다." />;
  const initialValues = initialTenantValues ?? EMPTY_FORM;
  return <ContractDocumentEditor key={`${document.documentId}-${document.status}`} document={document} initialValues={initialValues} onCompleted={onCompleted} />;
}

export function ContractDocumentReview({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const documentQuery = useContractDocument(documentId);
  const filesQuery = useContractDocumentFiles(documentId);
  const document = documentQuery.data;
  return <div className={styles.review}>
    <Button className={styles.backButton} icon={<ArrowLeftOutlined />} onClick={onBack}>목록으로</Button>
    <Title level={4} style={{ margin: 0 }}>계약서 검수</Title>
    {documentQuery.isPending ? <Spin /> : !document ? <Alert type="error" showIcon
      title={errorMessage(documentQuery.error, "계약서를 불러오지 못했습니다.")}
      action={<Button onClick={() => documentQuery.refetch()}>다시 조회</Button>} /> : <>
      <Text type="secondary">문서 {document.documentId} · 유저 {document.userId} · 건물 {document.propertyId}</Text>
      <div className={styles.workspace}>
        <section className={styles.pane} aria-label="계약서 원본 영역" tabIndex={0}><Card title="계약서 원본" extra={<Button icon={<ReloadOutlined />} loading={filesQuery.isFetching} onClick={() => filesQuery.refetch()}>원본 새로고침</Button>}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Text type="secondary">원본에는 개인정보가 포함되어 있을 수 있습니다. 검수 목적으로만 열람해 주세요.</Text>
            {filesQuery.isPending ? <Spin /> : filesQuery.isError ? <Alert type="error" showIcon title={errorMessage(filesQuery.error, "원본을 불러오지 못했습니다. 보관 기간이나 접근 권한을 확인해 주세요.")} /> :
              <>{filesQuery.data?.files.map((file) => <Image key={file.fileId} preview={false} width="100%" src={file.url} alt={`계약서 ${file.fileIndex + 1}페이지`} style={{ marginBottom: 12 }} />)}</>}
          </Space>
        </Card></section>
        <section className={styles.pane} aria-label="계약서 입력 영역" tabIndex={0}><ContractDocumentForm key={`${document.documentId}-${document.tenantId ?? "none"}`} document={document} onCompleted={onBack} /></section>
      </div>
    </>}
  </div>;
}
