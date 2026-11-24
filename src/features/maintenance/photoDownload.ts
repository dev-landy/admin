const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' };

export function photoFileName(requestId: number, index: number, contentType: string): string {
  return `수리요청${requestId}-사진${index + 1}.${EXTENSIONS[contentType] ?? 'jpg'}`;
}

/**
 * 서명 URL은 교차 출처라 `<a download>`가 무시되므로 blob으로 받아 저장한다.
 * 저장소 CORS로 막히면 새 탭에서 원본을 열어 직접 저장하게 한다.
 * @returns 파일로 저장했으면 true, 새 탭으로 대체했으면 false
 */
export async function downloadPhoto(url: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(url, { referrerPolicy: 'no-referrer', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement('a'), { href: objectUrl, download: fileName });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }
}
