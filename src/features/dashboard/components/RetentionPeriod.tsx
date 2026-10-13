"use client";
import { useState } from "react";
import { Alert, Button, Input, Space, Typography } from "antd";
import { resolveRetentionRange, type RetentionRange } from "../retention-range";
export function RetentionPeriod({ range, onChange }: { range?: RetentionRange; onChange: (range?: RetentionRange) => void }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const initial = range ?? resolveRetentionRange(undefined, today);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState('');
  function apply(value?: RetentionRange) {
    try {
      const resolved = resolveRetentionRange(value, today);
      setError(''); setStart(value?.start ?? resolved.start); setEnd(value?.end ?? resolved.end); onChange(value);
    } catch (error) { setError(error instanceof Error ? error.message : '기간을 확인하세요.'); }
  }
  function lastMonth() {
    const first = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    first.setUTCDate(0);
    apply({ start: `${first.toISOString().slice(0, 7)}-01`, end: first.toISOString().slice(0, 10) });
  }
  return <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
    <Space wrap>
      <Button onClick={() => apply()}>최근 4주</Button><Button onClick={lastMonth}>지난달</Button>
      <label>시작일 <Input aria-label="리텐션 시작일" type="date" value={start} max={today} onChange={event => setStart(event.target.value)} style={{ width: 155 }} /></label>
      <label>종료일 <Input aria-label="리텐션 종료일" type="date" value={end} max={today} onChange={event => setEnd(event.target.value)} style={{ width: 155 }} /></label>
      <Button type="primary" onClick={() => apply({ start, end })}>기간 적용</Button>
    </Space>
    <Typography.Text type="secondary">선택 날짜가 속한 주 전체를 포함합니다. 해당 집단의 이후 3주 활동도 추적합니다. MAU·광고 기간은 변경되지 않습니다.</Typography.Text>
    {error && <Alert type="error" title={error} showIcon />}
  </Space>;
}
