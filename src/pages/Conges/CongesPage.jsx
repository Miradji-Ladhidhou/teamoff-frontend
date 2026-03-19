import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Form, InputGroup, Spinner, Alert, Pagination, Modal } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaEye, FaFilter, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService } from '../../services/api';
import { InfoCardInfo, TipCard, SuccessCardInfo } from '../../components/InfoCard';
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCongeToReject, setSelectedCongeToReject] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
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
    setShowValidateModal(true);
  };

  const closeValidateModal = () => {
    setShowValidateModal(false);
    setSelectedCongeToValidate(null);
  };

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
        await congesService.validate(selectedCongeToValidate);
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
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            {isAdmin() ? 'Gestion des Congés' : 'Mes Congés'}
          </h1>
          <p className="text-muted">
            {user?.role === 'super_admin'
              ? 'Superviser l\'ensemble des demandes de congé de la plateforme'
              : isAdmin()
                ? 'Gérer tous les congés de l\'entreprise'
                : 'Consulter et gérer vos demandes de congés'}
          </p>
        </div>
        {canCreateLeave && (
          <Button as={Link} to="/conges/nouveau" variant="primary" className="d-flex align-items-center">
            <FaPlus className="me-2" />
            Nouveau congé
          </Button>
        )}
      </div>

      {/* Contenu d'aide selon le rôle */}
      {user?.role === 'employe' && (
        <>
          <InfoCardInfo title="Comment demander un congé ?">
            <p>Cliquez sur le bouton "Nouveau congé" pour soumettre une demande. Remplissez le formulaire avec:</p>
            <ul className="mb-2">
              <li>Les dates de début et fin du congé</li>
              <li>Le type de congé (congé payé, RTT, etc.)</li>
              <li>Un commentaire optionnel</li>
            </ul>
            <p className="mb-0">Votre manager devra ensuite valider votre demande.</p>
          </InfoCardInfo>

          <TipCard title="Conseil: Check votre solde">
            Pensez à consulter votre solde de congés disponibles avant de faire une demande ! Vous pouvez le voir dans votre tableau de bord.
          </TipCard>
        </>
      )}

      {(user?.role === 'manager' || user?.role === 'admin_entreprise') && (
        <>
          <SuccessCardInfo title="Vous êtes chargé de valider les demandes">
            <p>En tant que manager ou administrateur, vous devez valider ou refuser les demandes de congé de votre équipe.</p>
            <p className="mb-0">Accédez à la liste des congés en attente et cliquez sur chaque demande pour l'approuver ou la rejeter.</p>
          </SuccessCardInfo>
        </>
      )}

      <Card className="mb-4">
        <Card.Header>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="d-flex align-items-center"
          >
            <FaFilter className="me-2" />
            Filtres
          </Button>
        </Card.Header>

        {showFilters && (
          <Card.Body>
            <Row>
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
            <Row>
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
              <p className="text-muted">
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
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employé</th>
                      {user?.role === 'super_admin' && <th>Entreprise</th>}
                      <th>Type</th>
                      <th>Période</th>
                      <th>Jours pris</th>
                      <th>Jours restant</th>
                      <th>Statut</th>
                      <th>Date demande</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConges.map((conge) => (
                      <tr key={conge.id}>
                        <td>{getEmployeLabel(conge)}</td>
                        {user?.role === 'super_admin' && <td>{getEntrepriseLabel(conge)}</td>}
                        <td>{getCongeTypeLabel(conge)}</td>
                        <td>
                          {formatDate(conge.date_debut)} - {formatDate(conge.date_fin)}
                        </td>
                        <td>{formatDays(conge.jours_pris ?? conge.jours_calcules)}</td>
                        <td>{formatDays(conge.jours_restants)}</td>
                        <td>{getStatusBadge(conge.statut)}</td>
                        <td>{formatDate(conge.date_demande || conge.created_at || conge.createdAt)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/conges/${conge.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              <FaEye />
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
                <div className="d-flex justify-content-center p-3 border-top">
                  <Pagination>
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
          Confirmez-vous la validation de cette demande de congé ?
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
    </Container>
  );
};

export default CongesPage;