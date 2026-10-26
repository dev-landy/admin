import { apiClient } from '@/lib/api/client';
import { signupDates, type SignupRange } from './signup-range';

export type SignupData = SignupRange & {
  timezone: 'Asia/Seoul';
  totalCount: number;
  dailyCounts: { date: string; count: number }[];
  generatedAt: string;
};

export async function fetchSignups(range: SignupRange, signal?: AbortSignal): Promise<SignupData> {
  const { data } = await apiClient.get<SignupData>('/v1/admin/dashboard/signups', { params: range, signal });
  const dates = signupDates(range);
  if (!data || data.startDate !== range.startDate || data.endDate !== range.endDate
    || data.timezone !== 'Asia/Seoul' || !Array.isArray(data.dailyCounts) || data.dailyCounts.length !== 7
    || !data.dailyCounts.every((point, index) => point && point.date === dates[index] && Number.isSafeInteger(point.count) && point.count >= 0)
    || !Number.isSafeInteger(data.totalCount) || data.totalCount !== data.dailyCounts.reduce((sum, point) => sum + point.count, 0)
    || typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt))) {
    throw new Error('가입자 집계 응답을 확인할 수 없습니다.');
  }
  return data;
}
