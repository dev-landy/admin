'use client';

import { useState, useSyncExternalStore } from 'react';
import { Alert, Button, Card, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import { getKstDate, getSignupRange, shiftDate, signupDates } from '../signup-range';
import { useSignups } from '../signup-query';
import { SignupChart } from './SignupChart';
import styles from './SignupOverview.module.css';

const { Text } = Typography;
function subscribeToday(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  return () => { window.clearInterval(timer); window.removeEventListener('focus', onChange); };
}
const serverToday = () => '';

export function SignupOverview({ sample = false }: { sample?: boolean }) {
  const today = useSyncExternalStore(subscribeToday, getKstDate, serverToday);
  const [selectedEnd, setSelectedEnd] = useState<string>();
  const endDate = selectedEnd && selectedEnd < today ? selectedEnd : today;
  const range = endDate ? getSignupRange(endDate) : undefined;
  const nextEndDate = endDate ? shiftDate(endDate, 7) : '';
  const query = useSignups(range, !sample);
  const sampleCounts = [12, 8, 19, 14, 23, 17, 9];
  const points = sample && range
    ? signupDates(range).map((date, index) => ({ date, count: sampleCounts[index] }))
    : !query.error ? query.data?.dailyCounts : undefined;
  const total = points?.reduce((sum, point) => sum + point.count, 0);
  const peak = points?.reduce((best, point) => point.count > best.count ? point : best, points[0]);
  const loading = !today || (!sample && query.isPending);

  return <section aria-label="신규 가입자 통계">
    <Card styles={{ body: { padding: 16 } }}>
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.period} aria-live="polite">
            <div className={styles.titleLine}><h2>날짜별 신규 가입자</h2><Tag color={sample ? 'orange' : 'blue'}>{sample ? '예시 데이터' : '신규 가입'}</Tag></div>
            <div className={styles.range}><strong>{range ? `${range.startDate.replaceAll('-', '.')} – ${range.endDate.replaceAll('-', '.')}` : '최근 7일'}</strong><Text type="secondary">한국 시간{endDate === today ? ' · 최근 7일' : ''}</Text></div>
          </div>
          <Space wrap size={8}>
            <Button size="small" aria-label="이전 7일" icon={<LeftOutlined />} disabled={!range} onClick={() => setSelectedEnd(shiftDate(endDate, -7))} />
            <Button size="small" onClick={() => setSelectedEnd(undefined)} disabled={!today || endDate === today}>최근 7일</Button>
            <Button size="small" aria-label="다음 7일" icon={<RightOutlined />} disabled={!today || nextEndDate > today}
              onClick={() => setSelectedEnd(nextEndDate === today ? undefined : nextEndDate)} />
            {!sample && <Button size="small" aria-label="가입자 수 다시 조회" icon={<ReloadOutlined />} loading={query.isFetching} disabled={!range} onClick={() => { void query.refetch(); }}>다시 조회</Button>}
          </Space>
        </div>
        {sample && <Text className={styles.sampleNote} type="warning">화면 확인용 예시이며 실제 가입자 수가 아닙니다.</Text>}
        {loading ? <div role="status"><Text>가입자 수를 불러오는 중입니다.</Text><Skeleton active paragraph={{ rows: 3 }} /></div>
          : !sample && query.error ? <Alert showIcon type="info"
            title="준비중입니다"
            description="가입자 통계 기능을 준비하고 있습니다. 잠시 후 다시 확인해 주세요." />
          : points && <>
            <div className={styles.metrics}>
              <Statistic title="선택한 7일의 가입자" value={total} suffix="명" />
              <Statistic title="일평균 가입자" value={Number(((total ?? 0) / 7).toFixed(1))} precision={1} suffix="명" />
              <div className={styles.peak}><Text type="secondary">가장 많이 가입한 날</Text><strong>{peak && peak.count > 0 ? `${peak.date.slice(5).replace('-', '.')} · ${peak.count.toLocaleString('ko-KR')}명` : '—'}</strong></div>
            </div>
            <SignupChart key={range?.startDate} points={points} today={today} />
            <div className={styles.note}>
              <Text type="secondary">계정 생성 기준 · 가입 진행 중·탈퇴 포함{endDate === today ? ' · 오늘 집계 중' : ''}</Text>
              {!sample && query.data && <Text type="secondary">{query.isFetching ? '갱신 중…' : `${new Date(query.data.generatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST 기준`}</Text>}
            </div>
          </>}
      </div>
    </Card>
  </section>;
}
