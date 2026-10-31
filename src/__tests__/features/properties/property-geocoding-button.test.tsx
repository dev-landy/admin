import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { PropertyGeocodingButton } from "@/features/properties/components/PropertyGeocodingButton";
import { geocodeProperties } from "@/features/properties/api";
import type { PropertyGeocodingResponse } from "@/features/properties/types";

jest.mock("@/features/properties/api", () => ({ geocodeProperties: jest.fn() }));
const mockGeocode = jest.mocked(geocodeProperties);
const result: PropertyGeocodingResponse = {
  targetCount: 3, attemptedCount: 3, updatedCount: 2, skippedCount: 1,
  failedCount: 0, stopReason: "EXHAUSTED", failures: [],
};

beforeEach(() => jest.resetAllMocks());

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["properties", "list"], { properties: [] });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <PropertyGeocodingButton />
  </App></ConfigProvider></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "건물 주소 일괄 처리" }));
  return client;
}

test("전체 대상 안내를 보고 취소하면 일괄 처리를 요청하지 않는다", async () => {
  setup();
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/현재 검색 조건과 관계없이/)).toBeInTheDocument();
  expect(mockGeocode).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockGeocode).not.toHaveBeenCalled();
});

test("처리 중 중복 실행을 막고 완료 집계를 표시하며 건물 캐시를 갱신한다", async () => {
  let resolve!: (value: PropertyGeocodingResponse) => void;
  mockGeocode.mockReturnValue(new Promise((done) => { resolve = done; }));
  const client = setup();
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "처리 시작" }));
  await waitFor(() => expect(mockGeocode).toHaveBeenCalledTimes(1));
  expect(within(dialog).getByRole("button", { name: /처리 중/ })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: /처리 중/ }));
  expect(mockGeocode).toHaveBeenCalledTimes(1);
  await act(async () => resolve(result));
  expect(await within(dialog).findByText("건물 주소 일괄 처리가 완료되었습니다.")).toBeInTheDocument();
  expect(within(dialog).getByText("저장 2건")).toBeInTheDocument();
  expect(within(dialog).getByText("건너뜀 1건")).toBeInTheDocument();
  expect(client.getQueryState(["properties", "list"])?.isInvalidated).toBe(true);
});

test.each(["EXHAUSTED", "EXTERNAL_ERROR"] as const)("200 응답의 %s 결과에서도 실패를 표시한다", async (stopReason) => {
  mockGeocode.mockResolvedValue({ ...result, attemptedCount: 2, updatedCount: 1, skippedCount: 0,
    targetCount: stopReason === "EXHAUSTED" ? 2 : 4, failedCount: 1, stopReason,
    failures: [{ propertyId: 125, reason: "AMBIGUOUS_ADDRESS" }],
  });
  setup();
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "처리 시작" }));
  expect(await within(dialog).findByText(stopReason === "EXTERNAL_ERROR"
    ? "외부 조회 오류로 처리가 중단되었습니다." : "일부 건물의 주소 처리에 실패했습니다.")).toBeInTheDocument();
  expect(within(dialog).getByText("실패 1건")).toBeInTheDocument();
  expect(within(dialog).getByText("125")).toBeInTheDocument();
  expect(within(dialog).getByText("주소를 하나로 특정할 수 없습니다.")).toBeInTheDocument();
  if (stopReason === "EXTERNAL_ERROR") expect(within(dialog).getByText("미시도 2건")).toBeInTheDocument();
});

test("대상이 없으면 처리할 건물이 없음을 표시한다", async () => {
  mockGeocode.mockResolvedValue({ ...result, targetCount: 0, attemptedCount: 0, updatedCount: 0, skippedCount: 0 });
  setup();
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "처리 시작" }));
  expect(await screen.findByText("처리할 건물이 없습니다.")).toBeInTheDocument();
});

test("오류 응답은 자동 재시도하지 않고 상세를 표시하며 부분 저장을 반영한다", async () => {
  const error = new AxiosError("unavailable");
  error.response = { data: { type: "/problems/geocoding-unavailable", title: "Service Unavailable", status: 503, detail: "좌표 조회가 설정되지 않았습니다." }, status: 503, statusText: "Service Unavailable", headers: {}, config: { headers: {} } } as AxiosError["response"];
  mockGeocode.mockRejectedValue(error);
  const client = setup();
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "처리 시작" }));
  expect(await within(dialog).findByText("좌표 조회가 설정되지 않았습니다.")).toBeInTheDocument();
  expect(mockGeocode).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(["properties", "list"])?.isInvalidated).toBe(true);
  expect(within(dialog).getByRole("button", { name: "닫기" })).toBeEnabled();
});
