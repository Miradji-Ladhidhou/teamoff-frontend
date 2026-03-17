import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Form, InputGroup, Spinner, Alert, Pagination, Nav, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaEye, FaEdit, FaFilter, FaSearch, FaCalendarAlt, FaList, FaLightbulb, FaCheckCircle } from 'react-icons/fa';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../styles/calendar.css';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, joursFeriesService, entreprisesService } from '../../services/api';
import { InfoCardInfo, TipCard, SuccessCardInfo } from '../../components/InfoCard';

// Configuration du calendrier
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    fr: fr,
  },
});

const CongesPage = () => {
  const { user, isAdmin } = useAuth();
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    statut: '',
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

  // États pour le calendrier
  const [joursFeries, setJoursFeries] = useState([]);
  const [entreprise, setEntreprise] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'calendar'

  const loadConges = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.statut) {
        params.statut = filters.statut;
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
      setError('Erreur lors du chargement des congés');
    } finally {
      setLoading(false);
    }
  }, [filters.limit, filters.statut, user?.id, user?.role]);

  const loadCalendarData = useCallback(async () => {
    try {
      // Charger les jours fériés (seulement pour admins)
      if (user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
        try {
          const joursFeriesResponse = await joursFeriesService.getAll();
          setJoursFeries(joursFeriesResponse.data || []);
        } catch (err) {
          console.warn('Impossible de charger les jours fériés:', err);
          setJoursFeries([]);
        }
      }

      // Charger l'entreprise pour la politique de congés
      if (user?.entreprise_id) {
        try {
          const entrepriseResponse = await entreprisesService.getById(user.entreprise_id);
          setEntreprise(entrepriseResponse.data);
        } catch (err) {
          console.warn('Impossible de charger l\'entreprise:', err);
          setEntreprise(null);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données calendrier:', err);
    }
  }, [user?.entreprise_id, user?.role]);

  useEffect(() => {
    loadConges();
    loadCalendarData();
  }, [loadConges, loadCalendarData]);

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

  // Créer les événements pour le calendrier
  const createCalendarEvents = useCallback(() => {
    const events = [];

    // Ajouter les congés
    conges.forEach(conge => {
      const startDate = new Date(conge.date_debut);
      const endDate = new Date(conge.date_fin);

      // Pour chaque jour du congé
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        events.push({
          id: `conge-${conge.id}-${d.getTime()}`,
          title: `${getEmployeLabel(conge)} - ${getCongeTypeLabel(conge)}`,
          start: new Date(d),
          end: new Date(d),
          resource: {
            type: 'conge',
            conge: conge,
            status: conge.statut
          }
        });
      }
    });

    // Ajouter les jours fériés
    joursFeries.forEach(jourFerie => {
      events.push({
        id: `ferie-${jourFerie.id}`,
        title: jourFerie.libelle,
        start: new Date(jourFerie.date),
        end: new Date(jourFerie.date),
        resource: {
          type: 'ferie',
          jourFerie: jourFerie
        }
      });
    });

    setCalendarEvents(events);
  }, [conges, joursFeries]);

  useEffect(() => {
    createCalendarEvents();
  }, [createCalendarEvents]);

  // Filtrage des congés côté client pour la recherche rapide
  const filteredConges = useMemo(() => {
    return conges.filter((conge) => {
      const query = (filters.search || '').toLowerCase();
      const matchesSearch = !query
        || getCongeTypeLabel(conge).toLowerCase().includes(query)
        || getEmployeLabel(conge).toLowerCase().includes(query)
        || getEntrepriseLabel(conge).toLowerCase().includes(query)
        || conge.commentaire_employe?.toLowerCase().includes(query);

      const joursRestants = Number(conge.jours_restants);
      const joursRestantsMin = filters.joursRestantsMin === '' ? null : Number(filters.joursRestantsMin);
      const joursRestantsMax = filters.joursRestantsMax === '' ? null : Number(filters.joursRestantsMax);
      const matchesJoursRestants = (!Number.isFinite(joursRestantsMin) || joursRestants >= joursRestantsMin)
        && (!Number.isFinite(joursRestantsMax) || joursRestants <= joursRestantsMax);

      const dateDemande = conge.date_demande || conge.created_at || conge.createdAt;
      const dateDemandeKey = dateDemande ? new Date(dateDemande).toISOString().slice(0, 10) : null;
      const matchesDateDemande = (!filters.dateDemandeDebut || (dateDemandeKey && dateDemandeKey >= filters.dateDemandeDebut))
        && (!filters.dateDemandeFin || (dateDemandeKey && dateDemandeKey <= filters.dateDemandeFin));

      return matchesSearch && matchesJoursRestants && matchesDateDemande;
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

  const handleValidateConge = async (congeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir valider cette demande de congé ?')) return;

    try {
      await congesService.validate(congeId);
      loadConges(); // Recharger la liste
    } catch (err) {
      console.error('Erreur lors de la validation:', err);
      setError('Erreur lors de la validation du congé');
    }
  };

  const handleRejectConge = async (congeId) => {
    const motif = window.prompt('Motif du rejet (optionnel):');
    if (motif === null) return; // Annulé par l'utilisateur

    try {
      await congesService.reject(congeId, { commentaire: motif });
      loadConges(); // Recharger la liste
    } catch (err) {
      console.error('Erreur lors du rejet:', err);
      setError('Erreur lors du rejet du congé');
    }
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

  // Gestionnaire d'événement du calendrier
  const handleSelectEvent = (event) => {
    if (event.resource.type === 'conge') {
      // Ouvrir les détails du congé
      window.open(`/conges/${event.resource.conge.id}`, '_blank');
    }
  };

  // Personnalisation des événements du calendrier
  const eventStyleGetter = (event) => {
    let className = 'rbc-event';

    if (event.resource.type === 'conge') {
      const status = event.resource.status;
      switch (status) {
        case 'en_attente_manager':
          className += ' conge-en-attente';
          break;
        case 'valide_manager':
          className += ' conge-valide-manager';
          break;
        case 'valide_final':
          className += ' conge-valide-final';
          break;
        case 'refuse_manager':
        case 'refuse_final':
          className += ' conge-refuse';
          break;
        default:
          className += ' conge-default';
      }
    } else if (event.resource.type === 'ferie') {
      className += ' jour-ferie';
    }

    return {
      className,
      style: {
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '500',
        padding: '2px 6px'
      }
    };
  };

  // Vérifier si une date est disponible selon la politique congés
  const isDateAvailable = (date) => {
    if (!entreprise?.politique_conges) return true;

    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const politique = entreprise.politique_conges;

    // Vérifier les jours travaillés de la semaine
    if (politique.jours_travailles && !politique.jours_travailles.includes(dayOfWeek)) {
      return false; // Jour non travaillé
    }

    // Vérifier les périodes de blocage
    if (politique.periodes_bloquees) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return !politique.periodes_bloquees.some(periode =>
        month >= periode.mois_debut && month <= periode.mois_fin &&
        day >= periode.jour_debut && day <= periode.jour_fin
      );
    }

    return true;
  };

  // Fonction pour personnaliser l'apparence des cellules du calendrier
  const dayPropGetter = (date) => {
    const isAvailable = isDateAvailable(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let className = '';
    let style = {};

    if (!isAvailable) {
      className = 'rbc-day-unavailable';
      style = {
        backgroundColor: '#f8f9fa',
        opacity: 0.6
      };
    } else if (isWeekend) {
      className = 'rbc-day-weekend';
      style = {
        backgroundColor: '#fff3cd',
        opacity: 0.8
      };
    }

    return { className, style };
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
        <Button as={Link} to="/conges/nouveau" variant="primary" className="d-flex align-items-center">
          <FaPlus className="me-2" />
          Nouveau congé
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

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

      {/* Onglets pour basculer entre vue liste et calendrier */}
      <Tab.Container activeKey={viewMode} onSelect={(key) => setViewMode(key)}>
        <Row className="mb-4">
          <Col>
            <Nav variant="tabs" className="border-bottom-0">
              <Nav.Item>
                <Nav.Link eventKey="list" className="d-flex align-items-center">
                  <FaList className="me-2" />
                  Vue Liste
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="calendar" className="d-flex align-items-center">
                  <FaCalendarAlt className="me-2" />
                  Calendrier
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>

        <Tab.Content>
          {/* Vue Liste */}
          <Tab.Pane eventKey="list">
            {/* Filtres */}
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

            {/* Liste des congés */}
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
                        'Créez votre première demande de congé'
                      }
                    </p>
                    <Button as={Link} to="/conges/nouveau" variant="primary">
                      <FaPlus className="me-2" />
                      Nouveau congé
                    </Button>
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

                                  {/* Boutons de validation pour managers/admins */}
                                  {(user?.role === 'manager' || user?.role === 'admin_entreprise' || user?.role === 'super_admin') &&
                                   (conge.statut === 'en_attente_manager' || ((user?.role === 'admin_entreprise' || user?.role === 'super_admin') && conge.statut === 'valide_manager')) && (
                                    <>
                                      <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => handleValidateConge(conge.id)}
                                        title="Valider le congé"
                                      >
                                        ✓
                                      </Button>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleRejectConge(conge.id)}
                                        title="Rejeter le congé"
                                      >
                                        ✗
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Pagination */}
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
          </Tab.Pane>

          {/* Vue Calendrier */}
          <Tab.Pane eventKey="calendar">
            <Card>
              <Card.Body>
                <div style={{ height: '600px' }}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    culture="fr"
                    messages={{
                      allDay: 'Toute la journée',
                      previous: 'Précédent',
                      next: 'Suivant',
                      today: 'Aujourd\'hui',
                      month: 'Mois',
                      week: 'Semaine',
                      day: 'Jour',
                      agenda: 'Agenda',
                      date: 'Date',
                      time: 'Heure',
                      event: 'Événement',
                      noEventsInRange: 'Aucun événement dans cette période.',
                      showMore: (total) => `+ ${total} de plus`,
                    }}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    dayPropGetter={dayPropGetter}
                    views={['month', 'week', 'day']}
                    defaultView="month"
                    popup
                    selectable
                  />
                </div>

                {/* Légende du calendrier */}
                <div className="mt-3">
                  <h6>Légende:</h6>
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#ffc107', borderRadius: '4px', marginRight: '8px' }}></div>
                      <small>En attente validation</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#17a2b8', borderRadius: '4px', marginRight: '8px' }}></div>
                      <small>Validé manager</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#28a745', borderRadius: '4px', marginRight: '8px' }}></div>
                      <small>Validé final</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#dc3545', borderRadius: '4px', marginRight: '8px' }}></div>
                      <small>Refusé</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#fd7e14', borderRadius: '4px', marginRight: '8px' }}></div>
                      <small>Jour férié</small>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px', marginRight: '8px', border: '1px solid #dee2e6' }}></div>
                      <small>Jour non disponible</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: '#fff3cd', borderRadius: '4px', marginRight: '8px', border: '1px solid #dee2e6' }}></div>
                      <small>Week-end</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '4px', marginRight: '8px', border: '1px solid #dee2e6' }}></div>
                      <small>Jour disponible</small>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default CongesPage;