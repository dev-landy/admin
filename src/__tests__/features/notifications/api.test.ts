import { apiClient } from "@/lib/api/client";
import { dispatchNotifications, fetchOutbox, requeueOutbox } from "@/features/notifications/api";

jest.mock("@/lib/api/client", () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
const mockPost = jest.mocked(apiClient.post);

beforeEach(() => jest.clearAllMocks());

test("Outbox 목록은 서버의 outboxes 배열과 필터를 사용한다", async () => {
  const response = { outboxes: [{ notificationOutboxEventId: 4, status: "FAILED" }], page: 0, size: 20, totalElements: 1 };
  jest.mocked(apiClient.get).mockResolvedValue({ data: response });
  const filters = { page: 1, size: 20, userId: 7, errorCode: "UNAVAILABLE" };
  const result = await fetchOutbox(filters);
  expect(result.outboxes).toEqual(response.outboxes);
  expect(apiClient.get).toHaveBeenCalledWith("/v1/admin/notifications/outbox", { params: filters });
});

test("재큐잉의 빈 성공 응답은 본문을 기대하지 않는다", async () => {
  mockPost.mockResolvedValue({ data: "" });
  await expect(requeueOutbox(4)).resolves.toBeUndefined();
  expect(mockPost).toHaveBeenCalledWith("/v1/admin/notifications/outbox/4/requeue");
});

test("수동 발송은 처리 건수와 실제 발송 결과를 구분해 반환한다", async () => {
  const result = { processed: 5, sent: 2, failed: 1, skipped: 2, alreadyClaimed: 0 };
  mockPost.mockResolvedValue({ data: result });
  await expect(dispatchNotifications(50)).resolves.toEqual(result);
  expect(mockPost).toHaveBeenCalledWith("/v1/admin/notifications/dispatch", null, { params: { size: 50 } });
});

test.each(["", undefined, { processed: 5 }, { processed: 1, sent: -1, failed: 0, skipped: 0, alreadyClaimed: 0 }])(
  "통계가 없거나 불완전해도 성공 요청을 재전송하지 않는다: %p", async (data) => {
    mockPost.mockResolvedValue({ data });
    await expect(dispatchNotifications()).resolves.toBeNull();
    expect(mockPost).toHaveBeenCalledTimes(1);
  },
);
