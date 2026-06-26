import { KakaoCallback } from "@/features/auth/kakao-callback";

type CallbackSearchParams = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

export default async function KakaoCallbackPage({
  searchParams,
}: {
  searchParams: Promise<CallbackSearchParams>;
}) {
  const params = await searchParams;

  return (
    <KakaoCallback
      code={params.code}
      state={params.state}
      error={params.error}
      errorDescription={params.error_description}
    />
  );
}
