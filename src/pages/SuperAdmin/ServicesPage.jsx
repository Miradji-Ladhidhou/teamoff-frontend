import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaLayerGroup } from 'react-icons/fa';
import * as api from '../../services/api';
import { InfoCardInfo } from '../../components/InfoCard';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

const DEFAULT_POLICY = {
  overlap_policy: 'block',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  approval_workflow: 'manager_admin',
  max_employees_on_leave: 0,
};

const ServicesPage = () => {
  const confirmDialog = useConfirmDialog();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [services, setServices] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: '', policy: { ...DEFAULT_POLICY } });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadServices(selectedCompanyId);
    } else {
      setServices([]);
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await api.entreprisesService.getAll();
      const items = Array.isArray(response.data) ? response.data : [];
      setCompanies(items);
      if (items.length > 0) {
        setSelectedCompanyId(items[0].id);
      }
    } catch (loadError) {
      console.error('Erreur chargement entreprises:', loadError);
      setError('Erreur lors du chargement des entreprises.');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadServices = async (companyId) => {
    try {
      setLoadingServices(true);
      setError('');
      const response = await api.entreprisesService.getServices(companyId);
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setServices(items);
    } catch (loadError) {
      console.error('Erreur chargement services:', loadError);
      setError('Erreur lors du chargement des services.');
    } finally {
      setLoadingServices(false);
    }
  };

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({ name: '', policy: { ...DEFAULT_POLICY } });
    setShowModal(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      policy: { ...DEFAULT_POLICY, ...(service.policy || {}) },
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        policy: {
          overlap_policy: formData.policy.overlap_policy,
          minimum_notice_days: Number(formData.policy.minimum_notice_days || 0),
          max_consecutive_days: Number(formData.policy.max_consecutive_days || 0),
          approval_workflow: formData.policy.approval_workflow,
          max_employees_on_leave: Number(formData.policy.max_employees_on_leave || 0),
        },
      };

      if (editingService) {
        await api.entreprisesService.updateService(selectedCompanyId, editingService.name, payload);
        setSuccess('Service mis à jour avec succès.');
      } else {
        await api.entreprisesService.createService(selectedCompanyId, payload);
        setSuccess('Service créé avec succès.');
      }

      setShowModal(false);
      await loadServices(selectedCompanyId);
    } catch (submitError) {
      console.error('Erreur sauvegarde service:', submitError);
      setError(submitError.response?.data?.message || 'Erreur lors de la sauvegarde du service.');
    }
  };

  const handleDelete = async (service) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer un service',
      message: `Voulez-vous supprimer le service "${service.name}" ?`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await api.entreprisesService.deleteService(selectedCompanyId, service.name);
      setSuccess('Service supprimé avec succès.');
      await loadServices(selectedCompanyId);
    } catch (deleteError) {
      console.error('Erreur suppression service:', deleteError);
      setError(deleteError.response?.data?.message || 'Erreur lors de la suppression du service.');
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Services</h1>
          <p className="text-muted mb-0">Gérez les services par entreprise et configurez leurs politiques de congé.</p>
        </div>
        <Button onClick={openCreateModal} disabled={!selectedCompanyId}>
          <FaPlus className="me-2" />
          Nouveau service
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <InfoCardInfo title="Gestion des services par entreprise">
        <p className="mb-0">Sélectionnez une entreprise pour consulter et gérer ses services. Un employé doit être rattaché à un service existant.</p>
      </InfoCardInfo>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label className="fw-semibold">Entreprise</Form.Label>
            <Form.Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              disabled={loadingCompanies}
            >
              {loadingCompanies ? (
                <option>Chargement...</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.nom}</option>
                ))
              )}
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {selectedCompanyId && (
        <Card>
          <Card.Header className="bg-white">
            <strong>{selectedCompany?.nom || ''}</strong>
            {' — '}
            <span className="text-muted">{services.length} service(s)</span>
          </Card.Header>
          <Card.Body>
            {loadingServices ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <p className="mt-2 mb-0">Chargement des services...</p>
              </div>
            ) : (
              <>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Employés affectés</th>
                      <th>Workflow</th>
                      <th>Préavis min</th>
                      <th>Max absences</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.name}>
                        <td><strong>{service.name}</strong></td>
                        <td>
                          <Badge bg={service.employeesCount > 0 ? 'info' : 'secondary'}>
                            {service.employeesCount || 0}
                          </Badge>
                        </td>
                        <td>{service.policy?.approval_workflow || 'manager_admin'}</td>
                        <td>{service.policy?.minimum_notice_days || 0} j</td>
                        <td>{service.policy?.max_employees_on_leave || 0}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button variant="outline-primary" size="sm" onClick={() => openEditModal(service)}>
                              <FaEdit />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(service)}>
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {services.length === 0 && (
                  <div className="text-center py-4">
                    <FaLayerGroup size={42} className="text-muted mb-2" />
                    <h5>Aucun service configuré</h5>
                    <p className="text-muted mb-0">Ajoutez un service pour cette entreprise.</p>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingService ? 'Modifier le service' : 'Créer un service'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nom du service *</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Chevauchement</Form.Label>
                  <Form.Select
                    value={formData.policy.overlap_policy}
                    onChange={(event) => setFormData({ ...formData, policy: { ...formData.policy, overlap_policy: event.target.value } })}
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
                    value={formData.policy.approval_workflow}
                    onChange={(event) => setFormData({ ...formData, policy: { ...formData.policy, approval_workflow: event.target.value } })}
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
                  <Form.Label>Préavis min (jours)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.policy.minimum_notice_days}
                    onChange={(event) => setFormData({ ...formData, policy: { ...formData.policy, minimum_notice_days: event.target.value } })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max jours consécutifs</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.policy.max_consecutive_days}
                    onChange={(event) => setFormData({ ...formData, policy: { ...formData.policy, max_consecutive_days: event.target.value } })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max absences simultanées</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.policy.max_employees_on_leave}
                    onChange={(event) => setFormData({ ...formData, policy: { ...formData.policy, max_employees_on_leave: event.target.value } })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary">{editingService ? 'Mettre à jour' : 'Créer'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ServicesPage;
