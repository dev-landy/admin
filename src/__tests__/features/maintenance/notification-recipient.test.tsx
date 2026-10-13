import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { SendNotificationModal } from '@/features/notifications/components/SendNotificationModal';

const mockSend = jest.fn();
jest.mock('@/features/notifications/hooks', () => ({
  useSendCustomNotification: () => ({ mutate: mockSend, isPending: false }),
}));
beforeEach(() => { mockSend.mockReset(); });

test('견적 요청에서 열면 임대인 수신자가 고정되고 발송 전에 초안을 검토할 수 있다', async () => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App>
    <SendNotificationModal open onClose={jest.fn()} recipient={{ userId: 7, label: '임대인 #7' }}
      defaults={{ title: '수리 견적 안내', body: '견적 결과를 앱에서 확인해 주세요.' }} />
  </App></ConfigProvider>);
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByLabelText('제목')).toHaveValue('수리 견적 안내'));
  expect(within(dialog).getByLabelText('내용')).toHaveValue('견적 결과를 앱에서 확인해 주세요.');
  expect(within(dialog).getByText(/수신자: 임대인 #7/)).toBeInTheDocument();
  expect(within(dialog).getByLabelText('유저 ID')).toBeDisabled();
  expect(within(dialog).getByLabelText('유저 ID')).toHaveValue('7');
  expect(mockSend).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText('내용'), { target: { value: '확인 후 업체에 연락해 주세요.' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '발송' }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith({
    userId: 7, title: '수리 견적 안내', body: '확인 후 업체에 연락해 주세요.',
  }, expect.any(Object)));
});
