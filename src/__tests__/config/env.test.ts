/** @jest-environment node */

// env.appEnv는 모듈 로드 시점에 확정되므로 매 테스트마다 모듈을 새로 로드한다.
async function loadAppEnv() {
  jest.resetModules();
  const { env } = await import("@/config/env");
  return env.appEnv;
}

describe("env.appEnv", () => {
  const original = { ...process.env };
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...original };
    warnSpy.mockRestore();
  });

  test("NEXT_PUBLIC_APP_ENV 값을 그대로 사용한다", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "prod";
    expect(await loadAppEnv()).toBe("prod");
  });

  test("공백과 대소문자를 정규화한다", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = " DEV ";
    expect(await loadAppEnv()).toBe("dev");
  });

  test("미설정 시 local로 폴백한다", async () => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    expect(await loadAppEnv()).toBe("local");
  });

  test("production 빌드에서 미설정이면 local로 폴백하고 경고한다", async () => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    Object.assign(process.env, { NODE_ENV: "production" });
    expect(await loadAppEnv()).toBe("local");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("NEXT_PUBLIC_APP_ENV"));
  });

  test("알 수 없는 값이면 local로 폴백하고 경고한다", async () => {
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    expect(await loadAppEnv()).toBe("local");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid ("staging")'));
  });
});
