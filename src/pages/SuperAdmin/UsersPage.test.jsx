import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from './UsersPage';
import { usersService, entreprisesService } from '../../services/api';

const mockAlert = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock('../../hooks/useAlert', () => ({
  useAlert: () => mockAlert,
  useConfirmation: () => ({ confirm: jest.fn() }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
}));
jest.mock('../../services/api', () => ({
  usersService: { getAll: jest.fn(), importCSV: jest.fn() },
  entreprisesService: { getAll: jest.fn(), getServices: jest.fn() },
}));

test('persisted import warning is visible alongside the successful import result', async () => {
  usersService.getAll.mockResolvedValue({ data: [] });
  entreprisesService.getAll.mockResolvedValue({ data: [{ id: 'company', nom: 'Entreprise test' }] });
  entreprisesService.getServices.mockResolvedValue({ data: { items: [] } });
  const warning = 'Import enregistré avec une erreur après validation ; les invitations sont lancées.';
  usersService.importCSV.mockResolvedValue({
    data: { message: '1 employé créé', created: [], skipped: [], balancesSet: [],
      warnings: [{ code: 'IMPORT_POST_COMMIT_FAILED', message: warning }] },
  });
  render(<MemoryRouter><UsersPage /></MemoryRouter>);
  await waitFor(() => expect(entreprisesService.getServices).toHaveBeenCalledWith('company'));
  fireEvent.click(screen.getByRole('button', { name: /Import CSV/ }));
  const modal = await screen.findByRole('dialog');
  fireEvent.change(modal.querySelector('select'), { target: { value: 'company' } });
  const file = new File(['nom,prenom,email\nNom,Prenom,user@example.invalid'], 'employees.csv', { type: 'text/csv' });
  fireEvent.change(modal.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.click(within(modal).getByRole('button', { name: 'Importer', exact: true }));
  expect(await screen.findByText(warning)).toBeInTheDocument();
  expect(screen.getByText('1 employé créé')).toBeInTheDocument();
  expect(usersService.importCSV).toHaveBeenCalledWith(file, 'company');
  expect(mockAlert.error).not.toHaveBeenCalled();
});
