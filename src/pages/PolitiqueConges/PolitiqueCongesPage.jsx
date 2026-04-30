import './politique-conges.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Spinner, Table, Modal } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { entreprisesService, usersService, congeTypesService } from '../../services/api';
import leavePoliciesAPI from '../../services/leavePoliciesAPI';
import { useAlert, useConfirmation } from '../../hooks/useAlert';
import AsyncButton from '../../components/AsyncButton';
import SectionTabs from './components/SectionTabs';
import GeneralRulesSection from './components/GeneralRulesSection';
import CancellationSection from './components/CancellationSection';
import TimezoneSection from './components/TimezoneSection';

const DEFAULT_POLICY = {
  overlap_policy: 'block',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  approval_workflow: 'manager_admin',
  allow_employee_cancel_own_pending: true,
  allow_manager_cancel_own_pending: true,
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

const DEFAULT_LEAVE_POLICY = {
  allow_modify_validated: false,
  allow_cancel_validated: false,
  min_notice_days: 0,
  max_backdate_days: 0,
  require_manager_approval: true,
  require_admin_approval: true,
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
  const { confirm } = useConfirmation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const alert = useAlert();
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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [savingTz, setSavingTz] = useState(false);
  const [tzError, setTzError] = useState('');
  const [tzSuccess, setTzSuccess] = useState('');
  const [leavePolicy, setLeavePolicy] = useState(DEFAULT_LEAVE_POLICY);
  const [activeSection, setActiveSection] = useState('all');

  const entrepriseId = user?.entreprise_id;

  useEffect(() => {
    const loadPolicy = async () => {
      if (!entrepriseId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [policyResponse, usersResponse, typesResponse, parametresResponse, leavePolicyResponse] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          usersService.getAll(),
          congeTypesService.getAll({ entreprise_id: entrepriseId }),
          entreprisesService.getParametres(entrepriseId).catch(() => null),
          leavePoliciesAPI.getPolicy().catch(() => null),
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
        setLeavePolicy({
          ...DEFAULT_LEAVE_POLICY,
          ...(leavePolicyResponse || {}),
        });
        setCongeTypes(types.sort((a, b) => String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr')));
        if (parametresResponse?.data?.parametres?.timezone) {
          setTimezone(parametresResponse.data.parametres.timezone);
        }
      } catch (err) {
        console.error('Erreur chargement politique:', err);
        alert.error('Impossible de charger la politique de congé de votre entreprise.');
      } finally {
        setLoading(false);
      }
    };

    loadPolicy();
  }, [entrepriseId]);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  useEffect(() => {
    if (!tzError) return;
    alert.showErrorModal(tzError, { title: 'Erreur', autoCloseMs: 0 });
    setTzError('');
  }, [tzError, alert]);

  useEffect(() => {
    if (!tzSuccess) return;
    alert.showSuccessModal(tzSuccess, { autoCloseMs: 4000 });
    setTzSuccess('');
  }, [tzSuccess, alert]);

  const setField = (name, value) => {
    setPolicy((prev) => ({ ...prev, [name]: value }));
  };

  const isSectionVisible = (section) => activeSection === 'all' || activeSection === section;

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
        alert.error('Le code et le libellé du type de congé sont requis.');
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
      alert.error(err.response?.data?.message || 'Erreur lors de la sauvegarde du type de congé.');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteCongeType = async (typeId) => {
    const targetType = congeTypes.find(t => t.id === typeId);
    confirm({
      title: 'Supprimer ce type de congé ?',
      description: `Êtes-vous sûr de vouloir supprimer "${targetType?.libelle}" ? Cette action est irréversible et affectera les historiques.`,
      confirmLabel: 'Supprimer définitivement',
      cancelLabel: 'Annuler',
      danger: true,
      onConfirm: async () => {
        try {
          setSuccess('');
          await congeTypesService.delete(typeId);
          await refreshCongeTypes();
          alert.success('Type de congé supprimé avec succès.');
        } catch (err) {
          console.error('Erreur suppression type de congé:', err);
          alert.error(err.response?.data?.message || 'Erreur lors de la suppression du type de congé.');
        }
      }
    });
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
      await leavePoliciesAPI.updatePolicy({
        allow_modify_validated: Boolean(leavePolicy.allow_modify_validated),
        allow_cancel_validated: Boolean(leavePolicy.allow_cancel_validated),
        min_notice_days: Number(leavePolicy.min_notice_days || 0),
        max_backdate_days: Number(leavePolicy.max_backdate_days || 0),
        require_manager_approval: Boolean(leavePolicy.require_manager_approval),
        require_admin_approval: Boolean(leavePolicy.require_admin_approval),
      });
      setSuccess('Politique de congé mise à jour avec succès.');
    } catch (err) {
      console.error('Erreur sauvegarde politique:', err);
      alert.error(err.response?.data?.message || 'Erreur lors de la sauvegarde de la politique.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!entrepriseId) {
    return (
      <Container fluid="sm">
        <div className="alert alert-warning text-center mt-4">
          Aucune entreprise associée à votre compte. Accédez à la politique de congés depuis la gestion des entreprises.
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Politique de congé</span>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => setShowInfoModal(true)}>Info</Button>
        </div>
      </div>

      <SectionTabs
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {isSectionVisible('types') && (
      <Card id="section-types-conge" className="mb-4">
        <Card.Header className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
          <div>
            <strong>Types de congé</strong>
            <div className="text-muted small">Ajoutez et modifiez les types disponibles dans les formulaires de demande.</div>
          </div>
          <Button type="button" variant="primary" onClick={openCreateTypeModal} className="w-100 w-md-auto">
            Ajouter un type de congé
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {congeTypes.length === 0 ? (
            <div className="p-4 text-center text-muted">Aucun type de congé configuré.</div>
          ) : (
            <>
              <div className="d-md-none mobile-card-list px-3 py-2">
                {congeTypes.map((type) => (
                  <div key={`mobile-type-${type.id}`} className="mobile-card-list__item">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-semibold">{type.libelle}</div>
                        <div className="small text-muted">Quota annuel: {type.quota_annuel}</div>
                      </div>
                      <span className="badge info">{type.code}</span>
                    </div>
                    <div className="mb-3">
                      <span className={`badge ${type.demi_journee_autorisee ? 'approved' : 'info'}`}>
                        {type.demi_journee_autorisee ? 'Demi-journée autorisée' : 'Demi-journée non autorisée'}
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <Button type="button" size="sm" variant="outline-primary" className="flex-fill" onClick={() => openEditTypeModal(type)}>
                        Modifier
                      </Button>
                      <Button type="button" size="sm" variant="outline-danger" className="flex-fill" onClick={() => handleDeleteCongeType(type.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="settings-table-wrap d-none d-md-block">
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
                        <td><span className="badge info">{type.code}</span></td>
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
            </>
          )}
        </Card.Body>
      </Card>
      )}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSave}>
            {isSectionVisible('general') && (
              <GeneralRulesSection
                policy={policy}
                setField={setField}
                setPolicy={setPolicy}
              />
            )}

            {isSectionVisible('cancellation') && (
              <CancellationSection
                policy={policy}
                setField={setField}
                leavePolicy={leavePolicy}
                setLeavePolicy={setLeavePolicy}
              />
            )}

            {isSectionVisible('services') && (
            <div id="section-politiques-services">
            <Card className="mb-4">
              <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">Politiques par service</div>
                  <div className="small text-muted">{Object.keys(servicePolicies).length} service(s)</div>
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
                <div className="alert alert-light mb-0" role="status">Aucun service paramétré.</div>
              )}

              {Object.keys(servicePolicies).length > 0 && (
                <Card className="mb-3">
                  <Card.Body className="py-3">
                    <Row className="g-2 align-items-center">
                      <Col xs={12} md={5}>
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
                      <Col xs={12} sm={6} md={3}>
                        <div className="small text-muted">
                          {filteredServiceEntries.length}/{serviceEntries.length}
                        </div>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <div className="d-flex gap-2 flex-wrap justify-content-md-end">
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
                      <span className="badge info">Politique isolée</span>
                      <span className="badge info">{servicePolicy.approval_workflow === 'admin_only' ? 'Admin uniquement' : servicePolicy.approval_workflow === 'manager_only' ? 'Manager uniquement' : 'Manager puis Admin'}</span>
                      <span className="badge info">Préavis: {servicePolicy.minimum_notice_days ?? 0}j</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 w-100 w-sm-auto">
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
                          <th className="th-col-service">Service</th>
                          <th className="th-col-overlap">Chevauchement</th>
                          <th className="th-col-workflow">Workflow</th>
                          <th className="th-col-notice">Préavis</th>
                          <th className="th-col-consec">Max consécutif</th>
                          <th className="th-col-simul">Max simultanées</th>
                          <th className="th-col-actions">Actions</th>
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
                <div className="alert alert-light mb-0" role="status">Aucun service ne correspond à votre recherche.</div>
              )}
            </Form.Group>
            )}
            </div>
            )}

            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-top pt-3 mt-4">
              <small className="text-muted">Les modifications sont prises en compte après enregistrement.</small>
              <div className="d-grid w-100 w-sm-auto">
                <AsyncButton
                  type="submit"
                  isLoading={saving}
                  showSpinner={saving}
                  loadingText="Enregistrement..."
                  className="w-100"
                >
                  Enregistrer les modifications
                </AsyncButton>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* ── Fuseau horaire ─────────────────────────────────────────── */}
      {isSectionVisible('timezone') && (
        <TimezoneSection
          timezone={timezone}
          setTimezone={setTimezone}
          tzPreview={tzPreview}
          savingTz={savingTz}
          handleSaveTimezone={handleSaveTimezone}
          timezoneOptions={TIMEZONE_OPTIONS}
        />
      )}

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Info politique</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-0">
            <li>Réglez d'abord workflow, préavis et max consécutif.</li>
            <li>Ensuite ajustez les services si nécessaire.</li>
            <li>Enregistrez pour appliquer.</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showTypeModal} onHide={closeTypeModal} centered>
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
            <AsyncButton
              type="submit"
              variant="primary"
              isLoading={savingType}
              showSpinner={savingType}
              loadingText="Enregistrement..."
            >
              {editingTypeId ? 'Mettre à jour' : 'Créer'}
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PolitiqueCongesPage;
