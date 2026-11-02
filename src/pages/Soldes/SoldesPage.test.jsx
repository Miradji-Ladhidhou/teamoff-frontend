import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SoldesPage from './SoldesPage';
import { quotasService, usersService, congeTypesService, entreprisesService } from '../../services/api';

const mockAlert = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('../../hooks/useAlert', () => ({ useAlert: () => mockAlert }));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin_entreprise', entreprise_id: 'company' } }),
}));
jest.mock('../../services/api', () => ({
  quotasService: { getUserCounters: jest.fn(), getAllCounters: jest.fn(), upsertUserCounter: jest.fn() },
  usersService: { getAll: jest.fn() },
  congeTypesService: { getAll: jest.fn() },
  entreprisesService: { getPolitique: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  usersService.getAll.mockResolvedValue({ data: [{ id: 'employee', role: 'employe', prenom: 'Alice', nom: 'Test' }] });
  congeTypesService.getAll.mockResolvedValue({ data: [{ id: 'type', libelle: 'CP' }] });
  entreprisesService.getPolitique.mockResolvedValue({ data: { politique_conges: {} } });
  quotasService.getUserCounters.mockResolvedValue({ data: { items: [] } });
});

async function save() {
  render(<MemoryRouter initialEntries={['/?userId=employee']}><SoldesPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Ajouter le premier solde/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(quotasService.upsertUserCounter).toHaveBeenCalledTimes(1));
}

test('activation failure shows saved-counter error, never activation success', async () => {
  const message = 'Solde enregistré, mais le traitement des réservations a échoué.';
  quotasService.upsertUserCounter.mockResolvedValue({
    data: { activation: { status: 'failed', message }, reservations_activees: null, reservations_en_attente: null },
  });
  await save();
  await waitFor(() => expect(mockAlert.error).toHaveBeenCalledWith(message));
  expect(mockAlert.success).not.toHaveBeenCalled();
  expect(quotasService.upsertUserCounter).toHaveBeenCalledWith('employee', expect.objectContaining({ conge_type_id: 'type' }));
});

test('nominal save retains its success message', async () => {
  quotasService.upsertUserCounter.mockResolvedValue({
    data: { activation: { status: 'completed' }, reservations_activees: [], reservations_en_attente: [] },
  });
  await save();
  await waitFor(() => expect(mockAlert.success).toHaveBeenCalledWith('Solde enregistré.'));
  expect(mockAlert.error).not.toHaveBeenCalled();
});

test.each([false, true])('post-commit counter warning stays distinct from activation outcome (failed=%s)', async failed => {
  const message = 'Solde enregistré, mais un traitement après validation a échoué.';
  const activationMessage = 'Solde enregistré, mais le traitement des réservations a échoué.';
  quotasService.upsertUserCounter.mockResolvedValue({ data: {
    warnings: [{ code: 'COUNTER_POST_COMMIT_FAILED', message }],
    activation: failed ? { status: 'failed', message: activationMessage } : { status: 'completed' },
    reservations_activees: failed ? null : [], reservations_en_attente: failed ? null : [],
  } });
  await save();
  await waitFor(() => expect(mockAlert.info).toHaveBeenCalledWith(message));
  if (failed) {
    expect(mockAlert.error).toHaveBeenCalledWith(activationMessage);
    expect(mockAlert.success).not.toHaveBeenCalled();
  } else {
    expect(mockAlert.success).toHaveBeenCalledWith('Solde enregistré.');
    expect(mockAlert.error).not.toHaveBeenCalled();
  }
  expect(quotasService.upsertUserCounter).toHaveBeenCalledTimes(1);
});

test('unconfirmed persistence error shows no saved result or postcommit warning', async () => {
  quotasService.upsertUserCounter.mockRejectedValue({ response: { data: { message: 'COMMIT non confirmé' } } });
  await save();
  await waitFor(() => expect(mockAlert.error).toHaveBeenCalledWith('COMMIT non confirmé'));
  expect(mockAlert.success).not.toHaveBeenCalled();
  expect(mockAlert.info).not.toHaveBeenCalled();
});

test('audit failure warning remains visible beside a recorded balance and failed activation', async () => {
  const message = 'Solde enregistré, mais son journal d’audit n’a pas pu être enregistré.';
  const activationMessage = 'Solde enregistré, mais le traitement des réservations a échoué.';
  quotasService.upsertUserCounter.mockResolvedValue({ data: {
    warnings: [{ code: 'COUNTER_AUDIT_FAILED', message }],
    activation: { status: 'failed', message: activationMessage },
    reservations_activees: null, reservations_en_attente: null,
  } });
  await save();
  await waitFor(() => expect(mockAlert.info).toHaveBeenCalledWith(message));
  expect(mockAlert.error).toHaveBeenCalledWith(activationMessage);
  expect(mockAlert.success).not.toHaveBeenCalled();
  expect(quotasService.upsertUserCounter).toHaveBeenCalledTimes(1);
});

test('refresh failure is not presented as a persistence failure', async () => {
  quotasService.getUserCounters.mockResolvedValueOnce({ data: { items: [] } })
    .mockRejectedValueOnce(new Error('refresh failed'));
  quotasService.upsertUserCounter.mockResolvedValue({ data: { reservations_activees: [], reservations_en_attente: [] } });
  await save();
  await waitFor(() => expect(mockAlert.error).toHaveBeenCalledWith('Solde enregistré, mais le rafraîchissement des soldes a échoué.'));
  expect(mockAlert.success).toHaveBeenCalledWith('Solde enregistré.');
});
