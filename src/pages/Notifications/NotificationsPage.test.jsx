import React from 'react';
import { fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationsPage';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsService } from '../../services/api';

const mockNavigate = jest.fn();
const mockError = jest.fn();
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useNavigate: () => mockNavigate }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../hooks/useAlert', () => ({ useAlert: () => ({ error: mockError }) }));
jest.mock('../../services/api', () => ({
  notificationsService: { getAll: jest.fn(), markAsRead: jest.fn(), markAllAsRead: jest.fn() },
}));
jest.mock('./NotificationSettings', () => {
  const React = require('react');
  return function Settings() {
    const [value, setValue] = React.useState('');
    return <input aria-label="Choix non enregistré" value={value} onChange={e => setValue(e.target.value)} />;
  };
});

const items = [
  { id: 'leave-a', title: 'Demande à valider', message: 'Nouvelle demande de congé', url: '/conges/leave-a', lu: false },
  { id: 'system-a', title: 'Information système', message: 'Compte mis à jour', lu: true },
];

const render = (component, entry = '/notifications') => renderComponent(
  <MemoryRouter initialEntries={[entry]}>{component}</MemoryRouter>,
);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'admin_entreprise', entreprise_id: 'company-a' } });
  notificationsService.getAll.mockImplementation(async params => ({
    data: params.non_lu
      ? { items: [], pagination: { total: 1 } }
      : { items, pagination: { total: 21, totalPages: 3 } },
  }));
  notificationsService.markAsRead.mockResolvedValue({});
  notificationsService.markAllAsRead.mockResolvedValue({});
});

test('ouvre la boîte de réception et conserve les réglages saisis entre les sections et les rechargements', async () => {
  render(<NotificationsPage />);
  await screen.findByText('Demande à valider');
  expect(screen.getByRole('button', { name: 'Mes notifications' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('textbox', { name: 'Choix non enregistré' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Action et notifications' }));
  expect(screen.queryByText('Demande à valider')).not.toBeVisible();
  fireEvent.change(screen.getByRole('textbox', { name: 'Choix non enregistré' }), { target: { value: 'Brouillon' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mes notifications' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tout marquer comme lu' }));
  await waitFor(() => expect(notificationsService.markAllAsRead).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Action et notifications' }));
  expect(screen.getByRole('textbox', { name: 'Choix non enregistré' })).toHaveValue('Brouillon');
});

test.each(['employe', 'apprenti', 'manager'])('%s ne voit pas les réglages administratifs', async role => {
  useAuth.mockReturnValue({ user: { role } });
  render(<NotificationsPage />);
  await screen.findByText('Demande à valider');
  expect(screen.queryByRole('button', { name: 'Action et notifications' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Choix non enregistré')).not.toBeInTheDocument();
});

test('conserve les filtres, la pagination et le marquage individuel', async () => {
  render(<NotificationsPage />);
  await screen.findByText('Demande à valider');
  fireEvent.click(screen.getByRole('button', { name: 'Non lues' }));
  expect(screen.queryByText('Information système')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Toutes' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Notifications par page' }), { target: { value: '20' } });
  await waitFor(() => expect(notificationsService.getAll).toHaveBeenCalledWith({ page: 1, limit: 20 }));
  await screen.findByText('Demande à valider');
  fireEvent.click(screen.getByRole('button', { name: 'Suiv. ›' }));
  await waitFor(() => expect(notificationsService.getAll).toHaveBeenCalledWith({ page: 2, limit: 20 }));
  fireEvent.click(await screen.findByRole('button', { name: 'Marquer comme lu : Demande à valider' }));
  await waitFor(() => expect(notificationsService.markAsRead).toHaveBeenCalledWith('leave-a'));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test.each([
  ['admin_entreprise', '/conges/leave-a'],
  ['super_admin', '/superadmin/leaves/leave-a'],
])('%s conserve la navigation au clavier vers le bon parcours', async (role, target) => {
  useAuth.mockReturnValue({ user: { role } });
  render(<NotificationsPage />);
  const item = await screen.findByRole('button', { name: /^Demande à valider/ });
  fireEvent.keyDown(item, { key: 'Enter' });
  expect(mockNavigate).toHaveBeenCalledWith(target);
  expect(notificationsService.markAsRead).toHaveBeenCalledWith('leave-a');
});

test('la touche Entrée sur le bouton de lecture ne déclenche pas la navigation de la carte', async () => {
  render(<NotificationsPage />);
  const read = await screen.findByRole('button', { name: 'Marquer comme lu : Demande à valider' });
  fireEvent.keyDown(read, { key: 'Enter' });
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.click(read);
  await waitFor(() => expect(notificationsService.markAsRead).toHaveBeenCalledWith('leave-a'));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('le lien de configuration ouvre directement les réglages', async () => {
  render(<NotificationsPage />, '/notifications?section=settings');
  expect(screen.getByRole('button', { name: 'Action et notifications' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('textbox', { name: 'Choix non enregistré' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Mes notifications' }));
  expect(await screen.findByText('Demande à valider')).toBeVisible();
});

test('le lien direct ne donne pas accès aux réglages à un salarié', async () => {
  useAuth.mockReturnValue({ user: { role: 'employe' } });
  render(<NotificationsPage />, '/notifications?section=settings');
  expect(await screen.findByText('Demande à valider')).toBeVisible();
  expect(screen.queryByLabelText('Choix non enregistré')).not.toBeInTheDocument();
});
