import type { AdminDetail } from './types';
import { categoryLabels, timingLabels } from './presentation';

/** 업체에 문자·메신저로 그대로 붙여넣을 수 있는 견적 요청 문안. */
export function buildDeliveryMessage(content: AdminDetail['deliveryContent'], photoCount: number): string {
  const description = content.description.trim();
  return [
    '[수리 견적 요청]',
    '안녕하세요. 아래 수리 건의 견적을 요청드립니다.',
    '',
    `▪ 요청: ${content.title.trim()}`,
    `▪ 분야: ${categoryLabels[content.category]}`,
    `▪ 지역: ${content.areaName.trim()}`,
    `▪ 희망 시기: ${timingLabels[content.preferredTiming]}`,
    ...(description ? ['', '▪ 상세 내용', description] : []),
    ...(photoCount > 0 ? ['', `▪ 현장 사진 ${photoCount}장을 함께 보내드립니다.`] : []),
    '',
    '작업 가능 여부와 예상 비용(작업비·출장비·자재비), 방문 가능일을 회신 부탁드립니다.',
    '감사합니다.',
  ].join('\n');
}
