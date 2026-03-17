import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner, Badge, Table, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { entreprisesService, usersService, congeTypesService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';

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

const PolitiqueCongesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [servicePolicies, setServicePolicies] = useState({});
  const [newServiceName, setNewServiceName] = useState('');
  const [congeTypes, setCongeTypes] = useState([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [savingType, setSavingType] = useState(false);
  const [typeForm, setTypeForm] = useState(DEFAULT_CONGE_TYPE_FORM);

  const entrepriseId = user?.entreprise_id;

  useEffect(() => {
    const loadPolicy = async () => {
      if (!entrepriseId) return;
      try {
        setLoading(true);
        const [policyResponse, usersResponse, typesResponse] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          usersService.getAll(),
          congeTypesService.getAll({ entreprise_id: entrepriseId }),
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
    if (!window.confirm('Supprimer ce type de congé ?')) return;

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
    setNewServiceName('');
  };

  const removeServicePolicy = (serviceName) => {
    setServicePolicies((prev) => {
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
      <div className="mb-4">
        <h1 className="h3 mb-1">Politique de congé</h1>
        <p className="text-muted">Paramétrage de la politique de votre entreprise</p>
      </div>

      <InfoCardInfo title="À propos de ce paramétrage">
        <p className="mb-0">Ces règles impactent la création et la validation des demandes de congé pour toute l'entreprise.</p>
      </InfoCardInfo>

      <TipCard title="Conseil">
        Définissez une politique globale, puis affinez service par service sans JSON.
      </TipCard>

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
            <Table responsive hover className="mb-0">
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
                    <option value="allow">Autoriser</option>
                  </Form.Select>
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
            </Form.Group>

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

              {Object.entries(servicePolicies).map(([serviceName, servicePolicy]) => (
                <Card key={serviceName} className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{serviceName}</strong>
                      <Badge bg="secondary" className="ms-2">Politique isolée</Badge>
                    </div>
                    <Button type="button" size="sm" variant="outline-danger" onClick={() => removeServicePolicy(serviceName)}>
                      Supprimer
                    </Button>
                  </Card.Header>
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
                            <option value="warning">Alerter</option>
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
                </Card>
              ))}
            </Form.Group>

            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer la politique'}
            </Button>
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
