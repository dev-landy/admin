import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { fetchNotifications, fetchOutbox } from "@/features/notifications/api";
import { useNotifications, useOutbox } from "@/features/notifications/hooks";
import { fetchAlimtalks, fetchAlimtalkTemplates } from "@/features/alimtalk/api";
import { useAlimtalks, useAlimtalkTemplates } from "@/features/alimtalk/hooks";
import { fetchBatchExecutions, fetchBatchSchedules } from "@/features/batch/api";
import { useBatchExecutions, useBatchSchedules } from "@/features/batch/hooks";
import { fetchContractDocuments, fetchContractDocumentDraft, fetchContractDocumentFiles } from "@/features/contract-ocr/api";
import { useContractDocuments, useContractDocumentDraft, useContractDocumentFiles } from "@/features/contract-ocr/hooks";
import { fetchUsers } from "@/features/users/api";
import { useUsers } from "@/features/users/hooks";
import { getQueryClient } from "@/lib/query/get-query-client";

jest.mock("@/features/notifications/api");
jest.mock("@/features/alimtalk/api");
jest.mock("@/features/batch/api");
jest.mock("@/features/contract-ocr/api");
jest.mock("@/features/users/api");

const params = { page: 1, size: 20 };
const page = { page: 1, size: 20, totalElements: 0 };
const operationalRequests = [fetchNotifications, fetchOutbox, fetchAlimtalks, fetchBatchExecutions, fetchContractDocuments];
const stableRequests = [fetchUsers, fetchBatchSchedules, fetchAlimtalkTemplates, fetchContractDocumentDraft, fetchContractDocumentFiles];

function useScreenQueries() {
  return [
    useNotifications(params), useOutbox(params), useAlimtalks(params), useBatchExecutions(params),
    useContractDocuments("PENDING", 1, 20), useUsers(params), useBatchSchedules(), useAlimtalkTemplates(),
    useContractDocumentDraft("document", true), useContractDocumentFiles("document"),
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  focusManager.setFocused(undefined);
  jest.mocked(fetchNotifications).mockResolvedValue({ ...page, notifications: [] });
  jest.mocked(fetchOutbox).mockResolvedValue({ ...page, outboxes: [] });
  jest.mocked(fetchAlimtalks).mockResolvedValue({ ...page, alimtalks: [] });
  jest.mocked(fetchBatchExecutions).mockResolvedValue({ ...page, executions: [] });
  jest.mocked(fetchContractDocuments).mockResolvedValue({ ...page, documents: [] });
  jest.mocked(fetchUsers).mockResolvedValue({ ...page, users: [] });
  jest.mocked(fetchBatchSchedules).mockResolvedValue({ schedules: [] });
  jest.mocked(fetchAlimtalkTemplates).mockResolvedValue({ templates: [] });
  jest.mocked(fetchContractDocumentDraft).mockResolvedValue({ documentId: "document", values: {} });
  jest.mocked(fetchContractDocumentFiles).mockResolvedValue({ files: [] });
});

test("브라우저 탭 복귀는 운영 결과만 재조회하고 일반·편집·원본 조회를 반복하지 않는다", async () => {
  const client = new QueryClient({ defaultOptions: getQueryClient().getDefaultOptions() });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const hook = renderHook(useScreenQueries, { wrapper });
  try {
    await waitFor(() => expect(hook.result.current.every((query) => query.isSuccess)).toBe(true));
    for (const request of [...operationalRequests, ...stableRequests]) expect(request).toHaveBeenCalledTimes(1);

    visibility.mockReturnValue("hidden");
    fireEvent(window, new Event("visibilitychange"));
    await act(async () => {});
    for (const request of operationalRequests) expect(request).toHaveBeenCalledTimes(1);

    visibility.mockReturnValue("visible");
    fireEvent(window, new Event("visibilitychange"));
    await waitFor(() => {
      for (const request of operationalRequests) expect(request).toHaveBeenCalledTimes(2);
    });
    for (const request of stableRequests) expect(request).toHaveBeenCalledTimes(1);

    // 일반 화면의 fresh 캐시를 유지해 바로 재방문할 때 API 요청을 늘리지 않는다.
    hook.unmount();
    const revisit = renderHook(useScreenQueries, { wrapper });
    try {
      await waitFor(() => {
        for (const request of operationalRequests) expect(request).toHaveBeenCalledTimes(3);
      });
      for (const request of [fetchUsers, fetchBatchSchedules, fetchAlimtalkTemplates, fetchContractDocumentDraft]) {
        expect(request).toHaveBeenCalledTimes(1);
      }
    } finally {
      revisit.unmount();
    }
  } finally {
    hook.unmount();
    client.clear();
    visibility.mockRestore();
    focusManager.setFocused(undefined);
  }
});
