import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PolitiqueCongesPage from './PolitiqueCongesPage';
import { entreprisesService, usersService, congeTypesService } from '../../services/api';
import leavePoliciesAPI from '../../services/leavePoliciesAPI';

const mockAlert = { error: jest.fn(), showSuccessModal: jest.fn() };
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin_entreprise', entreprise_id: 'company' } }) }));
jest.mock('../../hooks/useAlert', () => ({ useAlert: () => mockAlert, useConfirmation: () => ({ confirm: jest.fn() }) }));
jest.mock('../../services/api', () => ({
  entreprisesService: { getPolitique: jest.fn(), getParametres: jest.fn(), recalculConges: jest.fn(),
    updatePolitique: jest.fn(), updateParametres: jest.fn() },
  usersService: { getAll: jest.fn() }, congeTypesService: { getAll: jest.fn() },
}));
jest.mock('../../services/leavePoliciesAPI', () => ({ __esModule: true, default: { getPolicy: jest.fn(), updatePolicy: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  entreprisesService.getPolitique.mockResolvedValue({ data: { politique_conges: {} } });
  entreprisesService.getParametres.mockResolvedValue({ data: { parametres: {} } });
  usersService.getAll.mockResolvedValue({ data: [] });
  congeTypesService.getAll.mockResolvedValue({ data: [] });
  leavePoliciesAPI.getPolicy.mockResolvedValue({});
  entreprisesService.recalculConges.mockResolvedValue({ data: { nb_modifies: 2 } });
  entreprisesService.updatePolitique.mockResolvedValue({});
  entreprisesService.updateParametres.mockResolvedValue({});
  leavePoliciesAPI.updatePolicy.mockResolvedValue({});
});

test('le recalcul est accessible uniquement dans son onglet et utilise les actions manuelles existantes', async () => {
  render(<PolitiqueCongesPage />);
  await screen.findByRole('tab', { name: /Recalcul des soldes manuel/ });
  expect(screen.queryByRole('tab', { name: /Notifications email/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Appliquer le recalcul des soldes' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /Recalcul des soldes manuel/ }));
  expect(screen.queryByRole('button', { name: 'Enregistrer les modifications' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Simuler le recalcul des soldes' }));
  await waitFor(() => expect(entreprisesService.recalculConges).toHaveBeenCalledWith('company', true));
  expect(await screen.findByText('Simulation')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Appliquer le recalcul des soldes' }));
  await waitFor(() => expect(entreprisesService.recalculConges).toHaveBeenCalledWith('company', false));
  expect(await screen.findByText('Recalcul appliqué')).toBeInTheDocument();
  expect(entreprisesService.recalculConges).toHaveBeenCalledTimes(2);
});

test('une erreur de recalcul manuel reste notifiée et les boutons redeviennent disponibles', async () => {
  entreprisesService.recalculConges.mockRejectedValue({ response: { data: { message: 'Recalcul indisponible' } } });
  render(<PolitiqueCongesPage />);
  fireEvent.click(await screen.findByRole('tab', { name: /Recalcul des soldes manuel/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Simuler le recalcul des soldes' }));
  await waitFor(() => expect(mockAlert.error).toHaveBeenCalledWith('Recalcul indisponible'));
  expect(screen.getByRole('button', { name: 'Simuler le recalcul des soldes' })).toBeEnabled();
});

test('sauvegarder les règles ne remplace ni les anciennes coupures de notifications ni le routage nominatif', async () => {
  const routing = { RH: { conges: { manager: { mode: 'information', email: false, in_app: true } } } };
  entreprisesService.getPolitique.mockResolvedValue({ data: { politique_conges: {
    notification_settings: { on_create: false, on_validate: true, on_reject: false },
    notification_routing: routing,
  } } });
  render(<PolitiqueCongesPage />);
  fireEvent.click(await screen.findByRole('tab', { name: /Fuseau horaire/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));
  await waitFor(() => expect(entreprisesService.updateParametres).toHaveBeenCalled());
  expect(entreprisesService.updatePolitique).toHaveBeenCalledTimes(1);
  const [company, payload] = entreprisesService.updatePolitique.mock.calls[0];
  expect(company).toBe('company');
  expect(payload).not.toHaveProperty('notification_settings');
  expect(payload.notification_routing).toEqual(routing);
});
