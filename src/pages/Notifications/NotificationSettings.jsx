import React, { useEffect, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import { entreprisesService, notificationsService } from '../../services/api';

const CATEGORIES = { conges: 'Congés', absence_exceptionnelle: 'Absences', maladie: 'Arrêts maladie' };
const WORKFLOWS = {
  auto: 'Validation automatique', manager: 'Manager', manager_only: 'Manager',
  admin_only: 'Administrateur', manager_admin: 'Manager → Administrateur',
};
const ROLES = { manager: 'Manager', admin_entreprise: 'Administrateur', employe: 'Salariés', apprenti: 'Apprentis' };
const GROUPS = { creation: 'Création', modification: 'Modification', suppression: 'Suppression' };
const LEGACY_OPTIONS = { on_create: 'Création des demandes', on_validate: 'Validations', on_reject: 'Refus' };
const eventGroup = event => event.group || (['leave_created', 'leave_reservation', 'leave_activated', 'absence_created', 'sickness_created'].includes(event.id)
  ? 'creation' : ['leave_cancelled', 'leave_cancel_requested', 'absence_cancelled', 'sickness_cancelled'].includes(event.id) ? 'suppression' : 'modification');

export default function NotificationSettings() {
  const { user } = useAuth();
  const alert = useAlert();
  const [companyId, setCompanyId] = useState(user.role === 'super_admin' ? '' : user.entreprise_id);
  const [companies, setCompanies] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [service, setService] = useState('');
  const [category, setCategory] = useState('conges');
  const [changes, setChanges] = useState({});
  const [ownerChanges, setOwnerChanges] = useState({});
  const [legacyChanges, setLegacyChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role !== 'super_admin') return undefined;
    let active = true;
    entreprisesService.getAll().then(response => { if (active) setCompanies(response.data); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Impossible de charger les entreprises.'); });
    return () => { active = false; };
  }, [user.role]);

  useEffect(() => {
    let active = true;
    setConfiguration(null);
    setChanges({});
    setOwnerChanges({});
    setLegacyChanges({});
    setError('');
    if (!companyId) return undefined;
    notificationsService.getConfiguration(companyId).then(response => {
      if (!active) return;
      setConfiguration(response.data);
      setService(current => response.data.services.includes(current) ? current : response.data.services[0] || '');
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Impossible de charger les responsables.'); });
    return () => { active = false; };
  }, [companyId]);

  const dirty = Object.keys(changes).length > 0 || Object.keys(ownerChanges).length > 0 || Object.keys(legacyChanges).length > 0;
  const people = configuration ? [...configuration.managers, ...configuration.administrators] : [];
  const routeFor = person => changes[service]?.[category]?.[person.id]
    ?? configuration.routing?.[service]?.[category]?.[person.id];
  const setRoute = (person, value) => setChanges(current => ({
    ...current, [service]: { ...current[service], [category]: { ...current[service]?.[category], [person.id]: value } },
  }));
  const initialRoute = person => {
    const defaults = configuration.recipient_defaults?.[service]?.[category]?.[person.id];
    return { mode: category === 'conges' && defaults?.canAct ? 'workflow' : 'information',
      email: defaults?.email === true, in_app: defaults?.in_app === true };
  };
  const eventsFor = role => configuration.events.filter(event => event.family === category && event.roles.includes(role));
  const ownerValue = (role, channel) => {
    const changed = ownerChanges[service]?.[role]?.[category]?.[channel];
    if (changed !== undefined) return changed;
    const values = eventsFor(role).map(event => {
      const local = configuration.preferences.service_roles?.[service]?.[role]?.[event.id];
      const common = configuration.preferences.roles?.[role]?.[event.id];
      return local?.workflow?.[channel] ?? local?.information?.[channel]
        ?? common?.workflow?.[channel] ?? common?.information?.[channel];
    });
    return values.every(value => value === values[0]) ? values[0] : undefined;
  };
  const setOwnerChannel = (role, channel, enabled) => setOwnerChanges(current => ({
    ...current, [service]: { ...current[service], [role]: {
      ...current[service]?.[role], [category]: { ...current[service]?.[role]?.[category], [channel]: enabled,
        groups: { ...Object.fromEntries(Object.keys(GROUPS).filter(group => ownerGroupValue(role, group) === false).map(group => [group, false])),
          ...current[service]?.[role]?.[category]?.groups } },
    } },
  }));
  const ownerGroupValue = (role, group) => {
    const changed = ownerChanges[service]?.[role]?.[category]?.groups?.[group];
    if (changed !== undefined) return changed;
    const events = eventsFor(role).filter(event => eventGroup(event) === group);
    const values = events.map(event => {
      const local = configuration.preferences.service_roles?.[service]?.[role]?.[event.id];
      const common = configuration.preferences.roles?.[role]?.[event.id];
      const channels = ['email', 'in_app'].map(channel => local?.workflow?.[channel] ?? local?.information?.[channel]
        ?? common?.workflow?.[channel] ?? common?.information?.[channel]);
      return channels.some(value => value === true) ? true : channels.every(value => value === false) ? false : undefined;
    });
    return values.length && values.every(value => value === values[0]) ? values[0] : undefined;
  };
  const setOwnerGroup = (role, group, enabled) => setOwnerChanges(current => ({
    ...current, [service]: { ...current[service], [role]: { ...current[service]?.[role],
      [category]: { ...current[service]?.[role]?.[category], groups: { ...current[service]?.[role]?.[category]?.groups, [group]: enabled } },
    } },
  }));
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {};
      if (Object.keys(legacyChanges).length) body.legacy = legacyChanges;
      if (Object.keys(changes).length) body.routing = changes;
      if (Object.keys(ownerChanges).length) {
        const preferences = { ...configuration.preferences, service_roles: { ...configuration.preferences.service_roles } };
        for (const [target, roles] of Object.entries(ownerChanges)) {
          preferences.service_roles[target] = { ...preferences.service_roles[target] };
          for (const [role, categories] of Object.entries(roles)) {
            const events = { ...preferences.service_roles[target][role] };
            for (const [family, { groups = {}, ...channels }] of Object.entries(categories)) {
              for (const event of configuration.events.filter(item => item.family === family && item.roles.includes(role))) {
                const enabled = groups[eventGroup(event)];
                const previous = events[event.id];
                const common = configuration.preferences.roles?.[role]?.[event.id];
                const workflow = { ...previous?.workflow, ...channels };
                for (const channel of ['email', 'in_app']) {
                  if (enabled === false) workflow[channel] = false;
                  else if (enabled === true) workflow[channel] = channels[channel] ?? previous?.workflow?.[channel]
                    ?? previous?.information?.[channel] ?? common?.workflow?.[channel] ?? common?.information?.[channel] ?? true;
                }
                if (enabled === true && !workflow.email && !workflow.in_app) workflow.in_app = true;
                if (Object.keys(workflow).length) events[event.id] = { ...previous, workflow };
              }
            }
            preferences.service_roles[target][role] = events;
          }
        }
        body.preferences = preferences;
      }
      const response = await notificationsService.updateConfiguration(companyId, body);
      setConfiguration(response.data);
      setChanges({});
      setOwnerChanges({});
      setLegacyChanges({});
      alert.success('Les réglages de notification ont été enregistrés.');
    } catch (err) {
      const message = err.response?.data?.message || 'Impossible d’enregistrer les responsables.';
      setError(message);
      alert.error(message);
    } finally { setSaving(false); }
  };

  return <section className="notif-settings notif-routing" aria-label="Configuration des notifications">
    <h2 className="h5">Qui prévenir ?</h2>
    <p>Choisissez un service, puis ce que reçoit chaque personne.</p>
    {user.role === 'super_admin' && <Form.Group controlId="routing-company" className="mb-3">
      <Form.Label>Entreprise</Form.Label>
      <Form.Select value={companyId} disabled={saving || dirty} onChange={event => setCompanyId(event.target.value)}>
        <option value="">Choisir une entreprise</option>
        {companies.map(company => <option key={company.id} value={company.id}>{company.nom}</option>)}
      </Form.Select>
    </Form.Group>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {companyId && !configuration && !error && <div role="status"><Spinner size="sm" /> Chargement…</div>}
    {configuration && <fieldset disabled={saving}>
      <details className="mb-3">
        <summary>Autorisations générales des congés</summary>
        <p className="small text-muted mt-2">Pour toute l’entreprise, quel que soit le service. Une case décochée bloque les envois correspondants, même si les personnes sont cochées dans la grille. Ces autorisations ne changent pas le circuit de validation.</p>
        <div className="d-flex flex-wrap gap-3">
          {Object.entries(LEGACY_OPTIONS).map(([key, label]) => <Form.Check
            type="switch" id={`routing-legacy-${key}`} key={key} label={label}
            checked={legacyChanges[key] ?? configuration.legacy[key]}
            onChange={event => setLegacyChanges(current => ({ ...current, [key]: event.target.checked }))} />)}
        </div>
      </details>
      <div className="notif-settings-selectors">
        <Form.Group controlId="routing-service">
          <Form.Label>Demandes du service</Form.Label>
          <Form.Select value={service} onChange={event => setService(event.target.value)}>
            {!configuration.services.length && <option value="">Aucun service</option>}
            {configuration.services.map(name => <option key={name}>{name}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="routing-category">
          <Form.Label>Concernant</Form.Label>
          <Form.Select value={category} onChange={event => setCategory(event.target.value)}>
            {Object.entries(CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Form.Select>
        </Form.Group>
      </div>
      <p className="notif-routing-workflow mt-3" role="note">
        {category === 'conges' ? <>Circuit : <strong>{WORKFLOWS[configuration.service_workflows?.[service] || configuration.default_workflow]}</strong>. Le système demande une action uniquement à la bonne étape.</>
          : 'Absences et arrêts maladie : information uniquement, sans étape de validation.'}
      </p>
      <p className="small text-muted">Création : demandes et réservations. Modification : changements, attente, validations, refus et suivi. Suppression : annulations et suppressions. Commentaire : lecture dans les emails et les dossiers accessibles.</p>
      {service && <div className="notif-routing-grid" role="table" aria-label="Personnes à prévenir">
        <div className="notif-routing-row notif-routing-heading" role="row">
          <span role="columnheader">Personne</span><span role="columnheader">Ce qu’elle reçoit</span>
          <span role="columnheader">Application</span><span role="columnheader">Email</span>
          {Object.values(GROUPS).map(label => <span role="columnheader" key={label}>{label}</span>)}
          <span role="columnheader">Commentaire</span>
        </div>
        {people.map(person => {
          const route = routeFor(person);
          const editable = { ...initialRoute(person), ...route };
          return <div className="notif-routing-row" role="row" key={person.id}>
            <div role="cell"><strong>{person.prenom} {person.nom}</strong>
              <span className="d-block small text-muted">{ROLES[person.role]} · {person.service || 'Sans service'}</span>
            </div>
            <div role="cell"><Form.Select aria-label={`Réception : ${person.prenom} ${person.nom}`}
              value={route?.mode || 'existing'} onChange={event => setRoute(person, { ...editable, mode: event.target.value,
                ...(event.target.value !== 'none' && !editable.email && !editable.in_app ? { in_app: true } : {}) })}>
              {!route?.mode && <option value="existing" disabled>Réglages actuels conservés</option>}
              <option value="none">Ne pas prévenir</option>
              <option value="information">Informer seulement</option>
              {category === 'conges' && <option value="workflow">Traiter selon le circuit</option>}
            </Form.Select></div>
            {['in_app', 'email'].map(channel => <div role="cell" key={channel}>
              <Form.Check id={`route-${person.id}-${channel}`} label={channel === 'email' ? 'Email' : 'Application'}
                aria-label={`${channel === 'email' ? 'Email' : 'Application'} : ${person.prenom} ${person.nom}`}
                disabled={route?.mode === 'none'} checked={Boolean(route?.[channel])}
                ref={element => { if (element) element.indeterminate = !route?.mode; }}
                onChange={event => setRoute(person, { ...editable, [channel]: event.target.checked })} />
            </div>)}
            {Object.entries(GROUPS).map(([group, label]) => <div role="cell" key={group}>
              <Form.Check id={`route-${person.id}-${group}`} label={label}
                aria-label={`${label} : ${person.prenom} ${person.nom}`} disabled={route?.mode === 'none'}
                checked={route?.events?.[group] !== false}
                onChange={event => setRoute(person, { ...route, events: { ...route?.events, [group]: event.target.checked } })} />
            </div>)}
            <div role="cell"><Form.Check id={`route-${person.id}-comments`} label="Commentaire"
              aria-label={`Commentaire : ${person.prenom} ${person.nom}`}
              checked={route?.comments ?? configuration.preferences.comment_reading?.[person.role]?.[category] !== false}
              onChange={event => setRoute(person, { ...route, comments: event.target.checked })} /></div>
          </div>;
        })}
        {['employe', 'apprenti'].map(role => <div className="notif-routing-row" role="row" key={role}>
          <div role="cell"><strong>{ROLES[role]}</strong><span className="d-block small text-muted">Leurs propres demandes</span></div>
          <span role="cell">Confirmations et suivi</span>
          {['in_app', 'email'].map(channel => {
            const value = ownerValue(role, channel);
            return <div role="cell" key={channel}><Form.Check id={`owner-${role}-${channel}`}
              label={channel === 'email' ? 'Email' : 'Application'} aria-label={`${channel === 'email' ? 'Email' : 'Application'} : ${ROLES[role]}`}
              checked={value === true} ref={element => { if (element) element.indeterminate = value === undefined; }}
              onChange={event => setOwnerChannel(role, channel, event.target.checked)} /></div>;
          })}
          {Object.entries(GROUPS).map(([group, label]) => {
            const value = ownerGroupValue(role, group);
            return <div role="cell" key={group}><Form.Check id={`owner-${role}-${group}`} label={label}
              aria-label={`${label} : ${ROLES[role]}`} checked={value === true}
              ref={element => { if (element) element.indeterminate = value === undefined; }}
              onChange={event => setOwnerGroup(role, group, event.target.checked)} /></div>;
          })}
          <div role="cell"><Form.Check label="Commentaire" aria-label={`Commentaire : ${ROLES[role]}`} checked disabled /></div>
        </div>)}
      </div>}
      {!service && <p>Créez un service dans les règles de l’entreprise pour affecter ses responsables.</p>}
      <p className="small text-muted mt-3">« Traiter » autorise aussi ce manager à consulter et valider les congés de ce service, même s’il travaille ailleurs. « Informer » et « Ne pas prévenir » ne retirent pas ses droits antérieurs. Aucun droit médical supplémentaire n’est accordé.</p>
      {Object.values({ ...configuration.legacy, ...legacyChanges }).some(value => !value) && <p role="status" className="small text-warning">Certaines notifications sont coupées. Ouvrez « Autorisations générales des congés » pour les réactiver, puis enregistrez.</p>}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <Button onClick={save} disabled={!dirty || !service && !Object.keys(legacyChanges).length}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        {dirty && <Button variant="outline-secondary" onClick={() => { setChanges({}); setOwnerChanges({}); setLegacyChanges({}); }}>Annuler les changements</Button>}
      </div>
    </fieldset>}
  </section>;
}
