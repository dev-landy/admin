import { sendToToken } from "@/features/fcm/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = jest.mocked(apiClient.post);

beforeEach(() => {
  mockPost.mockReset();
});

test("등록 토큰 ID 기반 테스트 발송 API를 호출한다", async () => {
  mockPost.mockResolvedValue({ data: { messageId: "message-id" } });

  await sendToToken({ fcmTokenId: 7, title: "제목", body: "본문" });

  expect(mockPost).toHaveBeenCalledWith("/v1/admin/fcm-tokens/7/test-messages", {
    title: "제목",
    body: "본문",
  });
});
