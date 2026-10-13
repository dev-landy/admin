import type { ActivationData, SourceResult } from '../types';
import { AnalyticsError, numeric, shiftDate } from './shared';
export async function loadActivationData(query: (sql: string) => Promise<unknown[][]>, today: string): Promise<SourceResult<ActivationData>> {
  const start = shiftDate(today, -30);
  const matureEnd = shiftDate(today, -7);
  const ts = (day: string) => `toDateTime('${day} 00:00:00', 'Asia/Seoul')`;
  // Each identified user enters once, at their first login within the report window.
  const rows = await query(`SELECT count(), countIf(login_at < ${ts(matureEnd)}), countIf(login_at < ${ts(matureEnd)} AND length(registered) > 0), countIf(login_at < ${ts(matureEnd)} AND length(registered) > 0 AND arrayExists(t -> t >= arrayMin(registered) AND t < addDays(login_at, 7), views)) FROM (SELECT login_at, arrayFilter(t -> t >= login_at AND t < addDays(login_at, 7), contracts) AS registered, views FROM (SELECT person_id, minIf(timestamp, event = 'login_succeeded') AS login_at, groupArrayIf(timestamp, event = 'contract_added') AS contracts, groupArrayIf(timestamp, event = '$screen' AND properties.$screen_name IN ('rooms', 'profit', 'profit/income')) AS views FROM events WHERE match(distinct_id, '^[0-9]+$') AND coalesce(toString(person.properties.is_internal), '') NOT IN ('true', '1') AND coalesce(toString(person.properties.is_test), '') NOT IN ('true', '1') AND (event IN ('login_succeeded', 'contract_added') OR (event = '$screen' AND properties.$screen_name IN ('rooms', 'profit', 'profit/income'))) AND timestamp >= ${ts(start)} AND timestamp < ${ts(today)} GROUP BY person_id HAVING countIf(event = 'login_succeeded') > 0) WHERE login_at >= ${ts(start)} AND login_at < ${ts(today)})`);
  if (rows.length !== 1) throw new AnalyticsError('invalid_response', '로그인 후 관리 전환 집계 응답이 올바르지 않습니다.');
  const [logins, eligible, registered, viewed] = rows[0].map(numeric);
  return { status: 'success', fetchedAt: new Date().toISOString(), data: { start, end: shiftDate(today, -1), logins, eligible, registered, viewed, pending: logins - eligible, rate: eligible ? Math.round(registered / eligible * 1000) / 10 : null } };
}
