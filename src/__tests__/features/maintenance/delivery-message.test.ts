import { buildDeliveryMessage } from '@/features/maintenance/deliveryMessage';

const content = { title: ' 욕실 수리 요청 ', category: 'PLUMBING' as const, description: '세면대 아래 누수', areaName: '강남구', preferredTiming: 'NEXT_WEEK' as const };

test('업체에 붙여넣을 견적 요청 문안을 라벨과 사진 안내로 구성한다', () => {
  const text = buildDeliveryMessage(content, 3);
  expect(text.split('\n')[0]).toBe('[수리 견적 요청]');
  expect(text).toContain('▪ 요청: 욕실 수리 요청\n▪ 분야: 배관·누수\n▪ 지역: 강남구\n▪ 희망 시기: 다음 주');
  expect(text).toContain('▪ 상세 내용\n세면대 아래 누수');
  expect(text).toContain('현장 사진 3장을 함께 보내드립니다.');
  expect(text).toContain('방문 가능일을 회신 부탁드립니다.');
});

test('사진과 설명이 없으면 해당 단락을 생략한다', () => {
  const text = buildDeliveryMessage({ ...content, description: '  ' }, 0);
  expect(text).not.toContain('상세 내용');
  expect(text).not.toContain('현장 사진');
});
