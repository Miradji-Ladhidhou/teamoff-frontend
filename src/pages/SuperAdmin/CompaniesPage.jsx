import './companies.css';

const PROTECTED_COMPANY_NAME = 'TeamOff';
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaDownload, FaInfoCircle, FaUserTie } from 'react-icons/fa';
import * as api from '../../services/api';
import leavePoliciesAPI from '../../services/leavePoliciesAPI';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const DEFAULT_PARAMETRES = {
  timezone: 'Europe/Paris',
  notifications_email: true,
};

const DEFAULT_LEAVE_POLICY = {
  allow_modify_validated: false,
  allow_cancel_validated: false,
  min_notice_days: 0,
  require_manager_approval: true,
  require_admin_approval: false,
};

const DEFAULT_POLITIQUE = {
  conges_payes_annuels: 25,
  rtt_annuels: 0,
  report_autorise: false,
  report_max_jours: 0,
  overlap_behavior: 'block',
  max_employees_on_leave: {
    by_service: {}
  },
  approval_workflow: 'manager_admin',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  notification_settings: {
    on_create: true,
    on_validate: true,
    on_reject: true,
  }
};

const TIMEZONE_OPTIONS = [
  'Indian/Reunion',
  'Europe/Paris',
  'UTC',
  'Africa/Casablanca',
  'Africa/Abidjan',
  'America/Montreal',
];

const DEFAULT_FORM = {
  nom: '',
  statut: 'active',
  politique_conges: DEFAULT_POLITIQUE,
  parametres: DEFAULT_PARAMETRES,
};

const normalizeByServiceLimits = (byService = {}) => {
  const normalized = {};

  Object.entries(byService || {}).forEach(([service, rawLimit]) => {
    const serviceName = String(service || '').trim();
    if (!serviceName) {
      return;
    }

    if (rawLimit === '' || rawLimit === null || typeof rawLimit === 'undefined') {
      return;
    }

    const numericLimit = Number(rawLimit);
    if (Number.isFinite(numericLimit) && numericLimit >= 0) {
      normalized[serviceName] = numericLimit;
    }
  });

  return normalized;
};

const CompaniesManagement = () => {
  const alert = useAlert();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Fix #57 : confirmation forte avant suppression (re-saisie du nom)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [success, setSuccess] = useState('');
  const [adminData, setAdminData] = useState({ prenom: '', nom: '', email: '' });
  const [leavePolicy, setLeavePolicy] = useState(DEFAULT_LEAVE_POLICY);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [advancedParametresJson, setAdvancedParametresJson] = useState(JSON.stringify(DEFAULT_PARAMETRES, null, 2));
  const [advancedPolitiqueJson, setAdvancedPolitiqueJson] = useState(JSON.stringify(DEFAULT_POLITIQUE, null, 2));
  const [showReportValidation, setShowReportValidation] = useState(false);
  const [activeCompanyActionId, setActiveCompanyActionId] = useState(null);
  const submitAction = useAsyncAction();
  const exportAction = useAsyncAction();
  const deleteAction = useAsyncAction();

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.entreprisesService.getAll();
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      console.error('Erreur chargement entreprises:', loadError);
      alert.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setAdminData({ prenom: '', nom: '', email: '' });
    setLeavePolicy(DEFAULT_LEAVE_POLICY);
    setShowAdvancedJson(false);
    setShowReportValidation(false);
    setAdvancedParametresJson(JSON.stringify(DEFAULT_PARAMETRES, null, 2));
    setAdvancedPolitiqueJson(JSON.stringify(DEFAULT_POLITIQUE, null, 2));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await submitAction.run(async () => {
      try {

        const parametres = showAdvancedJson
          ? JSON.parse(advancedParametresJson || '{}')
          : {
              timezone: formData.parametres.timezone,
              notifications_email: formData.parametres.notifications_email,
            };

        const politiqueConges = showAdvancedJson
          ? JSON.parse(advancedPolitiqueJson || '{}')
          : {
              conges_payes_annuels: Number(formData.politique_conges.conges_payes_annuels || 0),
              rtt_annuels: Number(formData.politique_conges.rtt_annuels || 0),
              report_autorise: Boolean(formData.politique_conges.report_autorise),
              report_max_jours: Number(formData.politique_conges.report_max_jours || 0),
              overlap_behavior: formData.politique_conges.overlap_behavior || 'block',
              max_employees_on_leave: {
                by_service: normalizeByServiceLimits(formData.politique_conges.max_employees_on_leave.by_service || {}),
              },
              approval_workflow: formData.politique_conges.approval_workflow,
              minimum_notice_days: Number(formData.politique_conges.minimum_notice_days || 0),
              max_consecutive_days: Number(formData.politique_conges.max_consecutive_days || 365),
              notification_settings: {
                on_create: Boolean(formData.politique_conges.notification_settings.on_create),
                on_validate: Boolean(formData.politique_conges.notification_settings.on_validate),
                on_reject: Boolean(formData.politique_conges.notification_settings.on_reject),
              }
            };

        if (!showAdvancedJson) {
          if (!String(parametres.timezone || '').trim()) {
            throw new Error('La timezone est obligatoire');
          }
          if (politiqueConges.report_autorise && politiqueConges.report_max_jours <= 0) {
            setShowReportValidation(true);
            throw new Error('Si le report est autorisé, le maximum de jours reportables doit être supérieur à 0');
          }
        }

        const payload = {
          nom: formData.nom,
          statut: formData.statut,
          politique_conges: politiqueConges,
          parametres,
        };

        if (editingCompany) {
          await api.entreprisesService.update(editingCompany.id, payload);
          await leavePoliciesAPI.updatePolicy({
            allow_modify_validated: Boolean(leavePolicy.allow_modify_validated),
            allow_cancel_validated: Boolean(leavePolicy.allow_cancel_validated),
            min_notice_days: Number(leavePolicy.min_notice_days) || 0,
            require_manager_approval: Boolean(leavePolicy.require_manager_approval),
            require_admin_approval: Boolean(leavePolicy.require_admin_approval),
          }, editingCompany.id);
          setSuccess('Entreprise mise a jour avec succes');
        } else {
          const created = await api.entreprisesService.create(payload);
          const entrepriseId = created.data?.id;

          const hasAdminEmail = adminData.email.trim();
          const hasAdminPrenom = adminData.prenom.trim();
          const hasAdminNom = adminData.nom.trim();
          const hasAdmin = hasAdminEmail && hasAdminPrenom && hasAdminNom;

          if (hasAdminEmail && !hasAdmin) {
            throw new Error('Le formulaire administrateur est incomplet. Renseignez le prénom, le nom et l\'email, ou laissez tous les champs vides.');
          }

          if (hasAdmin && entrepriseId) {
            await api.usersService.create({
              prenom: adminData.prenom.trim(),
              nom: adminData.nom.trim(),
              email: adminData.email.trim(),
              role: 'admin_entreprise',
              entreprise_id: entrepriseId,
            });
            setSuccess(`Entreprise créée et invitation envoyée à ${adminData.email.trim()}`);
          } else {
            setSuccess('Entreprise creee avec succes');
          }
        }

        setShowModal(false);
        setEditingCompany(null);
        resetForm();
        loadCompanies();
      } catch (submitError) {
        console.error('Erreur sauvegarde entreprise:', submitError);
        alert.error(
          submitError instanceof SyntaxError
            ? 'Les champs JSON sont invalides'
            : submitError?.message || 'Erreur lors de la sauvegarde'
        );
      }
    });
  };

  const handleEdit = async (company) => {
    const companyParametres = company.parametres || {};
    const companyPolitique = company.politique_conges || {};

    setEditingCompany(company);
    setFormData({
      nom: company.nom || '',
      statut: company.statut || 'active',
      parametres: {
        timezone: companyParametres.timezone || DEFAULT_PARAMETRES.timezone,
        notifications_email: typeof companyParametres.notifications_email === 'boolean'
          ? companyParametres.notifications_email
          : DEFAULT_PARAMETRES.notifications_email,
      },
      politique_conges: {
        conges_payes_annuels: companyPolitique.conges_payes_annuels ?? DEFAULT_POLITIQUE.conges_payes_annuels,
        rtt_annuels: companyPolitique.rtt_annuels ?? DEFAULT_POLITIQUE.rtt_annuels,
        report_autorise: typeof companyPolitique.report_autorise === 'boolean'
          ? companyPolitique.report_autorise
          : DEFAULT_POLITIQUE.report_autorise,
        report_max_jours: companyPolitique.report_max_jours ?? DEFAULT_POLITIQUE.report_max_jours,
        overlap_behavior: companyPolitique.overlap_behavior || DEFAULT_POLITIQUE.overlap_behavior,
        max_employees_on_leave: {
          by_service: companyPolitique.max_employees_on_leave?.by_service || DEFAULT_POLITIQUE.max_employees_on_leave.by_service,
        },
        approval_workflow: companyPolitique.approval_workflow || DEFAULT_POLITIQUE.approval_workflow,
        minimum_notice_days: companyPolitique.minimum_notice_days ?? DEFAULT_POLITIQUE.minimum_notice_days,
        max_consecutive_days: companyPolitique.max_consecutive_days ?? DEFAULT_POLITIQUE.max_consecutive_days,
        notification_settings: {
          on_create: companyPolitique.notification_settings?.on_create ?? DEFAULT_POLITIQUE.notification_settings.on_create,
          on_validate: companyPolitique.notification_settings?.on_validate ?? DEFAULT_POLITIQUE.notification_settings.on_validate,
          on_reject: companyPolitique.notification_settings?.on_reject ?? DEFAULT_POLITIQUE.notification_settings.on_reject,
        },
      },
    });
    setAdvancedParametresJson(JSON.stringify(companyParametres, null, 2));
    setAdvancedPolitiqueJson(JSON.stringify(companyPolitique, null, 2));
    setShowAdvancedJson(false);

    leavePoliciesAPI.getPolicy(company.id)
      .then((pol) => pol && setLeavePolicy({ ...DEFAULT_LEAVE_POLICY, ...pol }))
      .catch(() => setLeavePolicy(DEFAULT_LEAVE_POLICY));

    setShowModal(true);
  };

  const handleParametreChange = (key, value) => {
    setFormData((previous) => ({
      ...previous,
      parametres: {
        ...previous.parametres,
        [key]: value,
      },
    }));
  };

  const handlePolitiqueChange = (key, value) => {
    setFormData((previous) => ({
      ...previous,
      politique_conges: {
        ...previous.politique_conges,
        [key]: value,
      },
    }));

    if (key === 'report_autorise' && !value) {
      setShowReportValidation(false);
      setFormData((previous) => ({
        ...previous,
        politique_conges: {
          ...previous.politique_conges,
          report_max_jours: 0,
        },
      }));
    }
  };

  const handleNestedPolitiqueChange = (parentKey, key, value) => {
    setFormData((previous) => ({
      ...previous,
      politique_conges: {
        ...previous.politique_conges,
        [parentKey]: {
          ...previous.politique_conges[parentKey],
          [key]: value,
        },
      },
    }));
  };

  const handleAdvancedModeToggle = (enabled) => {
    setShowAdvancedJson(enabled);

    if (enabled) {
      setAdvancedParametresJson(JSON.stringify(formData.parametres || {}, null, 2));
      setAdvancedPolitiqueJson(JSON.stringify(formData.politique_conges || {}, null, 2));
    }
  };

  const handleServiceLimitChange = (serviceName, value) => {
    setFormData((previous) => ({
      ...previous,
      politique_conges: {
        ...previous.politique_conges,
        max_employees_on_leave: {
          ...previous.politique_conges.max_employees_on_leave,
          by_service: {
            ...(previous.politique_conges.max_employees_on_leave.by_service || {}),
            [serviceName]: value,
          },
        },
      },
    }));
  };

  const handleRemoveServiceLimit = (serviceName) => {
    setFormData((previous) => {
      const currentByService = { ...(previous.politique_conges.max_employees_on_leave.by_service || {}) };
      delete currentByService[serviceName];

      return {
        ...previous,
        politique_conges: {
          ...previous.politique_conges,
          max_employees_on_leave: {
            ...previous.politique_conges.max_employees_on_leave,
            by_service: currentByService,
          },
        },
      };
    });
  };

  const handleDelete = (companyId) => {
    const targetCompany = companies.find(c => c.id === companyId);
    if (!targetCompany) return;
    setDeleteTarget({ id: companyId, nom: targetCompany.nom });
    setDeleteConfirmInput('');
  };

  const handleDeleteExecute = async () => {
    if (!deleteTarget) return;
    await deleteAction.run(async () => {
      setActiveCompanyActionId(deleteTarget.id);
      try {
        await api.entreprisesService.delete(deleteTarget.id);
        setDeleteTarget(null);
        setDeleteConfirmInput('');
        alert.success('Entreprise supprimée avec succès');
        loadCompanies();
      } catch (deleteError) {
        console.error('Erreur suppression entreprise:', deleteError);
        alert.error(deleteError.response?.data?.message || 'Erreur lors de la suppression');
      } finally {
        setActiveCompanyActionId(null);
      }
    });
  };

  const handleExportCsv = async () => {
    await exportAction.run(async () => {
      try {
        const response = await api.exportsService.exportEntreprisesCSV();
        const blob = new Blob([response.data], { type: 'text/csv; charset=utf-16le' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `entreprises_${date}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (exportError) {
        console.error('Erreur export entreprises CSV:', exportError);
        alert.error(exportError.response?.data?.message || 'Erreur lors de l\'export CSV des entreprises');
      }
    });
  };

  const exportLoading = exportAction.isRunning;

  const filteredCompanies = companies.filter((company) =>
    !searchTerm || company.nom === searchTerm
  );

  if (loading) {
    return (
      <Container fluid="sm">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des entreprises...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Gestion des Entreprises</span>
        <div className="d-flex gap-2">
          <AsyncButton
            variant="outline-secondary"
            onClick={handleExportCsv}
            action={exportAction}
            loadingText="..."
            title="Exporter CSV"
          >
            <FaDownload />
            <span className="d-none d-sm-inline ms-2">Exporter CSV</span>
          </AsyncButton>
          <Button
            variant="primary"
            onClick={() => {
              setEditingCompany(null);
              resetForm();
              setShowModal(true);
            }}
            title="Nouvelle Entreprise"
          >
            <FaPlus />
            <span className="d-none d-sm-inline ms-2">Nouvelle Entreprise</span>
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <div className="users-filter-bar">
            <Form.Select
              className="users-filter-bar__search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            >
              <option value="">Toutes les entreprises</option>
              {companies.map((c) => (
                <option key={c.id} value={c.nom}>{c.nom}</option>
              ))}
            </Form.Select>
            <span className="badge info users-filter-bar__count">
              {filteredCompanies.length} entreprise{filteredCompanies.length > 1 ? 's' : ''}
            </span>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>

          {/* ── Mobile : cartes ── */}
          <div className="d-md-none mobile-card-list">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="mobile-card-list__item">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <div className="fw-semibold">{company.nom}</div>
                    <span className={`badge mt-1 ${company.statut === 'active' ? 'approved' : company.statut === 'suspendue' ? 'pending' : 'info'}`}>
                      {(company.statut || 'inactive').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-2">
                  <Button variant="outline-primary" size="sm" className="flex-grow-1 justify-content-center" onClick={() => handleEdit(company)}>
                    <FaEdit className="me-1" /> Modifier
                  </Button>
                  {company.nom !== PROTECTED_COMPANY_NAME && (
                    <AsyncButton
                      variant="outline-danger"
                      size="sm"
                      className="flex-grow-1 justify-content-center"
                      onClick={() => handleDelete(company.id)}
                      isLoading={deleteAction.isRunning && activeCompanyActionId === company.id}
                      showSpinner={deleteAction.showSpinner && activeCompanyActionId === company.id}
                      loadingText="..."
                      disabled={deleteAction.isRunning && activeCompanyActionId !== company.id}
                    >
                      <FaTrash className="me-1" /> Supprimer
                    </AsyncButton>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop : tableau ── */}
          <div className="d-none d-md-block">
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Statut</th>
                  <th>Workflow</th>
                  <th>Timezone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td><strong>{company.nom}</strong></td>
                    <td>
                      <span className={`badge ${company.statut === 'active' ? 'approved' : company.statut === 'suspendue' ? 'pending' : 'info'}`}>
                        {(company.statut || 'inactive').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <small className="text-muted d-block">{
                        { manager_admin: 'Manager + Admin', manager_only: 'Manager seul', admin_only: 'Admin seul', auto: 'Auto' }[company.politique_conges?.approval_workflow] || company.politique_conges?.approval_workflow || '—'
                      }</small>
                    </td>
                    <td><small className="text-muted">{company.parametres?.timezone || '—'}</small></td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button variant="outline-primary" size="sm" onClick={() => handleEdit(company)} title="Modifier">
                          <FaEdit />
                        </Button>
                        {company.nom !== PROTECTED_COMPANY_NAME && (
                          <AsyncButton
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(company.id)}
                            title="Supprimer"
                            isLoading={deleteAction.isRunning && activeCompanyActionId === company.id}
                            showSpinner={deleteAction.showSpinner && activeCompanyActionId === company.id}
                            loadingText=""
                            disabled={deleteAction.isRunning && activeCompanyActionId !== company.id}
                          >
                            <FaTrash />
                          </AsyncButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-4">
              <FaBuilding size={48} className="text-muted mb-3" />
              <h5>Aucune entreprise trouvée</h5>
              <p className="text-muted">
                {searchTerm ? 'Aucune entreprise ne correspond à votre recherche.' : 'Commencez par créer votre première entreprise.'}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" keyboard={!submitAction.isRunning} centered>
        <Modal.Header closeButton={!submitAction.isRunning}>
          <Modal.Title>{editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom de l'entreprise *</Form.Label>
                  <Form.Control type="text" value={formData.nom} onChange={(event) => setFormData({ ...formData, nom: event.target.value })} required disabled={submitAction.isRunning} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select value={formData.statut} onChange={(event) => setFormData({ ...formData, statut: event.target.value })} disabled={submitAction.isRunning}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspendue">Suspendue</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3 d-flex align-items-center justify-content-between">
                  <Form.Label className="mb-0">Mode avancé JSON</Form.Label>
                  <Form.Check
                    type="switch"
                    id="advanced-json-switch"
                    checked={showAdvancedJson}
                    onChange={(event) => handleAdvancedModeToggle(event.target.checked)}
                    label={showAdvancedJson ? 'Actif' : 'Inactif'}
                    disabled={submitAction.isRunning}
                  />
                </Form.Group>
              </Col>
            </Row>

            {!showAdvancedJson && (
              <>
                <Card className="mb-3 border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-3">Paramètres</h6>
                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Timezone{' '}
                            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-timezone">Fuseau horaire utilisé pour les dates et notifications.</Tooltip>}>
                              <span className="text-muted" role="button"><FaInfoCircle size={12} /></span>
                            </OverlayTrigger>
                          </Form.Label>
                          <Form.Select
                            value={formData.parametres.timezone}
                            onChange={(event) => handleParametreChange('timezone', event.target.value)}
                            disabled={submitAction.isRunning}
                          >
                            {TIMEZONE_OPTIONS.map((timezone) => (
                              <option key={timezone} value={timezone}>{timezone}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Emails</Form.Label>
                          <Form.Check
                            type="switch"
                            id="notifications-email-switch"
                            checked={Boolean(formData.parametres.notifications_email)}
                            onChange={(event) => handleParametreChange('notifications_email', event.target.checked)}
                            label={formData.parametres.notifications_email ? 'Actifs' : 'Inactifs'}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="mb-3 border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-3">Politique de congés</h6>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Workflow validation</Form.Label>
                          <Form.Select
                            value={formData.politique_conges.approval_workflow}
                            onChange={(event) => handlePolitiqueChange('approval_workflow', event.target.value)}
                            disabled={submitAction.isRunning}
                          >
                            <option value="manager_admin">Manager + Admin (2 étapes)</option>
                            <option value="manager_only">Manager seul</option>
                            <option value="admin_only">Admin seul</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Si capacité service atteinte</Form.Label>
                          <Form.Select
                            value={formData.politique_conges.overlap_behavior || 'block'}
                            onChange={(event) => handlePolitiqueChange('overlap_behavior', event.target.value)}
                            disabled={submitAction.isRunning}
                          >
                            <option value="block">Bloquer</option>
                            <option value="warning">Alerter</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Délai mini (jours)</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={formData.politique_conges.minimum_notice_days}
                            onChange={(event) => handlePolitiqueChange('minimum_notice_days', event.target.value)}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Max jours consécutifs</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            value={formData.politique_conges.max_consecutive_days}
                            onChange={(event) => handlePolitiqueChange('max_consecutive_days', event.target.value)}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Congés payés annuels{' '}
                            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-conges-payes">Quota annuel de congés payés pour les employés.</Tooltip>}>
                              <span className="text-muted" role="button"><FaInfoCircle size={12} /></span>
                            </OverlayTrigger>
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={formData.politique_conges.conges_payes_annuels}
                            onChange={(event) => handlePolitiqueChange('conges_payes_annuels', event.target.value)}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            RTT annuels{' '}
                            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-rtt">Nombre de jours RTT attribués sur l'année.</Tooltip>}>
                              <span className="text-muted" role="button"><FaInfoCircle size={12} /></span>
                            </OverlayTrigger>
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={formData.politique_conges.rtt_annuels}
                            onChange={(event) => handlePolitiqueChange('rtt_annuels', event.target.value)}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Report autorisé{' '}
                            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-report">Autorise le report d'une partie du solde de congés sur l'année suivante.</Tooltip>}>
                              <span className="text-muted" role="button"><FaInfoCircle size={12} /></span>
                            </OverlayTrigger>
                          </Form.Label>
                          <Form.Check
                            type="switch"
                            id="report-autorise-switch"
                            checked={Boolean(formData.politique_conges.report_autorise)}
                            onChange={(event) => handlePolitiqueChange('report_autorise', event.target.checked)}
                            label={formData.politique_conges.report_autorise ? 'Oui' : 'Non'}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Max jours reportables{' '}
                            <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-report-max">Nombre maximum de jours reportables si le report est activé.</Tooltip>}>
                              <span className="text-muted" role="button"><FaInfoCircle size={12} /></span>
                            </OverlayTrigger>
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={formData.politique_conges.report_max_jours}
                            onChange={(event) => handlePolitiqueChange('report_max_jours', event.target.value)}
                            disabled={!formData.politique_conges.report_autorise}
                            readOnly={submitAction.isRunning}
                            isInvalid={
                              Boolean(formData.politique_conges.report_autorise)
                              && showReportValidation
                              && Number(formData.politique_conges.report_max_jours || 0) <= 0
                            }
                          />
                          <Form.Control.Feedback type="invalid">
                            Entrez une valeur supérieure à 0 lorsque le report est activé.
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Limites simultanées par service</Form.Label>
                          <Form.Text className="text-muted d-block mb-2">
                            L'ajout de services se fait uniquement depuis la page Services.
                          </Form.Text>

                          {Object.entries(formData.politique_conges.max_employees_on_leave.by_service || {}).length === 0 && (
                            <Form.Text className="text-muted">
                              Aucune limite par service configuree.
                            </Form.Text>
                          )}

                          {Object.entries(formData.politique_conges.max_employees_on_leave.by_service || {}).map(([serviceName, limit]) => (
                            <InputGroup className="mb-2" key={serviceName}>
                              <InputGroup.Text className="input-label-w">{serviceName}</InputGroup.Text>
                              <Form.Control
                                type="number"
                                min={0}
                                value={limit}
                                onChange={(event) => handleServiceLimitChange(serviceName, event.target.value)}
                                disabled={submitAction.isRunning}
                              />
                              <Button variant="outline-danger" onClick={() => handleRemoveServiceLimit(serviceName)} disabled={submitAction.isRunning}>
                                Supprimer
                              </Button>
                            </InputGroup>
                          ))}
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Notifications création</Form.Label>
                          <Form.Check
                            type="switch"
                            id="notif-on-create"
                            checked={Boolean(formData.politique_conges.notification_settings.on_create)}
                            onChange={(event) => handleNestedPolitiqueChange('notification_settings', 'on_create', event.target.checked)}
                            label={formData.politique_conges.notification_settings.on_create ? 'Actives' : 'Inactives'}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Notifications validation</Form.Label>
                          <Form.Check
                            type="switch"
                            id="notif-on-validate"
                            checked={Boolean(formData.politique_conges.notification_settings.on_validate)}
                            onChange={(event) => handleNestedPolitiqueChange('notification_settings', 'on_validate', event.target.checked)}
                            label={formData.politique_conges.notification_settings.on_validate ? 'Actives' : 'Inactives'}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Notifications refus</Form.Label>
                          <Form.Check
                            type="switch"
                            id="notif-on-reject"
                            checked={Boolean(formData.politique_conges.notification_settings.on_reject)}
                            onChange={(event) => handleNestedPolitiqueChange('notification_settings', 'on_reject', event.target.checked)}
                            label={formData.politique_conges.notification_settings.on_reject ? 'Actives' : 'Inactives'}
                            disabled={submitAction.isRunning}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {editingCompany && (
                  <Card className="mb-3 border-0 bg-light">
                    <Card.Body>
                      <h6 className="mb-3">Règles de modification / annulation</h6>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Modifier un congé validé</Form.Label>
                            <Form.Check
                              type="switch"
                              id="allow-modify-validated"
                              checked={Boolean(leavePolicy.allow_modify_validated)}
                              onChange={(e) => setLeavePolicy((p) => ({ ...p, allow_modify_validated: e.target.checked }))}
                              label={leavePolicy.allow_modify_validated ? 'Autorisé' : 'Interdit'}
                              disabled={submitAction.isRunning}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Annuler un congé validé</Form.Label>
                            <Form.Check
                              type="switch"
                              id="allow-cancel-validated"
                              checked={Boolean(leavePolicy.allow_cancel_validated)}
                              onChange={(e) => setLeavePolicy((p) => ({ ...p, allow_cancel_validated: e.target.checked }))}
                              label={leavePolicy.allow_cancel_validated ? 'Autorisé' : 'Interdit'}
                              disabled={submitAction.isRunning}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Préavis min. (jours)</Form.Label>
                            <Form.Control
                              type="number"
                              min={0}
                              value={leavePolicy.min_notice_days}
                              onChange={(e) => setLeavePolicy((p) => ({ ...p, min_notice_days: e.target.value }))}
                              disabled={submitAction.isRunning}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Validation manager</Form.Label>
                            <Form.Check
                              type="switch"
                              id="require-manager-approval"
                              checked={Boolean(leavePolicy.require_manager_approval)}
                              onChange={(e) => setLeavePolicy((p) => ({ ...p, require_manager_approval: e.target.checked }))}
                              label={leavePolicy.require_manager_approval ? 'Requise' : 'Non requise'}
                              disabled={submitAction.isRunning}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Validation admin</Form.Label>
                            <Form.Check
                              type="switch"
                              id="require-admin-approval"
                              checked={Boolean(leavePolicy.require_admin_approval)}
                              onChange={(e) => setLeavePolicy((p) => ({ ...p, require_admin_approval: e.target.checked }))}
                              label={leavePolicy.require_admin_approval ? 'Requise' : 'Non requise'}
                              disabled={submitAction.isRunning}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}
              </>
            )}

            {showAdvancedJson && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Paramètres (JSON)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={6}
                    value={advancedParametresJson}
                    onChange={(event) => setAdvancedParametresJson(event.target.value)}
                    disabled={submitAction.isRunning}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Politique de congés (JSON)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    value={advancedPolitiqueJson}
                    onChange={(event) => setAdvancedPolitiqueJson(event.target.value)}
                    disabled={submitAction.isRunning}
                  />
                </Form.Group>
              </>
            )}
            {!editingCompany && (
              <Card className="mt-3 border-0 bg-light">
                <Card.Body>
                  <h6 className="mb-3 d-flex align-items-center gap-2">
                    <FaUserTie className="text-primary" />
                    Administrateur de l'entreprise <span className="text-muted fw-normal small">(optionnel)</span>
                  </h6>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prénom</Form.Label>
                        <Form.Control
                          type="text"
                          value={adminData.prenom}
                          onChange={(e) => setAdminData(p => ({ ...p, prenom: e.target.value }))}
                          placeholder="Jean"
                          disabled={submitAction.isRunning}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control
                          type="text"
                          value={adminData.nom}
                          onChange={(e) => setAdminData(p => ({ ...p, nom: e.target.value }))}
                          placeholder="Dupont"
                          disabled={submitAction.isRunning}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          value={adminData.email}
                          onChange={(e) => setAdminData(p => ({ ...p, email: e.target.value }))}
                          placeholder="admin@entreprise.com"
                          disabled={submitAction.isRunning}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  {adminData.email.trim() && (
                    <small className="text-muted">
                      Un email d'invitation sera envoyé à <strong>{adminData.email.trim()}</strong> pour définir son mot de passe.
                    </small>
                  )}
                </Card.Body>
              </Card>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitAction.isRunning}>Annuler</Button>
            <AsyncButton
              variant="primary"
              type="submit"
              action={submitAction}
              loadingText={editingCompany ? 'Mise a jour...' : 'Creation...'}
            >
              {editingCompany ? 'Mettre a jour' : 'Creer'}
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Fix #57 — Confirmation forte : re-saisie du nom avant suppression */}
      <Modal
        show={Boolean(deleteTarget)}
        onHide={() => { setDeleteTarget(null); setDeleteConfirmInput(''); }}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Supprimer cette entreprise ?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Cette action est <strong>irréversible</strong> et supprimera définitivement
            l'entreprise <strong>{deleteTarget?.nom}</strong> ainsi que toutes les données associées
            (utilisateurs, congés, compteurs).
          </p>
          <Form.Group>
            <Form.Label>
              Pour confirmer, retapez exactement le nom de l'entreprise&nbsp;:
            </Form.Label>
            <Form.Control
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={deleteTarget?.nom}
              autoFocus
              disabled={deleteAction.isRunning}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => { setDeleteTarget(null); setDeleteConfirmInput(''); }}
            disabled={deleteAction.isRunning}
          >
            Annuler
          </Button>
          <AsyncButton
            variant="danger"
            onClick={handleDeleteExecute}
            action={deleteAction}
            loadingText="Suppression..."
            disabled={deleteConfirmInput !== deleteTarget?.nom}
          >
            Supprimer définitivement
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CompaniesManagement;