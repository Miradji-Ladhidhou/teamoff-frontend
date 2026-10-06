import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useAuth } from '../../contexts/AuthContext';
import { congesService } from '../../services/api';
import CongeActionRequestsPage from './CongeActionRequestsPage';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api', () => ({
  congesService: { getActionRequests: jest.fn() },
}));
jest.mock('../../hooks/useAlert', () => ({
  useAlert: () => ({ error: jest.fn(), success: jest.fn() }),
}));
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('CongeActionRequestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['manager', true, 'pending', true],
    ['manager', false, 'pending', false],
    ['manager', undefined, 'pending', false],
    ['manager', 'true', 'pending', false],
    ['admin', false, 'pending', true],
    ['super_admin', false, 'pending', true],
    ['manager', true, 'approved', false],
    ['admin', true, 'rejected', false],
  ])(
    'renders desktop and mobile actions for role=%s, permission=%s, status=%s',
    async (role, managerCanValidate, statut, canAct) => {
      useAuth.mockReturnValue({ user: { role } });
      congesService.getActionRequests.mockResolvedValue({
        data: {
          requests: [{
            id: 1,
            type: 'cancel',
            statut,
            manager_can_validate: managerCanValidate,
            utilisateur: { prenom: 'Alice', nom: 'Martin' },
          }],
          total: 1,
          totalPages: 1,
        },
      });

      const { container } = render(<CongeActionRequestsPage />);
      expect(await screen.findAllByText('Alice Martin')).toHaveLength(2);

      const desktop = within(container.querySelector('.d-none.d-md-block'));
      const mobile = within(container.querySelector('.d-md-none'));

      expect(desktop.queryAllByTitle('Approuver')).toHaveLength(canAct ? 1 : 0);
      expect(desktop.queryAllByTitle('Refuser')).toHaveLength(canAct ? 1 : 0);
      expect(mobile.queryAllByRole('button', { name: 'Approuver' })).toHaveLength(canAct ? 1 : 0);
      expect(mobile.queryAllByRole('button', { name: 'Refuser' })).toHaveLength(canAct ? 1 : 0);

      if (canAct) {
        fireEvent.click(mobile.getByRole('button', { name: 'Approuver' }));
        expect(await screen.findByText('Approuver la demande')).toBeTruthy();
      }
    },
  );
});
