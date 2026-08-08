import './conges.css';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Button, ButtonGroup, Table, Form, InputGroup, Spinner, Alert, Pagination, Modal } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaSearch, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const getCongeAccent = (statut, role) => {
  const isAdminRole = ['admin_entreprise', 'super_admin', 'manager'].includes(role);
  switch (statut) {
    case 'reserve':
      return { accent: 'reserve', label: 'Réservé' };
    case 'en_attente_manager':
      return { accent: 'pending', label: 'En attente' };
    case 'valide_manager':
      return { accent: 'info', label: isAdminRole ? 'Validé manager' : 'En cours' };
    case 'valide_final':
      return { accent: 'success', label: 'Approuvé' };
    case 'refuse_manager':
    case 'refuse_final':
      return { accent: 'danger', label: 'Refusé' };
    default:
      return { accent: 'pending', label: statut };
  }
};

const accentToBarColor = (accent) => {
  const map = { pending: 'amber', info: 'blue', success: 'green', danger: 'red' };
  return map[accent] || 'blue';
};

const accentToBadgeClass = (accent) => {
  const map = { pending: 'pending', info: 'info', success: 'approved', danger: 'refused', reserve: 'reserve' };
  return map[accent] || 'pending';
};

const CongesPage = () => {
  const { user, isAdmin } = useAuth();
  const canCreateLeave = ['employe', 'manager'].includes(user?.role);
  const isManager = user?.role === 'manager';
  const location = useLocation();
  const [viewMode, setViewMode] = useState('all'); // 'own' | 'all'
  const [canViewAllEmployees, setCanViewAllEmployees] = useState(false);
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [filters, setFilters] = useState({
    statut: '',
    conge_type_id: '',
    search: '',
    sortBy: 'date_demande',
    sortOrder: 'desc',
    limit: 10
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [selectedCongeToValidate, setSelectedCongeToValidate] = useState(null);
  const [validateComment, setValidateComment] = useState('');
  const [validationOverlapByCongeId, setValidationOverlapByCongeId] = useState({});
  const validationOverlapCacheRef = useRef({});
  validationOverlapCacheRef.current = validationOverlapByCongeId;
  const [validationOverlapLoading, setValidationOverlapLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCongeToReject, setSelectedCongeToReject] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const validateAction = useAsyncAction();
  const rejectAction = useAsyncAction();

  useEffect(() => {
    if (!isManager || !user?.entreprise_id) return;
    entreprisesService.getPolitique(user.entreprise_id)
      .then((res) => {
        const politique = res.data?.politique_conges || {};
        setCanViewAllEmployees(politique.manager_can_view_employee_history !== false);
      })
      .catch(() => {});
  }, [isManager, user?.entreprise_id]);

  const loadConges = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.statut) params.statut = filters.statut;
      if (filters.conge_type_id) params.conge_type_id = filters.conge_type_id;

      if (user?.role === 'employe') {
        params.utilisateur_id = user.id;
      } else if (isManager) {
        if (viewMode === 'own') params.utilisateur_id = user.id;
        // viewMode 'all': no user filter — backend returns all company employees
      }

      Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });

      const response = await congesService.getAll(params);
      const items = Array.isArray(response.data?.items) ? response.data.items : (Array.isArray(response.data) ? response.data : []);
      setConges(items);
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  }, [filters.conge_type_id, filters.limit, filters.statut, user?.id, user?.role, isManager, viewMode]);

  useEffect(() => {
    loadConges();
  }, [loadConges]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const congeTypeId = params.get('conge_type_id') || '';

    if (!congeTypeId) return;

    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      conge_type_id: congeTypeId,
    }));
  }, [location.search]);

  const getCongeTypeLabel = (conge) => {
    if (typeof conge?.conge_type === 'string') return conge.conge_type;
    if (conge?.conge_type?.libelle) return conge.conge_type.libelle;
    return conge?.conge_type_libelle || 'Type inconnu';
  };

  const getEmployeLabel = (conge) => {
    if (conge?.utilisateur_nom) return conge.utilisateur_nom;
    if (conge?.utilisateur) return `${conge.utilisateur.prenom || ''} ${conge.utilisateur.nom || ''}`.trim();
    return 'Utilisateur inconnu';
  };

  const getEntrepriseLabel = (conge) => {
    if (conge?.entreprise_nom) return conge.entreprise_nom;
    if (conge?.entreprise?.nom) return conge.entreprise.nom;
    return 'Entreprise inconnue';
  };

  const filteredConges = useMemo(() => {
    return conges.filter((conge) => {
      const query = (filters.search || '').toLowerCase();
      const matchesSearch = !query
        || getCongeTypeLabel(conge).toLowerCase().includes(query)
        || getEmployeLabel(conge).toLowerCase().includes(query)
        || getEntrepriseLabel(conge).toLowerCase().includes(query)
        || conge.commentaire_employe?.toLowerCase().includes(query);

      const matchesCongeType = !filters.conge_type_id || conge.conge_type_id === filters.conge_type_id;

      return matchesSearch && matchesCongeType;
    });
  }, [conges, filters]);

  const sortedConges = useMemo(() => {
    const sorted = [...filteredConges];
    const direction = filters.sortOrder === 'asc' ? 1 : -1;

    sorted.sort((left, right) => {
      if (filters.sortBy === 'jours_restants') {
        return ((Number(left.jours_restants) || 0) - (Number(right.jours_restants) || 0)) * direction;
      }

      const leftDate = new Date(left.date_demande || left.created_at || left.createdAt || 0).getTime();
      const rightDate = new Date(right.date_demande || right.created_at || right.createdAt || 0).getTime();
      return (leftDate - rightDate) * direction;
    });

    return sorted;
  }, [filteredConges, filters.sortBy, filters.sortOrder]);

  const paginatedConges = useMemo(() => {
    const startIndex = (currentPage - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    return sortedConges.slice(startIndex, endIndex);
  }, [sortedConges, currentPage, filters.limit]);

  const totalPages = useMemo(() => {
    const computedPages = Math.ceil(sortedConges.length / filters.limit);
    return Math.max(computedPages || 0, 1);
  }, [sortedConges.length, filters.limit]);

  const handleFilterChange = (field, value) => {
    setCurrentPage(1);
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const openValidateModal = (congeId) => {
    setSelectedCongeToValidate(congeId);
    setValidateComment('');
    setShowValidateModal(true);
    if (!validationOverlapByCongeId[congeId]) {
      fetchValidationOverlap(congeId);
    }
  };

  const closeValidateModal = () => {
    setShowValidateModal(false);
    setSelectedCongeToValidate(null);
    setValidateComment('');
  };

  const fetchValidationOverlap = async (congeId) => {
    if (!congeId) return;

    setValidationOverlapLoading(true);
    try {
      const response = await congesService.getValidationOverlap(congeId);
      setValidationOverlapByCongeId((prev) => ({
        ...prev,
        [congeId]: response.data,
      }));
    } catch (err) {
      setValidationOverlapByCongeId((prev) => ({
        ...prev,
        [congeId]: {
          has_overlap: null,
          message: 'Impossible de vérifier le chevauchement pour le moment.',
        },
      }));
    } finally {
      setValidationOverlapLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadValidationOverlapsForPage = async () => {
      const targetConges = paginatedConges.filter(
        (conge) => canValidateConge(conge) && !validationOverlapCacheRef.current[conge.id]
      );
      if (!targetConges.length) return;

      const results = await Promise.all(
        targetConges.map(async (conge) => {
          try {
            const response = await congesService.getValidationOverlap(conge.id);
            return [conge.id, response.data];
          } catch (_) {
            return [conge.id, { has_overlap: null, message: 'Vérification indisponible.' }];
          }
        })
      );

      if (cancelled) return;
      setValidationOverlapByCongeId((prev) => {
        const next = { ...prev };
        results.forEach(([id, data]) => {
          next[id] = data;
        });
        return next;
      });
    };

    loadValidationOverlapsForPage();

    return () => {
      cancelled = true;
    };
  }, [paginatedConges]);

  const openRejectModal = (congeId) => {
    setSelectedCongeToReject(congeId);
    setRejectComment('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedCongeToReject(null);
    setRejectComment('');
  };

  const canValidateConge = (conge) => {
    const workflow = conge?.effective_approval_workflow;

    if (workflow === 'auto') return false;

    if (user?.role === 'manager') {
      if (workflow === 'admin_only') return false;
      return conge.statut === 'en_attente_manager';
    }

    if (isAdmin()) {
      if (workflow === 'manager' || workflow === 'manager_only') return false;
      if (workflow === 'admin_only') return conge.statut === 'en_attente_manager';
      return conge.statut === 'valide_manager';
    }

    return false;
  };

  const canRejectConge = (conge) => {
    if (user?.role === 'manager') {
      return conge.statut === 'en_attente_manager';
    }

    if (isAdmin()) {
      return ['en_attente_manager', 'valide_manager'].includes(conge.statut);
    }

    return false;
  };

  const handleValidateConge = async () => {
    if (!selectedCongeToValidate) return;
    await validateAction.run(async () => {
      try {
        await congesService.validate(selectedCongeToValidate, {
          commentaire: validateComment.trim(),
        });
        alert.success('Congé validé avec succès.');
        closeValidateModal();
        loadConges();
      } catch (err) {
        setValidateComment('');
        alert.error(err.response?.data?.message || 'Erreur lors de la validation du congé');
      }
    });
  };

  const handleRejectConge = async () => {
    if (!selectedCongeToReject) return;

    if (!rejectComment.trim()) {
      alert.error('Veuillez renseigner un motif de rejet.');
      return;
    }

    await rejectAction.run(async () => {
      try {
        await congesService.reject(selectedCongeToReject, { commentaire: rejectComment.trim() });
        alert.info('Congé rejeté.');
        closeRejectModal();
        loadConges();
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors du rejet du congé');
      }
    });
  };

  const getStatusBadge = (status) => {
    const { accent, label } = getCongeAccent(status, user?.role);
    return <span className={`badge ${accentToBadgeClass(accent)}`}>{label}</span>;
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDays = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '-';
    return Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const s = String(dateString).split('T')[0];
    const parts = s.split('-');
    if (parts.length !== 3) return '-';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const isAdminRole = ['admin_entreprise', 'super_admin', 'manager'].includes(user?.role);
  const showEmployeeColumn = isAdmin() || (isManager && viewMode === 'all');
  const statusChips = [
    { value: '', label: 'Tous' },
    { value: 'en_attente_manager', label: 'En attente' },
    { value: 'valide_manager', label: isAdminRole ? 'Validé manager' : 'En cours' },
    { value: 'valide_final', label: 'Approuvé' },
    { value: 'refuse_manager', label: isAdminRole ? 'Refusé manager' : 'Refusé' },
    ...(isAdminRole ? [{ value: 'refuse_final', label: 'Refusé (final)' }] : []),
  ];

  return (
    <Container fluid="sm" className="conges-page">
      {/* En-tête */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">
          {isAdmin() ? 'Congés' : (isManager && viewMode === 'all' ? 'Congés équipe' : 'Mes congés')}
        </span>
        <div className="d-flex align-items-center gap-2">
          {isManager && canViewAllEmployees && (
            <ButtonGroup size="sm">
              <Button
                variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => { setViewMode('all'); setCurrentPage(1); }}
              >
                Équipe
              </Button>
              <Button
                variant={viewMode === 'own' ? 'primary' : 'outline-primary'}
                onClick={() => { setViewMode('own'); setCurrentPage(1); }}
              >
                Mes congés
              </Button>
            </ButtonGroup>
          )}
          {canCreateLeave && (
            <Button as={Link} to="/conges/nouveau" variant="primary" size="sm" className="d-flex align-items-center">
              <FaPlus className="me-2" />
              Nouveau
            </Button>
          )}
        </div>
      </div>

      {/* Barre de recherche + chips statut + tri */}
      <div className="conges-filter-bar mb-3">
        <InputGroup className="conges-filter-bar__search">
          <InputGroup.Text><FaSearch /></InputGroup.Text>
          <Form.Control
            type="text"
            placeholder={isAdmin() || (isManager && viewMode === 'all') ? 'Employé, type de congé…' : 'Type de congé…'}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </InputGroup>
        <div className="chips-row conges-filter-bar__chips">
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`chip${filters.statut === chip.value ? ' active' : ''}`}
              onClick={() => handleFilterChange('statut', chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <Form.Select
          size="sm"
          className="conges-filter-bar__sort"
          value={`${filters.sortBy}__${filters.sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('__');
            handleFilterChange('sortBy', by);
            handleFilterChange('sortOrder', order);
          }}
        >
          <option value="date_demande__desc">Plus récent</option>
          <option value="date_demande__asc">Plus ancien</option>
        </Form.Select>
      </div>

      <div className="conges-list-wrap">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Chargement des congés...</p>
            </div>
          ) : paginatedConges.length === 0 ? (
            <div className="text-center py-5">
              <FaSearch size={48} className="text-muted mb-3" />
              <h5 className="text-muted">Aucun congé trouvé</h5>
              <p className="text-muted small">
                {filters.search || filters.statut ?
                  'Essayez de modifier vos filtres' :
                  (canCreateLeave ? 'Créez votre première demande de congé' : 'Aucune demande trouvée')
                }
              </p>
              {canCreateLeave && (
                <Button as={Link} to="/conges/nouveau" variant="primary">
                  <FaPlus className="me-2" />
                  Nouveau congé
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Vue carte — mobile/tablette portrait */}
              <div className="d-md-none">
                {paginatedConges.map((conge) => {
                  const { accent, label } = getCongeAccent(conge.statut, user?.role);
                  return (
                    <Link key={conge.id} to={`/conges/${conge.id}`} style={{ textDecoration: 'none' }}>
                      <div className="card-accented conges-mobile-item">
                        <div className={`card-accent-bar ${accentToBarColor(accent)}`} />
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <span className={`badge ${accentToBadgeClass(accent)}`}>{label}</span>
                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                              {canValidateConge(conge) && (
                                <Button variant="outline-success" size="sm"
                                  onClick={(e) => { e.preventDefault(); openValidateModal(conge.id); }}>✓</Button>
                              )}
                              {canRejectConge(conge) && (
                                <Button variant="outline-danger" size="sm"
                                  onClick={(e) => { e.preventDefault(); openRejectModal(conge.id); }}>✗</Button>
                              )}
                              <FaChevronRight size={10} style={{ color: 'var(--text-muted, var(--dk-text-muted))', marginLeft: 2 }} />
                            </div>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text, var(--dk-text))', marginBottom: 2 }}>
                            {getCongeTypeLabel(conge)}
                          </div>
                          {showEmployeeColumn && (
                            <div style={{ fontSize: '10px', color: 'var(--text-soft, var(--dk-text-soft))' }}>
                              {getEmployeLabel(conge)}
                            </div>
                          )}
                          {user?.role === 'super_admin' && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted, var(--dk-text-muted))' }}>
                              {getEntrepriseLabel(conge)}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: 'var(--text-soft, var(--dk-text-soft))' }}>
                            {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                            {(conge.jours_pris ?? conge.jours_calcules) != null && ` · ${formatDays(conge.jours_pris ?? conge.jours_calcules)}j`}
                          </div>
                          {conge.statut?.startsWith('refuse') && (conge.commentaire_manager || conge.commentaire_admin) && (
                            <div style={{ fontSize: '10px', color: 'var(--bs-danger, #dc3545)', marginTop: 2 }}>
                              {(conge.commentaire_admin || conge.commentaire_manager)?.slice(0, 80)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Vue tableau — tablette paysage et desktop */}
              <div className="d-none d-md-block table-responsive conges-table-wrapper">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      {showEmployeeColumn && <th>Employé</th>}
                      {user?.role === 'super_admin' && <th>Entreprise</th>}
                      <th>Type</th>
                      <th>Période</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConges.map((conge) => (
                      <tr key={conge.id}>
                        {showEmployeeColumn && <td>{getEmployeLabel(conge)}</td>}
                        {user?.role === 'super_admin' && <td>{getEntrepriseLabel(conge)}</td>}
                        <td>{getCongeTypeLabel(conge)}</td>
                        <td>
                          {formatDate(conge.date_debut)} - {formatDate(conge.date_fin)}
                        </td>
                        <td>
                          {getStatusBadge(conge.statut)}
                          {conge.statut?.startsWith('refuse') && (conge.commentaire_manager || conge.commentaire_admin) && (
                            <div className="small text-muted mt-1" title={conge.commentaire_admin || conge.commentaire_manager}>
                              {(conge.commentaire_admin || conge.commentaire_manager)?.slice(0, 60)}
                              {(conge.commentaire_admin || conge.commentaire_manager)?.length > 60 ? '…' : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 conges-table-actions">
                            <Button
                              as={Link}
                              to={`/conges/${conge.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              Détail
                            </Button>

                            {(canValidateConge(conge) || canRejectConge(conge)) && (
                              <>
                                {canValidateConge(conge) && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => openValidateModal(conge.id)}
                                    title="Valider le congé"
                                  >
                                    ✓
                                  </Button>
                                )}
                                {canRejectConge(conge) && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => openRejectModal(conge.id)}
                                    title="Rejeter le congé"
                                  >
                                    ✗
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center p-3 border-top conges-pagination-wrap">
                  <Pagination className="conges-pagination">
                    <Pagination.First
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                    />
                    <Pagination.Prev
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    />

                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      const pageNumber = Math.max(1, currentPage - 2) + index;
                      if (pageNumber > totalPages) return null;

                      return (
                        <Pagination.Item
                          key={pageNumber}
                          active={pageNumber === currentPage}
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </Pagination.Item>
                      );
                    })}

                    <Pagination.Next
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    />
                    <Pagination.Last
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
      </div>

      <Modal show={showValidateModal} onHide={closeValidateModal} centered backdrop="static" keyboard={!validateAction.isRunning}>
        <Modal.Header closeButton={!validateAction.isRunning}>
          <Modal.Title>Confirmer la validation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCongeToValidate && validationOverlapByCongeId[selectedCongeToValidate] && (
            <Alert
              variant={validationOverlapByCongeId[selectedCongeToValidate].has_overlap ? 'warning' : 'success'}
              className={`mb-3 overlap-alert ${validationOverlapByCongeId[selectedCongeToValidate].has_overlap ? 'overlap-alert-warning' : 'overlap-alert-ok'}`}
            >
              <strong>
                {validationOverlapByCongeId[selectedCongeToValidate].has_overlap
                  ? 'Alerte chevauchement détectée.'
                  : 'Pas de chevauchement détecté.'}
              </strong>
              <div className="small mt-1">{validationOverlapByCongeId[selectedCongeToValidate].message}</div>
            </Alert>
          )}
          {validationOverlapLoading && (
            <div className="d-flex align-items-center gap-2 small text-muted mb-3">
              <Spinner animation="border" size="sm" />
              Vérification du chevauchement en cours…
            </div>
          )}
          <p className="mb-3">Confirmez-vous la validation de cette demande de congé ?</p>
          <Form.Group>
            <Form.Label>Commentaire de validation</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={validateComment}
              onChange={(e) => setValidateComment(e.target.value)}
              placeholder="Ajoutez un commentaire (obligatoire en cas de chevauchement)"
              disabled={validateAction.isRunning}
            />
            <Form.Text className="text-muted">
              Ce commentaire est obligatoire si la demande est en chevauchement.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeValidateModal} disabled={validateAction.isRunning}>
            Annuler
          </Button>
          <AsyncButton
            variant="success"
            onClick={handleValidateConge}
            action={validateAction}
            loadingText="Validation..."
            disabled={validationOverlapLoading || validateAction.isRunning}
          >
            Valider
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      <Modal show={showRejectModal} onHide={closeRejectModal} centered backdrop="static" keyboard={!rejectAction.isRunning}>
        <Modal.Header closeButton={!rejectAction.isRunning}>
          <Modal.Title>Confirmer le rejet</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Motif du rejet</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Saisissez le motif du rejet"
              disabled={rejectAction.isRunning}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeRejectModal} disabled={rejectAction.isRunning}>
            Annuler
          </Button>
          <AsyncButton
            variant="danger"
            onClick={handleRejectConge}
            action={rejectAction}
            loadingText="Rejet..."
          >
            Rejeter
          </AsyncButton>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default CongesPage;
