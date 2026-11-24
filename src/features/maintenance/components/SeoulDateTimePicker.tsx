'use client';
import dayjs from 'dayjs';
import { Button, DatePicker, Space } from 'antd';
import { seoulNow } from '../time';

const DISPLAY_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const VALUE_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

type Props = { id?: string; value?: string | null; onChange?: (value: string | null) => void };

/**
 * 서울 벽시계 문자열(YYYY-MM-DDTHH:mm:ss[.ffffff])을 그대로 주고받는 날짜·시각 선택기.
 * 브라우저 시간대와 무관하게 문자열을 naive wall-clock으로 다루며,
 * 사용자가 바꾸지 않은 값은 서버의 정밀 시각(마이크로초)을 그대로 유지한다.
 * 허용 범위는 저장 시 검증 메시지로 안내한다.
 */
export function SeoulDateTimePicker({ id, value, onChange }: Props) {
  return <Space.Compact block>
    <DatePicker id={id} showTime format={DISPLAY_FORMAT} showNow={false} allowClear={false} style={{ width: '100%' }}
      value={value ? dayjs(value) : null} onChange={date => onChange?.(date ? date.format(VALUE_FORMAT) : null)} />
    <Button onClick={() => onChange?.(seoulNow().slice(0, 19))}>지금</Button>
  </Space.Compact>;
}
