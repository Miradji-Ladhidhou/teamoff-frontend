import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import NotificationSystem from '../components/NotificationSystem';
import useSocket from '../hooks/useSocket';

// Mock du hook useSocket
jest.mock('../hooks/useSocket');
jest.mock('react-toastify', () => ({
  toast: jest.fn(),
  ToastContainer: () => <div data-testid="toast-container" />
}));

describe('NotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders ToastContainer', () => {
    useSocket.mockReturnValue({
      notifications: [],
      removeNotification: jest.fn()
    });

    render(<NotificationSystem />);

    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  test('shows notifications when received', async () => {
    const mockRemoveNotification = jest.fn();
    const mockNotifications = [
      {
        id: 1,
        type: 'conge-validated',
        message: 'Votre demande de congé a été approuvée',
        data: {},
        timestamp: new Date()
      }
    ];

    useSocket.mockReturnValue({
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification
    });

    render(<NotificationSystem />);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        'Votre demande de congé a été approuvée',
        expect.objectContaining({
          type: 'success',
          onClose: expect.any(Function)
        })
      );
    });
  });

  test('calls removeNotification when toast is closed', async () => {
    const mockRemoveNotification = jest.fn();
    const mockNotifications = [
      {
        id: 123,
        type: 'conge-rejected',
        message: 'Votre demande de congé a été rejetée',
        data: {},
        timestamp: new Date()
      }
    ];

    useSocket.mockReturnValue({
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification
    });

    render(<NotificationSystem />);

    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });

    // Simuler la fermeture du toast
    const toastCall = toast.mock.calls[0];
    const toastConfig = toastCall[1];
    toastConfig.onClose();

    expect(mockRemoveNotification).toHaveBeenCalledWith(123);
  });

  test('handles different notification types', async () => {
    const mockRemoveNotification = jest.fn();
    const mockNotifications = [
      {
        id: 1,
        type: 'conge-created',
        message: 'Nouvelle demande de congé',
        data: {},
        timestamp: new Date()
      },
      {
        id: 2,
        type: 'conge-rejected',
        message: 'Demande rejetée',
        data: {},
        timestamp: new Date()
      }
    ];

    useSocket.mockReturnValue({
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification
    });

    render(<NotificationSystem />);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledTimes(2);
    });

    expect(toast).toHaveBeenCalledWith(
      'Nouvelle demande de congé',
      expect.objectContaining({ type: 'info' })
    );

    expect(toast).toHaveBeenCalledWith(
      'Demande rejetée',
      expect.objectContaining({ type: 'error' })
    );
  });
});