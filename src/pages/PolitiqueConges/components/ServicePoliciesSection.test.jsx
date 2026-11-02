import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ServicePoliciesSection from './ServicePoliciesSection';
import { normalizeManagerCrossServicePolicy } from '../../../utils/managerCrossServicePolicy';

function renderSettings(policy = {}) {
  const setServiceField = jest.fn();
  const entries = [['RH', policy]];
  render(<ServicePoliciesSection
    newServiceName=""
    setNewServiceName={jest.fn()}
    addServicePolicy={jest.fn()}
    removeServicePolicy={jest.fn()}
    setServiceField={setServiceField}
    serviceSearch=""
    setServiceSearch={jest.fn()}
    visibleServicesCount={8}
    setVisibleServicesCount={jest.fn()}
    serviceEntries={entries}
    filteredServiceEntries={entries}
    visibleServiceEntries={entries}
  />);
  return setServiceField;
}

test.each([undefined, false, true, 'true'])('les anciens droits absences sont repris sans activer un nouveau canal (%s)', (value) => {
  renderSettings({ manager_can_view_all_absences: value });
  for (const category of ['absence_exceptionnelle', 'maladie']) {
    expect(normalizeManagerCrossServicePolicy({ manager_can_view_all_absences: value })[category])
      .toEqual({ view: value === true, email: value === true, in_app: false, participation: 'information' });
  }
  expect(screen.queryByText('Managers — accès aux autres services')).not.toBeInTheDocument();
});

test('la page Services ne propose plus de réglages de notification ou d’accès interservices', () => {
  renderSettings();
  expect(screen.queryByRole('link', { name: /Configurer les emails et alertes/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Arrêts maladie — Consultation — RH')).not.toBeInTheDocument();
  expect(screen.queryByText(/Leur propre service conserve/)).not.toBeInTheDocument();
});

test('modifier le circuit du service ne touche pas aux anciens droits ou canaux', () => {
  const setField = renderSettings({ manager_cross_service: { conges: { view: true, email: true, in_app: false, participation: 'action' } } });
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'admin_only' } });
  expect(setField).toHaveBeenCalledWith('RH', 'approval_workflow', 'admin_only');
  expect(setField).toHaveBeenCalledTimes(1);
});

test('les anciennes valeurs explicites restent compatibles malgré le retrait du panneau', () => {
  const policy = { manager_cross_service: {
    conges: { view: true, email: true, in_app: false, participation: 'action' },
  } };
  const setField = renderSettings(policy);
  expect(normalizeManagerCrossServicePolicy(policy).conges).toEqual(policy.manager_cross_service.conges);
  expect(setField).not.toHaveBeenCalled();
});

test('les droits congés existants conservent leurs canaux et leur participation', () => {
  renderSettings({ manager_can_validate_all_services: true });
  expect(normalizeManagerCrossServicePolicy({ manager_can_validate_all_services: true }).conges)
    .toEqual({ view: true, email: true, in_app: true, participation: 'action' });
  expect(screen.queryByLabelText('Congés — Participation — RH')).not.toBeInTheDocument();
});
