/** @jest-environment node */
import { loadActivationData } from '@/features/dashboard/server/activation';
test('login counts and mature cohort use distinct denominators', async () => {
  const query = jest.fn().mockResolvedValue([[20, 12, 6, 3]]);
  expect(await loadActivationData(query, '2026-10-13')).toMatchObject({ status: 'success', data: { logins: 20, eligible: 12, pending: 8, registered: 6, viewed: 3, rate: 50 } });
  const sql = query.mock.calls[0][0];
  expect(sql).not.toContain('signup_completed');
  expect(sql).toContain("'login_succeeded'");
  expect(sql).toContain('t >= arrayMin(registered)');
  expect(sql).toContain('addDays(login_at, 7)');
});
test('no login events yields an empty funnel with unknown rate', async () => {
  expect(await loadActivationData(async () => [[0,0,0,0]], '2026-10-13')).toMatchObject({ status: 'success', data: { logins: 0, rate: null } });
});
test('no mature login means unknown rate, not zero percent', async () => {
  expect(await loadActivationData(async () => [[3,0,0,0]], '2026-10-13')).toMatchObject({ data: { rate: null, pending: 3 } });
});
