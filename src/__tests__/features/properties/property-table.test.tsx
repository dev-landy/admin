import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { PropertyTable } from "@/features/properties/components/PropertyTable";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";
import type { PropertySummary } from "@/features/properties/types";
import "@/test-utils/antd";

const property = { propertyId: 3, userId: 12, userEmail: "landlord@example.com", name: "건물", address: null,
  activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
let mockUserProperties: PropertySummary[] = [property];
let mockViewport = "wide";
const mockDelete = jest.fn();
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/properties/hooks", () => ({
  useDeleteProperty: () => ({ mutateAsync: mockDelete, isPending: false }),
  useUserProperties: () => ({ data: { properties: mockUserProperties }, isLoading: false }),
}));
jest.mock("@/features/properties/components/PropertyEditModal", () => ({ PropertyEditModal: () => null }));
jest.mock("@/features/properties/components/PropertyTenantsModal", () => ({ PropertyTenantsModal: () => null }));

beforeEach(() => { mockViewport = "wide"; mockUserProperties = [property]; mockDelete.mockReset().mockResolvedValue(undefined); });

function renderAll(data: PropertySummary[] = [property]) {
  return render(<ConfigProvider theme={{ token: { motion: false } }}><App><PropertyTable data={data} loading={false} page={1} pageSize={20} total={data.length} filters={{}} onPageChange={jest.fn()} onFilterChange={jest.fn()} /></App></ConfigProvider>);
}

test("건물 이름·주소·임대인을 함께 식별하고 삭제는 더보기의 대상 확인을 거친다", async () => {
  renderAll([{ ...property, address: "서울 강남구 역삼동" }]);
  expect(screen.getByText("서울 강남구 역삼동")).toBeVisible();
  expect(screen.getByRole("link", { name: "landlord@example.com" })).toHaveAttribute("href", expect.stringContaining("/users/12?"));
  expect(screen.getByRole("button", { name: "임차인 보기" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "건물 #3 건물 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  expect(await screen.findByText("마지막 남은 건물이거나 등록된 임차인 계약 정보가 남아 있으면 삭제할 수 없습니다.")).toBeInTheDocument();
  const confirm = screen.getByRole("dialog");
  await waitFor(() => {
    expect(within(confirm).getByText("건물 #3")).toBeVisible();
    expect(within(confirm).getByText("서울 강남구 역삼동")).toBeVisible();
  });
  fireEvent.click(within(confirm).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockDelete).not.toHaveBeenCalled();
});

test("확인한 건물만 삭제 요청하고 성공을 안내한다", async () => {
  renderAll();
  fireEvent.click(screen.getByRole("button", { name: "건물 #3 건물 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  const confirm = await screen.findByRole("dialog");
  fireEvent.click(within(confirm).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(3));
  expect(await screen.findByText("건물을 삭제했습니다.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("삭제되지 않은 등록 계약 수를 건 단위로 표시하고 삭제 불가 이유를 안내한다", async () => {
  renderAll([{ ...property, activeTenantCount: 2 }]);
  expect(screen.getByRole("columnheader", { name: "등록 계약" })).toBeInTheDocument();
  expect(screen.getByText("2건")).toBeInTheDocument();
  expect(screen.queryByText("2명")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "건물 #3 건물 더보기" }));
  expect(await screen.findByRole("menuitem", { name: "건물 삭제 · 등록 계약 있음" })).toHaveAttribute("aria-disabled", "true");
  expect(mockDelete).not.toHaveBeenCalled();
});

test("사용자의 마지막 건물은 삭제를 막고 정보 수정과 임차인 보기는 유지한다", async () => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><UserPropertiesTab userId={12} /></App></ConfigProvider>);
  expect(screen.queryByRole("status", { name: "사용자 등록 건물 전체" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "임차인 보기" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "건물 #3 건물 더보기" }));
  expect(await screen.findByRole("menuitem", { name: "건물 삭제 · 마지막 건물" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("menuitem", { name: "건물 정보 수정" })).not.toHaveAttribute("aria-disabled", "true");
});

test("사용자 건물 목록은 응답 순서를 유지하며 20건씩 표시하고 마지막 페이지가 줄면 유효한 페이지로 돌아온다", () => {
  mockUserProperties = Array.from({ length: 21 }, (_, index) => ({ ...property, propertyId: index + 1, name: `건물 ${index + 1}` }));
  const view = render(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getAllByRole("row")).toHaveLength(21); // 제목 1행과 현재 페이지 20행.
  expect(screen.getByText("건물 1")).toBeVisible();
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(screen.getByText("건물 21")).toBeVisible();
  expect(screen.queryByText("건물 1")).not.toBeInTheDocument();

  mockUserProperties = mockUserProperties.slice(0, 20);
  view.rerender(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getByText("건물 1")).toBeVisible();
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
});

test("사용자 건물 정렬은 전체 응답에서 적용한 뒤 페이지를 나누고 원본 배열을 바꾸지 않는다", () => {
  mockUserProperties = Array.from({ length: 21 }, (_, index) => ({ ...property, propertyId: index + 1, name: `건물 ${index + 1}` }));
  const originalIds = mockUserProperties.map((entry) => entry.propertyId);
  render(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getByRole("combobox", { name: "사용자 건물 목록 정렬 기준" })).toHaveValue("name");
  expect(screen.getByRole("combobox", { name: "사용자 건물 목록 정렬 순서" })).toHaveValue("asc");
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(screen.getByText("건물 21")).toBeVisible();
  fireEvent.change(screen.getByRole("combobox", { name: "사용자 건물 목록 정렬 기준" }), { target: { value: "propertyId" } });
  fireEvent.change(screen.getByRole("combobox", { name: "사용자 건물 목록 정렬 순서" }), { target: { value: "desc" } });
  expect(screen.getByText("1–20번째 · 1페이지")).toBeVisible();
  expect(screen.getByText("건물 21")).toBeVisible();
  expect(screen.queryByText("건물 1")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(screen.getByText("건물 1")).toBeVisible();
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
  expect(mockUserProperties.map((entry) => entry.propertyId)).toEqual(originalIds);
});

test("모바일 건물 카드는 주소·임대인과 정밀 시각을 읽고 같은 건물의 임차인을 바로 연다", async () => {
  mockViewport = "mobile";
  const openTenants = jest.fn();
  const record = { ...property, address: "서울 강남구 역삼동 123 긴 건물 주소", createdAt: "2026-10-05T08:01:02.123456", updatedAt: "2026-10-05T09:02:03.654321" };
  render(<App><PropertyTable data={[record]} loading={false} page={1} pageSize={20} total={1} filters={{}} onPageChange={jest.fn()} onFilterChange={jest.fn()} onTenantPropertyChange={openTenants} /></App>);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const card = screen.getByRole("article", { name: "건물 #3 건물" });
  expect(within(card).getByText(record.address)).toBeVisible();
  expect(within(card).getByRole("link", { name: "landlord@example.com" })).toHaveAttribute("href", expect.stringContaining("/users/12?"));
  fireEvent.click(within(card).getByText("추가 정보"));
  await waitFor(() => {
    expect(within(card).getByText("2026-10-05 08:01:02.123456")).toBeVisible();
    expect(within(card).getByText("2026-10-05 09:02:03.654321")).toBeVisible();
  });
  fireEvent.click(within(card).getByRole("button", { name: "임차인 보기" }));
  expect(openTenants).toHaveBeenCalledWith(3);
});

test("모바일 사용자 건물도 페이지 크기와 전체 배열 검색을 함께 보존한다", async () => {
  mockViewport = "mobile";
  mockUserProperties = Array.from({ length: 21 }, (_, index) => ({ ...property, propertyId: index + 1, name: `건물 ${index + 1}`, address: index === 20 ? "역삼 신관" : null }));
  render(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.getAllByRole("article")).toHaveLength(20);
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText("건물 21")).toBeVisible();
  fireEvent.change(screen.getByLabelText("사용자 건물 목록 페이지당 항목 수"), { target: { value: "50" } });
  expect(screen.getAllByRole("article")).toHaveLength(21);
  fireEvent.change(screen.getByLabelText("건물명 또는 주소"), { target: { value: "역삼" } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  expect(screen.getByRole("article", { name: "건물 #21 건물 21" })).toBeVisible();
  expect(screen.getByRole("status", { name: "사용자 등록 건물 전체" })).toHaveTextContent("등록 건물 전체 21건");
  expect(screen.getByText("조회 결과 1건")).toBeVisible();
});

test("사용자의 건물 검색은 현재 20행 밖의 전체 배열에서도 이름·주소를 찾아 첫 페이지에 표시한다", async () => {
  mockUserProperties = Array.from({ length: 21 }, (_, index) => ({ ...property, propertyId: index + 1, name: `건물 ${index + 1}`, address: index === 20 ? "역삼 신관" : null }));
  render(<App><UserPropertiesTab userId={12} /></App>);
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("건물명 또는 주소"), { target: { value: "  역삼  " } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(screen.getByText("건물 21")).toBeVisible());
  expect(screen.queryByText("건물 1")).not.toBeInTheDocument();
  expect(screen.getByRole("status", { name: "사용자 등록 건물 전체" })).toHaveTextContent("등록 건물 전체 21건");
  expect(screen.getByText("조회 결과 1건")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "건물 #21 건물 21 더보기" }));
  expect(await screen.findByRole("menuitem", { name: "건물 삭제" })).not.toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByRole("button", { name: "건물 #21 건물 21 더보기" }));
  fireEvent.click(screen.getAllByRole("button", { name: "필터 초기화" })[0]);
  await waitFor(() => expect(screen.getByText("건물 1")).toBeVisible());
  expect(screen.queryByText("건물 21")).not.toBeInTheDocument();
});
