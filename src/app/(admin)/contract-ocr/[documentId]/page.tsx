"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Image,
  Popconfirm,
  Row,
  Space,
  Spin,
  Typography,
} from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

import {
  useCompleteContractOcrAnalysis,
  useContractOcrDocument,
  useContractOcrDraft,
  useContractOcrSources,
  useRejectContractOcrAnalysis,
  useRetryContractOcrAnalysis,
  useRetryContractOcrRegistration,
} from "@/features/contract-ocr/hooks";
import { fetchTenant } from "@/features/tenants/api";
import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantDetail,
  fromTenantValues,
  isTenantFormComplete,
  toTenantValues,
} from "@/features/tenants/components/TenantInfoForm";
import { tenantKeys, useUpdateTenant } from "@/features/tenants/hooks";
import { parseProblemDetail } from "@/lib/api/problem";

const { Title, Text } = Typography;

function ContractOcrReviewPageContent({ documentId }: { documentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notification } = App.useApp();
  const [form] = Form.useForm<TenantInfoFormValues>();

  const { data: document, isLoading: isDocumentLoading } = useContractOcrDocument(documentId);
  const isPendingMode =
    document != null &&
    (document.analysisStatus === "QUEUED" || document.analysisStatus === "PROCESSING") &&
    document.decisionStatus === "PENDING";
  const isEditMode = document?.decisionStatus === "REGISTERED" && document.tenantId != null;
  // 자동 등록이 거부된 폴백 문서: 직전 제출 값을 프리필해 고쳐서 재등록한다.
  const isFallbackMode =
    document?.analysisStatus === "REVIEW_REQUIRED" && document.decisionStatus === "PENDING";
  const isRetryableMode =
    document?.analysisStatus === "RETRYABLE_FAILED" && document.decisionStatus === "PENDING";

  const { data: tenant } = useQuery({
    queryKey: tenantKeys.detail(document?.tenantId ?? 0),
    queryFn: () => fetchTenant(document?.tenantId as number),
    enabled: isEditMode,
  });

  const { data: draft, isError: isDraftError } = useContractOcrDraft(documentId, isFallbackMode);

  useEffect(() => {
    if (tenant) {
      form.setFieldsValue(fromTenantDetail(tenant));
    }
  }, [tenant, form]);

  useEffect(() => {
    if (draft) {
      form.setFieldsValue(fromTenantValues(draft.values));
    }
  }, [draft, form]);

  // 수정 성공 시 tenant 쿼리가 무효화·재조회되므로 스냅샷은 항상 서버 상태에서 파생한다.
  const initialSnapshot = tenant ? JSON.stringify(toTenantValues(fromTenantDetail(tenant))) : null;

  const watched = Form.useWatch([], form);
  const canSubmit = isTenantFormComplete(watched);
  const isDirty =
    initialSnapshot !== null && JSON.stringify(toTenantValues(watched ?? {})) !== initialSnapshot;

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useContractOcrSources(documentId);
  const { mutate: complete, isPending: isSubmitting } = useCompleteContractOcrAnalysis();
  const { mutate: reject, isPending: isRejecting } = useRejectContractOcrAnalysis();
  const { mutate: retryAnalysis, isPending: isAnalysisRetrying } = useRetryContractOcrAnalysis();
  const { mutate: retryRegistration, isPending: isRetrying } = useRetryContractOcrRegistration();
  const { mutate: patchTenant, isPending: isPatching } = useUpdateTenant(document?.tenantId ?? 0);

  function handleReject() {
    reject(documentId, {
      onSuccess: () => {
        notification.success({
          message: "인식 불가로 처리했습니다.",
          description: "사용자에게 등록 실패 푸시가 발송됩니다.",
        });
        router.push("/contract-ocr");
      },
      onError: (err) => {
        const problem = parseProblemDetail(err);
        notification.error({
          message: problem?.title ?? "인식 불가 처리 실패",
          description: problem?.detail,
        });
      },
    });
  }

  function handleRetryAnalysis() {
    retryAnalysis(documentId, {
      onSuccess: () => {
        notification.success({
          message: "검수 요청을 다시 등록했습니다.",
          description: "검수 대기 탭에서 처리 상태를 확인할 수 있습니다.",
        });
        router.push("/contract-ocr");
      },
      onError: (err) => {
        const problem = parseProblemDetail(err);
        notification.error({
          message: problem?.title ?? "분석 재시도 실패",
          description: problem?.detail,
        });
      },
    });
  }

  function handleSubmit(values: TenantInfoFormValues) {
    const draft = toTenantValues(values);
    if (isFallbackMode) {
      retryRegistration(
        { documentId, body: { values: draft } },
        {
          onSuccess: () => {
            notification.success({
              message: "임차인으로 재등록했습니다.",
              description: "사용자에게 완료 푸시가 발송됩니다.",
            });
            router.push(listPath);
          },
          onError: (err) => {
            const problem = parseProblemDetail(err);
            notification.error({
              message: problem?.title ?? "재등록 실패",
              description: problem?.detail ?? "입력 값을 다시 확인해 주세요.",
            });
          },
        },
      );
      return;
    }
    if (isEditMode) {
      patchTenant(
        {
          name: draft.name ?? undefined,
          roomNumber: draft.roomNumber ?? undefined,
          phone: draft.phone ?? undefined,
          rentPrice: draft.rentPrice ?? undefined,
          maintenanceFee: draft.maintenanceFee ?? undefined,
          depositAmount: draft.depositAmount ?? undefined,
          paymentDay: draft.paymentDay ?? undefined,
          startDate: draft.startDate ?? undefined,
          endDate: draft.endDate ?? undefined,
        },
        {
          onSuccess: () => {
            notification.success({ message: "임차인 정보가 수정됐습니다." });
          },
          onError: (err) => {
            const problem = parseProblemDetail(err);
            notification.error({
              message: problem?.title ?? "수정 실패",
              description: problem?.detail,
            });
          },
        },
      );
      return;
    }
    complete(
      { documentId, body: { values: draft } },
      {
        onSuccess: () => {
          notification.success({
            message: "검수를 제출했습니다.",
            description: "잠시 후 임차인으로 자동 등록되고 사용자에게 완료 푸시가 발송됩니다.",
          });
          router.push("/contract-ocr");
        },
        onError: (err) => {
          const problem = parseProblemDetail(err);
          notification.error({
            message: problem?.title ?? "제출 실패",
            description: problem?.detail,
          });
        },
      },
    );
  }

  const sourceProblem = isError ? parseProblemDetail(error) : null;
  const isBusy = isSubmitting || isPatching || isRejecting || isRetrying || isAnalysisRetrying;
  // 완료 탭에서 들어온 경우에만 완료 탭으로 복귀한다. 직접 진입(Slack 링크 등)은 기본인 검수 대기로 나간다.
  const listPath =
    searchParams.get("from") === "completed" ? "/contract-ocr?status=completed" : "/contract-ocr";
  const formEditable = isPendingMode || isEditMode || isFallbackMode;
  const stateNotice =
    !isDocumentLoading && document != null && !formEditable
      ? document.analysisStatus === "STORING"
        ? "검수 결과를 확정하는 중입니다. 잠시 후 새로고침해 주세요."
        : document.analysisStatus === "FINAL_FAILED"
          ? "인식 불가 처리된 계약서입니다."
          : document.decisionStatus === "DISCARDED"
            ? "제외 처리된 계약서입니다."
            : document.analysisStatus === "RETRYABLE_FAILED"
              ? "검수 요청 처리에 실패했습니다. 아래 버튼으로 관리자 검수를 다시 요청해 주세요."
              : "처리할 수 없는 상태의 계약서입니다."
      : null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(listPath)}>
        목록으로
      </Button>
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            title={<Title level={5} style={{ margin: 0 }}>계약서 원본</Title>}
            extra={
              <Button icon={<ReloadOutlined />} loading={isRefetching} onClick={() => refetch()}>
                열람 URL 갱신
              </Button>
            }
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Alert
                type="warning"
                showIcon
                message="세입자의 개인정보가 포함된 문서입니다."
                description={
                  <>
                    이미지·URL을 다운로드하거나 다른 곳(Slack 등)으로 옮기지 마세요.
                    <br />
                    열람 기록은 서버에 남습니다.
                  </>
                }
              />
              {isLoading ? (
                <Spin style={{ display: "block", textAlign: "center", margin: "40px 0" }} />
              ) : isError ? (
                <Alert
                  type="error"
                  showIcon
                  message={sourceProblem?.title ?? "원본을 불러오지 못했습니다."}
                  description={sourceProblem?.detail}
                />
              ) : (
                <Image.PreviewGroup>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    {data?.sources.map((source) => (
                      <Image
                        key={source.url}
                        src={source.url}
                        alt={`계약서 원본 ${source.sourceIndex + 1}`}
                        style={{ maxWidth: "100%" }}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              )}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Title level={5} style={{ margin: 0 }}>
                {isEditMode ? "임차인 정보 수정" : "임차인 정보 입력"}
              </Title>
            }
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {stateNotice ? (
                <Alert type="info" showIcon message={stateNotice} />
              ) : isFallbackMode ? (
                <Alert
                  type="warning"
                  showIcon
                  message="자동 등록에 실패한 계약서입니다."
                  description={
                    isDraftError
                      ? "직전 제출 값을 불러오지 못했습니다. 원본을 보고 값을 다시 입력한 뒤 재등록해 주세요."
                      : "직전에 제출한 값을 채워 두었습니다. 값을 확인·수정한 뒤 재등록해 주세요."
                  }
                />
              ) : (
                <Text type="secondary">
                  {isEditMode
                    ? "등록된 임차인 정보입니다. 값을 변경하면 '수정' 버튼이 활성화됩니다."
                    : "계약서에서 확인한 값만 입력하세요. 필수(*) 항목을 모두 입력하면 제출 즉시 임차인으로 등록됩니다. 관리비·보증금은 비워 두면 0으로 등록됩니다."}
                </Text>
              )}
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                disabled={isBusy || !formEditable}
                initialValues={{ basement: false }}
              >
                <TenantInfoFormFields form={form} />
                {formEditable &&
                  (isPendingMode ? (
                    <Row gutter={8}>
                      <Col span={12}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={isSubmitting}
                          disabled={!canSubmit}
                          block
                        >
                          제출
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Popconfirm
                          title="인식 불가로 처리할까요?"
                          description="계약서로 인식할 수 없는 업로드를 실패 확정하고, 사용자에게 실패 푸시를 보냅니다."
                          okText="인식 불가 처리"
                          okButtonProps={{ danger: true }}
                          cancelText="취소"
                          onConfirm={handleReject}
                        >
                          <Button type="primary" danger loading={isRejecting} block>
                            인식 불가
                          </Button>
                        </Popconfirm>
                      </Col>
                    </Row>
                  ) : isFallbackMode ? (
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={isRetrying}
                      disabled={!canSubmit}
                      block
                    >
                      재등록
                    </Button>
                  ) : (
                    <Button type="primary" htmlType="submit" loading={isPatching} disabled={!isDirty} block>
                      수정
                    </Button>
                  ))}
              </Form>
              {isRetryableMode && (
                <Button type="primary" loading={isAnalysisRetrying} onClick={handleRetryAnalysis} block>
                  검수 요청 재시도
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

export default function ContractOcrReviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  return (
    <Suspense fallback={<Spin style={{ display: "block", textAlign: "center", margin: "80px 0" }} />}>
      <ContractOcrReviewPageContent documentId={documentId} />
    </Suspense>
  );
}
