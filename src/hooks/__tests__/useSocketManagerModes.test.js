import { renderHook, act } from '@testing-library/react';
import { io } from 'socket.io-client';
import useSocket from '../useSocket';

jest.mock('socket.io-client');

let socket;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: jest.fn(key => key === 'token' ? 'test-token' : JSON.stringify({ role: 'manager', entreprise_id: 'company' })),
  } });
  socket = { on: jest.fn(), off: jest.fn(), emit: jest.fn(), disconnect: jest.fn(), connect: jest.fn(), connected: true };
  io.mockReturnValue(socket);
});

afterEach(() => jest.useRealTimers());

test.each([
  ['information', 'Pour information : '],
  ['action', 'Action requise : '],
  [undefined, ''],
])('la création affiche le mode %s et le collaborateur concerné', (mode, prefix) => {
  const { result } = renderHook(() => useSocket());
  const handler = socket.on.mock.calls.find(([event]) => event === 'conge-created')[1];
  act(() => handler({
    notification_mode: mode, conge: { utilisateur: { prenom: 'Alice', nom: 'IT' } },
    user: { prenom: 'Admin', nom: 'Autre' },
  }));
  expect(result.current.notifications[0].message).toBe(`${prefix}Nouvelle demande de congé de Alice IT`);
});

test('la suppression informative ne propose pas de nouvelle action', () => {
  const { result } = renderHook(() => useSocket());
  const handler = socket.on.mock.calls.find(([event]) => event === 'conge-deleted')[1];
  act(() => handler({ notification_mode: 'information' }));
  expect(result.current.notifications[0].message).toBe('Pour information : Une demande de congé a été supprimée');
});

test.each([
  ['information', 'Pour information : '],
  ['action', 'Action requise : '],
])('le changement de statut affiche le mode %s transmis pour l’admin', (mode, prefix) => {
  const { result } = renderHook(() => useSocket());
  const handler = socket.on.mock.calls.find(([event]) => event === 'conge-status-changed')[1];
  act(() => handler({ notification_mode: mode, action: 'validated' }));
  expect(result.current.notifications[0].message).toBe(`${prefix}Une demande de congé a été approuvée`);
});
