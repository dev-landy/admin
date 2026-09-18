import {
  fetchAlimtalkTemplates,
  fetchAlimtalks,
  fetchRemoteAlimtalkTemplate,
  sendTestAlimtalk,
  updateAlimtalkTemplate,
} from "@/features/alimtalk/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);
const mockPatch = jest.mocked(apiClient.patch);

beforeEach(() => {
  jest.clearAllMocks();
});

test("자동/수동 필터를 그대로 전달해 발송 이력을 조회한다", async () => {
  const response = { alimtalks: [], page: 0, size: 20, totalElements: 0 };
  mockGet.mockResolvedValue({ data: response });
  const params = { page: 1, size: 20, triggerSource: "SCHEDULED" as const, status: "FAILED" as const };

  await expect(fetchAlimtalks(params)).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/alimtalks", { params });
});

test("걸지 않은 필터는 파라미터에 넣지 않는다", async () => {
  mockGet.mockResolvedValue({ data: { alimtalks: [], page: 0, size: 20, totalElements: 0 } });

  await fetchAlimtalks({ page: 1, size: 20, tenantId: 30 });

  const [, config] = mockGet.mock.calls[0] as [string, { params: Record<string, unknown> }];
  expect(Object.keys(config.params)).toEqual(["page", "size", "tenantId"]);
});

test("템플릿 목록을 조회한다", async () => {
  mockGet.mockResolvedValue({ data: { templates: [] } });

  await expect(fetchAlimtalkTemplates()).resolves.toEqual({ templates: [] });
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/alimtalks/templates");
});

test("보낸 항목만 담아 템플릿을 부분 수정한다", async () => {
  mockPatch.mockResolvedValue({ data: { type: "DUE" } });

  await updateAlimtalkTemplate("DUE", { enabled: true });

  expect(mockPatch).toHaveBeenCalledWith("/v1/admin/alimtalks/templates/DUE", { enabled: true });
});

test("승인 템플릿은 종류별 원격 경로에서 가져온다", async () => {
  mockGet.mockResolvedValue({ data: { type: "OVERDUE", variableNames: [] } });

  await fetchRemoteAlimtalkTemplate("OVERDUE");

  expect(mockGet).toHaveBeenCalledWith("/v1/admin/alimtalks/templates/OVERDUE/remote");
});

test("테스트 발송은 번호와 변수값을 그대로 보낸다", async () => {
  mockPost.mockResolvedValue({ data: { status: "SENT" } });
  const request = {
    type: "DUE" as const,
    phone: "010-1234-5678",
    variables: { "#{납부액}": "500,000" },
  };

  await expect(sendTestAlimtalk(request)).resolves.toEqual({ status: "SENT" });
  expect(mockPost).toHaveBeenCalledWith("/v1/admin/alimtalks/test-sends", request);
});
