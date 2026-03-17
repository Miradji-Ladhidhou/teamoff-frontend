import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaUserCheck, FaUserTimes, FaBuilding, FaDownload } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';

const DEFAULT_FORM = {
  prenom: '',
  nom: '',
  email: '',
  role: 'employe',
  service: '',
  entreprise_id: '',
  statut: 'actif',
  password: ''
};

const UsersManagement = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [servicesByCompany, setServicesByCompany] = useState({});

  useEffect(() => {
    loadData();
  }, [isSuperAdmin, user?.entreprise_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const requests = [api.usersService.getAll()];
      if (isSuperAdmin) {
        requests.push(api.entreprisesService.getAll());
      }

      const [usersRes, companiesRes] = await Promise.all(requests);
      const loadedUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
      const loadedCompanies = Array.isArray(companiesRes?.data) ? companiesRes.data : [];

      setUsers(loadedUsers);
      setCompanies(loadedCompanies);

      if (isSuperAdmin) {
        const serviceEntries = await Promise.all(
          loadedCompanies.map(async (company) => {
            try {
              const response = await api.entreprisesService.getServices(company.id);
              const items = Array.isArray(response.data?.items) ? response.data.items : [];
              return [company.id, items.map((item) => item.name)];
            } catch {
              return [company.id, []];
            }
          })
        );
        setServicesByCompany(Object.fromEntries(serviceEntries));
      } else if (user?.entreprise_id) {
        const response = await api.entreprisesService.getServices(user.entreprise_id);
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        setServicesByCompany({ [user.entreprise_id]: items.map((item) => item.name) });
      }
    } catch (loadError) {
      console.error('Erreur chargement donnees:', loadError);
      setError('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const companiesById = useMemo(
    () => companies.reduce((accumulator, company) => {
      accumulator[company.id] = company.nom;
      return accumulator;
    }, {}),
    [companies]
  );

  const resetForm = () => {
    setFormData({
      ...DEFAULT_FORM,
      entreprise_id: isSuperAdmin ? '' : user?.entreprise_id || ''
    });
  };

  const getSelectableServices = () => {
    const entrepriseId = isSuperAdmin ? formData.entreprise_id : user?.entreprise_id;
    if (!entrepriseId) return [];
    const baseServices = Array.isArray(servicesByCompany[entrepriseId]) ? servicesByCompany[entrepriseId] : [];

    if (formData.service && !baseServices.includes(formData.service)) {
      return [...baseServices, formData.service];
    }

    return baseServices;
  };

  const selectableServices = getSelectableServices();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      const payload = {
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        role: formData.role,
        service: formData.service || null,
        entreprise_id: isSuperAdmin ? formData.entreprise_id : user?.entreprise_id,
        statut: formData.statut
      };

      if (editingUser && formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await api.usersService.update(editingUser.id, payload);
        setSuccess('Utilisateur mis a jour avec succes');
      } else {
        await api.usersService.create(payload);
        setSuccess('Utilisateur cree avec succes');
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (submitError) {
      console.error('Erreur sauvegarde utilisateur:', submitError);
      setError(submitError.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({
      prenom: targetUser.prenom || '',
      nom: targetUser.nom || '',
      email: targetUser.email || '',
      role: targetUser.role || 'employe',
      service: targetUser.service || '',
      entreprise_id: targetUser.entreprise_id || '',
      statut: targetUser.statut || 'actif',
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await api.usersService.delete(userId);
      setSuccess('Utilisateur supprime avec succes');
      loadData();
    } catch (deleteError) {
      console.error('Erreur suppression utilisateur:', deleteError);
      setError(deleteError.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const toggleUserStatus = async (targetUser) => {
    const nextStatus = targetUser.statut === 'actif' ? 'inactif' : 'actif';

    try {
      await api.usersService.update(targetUser.id, { statut: nextStatus });
      setSuccess(`Utilisateur ${nextStatus === 'actif' ? 'active' : 'desactive'} avec succes`);
      loadData();
    } catch (statusError) {
      console.error('Erreur changement statut:', statusError);
      setError(statusError.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportLoading(true);
      setError('');

      const response = await api.exportsService.exportUtilisateursCSV();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `utilisateurs_${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Erreur export utilisateurs CSV:', exportError);
      setError(exportError.response?.data?.message || 'Erreur lors de l\'export CSV des utilisateurs');
    } finally {
      setExportLoading(false);
    }
  };

  const filteredUsers = users.filter((targetUser) => {
    const searchableText = `${targetUser.prenom || ''} ${targetUser.nom || ''} ${targetUser.email || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm.toLowerCase());
    const matchesCompany = !companyFilter || targetUser.entreprise_id === companyFilter;
    const matchesRole = !roleFilter || targetUser.role === roleFilter;

    return matchesSearch && matchesCompany && matchesRole;
  });

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'dark',
      admin_entreprise: 'danger',
      manager: 'warning',
      employe: 'info'
    };

    const labels = {
      super_admin: 'Super Admin',
      admin_entreprise: 'Admin entreprise',
      manager: 'Manager',
      employe: 'Employe'
    };

    return <Badge bg={variants[role] || 'secondary'}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      actif: 'success',
      inactif: 'secondary',
      en_attente: 'warning'
    };

    const labels = {
      actif: 'Actif',
      inactif: 'Inactif',
      en_attente: 'En attente'
    };

    return <Badge bg={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement des utilisateurs...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Gestion des Utilisateurs</h1>
          <p className="text-muted">
            {isSuperAdmin ? 'Administrer les utilisateurs de la plateforme' : 'Administrer les utilisateurs de votre entreprise'}
          </p>
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
              setEditingUser(null);
              resetForm();
              setShowModal(true);
            }}
          >
            <FaPlus className="me-2" />
            Nouvel Utilisateur
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <InfoCardInfo title="Répartition des rôles">
        <ul className="mb-0">
          <li>Super Admin: gouvernance globale de la plateforme</li>
          <li>Admin entreprise: administration de son entreprise</li>
          <li>Manager: validation opérationnelle des congés</li>
          <li>Employé: création et suivi de ses demandes</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Sécurité des accès">
        Privilégiez le principe du moindre privilège et désactivez les comptes inactifs régulièrement.
      </TipCard>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              {isSuperAdmin ? (
                <Form.Select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                  <option value="">Toutes les entreprises</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nom}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control value={companiesById[user?.entreprise_id] || 'Entreprise courante'} disabled />
              )}
            </Col>
            <Col md={3}>
              <Form.Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">Tous les roles</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                {isSuperAdmin && <option value="admin_entreprise">Admin entreprise</option>}
                <option value="manager">Manager</option>
                <option value="employe">Employe</option>
              </Form.Select>
            </Col>
            <Col md={2} className="text-end">
              <Badge bg="info">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
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
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Role</th>
                <th>Service</th>
                <th>Entreprise</th>
                <th>Statut</th>
                <th>Mise a jour</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((targetUser) => (
                <tr key={targetUser.id}>
                  <td>
                    <div>
                      <strong>{targetUser.prenom} {targetUser.nom}</strong>
                      <br />
                      <small className="text-muted">ID: {targetUser.id}</small>
                    </div>
                  </td>
                  <td>{targetUser.email}</td>
                  <td>{getRoleBadge(targetUser.role)}</td>
                  <td>{targetUser.service || <span className="text-muted">Non défini</span>}</td>
                  <td>
                    {companiesById[targetUser.entreprise_id] ? (
                      <div>
                        <FaBuilding className="me-1" />
                        {companiesById[targetUser.entreprise_id]}
                      </div>
                    ) : (
                      <Badge bg="secondary">Aucune</Badge>
                    )}
                  </td>
                  <td>{getStatusBadge(targetUser.statut)}</td>
                  <td>{targetUser.updatedAt ? new Date(targetUser.updatedAt).toLocaleDateString('fr-FR') : 'Jamais'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(targetUser)} title="Modifier">
                        <FaEdit />
                      </Button>
                      <Button
                        variant={targetUser.statut === 'actif' ? 'outline-warning' : 'outline-success'}
                        size="sm"
                        onClick={() => toggleUserStatus(targetUser)}
                        title={targetUser.statut === 'actif' ? 'Desactiver' : 'Activer'}
                      >
                        {targetUser.statut === 'actif' ? <FaUserTimes /> : <FaUserCheck />}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(targetUser.id)}
                        title="Supprimer"
                        disabled={targetUser.id === user?.id}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-4">
              <FaUsers size={48} className="text-muted mb-3" />
              <h5>Aucun utilisateur trouve</h5>
              <p className="text-muted">
                {searchTerm || companyFilter || roleFilter
                  ? 'Aucun utilisateur ne correspond a vos criteres.'
                  : 'Commencez par creer votre premier utilisateur.'}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prenom *</Form.Label>
                  <Form.Control type="text" value={formData.prenom} onChange={(event) => setFormData({ ...formData, prenom: event.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control type="text" value={formData.nom} onChange={(event) => setFormData({ ...formData, nom: event.target.value })} required />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value })} required>
                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                    {isSuperAdmin && <option value="admin_entreprise">Admin entreprise</option>}
                    <option value="manager">Manager</option>
                    <option value="employe">Employe</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Service {formData.role === 'employe' ? '*' : ''}</Form.Label>
                  <Form.Select
                    value={formData.service}
                    onChange={(event) => setFormData({ ...formData, service: event.target.value })}
                    required={formData.role === 'employe'}
                    disabled={(isSuperAdmin && !formData.entreprise_id) || selectableServices.length === 0}
                  >
                    <option value="">{selectableServices.length > 0 ? 'Sélectionner un service' : 'Aucun service disponible'}</option>
                    {selectableServices.map((serviceName) => (
                      <option key={serviceName} value={serviceName}>{serviceName}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {isSuperAdmin
                      ? 'Les services sont gérés depuis la page Services (sélectionnez d\'abord une entreprise).'
                      : 'Les services sont gérés depuis la page Services.'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Entreprise *</Form.Label>
                  {isSuperAdmin ? (
                    <Form.Select
                      value={formData.entreprise_id}
                      onChange={(event) => setFormData({ ...formData, entreprise_id: event.target.value, service: '' })}
                      required
                    >
                      <option value="">Selectionner une entreprise</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.nom}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control value={companiesById[user?.entreprise_id] || 'Entreprise courante'} disabled />
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select value={formData.statut} onChange={(event) => setFormData({ ...formData, statut: event.target.value })}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="en_attente">En attente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{editingUser ? 'Nouveau mot de passe' : 'Mot de passe'}</Form.Label>
                  <Form.Control
                    type="password"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder={editingUser ? 'Laisser vide pour conserver le mot de passe actuel' : 'Un mot de passe temporaire sera genere si vous laissez vide'}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button variant="primary" type="submit">{editingUser ? 'Mettre a jour' : 'Creer'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UsersManagement;