import '@/test-utils/antd';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { SendNotificationModal } from '@/features/notifications/components/SendNotificationModal';

const mockSend = jest.fn();
jest.mock('@/features/notifications/hooks', () => ({
  useSendCustomNotification: () => ({ mutate: mockSend, isPending: false }),
}));
beforeEach(() => { mockSend.mockReset(); });

test('견적 요청에서 수신자와 수리 요청을 고정하고 검토한 내용으로 발송한다', async () => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App>
    <SendNotificationModal open onClose={jest.fn()} recipient={{ userId: 7, label: '임대인 #7' }} maintenanceRequestId={42}
      defaults={{ title: '수리 견적 안내', body: '견적 결과를 앱에서 확인해 주세요.' }} />
  </App></ConfigProvider>);
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(within(dialog).getByLabelText('제목')).toHaveValue('수리 견적 안내'));
  expect(within(dialog).getByLabelText('내용')).toHaveValue('견적 결과를 앱에서 확인해 주세요.');
  expect(within(dialog).getByText(/수신자: 임대인 #7/)).toBeInTheDocument();
  expect(within(dialog).queryByLabelText('유저 ID')).not.toBeVisible();
  expect(mockSend).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText('내용'), { target: { value: '확인 후 업체에 연락해 주세요.' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '발송' }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith({
    userId: 7, title: '수리 견적 안내', body: '확인 후 업체에 연락해 주세요.', maintenanceRequestId: 42,
  }, expect.any(Object)));
});
