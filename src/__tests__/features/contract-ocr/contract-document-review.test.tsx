import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, Grid } from "antd";
import { AxiosError, AxiosHeaders } from "axios";
import { ContractDocumentReview } from "@/features/contract-ocr/components/ContractDocumentReview";
import { contractDocumentKeys } from "@/features/contract-ocr/hooks";
import {
  fetchContractDocument, fetchContractDocumentDraft, fetchContractDocumentFiles, fetchLatestContractOcrAnalysis,
  registerContractDocument, rejectContractDocument, requestContractOcrAnalysis,
} from "@/features/contract-ocr/api";
import { fetchTenant, updateTenant } from "@/features/tenants/api";
import { tenantKeys } from "@/features/tenants/hooks";
import { ANALYSIS, DOCUMENT, TENANT, VALUES } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/features/contract-ocr/api", () => ({
  fetchContractDocument: jest.fn(), fetchContractDocumentDraft: jest.fn(), fetchContractDocumentFiles: jest.fn(),
  fetchLatestContractOcrAnalysis: jest.fn(), registerContractDocument: jest.fn(), rejectContractDocument: jest.fn(), requestContractOcrAnalysis: jest.fn(),
}));
jest.mock("@/features/tenants/api", () => ({ fetchTenant: jest.fn(), updateTenant: jest.fn() }));
const mockDocument = jest.mocked(fetchContractDocument);
const mockDraft = jest.mocked(fetchContractDocumentDraft);
const mockFiles = jest.mocked(fetchContractDocumentFiles);
const mockLatest = jest.mocked(fetchLatestContractOcrAnalysis);
const mockRegister = jest.mocked(registerContractDocument);
const mockReject = jest.mocked(rejectContractDocument);
const mockRequest = jest.mocked(requestContractOcrAnalysis);
const mockTenant = jest.mocked(fetchTenant);
const mockUpdateTenant = jest.mocked(updateTenant);
const onBack = jest.fn();
let client: QueryClient;
function renderReview(cachedTenant?: typeof TENANT) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (cachedTenant) client.setQueryData(tenantKeys.detail(cachedTenant.tenantId), cachedTenant);
  render(<QueryClientProvider client={client}><App><ContractDocumentReview documentId={DOCUMENT.documentId} onBack={onBack} /></App></QueryClientProvider>);
}
async function applyDraft() {
  fireEvent.click(await screen.findByRole("button", { name: "이전 검수 입력 불러오기" }));
  fireEvent.click(await screen.findByRole("button", { name: "불러오기" }));
  await waitFor(() => expect(screen.getByLabelText("세입자 이름")).toHaveValue("홍길동"));
}
async function openOriginal() {
  fireEvent.click(await screen.findByRole("button", { name: "계약서 원본 펼치기" }));
  return screen.findByRole("img", { name: "계약서 1페이지" });
}
function conflict(detail: string) {
  return new AxiosError("conflict", undefined, undefined, undefined, {
    data: { type: "/problems/conflict", title: "요청 충돌", detail, status: 409 },
    status: 409, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  mockDocument.mockResolvedValue(DOCUMENT);
  mockDraft.mockResolvedValue(null);
  mockFiles.mockResolvedValue({ files: [{ fileId: "file-1", fileIndex: 0, contentType: "image/jpeg", url: "https://example.test/contract.jpg", expiresAt: "2026-09-30T10:00:00Z" }] });
  mockLatest.mockResolvedValue(null);
  mockTenant.mockResolvedValue(TENANT);
  mockRegister.mockResolvedValue({ documentId: DOCUMENT.documentId, status: "REGISTERED", tenantId: 9, uploadStatus: "REGISTERED" });
  mockReject.mockResolvedValue({ documentId: DOCUMENT.documentId, status: "REJECTED", uploadStatus: "REJECTED" });
  mockRequest.mockResolvedValue(ANALYSIS);
});
afterEach(() => client?.clear());

test("분석이나 보관 초안이 없어도 수동 검수 화면을 열고 원본 파일을 표시한다", async () => {
  renderReview();
  expect(await screen.findByText("아직 요청한 OCR 분석이 없습니다.")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toBeEnabled();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.queryByText("이전 검수 입력")).not.toBeInTheDocument();
  expect(await openOriginal()).toHaveAttribute("src", "https://example.test/contract.jpg");
  expect(mockRequest).not.toHaveBeenCalled();
});

test("좁은 화면의 원본은 기본으로 접고 열기·새로고침·닫기 중 임차인 입력을 유지한다", async () => {
  renderReview();
  const toggle = await screen.findByRole("button", { name: "계약서 원본 펼치기" });
  await waitFor(() => expect(within(toggle).getByText("1페이지")).toBeInTheDocument());
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("img", { name: "계약서 1페이지" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "입력 중인 이름" } });
  await openOriginal();
  expect(screen.getByRole("button", { name: "계약서 원본 접기" })).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("button", { name: "원본 새로고침" }));
  await waitFor(() => expect(mockFiles).toHaveBeenCalledTimes(2));
  const source = screen.getByRole("region", { name: "계약서 원본 영역" });
  fireEvent.keyDown(source, { key: "Escape" });
  expect(screen.getByRole("button", { name: "계약서 원본 펼치기" })).toHaveFocus();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("입력 중인 이름");
  expect(screen.queryByRole("img", { name: "계약서 1페이지" })).not.toBeInTheDocument();
  await openOriginal();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("입력 중인 이름");
  fireEvent.blur(screen.getByRole("button", { name: "원본 새로고침" }), { relatedTarget: screen.getByLabelText("세입자 이름") });
  expect(screen.getByRole("button", { name: "계약서 원본 펼치기" })).toHaveAttribute("aria-expanded", "false");
});

test("원본을 접어도 조회 실패를 헤더에 표시하고 펼치면 다시 조회할 수 있다", async () => {
  mockFiles.mockRejectedValue(new Error("unavailable"));
  renderReview();
  const toggle = await screen.findByRole("button", { name: "계약서 원본 펼치기" });
  await waitFor(() => expect(within(toggle).getByText("원본 조회 실패")).toBeInTheDocument());
  fireEvent.click(toggle);
  expect(screen.getByText("원본을 불러오지 못했습니다. 보관 기간이나 접근 권한을 확인해 주세요.")).toBeInTheDocument();
  mockFiles.mockResolvedValue({ files: [{ fileId: "file-1", fileIndex: 0, contentType: "image/jpeg", url: "https://example.test/contract.jpg", expiresAt: "2026-09-30T10:00:00Z" }] });
  fireEvent.click(screen.getByRole("button", { name: "원본 새로고침" }));
  expect(await screen.findByRole("img", { name: "계약서 1페이지" })).toBeInTheDocument();
});

test("데스크톱에서는 원본을 항상 펼쳐 표시한다", async () => {
  const breakpoint = jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ xl: true });
  try {
    renderReview();
    expect(await screen.findByRole("img", { name: "계약서 1페이지" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "계약서 원본 펼치기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "원본 새로고침" })).toBeInTheDocument();
  } finally {
    breakpoint.mockRestore();
  }
});

test("확인한 초안을 수동 적용하고 동기 등록 완료 후 목록으로 돌아간다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, VALUES));
  expect(await screen.findByText("임차인 등록이 완료되었습니다.")).toBeInTheDocument();
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("초안 재조회와 OCR 도착은 수정 중인 값을 보존하고 확인 버튼으로만 제안을 적용한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "직접 수정한 이름" } });
  await act(async () => {
    client.setQueryData(contractDocumentKeys.draft(DOCUMENT.documentId), { documentId: DOCUMENT.documentId, values: { ...VALUES, name: "새 초안" } });
    client.setQueryData(contractDocumentKeys.analysis(DOCUMENT.documentId), { ...ANALYSIS, status: "SUCCEEDED", values: { ...VALUES, name: "OCR 제안" }, warnings: [{ field: "name", code: "LOW_CONFIDENCE", message: "이름을 확인해 주세요." }] });
  });
  expect(await screen.findByText("이름을 확인해 주세요.")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("직접 수정한 이름");
  fireEvent.click(screen.getByRole("button", { name: "OCR 제안 값 적용" }));
  fireEvent.click(await screen.findByRole("button", { name: "적용" }));
  await waitFor(() => expect(screen.getByLabelText("세입자 이름")).toHaveValue("OCR 제안"));
});

test("초안 로딩 실패는 경고하고 수동 입력을 막지 않는다", async () => {
  mockDraft.mockRejectedValue(new Error("storage unavailable"));
  renderReview();
  expect(await screen.findByText("이전 검수 입력을 불러오지 못했습니다. 원본을 확인해 직접 입력할 수 있습니다.")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toBeEnabled();
  expect(screen.getByRole("button", { name: "이전 입력 다시 조회" })).toBeInTheDocument();
});

test("반려 클릭 후 열린 모달에서 사유를 선택하고 확정한 뒤에만 해당 사유를 전송한다", async () => {
  renderReview();
  const rejectButton = await screen.findByRole("button", { name: "반려" });
  expect(rejectButton).toBeEnabled();
  expect(screen.queryByLabelText("반려 사유")).not.toBeInTheDocument();
  fireEvent.click(rejectButton);
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "반려 확정" })).toBeDisabled();
  expect(within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" })).toBeDisabled();
  expect(mockReject).not.toHaveBeenCalled();
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await waitFor(() => expect(mockReject).toHaveBeenCalledWith(DOCUMENT.documentId, { reason: "DUPLICATE", notifyUser: false }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test.each([
  ["UNREADABLE", "내용을 읽을 수 없음", true],
  ["NOT_A_CONTRACT", "계약서가 아님", true],
  ["EXPIRED", "만료된 계약서", true],
  ["DUPLICATE", "중복 제출", false],
] as const)("%s 사유(%s)는 notifyUser=%s 기본값을 적용하고 명시적으로 전송한다", async (reason, label, notifyUser) => {
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  const notificationSwitch = within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" });
  expect(notificationSwitch).toBeDisabled();
  fireEvent.click(notificationSwitch);
  expect(within(dialog).getByRole("button", { name: "반려 확정" })).toBeDisabled();
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText(label));
  expect(notificationSwitch).toBeEnabled();
  expect(notificationSwitch).toHaveAttribute("aria-checked", String(notifyUser));
  expect(within(dialog).getByText("사유 기본값")).toBeInTheDocument();
  expect(within(dialog).getByText(notifyUser ? "이 계약서의 반려 결과를 인앱 알림과 푸시로 알립니다." : "이 계약서는 인앱 알림과 푸시 없이 반려 처리합니다.")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await waitFor(() => expect(mockReject).toHaveBeenCalledWith(DOCUMENT.documentId, { reason, notifyUser }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test.each([
  ["DUPLICATE", "중복 제출", true],
  ["UNREADABLE", "내용을 읽을 수 없음", false],
] as const)("%s 사유(%s)의 기본값을 직접 바꿔 notifyUser=%s로 반려할 수 있다", async (reason, label, notifyUser) => {
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText(label));
  const notificationSwitch = within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" });
  fireEvent.click(notificationSwitch);
  expect(notificationSwitch).toHaveAttribute("aria-checked", String(notifyUser));
  expect(within(dialog).getByText("직접 변경")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await waitFor(() => expect(mockReject).toHaveBeenCalledWith(DOCUMENT.documentId, { reason, notifyUser }));
});

test("재렌더는 직접 선택을 유지하고 사유를 변경하면 새 사유의 기본값과 상태를 적용한다", async () => {
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  const notificationSwitch = within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" });
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  fireEvent.click(notificationSwitch);
  await act(async () => {
    client.setQueryData(contractDocumentKeys.analysis(DOCUMENT.documentId), { ...ANALYSIS, status: "SUCCEEDED", values: VALUES });
  });
  expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
  expect(within(dialog).getByText("직접 변경")).toBeInTheDocument();
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("만료된 계약서"));
  expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
  expect(within(dialog).getByText("사유 기본값")).toBeInTheDocument();
  expect(within(dialog).queryByText("직접 변경")).not.toBeInTheDocument();
  fireEvent.click(notificationSwitch);
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("내용을 읽을 수 없음"));
  expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
  expect(within(dialog).getByText("사유 기본값")).toBeInTheDocument();
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  expect(notificationSwitch).toHaveAttribute("aria-checked", "false");
  expect(within(dialog).getByText("사유 기본값")).toBeInTheDocument();
});

test("반려 모달을 취소하면 요청하지 않고 다시 열 때 사유와 알림 여부를 초기화한다", async () => {
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  fireEvent.click(within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockReject).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  const reopenedDialog = await screen.findByRole("dialog");
  expect(within(reopenedDialog).getByRole("button", { name: "반려 확정" })).toBeDisabled();
  expect(within(reopenedDialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" })).toBeDisabled();
  expect(within(reopenedDialog).queryByText("직접 변경")).not.toBeInTheDocument();
  expect(within(reopenedDialog).getByText("사유를 선택하면 알림 기본값이 적용됩니다.")).toBeInTheDocument();
  expect(within(reopenedDialog).queryByText("이 계약서는 인앱 알림과 푸시 없이 반려 처리합니다.")).not.toBeInTheDocument();
});

test("반려 실패는 모달과 선택한 사유 및 알림 여부를 유지해 재시도할 수 있다", async () => {
  mockReject.mockRejectedValueOnce(conflict("문서 상태가 바뀌었습니다."))
    .mockResolvedValue({ documentId: DOCUMENT.documentId, status: "REJECTED", uploadStatus: "COMPLETED" });
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("계약서가 아님"));
  fireEvent.click(within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  expect(await within(dialog).findByText("문서 상태가 바뀌었습니다.")).toBeInTheDocument();
  expect(onBack).not.toHaveBeenCalled();
  expect(within(dialog).getByRole("button", { name: "반려 확정" })).toBeEnabled();
  expect(within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" })).toHaveAttribute("aria-checked", "false");
  expect(within(dialog).getByText("직접 변경")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await waitFor(() => expect(mockReject).toHaveBeenCalledTimes(2));
  expect(mockReject).toHaveBeenLastCalledWith(DOCUMENT.documentId, { reason: "NOT_A_CONTRACT", notifyUser: false });
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("반려 요청 중에는 취소와 다른 결정 및 중복 요청을 막는다", async () => {
  let finishRejection!: (value: Awaited<ReturnType<typeof rejectContractDocument>>) => void;
  mockReject.mockReturnValue(new Promise((resolve) => { finishRejection = resolve; }));
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  const confirm = within(dialog).getByRole("button", { name: "반려 확정" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => expect(mockReject).toHaveBeenCalledTimes(1));
  expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
  expect(within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "OCR 분석 요청" })).toBeDisabled();
  await act(async () => { finishRejection({ documentId: DOCUMENT.documentId, status: "REJECTED", uploadStatus: "COMPLETED" }); });
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
});

test("등록과 반려를 먼저 제시하고 OCR 및 이전 검수 입력을 그 아래 보조 영역에 둔다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  const registration = await screen.findByRole("button", { name: "계약 등록" });
  const rejection = screen.getByRole("button", { name: "반려" });
  const ocr = screen.getByRole("button", { name: "OCR 분석 요청" });
  const previousInput = await screen.findByRole("button", { name: "이전 검수 입력 불러오기" });
  expect(registration.parentElement).toBe(rejection.parentElement);
  expect(registration.compareDocumentPosition(ocr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ocr.compareDocumentPosition(previousInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("원본과 입력 영역은 각각 키보드로 접근할 수 있고 원본 hover 및 클릭 확대를 제공하지 않는다", async () => {
  renderReview();
  const sourcePane = await screen.findByRole("region", { name: "계약서 원본 영역" });
  const inputPane = screen.getByRole("region", { name: "계약서 입력 영역" });
  expect(sourcePane).toHaveAttribute("tabindex", "0");
  expect(inputPane).toHaveAttribute("tabindex", "0");
  const original = await openOriginal();
  fireEvent.mouseEnter(original);
  expect(sourcePane.querySelector(".ant-image-mask")).not.toBeInTheDocument();
  fireEvent.click(original);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test.each(["FAILED", "TIMED_OUT", "SUCCEEDED"] as const)("%s OCR 재요청은 비용을 확인하고 접수 후 추가 요청을 차단한다", async (status) => {
  mockLatest.mockResolvedValue({ ...ANALYSIS, status, values: status === "SUCCEEDED" ? VALUES : null });
  renderReview();
  fireEvent.click(await screen.findByRole("button", { name: "OCR 다시 분석" }));
  expect(await screen.findByText("새 분석은 추가 비용이 발생할 수 있습니다. 현재 입력값은 유지됩니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "분석 요청" }));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "OCR 다시 분석" })).toBeDisabled());
  expect(screen.getByText("분석 대기")).toBeInTheDocument();
  expect(mockRegister).not.toHaveBeenCalled();
});

test("OCR 요청 409는 서버 오류 내용을 표시하고 입력값을 보존한다", async () => {
  mockRequest.mockRejectedValue(conflict("이미 진행 중인 분석이 있습니다."));
  renderReview();
  await screen.findByText("아직 요청한 OCR 분석이 없습니다.");
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "유지할 이름" } });
  fireEvent.click(screen.getByRole("button", { name: "OCR 분석 요청" }));
  fireEvent.click(await screen.findByRole("button", { name: "분석 요청" }));
  expect(await screen.findByText("이미 진행 중인 분석이 있습니다.")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("유지할 이름");
  expect(onBack).not.toHaveBeenCalled();
});

test("등록된 임차인 refetch는 편집값을 덮지 않고 수정 요청에서 납부 방식을 제외한다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: TENANT.tenantId });
  mockUpdateTenant.mockResolvedValue(undefined);
  renderReview();
  await waitFor(() => expect(screen.getByLabelText("세입자 이름")).toHaveValue("홍길동"));
  expect(screen.getByLabelText("납부 방식")).toBeDisabled();
  expect(screen.queryByRole("button", { name: /OCR.*분석/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "유지할 편집값" } });
  await act(async () => { client.setQueryData(tenantKeys.detail(TENANT.tenantId), { ...TENANT, name: "서버 새 이름" }); });
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("유지할 편집값");
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  await waitFor(() => expect(mockUpdateTenant).toHaveBeenCalledTimes(1));
  expect(mockUpdateTenant.mock.calls[0][1]).toMatchObject({ name: "유지할 편집값", paymentDay: 25 });
  expect(mockUpdateTenant.mock.calls[0][1]).not.toHaveProperty("billingTiming");
  expect(mockUpdateTenant.mock.calls[0][1]).not.toHaveProperty("rentBillingCycle");
  expect(mockLatest).not.toHaveBeenCalled();
});

test("반려 문서는 읽기 전용이며 OCR 요청과 등록을 제공하지 않는다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REJECTED" });
  renderReview();
  expect(await screen.findByText("반려된 계약서입니다.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "계약 등록" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /OCR.*분석/ })).not.toBeInTheDocument();
  expect(mockLatest).not.toHaveBeenCalled();
});

test("등록 완료 응답에서 임차인 ID가 생략되어도 빈 ID로 조회하지 않는다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: undefined });
  renderReview();
  expect(await screen.findByText("연결된 임차인 정보가 없습니다.")).toBeInTheDocument();
  expect(mockTenant).not.toHaveBeenCalled();
});

test("최초 진입 시 낡은 임차인 캐시 대신 이번 조회 결과로 폼을 초기화한다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: TENANT.tenantId });
  mockTenant.mockResolvedValue({ ...TENANT, rentPrice: 900000, name: "최신 이름" });
  renderReview(TENANT);
  await waitFor(() => expect(screen.getByLabelText("세입자 이름")).toHaveValue("최신 이름"));
  expect(screen.getByLabelText("임대료")).toHaveValue("90");
});

test("수정 성공 후 생략된 종료일을 서버가 유지하면 실제 저장된 날짜를 다시 표시한다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: TENANT.tenantId });
  mockTenant.mockResolvedValue({ ...TENANT, endDate: "2027-08-31" });
  mockUpdateTenant.mockResolvedValue(undefined);
  renderReview();
  await waitFor(() => expect(screen.getByLabelText("계약 종료일")).toHaveValue("2027-08-31"));
  const endDatePicker = screen.getByLabelText("계약 종료일").closest(".ant-picker")!;
  fireEvent.click(endDatePicker.querySelector(".ant-picker-clear")!);
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "수정" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  await waitFor(() => expect(mockUpdateTenant).toHaveBeenCalledTimes(1));
  expect(mockUpdateTenant.mock.calls[0][1].endDate).toBeUndefined();
  expect(await screen.findByText("임차인 정보가 수정되었습니다.")).toBeInTheDocument();
  expect(screen.getByLabelText("계약 종료일")).toHaveValue("2027-08-31");
});

test("저장 후 조회 실패는 저장 실패와 구분하고 PATCH 재요청 없이 조회로 복구한다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: TENANT.tenantId });
  mockTenant.mockResolvedValueOnce(TENANT).mockRejectedValue(new Error("lookup failed"));
  mockUpdateTenant.mockResolvedValue(undefined);
  renderReview();
  await waitFor(() => expect(screen.getByLabelText("세입자 이름")).toHaveValue("홍길동"));
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "저장된 이름" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  expect(await screen.findByText("저장 완료 · 저장된 정보 조회 실패")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  expect(screen.queryByText("저장 실패")).not.toBeInTheDocument();
  mockTenant.mockResolvedValue({ ...TENANT, name: "저장된 이름" });
  fireEvent.click(screen.getByRole("button", { name: "저장된 정보 다시 조회" }));
  await waitFor(() => expect(screen.queryByText("저장 완료 · 저장된 정보 조회 실패")).not.toBeInTheDocument());
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("저장된 이름");
  expect(mockUpdateTenant).toHaveBeenCalledTimes(1);
});

test("OCR 응답 유실 후 latest 조회로 접수된 분석을 복구하고 중복 POST를 보내지 않는다", async () => {
  mockLatest.mockResolvedValueOnce(null).mockResolvedValue(ANALYSIS);
  mockRequest.mockRejectedValue(new Error("response lost"));
  renderReview();
  await screen.findByText("아직 요청한 OCR 분석이 없습니다.");
  fireEvent.click(screen.getByRole("button", { name: "OCR 분석 요청" }));
  fireEvent.click(await screen.findByRole("button", { name: "분석 요청" }));
  expect(await screen.findByText("분석 대기")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "OCR 다시 분석" })).toBeDisabled();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockLatest).toHaveBeenCalledTimes(2);
});

test("OCR 접수 재확인도 실패하면 상태 확인 전까지 새 요청을 차단한다", async () => {
  mockLatest.mockResolvedValueOnce(null).mockRejectedValue(new Error("lookup failed"));
  mockRequest.mockRejectedValue(new Error("response lost"));
  renderReview();
  await screen.findByText("아직 요청한 OCR 분석이 없습니다.");
  fireEvent.click(screen.getByRole("button", { name: "OCR 분석 요청" }));
  fireEvent.click(await screen.findByRole("button", { name: "분석 요청" }));
  expect(await screen.findByText("OCR 접수 여부를 확인해야 새 분석을 요청할 수 있습니다.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "OCR 분석 요청" })).toBeDisabled();
  mockLatest.mockResolvedValue(null);
  // 네트워크 재연결로 조회 오류가 사라져도 불확실 상태를 직접 확인할 경로는 남아야 한다.
  await act(async () => { await client.refetchQueries({ queryKey: contractDocumentKeys.analysis(DOCUMENT.documentId) }); });
  expect(screen.getByRole("button", { name: "상태 다시 조회" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "OCR 분석 요청" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "상태 다시 조회" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "OCR 분석 요청" })).toBeEnabled());
  expect(mockRequest).toHaveBeenCalledTimes(1);
});
