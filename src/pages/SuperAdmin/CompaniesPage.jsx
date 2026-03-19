import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaSearch, FaDownload, FaInfoCircle } from 'react-icons/fa';
import * as api from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';
import { useInlineConfirmation } from '../../hooks/useInlineConfirmation';

const DEFAULT_PARAMETRES = {
  timezone: 'Europe/Paris',
  notifications_email: true,
};

const DEFAULT_POLITIQUE = {
  conges_payes_annuels: 25,
  rtt_annuels: 0,
  report_autorise: false,
  report_max_jours: 0,
  overlap_policy: 'block',
  max_employees_on_leave: {
    global: '',
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
  const { confirmationMessage, requestConfirmation, clearConfirmation } = useInlineConfirmation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [advancedParametresJson, setAdvancedParametresJson] = useState(JSON.stringify(DEFAULT_PARAMETRES, null, 2));
  const [advancedPolitiqueJson, setAdvancedPolitiqueJson] = useState(JSON.stringify(DEFAULT_POLITIQUE, null, 2));
  const [showReportValidation, setShowReportValidation] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.entreprisesService.getAll();
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      console.error('Erreur chargement entreprises:', loadError);
      setError('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setShowAdvancedJson(false);
    setShowReportValidation(false);
    setAdvancedParametresJson(JSON.stringify(DEFAULT_PARAMETRES, null, 2));
    setAdvancedPolitiqueJson(JSON.stringify(DEFAULT_POLITIQUE, null, 2));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');

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
            overlap_policy: formData.politique_conges.overlap_policy,
            max_employees_on_leave: {
              global: formData.politique_conges.max_employees_on_leave.global === ''
                ? null
                : Number(formData.politique_conges.max_employees_on_leave.global || 0),
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
        setSuccess('Entreprise mise a jour avec succes');
      } else {
        await api.entreprisesService.create(payload);
        setSuccess('Entreprise creee avec succes');
      }

      setShowModal(false);
      setEditingCompany(null);
      resetForm();
      loadCompanies();
    } catch (submitError) {
      console.error('Erreur sauvegarde entreprise:', submitError);
      setError(
        submitError instanceof SyntaxError
          ? 'Les champs JSON sont invalides'
          : submitError?.message || 'Erreur lors de la sauvegarde'
      );
    }
  };

  const handleEdit = (company) => {
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
        overlap_policy: companyPolitique.overlap_policy || DEFAULT_POLITIQUE.overlap_policy,
        max_employees_on_leave: {
          global: companyPolitique.max_employees_on_leave?.global ?? '',
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

  const handleDelete = async (companyId) => {
    const confirmed = requestConfirmation(
      `delete-company:${companyId}`,
      'Suppression demandée: cliquez une seconde fois sur Supprimer pour confirmer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      clearConfirmation();
      await api.entreprisesService.delete(companyId);
      setSuccess('Entreprise supprimee avec succes');
      loadCompanies();
    } catch (deleteError) {
      console.error('Erreur suppression entreprise:', deleteError);
      setError(deleteError.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportLoading(true);
      setError('');

      const response = await api.exportsService.exportEntreprisesCSV();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
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
      setError(exportError.response?.data?.message || 'Erreur lors de l\'export CSV des entreprises');
    } finally {
      setExportLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    const searchableText = `${company.nom || ''} ${company.statut || ''}`.toLowerCase();
    return !searchTerm || searchableText.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <Container>
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
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Gestion des Entreprises</h1>
          <p className="text-muted">Administrer toutes les entreprises de la plateforme</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={handleExportCsv}
            disabled={exportLoading}
          >
            <FaDownload className="me-2" />
            {exportLoading ? 'Export...' : 'Exporter CSV'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingCompany(null);
              resetForm();
              setShowModal(true);
            }}
          >
            <FaPlus className="me-2" />
            Nouvelle Entreprise
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="floating-error-alert" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" className="floating-success-alert" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      {confirmationMessage && <Alert variant="warning" className="inline-confirmation-alert fw-semibold" dismissible onClose={clearConfirmation}>{confirmationMessage}</Alert>}

      <InfoCardInfo title="Gérer les entreprises efficacement">
        <p className="mb-2">Chaque entreprise possède sa politique de congés et ses paramètres.</p>
        <ul className="mb-0">
          <li>Créez l'entreprise avec un statut adapté</li>
          <li>Renseignez les champs métier (congés, RTT, timezone, notifications)</li>
          <li>Ajustez les paramètres avant d'ajouter les utilisateurs</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Bonne pratique">
        Utilisez le mode JSON avancé uniquement pour des besoins spécifiques.
      </TipCard>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="text-end">
              <Badge bg="info" className="me-2">
                {filteredCompanies.length} entreprise{filteredCompanies.length > 1 ? 's' : ''}
              </Badge>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Table hover responsive>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Statut</th>
                <th>Politique</th>
                <th>Parametres</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <div>
                      <strong>{company.nom}</strong>
                    </div>
                  </td>
                  <td>
                    <Badge bg={company.statut === 'active' ? 'success' : company.statut === 'suspendue' ? 'warning' : 'secondary'}>
                      {company.statut || 'inactive'}
                    </Badge>
                  </td>
                  <td>
                    <small className="text-muted">{Object.keys(company.politique_conges || {}).length} cle(s)</small>
                  </td>
                  <td>
                    <small className="text-muted">{Object.keys(company.parametres || {}).length} cle(s)</small>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(company)} title="Modifier">
                        <FaEdit />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(company.id)} title="Supprimer">
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-4">
              <FaBuilding size={48} className="text-muted mb-3" />
              <h5>Aucune entreprise trouvee</h5>
              <p className="text-muted">
                {searchTerm ? 'Aucune entreprise ne correspond a votre recherche.' : 'Commencez par creer votre premiere entreprise.'}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom de l'entreprise *</Form.Label>
                  <Form.Control type="text" value={formData.nom} onChange={(event) => setFormData({ ...formData, nom: event.target.value })} required />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select value={formData.statut} onChange={(event) => setFormData({ ...formData, statut: event.target.value })}>
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
                          <Form.Label>Gestion des chevauchements</Form.Label>
                          <Form.Select
                            value={formData.politique_conges.overlap_policy}
                            onChange={(event) => handlePolitiqueChange('overlap_policy', event.target.value)}
                          >
                            <option value="block">Bloquer</option>
                            <option value="warning">Avertir</option>
                            <option value="allow">Autoriser</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Workflow validation</Form.Label>
                          <Form.Select
                            value={formData.politique_conges.approval_workflow}
                            onChange={(event) => handlePolitiqueChange('approval_workflow', event.target.value)}
                          >
                            <option value="auto">Auto</option>
                            <option value="manager">Manager</option>
                            <option value="manager_admin">Manager + Admin</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Limite simultanée (globale)</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={formData.politique_conges.max_employees_on_leave.global}
                            onChange={(event) => handleNestedPolitiqueChange('max_employees_on_leave', 'global', event.target.value)}
                            placeholder="Aucune limite"
                          />
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
                              <InputGroup.Text style={{ minWidth: 180 }}>{serviceName}</InputGroup.Text>
                              <Form.Control
                                type="number"
                                min={0}
                                value={limit}
                                onChange={(event) => handleServiceLimitChange(serviceName, event.target.value)}
                              />
                              <Button variant="outline-danger" onClick={() => handleRemoveServiceLimit(serviceName)}>
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
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
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
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Politique de congés (JSON)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    value={advancedPolitiqueJson}
                    onChange={(event) => setAdvancedPolitiqueJson(event.target.value)}
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button variant="primary" type="submit">{editingCompany ? 'Mettre a jour' : 'Creer'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CompaniesManagement;