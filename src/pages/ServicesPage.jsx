import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Button, Badge, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaLayerGroup } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { entreprisesService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useInlineConfirmation } from '../hooks/useInlineConfirmation';
import { useAlert } from '../hooks/useAlert';

const DEFAULT_POLICY = {
  overlap_policy: 'block',
  minimum_notice_days: 0,
  max_consecutive_days: 365,
  approval_workflow: 'manager_admin',
  max_employees_on_leave: 0,
};

const ServicesPage = () => {
  const { user } = useAuth();
  const { confirmationMessage, requestConfirmation, clearConfirmation } = useInlineConfirmation();
  const entrepriseId = user?.entreprise_id;

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: '', policy: { ...DEFAULT_POLICY } });
  const alert = useAlert();
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (entrepriseId) {
      loadServices();
    }
  }, [entrepriseId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await entreprisesService.getServices(entrepriseId);
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setServices(items);
    } catch (loadError) {
      console.error('Erreur chargement services:', loadError);
      alert.error('Erreur lors du chargement des services.');
    } finally {
      setLoading(false);
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
      policy: {
        ...DEFAULT_POLICY,
        ...(service.policy || {}),
      },
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        await entreprisesService.updateService(entrepriseId, editingService.name, payload);
        setSuccess('Service mis à jour avec succès.');
      } else {
        await entreprisesService.createService(entrepriseId, payload);
        setSuccess('Service créé avec succès.');
      }

      setShowModal(false);
      await loadServices();
    } catch (submitError) {
      console.error('Erreur sauvegarde service:', submitError);
      alert.error(submitError.response?.data?.message || 'Erreur lors de la sauvegarde du service.');
    }
  };

  const handleDelete = async (service) => {
    const confirmed = requestConfirmation(
      `delete-service:${service.name}`,
      `Suppression demandee pour "${service.name}": cliquez une seconde fois sur Supprimer pour confirmer.`
    );
    if (!confirmed) return;

    setSuccess('');

    try {
      clearConfirmation();
      await entreprisesService.deleteService(entrepriseId, service.name);
      setSuccess('Service supprimé avec succès.');
      await loadServices();
    } catch (deleteError) {
      console.error('Erreur suppression service:', deleteError);
      alert.error(deleteError.response?.data?.message || 'Erreur lors de la suppression du service.');
    }
  };

  if (loading) {
    return (
      <Container fluid="sm">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des services...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-1">Services</h1>
          <p className="text-muted mb-0">Créez vos services et configurez leur politique de congé isolée.</p>
        </div>
        <Button onClick={openCreateModal}>
          <FaPlus className="me-2" />
          Nouveau service
        </Button>
      </div>

      
      {success && <Alert variant="success" className="floating-success-alert" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      {confirmationMessage && <Alert variant="warning" className="inline-confirmation-alert fw-semibold" dismissible onClose={clearConfirmation}>{confirmationMessage}</Alert>}

      <InfoCardInfo title="Gestion des services">
        <p className="mb-0">Un employé doit être rattaché à un service existant. Les règles définies ici sont appliquées de manière isolée par service.</p>
      </InfoCardInfo>

      <TipCard title="Bonnes pratiques">
        Commencez par créer vos services avant de créer des employés pour garantir une affectation propre dès le départ.
      </TipCard>

      <Card>
        <Card.Body>
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
                  <td>
                    <strong>{service.name}</strong>
                  </td>
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
              <p className="text-muted mb-0">Ajoutez un service pour commencer.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
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
                    onChange={(event) => setFormData({
                      ...formData,
                      policy: { ...formData.policy, overlap_policy: event.target.value },
                    })}
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
                    onChange={(event) => setFormData({
                      ...formData,
                      policy: { ...formData.policy, approval_workflow: event.target.value },
                    })}
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
                    onChange={(event) => setFormData({
                      ...formData,
                      policy: { ...formData.policy, minimum_notice_days: event.target.value },
                    })}
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
                    onChange={(event) => setFormData({
                      ...formData,
                      policy: { ...formData.policy, max_consecutive_days: event.target.value },
                    })}
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
                    onChange={(event) => setFormData({
                      ...formData,
                      policy: { ...formData.policy, max_employees_on_leave: event.target.value },
                    })}
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
