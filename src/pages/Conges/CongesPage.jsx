import './conges.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Form, InputGroup, Spinner, Alert, Pagination, Modal } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaFilter, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const CongesPage = () => {
  const { user, isAdmin } = useAuth();
  const canCreateLeave = ['employe', 'manager'].includes(user?.role);
  const location = useLocation();
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [filters, setFilters] = useState({
    statut: '',
    conge_type_id: '',
    search: '',
    joursRestantsMin: '',
    joursRestantsMax: '',
    dateDemandeDebut: '',
    dateDemandeFin: '',
    sortBy: 'date_demande',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [selectedCongeToValidate, setSelectedCongeToValidate] = useState(null);
  const [validateComment, setValidateComment] = useState('');
  const [validationOverlapByCongeId, setValidationOverlapByCongeId] = useState({});
  const [validationOverlapLoading, setValidationOverlapLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCongeToReject, setSelectedCongeToReject] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCongeDetails, setSelectedCongeDetails] = useState(null);
  const validateAction = useAsyncAction();
  const rejectAction = useAsyncAction();

  const loadConges = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.statut) {
        params.statut = filters.statut;
      }

      if (filters.conge_type_id) {
        params.conge_type_id = filters.conge_type_id;
      }

      // Filtrage selon le rôle
      if (user?.role === 'employe') {
        // Employé : seulement ses propres congés
        params.utilisateur_id = user.id;
      } else if (user?.role === 'manager') {
        // Manager : congés de son équipe (tous sauf lui-même)
        params.equipe_manager = user.id;
      }
      // Admin et super_admin voient tout

      // Nettoyer les paramètres vides
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await congesService.getAll(params);
      setConges(response.data);
      setServerTotalPages(Math.ceil((response.total || response.data.length) / filters.limit));
    } catch (err) {
      console.error('Erreur lors du chargement des congés:', err);
      alert.error('Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  }, [filters.conge_type_id, filters.limit, filters.statut, user?.id, user?.role]);

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
      page: 1
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

  // Filtrage des congés côté client pour la recherche rapide
  const filteredConges = useMemo(() => {
    return conges.filter((conge) => {
      const query = (filters.search || '').toLowerCase();
      const matchesSearch = !query
        || getCongeTypeLabel(conge).toLowerCase().includes(query)
        || getEmployeLabel(conge).toLowerCase().includes(query)
        || getEntrepriseLabel(conge).toLowerCase().includes(query)
        || conge.commentaire_employe?.toLowerCase().includes(query);

      const matchesCongeType = !filters.conge_type_id || conge.conge_type_id === filters.conge_type_id;

      const joursRestants = Number(conge.jours_restants);
      const joursRestantsMin = filters.joursRestantsMin === '' ? null : Number(filters.joursRestantsMin);
      const joursRestantsMax = filters.joursRestantsMax === '' ? null : Number(filters.joursRestantsMax);
      const matchesJoursRestants = (!Number.isFinite(joursRestantsMin) || joursRestants >= joursRestantsMin)
        && (!Number.isFinite(joursRestantsMax) || joursRestants <= joursRestantsMax);

      const dateDemande = conge.date_demande || conge.created_at || conge.createdAt;
      const dateDemandeKey = dateDemande ? new Date(dateDemande).toISOString().slice(0, 10) : null;
      const matchesDateDemande = (!filters.dateDemandeDebut || (dateDemandeKey && dateDemandeKey >= filters.dateDemandeDebut))
        && (!filters.dateDemandeFin || (dateDemandeKey && dateDemandeKey <= filters.dateDemandeFin));

      return matchesSearch && matchesCongeType && matchesJoursRestants && matchesDateDemande;
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

  // Pagination des données filtrées
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
      page: 1 // Reset to first page when filtering
    }));
  };

  const openValidateModal = (congeId) => {
    setSelectedCongeToValidate(congeId);
    setValidateComment('');
    setShowValidateModal(true);
    fetchValidationOverlap(congeId);
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
      const targetConges = paginatedConges.filter((conge) => canValidateConge(conge));
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

  const openDetailsModal = (conge) => {
    setSelectedCongeDetails(conge);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedCongeDetails(null);
  };

  const canValidateConge = (conge) => {
    const workflow = conge?.effective_approval_workflow;

    if (workflow === 'auto') return false;

    if (user?.role === 'manager') {
      if (workflow === 'admin_only') return false;
      return conge.statut === 'en_attente_manager';
    }

    if (user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
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

    if (user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
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
        closeValidateModal();
        loadConges(); // Recharger la liste
      } catch (err) {
        console.error('Erreur lors de la validation:', err);
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
        closeRejectModal();
        loadConges(); // Recharger la liste
      } catch (err) {
        console.error('Erreur lors du rejet:', err);
        alert.error(err.response?.data?.message || 'Erreur lors du rejet du congé');
      }
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      en_attente_manager: 'warning',
      valide_manager: 'info',
      refuse_manager: 'danger',
      valide_final: 'success',
      refuse_final: 'danger'
    };

    const labels = {
      en_attente_manager: 'En attente validation',
      valide_manager: 'Validé manager',
      refuse_manager: 'Refusé manager',
      valide_final: 'Validé final',
      refuse_final: 'Refusé final'
    };

    return (
      <Badge bg={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
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
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('fr-FR');
  };

  return (
    <Container fluid="sm" className="conges-page">
      {/* En-tête responsive */}
      <div className="page-header">
        <div>
          <h1 className="h4 mb-1">
            {isAdmin() ? 'Congés' : 'Mes congés'}
          </h1>
          <p className="text-muted small mb-0">
            {user?.role === 'super_admin'
              ? 'Vue globale'
              : isAdmin()
                ? 'Vue entreprise'
                : 'Mes demandes'}
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="outline-secondary" onClick={() => setShowInfoModal(true)}>
            Info
          </Button>
          {canCreateLeave && (
            <Button as={Link} to="/conges/nouveau" variant="primary" className="d-flex align-items-center justify-content-center">
              <FaPlus className="me-2" />
              Nouveau
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-4 conges-filters-card">
        <Card.Header>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="d-flex align-items-center conges-filters-toggle"
          >
            <FaFilter className="me-2" />
            Filtres
          </Button>
        </Card.Header>

        {showFilters && (
          <Card.Body className="conges-filters-body">
            <Row className="g-3">
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={filters.statut}
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="en_attente_manager">En attente manager</option>
                    <option value="valide_manager">Validé manager</option>
                    <option value="valide_final">Validé final</option>
                    <option value="refuse_manager">Refusé manager</option>
                    <option value="refuse_final">Refusé final</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Recherche</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={isAdmin() ? "Rechercher par employé ou type de congé..." : "Rechercher par type de congé..."}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours restant min</Form.Label>
                  <Form.Control
                    type="number"
                    value={filters.joursRestantsMin}
                    onChange={(e) => handleFilterChange('joursRestantsMin', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours restant max</Form.Label>
                  <Form.Control
                    type="number"
                    value={filters.joursRestantsMax}
                    onChange={(e) => handleFilterChange('joursRestantsMax', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date demande du</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.dateDemandeDebut}
                    onChange={(e) => handleFilterChange('dateDemandeDebut', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date demande au</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.dateDemandeFin}
                    onChange={(e) => handleFilterChange('dateDemandeFin', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Trier par</Form.Label>
                  <Form.Select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="date_demande">Date demande</option>
                    <option value="jours_restants">Jours restant</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Ordre</Form.Label>
                  <Form.Select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  >
                    <option value="desc">Décroissant</option>
                    <option value="asc">Croissant</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        )}
      </Card>

      <Card>
        <Card.Body className="p-0">
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
              {/* Vue carte — mobile uniquement */}
              <div className="d-md-none mobile-card-list conges-mobile-list">
                {paginatedConges.map((conge) => (
                  <div key={conge.id} className="mobile-card-list__item conges-mobile-list__item">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="fw-semibold small text-truncate">{getCongeTypeLabel(conge)}</div>
                        {isAdmin() && <div className="text-muted text-xs">{getEmployeLabel(conge)}</div>}
                        {user?.role === 'super_admin' && (
                          <div className="text-muted text-2xs">{getEntrepriseLabel(conge)}</div>
                        )}
                      </div>
                      <div className="flex-shrink-0">{getStatusBadge(conge.statut)}</div>
                    </div>
                    <div className="text-muted mb-2 small">
                      📅 {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                      {(conge.jours_pris ?? conge.jours_calcules) && ` · ${formatDays(conge.jours_pris ?? conge.jours_calcules)} j`}
                    </div>
                    <div className="d-flex gap-2 conges-mobile-list__actions">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="flex-grow-1 justify-content-center"
                        onClick={() => openDetailsModal(conge)}
                      >
                        Détail
                      </Button>
                      {canValidateConge(conge) && (
                        <Button variant="outline-success" size="sm" onClick={() => openValidateModal(conge.id)}>✓</Button>
                      )}
                      {canRejectConge(conge) && (
                        <Button variant="outline-danger" size="sm" onClick={() => openRejectModal(conge.id)}>✗</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vue tableau — desktop uniquement */}
              <div className="d-none d-md-block table-responsive conges-table-wrapper">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      {isAdmin() && <th>Employé</th>}
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
                        {isAdmin() && <td>{getEmployeLabel(conge)}</td>}
                        {user?.role === 'super_admin' && <td>{getEntrepriseLabel(conge)}</td>}
                        <td>{getCongeTypeLabel(conge)}</td>
                        <td>
                          {formatDate(conge.date_debut)} - {formatDate(conge.date_fin)}
                        </td>
                        <td>{getStatusBadge(conge.statut)}</td>
                        <td>
                          <div className="d-flex gap-1 conges-table-actions">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openDetailsModal(conge)}
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
              </div>{/* fin .d-none.d-md-block */}

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
        </Card.Body>
      </Card>

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
          <div className="small text-muted mb-3">Vérification du chevauchement en cours...</div>
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

      <Modal show={showDetailsModal} onHide={closeDetailsModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Détail du congé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCongeDetails && (
            <div className="d-grid gap-2 small">
              {isAdmin() && (
                <div>
                  <strong>Employé:</strong> {getEmployeLabel(selectedCongeDetails)}
                </div>
              )}
              {user?.role === 'super_admin' && (
                <div>
                  <strong>Entreprise:</strong> {getEntrepriseLabel(selectedCongeDetails)}
                </div>
              )}
              <div>
                <strong>Type:</strong> {getCongeTypeLabel(selectedCongeDetails)}
              </div>
              <div>
                <strong>Période:</strong> {formatDate(selectedCongeDetails.date_debut)} - {formatDate(selectedCongeDetails.date_fin)}
              </div>
              <div>
                <strong>Jours pris:</strong> {formatDays(selectedCongeDetails.jours_pris ?? selectedCongeDetails.jours_calcules)}
              </div>
              <div>
                <strong>Jours restants:</strong> {formatDays(selectedCongeDetails.jours_restants)}
              </div>
              <div>
                <strong>Date demande:</strong> {formatDate(selectedCongeDetails.date_demande || selectedCongeDetails.created_at || selectedCongeDetails.createdAt)}
              </div>
              <div>
                <strong>Statut:</strong> {getStatusBadge(selectedCongeDetails.statut)}
              </div>
              {selectedCongeDetails.commentaire_employe && (
                <div>
                  <strong>Commentaire:</strong> {selectedCongeDetails.commentaire_employe}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetailsModal}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Info congés</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-0">
            <li>Utilisez les filtres pour aller vite.</li>
            <li>Cliquez sur Détail pour voir toutes les données.</li>
            <li>Les validations/rejets restent dans les actions.</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CongesPage;