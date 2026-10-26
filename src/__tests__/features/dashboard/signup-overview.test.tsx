import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { SignupOverview } from '@/features/dashboard/components/SignupOverview';
import { fetchSignups, type SignupData } from '@/features/dashboard/signup-api';
import { getKstDate } from '@/features/dashboard/signup-range';

jest.mock('@/features/dashboard/signup-api', () => ({ fetchSignups: jest.fn() }));
jest.mock('@/features/dashboard/signup-range', () => ({ ...jest.requireActual('@/features/dashboard/signup-range'), getKstDate: jest.fn(() => '2026-10-25') }));
function renderOverview(sample = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><SignupOverview sample={sample} /></QueryClientProvider>);
  return { ...view, client };
}
function data(startDay: number, count = 1): SignupData {
  return { startDate: `2026-10-${startDay}`, endDate: `2026-10-${startDay + 6}`, timezone: 'Asia/Seoul', totalCount: count * 7,
    dailyCounts: Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-${startDay + index}`, count })), generatedAt: '2026-10-25T03:00:00Z' };
}
beforeEach(() => {
  jest.mocked(fetchSignups).mockReset();
  jest.mocked(getKstDate).mockReturnValue('2026-10-25');
});

test('starts at recent seven days, moves by a week and prevents navigation into the future', async () => {
  jest.mocked(fetchSignups).mockImplementation(async range => data(Number(range.startDate.slice(-2))));
  renderOverview();
  await screen.findByRole('button', { name: /2026-10-25.*1명/ });
  expect(screen.getByRole('button', { name: '다음 7일' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  await screen.findByRole('button', { name: /2026-10-18.*1명/ });
  expect(fetchSignups).toHaveBeenLastCalledWith({ startDate: '2026-10-12', endDate: '2026-10-18' }, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: '다음 7일' }));
  await screen.findByRole('button', { name: /2026-10-25.*1명/ });
  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  fireEvent.click(screen.getByRole('button', { name: '최근 7일' }));
  expect(screen.getByRole('button', { name: '다음 7일' })).toBeDisabled();
});

test('does not label old counts with a new period while the new request is pending', async () => {
  jest.mocked(fetchSignups).mockResolvedValueOnce(data(19, 9)).mockImplementation(() => new Promise(() => {}));
  renderOverview();
  await screen.findByRole('button', { name: /2026-10-25.*9명/ });
  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  expect(screen.queryByRole('button', { name: /2026-10-25.*9명/ })).not.toBeInTheDocument();
  expect(screen.getByText('가입자 수를 불러오는 중입니다.')).toBeInTheDocument();
});

test.each([404, 500, undefined])('a failed signup request (%s) shows preparation without counts and can retry', async status => {
  const error = new AxiosError('request failed');
  if (status) error.response = { status } as AxiosError['response'];
  jest.mocked(fetchSignups).mockRejectedValueOnce(error).mockResolvedValueOnce(data(19, 0));
  renderOverview();
  await screen.findByText('준비중입니다');
  expect(screen.getByRole('alert')).toHaveTextContent('가입자 통계 기능을 준비하고 있습니다. 잠시 후 다시 확인해 주세요.');
  expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  expect(screen.queryByText('예시 데이터')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /2026-10-25.*0명/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '가입자 수 다시 조회' }));
  await screen.findByText('이 기간에 신규 가입자가 없습니다.');
});

test('sample mode is explicit, interactive, and does not request production signup data', async () => {
  renderOverview(true);
  await waitFor(() => expect(screen.getByText('예시 데이터')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: /2026-10-25.*명/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  expect(screen.getByRole('button', { name: /2026-10-18.*명/ })).toBeInTheDocument();
  expect(fetchSignups).not.toHaveBeenCalled();
});

test('daily average rounds the selected total to one decimal place', () => {
  renderOverview(true);
  expect(screen.getByText('일평균 가입자').closest('.ant-statistic')).toHaveTextContent('14.6');
});

test('a failed signup response with Problem Detail also shows preparation', async () => {
  const error = new AxiosError('missing user');
  error.response = { status: 404, data: { type: '/problems/user-not-found', title: 'User not found', status: 404, detail: '사용자를 찾을 수 없습니다.' } } as AxiosError['response'];
  jest.mocked(fetchSignups).mockRejectedValue(error);
  renderOverview();
  await screen.findByText('준비중입니다');
  expect(screen.queryByText('사용자를 찾을 수 없습니다.')).not.toBeInTheDocument();
  expect(screen.queryByRole('figure')).not.toBeInTheDocument();
});

test('refocusing after KST midnight advances the recent window but preserves a historical selection', async () => {
  jest.mocked(fetchSignups).mockImplementation(async range => data(Number(range.startDate.slice(-2))));
  renderOverview();
  await screen.findByRole('button', { name: /2026-10-25.*1명/ });
  jest.mocked(getKstDate).mockReturnValue('2026-10-26');
  fireEvent.focus(window);
  await screen.findByRole('button', { name: /2026-10-26.*1명/ });
  expect(fetchSignups).toHaveBeenLastCalledWith({ startDate: '2026-10-20', endDate: '2026-10-26' }, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: '이전 7일' }));
  await screen.findByRole('button', { name: /2026-10-19.*1명/ });
  const requestCount = jest.mocked(fetchSignups).mock.calls.length;
  jest.mocked(getKstDate).mockReturnValue('2026-10-27');
  fireEvent.focus(window);
  expect(screen.getByRole('button', { name: /2026-10-19.*1명/ })).toBeInTheDocument();
  expect(fetchSignups).toHaveBeenCalledTimes(requestCount);
  fireEvent.click(screen.getByRole('button', { name: '다음 7일' }));
  await screen.findByRole('button', { name: /2026-10-26.*1명/ });
  expect(screen.getByRole('button', { name: '다음 7일' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '최근 7일' })).toBeEnabled();
});
