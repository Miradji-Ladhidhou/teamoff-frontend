import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationSystem from '../NotificationSystem';
import useSocket from '../../hooks/useSocket';
import { alertService } from '../../services/alertService';

// Mock du hook useSocket
jest.mock('../../hooks/useSocket');

// Mock du alertService
jest.mock('../../services/alertService', () => ({
  alertService: {
    addToast: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }
}));

describe('NotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders null (displays via ToastContainer)', () => {
    useSocket.mockReturnValue({
      notifications: [],
      removeNotification: jest.fn()
    });

    const { container } = render(<NotificationSystem />);

    // NotificationSystem returns null - everything is handled by ToastContainer
    expect(container.firstChild).toBeNull();
  });

  test('shows notifications via alertService when received', async () => {
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
      expect(alertService.addToast).toHaveBeenCalledWith(
        'Votre demande de congé a été approuvée',
        'success',
        4000
      );
    });

    expect(mockRemoveNotification).toHaveBeenCalledWith(1);
  });

  test('maps conge-rejected to error type', async () => {
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
      expect(alertService.addToast).toHaveBeenCalledWith(
        'Votre demande de congé a été rejetée',
        'error',
        4000
      );
    });

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
      expect(alertService.addToast).toHaveBeenCalledTimes(2);
    });

    expect(alertService.addToast).toHaveBeenCalledWith(
      'Nouvelle demande de congé',
      'info',
      4000
    );

    expect(alertService.addToast).toHaveBeenCalledWith(
      'Demande rejetée',
      'error',
      4000
    );
  });
});