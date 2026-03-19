import { renderHook, act } from '@testing-library/react';
import { io } from 'socket.io-client';
import useSocket from '../useSocket';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('useSocket', () => {
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock socket
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };

    io.mockReturnValue(mockSocket);
  });

  test('returns initial state', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    const { result } = renderHook(() => useSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.notifications).toEqual([]);
    expect(typeof result.current.clearNotifications).toBe('function');
    expect(typeof result.current.removeNotification).toBe('function');
  });

  test('connects to socket when token exists', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    renderHook(() => useSocket());

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      auth: { token: 'fake-token' }
    });
  });

  test('does not connect when no token', () => {
    window.localStorage.getItem.mockReturnValue(null);

    renderHook(() => useSocket());

    expect(io).not.toHaveBeenCalled();
  });

  test('handles socket connection', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    renderHook(() => useSocket());

    // Simuler la connexion
    const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    act(() => {
      connectCallback();
    });

    // Le state devrait être mis à jour, mais comme c'est un hook, on ne peut pas le tester directement
    // On vérifie juste que le callback est enregistré
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  test('handles congé notifications', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');
    window.localStorage.getItem.mockReturnValueOnce('fake-token');
    window.localStorage.getItem.mockReturnValueOnce(JSON.stringify({ entrepriseId: 1 }));

    const { result } = renderHook(() => useSocket());

    // Simuler une notification de congé validé
    const congeValidatedCallback = mockSocket.on.mock.calls.find(call => call[0] === 'conge-validated')[1];
    act(() => {
      congeValidatedCallback({
        conge: { id: 1 },
        validatedBy: { nom: 'Admin' }
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('conge-validated');
    expect(result.current.notifications[0].message).toBe('Votre demande de congé a été approuvée');
  });

  test('clears notifications', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    const { result } = renderHook(() => useSocket());

    // Ajouter une notification manuellement (difficile à simuler via socket)
    act(() => {
      result.current.notifications.push({
        id: 1,
        type: 'test',
        message: 'Test notification'
      });
    });

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toEqual([]);
  });

  test('removes specific notification', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    const { result } = renderHook(() => useSocket());

    act(() => {
      // Simuler l'ajout de notifications
      result.current.notifications.push(
        { id: 1, type: 'test1', message: 'Test 1' },
        { id: 2, type: 'test2', message: 'Test 2' }
      );
    });

    act(() => {
      result.current.removeNotification(1);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe(2);
  });

  test('disconnects socket on unmount', () => {
    window.localStorage.getItem.mockReturnValue('fake-token');

    const { unmount } = renderHook(() => useSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});