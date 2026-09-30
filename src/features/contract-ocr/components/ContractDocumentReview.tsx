"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Form, Image, Popconfirm, Row, Select, Space, Spin, Tag, Typography } from "antd";
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

const { Text, Title } = Typography;
const REJECTION_OPTIONS = [
  { value: "UNREADABLE", label: "내용을 읽을 수 없음" },
  { value: "NOT_A_CONTRACT", label: "계약서가 아님" },
  { value: "EXPIRED", label: "만료된 계약서" },
  { value: "DUPLICATE", label: "중복 제출" },
];
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
    try {
      await rejectMutation.mutateAsync({ documentId: document.documentId, reason: rejectionReason });
      notification.success({ title: "계약서를 반려했습니다." });
      onCompleted();
    } catch (error) {
      notification.error({ title: "반려 실패", description: errorMessage(error, "문서 상태를 확인한 뒤 다시 시도해 주세요.") });
    } finally {
      actionInProgress.current = false;
    }
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
      {isPendingReview && (
        <Card title="선택 OCR 분석" size="small">
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
      <Card title={isPendingReview ? "임차인 등록 정보" : "등록된 임차인 수정"}>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {isPendingReview && draftQuery.isError && <Alert type="warning" showIcon
            title={errorMessage(draftQuery.error, "보관된 초안을 불러오지 못했습니다. 원본을 확인해 직접 입력할 수 있습니다.")}
            action={<Button size="small" onClick={() => draftQuery.refetch()}>초안 다시 조회</Button>} />}
          {isPendingReview && draftQuery.data && <Popconfirm title="보관된 초안을 적용할까요?" description="현재 입력값을 보관된 초안으로 바꿉니다."
            okText="적용" cancelText="취소" disabled={isBusy} onConfirm={() => applyValues(draftQuery.data!.values)}>
            <Button disabled={isBusy}>보관된 초안 적용</Button>
          </Popconfirm>}
          <Text type="secondary">{isPendingReview ? "원본과 입력값을 확인한 뒤 등록해 주세요." : "납부 방식과 청구 주기는 변경할 수 없습니다."}</Text>
          {savedTenantState === "failed" && <Alert type="warning" showIcon title="저장 완료 · 저장된 정보 조회 실패"
            description="중복 저장을 막기 위해 입력을 잠시 잠갔습니다. 저장된 정보를 다시 확인해 주세요."
            action={<Button onClick={retrySavedTenantLookup}>저장된 정보 다시 조회</Button>} />}
          <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleSubmit} disabled={isBusy || savedTenantState === "failed"}>
            <TenantInfoFormFields form={form} contractTypeEditable={isPendingReview} billingTimingEditable={isPendingReview} rentBillingCycleEditable={isPendingReview} />
            <Button type="primary" htmlType="submit" block loading={registerMutation.isPending || updateTenantMutation.isPending}
              disabled={isBusy || savedTenantState !== "idle" || !canSubmit || (!isPendingReview && !isDirty)}>{isPendingReview ? "임차인 등록" : "수정"}</Button>
          </Form>
          {isPendingReview && <Space orientation="vertical" style={{ width: "100%" }}>
            <label htmlFor="contract-rejection-reason">반려 사유</label>
            <Select id="contract-rejection-reason" aria-label="반려 사유" placeholder="반려 사유 선택" options={REJECTION_OPTIONS}
              value={rejectionReason} onChange={setRejectionReason} disabled={isBusy} style={{ width: "100%" }} />
            <Popconfirm title="계약서를 반려할까요?" description="선택한 사유로 반려 처리합니다."
              okText="반려" cancelText="취소" okButtonProps={{ danger: true }} disabled={isBusy || !rejectionReason} onConfirm={handleReject}>
              <Button danger disabled={isBusy || !rejectionReason} loading={rejectMutation.isPending}>계약서 반려</Button>
            </Popconfirm>
          </Space>}
        </Space>
      </Card>
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
  return <Space orientation="vertical" size={16} style={{ width: "100%" }}>
    <Button icon={<ArrowLeftOutlined />} onClick={onBack}>목록으로</Button>
    <Title level={4} style={{ margin: 0 }}>계약서 검수</Title>
    {documentQuery.isPending ? <Spin /> : !document ? <Alert type="error" showIcon
      title={errorMessage(documentQuery.error, "계약서를 불러오지 못했습니다.")}
      action={<Button onClick={() => documentQuery.refetch()}>다시 조회</Button>} /> : <>
      <Text type="secondary">문서 {document.documentId} · 유저 {document.userId} · 건물 {document.propertyId}</Text>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={12}><Card title="계약서 원본" extra={<Button icon={<ReloadOutlined />} loading={filesQuery.isFetching} onClick={() => filesQuery.refetch()}>원본 새로고침</Button>}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Text type="secondary">원본에는 개인정보가 포함되어 있습니다. 검수 목적으로만 열람해 주세요.</Text>
            {filesQuery.isPending ? <Spin /> : filesQuery.isError ? <Alert type="error" showIcon title={errorMessage(filesQuery.error, "원본을 불러오지 못했습니다. 보관 기간이나 접근 권한을 확인해 주세요.")} /> :
              <Image.PreviewGroup>{filesQuery.data?.files.map((file) => <Image key={file.fileId} src={file.url} alt={`계약서 ${file.fileIndex + 1}페이지`} style={{ width: "100%", marginBottom: 12 }} />)}</Image.PreviewGroup>}
          </Space>
        </Card></Col>
        <Col xs={24} xl={12}><ContractDocumentForm key={`${document.documentId}-${document.tenantId ?? "none"}`} document={document} onCompleted={onBack} /></Col>
      </Row>
    </>}
  </Space>;
}
