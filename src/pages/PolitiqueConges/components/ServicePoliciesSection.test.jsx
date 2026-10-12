import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ServicePoliciesSection from './ServicePoliciesSection';

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
  for (const category of ['Absences exceptionnelles', 'Arrêts maladie']) {
    expect(screen.getByLabelText(`${category} — Consultation — RH`).checked).toBe(value === true);
    expect(screen.getByLabelText(`${category} — Emails — RH`).checked).toBe(value === true);
    expect(screen.getByLabelText(`${category} — Alertes application — RH`).checked).toBe(false);
    expect(screen.getByLabelText(`${category} — Participation — RH`).value).toBe('information');
  }
});

test('le canal email est indépendant des autres canaux, catégories et droits', () => {
  const setField = renderSettings();
  fireEvent.click(screen.getByLabelText('Arrêts maladie — Emails — RH'));
  const config = setField.mock.calls[0][2];
  expect(setField).toHaveBeenCalledWith('RH', 'manager_cross_service', expect.any(Object));
  expect(config.maladie).toEqual({ view: false, email: true, in_app: false, participation: 'information' });
  expect(config.conges.email).toBe(false);
  expect(config.absence_exceptionnelle.email).toBe(false);
});

test('peut agir implique la consultation, mais n’active aucun canal', () => {
  const setField = renderSettings();
  fireEvent.change(screen.getByLabelText('Congés — Participation — RH'), { target: { value: 'action' } });
  expect(setField.mock.calls[0][2].conges).toEqual({ view: true, email: false, in_app: false, participation: 'action' });
});

test('désactiver la consultation retire le droit d’action sans toucher aux emails', () => {
  const setField = renderSettings({ manager_cross_service: {
    conges: { view: true, email: true, in_app: false, participation: 'action' },
  } });
  fireEvent.click(screen.getByLabelText('Congés — Consultation — RH'));
  expect(setField.mock.calls[0][2].conges).toEqual({ view: false, email: true, in_app: false, participation: 'information' });
});

test('les droits congés existants conservent leurs canaux et leur participation', () => {
  renderSettings({ manager_can_validate_all_services: true });
  for (const field of ['Consultation', 'Emails', 'Alertes application']) {
    expect(screen.getByLabelText(`Congés — ${field} — RH`).checked).toBe(true);
  }
  expect(screen.getByLabelText('Congés — Participation — RH').value).toBe('action');
});
