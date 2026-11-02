import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationSettings from './NotificationSettings';
import { notificationsService, entreprisesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../hooks/useAlert', () => ({ useAlert: () => ({ success: jest.fn(), error: jest.fn() }) }));
jest.mock('../../services/api', () => ({
  notificationsService: { getConfiguration: jest.fn(), updateConfiguration: jest.fn() },
  entreprisesService: { getAll: jest.fn() },
}));

const configuration = {
  preferences: { version: 1, roles: { employe: { leave_created: { information: { email: false, in_app: true } } } } },
  routing: {}, services: ['RH', 'Finance'], legacy: { on_create: true, on_validate: true, on_reject: true },
  managers: [{ id: 'm1', prenom: 'Marc', nom: 'RH', service: 'RH', role: 'manager' },
    { id: 'm2', prenom: 'Marie', nom: 'Finance', service: 'Finance', role: 'manager' }],
  administrators: [{ id: 'a1', prenom: 'Alice', nom: 'Admin', role: 'admin_entreprise' }],
  recipient_defaults: { RH: { conges: { m1: { canAct: true, email: true, in_app: true }, m2: { canAct: false, email: false, in_app: false } } } },
  default_workflow: 'manager_admin', service_workflows: { RH: 'manager_admin', Finance: 'admin_only' },
  events: [
    { id: 'leave_created', family: 'conges', roles: ['employe', 'apprenti'] },
    { id: 'sickness_created', family: 'maladie', roles: ['employe', 'apprenti'] },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'admin_entreprise', entreprise_id: 'company' } });
  notificationsService.getConfiguration.mockResolvedValue({ data: JSON.parse(JSON.stringify(configuration)) });
  notificationsService.updateConfiguration.mockImplementation(async (id, body) => ({
    data: { ...configuration, ...body, legacy: { ...configuration.legacy, ...body.legacy } },
  }));
});

test('une seule grille nominative, sans listes d’événements ni cartes Action/Information', async () => {
  render(<NotificationSettings />);
  expect(await screen.findByRole('table', { name: 'Personnes à prévenir' })).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(6);
  expect(screen.queryByLabelText('1. Pour qui ?')).not.toBeInTheDocument();
  expect(screen.queryByText('Exceptions par événement')).not.toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('Manager → Administrateur');
  expect(screen.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
});

test('la sélection d’un manager interservice autorise explicitement le traitement sans modifier le service inverse ni les anciens réglages', async () => {
  render(<NotificationSettings />);
  fireEvent.change(await screen.findByLabelText('Réception : Marie Finance'), { target: { value: 'workflow' } });
  expect(screen.getByLabelText('Application : Marie Finance')).toBeChecked();
  fireEvent.change(screen.getByLabelText('Demandes du service'), { target: { value: 'Finance' } });
  expect(screen.getByLabelText('Réception : Marie Finance')).toHaveValue('existing');
  expect(screen.getByRole('note')).toHaveTextContent('Administrateur');
  fireEvent.change(screen.getByLabelText('Demandes du service'), { target: { value: 'RH' } });
  expect(screen.getByLabelText('Réception : Marie Finance')).toHaveValue('workflow');
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  expect(notificationsService.updateConfiguration.mock.calls[0]).toEqual(['company', {
    routing: { RH: { conges: { m2: { mode: 'workflow', email: false, in_app: true } } } },
  }]);
});

test('les choix administrateur et manager sont indépendants et ne pas prévenir coupe les cases de la ligne', async () => {
  render(<NotificationSettings />);
  fireEvent.change(await screen.findByLabelText('Réception : Marc RH'), { target: { value: 'none' } });
  expect(screen.getByLabelText('Email : Marc RH')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Réception : Alice Admin'), { target: { value: 'information' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  const rows = notificationsService.updateConfiguration.mock.calls[0][1].routing.RH.conges;
  expect(rows.m1.mode).toBe('none');
  expect(rows.a1.mode).toBe('information');
});

test('les arrêts et absences ne proposent pas de nouveau circuit de validation', async () => {
  render(<NotificationSettings />);
  fireEvent.change(await screen.findByLabelText('Concernant'), { target: { value: 'maladie' } });
  expect(screen.queryByRole('option', { name: 'Traiter selon le circuit' })).not.toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('sans étape de validation');
});

test('les canaux des propriétaires se configurent sans modifier les responsables ou les canaux historiques non choisis', async () => {
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByLabelText('Email : Salariés'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  const body = notificationsService.updateConfiguration.mock.calls[0][1];
  expect(body).not.toHaveProperty('routing');
  expect(body.preferences.roles).toEqual(configuration.preferences.roles);
  expect(body.preferences.service_roles.RH.employe.leave_created.workflow).toEqual({ email: true });
});

test('l’échec de sauvegarde reste visible et conserve le brouillon, annuler le retire', async () => {
  notificationsService.updateConfiguration.mockRejectedValue({ response: { data: { message: 'Canal obligatoire' } } });
  render(<NotificationSettings />);
  fireEvent.change(await screen.findByLabelText('Réception : Marie Finance'), { target: { value: 'workflow' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Canal obligatoire');
  expect(screen.getByLabelText('Réception : Marie Finance')).toHaveValue('workflow');
  fireEvent.click(screen.getByRole('button', { name: 'Annuler les changements' }));
  expect(screen.getByLabelText('Réception : Marie Finance')).toHaveValue('existing');
});

test('le super administrateur cible une entreprise sans panneau d’exceptions', async () => {
  useAuth.mockReturnValue({ user: { role: 'super_admin' } });
  entreprisesService.getAll.mockResolvedValue({ data: [{ id: 'company', nom: 'Entreprise A' }] });
  render(<NotificationSettings />);
  await screen.findByRole('option', { name: 'Entreprise A' });
  fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: 'company' } });
  await screen.findByRole('table', { name: 'Personnes à prévenir' });
  expect(notificationsService.getConfiguration).toHaveBeenCalledWith('company');
  expect(screen.queryByRole('button', { name: 'Exceptions et confidentialité' })).not.toBeInTheDocument();
});

test('les quatre colonnes sont présentes et les groupes se sauvegardent par personne et service', async () => {
  render(<NotificationSettings />);
  await screen.findByRole('table', { name: 'Personnes à prévenir' });
  for (const name of ['Création', 'Modification', 'Suppression', 'Commentaire']) expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Création : Marie Finance'));
  fireEvent.click(screen.getByLabelText('Suppression : Marie Finance'));
  fireEvent.click(screen.getByLabelText('Commentaire : Marc RH'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  const rows = notificationsService.updateConfiguration.mock.calls[0][1].routing.RH.conges;
  expect(rows.m2.events).toEqual({ creation: false, suppression: false });
  expect(rows.m1.comments).toBe(false);
  expect(rows.m1.mode).toBeUndefined();
  expect(rows.m1.email).toBeUndefined();
});

test('désactiver un groupe de confirmations coupe ses deux canaux sans couper un autre groupe', async () => {
  const data = JSON.parse(JSON.stringify(configuration));
  data.events.push({ id: 'leave_rejected', family: 'conges', roles: ['employe', 'apprenti'] });
  notificationsService.getConfiguration.mockResolvedValue({ data });
  render(<NotificationSettings />);
  await screen.findByLabelText('Création : Salariés');
  fireEvent.click(screen.getByLabelText('Création : Salariés'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  const events = notificationsService.updateConfiguration.mock.calls[0][1].preferences.service_roles.RH.employe;
  expect(events.leave_created.workflow).toEqual({ email: false, in_app: false });
  expect(events.leave_rejected).toBeUndefined();
  expect(screen.getByLabelText('Commentaire : Salariés')).toBeDisabled();
});

test('les groupes de confirmations coupés restent coupés lors d’un changement de canal et peuvent être réactivés ensuite', async () => {
  const data = JSON.parse(JSON.stringify(configuration));
  data.preferences.service_roles = { RH: { employe: { leave_created: { workflow: { email: false, in_app: false } } } } };
  notificationsService.getConfiguration.mockResolvedValue({ data });
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByLabelText('Email : Salariés'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalledTimes(1));
  expect(notificationsService.updateConfiguration.mock.calls[0][1].preferences.service_roles.RH.employe.leave_created.workflow)
    .toEqual({ email: false, in_app: false });
  fireEvent.click(screen.getByLabelText('Création : Salariés'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalledTimes(2));
  expect(notificationsService.updateConfiguration.mock.calls[1][1].preferences.service_roles.RH.employe.leave_created.workflow.in_app).toBe(true);
});

test.each([
  ['on_create', 'Création des demandes'],
  ['on_validate', 'Validations'],
  ['on_reject', 'Refus'],
])('réactive uniquement l’autorisation historique %s, sans toucher aux destinataires ni au workflow', async (key, label) => {
  const data = { ...configuration, legacy: { ...configuration.legacy, [key]: false } };
  notificationsService.getConfiguration.mockResolvedValue({ data });
  render(<NotificationSettings />);
  expect(await screen.findByText(/Certaines notifications sont coupées/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Autorisations générales des congés'));
  expect(screen.getByLabelText(label)).not.toBeChecked();
  fireEvent.click(screen.getByLabelText(label));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalledWith('company', { legacy: { [key]: true } }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled());
  expect(screen.getByLabelText(label)).toBeChecked();
  expect(screen.queryByText(/Certaines notifications sont coupées/)).not.toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('Manager → Administrateur');
});

test('les autorisations générales restent sauvegardables sans service', async () => {
  notificationsService.getConfiguration.mockResolvedValue({ data: { ...configuration, services: [] } });
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByText('Autorisations générales des congés'));
  fireEvent.click(screen.getByLabelText('Refus'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalledWith('company', { legacy: { on_reject: false } }));
});

test('une erreur conserve le brouillon général ; annuler restaure les trois valeurs sans sauvegarde supplémentaire', async () => {
  notificationsService.updateConfiguration.mockRejectedValue({ response: { data: { message: 'Sauvegarde indisponible' } } });
  notificationsService.getConfiguration.mockResolvedValue({ data: {
    ...configuration, legacy: { on_create: false, on_validate: true, on_reject: false },
  } });
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByText('Autorisations générales des congés'));
  fireEvent.click(screen.getByLabelText('Création des demandes'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sauvegarde indisponible');
  expect(screen.getByLabelText('Création des demandes')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler les changements' }));
  expect(screen.getByLabelText('Création des demandes')).not.toBeChecked();
  expect(screen.getByLabelText('Validations')).toBeChecked();
  expect(screen.getByLabelText('Refus')).not.toBeChecked();
  expect(notificationsService.updateConfiguration).toHaveBeenCalledTimes(1);
});

test('une sauvegarde combinée conserve les rapports et préférences masquées et ne réactive pas les anciennes coupures', async () => {
  const data = JSON.parse(JSON.stringify(configuration));
  data.legacy.on_create = false;
  data.preferences.roles.admin_entreprise = { monthly_report: { information: { email: false, in_app: true } } };
  data.preferences.manager_scope = { mode: 'services', services: ['Finance'] };
  data.preferences.comment_reading = { manager: { maladie: false } };
  data.preferences.service_roles = { Finance: { apprenti: { sickness_created: { information: { email: false, in_app: true } } } } };
  notificationsService.getConfiguration.mockResolvedValue({ data });
  render(<NotificationSettings />);
  fireEvent.click(await screen.findByLabelText('Email : Salariés'));
  fireEvent.click(screen.getByLabelText('Commentaire : Marc RH'));
  fireEvent.click(screen.getByText('Autorisations générales des congés'));
  fireEvent.click(screen.getByLabelText('Refus'));
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }));
  await waitFor(() => expect(notificationsService.updateConfiguration).toHaveBeenCalled());
  const body = notificationsService.updateConfiguration.mock.calls[0][1];
  expect(body.legacy).toEqual({ on_reject: false });
  expect(body.routing).toEqual({ RH: { conges: { m1: { comments: false } } } });
  expect(body.preferences).toEqual({
    ...data.preferences,
    service_roles: { ...data.preferences.service_roles, RH: { employe: { leave_created: { workflow: { email: true } } } } },
  });
  expect(body).not.toHaveProperty('manager_services');
});

test('changer d’entreprise pendant un chargement ignore la réponse tardive de l’ancienne entreprise', async () => {
  useAuth.mockReturnValue({ user: { role: 'super_admin' } });
  entreprisesService.getAll.mockResolvedValue({ data: [{ id: 'a', nom: 'Entreprise A' }, { id: 'b', nom: 'Entreprise B' }] });
  let resolveFirst;
  notificationsService.getConfiguration.mockImplementation(id => id === 'a'
    ? new Promise(resolve => { resolveFirst = resolve; })
    : Promise.resolve({ data: { ...configuration, services: ['Service B'], legacy: { ...configuration.legacy, on_reject: false } } }));
  render(<NotificationSettings />);
  await screen.findByRole('option', { name: 'Entreprise A' });
  fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: 'a' } });
  fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: 'b' } });
  await screen.findByRole('option', { name: 'Service B' });
  await act(async () => { resolveFirst({ data: configuration }); });
  expect(screen.getByLabelText('Entreprise')).toHaveValue('b');
  expect(screen.getByLabelText('Demandes du service')).toHaveValue('Service B');
  fireEvent.click(screen.getByText('Autorisations générales des congés'));
  expect(screen.getByLabelText('Refus')).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Refus'));
  expect(screen.getByLabelText('Entreprise')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler les changements' }));
  expect(screen.getByLabelText('Entreprise')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: '' } });
  expect(screen.queryByLabelText('Refus')).not.toBeInTheDocument();
});
