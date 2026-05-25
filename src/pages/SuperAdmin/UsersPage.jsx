import './users.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, InputGroup, Pagination } from 'react-bootstrap';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaUserCheck, FaUserTimes, FaDownload, FaInfoCircle, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert, useConfirmation } from '../../hooks/useAlert';
import * as api from '../../services/api';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const getInitials = (u) =>
  `${(u?.prenom || '').charAt(0)}${(u?.nom || '').charAt(0)}`.toUpperCase() || '?';

const roleToAvatarColor = (role) => {
  const map = { super_admin: 'red', admin_entreprise: 'purple', manager: 'amber', employe: 'blue' };
  return map[role] || 'blue';
};

const DEFAULT_FORM = {
  prenom: '',
  nom: '',
  email: '',
  date_embauche: '',
  role: 'employe',
  service: '',
  entreprise_id: '',
  statut: 'actif',
  delegue_id: ''
};

const UsersManagement = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const alert = useAlert();
  const { confirm } = useConfirmation();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Réinitialise la page quand les filtres changent
  useEffect(() => { setCurrentPage(1); }, [searchTerm, companyFilter, roleFilter]);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [servicesByCompany, setServicesByCompany] = useState({});
  const [activeUserActionId, setActiveUserActionId] = useState(null);
  const submitAction = useAsyncAction();
  const exportAction = useAsyncAction();
  const mutateUserAction = useAsyncAction();
  const [resendAction] = useState(() => ({}));
  const resendInvitationAction = useAsyncAction();

  useEffect(() => {
    loadData();
  }, [isSuperAdmin, user?.entreprise_id]);

  const loadUsers = async () => {
    try {
      const res = await api.usersService.getAll();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (loadError) {
      console.error('Erreur chargement utilisateurs:', loadError);
      alert.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

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
      alert.error('Erreur lors du chargement des donnees');
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
    return baseServices;
  };

  const selectableServices = getSelectableServices();
  const isServiceRole = ['employe', 'manager'].includes(formData.role);

  const handleSubmit = async (event) => {
    event.preventDefault();

    await submitAction.run(async () => {
      try {
        // Validation obligatoire du service pour les employés
        if (formData.role === 'employe' && !formData.service?.trim()) {
          alert.error('Le service est obligatoire pour un employé');
          return;
        }

        const payload = {
          prenom: formData.prenom,
          nom: formData.nom,
          email: formData.email,
          date_embauche: formData.date_embauche || null,
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
          if (editingUser && 'delegue_id' in formData) {
            try {
              await api.usersService.setDelegate(editingUser.id, formData.delegue_id || null);
            } catch {}
          }
          alert.success('Utilisateur mis à jour avec succès');
        } else {
          await api.usersService.create(payload);
          alert.success('Utilisateur créé avec succès');
        }

        setShowModal(false);
        setEditingUser(null);
        resetForm();
        loadUsers();
      } catch (submitError) {
        console.error('Erreur sauvegarde utilisateur:', submitError);
        alert.error(submitError.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    });
  };

  const handleEdit = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({
      prenom: targetUser.prenom || '',
      nom: targetUser.nom || '',
      email: targetUser.email || '',
      date_embauche: targetUser.date_embauche ? String(targetUser.date_embauche).slice(0, 10) : '',
      role: targetUser.role || 'employe',
      service: targetUser.service || '',
      entreprise_id: targetUser.entreprise_id || '',
      statut: targetUser.statut || 'actif',
      password: '',
      delegue_id: targetUser.delegue_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    const targetUser = users.find(u => u.id === userId);
    confirm({
      title: 'Supprimer cet utilisateur ?',
      description: `Êtes-vous sûr de vouloir supprimer ${targetUser?.prenom} ${targetUser?.nom} ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      cancelLabel: 'Annuler',
      danger: true,
      onConfirm: async () => {
        await mutateUserAction.run(async () => {
          setActiveUserActionId(userId);
          try {
            await api.usersService.delete(userId);
            alert.success('Utilisateur supprimé avec succès');
            loadUsers();
          } catch (deleteError) {
            console.error('Erreur suppression utilisateur:', deleteError);
            alert.error(deleteError.response?.data?.message || 'Erreur lors de la suppression');
          } finally {
            setActiveUserActionId(null);
          }
        });
      }
    });
  };

  const toggleUserStatus = async (targetUser) => {
    const nextStatus = targetUser.statut === 'actif' ? 'inactif' : 'actif';

    await mutateUserAction.run(async () => {
      setActiveUserActionId(targetUser.id);
      try {
        await api.usersService.update(targetUser.id, { statut: nextStatus });
        alert.success(`Utilisateur ${nextStatus === 'actif' ? 'activé' : 'désactivé'} avec succès`);
        loadUsers();
      } catch (statusError) {
        console.error('Erreur changement statut:', statusError);
        alert.error(statusError.response?.data?.message || 'Erreur lors du changement de statut');
      } finally {
        setActiveUserActionId(null);
      }
    });
  };

  const handleResendInvitation = async (targetUser) => {
    await mutateUserAction.run(async () => {
      setActiveUserActionId(targetUser.id);
      try {
        await api.usersService.resendInvitation(targetUser.id);
        alert.success('Invitation renvoyée avec succès');
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors du renvoi de l\'invitation');
      } finally {
        setActiveUserActionId(null);
      }
    });
  };

  const handleExportCsv = async () => {
    await exportAction.run(async () => {
      try {
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
        alert.error(exportError.response?.data?.message || 'Erreur lors de l\'export CSV des utilisateurs');
      }
    });
  };

  const exportLoading = exportAction.isRunning;
  const importAction = useAsyncAction();

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importAction.run(async () => {
      try {
        const res = await api.usersService.importCSV(file);
        const { message, created, skipped } = res.data;
        alert.success(`${message}${skipped?.length > 0 ? ` — ${skipped.map((s) => `${s.email}: ${s.reason}`).join(', ')}` : ''}`);
        loadUsers();
      } catch (importError) {
        const serverErrors = importError.response?.data?.errors;
        if (serverErrors?.length) {
          alert.error(`Erreurs CSV : ${serverErrors.map((e) => `Ligne ${e.line}: ${e.errors.join(', ')}`).join(' | ')}`);
        } else {
          alert.error(importError.response?.data?.message || 'Erreur lors de l\'import CSV');
        }
      }
    });
  };

  const filteredUsers = useMemo(() => users.filter((targetUser) => {
    const searchableText = `${targetUser.prenom || ''} ${targetUser.nom || ''} ${targetUser.email || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm.toLowerCase());
    const matchesCompany = !companyFilter || targetUser.entreprise_id === companyFilter;
    const matchesRole = !roleFilter || targetUser.role === roleFilter;
    return matchesSearch && matchesCompany && matchesRole;
  }), [users, searchTerm, companyFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getRoleBadge = (role) => {
    const classes = { super_admin: 'refused', admin_entreprise: 'info', manager: 'pending', employe: 'approved' };
    const labels = { super_admin: 'Super Admin', admin_entreprise: 'Admin', manager: 'Manager', employe: 'Employé' };
    return <span className={`badge ${classes[role] || 'info'}`}>{labels[role] || role}</span>;
  };

  const getStatusBadge = (status) => {
    const classes = { actif: 'approved', inactif: 'info', en_attente: 'pending' };
    const labels = { actif: 'ACTIF', inactif: 'INACTIF', en_attente: 'EN ATTENTE' };
    return <span className={`badge ${classes[status] || 'info'}`}>{labels[status] || status.toUpperCase()}</span>;
  };

  const openDetailsModal = (targetUser) => {
    setSelectedUserDetails(targetUser);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedUserDetails(null);
  };

  const formatDate = (value) => {
    if (!value) return 'Non definie';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return 'Non definie';
    return parsedDate.toLocaleDateString('fr-FR');
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
    <Container fluid="sm" className="users-management-page">
      {/* En-tête responsive */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Gestion des Utilisateurs</span>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => setShowInfoModal(true)} title="Informations">
            <span className="d-none d-sm-inline">Info</span>
            <span className="d-sm-none"><FaInfoCircle /></span>
          </Button>
          <AsyncButton
            variant="outline-secondary"
            onClick={handleExportCsv}
            action={exportAction}
            loadingText=""
            title="Exporter CSV"
          >
            <FaDownload className="d-none d-sm-inline me-2" />
            <span className="d-none d-sm-inline">CSV</span>
            <FaDownload className="d-sm-none" />
          </AsyncButton>
          <label className="btn btn-outline-secondary mb-0" style={{ cursor: importAction.isRunning ? 'wait' : 'pointer' }} title="Importer des utilisateurs via CSV">
            <FaDownload className="me-2" style={{ transform: 'rotate(180deg)' }} />
            <span className="d-none d-sm-inline">Import CSV</span>
            <input type="file" accept=".csv,text/csv" className="d-none" onChange={handleImportCsv} disabled={importAction.isRunning} />
          </label>
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              resetForm();
              setShowModal(true);
            }}
          >
            <FaPlus className="me-2" />
            <span className="d-none d-sm-inline">Nouvel </span>Utilisateur
          </Button>
        </div>
      </div>

      <Card className="mb-4 users-management-filters">
        <Card.Body>
          <Row className="g-2 align-items-center users-management-filters__row">
            <Col xs={12} md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </InputGroup>
            </Col>
            <Col xs={6} md={3}>
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
            <Col xs={6} md={3}>
              <Form.Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">Tous les roles</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                {isSuperAdmin && <option value="admin_entreprise">Admin entreprise</option>}
                <option value="manager">Manager</option>
                <option value="employe">Employe</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={2} className="text-md-end users-management-filters__count">
              <span className="badge info">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
              </span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0 p-md-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-4">
              <FaUsers size={48} className="text-muted mb-3" />
              <h5>Aucun utilisateur trouvé</h5>
              <p className="text-muted small">
                {searchTerm || companyFilter || roleFilter
                  ? 'Aucun utilisateur ne correspond à vos critères.'
                  : 'Commencez par créer votre premier utilisateur.'}
              </p>
            </div>
          ) : (
            <>
              {/* Vue carte — mobile uniquement */}
              <div className="d-md-none mobile-card-list px-3 users-management-mobile-list">
                {pagedUsers.map((targetUser) => (
                  <div key={targetUser.id} className="mobile-card-list__item users-management-mobile-list__item">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className={`avatar avatar-sm ${roleToAvatarColor(targetUser.role)}`}>
                        {getInitials(targetUser)}
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text, var(--dk-text))' }}>
                          {targetUser.prenom} {targetUser.nom}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted, var(--dk-text-muted))' }}>
                          {targetUser.role || 'Rôle inconnu'}
                        </div>
                      </div>
                      {getStatusBadge(targetUser.statut)}
                    </div>
                    <div className="d-flex flex-wrap gap-1 users-management-mobile-list__actions">
                      <Button variant="outline-secondary" size="sm" className="flex-grow-1 justify-content-center" onClick={() => openDetailsModal(targetUser)}>
                        Detail
                      </Button>
                      <Button variant="outline-primary" size="sm" className="flex-grow-1 justify-content-center" onClick={() => handleEdit(targetUser)}>
                        Modifier
                      </Button>
                      <AsyncButton
                        variant={targetUser.statut === 'actif' ? 'outline-warning' : 'outline-success'}
                        size="sm"
                        onClick={() => toggleUserStatus(targetUser)}
                        isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                        showSpinner={mutateUserAction.showSpinner && activeUserActionId === targetUser.id}
                        loadingText=""
                        disabled={mutateUserAction.isRunning && activeUserActionId !== targetUser.id}
                      >
                        {targetUser.statut === 'actif' ? <FaUserTimes /> : <FaUserCheck />}
                      </AsyncButton>
                      {targetUser.statut === 'en_attente' && (
                        <AsyncButton
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleResendInvitation(targetUser)}
                          title="Renvoyer l'invitation"
                          isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                          loadingText=""
                        >
                          <FaEnvelope />
                        </AsyncButton>
                      )}
                      <AsyncButton
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(targetUser.id)}
                        disabled={targetUser.id === user?.id}
                        isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                        showSpinner={mutateUserAction.showSpinner && activeUserActionId === targetUser.id}
                        loadingText=""
                      >
                        <FaTrash />
                      </AsyncButton>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center pt-3 d-md-none">
                  <Pagination size="sm">
                    <Pagination.Prev disabled={safePage === 1} onClick={() => setCurrentPage((p) => p - 1)} />
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Pagination.Item key={i + 1} active={i + 1 === safePage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>
                    ))}
                    <Pagination.Next disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} />
                  </Pagination>
                </div>
              )}

              {/* Vue tableau — desktop uniquement */}
              <div className="d-none d-md-block users-management-table-wrap">
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th>Role</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map((targetUser) => (
                      <tr key={targetUser.id}>
                        <td>
                          <div>
                            <strong>{targetUser.prenom} {targetUser.nom}</strong>
                          </div>
                        </td>
                        <td>{getRoleBadge(targetUser.role)}</td>
                        <td>{getStatusBadge(targetUser.statut)}</td>
                        <td>
                          <div className="d-flex gap-1 users-management-table-actions">
                            <Button variant="outline-secondary" size="sm" onClick={() => openDetailsModal(targetUser)} title="Detail">
                              Detail
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => handleEdit(targetUser)} title="Modifier">
                              <FaEdit />
                            </Button>
                            <AsyncButton
                              variant={targetUser.statut === 'actif' ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              onClick={() => toggleUserStatus(targetUser)}
                              title={targetUser.statut === 'actif' ? 'Desactiver' : 'Activer'}
                              isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                              showSpinner={mutateUserAction.showSpinner && activeUserActionId === targetUser.id}
                              loadingText=""
                              disabled={mutateUserAction.isRunning && activeUserActionId !== targetUser.id}
                            >
                              {targetUser.statut === 'actif' ? <FaUserTimes /> : <FaUserCheck />}
                            </AsyncButton>
                            {targetUser.statut === 'en_attente' && (
                              <AsyncButton
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleResendInvitation(targetUser)}
                                title="Renvoyer l'invitation"
                                isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                                loadingText=""
                              >
                                <FaEnvelope />
                              </AsyncButton>
                            )}
                            <AsyncButton
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(targetUser.id)}
                              title="Supprimer"
                              disabled={targetUser.id === user?.id}
                              isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                              showSpinner={mutateUserAction.showSpinner && activeUserActionId === targetUser.id}
                              loadingText=""
                            >
                              <FaTrash />
                            </AsyncButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 pt-3 d-none d-lg-flex">
                  <small className="text-muted">
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredUsers.length)} sur {filteredUsers.length}
                  </small>
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev disabled={safePage === 1} onClick={() => setCurrentPage((p) => p - 1)} />
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Pagination.Item key={i + 1} active={i + 1 === safePage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>
                    ))}
                    <Pagination.Next disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" keyboard={!submitAction.isRunning} centered dialogClassName="users-management-modal">
        <Modal.Header closeButton={!submitAction.isRunning}>
          <Modal.Title>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="users-management-modal__body">
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prenom *</Form.Label>
                  <Form.Control type="text" value={formData.prenom} onChange={(event) => setFormData({ ...formData, prenom: event.target.value })} required disabled={submitAction.isRunning} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control type="text" value={formData.nom} onChange={(event) => setFormData({ ...formData, nom: event.target.value })} required disabled={submitAction.isRunning} />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required disabled={submitAction.isRunning} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date d'embauche</Form.Label>
              <Form.Control
                type="date"
                value={formData.date_embauche}
                onChange={(event) => setFormData({ ...formData, date_embauche: event.target.value })}
                disabled={submitAction.isRunning}
              />
              <Form.Text className="text-muted">
                Utilisée pour le calcul proratisé des congés lors d'une arrivée en cours d'année.
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value, service: ['employe', 'manager'].includes(event.target.value) ? formData.service : '' })} required disabled={submitAction.isRunning}>
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
                    disabled={submitAction.isRunning || selectableServices.length === 0 || !isServiceRole}
                  >
                    <option value="">{selectableServices.length > 0 ? 'Sélectionner un service' : 'Aucun service disponible'}</option>
                    {selectableServices.map((serviceName) => (
                      <option key={serviceName} value={serviceName}>{serviceName}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {selectableServices.length === 0 && isServiceRole
                      ? '⚠️ Aucun service disponible. Créez des services depuis la page Services avant d\'assigner ce rôle.'
                      : !isServiceRole
                      ? 'Les services s\'appliquent aux employés et aux managers.'
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
                      disabled={submitAction.isRunning}
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
                  <Form.Select value={formData.statut} onChange={(event) => setFormData({ ...formData, statut: event.target.value })} disabled={submitAction.isRunning}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="en_attente">En attente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              {editingUser && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nouveau mot de passe</Form.Label>
                    <Form.Control
                      type="password"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      placeholder="Laisser vide pour conserver le mot de passe actuel"
                      disabled={submitAction.isRunning}
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            {editingUser && ['manager', 'admin_entreprise'].includes(formData.role) && (
              <Form.Group className="mb-3">
                <Form.Label>Délégué (en cas d'absence)</Form.Label>
                <Form.Select
                  value={formData.delegue_id || ''}
                  onChange={(e) => setFormData({ ...formData, delegue_id: e.target.value || null })}
                  disabled={submitAction.isRunning}
                >
                  <option value="">Aucune délégation</option>
                  {users
                    .filter(u => u.entreprise_id === (isSuperAdmin ? formData.entreprise_id : user?.entreprise_id) && u.id !== editingUser?.id && u.statut === 'actif')
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>
                    ))
                  }
                </Form.Select>
                <Form.Text className="text-muted">Ce délégué pourra valider les congés de votre équipe en votre absence.</Form.Text>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitAction.isRunning}>Annuler</Button>
            <AsyncButton
              variant="primary"
              type="submit"
              action={submitAction}
              loadingText={editingUser ? 'Mise a jour...' : 'Creation...'}
            >
              {editingUser ? 'Mettre a jour' : 'Creer'}
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Info utilisateurs</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-0">
            <li>La liste affiche uniquement le minimum.</li>
            <li>Utilisez Detail pour voir email, entreprise et date d'embauche.</li>
            <li>Modifier/Activer/Supprimer restent dans les actions.</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailsModal} onHide={closeDetailsModal} centered dialogClassName="users-management-details-modal">
        <Modal.Header closeButton>
          <Modal.Title>Detail utilisateur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUserDetails && (
            <div className="d-grid gap-2 small users-management-details-grid">
              <div><strong>Nom:</strong> {selectedUserDetails.prenom} {selectedUserDetails.nom}</div>
              <div><strong>Email:</strong> {selectedUserDetails.email || 'Non defini'}</div>
              <div><strong>Role:</strong> {selectedUserDetails.role || 'Non defini'}</div>
              <div><strong>Statut:</strong> {selectedUserDetails.statut || 'Non defini'}</div>
              <div><strong>Service:</strong> {selectedUserDetails.service || 'Non defini'}</div>
              <div><strong>Entreprise:</strong> {companiesById[selectedUserDetails.entreprise_id] || 'Non definie'}</div>
              <div><strong>Date embauche:</strong> {formatDate(selectedUserDetails.date_embauche)}</div>
              <div><strong>Mise a jour:</strong> {formatDate(selectedUserDetails.updatedAt)}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedUserDetails?.statut === 'en_attente' && (
            <AsyncButton
              variant="outline-info"
              size="sm"
              onClick={() => {
                handleResendInvitation(selectedUserDetails);
                closeDetailsModal();
              }}
              isLoading={mutateUserAction.isRunning && activeUserActionId === selectedUserDetails?.id}
              loadingText="Envoi..."
            >
              <FaEnvelope className="me-1" /> Renvoyer l'invitation
            </AsyncButton>
          )}
          <Button variant="secondary" onClick={closeDetailsModal}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UsersManagement;