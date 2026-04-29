import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Modal } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaPlus, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { calendrierService, entreprisesService, api } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import './calendar.css';

const normalizeLocalDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const rawDate = value.slice(0, 10);
    const parts = rawDate.split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateParam = (value) => {
  const date = normalizeLocalDate(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  const date = normalizeLocalDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getCongeFirstName = (conge) => {
  const directCandidates = [
    conge?.utilisateur_prenom,
    conge?.prenom,
    conge?.utilisateur?.prenom,
  ];

  for (const candidate of directCandidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  const fullNameCandidates = [
    conge?.utilisateur_nom,
    conge?.utilisateur?.nom_complet,
    `${conge?.utilisateur?.prenom || ''} ${conge?.utilisateur?.nom || ''}`,
  ];

  for (const candidate of fullNameCandidates) {
    const value = String(candidate || '').trim();
    if (value) return value.split(/\s+/)[0];
  }

  return 'Salarié';
};

const getCongeTypeLabel = (conge) => {
  if (typeof conge?.conge_type === 'string') return conge.conge_type;
  if (conge?.conge_type?.libelle) return conge.conge_type.libelle;
  return conge?.conge_type_libelle || 'Congé';
};

const CalendrierPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [conges, setConges] = useState([]);
  const [joursFeries, setJoursFeries] = useState([]);
  const [blockedSpecificDates, setBlockedSpecificDates] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [showFilters, setShowFilters] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [filters, setFilters] = useState({
    statut: 'all',
    utilisateur: 'all'
  });
  const entrepriseId = user?.entreprise_id;

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, filters]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

      const [congesResponse, absencesResponse, feriesResponse, blockedDaysResponse] = await Promise.all([
        calendrierService.getCongesByMonth(year, month, filters),
        api.get('/absences', { params: { date_debut: firstDay, date_fin: lastDay } }),
        calendrierService.getJoursFeriesByMonth(year, month),
        entrepriseId ? entreprisesService.getBlockedDays(entrepriseId).catch(() => null) : Promise.resolve(null),
      ]);

      setConges(congesResponse.data);
      setAbsences(absencesResponse.data || []);
      setJoursFeries(feriesResponse.data);

      const blocked = blockedDaysResponse?.data?.blocked_days || {};
      const specificDates = Array.isArray(blocked?.specific_dates)
        ? [...new Set(blocked.specific_dates.map((item) => String(item).slice(0, 10)).filter(Boolean))].sort()
        : [];
      setBlockedSpecificDates(specificDates);

    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erreur lors du chargement du calendrier:', err);
      alert.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    // Jours du mois précédent pour compléter la première semaine
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift({
        date: prevDate,
        isCurrentMonth: false,
        dayNumber: prevDate.getDate()
      });
    }

    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
        dayNumber: day
      });
    }

    // Jours du mois suivant pour compléter la dernière semaine
    const remainingCells = 42 - days.length; // 6 semaines * 7 jours
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        dayNumber: i
      });
    }

    return days;
  };

  // Retourne tous les événements (congés + absences) pour un jour donné
  const getEventsForDay = (date) => {
    const targetDate = normalizeLocalDate(date);
    // Congés
    const dayConges = conges.filter(conge => {
      const startDate = normalizeLocalDate(conge.date_debut);
      const endDate = normalizeLocalDate(conge.date_fin);
      if (!targetDate || !startDate || !endDate) return false;
      return targetDate >= startDate && targetDate <= endDate;
    });
    // Absences
    const dayAbsences = absences.filter(abs => {
      const startDate = normalizeLocalDate(abs.date_debut);
      const endDate = normalizeLocalDate(abs.date_fin);
      if (!targetDate || !startDate || !endDate) return false;
      return targetDate >= startDate && targetDate <= endDate;
    });
    // On tague chaque événement pour l’affichage
    const mappedConges = dayConges.map(c => ({ ...c, _eventType: 'conge' }));
    const mappedAbsences = dayAbsences.map(a => ({ ...a, _eventType: 'absence' }));
    return [...mappedConges, ...mappedAbsences];
  };

  const isJourFerie = (date) => {
    return joursFeries.some(jf => {
      const jfDate = normalizeLocalDate(jf.date);
      const currentDate = normalizeLocalDate(date);
      return jfDate?.getTime() === currentDate?.getTime();
    });
  };

  const getJourFerieForDay = (date) => {
    return joursFeries.find(jf => {
      const jfDate = normalizeLocalDate(jf.date);
      const currentDate = normalizeLocalDate(date);
      return jfDate?.getTime() === currentDate?.getTime();
    });
  };

  const isSpecificBlockedDay = (date) => {
    const normalized = formatDateParam(date);
    if (!normalized) return false;
    return blockedSpecificDates.includes(normalized);
  };

  const getStatusBadgeClass = (statut) => {
    const classes = {
      en_attente_manager: 'pending',
      valide_manager: 'info',
      valide_final: 'approved',
      refuse_manager: 'refused',
      refuse_final: 'refused',
    };
    return classes[statut] || 'info';
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isWeekend = (d) => {
    const date = normalizeLocalDate(d);
    const day = date?.getDay();
    return day === 0 || day === 6;
  };

  const isDaySelectable = (d) => Boolean(normalizeLocalDate(d));

  const handleSelectDay = (dateObj) => {
    const date = normalizeLocalDate(dateObj);
    if (!date) return;

    if (!isDaySelectable(date)) return;

    if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }

    if (date < selectionStart) {
      setSelectionEnd(selectionStart);
      setSelectionStart(date);
    } else {
      setSelectionEnd(date);
    }
  };

  const handleDayClick = (dayInfo) => {
    const date = normalizeLocalDate(dayInfo?.date);
    if (!date) return;

    handleSelectDay(date);
  };

  const isDateInSelection = (dateObj) => {
    if (!selectionStart) return false;
    const d = normalizeLocalDate(dateObj);
    if (!d) return false;
    const end = selectionEnd || selectionStart;
    return d >= selectionStart && d <= end;
  };

  const isSelectionEdge = (dateObj) => {
    const date = normalizeLocalDate(dateObj);
    if (!date || !selectionStart) return false;
    const end = selectionEnd || selectionStart;
    return date.getTime() === selectionStart.getTime() || date.getTime() === end.getTime();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openEventDetailsModal = (event, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setSelectedEventDetails(event);
    setShowEventDetailsModal(true);
  };

  const closeEventDetailsModal = () => {
    setShowEventDetailsModal(false);
    setSelectedEventDetails(null);
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading py-3">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement du calendrier...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm" className="calendar-page">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Calendrier</span>
        <div className="d-flex gap-2">
        </div>
      </div>

      {selectionStart && (
        <div className="alert alert-info calendar-selection-alert" role="status">
          <div className="calendar-selection-alert__text">
            Sélection: <strong>{formatDateLabel(selectionStart)}</strong>
            {selectionEnd ? (
              <>
                {' '}au <strong>{formatDateLabel(selectionEnd)}</strong>
              </>
            ) : (
              ' (choisir fin)'
            )}
          </div>
          <div className="calendar-selection-alert__actions">
            <Button variant="outline-secondary" size="sm" onClick={() => { setSelectionStart(null); setSelectionEnd(null); }}>
              Réinitialiser
            </Button>
            {selectionEnd && (
              <Button
                as={Link}
                to={`/conges/nouveau?date_debut=${formatDateParam(selectionStart)}&date_fin=${formatDateParam(selectionEnd)}`}
                size="sm"
              >
                Poser ce congé
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    name="statut"
                    value={filters.statut}
                    onChange={handleFilterChange}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="en_attente_manager">En attente manager</option>
                    <option value="valide_manager">Validé manager</option>
                    <option value="valide_final">Validé final</option>
                    <option value="refuse_manager">Refusé manager</option>
                    <option value="refuse_final">Refusé final</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              {(['admin_entreprise', 'super_admin'].includes(user.role) || user.role === 'manager') && (
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Utilisateur</Form.Label>
                    <Form.Select
                      name="utilisateur"
                      value={filters.utilisateur}
                      onChange={handleFilterChange}
                    >
                      <option value="all">Tous les utilisateurs</option>
                      <option value="me">Mes congés uniquement</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Navigation du calendrier */}
      <Card className="mb-4 calendar-shell-card">
        <Card.Header className="calendar-nav-header">
          <Button variant="outline-secondary" onClick={() => navigateMonth(-1)}>
            <FaChevronLeft />
          </Button>
          <h4 className="mb-0 text-capitalize calendar-nav-header__title">{formatMonthYear(currentDate)}</h4>
          <Button variant="outline-secondary" onClick={() => navigateMonth(1)}>
            <FaChevronRight />
          </Button>
        </Card.Header>

        <Card.Body className="p-0 calendar-shell-card__body">
          {/* En-têtes des jours */}
          <div className="calendar-grid-wrapper">
            <div className="calendar-grid">
              {weekDays.map(day => (
                <div key={day} className="calendar-header">
                  {day}
                </div>
              ))}

              {/* Jours du calendrier */}
              {days.map((dayInfo, index) => {
                const events = getEventsForDay(dayInfo.date);
                const jourFerie = getJourFerieForDay(dayInfo.date);
                const isSpecificBlocked = isSpecificBlockedDay(dayInfo.date);
                const isToday = normalizeLocalDate(dayInfo.date)?.getTime() === normalizeLocalDate(new Date())?.getTime();
                const isSelected = isDateInSelection(dayInfo.date);
                const isSelectionLimit = isSelectionEdge(dayInfo.date);
                const weekend = isWeekend(dayInfo.date);
                const selectable = isDaySelectable(dayInfo.date);

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!dayInfo.isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''} ${jourFerie ? 'calendar-day-ferie' : ''} ${isSpecificBlocked ? 'calendar-day-blocked-specific' : ''} ${weekend ? 'calendar-day-weekend' : ''} ${selectable ? 'calendar-day-clickable' : ''} ${isSelected ? 'calendar-day-selected' : ''} ${isSelectionLimit ? 'calendar-day-selection-edge' : ''}`}
                    onClick={() => selectable && handleDayClick(dayInfo)}
                  >
                    <div
                      className="calendar-day-number"
                      data-weekday={normalizeLocalDate(dayInfo.date)?.toLocaleDateString('fr-FR', { weekday: 'short' }) || ''}
                    >
                      {dayInfo.dayNumber}
                    </div>

                    {/* Jour férié */}
                    {jourFerie && (
                      <div className="calendar-ferie">
                        <small className="text-danger fw-bold">{jourFerie.libelle || jourFerie.nom}</small>
                      </div>
                    )}

                    {isSpecificBlocked && (
                      <div className="calendar-blocked-specific">
                        <small className="fw-semibold">Bloqué</small>
                      </div>
                    )}

                    {/* Événements (congés + absences) */}
                    <div className="calendar-events">
                      {events.slice(0, 3).map((event, idx) => {
                        if (event._eventType === 'conge') {
                          return (
                            <div
                              key={idx}
                              className={`calendar-event bg-${getStatusColor(event.statut)}`}
                              title={`${getCongeFirstName(event)} - ${getCongeTypeLabel(event)}`}
                              onClick={(e) => openEventDetailsModal(event, e)}
                              role="button"
                            >
                              <small className="text-white">
                                {`${getCongeFirstName(event)} · ${getCongeTypeLabel(event)}`}
                              </small>
                            </div>
                          );
                        } else if (event._eventType === 'absence') {
                          // Couleur : maladie = vert, exceptionnelle = bleu
                          const absColor = event.type_absence === 'maladie' ? 'success' : 'primary';
                          return (
                            <div
                              key={idx}
                              className={`calendar-event bg-${absColor}`}
                              title={`Absence - ${event.utilisateur?.prenom || ''} ${event.utilisateur?.nom || ''} (${event.type_absence})${event.commentaire ? ' : ' + event.commentaire : ''}`}
                              onClick={(e) => openEventDetailsModal(event, e)}
                              role="button"
                            >
                              <small className="text-white">
                                {`Absence · ${event.utilisateur?.prenom || ''}`}
                              </small>
                            </div>
                          );
                        }
                        return null;
                      })}
                      {events.length > 3 && (
                        <div className="calendar-event-more">
                          <small>+{events.length - 3} autres</small>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Légende */}
      <Card className="calendar-legend-card">
        <Card.Body>
          <h6 className="mb-3">Légende</h6>
          <Row className="calendar-legend-grid">
            <Col md={6}>
              <div className="calendar-legend-row">
                <div className="legend-color bg-success me-2"></div>
                <small>Congé validé final</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color bg-warning me-2"></div>
                <small>Congé en attente manager</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color bg-danger me-2"></div>
                <small>Congé refusé</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color bg-info me-2"></div>
                <small>Congé validé manager</small>
              </div>
            </Col>
            <Col md={6}>
              <div className="calendar-legend-row">
                <div className="legend-color bg-primary me-2"></div>
                <small>Absence exceptionnelle</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color bg-success me-2"></div>
                <small>Absence maladie</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color legend-color-holiday me-2"></div>
                <small>Jour férié</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color legend-color-blocked me-2"></div>
                <small>Date bloquée</small>
              </div>
              <div className="calendar-legend-row">
                <div className="legend-color border border-primary me-2"></div>
                <small>Aujourd'hui</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal show={showEventDetailsModal} onHide={closeEventDetailsModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Détail événement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEventDetails && (
            <div className="d-grid gap-2 small">
              {selectedEventDetails._eventType === 'conge' ? (
                <>
                  <div><strong>Type:</strong> Congé</div>
                  <div><strong>Employé:</strong> {`${selectedEventDetails.utilisateur?.prenom || selectedEventDetails.utilisateur_prenom || ''} ${selectedEventDetails.utilisateur?.nom || ''}`.trim() || 'Non défini'}</div>
                  <div><strong>Catégorie:</strong> {getCongeTypeLabel(selectedEventDetails)}</div>
                  <div><strong>Période:</strong> {formatDateLabel(selectedEventDetails.date_debut)} au {formatDateLabel(selectedEventDetails.date_fin)}</div>
                  <div><strong>Statut:</strong> <span className={`badge ${getStatusBadgeClass(selectedEventDetails.statut)}`}>{(selectedEventDetails.statut || 'Inconnu').toUpperCase()}</span></div>
                  {selectedEventDetails.commentaire_employe && (
                    <div><strong>Commentaire:</strong> {selectedEventDetails.commentaire_employe}</div>
                  )}
                </>
              ) : (
                <>
                  <div><strong>Type:</strong> Absence</div>
                  <div><strong>Employé:</strong> {`${selectedEventDetails.utilisateur?.prenom || ''} ${selectedEventDetails.utilisateur?.nom || ''}`.trim() || 'Non défini'}</div>
                  <div><strong>Motif:</strong> {selectedEventDetails.type_absence || 'Non défini'}</div>
                  <div><strong>Période:</strong> {formatDateLabel(selectedEventDetails.date_debut)} au {formatDateLabel(selectedEventDetails.date_fin)}</div>
                  {selectedEventDetails.commentaire && (
                    <div><strong>Commentaire:</strong> {selectedEventDetails.commentaire}</div>
                  )}
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEventDetailsModal}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CalendrierPage;