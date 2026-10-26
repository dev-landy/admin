import '@/test-utils/antd';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '@/features/auth/store';
import { SignupOverview } from '@/features/dashboard/components/SignupOverview';
import { apiClient } from '@/lib/api/client';

jest.mock('@/features/dashboard/signup-range', () => ({
  ...jest.requireActual('@/features/dashboard/signup-range'),
  getKstDate: () => '2026-10-25',
}));

const originalAdapter = apiClient.defaults.adapter;
let client: QueryClient;
const currentWeek = {
  startDate: '2026-10-19',
  endDate: '2026-10-25',
  timezone: 'Asia/Seoul',
  totalCount: 28,
  dailyCounts: [4, 0, 5, 7, 3, 6, 3].map((count, index) => ({ date: `2026-10-${19 + index}`, count })),
  generatedAt: '2026-10-25T14:30:00+09:00',
};
const previousWeek = {
  ...currentWeek,
  startDate: '2026-10-12',
  endDate: '2026-10-18',
  totalCount: 3,
  dailyCounts: [1, 2, 0, 0, 0, 0, 0].map((count, index) => ({ date: `2026-10-${12 + index}`, count })),
};

// Keep the real axios transformations, authentication interceptor, query and UI;
// only the network response is replaced with the backend's serialized JSON.
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse<string> {
  return { config, status, statusText: String(status), headers: { 'content-type': 'application/json' }, data: JSON.stringify(data) };
}

function renderOverview() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><SignupOverview /></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  tokenStore.setTokens({ accessToken: 'admin-access', refreshToken: 'admin-refresh' });
});

afterEach(() => {
  cleanup();
  client.clear();
  apiClient.defaults.adapter = originalAdapter;
  localStorage.clear();
  jest.restoreAllMocks();
});

test('renders backend JSON with the KST timestamp, selects zero days and caches each requested week', async () => {
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) =>
    response(config, config.params.startDate === currentWeek.startDate ? currentWeek : previousWeek));
  apiClient.defaults.adapter = adapter;
  renderOverview();

  await screen.findByRole('button', { name: '2026-10-25 신규 가입 3명 · 오늘 집계 중' });
  expect(screen.getByText('선택한 7일의 가입자').closest('.ant-statistic')).toHaveTextContent('28명');
  expect(screen.getByText('일평균 가입자').closest('.ant-statistic')).toHaveTextContent('4.0명');
  expect(screen.getByText('10.22 · 7명')).toBeInTheDocument();
  expect(screen.getByText('2026. 10. 25. 오후 2:30:00 KST 기준')).toBeInTheDocument();

  const zeroDay = screen.getByRole('button', { name: '2026-10-20 신규 가입 0명' });
  fireEvent.click(zeroDay);
  expect(zeroDay).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('figure')).getByRole('status')).toHaveTextContent('2026.10.20 (화)0명');

  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  const previousLastDay = await screen.findByRole('button', { name: '2026-10-18 신규 가입 0명' });
  expect(previousLastDay).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('선택한 7일의 가입자').closest('.ant-statistic')).toHaveTextContent('3명');
  expect(screen.queryByRole('button', { name: '2026-10-20 신규 가입 0명' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '다음 7일' }));
  expect(screen.getByRole('button', { name: '2026-10-25 신규 가입 3명 · 오늘 집계 중' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '다음 7일' })).toBeDisabled();
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls.map(([config]) => ({
    method: config.method, uri: apiClient.getUri(config), authorization: config.headers.get('Authorization'),
  }))).toEqual([
    { method: 'get', uri: '/api/v1/admin/dashboard/signups?startDate=2026-10-19&endDate=2026-10-25', authorization: 'Bearer admin-access' },
    { method: 'get', uri: '/api/v1/admin/dashboard/signups?startDate=2026-10-12&endDate=2026-10-18', authorization: 'Bearer admin-access' },
  ]);
});

test('shows preparation for a failed backend response and retries the same range without sample counts', async () => {
  const problem = {
    type: '/problems/query-param-invalid', title: 'Query parameter invalid', status: 400,
    detail: '종료일은 서울 기준 오늘을 넘을 수 없습니다.',
  };
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => response(config, {
    ...currentWeek, totalCount: 0, dailyCounts: currentWeek.dailyCounts.map(point => ({ ...point, count: 0 })),
  }));
  adapter.mockImplementationOnce(async config => {
    throw new AxiosError('bad request', AxiosError.ERR_BAD_REQUEST, config, undefined, response(config, problem, 400));
  });
  apiClient.defaults.adapter = adapter;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderOverview();

  await screen.findByText('준비중입니다');
  expect(screen.getByRole('alert')).toHaveTextContent('가입자 통계 기능을 준비하고 있습니다. 잠시 후 다시 확인해 주세요.');
  expect(screen.queryByText(problem.detail)).not.toBeInTheDocument();
  expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  expect(screen.queryByText('예시 데이터')).not.toBeInTheDocument();
  expect(tokenStore.getAccessToken()).toBe('admin-access');
  expect(adapter).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: '가입자 수 다시 조회' }));
  await screen.findByText('이 기간에 신규 가입자가 없습니다.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls.map(([config]) => config.params)).toEqual([
    { startDate: '2026-10-19', endDate: '2026-10-25' },
    { startDate: '2026-10-19', endDate: '2026-10-25' },
  ]);
  expect(log).toHaveBeenCalledTimes(1);
});
