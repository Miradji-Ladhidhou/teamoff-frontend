import './users.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, InputGroup } from 'react-bootstrap';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaUserCheck, FaUserTimes, FaDownload, FaEnvelope, FaCoins } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const alert = useAlert();
  const { confirm } = useConfirmation();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const ITEMS_PER_PAGE = 50;

  // Réinitialise la page quand les filtres changent
  useEffect(() => { setCurrentPage(1); }, [searchTerm, companyFilter, roleFilter, statusFilter]);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [servicesByCompany, setServicesByCompany] = useState({});
  const [activeUserActionId, setActiveUserActionId] = useState(null);
  const submitAction = useAsyncAction();
  const exportAction = useAsyncAction();
  const mutateUserAction = useAsyncAction();

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
    const searchableText = `${targetUser.prenom || ''} ${targetUser.nom || ''} ${targetUser.email || ''} ${targetUser.service || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm.toLowerCase());
    const matchesCompany = !companyFilter || targetUser.entreprise_id === companyFilter;
    const matchesRole = !roleFilter || targetUser.role === roleFilter;
    const matchesStatus = !statusFilter || targetUser.statut === statusFilter;
    return matchesSearch && matchesCompany && matchesRole && matchesStatus;
  }), [users, searchTerm, companyFilter, roleFilter, statusFilter]);

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

  const getStatusDot = (status) => {
    const colors = { actif: 'var(--dk-success)', inactif: 'var(--dk-error)', en_attente: 'var(--dk-warning)' };
    return <span className="status-dot" style={{ background: colors[status] || 'var(--dk-text-muted)' }} title={status} />;
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

  const renderPagination = (className = '') => totalPages > 1 ? (
    <div className={`d-flex justify-content-between align-items-center px-3 py-2 users-pager ${className}`}>
      <small className="text-muted">
        {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredUsers.length)} sur {filteredUsers.length}
      </small>
      <div className="d-flex gap-1">
        <Button size="sm" variant="outline-secondary" disabled={safePage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹ Préc.</Button>
        <Button size="sm" variant="outline-secondary" disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Suiv. ›</Button>
      </div>
    </div>
  ) : null;

  return (
    <Container fluid="sm" className="users-management-page">
      {/* En-tête */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Utilisateurs</span>
        <div className="d-flex flex-wrap gap-2">
          <AsyncButton variant="outline-secondary" onClick={handleExportCsv} action={exportAction} loadingText="" title="Exporter CSV">
            <FaDownload className="me-1" /><span className="d-none d-sm-inline">Export CSV</span>
          </AsyncButton>
          <label className="btn btn-outline-secondary mb-0" style={{ cursor: importAction.isRunning ? 'wait' : 'pointer' }} title="Importer via CSV">
            <FaDownload className="me-1" style={{ transform: 'rotate(180deg)' }} />
            <span className="d-none d-sm-inline">Import CSV</span>
            <input type="file" accept=".csv,text/csv" className="d-none" onChange={handleImportCsv} disabled={importAction.isRunning} />
          </label>
          <Button variant="primary" onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}>
            <FaPlus className="me-1" /><span className="d-none d-sm-inline">Nouvel </span>utilisateur
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="users-filter-bar mb-3">
        <InputGroup className="users-filter-bar__search">
          <InputGroup.Text><FaSearch /></InputGroup.Text>
          <Form.Control type="text" placeholder="Nom, email, service…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </InputGroup>
        {isSuperAdmin && (
          <Form.Select className="users-filter-bar__select" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">Toutes entreprises</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Form.Select>
        )}
        <Form.Select className="users-filter-bar__select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tous rôles</option>
          {isSuperAdmin && <option value="super_admin">Super Admin</option>}
          {isSuperAdmin && <option value="admin_entreprise">Admin</option>}
          <option value="manager">Manager</option>
          <option value="employe">Employé</option>
        </Form.Select>
        <Form.Select className="users-filter-bar__select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="en_attente">En attente</option>
        </Form.Select>
        <span className="badge info users-filter-bar__count">
          {filteredUsers.length}{users.length !== filteredUsers.length ? `/${users.length}` : ''}
        </span>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-5">
          <FaUsers size={36} className="text-muted mb-3" />
          <p className="text-muted mb-0">
            {searchTerm || companyFilter || roleFilter || statusFilter
              ? 'Aucun utilisateur ne correspond aux filtres.'
              : 'Créez votre premier utilisateur.'}
          </p>
        </div>
      ) : (
        <>
          {/* Liste compacte — mobile */}
          <div className="user-list-mobile d-md-none">
            {pagedUsers.map((targetUser) => (
              <button
                key={targetUser.id}
                type="button"
                className="user-row-btn"
                onClick={() => openDetailsModal(targetUser)}
              >
                <div className={`user-row-avatar ${roleToAvatarColor(targetUser.role)}`}>
                  {getInitials(targetUser)}
                </div>
                <div className="user-row-info">
                  <div className="user-row-name">{targetUser.prenom} {targetUser.nom}</div>
                  <div className="user-row-sub">{targetUser.service || targetUser.email}</div>
                </div>
                <div className="user-row-right">
                  {getRoleBadge(targetUser.role)}
                  {getStatusDot(targetUser.statut)}
                </div>
                <span className="user-row-chevron">›</span>
              </button>
            ))}
          </div>
          {renderPagination('d-md-none border-top')}

          {/* Tableau dense — desktop */}
          <div className="d-none d-md-block users-management-table-wrap">
            <Table hover responsive className="users-dense-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Service</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th style={{ width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((targetUser) => (
                  <tr key={targetUser.id} className="user-table-row" onClick={() => openDetailsModal(targetUser)}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className={`user-row-avatar user-row-avatar--sm ${roleToAvatarColor(targetUser.role)}`}>
                          {getInitials(targetUser)}
                        </div>
                        <div>
                          <div className="user-display-name">{targetUser.prenom} {targetUser.nom}</div>
                          <div className="user-display-email">{targetUser.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-muted" style={{ fontSize: '12px' }}>{targetUser.service || '—'}</span></td>
                    <td>{getRoleBadge(targetUser.role)}</td>
                    <td>{getStatusBadge(targetUser.statut)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex gap-1 flex-nowrap">
                        <Button variant="outline-primary" size="sm" onClick={() => handleEdit(targetUser)} title="Modifier"><FaEdit /></Button>
                        {!isSuperAdmin && (
                          <Button variant="outline-info" size="sm" onClick={() => navigate(`/soldes?userId=${targetUser.id}`)} title="Soldes"><FaCoins /></Button>
                        )}
                        <AsyncButton
                          variant={targetUser.statut === 'actif' ? 'outline-warning' : 'outline-success'}
                          size="sm"
                          onClick={() => toggleUserStatus(targetUser)}
                          title={targetUser.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id}
                          loadingText=""
                          disabled={mutateUserAction.isRunning && activeUserActionId !== targetUser.id}
                        >
                          {targetUser.statut === 'actif' ? <FaUserTimes /> : <FaUserCheck />}
                        </AsyncButton>
                        {targetUser.statut === 'en_attente' && (
                          <AsyncButton variant="outline-info" size="sm" onClick={() => handleResendInvitation(targetUser)} title="Renvoyer invitation"
                            isLoading={mutateUserAction.isRunning && activeUserActionId === targetUser.id} loadingText="">
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
                          loadingText="">
                          <FaTrash />
                        </AsyncButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {renderPagination('d-none d-md-flex border-top')}
        </>
      )}

      {/* Modal créer / modifier */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" keyboard={!submitAction.isRunning} centered>
        <Modal.Header closeButton={!submitAction.isRunning}>
          <Modal.Title>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="users-management-modal__body">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prénom *</Form.Label>
                  <Form.Control type="text" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} required disabled={submitAction.isRunning} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required disabled={submitAction.isRunning} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={submitAction.isRunning} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date d'embauche</Form.Label>
              <Form.Control type="date" value={formData.date_embauche} onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })} disabled={submitAction.isRunning} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Rôle *</Form.Label>
                  <Form.Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value, service: ['employe', 'manager'].includes(e.target.value) ? formData.service : '' })} required disabled={submitAction.isRunning}>
                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                    {isSuperAdmin && <option value="admin_entreprise">Admin entreprise</option>}
                    <option value="manager">Manager</option>
                    <option value="employe">Employé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Service{formData.role === 'employe' ? ' *' : ''}</Form.Label>
                  <Form.Select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    required={formData.role === 'employe'} disabled={submitAction.isRunning || selectableServices.length === 0 || !isServiceRole}>
                    <option value="">{selectableServices.length > 0 ? 'Sélectionner' : 'Aucun service'}</option>
                    {selectableServices.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                  {selectableServices.length === 0 && isServiceRole && (
                    <div className="small text-warning mt-1">⚠️ Créez des services depuis Règles & services d'abord.</div>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Entreprise *</Form.Label>
                  {isSuperAdmin ? (
                    <Form.Select value={formData.entreprise_id} onChange={(e) => setFormData({ ...formData, entreprise_id: e.target.value, service: '' })} required disabled={submitAction.isRunning}>
                      <option value="">Sélectionner</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </Form.Select>
                  ) : (
                    <Form.Control value={companiesById[user?.entreprise_id] || 'Entreprise courante'} disabled />
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select value={formData.statut} onChange={(e) => setFormData({ ...formData, statut: e.target.value })} disabled={submitAction.isRunning}>
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
                    <Form.Control type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Laisser vide = inchangé" disabled={submitAction.isRunning} />
                  </Form.Group>
                </Col>
              )}
            </Row>
            {editingUser && ['manager', 'admin_entreprise'].includes(formData.role) && (
              <Form.Group className="mb-3">
                <Form.Label>Délégué (en cas d'absence)</Form.Label>
                <Form.Select value={formData.delegue_id || ''} onChange={(e) => setFormData({ ...formData, delegue_id: e.target.value || null })} disabled={submitAction.isRunning}>
                  <option value="">Aucune délégation</option>
                  {users.filter((u) => u.entreprise_id === (isSuperAdmin ? formData.entreprise_id : user?.entreprise_id) && u.id !== editingUser?.id && u.statut === 'actif')
                    .map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>)}
                </Form.Select>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitAction.isRunning}>Annuler</Button>
            <AsyncButton variant="primary" type="submit" action={submitAction} loadingText={editingUser ? 'Mise à jour…' : 'Création…'}>
              {editingUser ? 'Enregistrer' : 'Créer'}
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal détail — hub d'actions */}
      <Modal show={showDetailsModal} onHide={closeDetailsModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedUserDetails && (
              <div className="d-flex align-items-center gap-2">
                <div className={`user-row-avatar user-row-avatar--sm ${roleToAvatarColor(selectedUserDetails.role)}`}>
                  {getInitials(selectedUserDetails)}
                </div>
                <span>{selectedUserDetails.prenom} {selectedUserDetails.nom}</span>
              </div>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUserDetails && (
            <div className="users-details-grid">
              <div className="users-details-row"><span>Email</span><span>{selectedUserDetails.email || '—'}</span></div>
              <div className="users-details-row"><span>Rôle</span><span>{getRoleBadge(selectedUserDetails.role)}</span></div>
              <div className="users-details-row"><span>Statut</span><span>{getStatusBadge(selectedUserDetails.statut)}</span></div>
              <div className="users-details-row"><span>Service</span><span>{selectedUserDetails.service || '—'}</span></div>
              {isSuperAdmin && <div className="users-details-row"><span>Entreprise</span><span>{companiesById[selectedUserDetails.entreprise_id] || '—'}</span></div>}
              <div className="users-details-row"><span>Embauche</span><span>{formatDate(selectedUserDetails.date_embauche)}</span></div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="flex-wrap gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => { closeDetailsModal(); handleEdit(selectedUserDetails); }}>
            <FaEdit className="me-1" />Modifier
          </Button>
          {!isSuperAdmin && (
            <Button variant="outline-info" size="sm" onClick={() => { closeDetailsModal(); navigate(`/soldes?userId=${selectedUserDetails.id}`); }}>
              <FaCoins className="me-1" />Soldes
            </Button>
          )}
          {selectedUserDetails?.statut === 'en_attente' && (
            <AsyncButton variant="outline-info" size="sm"
              onClick={() => { handleResendInvitation(selectedUserDetails); closeDetailsModal(); }}
              isLoading={mutateUserAction.isRunning && activeUserActionId === selectedUserDetails?.id}
              loadingText="Envoi…">
              <FaEnvelope className="me-1" />Renvoyer invitation
            </AsyncButton>
          )}
          <AsyncButton
            variant={selectedUserDetails?.statut === 'actif' ? 'outline-warning' : 'outline-success'}
            size="sm"
            onClick={() => { closeDetailsModal(); toggleUserStatus(selectedUserDetails); }}
            isLoading={mutateUserAction.isRunning && activeUserActionId === selectedUserDetails?.id}
            loadingText="">
            {selectedUserDetails?.statut === 'actif' ? <><FaUserTimes className="me-1" />Désactiver</> : <><FaUserCheck className="me-1" />Activer</>}
          </AsyncButton>
          <AsyncButton variant="outline-danger" size="sm"
            onClick={() => { closeDetailsModal(); handleDelete(selectedUserDetails.id); }}
            disabled={selectedUserDetails?.id === user?.id}
            isLoading={mutateUserAction.isRunning && activeUserActionId === selectedUserDetails?.id}
            loadingText="">
            <FaTrash className="me-1" />Supprimer
          </AsyncButton>
          <Button variant="secondary" size="sm" className="ms-auto" onClick={closeDetailsModal}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UsersManagement;