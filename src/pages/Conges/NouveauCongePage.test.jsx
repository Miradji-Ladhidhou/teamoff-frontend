import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NouveauCongePage from './NouveauCongePage';
import { congesService, congeTypesService, quotasService } from '../../services/api';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom'));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin', role: 'admin_entreprise' } }),
}));
jest.mock('../../hooks/useAlert', () => ({
  useAlert: () => ({ success: jest.fn(), error: jest.fn() }),
}));
jest.mock('../../hooks/useUnsavedChanges', () => ({ useUnsavedChanges: jest.fn() }));
jest.mock('../../hooks/useLeavePolicy', () => ({
  __esModule: true, default: () => ({ validateModification: async () => ({ allowed: true }) }),
}));
jest.mock('../../services/api', () => ({
  congesService: { getById: jest.fn(), update: jest.fn(), calculateDays: jest.fn() },
  congeTypesService: { getAll: jest.fn() }, quotasService: { getSoldes: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  congeTypesService.getAll.mockResolvedValue({ data: [{ id: 'type-a', libelle: 'Congés payés' }] });
  quotasService.getSoldes.mockResolvedValue({ data: { soldes: [] } });
  congesService.calculateDays.mockResolvedValue({ data: { jours: 2, politique: {} } });
  congesService.update.mockResolvedValue({ data: { id: 'leave-a' } });
});

test.each([
  [true, '', undefined],
  [true, 'Nouveau commentaire', 'Nouveau commentaire'],
  [false, '', null],
])('édition : masqué=%s, saisie=%s conserve les commentaires non lus', async (comments_hidden, comment, expected) => {
  const year = new Date().getFullYear() + 1;
  congesService.getById.mockResolvedValue({ data: {
    id: 'leave-a', utilisateur_id: 'owner', conge_type_id: 'type-a', statut: 'valide_final',
    date_debut: `${year}-09-01`, date_fin: `${year}-09-02`, comments_hidden, commentaire_employe: null,
  } });
  render(<MemoryRouter initialEntries={['/conges/leave-a/edit']}><Routes>
    <Route path="/conges/:id/edit" element={<NouveauCongePage />} />
    <Route path="/conges" element={<p>Liste</p>} />
  </Routes></MemoryRouter>);
  const submit = await screen.findByRole('button', { name: 'Enregistrer', exact: true });
  if (comments_hidden) expect(screen.getByText(/Laisser ce champ vide ne les efface pas/)).toBeInTheDocument();
  if (comment) fireEvent.change(screen.getByPlaceholderText('Ajouter un commentaire…'), { target: { value: comment } });
  fireEvent.click(submit);
  await waitFor(() => expect(congesService.update).toHaveBeenCalled());
  const payload = congesService.update.mock.calls[0][1];
  if (expected === undefined) expect(payload).not.toHaveProperty('commentaire_employe');
  else expect(payload.commentaire_employe).toBe(expected);
});
