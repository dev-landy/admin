import { fetchSignups } from '@/features/dashboard/signup-api';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
const range = { startDate: '2026-10-19', endDate: '2026-10-25' };
const response = {
  ...range, timezone: 'Asia/Seoul', totalCount: 6, generatedAt: '2026-10-25T03:00:00Z',
  dailyCounts: [0, 1, 0, 2, 0, 3, 0].map((count, index) => ({ date: `2026-10-${19 + index}`, count })),
};

test('requests the selected seven days through the authenticated API and keeps zero days', async () => {
  jest.mocked(apiClient.get).mockResolvedValue({ data: response });
  const signal = new AbortController().signal;
  expect(await fetchSignups(range, signal)).toEqual(response);
  expect(apiClient.get).toHaveBeenCalledWith('/v1/admin/dashboard/signups', { params: range, signal });
});

test.each([
  { ...response, dailyCounts: response.dailyCounts.slice(1) },
  { ...response, endDate: '2026-10-24' },
  { ...response, dailyCounts: response.dailyCounts.map((point, index) => index === 0 ? { ...point, count: -1 } : point) },
  { ...response, totalCount: 99 },
])('rejects incomplete or mismatched counts instead of displaying a misleading chart', async data => {
  jest.mocked(apiClient.get).mockResolvedValue({ data });
  await expect(fetchSignups(range)).rejects.toThrow('가입자 집계 응답을 확인할 수 없습니다.');
});
