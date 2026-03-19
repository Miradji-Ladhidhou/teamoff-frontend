import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Badge, Table, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { entreprisesService, usersService, congeTypesService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const DEFAULT_POLICY = {
  overlap_policy: 'block',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  approval_workflow: 'manager_admin',
  conges_payes_annuels: 25,
  rtt_annuels: 0,
  report_autorise: false,
  report_max_jours: 0,
  max_employees_on_leave: {
    global: null,
    by_service: {},
  },
  service_policies: {},
};

const DEFAULT_SERVICE_POLICY = {
  overlap_policy: 'block',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  approval_workflow: 'manager_admin',
  max_employees_on_leave: 0,
};

const DEFAULT_CONGE_TYPE_FORM = {
  code: '',
  libelle: '',
  quota_annuel: 0,
  demi_journee_autorisee: false,
};

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Paris',        label: 'Paris (UTC+1 / UTC+2 en été)',           group: 'Europe' },
  { value: 'Europe/London',       label: 'Londres (UTC+0 / UTC+1 en été)',          group: 'Europe' },
  { value: 'Europe/Brussels',     label: 'Bruxelles (UTC+1 / UTC+2 en été)',        group: 'Europe' },
  { value: 'Europe/Zurich',       label: 'Zurich (UTC+1 / UTC+2 en été)',           group: 'Europe' },
  { value: 'Indian/Reunion',      label: 'La Réunion (UTC+4)',                      group: 'Océan Indien' },
  { value: 'Indian/Mauritius',    label: 'Maurice (UTC+4)',                         group: 'Océan Indien' },
  { value: 'Indian/Mayotte',      label: 'Mayotte (UTC+3)',                         group: 'Océan Indien' },
  { value: 'Africa/Casablanca',   label: 'Casablanca (UTC+1)',                      group: 'Afrique' },
  { value: 'Africa/Abidjan',      label: 'Abidjan (UTC+0)',                         group: 'Afrique' },
  { value: 'Africa/Tunis',        label: 'Tunis (UTC+1)',                           group: 'Afrique' },
  { value: 'Africa/Algiers',      label: 'Alger (UTC+1)',                           group: 'Afrique' },
  { value: 'Africa/Nairobi',      label: 'Nairobi (UTC+3)',                         group: 'Afrique' },
  { value: 'America/Montreal',    label: 'Montréal (UTC−5 / UTC−4 en été)',         group: 'Amériques' },
  { value: 'America/New_York',    label: 'New York (UTC−5 / UTC−4 en été)',         group: 'Amériques' },
  { value: 'America/Chicago',     label: 'Chicago (UTC−6 / UTC−5 en été)',          group: 'Amériques' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC−8 / UTC−7 en été)',      group: 'Amériques' },
  { value: 'Asia/Dubai',          label: 'Dubaï (UTC+4)',                           group: 'Asie / Moyen-Orient' },
  { value: 'Atlantic/Canary',     label: 'Canaries (UTC+0 / UTC+1 en été)',         group: 'Atlantique' },
  { value: 'UTC',                 label: 'UTC (UTC+0)',                             group: 'Autres' },
];

const PolitiqueCongesPage = () => {
  const confirmDialog = useConfirmDialog();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [servicePolicies, setServicePolicies] = useState({});
  const [newServiceName, setNewServiceName] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceViewMode, setServiceViewMode] = useState('cards');
  const [visibleServicesCount, setVisibleServicesCount] = useState(8);
  const [expandedServices, setExpandedServices] = useState({});
  const [showServicePolicies, setShowServicePolicies] = useState(false);
  const [congeTypes, setCongeTypes] = useState([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [savingType, setSavingType] = useState(false);
  const [typeForm, setTypeForm] = useState(DEFAULT_CONGE_TYPE_FORM);
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [savingTz, setSavingTz] = useState(false);
  const [tzError, setTzError] = useState('');
  const [tzSuccess, setTzSuccess] = useState('');

  const entrepriseId = user?.entreprise_id;

  useEffect(() => {
    const loadPolicy = async () => {
      if (!entrepriseId) return;
      try {
        setLoading(true);
        const [policyResponse, usersResponse, typesResponse, parametresResponse] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          usersService.getAll(),
          congeTypesService.getAll({ entreprise_id: entrepriseId }),
          entreprisesService.getParametres(entrepriseId).catch(() => null),
        ]);

        const data = policyResponse.data?.politique_conges || policyResponse.data || {};
        const merged = {
          ...DEFAULT_POLICY,
          ...data,
          max_employees_on_leave: {
            ...DEFAULT_POLICY.max_employees_on_leave,
            ...(data.max_employees_on_leave || {}),
          },
          service_policies: {
            ...DEFAULT_POLICY.service_policies,
            ...(data.service_policies || {}),
          },
        };

        const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const types = Array.isArray(typesResponse.data) ? typesResponse.data : [];
        const serviceNames = [...new Set(users.map((u) => String(u.service || '').trim()).filter(Boolean))];

        const normalizedServicePolicies = { ...(merged.service_policies || {}) };
        serviceNames.forEach((service) => {
          if (!normalizedServicePolicies[service]) {
            normalizedServicePolicies[service] = {
              ...DEFAULT_SERVICE_POLICY,
              max_employees_on_leave: Number(merged.max_employees_on_leave?.by_service?.[service] || 0),
            };
          }
        });

        setPolicy(merged);
        setServicePolicies(normalizedServicePolicies);
        setCongeTypes(types.sort((a, b) => String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr')));
        if (parametresResponse?.data?.parametres?.timezone) {
          setTimezone(parametresResponse.data.parametres.timezone);
        }
      } catch (err) {
        console.error('Erreur chargement politique:', err);
        setError('Impossible de charger la politique de congé de votre entreprise.');
      } finally {
        setLoading(false);
      }
    };

    loadPolicy();
  }, [entrepriseId]);

  const setField = (name, value) => {
    setPolicy((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveTimezone = async (e) => {
    e.preventDefault();
    setTzError('');
    setTzSuccess('');
    try {
      setSavingTz(true);
      await entreprisesService.updateParametres(entrepriseId, { timezone });
      setTzSuccess('Fuseau horaire enregistré avec succès.');
    } catch (err) {
      setTzError(err.response?.data?.message || 'Erreur lors de la sauvegarde du fuseau horaire.');
    } finally {
      setSavingTz(false);
    }
  };

  const tzPreview = (() => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
      });
      const offsetFormatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      });
      const offsetParts = offsetFormatter.formatToParts(now);
      const offsetStr = (offsetParts.find((p) => p.type === 'timeZoneName')?.value || '').replace('GMT', 'UTC');
      const tzLabel = TIMEZONE_OPTIONS.find((o) => o.value === timezone)?.label?.match(/\(([^)]+)\)/)?.[1] || timezone;
      return {
        timeLine: timeFormatter.format(now),
        dateLine: `${formatter.format(now)} (${offsetStr})`,
        tzLine: `Heure (${tzLabel.replace(/UTC[^,]+,?\s*/g, '').trim() || timezone})`,
      };
    } catch {
      return null;
    }
  })();

  const resetTypeForm = () => {
    setEditingTypeId(null);
    setTypeForm(DEFAULT_CONGE_TYPE_FORM);
  };

  const openCreateTypeModal = () => {
    resetTypeForm();
    setShowTypeModal(true);
  };

  const openEditTypeModal = (type) => {
    setEditingTypeId(type.id);
    setTypeForm({
      code: type.code || '',
      libelle: type.libelle || '',
      quota_annuel: Number(type.quota_annuel || 0),
      demi_journee_autorisee: Boolean(type.demi_journee_autorisee),
    });
    setShowTypeModal(true);
  };

  const closeTypeModal = () => {
    setShowTypeModal(false);
    resetTypeForm();
  };

  const refreshCongeTypes = async () => {
    const response = await congeTypesService.getAll({ entreprise_id: entrepriseId });
    const types = Array.isArray(response.data) ? response.data : [];
    setCongeTypes(types.sort((a, b) => String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr')));
  };

  const handleSaveCongeType = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      setSavingType(true);

      const payload = {
        entreprise_id: entrepriseId,
        code: String(typeForm.code || '').trim().toUpperCase(),
        libelle: String(typeForm.libelle || '').trim(),
        quota_annuel: Number(typeForm.quota_annuel || 0),
        demi_journee_autorisee: Boolean(typeForm.demi_journee_autorisee),
      };

      if (!payload.code || !payload.libelle) {
        setError('Le code et le libellé du type de congé sont requis.');
        return;
      }

      if (editingTypeId) {
        await congeTypesService.update(editingTypeId, payload);
        setSuccess('Type de congé mis à jour avec succès.');
      } else {
        await congeTypesService.create(payload);
        setSuccess('Type de congé ajouté avec succès.');
      }

      await refreshCongeTypes();
      closeTypeModal();
    } catch (err) {
      console.error('Erreur sauvegarde type de congé:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du type de congé.');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteCongeType = async (typeId) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer un type de congé',
      message: 'Cette action est définitive. Voulez-vous continuer ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await congeTypesService.delete(typeId);
      await refreshCongeTypes();
      setSuccess('Type de congé supprimé avec succès.');
    } catch (err) {
      console.error('Erreur suppression type de congé:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression du type de congé.');
    }
  };

  const addServicePolicy = () => {
    const serviceName = String(newServiceName || '').trim();
    if (!serviceName) return;
    if (servicePolicies[serviceName]) {
      setNewServiceName('');
      return;
    }
    setServicePolicies((prev) => ({
      ...prev,
      [serviceName]: { ...DEFAULT_SERVICE_POLICY },
    }));
    setExpandedServices((prev) => ({ ...prev, [serviceName]: true }));
    setNewServiceName('');
  };

  const removeServicePolicy = (serviceName) => {
    setServicePolicies((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
    setExpandedServices((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
  };

  const setServiceField = (serviceName, field, value) => {
    setServicePolicies((prev) => ({
      ...prev,
      [serviceName]: {
        ...DEFAULT_SERVICE_POLICY,
        ...(prev[serviceName] || {}),
        [field]: value,
      },
    }));
  };

  const serviceEntries = useMemo(
    () => Object.entries(servicePolicies).sort(([a], [b]) => a.localeCompare(b, 'fr')),
    [servicePolicies]
  );

  const filteredServiceEntries = useMemo(() => {
    const term = String(serviceSearch || '').trim().toLowerCase();
    if (!term) return serviceEntries;
    return serviceEntries.filter(([name]) => name.toLowerCase().includes(term));
  }, [serviceEntries, serviceSearch]);

  const visibleServiceEntries = filteredServiceEntries.slice(0, visibleServicesCount);

  const toggleServiceExpanded = (serviceName) => {
    setExpandedServices((prev) => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  const setAllServicesExpanded = (expanded) => {
    const next = {};
    filteredServiceEntries.forEach(([name]) => {
      next[name] = expanded;
    });
    setExpandedServices((prev) => ({ ...prev, ...next }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setSaving(true);

      const byServiceLimits = Object.entries(servicePolicies).reduce((acc, [serviceName, servicePolicy]) => {
        const parsed = Number(servicePolicy.max_employees_on_leave);
        if (Number.isFinite(parsed) && parsed > 0) {
          acc[serviceName] = parsed;
        }
        return acc;
      }, {});

      const payload = {
        ...policy,
        minimum_notice_days: Number(policy.minimum_notice_days || 0),
        max_consecutive_days: Number(policy.max_consecutive_days || 0),
        conges_payes_annuels: Number(policy.conges_payes_annuels || 0),
        rtt_annuels: Number(policy.rtt_annuels || 0),
        report_max_jours: Number(policy.report_max_jours || 0),
        max_employees_on_leave: {
          global: policy.max_employees_on_leave?.global === '' ? null : Number(policy.max_employees_on_leave?.global || 0),
          by_service: byServiceLimits,
        },
        service_policies: Object.entries(servicePolicies).reduce((acc, [serviceName, servicePolicy]) => {
          acc[serviceName] = {
            overlap_policy: servicePolicy.overlap_policy,
            minimum_notice_days: Number(servicePolicy.minimum_notice_days || 0),
            max_consecutive_days: Number(servicePolicy.max_consecutive_days || 0),
            approval_workflow: servicePolicy.approval_workflow,
            max_employees_on_leave: Number(servicePolicy.max_employees_on_leave || 0),
          };
          return acc;
        }, {}),
      };

      await entreprisesService.updatePolitique(entrepriseId, payload);
      setSuccess('Politique de congé mise à jour avec succès.');
    } catch (err) {
      console.error('Erreur sauvegarde politique:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la politique.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-4 d-flex justify-content-between align-items-start align-items-sm-center flex-column flex-sm-row gap-2">
        <div>
          <h1 className="h3 mb-1">Politique de congé</h1>
          <p className="text-muted mb-0">Paramétrage de la politique de votre entreprise</p>
        </div>
      </div>

      <InfoCardInfo title="À propos de ce paramétrage">
        <p className="mb-0">Ces règles impactent la création et la validation des demandes de congé pour toute l'entreprise.</p>
      </InfoCardInfo>

      <TipCard title="Conseil">
        Définissez une politique globale, puis affinez service par service sans JSON.
      </TipCard>

      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <div className="fw-semibold mb-2">Par quoi commencer</div>
          <ol className="mb-0 ps-3">
            <li>Renseignez d'abord le workflow, le préavis et le maximum de jours consécutifs.</li>
            <li>Définissez la capacité d'absences simultanées pour éviter les conflits d'équipe.</li>
            <li>Affinez ensuite les exceptions par service et les types de congé.</li>
          </ol>
        </Card.Body>
      </Card>

      <InfoCardInfo title="Exemples rapides">
        <ul className="mb-0">
          <li>Préavis 7: une demande pour lundi doit être posée au plus tard le lundi précédent.</li>
          <li>Chevauchement "Bloquer": refuse une demande si le quota d'absents simultanés est atteint.</li>
          <li>Workflow "Manager puis Admin": validation en 2 étapes pour les absences sensibles.</li>
          <li>Max consécutif 20: une demande de 25 jours sera refusée automatiquement.</li>
        </ul>
      </InfoCardInfo>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Types de congé</strong>
            <div className="text-muted small">Ajoutez et modifiez les types disponibles dans les formulaires de demande.</div>
          </div>
          <Button type="button" variant="primary" onClick={openCreateTypeModal}>
            Ajouter un type de congé
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {congeTypes.length === 0 ? (
            <div className="p-4 text-center text-muted">Aucun type de congé configuré.</div>
          ) : (
            <div className="settings-table-wrap">
              <div className="settings-table-hint d-md-none">Glissez horizontalement pour voir toutes les colonnes.</div>
              <Table responsive hover className="mb-0 settings-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Libellé</th>
                  <th>Quota annuel</th>
                  <th>Demi-journée</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {congeTypes.map((type) => (
                  <tr key={type.id}>
                    <td><Badge bg="secondary">{type.code}</Badge></td>
                    <td>{type.libelle}</td>
                    <td>{type.quota_annuel}</td>
                    <td>{type.demi_journee_autorisee ? 'Oui' : 'Non'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button type="button" size="sm" variant="outline-primary" onClick={() => openEditTypeModal(type)}>
                          Modifier
                        </Button>
                        <Button type="button" size="sm" variant="outline-danger" onClick={() => handleDeleteCongeType(type.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Form onSubmit={handleSave}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Politique de chevauchement</Form.Label>
                  <Form.Select
                    value={policy.overlap_policy}
                    onChange={(e) => setField('overlap_policy', e.target.value)}
                  >
                    <option value="block">Bloquer</option>
                    <option value="warning">Autoriser et alerter</option>
                    <option value="allow">Autoriser</option>
                  </Form.Select>
                  <Form.Text className="text-muted">Exemple: "Bloquer" empêche une nouvelle demande quand la capacité d'absence est atteinte.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Workflow d'approbation</Form.Label>
                  <Form.Select
                    value={policy.approval_workflow}
                    onChange={(e) => setField('approval_workflow', e.target.value)}
                  >
                    <option value="manager_admin">Manager puis Admin</option>
                    <option value="admin_only">Admin uniquement</option>
                    <option value="manager_only">Manager uniquement</option>
                  </Form.Select>
                  <Form.Text className="text-muted">Exemple: "Manager puis Admin" impose une double validation.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Préavis minimum (jours)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={policy.minimum_notice_days}
                    onChange={(e) => setField('minimum_notice_days', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max jours consécutifs</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={policy.max_consecutive_days}
                    onChange={(e) => setField('max_consecutive_days', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max absences simultanées (global)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={policy.max_employees_on_leave?.global ?? ''}
                    onChange={(e) => setPolicy((prev) => ({
                      ...prev,
                      max_employees_on_leave: {
                        ...(prev.max_employees_on_leave || {}),
                        global: e.target.value,
                      },
                    }))}
                  />
                  <Form.Text className="text-muted">Exemple: 2 signifie que 2 personnes maximum peuvent être en congé au même moment.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Congés payés annuels</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={policy.conges_payes_annuels}
                    onChange={(e) => setField('conges_payes_annuels', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>RTT annuels</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={policy.rtt_annuels}
                    onChange={(e) => setField('rtt_annuels', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Report max (jours)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={policy.report_max_jours}
                    onChange={(e) => setField('report_max_jours', e.target.value)}
                    disabled={!policy.report_autorise}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                label="Autoriser le report annuel"
                checked={Boolean(policy.report_autorise)}
                onChange={(e) => setField('report_autorise', e.target.checked)}
              />
              <Form.Text className="text-muted">Exemple: activé + max 5 jours = un salarié peut reporter jusqu'à 5 jours sur l'année suivante.</Form.Text>
            </Form.Group>

            <Card className="mb-4 border-0 bg-light">
              <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">Politiques par service</div>
                  <div className="small text-muted">
                    {Object.keys(servicePolicies).length} service(s) configuré(s)
                  </div>
                  <div className="small text-muted">Le workflow défini sur un service remplace le workflow global pour ses membres.</div>
                </div>
                <Button
                  type="button"
                  variant={showServicePolicies ? 'outline-secondary' : 'primary'}
                  onClick={() => setShowServicePolicies((prev) => !prev)}
                >
                  {showServicePolicies ? 'Masquer le détail' : 'Configurer par service'}
                </Button>
              </Card.Body>
            </Card>

            {showServicePolicies && (
            <Form.Group className="mb-4">
              <Form.Label>Politiques par service</Form.Label>
              <Row className="g-2 mb-3">
                <Col md={8}>
                  <Form.Control
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Ajouter un service (ex: Support, RH, Commercial)"
                  />
                </Col>
                <Col md={4}>
                  <Button type="button" variant="outline-primary" className="w-100" onClick={addServicePolicy}>
                    Ajouter le service
                  </Button>
                </Col>
              </Row>

              {Object.keys(servicePolicies).length === 0 && (
                <Alert variant="light" className="mb-0">Aucun service paramétré.</Alert>
              )}

              {Object.keys(servicePolicies).length > 0 && (
                <Card className="mb-3 border-0 bg-light">
                  <Card.Body className="py-3">
                    <Row className="g-2 align-items-center">
                      <Col md={5}>
                        <Form.Control
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => {
                            setServiceSearch(e.target.value);
                            setVisibleServicesCount(8);
                          }}
                          placeholder="Rechercher un service"
                        />
                      </Col>
                      <Col md={3}>
                        <div className="small text-muted">
                          {filteredServiceEntries.length} service(s) affichable(s) sur {serviceEntries.length}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="d-flex gap-2 justify-content-md-end">
                          <Button
                            type="button"
                            size="sm"
                            variant={serviceViewMode === 'cards' ? 'primary' : 'outline-primary'}
                            onClick={() => setServiceViewMode('cards')}
                          >
                            Vue cartes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={serviceViewMode === 'table' ? 'primary' : 'outline-primary'}
                            onClick={() => setServiceViewMode('table')}
                          >
                            Edition rapide
                          </Button>
                          {serviceViewMode === 'cards' && (
                            <>
                              <Button type="button" size="sm" variant="outline-secondary" onClick={() => setAllServicesExpanded(true)}>
                                Tout déplier
                              </Button>
                              <Button type="button" size="sm" variant="outline-secondary" onClick={() => setAllServicesExpanded(false)}>
                                Tout replier
                              </Button>
                            </>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {serviceViewMode === 'cards' && visibleServiceEntries.map(([serviceName, servicePolicy]) => (
                <Card key={serviceName} className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <strong>{serviceName}</strong>
                      <Badge bg="secondary">Politique isolée</Badge>
                      <Badge bg="light" text="dark">{servicePolicy.approval_workflow === 'admin_only' ? 'Admin uniquement' : servicePolicy.approval_workflow === 'manager_only' ? 'Manager uniquement' : 'Manager puis Admin'}</Badge>
                      <Badge bg="light" text="dark">Préavis: {servicePolicy.minimum_notice_days ?? 0}j</Badge>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Button type="button" size="sm" variant="outline-secondary" onClick={() => toggleServiceExpanded(serviceName)}>
                        {expandedServices[serviceName] ? 'Replier' : 'Déplier'}
                      </Button>
                      <Button type="button" size="sm" variant="outline-danger" onClick={() => removeServicePolicy(serviceName)}>
                        Supprimer
                      </Button>
                    </div>
                  </Card.Header>
                  {expandedServices[serviceName] && (
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Chevauchement</Form.Label>
                          <Form.Select
                            value={servicePolicy.overlap_policy || 'block'}
                            onChange={(e) => setServiceField(serviceName, 'overlap_policy', e.target.value)}
                          >
                            <option value="block">Bloquer</option>
                            <option value="warning">Autoriser et alerter</option>
                            <option value="allow">Autoriser</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Workflow</Form.Label>
                          <Form.Select
                            value={servicePolicy.approval_workflow || 'manager_admin'}
                            onChange={(e) => setServiceField(serviceName, 'approval_workflow', e.target.value)}
                          >
                            <option value="manager_admin">Manager puis Admin</option>
                            <option value="manager_only">Manager uniquement</option>
                            <option value="admin_only">Admin uniquement</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Préavis min</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={servicePolicy.minimum_notice_days ?? 0}
                            onChange={(e) => setServiceField(serviceName, 'minimum_notice_days', e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Max consécutif</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            value={servicePolicy.max_consecutive_days ?? 365}
                            onChange={(e) => setServiceField(serviceName, 'max_consecutive_days', e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Max absences simultanées</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={servicePolicy.max_employees_on_leave ?? 0}
                            onChange={(e) => setServiceField(serviceName, 'max_employees_on_leave', e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                  )}
                </Card>
              ))}

              {serviceViewMode === 'table' && visibleServiceEntries.length > 0 && (
                <Card className="mb-3">
                  <Card.Body className="p-0">
                    <div className="settings-table-wrap">
                      <div className="settings-table-hint d-md-none">Glissez horizontalement pour éditer les colonnes.</div>
                      <Table responsive hover className="mb-0 align-middle settings-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: '180px' }}>Service</th>
                          <th style={{ minWidth: '160px' }}>Chevauchement</th>
                          <th style={{ minWidth: '180px' }}>Workflow</th>
                          <th style={{ minWidth: '110px' }}>Préavis</th>
                          <th style={{ minWidth: '120px' }}>Max consécutif</th>
                          <th style={{ minWidth: '150px' }}>Max simultanées</th>
                          <th style={{ minWidth: '110px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleServiceEntries.map(([serviceName, servicePolicy]) => (
                          <tr key={serviceName}>
                            <td>
                              <div className="fw-semibold">{serviceName}</div>
                            </td>
                            <td>
                              <Form.Select
                                size="sm"
                                value={servicePolicy.overlap_policy || 'block'}
                                onChange={(e) => setServiceField(serviceName, 'overlap_policy', e.target.value)}
                              >
                                <option value="block">Bloquer</option>
                                <option value="warning">Autoriser et alerter</option>
                                <option value="allow">Autoriser</option>
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Select
                                size="sm"
                                value={servicePolicy.approval_workflow || 'manager_admin'}
                                onChange={(e) => setServiceField(serviceName, 'approval_workflow', e.target.value)}
                              >
                                <option value="manager_admin">Manager puis Admin</option>
                                <option value="manager_only">Manager uniquement</option>
                                <option value="admin_only">Admin uniquement</option>
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="number"
                                min="0"
                                value={servicePolicy.minimum_notice_days ?? 0}
                                onChange={(e) => setServiceField(serviceName, 'minimum_notice_days', e.target.value)}
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="number"
                                min="1"
                                value={servicePolicy.max_consecutive_days ?? 365}
                                onChange={(e) => setServiceField(serviceName, 'max_consecutive_days', e.target.value)}
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="number"
                                min="0"
                                value={servicePolicy.max_employees_on_leave ?? 0}
                                onChange={(e) => setServiceField(serviceName, 'max_employees_on_leave', e.target.value)}
                              />
                            </td>
                            <td>
                              <Button type="button" size="sm" variant="outline-danger" onClick={() => removeServicePolicy(serviceName)}>
                                Supprimer
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {filteredServiceEntries.length > visibleServicesCount && (
                <div className="d-grid">
                  <Button
                    type="button"
                    variant="outline-primary"
                    onClick={() => setVisibleServicesCount((prev) => prev + 8)}
                  >
                    Afficher 8 services de plus
                  </Button>
                </div>
              )}

              {Object.keys(servicePolicies).length > 0 && filteredServiceEntries.length === 0 && (
                <Alert variant="light" className="mb-0">Aucun service ne correspond à votre recherche.</Alert>
              )}
            </Form.Group>
            )}

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-top pt-3 mt-4">
              <small className="text-muted">Les modifications sont prises en compte après enregistrement.</small>
              <div className="d-grid d-sm-block">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* ── Fuseau horaire ─────────────────────────────────────────── */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Fuseau horaire de l'entreprise</h5>
        </Card.Header>
        <Card.Body>
          {tzError && <Alert variant="danger" dismissible onClose={() => setTzError('')}>{tzError}</Alert>}
          {tzSuccess && <Alert variant="success" dismissible onClose={() => setTzSuccess('')}>{tzSuccess}</Alert>}

          <p className="text-muted small mb-3">
            Ce fuseau horaire est utilisé pour l'affichage des dates et heures dans les notifications et les exports.
          </p>

          <Form onSubmit={handleSaveTimezone}>
            <Row className="align-items-end g-3">
              <Col md={6}>
                <Form.Group controlId="timezoneSelect">
                  <Form.Label className="fw-semibold">Fuseau horaire</Form.Label>
                  {(() => {
                    const groups = [...new Set(TIMEZONE_OPTIONS.map((o) => o.group))];
                    return (
                      <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                        {groups.map((group) => (
                          <optgroup key={group} label={group}>
                            {TIMEZONE_OPTIONS.filter((o) => o.group === group).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Form.Select>
                    );
                  })()}
                </Form.Group>
              </Col>

              {tzPreview && (
                <Col md={6}>
                  <div className="border rounded p-3 bg-light font-monospace small">
                    <div className="fw-bold">{tzPreview.timeLine}</div>
                    <div className="text-muted">{tzPreview.dateLine}</div>
                    <div className="text-muted">{tzPreview.tzLine}</div>
                  </div>
                </Col>
              )}
            </Row>

            <div className="d-flex justify-content-end mt-3">
              <Button type="submit" disabled={savingTz}>
                {savingTz ? 'Enregistrement...' : 'Enregistrer le fuseau horaire'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={showTypeModal} onHide={closeTypeModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingTypeId ? 'Modifier le type de congé' : 'Ajouter un type de congé'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveCongeType}>
          <Modal.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Code</Form.Label>
                  <Form.Control
                    type="text"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: CP"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Libellé</Form.Label>
                  <Form.Control
                    type="text"
                    value={typeForm.libelle}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, libelle: e.target.value }))}
                    placeholder="Ex: Congés payés"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Quota annuel</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.5"
                value={typeForm.quota_annuel}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, quota_annuel: e.target.value }))}
              />
            </Form.Group>

            <Form.Check
              type="switch"
              label="Autoriser les demi-journées"
              checked={Boolean(typeForm.demi_journee_autorisee)}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, demi_journee_autorisee: e.target.checked }))}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={closeTypeModal}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={savingType}>
              {savingType ? 'Enregistrement...' : editingTypeId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PolitiqueCongesPage;
