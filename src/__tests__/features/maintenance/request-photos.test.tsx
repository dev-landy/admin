import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { RequestPhotos } from '@/features/maintenance/components/RequestPhotos';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
const mockGet = jest.mocked(apiClient.get);
const photos = [
  { photoId: 1, contentType: 'image/jpeg', sizeBytes: 2048, createdAt: '2026-10-05T10:00:00' },
  { photoId: 2, contentType: 'image/png', sizeBytes: 1024, createdAt: '2026-10-05T10:00:00' },
];
function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <RequestPhotos requestId={10} photos={photos} />
  </App></ConfigProvider></QueryClientProvider>);
}
const expiresAt = () => new Date(Date.now() + 10 * 60_000).toISOString();
beforeEach(() => { jest.clearAllMocks(); });

test('첨부 사진을 클릭 없이 썸네일로 바로 보여준다', async () => {
  mockGet.mockImplementation(async (url: string) => ({ data: { url: `https://cdn.test/${url.split('/').at(-2)}.jpg`, expiresAt: expiresAt() } }));
  open();
  expect(await screen.findByAltText('수리 요청 첨부 사진 1')).toHaveAttribute('src', 'https://cdn.test/1.jpg');
  expect(await screen.findByAltText('수리 요청 첨부 사진 2')).toHaveAttribute('src', 'https://cdn.test/2.jpg');
  expect(mockGet).toHaveBeenCalledWith('/v1/admin/maintenance-requests/10/photos/1/view-url');
  expect(screen.getByRole('button', { name: '전체 저장' })).toBeEnabled();
});

test('URL 발급에 실패한 사진만 오류와 재시도를 보여준다', async () => {
  mockGet.mockImplementation(async (url: string) => {
    if (url.includes('/photos/2/')) throw new Error('network');
    return { data: { url: 'https://cdn.test/1.jpg', expiresAt: expiresAt() } };
  });
  open();
  expect(await screen.findByAltText('수리 요청 첨부 사진 1')).toBeInTheDocument();
  const retry = await screen.findByRole('button', { name: '사진 2 다시 불러오기' });
  mockGet.mockResolvedValue({ data: { url: 'https://cdn.test/2.jpg', expiresAt: expiresAt() } });
  fireEvent.click(retry);
  await waitFor(() => expect(screen.getByAltText('수리 요청 첨부 사진 2')).toBeInTheDocument());
});

test('사진이 없으면 빈 상태를 보여준다', () => {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><App><RequestPhotos requestId={10} photos={[]} /></App></QueryClientProvider>);
  expect(screen.getByText('첨부된 사진이 없습니다.')).toBeInTheDocument();
});
