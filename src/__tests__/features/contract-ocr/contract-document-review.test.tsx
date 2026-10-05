import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider, Grid } from "antd";
import { AxiosError, AxiosHeaders } from "axios";
import { ContractDocumentReview } from "@/features/contract-ocr/components/ContractDocumentReview";
import { contractDocumentKeys } from "@/features/contract-ocr/hooks";
import {
  fetchContractDocument, fetchContractDocumentDraft, fetchContractDocumentFiles, fetchLatestContractOcrAnalysis, fetchContractDocuments,
  registerContractDocument, rejectContractDocument, requestContractOcrAnalysis,
} from "@/features/contract-ocr/api";
import { fetchTenant, updateTenant } from "@/features/tenants/api";
import { tenantKeys } from "@/features/tenants/hooks";
import { fetchUserProperties, updateProperty } from "@/features/properties/api";
import { propertyKeys } from "@/features/properties/hooks";
import { ANALYSIS, DOCUMENT, TENANT, VALUES } from "@/test-utils/contractDocumentFixtures";
import { NavigationGuardProvider } from "@/components/NavigationGuard";

jest.mock("@/features/contract-ocr/api", () => ({
  fetchContractDocument: jest.fn(), fetchContractDocumentDraft: jest.fn(), fetchContractDocumentFiles: jest.fn(),
  fetchLatestContractOcrAnalysis: jest.fn(), registerContractDocument: jest.fn(), rejectContractDocument: jest.fn(), requestContractOcrAnalysis: jest.fn(),
  fetchContractDocuments: jest.fn(),
}));
jest.mock("@/features/tenants/api", () => ({ fetchTenant: jest.fn(), updateTenant: jest.fn() }));
jest.mock("@/features/properties/api", () => ({ fetchUserProperties: jest.fn(), updateProperty: jest.fn() }));
const mockDocument = jest.mocked(fetchContractDocument);
const mockDraft = jest.mocked(fetchContractDocumentDraft);
const mockFiles = jest.mocked(fetchContractDocumentFiles);
const mockLatest = jest.mocked(fetchLatestContractOcrAnalysis);
const mockRegister = jest.mocked(registerContractDocument);
const mockReject = jest.mocked(rejectContractDocument);
const mockRequest = jest.mocked(requestContractOcrAnalysis);
const mockTenant = jest.mocked(fetchTenant);
const mockUpdateTenant = jest.mocked(updateTenant);
const mockProperties = jest.mocked(fetchUserProperties);
const mockUpdateProperty = jest.mocked(updateProperty);
const mockQueue = jest.mocked(fetchContractDocuments);
const PROPERTIES = [
  { propertyId: 2, name: "내 건물", address: "서울시 원래 주소", isDefault: true, activeTenantCount: 1, createdAt: "2026-09-01", updatedAt: "2026-09-01" },
  { propertyId: 3, name: "다른 건물", address: null, isDefault: false, activeTenantCount: 0, createdAt: "2026-09-01", updatedAt: "2026-09-01" },
];
const onBack = jest.fn();
let client: QueryClient;
function renderReview(cachedTenant?: typeof TENANT, continuation?: { returnPath: string; position: number; onNavigate: (path: string) => void }) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (cachedTenant) client.setQueryData(tenantKeys.detail(cachedTenant.tenantId), cachedTenant);
  // jsdom은 CSS motion 완료 이벤트를 발생시키지 않는다. 공개 테마 설정으로 모션만 끈다.
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App><NavigationGuardProvider><ContractDocumentReview documentId={DOCUMENT.documentId} onBack={onBack} continuation={continuation} /></NavigationGuardProvider></App></ConfigProvider></QueryClientProvider>);
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
async function selectProperty(name: string) {
  fireEvent.mouseDown(screen.getByLabelText("등록할 건물"));
  fireEvent.click(await screen.findByText(name));
}
async function openPropertyModal(kind: "edit" | "new") {
  if (kind === "new") {
    fireEvent.mouseDown(screen.getByLabelText("등록할 건물"));
    fireEvent.click(await screen.findByRole("button", { name: "새 건물 추가" }));
  } else fireEvent.click(screen.getByRole("button", { name: "정보 수정" }));
  return screen.findByRole("dialog");
}
async function applyProperty(name: string, address: string, kind: "edit" | "new" = "edit") {
  const dialog = await openPropertyModal(kind);
  if (kind === "edit") await waitFor(() => expect(within(dialog).getByLabelText("건물명")).not.toHaveValue(""));
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: name } });
  fireEvent.change(within(dialog).getByLabelText("주소 (선택)"), { target: { value: address } });
  fireEvent.click(within(dialog).getByRole("button", { name: kind === "new" ? "추가하고 선택" : "변경 내용 적용" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}
function conflict(detail: string) {
  return new AxiosError("conflict", undefined, undefined, undefined, {
    data: { type: "/problems/conflict", title: "요청 충돌", detail, status: 409 },
    status: 409, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(window, "confirm").mockReturnValue(false);
  mockDocument.mockResolvedValue(DOCUMENT);
  mockDraft.mockResolvedValue(null);
  mockFiles.mockResolvedValue({ files: [{ fileId: "file-1", fileIndex: 0, contentType: "image/jpeg", url: "https://example.test/contract.jpg", expiresAt: "2026-09-30T10:00:00Z" }] });
  mockLatest.mockResolvedValue(null);
  mockTenant.mockResolvedValue(TENANT);
  mockProperties.mockResolvedValue({ properties: PROPERTIES });
  mockRegister.mockResolvedValue({ documentId: DOCUMENT.documentId, status: "REGISTERED", tenantId: 9, uploadStatus: "REGISTERED" });
  mockReject.mockResolvedValue({ documentId: DOCUMENT.documentId, status: "REJECTED", uploadStatus: "REJECTED" });
  mockRequest.mockResolvedValue(ANALYSIS);
});
afterEach(() => { client?.clear(); jest.restoreAllMocks(); });

test("분석이나 보관 초안이 없어도 수동 검수 화면을 열고 원본 파일을 표시한다", async () => {
  renderReview();
  expect(await screen.findByText("아직 요청한 OCR 분석이 없습니다.")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toBeEnabled();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.queryByText("이전 검수 입력")).not.toBeInTheDocument();
  expect(await openOriginal()).toHaveAttribute("src", "https://example.test/contract.jpg");
  expect(mockRequest).not.toHaveBeenCalled();
});

test("작성 중 목록 이동을 취소하면 입력을 보존하고 명시적으로 승인하면 이동한다", async () => {
  renderReview();
  const name = await screen.findByLabelText("세입자 이름");
  fireEvent.change(name, { target: { value: "입력 중인 임차인" } });
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  expect(name).toHaveValue("입력 중인 임차인");
  jest.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("건물 선택 변경과 적용한 초안도 이탈을 보호하며 되돌리면 보호를 해제한다", async () => {
  renderReview();
  await screen.findByLabelText("세입자 이름");
  await waitFor(() => expect(screen.getByLabelText("등록할 건물")).toBeEnabled());
  await selectProperty("다른 건물");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  await selectProperty("내 건물");
  await applyProperty("변경 예정 건물", "새 주소");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(2);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("적용 전 새 건물 모달 입력도 새로고침을 보호하고 취소하면 초안을 폐기한다", async () => {
  renderReview();
  await screen.findByLabelText("세입자 이름");
  await waitFor(() => expect(screen.getByLabelText("등록할 건물")).toBeEnabled());
  const dialog = await openPropertyModal("new");
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "아직 적용하지 않은 건물" } });
  const dirty = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).not.toHaveBeenCalled();
});

test.each(["계약 시작일", "계약 종료일"])("아직 날짜로 확정하지 않은 %s 직접 입력도 새로고침에서 보호한다", async (label) => {
  renderReview();
  const dateInput = await screen.findByLabelText(label);
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  fireEvent.focus(dateInput);
  fireEvent.input(dateInput, { target: { value: "20261" } });
  const dirty = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
});

test("미확정 종료일만 입력해도 목록 이동 취소 시 확정된 날짜를 유지하고 지우면 보호를 해제한다", async () => {
  renderReview();
  const endDate = await screen.findByLabelText("계약 종료일");
  expect(endDate.id).not.toBe("endDate");
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("");
  fireEvent.focus(endDate);
  fireEvent.input(endDate, { target: { value: "20261001" } });
  const dirty = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  await waitFor(() => expect(endDate).toHaveValue("2026-10-01"));
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("");
  fireEvent.click(within(endDate.closest(".ant-picker") as HTMLElement).getByRole("button"));
  await waitFor(() => {
    expect(endDate).toHaveValue("");
    const cleared = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleared);
    expect(cleared.defaultPrevented).toBe(false);
  });
});

test("미완성 종료일은 기존 blur 동작으로 되돌아간 뒤에는 미저장 입력으로 남지 않는다", async () => {
  renderReview();
  const endDate = await screen.findByLabelText("계약 종료일");
  fireEvent.focus(endDate);
  fireEvent.input(endDate, { target: { value: "2027" } });
  fireEvent.blur(endDate, { relatedTarget: screen.getByLabelText("세입자 이름") });
  await waitFor(() => expect(endDate).toHaveValue(""));
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("");
});

test("등록 성공은 완료 패널로 전환하고 다음 큐 조회 실패를 저장 실패와 구분해 재조회한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  mockQueue.mockRejectedValueOnce(new Error("큐 조회 실패")).mockResolvedValueOnce({ documents: [], page: 1, size: 50, totalElements: 0 })
    .mockResolvedValueOnce({ documents: [], page: 0, size: 50, totalElements: 0 });
  const navigate = jest.fn();
  renderReview(undefined, { returnPath: "/contract-documents?page=2&size=50", position: 3, onNavigate: navigate });
  await applyDraft();
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await screen.findByRole("button", { name: "다음 계약서 검수" });
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("세입자 이름")).not.toBeInTheDocument();
  const saved = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 검수" }));
  await screen.findByText("처리는 완료되었습니다 · 다음 계약서 조회 실패");
  expect(screen.queryByText("저장 실패")).not.toBeInTheDocument();
  expect(mockRegister).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 다시 조회" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/contract-documents?page=1&size=50"));
  expect(mockRegister).toHaveBeenCalledTimes(1);
  expect(window.confirm).not.toHaveBeenCalled();
});

test("반려 성공 후에는 입력 보호를 해제하고 최신 큐의 다음 계약서로 이어간다", async () => {
  const next = { ...DOCUMENT, documentId: "document-next" };
  mockQueue.mockResolvedValue({ documents: [next], page: 0, size: 50, totalElements: 1 });
  const navigate = jest.fn();
  renderReview(undefined, { returnPath: "/contract-documents?size=50", position: 0, onNavigate: navigate });
  fireEvent.change(await screen.findByLabelText("세입자 이름"), { target: { value: "폐기할 초안" } });
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await screen.findByRole("button", { name: "다음 계약서 검수" });
  const saved = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 검수" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  const url = new URL(navigate.mock.calls[0][0], "https://admin.test");
  expect(url.pathname).toBe("/contract-documents/document-next");
  expect(url.searchParams.get("returnTo")).toBe("/contract-documents?size=50");
  expect(window.confirm).not.toHaveBeenCalled();
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockReject).toHaveBeenCalledTimes(1);
});

test("좁은 화면의 원본은 기본으로 접고 열기·새로고침·닫기 중 임차인 입력을 유지한다", async () => {
  renderReview();
  const source = await screen.findByRole("region", { name: "계약서 원본 영역" });
  const sourceView = within(source);
  const toggle = sourceView.getByRole("button", { name: "계약서 원본 펼치기" });
  const input = await screen.findByLabelText("세입자 이름");
  // 원본 조작은 해당 패널에서 조회한다. 매번 입력 폼 전체의 CSS 가시성을 다시 계산하지 않는다.
  async function openSource() {
    expect(toggle).toHaveAccessibleName("계약서 원본 펼치기");
    fireEvent.click(toggle);
    return sourceView.findByRole("img", { name: "계약서 1페이지" });
  }
  await waitFor(() => expect(within(toggle).getByText("1페이지")).toBeInTheDocument());
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(sourceView.queryByRole("img", { name: "계약서 1페이지" })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "입력 중인 이름" } });
  await openSource();
  expect(toggle).toHaveAccessibleName("계약서 원본 접기");
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  const refresh = sourceView.getByRole("button", { name: "원본 새로고침" });
  fireEvent.click(refresh);
  await waitFor(() => expect(mockFiles).toHaveBeenCalledTimes(2));
  act(() => source.focus());
  expect(source).toHaveFocus();
  const original = sourceView.getByRole("img", { name: "계약서 1페이지" });
  fireEvent.mouseEnter(original);
  fireEvent.click(original);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.keyDown(source, { key: "Escape" });
  expect(toggle).toHaveAccessibleName("계약서 원본 펼치기");
  expect(toggle).toHaveFocus();
  expect(input).toHaveValue("입력 중인 이름");
  expect(sourceView.queryByRole("img", { name: "계약서 1페이지" })).not.toBeInTheDocument();
  const inputPane = screen.getByRole("region", { name: "계약서 입력 영역" });
  act(() => inputPane.focus());
  expect(inputPane).toHaveFocus();
  await openSource();
  expect(input).toHaveValue("입력 중인 이름");
  fireEvent.blur(refresh, { relatedTarget: input });
  expect(toggle).toHaveAccessibleName("계약서 원본 펼치기");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
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

test.each(["same", "new"])("원본 이미지 실패 후 %s URL을 다시 발급하면 이미지 상태를 복구하고 임차인 초안을 유지한다", async (kind) => {
  let now = Date.now();
  jest.spyOn(Date, "now").mockImplementation(() => now);
  renderReview();
  const input = await screen.findByLabelText("세입자 이름");
  fireEvent.change(input, { target: { value: "보존할 임차인 초안" } });
  const original = await openOriginal();
  fireEvent.error(original);
  expect(screen.getByText("계약서 1페이지를 표시할 수 없습니다.")).toBeVisible();
  expect(screen.getByText("브라우저에서 원본을 불러오지 못했습니다. 원본 새로고침으로 다시 시도해 주세요.")).toBeVisible();

  const url = kind === "same" ? "https://example.test/contract.jpg" : "https://example.test/refreshed-contract.jpg";
  let resolveRefresh!: (value: Awaited<ReturnType<typeof fetchContractDocumentFiles>>) => void;
  mockFiles.mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
  const refresh = screen.getByRole("button", { name: "계약서 1페이지 원본 새로고침" });
  fireEvent.click(refresh);
  fireEvent.click(refresh);
  await waitFor(() => expect(refresh).toBeDisabled());
  expect(screen.getByRole("button", { name: "원본 새로고침" })).toBeDisabled();
  expect(mockFiles).toHaveBeenCalledTimes(2);
  expect(input).toHaveValue("보존할 임차인 초안");

  now += 1;
  await act(async () => { resolveRefresh({ files: [{ fileId: "file-1", fileIndex: 0, contentType: "image/jpeg", url, expiresAt: "2026-10-04T12:00:00Z" }] }); });
  const refreshed = await screen.findByRole("img", { name: "계약서 1페이지" });
  expect(refreshed).toHaveAttribute("src", url);
  expect(refreshed).not.toBe(original);
  expect(screen.queryByText("계약서 1페이지를 표시할 수 없습니다.")).not.toBeInTheDocument();
  expect(input).toHaveValue("보존할 임차인 초안");
  expect(screen.getByRole("button", { name: "원본 새로고침" })).toBeEnabled();
  fireEvent.load(refreshed);
  expect(screen.queryByText("계약서 1페이지를 표시할 수 없습니다.")).not.toBeInTheDocument();
});

test("해당 임대인의 건물을 선택해 등록하고 목록 재조회와 OCR 도착에도 선택·임차인 입력을 유지한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  expect(mockProperties).toHaveBeenCalledWith(DOCUMENT.userId);
  await selectProperty("다른 건물");
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "수정 중인 이름" } });
  await act(async () => {
    client.setQueryData(propertyKeys.user(DOCUMENT.userId), { properties: [...PROPERTIES].reverse() });
    client.setQueryData(contractDocumentKeys.analysis(DOCUMENT.documentId), { ...ANALYSIS, status: "SUCCEEDED", values: { ...VALUES, name: "OCR 이름" } });
  });
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("수정 중인 이름");
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, { ...VALUES, name: "수정 중인 이름", propertyId: 3 }));
  expect(mockUpdateProperty).not.toHaveBeenCalled();
});

test("건물 정보 수정은 초안으로 표시하고 되돌릴 수 있으며 등록할 때만 주소 비우기를 함께 전송한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  await applyProperty("  랜디빌라  ", "");
  expect(screen.getByText("수정 예정")).toBeInTheDocument();
  expect(mockUpdateProperty).not.toHaveBeenCalled();
  expect(mockRegister).not.toHaveBeenCalled();
  await selectProperty("다른 건물");
  expect(screen.queryByText("수정 예정")).not.toBeInTheDocument();
  await selectProperty("랜디빌라");
  expect(screen.getByText("수정 예정")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(screen.queryByText("수정 예정")).not.toBeInTheDocument();
  const dialog = await openPropertyModal("edit");
  await waitFor(() => expect(within(dialog).getByLabelText("건물명")).toHaveValue("내 건물"));
  const buildingName = within(dialog).getByRole("textbox", { name: "건물명" });
  const nameLabel = within(dialog).getByText("건물명", { selector: "label" }) as HTMLLabelElement;
  expect(nameLabel.control).toBe(buildingName);
  expect(buildingName.id).not.toBe(screen.getByLabelText("세입자 이름").id);
  expect(within(dialog).getByLabelText("주소 (선택)")).toHaveValue("서울시 원래 주소");
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await applyProperty("  랜디빌라  ", "");
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, { ...VALUES, propertyId: 2, propertyUpdate: { name: "랜디빌라", address: null } }));
});

test("새 건물 추가를 취소해도 건물을 만들지 않고 새 초안은 배타적인 등록 payload로만 저장한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  const dialog = await openPropertyModal("new");
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "취소한 건물" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByText("추가 예정")).not.toBeInTheDocument();
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockUpdateProperty).not.toHaveBeenCalled();
  await applyProperty(" 새 건물 ", " 서울시 새 주소 ", "new");
  expect(screen.getByText("추가 예정")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue(VALUES.name);
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, { ...VALUES, newProperty: { name: "새 건물", address: "서울시 새 주소" } }));
  expect(mockRegister.mock.calls[0][1]).not.toHaveProperty("propertyId");
  expect(mockRegister.mock.calls[0][1]).not.toHaveProperty("propertyUpdate");
});

test("새 건물 초안을 되돌리면 원래 건물을 사용하고 건물 필드 없는 기존 등록 요청을 보낸다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  await applyProperty("추가하지 않을 건물", "", "new");
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(screen.queryByText("추가 예정")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, VALUES));
});

test("새 건물 초안이 있어도 반려는 건물을 생성하거나 수정하지 않는다", async () => {
  renderReview();
  await screen.findByRole("button", { name: "정보 수정" });
  await waitFor(() => expect(screen.getByRole("button", { name: "정보 수정" })).toBeEnabled());
  await applyProperty("반려할 건물", "", "new");
  fireEvent.click(screen.getByRole("button", { name: "반려" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
  fireEvent.click(await screen.findByText("중복 제출"));
  fireEvent.click(within(dialog).getByRole("button", { name: "반려 확정" }));
  await waitFor(() => expect(mockReject).toHaveBeenCalledWith(DOCUMENT.documentId, { reason: "DUPLICATE", notifyUser: false }));
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockUpdateProperty).not.toHaveBeenCalled();
});

test("등록 실패 후에도 새 건물 초안과 임차인 입력을 보존하며 재시도 payload를 유지한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  mockRegister.mockRejectedValueOnce(conflict("다시 확인해 주세요."));
  renderReview();
  await applyDraft();
  await applyProperty("재시도할 건물", "", "new");
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "유지할 임차인" } });
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  expect(await screen.findByText("다시 확인해 주세요.")).toBeInTheDocument();
  expect(screen.getByText("추가 예정")).toBeInTheDocument();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue("유지할 임차인");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(2));
  expect(mockRegister.mock.calls[0][1]).toEqual(mockRegister.mock.calls[1][1]);
  expect(mockRegister.mock.calls[1][1]).toMatchObject({ name: "유지할 임차인", newProperty: { name: "재시도할 건물", address: null } });
});

test("건물 조회 오류는 등록을 잠그고 재조회 후 원래 건물을 확인하며 반려는 계속 허용한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  mockProperties.mockRejectedValueOnce(new Error("unavailable"));
  renderReview();
  await applyDraft();
  expect(await screen.findByText("건물 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  expect(mockRegister).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "건물 다시 조회" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  expect(mockProperties).toHaveBeenCalledTimes(2);
});

test("문서의 건물이 소유 목록에 없으면 등록을 막고 목록에 있는 건물을 선택해야 등록한다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  mockProperties.mockResolvedValue({ properties: [PROPERTIES[1]] });
  renderReview();
  await applyDraft();
  expect(await screen.findByText("등록할 건물을 선택하거나 새 건물을 추가해 주세요.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "정보 수정" })).toBeDisabled();
  await selectProperty("다른 건물");
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, { ...VALUES, propertyId: 3 }));
});

test("새 건물 초안은 목록 재조회 실패와 복구 중에도 유지하고 실패 중에는 등록을 잠근다", async () => {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  await applyProperty("유지할 새 건물", "", "new");
  mockProperties.mockRejectedValue(new Error("unavailable"));
  await act(async () => { await client.refetchQueries({ queryKey: propertyKeys.user(DOCUMENT.userId) }); });
  expect(await screen.findByText("건물 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  expect(screen.getByText("추가 예정")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled());
  mockProperties.mockResolvedValue({ properties: PROPERTIES });
  fireEvent.click(screen.getByRole("button", { name: "건물 다시 조회" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, { ...VALUES, newProperty: { name: "유지할 새 건물", address: null } }));
});

test("건물 드롭다운의 새 건물 추가는 Tab으로 접근하고 Escape로 닫아 선택 필드로 돌아온다", async () => {
  renderReview();
  await waitFor(() => expect(screen.getByRole("button", { name: "정보 수정" })).toBeEnabled());
  const select = screen.getByLabelText("등록할 건물");
  fireEvent.mouseDown(select);
  const add = await screen.findByRole("button", { name: "새 건물 추가" });
  expect(fireEvent.keyDown(select, { key: "Tab" })).toBe(false);
  expect(add).toHaveFocus();
  fireEvent.keyDown(add, { key: "Escape" });
  await waitFor(() => expect(select).toHaveAttribute("aria-expanded", "false"));
  expect(select).toHaveFocus();
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockUpdateProperty).not.toHaveBeenCalled();
});

test("건물명·주소는 Unicode code point 기준 255자까지 허용하고 공백 이름과 초과 입력은 적용하지 않는다", async () => {
  renderReview();
  await waitFor(() => expect(screen.getByRole("button", { name: "정보 수정" })).toBeEnabled());
  const dialog = await openPropertyModal("new");
  const apply = within(dialog).getByRole("button", { name: "추가하고 선택" });
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "   " } });
  fireEvent.click(apply);
  expect(await within(dialog).findByText("건물명을 입력해 주세요.")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "😀".repeat(256) } });
  fireEvent.change(within(dialog).getByLabelText("주소 (선택)"), { target: { value: "😀".repeat(256) } });
  fireEvent.click(apply);
  expect(await within(dialog).findByText("건물명 입력은 255자 이하로 입력해 주세요.")).toBeInTheDocument();
  expect(await within(dialog).findByText("주소 입력은 255자 이하로 입력해 주세요.")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "😀".repeat(255) } });
  fireEvent.change(within(dialog).getByLabelText("주소 (선택)"), { target: { value: "😀".repeat(255) } });
  fireEvent.click(apply);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("추가 예정")).toBeInTheDocument();
  expect(mockRegister).not.toHaveBeenCalled();
});

test.each([false, true])("floating 액션바는 xl=%s에서도 필수 입력에 따라 등록을 잠그고 입력을 복구한 뒤에만 제출한다", async (isDesktop) => {
  const breakpoint = jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ xl: isDesktop });
  try {
    mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
    renderReview();
    const registration = await screen.findByRole("button", { name: "계약 등록" });
    const rejection = screen.getByRole("button", { name: "반려" });
    expect(registration).toBeDisabled();
    fireEvent.click(registration);
    expect(mockRegister).not.toHaveBeenCalled();

    await applyDraft();
    await waitFor(() => expect(registration).toBeEnabled());
    fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "" } });
    await waitFor(() => expect(registration).toBeDisabled());
    expect(rejection).toBeEnabled();
    fireEvent.click(registration);
    expect(mockRegister).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "홍길동" } });
    await waitFor(() => expect(registration).toBeEnabled());
    fireEvent.click(registration);
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(DOCUMENT.documentId, VALUES));
    expect(onBack).toHaveBeenCalledTimes(1);
  } finally {
    breakpoint.mockRestore();
  }
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

test("반려 사유 네 가지의 알림 기본값을 선택·전송하고 실패 후 다음 사유를 확인한다", async () => {
  for (let index = 0; index < 3; index++) mockReject.mockRejectedValueOnce(conflict("사유를 다시 확인해 주세요."));
  renderReview();
  const rejectButton = await screen.findByRole("button", { name: "반려" });
  expect(rejectButton).toBeEnabled();
  expect(screen.queryByLabelText("반려 사유")).not.toBeInTheDocument();
  fireEvent.click(rejectButton);
  const dialog = await screen.findByRole("dialog");
  const notificationSwitch = within(dialog).getByRole("switch", { name: "사용자에게 결과 알림 보내기" });
  const confirm = within(dialog).getByRole("button", { name: "반려 확정" });
  expect(notificationSwitch).toBeDisabled();
  fireEvent.click(notificationSwitch);
  expect(confirm).toBeDisabled();
  expect(mockReject).not.toHaveBeenCalled();

  const reasons = [
    ["UNREADABLE", "내용을 읽을 수 없음", true],
    ["NOT_A_CONTRACT", "계약서가 아님", true],
    ["EXPIRED", "만료된 계약서", true],
    ["DUPLICATE", "중복 제출", false],
  ] as const;
  for (const [index, [reason, label, notifyUser]] of reasons.entries()) {
    fireEvent.mouseDown(within(dialog).getByLabelText("반려 사유"));
    fireEvent.click(await screen.findByText(label));
    expect(notificationSwitch).toBeEnabled();
    expect(notificationSwitch).toHaveAttribute("aria-checked", String(notifyUser));
    expect(within(dialog).getByText("사유 기본값")).toBeInTheDocument();
    expect(within(dialog).getByText(notifyUser ? "이 계약서의 반려 결과를 인앱 알림과 푸시로 알립니다." : "이 계약서는 인앱 알림과 푸시 없이 반려 처리합니다.")).toBeInTheDocument();
    fireEvent.click(confirm);
    await waitFor(() => expect(mockReject).toHaveBeenNthCalledWith(index + 1, DOCUMENT.documentId, { reason, notifyUser }));
    if (index < reasons.length - 1) {
      expect(await within(dialog).findByText("사유를 다시 확인해 주세요.")).toBeInTheDocument();
      await waitFor(() => expect(confirm).toBeEnabled());
      expect(onBack).not.toHaveBeenCalled();
    }
  }
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  expect(mockRegister).not.toHaveBeenCalled();
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
  expect(screen.getByLabelText("등록할 건물")).toBeDisabled();
  expect(screen.getByRole("button", { name: "정보 수정" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "OCR 분석 요청" })).toBeDisabled();
  await act(async () => { finishRejection({ documentId: DOCUMENT.documentId, status: "REJECTED", uploadStatus: "COMPLETED" }); });
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
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
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  mockTenant.mockResolvedValue({ ...TENANT, name: "유지할 편집값" });
  await waitFor(() => expect(screen.getByRole("button", { name: "수정" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  await waitFor(() => expect(mockUpdateTenant).toHaveBeenCalledTimes(1));
  expect(mockUpdateTenant.mock.calls[0][1]).toMatchObject({ name: "유지할 편집값", paymentDay: 25 });
  expect(mockUpdateTenant.mock.calls[0][1]).not.toHaveProperty("billingTiming");
  expect(mockUpdateTenant.mock.calls[0][1]).not.toHaveProperty("rentBillingCycle");
  expect(mockLatest).not.toHaveBeenCalled();
  await screen.findByText("임차인 정보가 수정되었습니다.");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledTimes(1);
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

function overlapError(status = 409, type = "/problems/tenant-room-number-duplicated") {
  return new AxiosError("contract overlap", undefined, undefined, undefined, {
    data: { type, title: "계약 기간 중복", detail: "기존 계약과 기간이 겹칩니다.", status },
    status, statusText: "Conflict", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() },
  });
}

async function prepareRegistration() {
  mockDraft.mockResolvedValue({ documentId: DOCUMENT.documentId, values: VALUES });
  renderReview();
  await applyDraft();
  await waitFor(() => expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled());
}

test("계약 기간 중복 시 입력과 건물 초안을 잠그고 승인한 동일 요청만 한 번 재시도한다", async () => {
  mockRegister.mockRejectedValueOnce(overlapError());
  await prepareRegistration();
  await applyProperty("확인할 건물", "확인할 주소");
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  const dialog = (await screen.findByRole("button", { name: "겹쳐도 등록" })).closest('[role="dialog"]') as HTMLElement;
  expect(mockRegister).toHaveBeenCalledTimes(1);
  const request = mockRegister.mock.calls[0][1];
  expect(request).toEqual({ ...VALUES, propertyId: DOCUMENT.propertyId, propertyUpdate: { name: "확인할 건물", address: "확인할 주소" } });
  expect(request).not.toHaveProperty("allowContractOverlap");
  expect(screen.getByLabelText("세입자 이름")).toBeDisabled();
  expect(screen.getByLabelText("등록할 건물")).toBeDisabled();
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "겹쳐도 등록" }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(2));
  expect(mockRegister.mock.calls[1]).toEqual([DOCUMENT.documentId, { ...request, allowContractOverlap: true }]);
  await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
});

test("중복 확인을 취소하면 건물 초안과 입력을 유지하고 다음 저장을 새로 확인한다", async () => {
  mockRegister.mockRejectedValue(overlapError());
  await prepareRegistration();
  await applyProperty("유지할 건물", "유지할 주소");
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  const dialog = (await screen.findByRole("button", { name: "겹쳐도 등록" })).closest('[role="dialog"]') as HTMLElement;
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockRegister).toHaveBeenCalledTimes(1);
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue(VALUES.name);
  expect(screen.getByText("수정 예정")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("세입자 이름"), { target: { value: "다음 입력" } });
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  (await screen.findByRole("button", { name: "겹쳐도 등록" })).closest('[role="dialog"]') as HTMLElement;
  expect(mockRegister).toHaveBeenCalledTimes(2);
  expect(mockRegister.mock.calls[1][1]).toMatchObject({ name: "다음 입력", propertyUpdate: { name: "유지할 건물", address: "유지할 주소" } });
  expect(mockRegister.mock.calls[1][1]).not.toHaveProperty("allowContractOverlap");
});

test("승인 후에도 중복 오류가 오면 확인창을 반복하지 않고 저장 오류와 입력을 유지한다", async () => {
  mockRegister.mockRejectedValue(overlapError());
  await prepareRegistration();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  const dialog = (await screen.findByRole("button", { name: "겹쳐도 등록" })).closest('[role="dialog"]') as HTMLElement;
  fireEvent.click(within(dialog).getByRole("button", { name: "겹쳐도 등록" }));
  expect(await screen.findByText("저장 실패")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockRegister).toHaveBeenCalledTimes(2);
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByLabelText("세입자 이름")).toHaveValue(VALUES.name);
  expect(screen.getByRole("button", { name: "계약 등록" })).toBeEnabled();
});

test.each([
  [400, "/problems/tenant-room-number-duplicated"],
  [403, "/problems/tenant-room-number-duplicated"],
  [500, "/problems/tenant-room-number-duplicated"],
  [409, "/problems/contract-document-already-registered"],
])("다른 오류(%s, %s)는 기간 중복 승인 없이 기존 오류를 표시한다", async (status, type) => {
  mockRegister.mockRejectedValueOnce(overlapError(status, type));
  await prepareRegistration();
  fireEvent.click(screen.getByRole("button", { name: "계약 등록" }));
  expect(await screen.findByText("저장 실패")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(mockRegister).toHaveBeenCalledTimes(1);
});

test("등록된 계약서의 임차인 수정도 동일 요청의 기간 중복을 확인하고 재시도한다", async () => {
  mockDocument.mockResolvedValue({ ...DOCUMENT, status: "REGISTERED", tenantId: TENANT.tenantId });
  mockUpdateTenant.mockRejectedValueOnce(overlapError());
  renderReview();
  const name = await screen.findByLabelText("세입자 이름");
  fireEvent.change(name, { target: { value: "수정할 이름" } });
  const update = screen.getByRole("button", { name: "수정" });
  await waitFor(() => expect(update).toBeEnabled());
  fireEvent.click(update);
  const dialog = (await screen.findByRole("button", { name: "겹쳐도 수정" })).closest('[role="dialog"]') as HTMLElement;
  const request = mockUpdateTenant.mock.calls[0][1];
  fireEvent.click(within(dialog).getByRole("button", { name: "겹쳐도 수정" }));
  await waitFor(() => expect(mockUpdateTenant).toHaveBeenCalledTimes(2));
  expect(mockUpdateTenant.mock.calls[1]).toEqual([TENANT.tenantId, { ...request, allowContractOverlap: true }]);
  expect(await screen.findByText("임차인 정보가 수정되었습니다.")).toBeInTheDocument();
});
