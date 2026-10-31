import axios from "axios";

import { env } from "@/config/env";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
    return Response.json({
      type: "/problems/unauthorized",
      title: "관리자 로그인이 필요합니다.",
      status: 401,
      detail: "로그인 후 다시 시도해 주세요.",
    }, { status: 401, headers: noStore });
  }

  try {
    // 전체 처리가 끝나야 응답하므로 이 경로만 rewrite의 기본 30초 제한을 우회한다.
    // 관리자 권한은 전달한 Bearer 토큰으로 백엔드에서 검증한다.
    const response = await axios.post<string>(`${env.apiBaseUrl}/v1/admin/properties/geocoding`, undefined, {
      headers: { Authorization: authorization },
      timeout: 0,
      maxRedirects: 0,
      responseType: "text",
      transformResponse: [(data: string) => data],
      validateStatus: () => true,
      signal: request.signal,
    });
    const contentType = response.headers["content-type"];
    return new Response([204, 205, 304].includes(response.status) ? null : response.data, {
      status: response.status,
      headers: {
        ...noStore,
        "Content-Type": typeof contentType === "string" ? contentType : "application/json",
      },
    });
  } catch {
    return Response.json({
      type: "/problems/geocoding-proxy",
      title: "건물 주소 일괄 처리 결과를 확인하지 못했습니다.",
      status: 502,
      detail: "서버 연결을 확인해 주세요. 일부 건물은 이미 처리되었을 수 있습니다.",
    }, { status: 502, headers: noStore });
  }
}
