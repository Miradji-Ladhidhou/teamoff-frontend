import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaPlus, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { calendrierService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useAlert } from '../hooks/useAlert';

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
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [showFilters, setShowFilters] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [filters, setFilters] = useState({
    statut: 'all',
    utilisateur: 'all'
  });

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, filters]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Charger les congés pour le mois
      const congesResponse = await calendrierService.getCongesByMonth(year, month, filters);
      setConges(congesResponse.data);

      // Charger les jours fériés pour le mois
      const feriesResponse = await calendrierService.getJoursFeriesByMonth(year, month);
      setJoursFeries(feriesResponse.data);

    } catch (err) {
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

  const getCongesForDay = (date) => {
    return conges.filter(conge => {
      const targetDate = normalizeLocalDate(date);
      const startDate = normalizeLocalDate(conge.date_debut);
      const endDate = normalizeLocalDate(conge.date_fin);

      if (!targetDate || !startDate || !endDate) return false;

      // Vérifier si la date est dans la période du congé
      return targetDate >= startDate && targetDate <= endDate;
    });
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

  const getStatusColor = (statut) => {
    const colors = {
      en_attente_manager: 'warning',
      valide_manager: 'info',
      valide_final: 'success',
      refuse_manager: 'danger',
      refuse_final: 'danger'
    };
    return colors[statut] || 'secondary';
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

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement du calendrier...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-header">
        <h1 className="h3 mb-0">Calendrier des congés</h1>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="me-1" />
            Filtres
          </Button>
          <Button as={Link} to="/conges/nouveau" variant="primary">
            <FaPlus className="me-1" />
            Nouveau congé
          </Button>
        </div>
      </div>

      <InfoCardInfo title="Lisez le calendrier des congés">
        <p>Ce calendrier affiche tous les congés validés et les jours fériés. Les couleurs vous aident à identifier rapidement les périodes:</p>
        <ul className="mb-0">
          <li><Badge bg="warning">Jaune</Badge> = En attente manager</li>
          <li><Badge bg="info">Bleu</Badge> = Validé manager</li>
          <li><Badge bg="success">Vert</Badge> = Validé final</li>
          <li><Badge bg="danger">Rouge</Badge> = Refusé</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Lecture efficace du planning">
        Activez les filtres pour isoler un statut ou un utilisateur, puis naviguez mois par mois pour préparer les périodes sensibles.
      </TipCard>

      <InfoCardInfo title="Poser un congé depuis le calendrier">
        <p className="mb-2">Cliquez une première date puis une seconde pour sélectionner votre période.</p>
        <ul className="mb-0">
          <li>1er clic: date de début</li>
          <li>2e clic: date de fin</li>
          <li>Le bouton crée une demande préremplie</li>
        </ul>
      </InfoCardInfo>

      {selectionStart && (
        <div className="alert alert-info d-flex justify-content-between align-items-center" role="status">
          <div>
            Période sélectionnée: <strong>{formatDateLabel(selectionStart)}</strong>
            {selectionEnd ? (
              <>
                {' '}au <strong>{formatDateLabel(selectionEnd)}</strong>
              </>
            ) : (
              ' (sélectionnez une date de fin)'
            )}
          </div>
          <div className="d-flex gap-2">
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
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Button variant="outline-secondary" onClick={() => navigateMonth(-1)}>
            <FaChevronLeft />
          </Button>
          <h4 className="mb-0 text-capitalize">{formatMonthYear(currentDate)}</h4>
          <Button variant="outline-secondary" onClick={() => navigateMonth(1)}>
            <FaChevronRight />
          </Button>
        </Card.Header>

        <Card.Body className="p-0">
          {/* En-têtes des jours */}
          <div className="calendar-grid">
            {weekDays.map(day => (
              <div key={day} className="calendar-header">
                {day}
              </div>
            ))}

            {/* Jours du calendrier */}
            {days.map((dayInfo, index) => {
              const dayConges = getCongesForDay(dayInfo.date);
              const jourFerie = getJourFerieForDay(dayInfo.date);
              const isToday = normalizeLocalDate(dayInfo.date)?.getTime() === normalizeLocalDate(new Date())?.getTime();
              const isSelected = isDateInSelection(dayInfo.date);
              const isSelectionLimit = isSelectionEdge(dayInfo.date);
              const weekend = isWeekend(dayInfo.date);
              const selectable = isDaySelectable(dayInfo.date);

              return (
                <div
                  key={index}
                  className={`calendar-day ${!dayInfo.isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''} ${jourFerie ? 'calendar-day-ferie' : ''} ${weekend ? 'calendar-day-weekend' : ''} ${selectable ? 'calendar-day-clickable' : ''} ${isSelected ? 'calendar-day-selected' : ''} ${isSelectionLimit ? 'calendar-day-selection-edge' : ''}`}
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

                  {/* Congés */}
                  <div className="calendar-events">
                    {dayConges.slice(0, 3).map((conge, idx) => (
                      <div
                        key={idx}
                        className={`calendar-event bg-${getStatusColor(conge.statut)}`}
                        title={`${getCongeFirstName(conge)} - ${getCongeTypeLabel(conge)}`}
                      >
                        <small className="text-white">
                          {`${getCongeFirstName(conge)} - ${getCongeTypeLabel(conge)}`}
                        </small>
                      </div>
                    ))}
                    {dayConges.length > 3 && (
                      <div className="calendar-event-more">
                        <small>+{dayConges.length - 3} autres</small>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Légende */}
      <Card>
        <Card.Body>
          <h6 className="mb-3">Légende</h6>
          <Row>
            <Col md={6}>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-success me-2"></div>
                <small>Congé validé final</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-warning me-2"></div>
                <small>Congé en attente manager</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-danger me-2"></div>
                <small>Congé refusé</small>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-info me-2"></div>
                <small>Congé validé manager</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color legend-color-holiday me-2"></div>
                <small>Jour férié</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color border border-primary me-2"></div>
                <small>Aujourd'hui</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #d0d7de;
          border: 1px solid #d0d7de;
          border-radius: 16px;
          overflow: hidden;
        }

        .calendar-header {
          background: linear-gradient(180deg, #f8f9fa 0%, #eef2f6 100%);
          padding: 12px 10px;
          text-align: center;
          font-weight: bold;
          color: #495057;
          font-size: 0.9rem;
        }

        .calendar-day {
          background-color: white;
          min-height: 132px;
          padding: 8px;
          position: relative;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .calendar-day-clickable:hover {
          background-color: #f4f9ff;
        }

        .calendar-day-clickable {
          cursor: pointer;
        }

        .calendar-day-other-month {
          background-color: #f8f9fa;
          color: #6c757d;
        }

        .calendar-day-today {
          background-color: #eef7ff;
        }

        .calendar-day-ferie {
          background-image: linear-gradient(180deg, #fff8e1 0%, #ffffff 42%);
        }

        .calendar-day-weekend {
          background-color: #fbfbfc;
        }

        .calendar-day-selected {
          background-color: #e7f1ff;
          box-shadow: inset 0 0 0 1px #b6d4fe;
        }

        .calendar-day-selection-edge {
          box-shadow: inset 0 0 0 2px #0d6efd;
        }

        .calendar-day-number {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          color: #1f2937;
        }

        .calendar-ferie {
          margin-bottom: 6px;
          padding: 3px 6px;
          border-radius: 999px;
          background-color: #fff3cd;
          display: inline-flex;
          max-width: 100%;
        }

        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .calendar-event {
          padding: 4px 6px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.18);
        }

        .calendar-event-more {
          padding: 3px 6px;
          background-color: #6c757d;
          border-radius: 8px;
          font-size: 10px;
          color: white;
          text-align: center;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 3px;
        }

        .legend-color-holiday {
          background: linear-gradient(180deg, #fff3cd 0%, #ffe69c 100%);
          border: 1px solid #f0ad4e;
        }

        @media (max-width: 991.98px) {
          .calendar-day {
            min-height: 116px;
            padding: 6px;
          }

          .calendar-event {
            font-size: 10px;
            padding: 3px 5px;
          }

          .calendar-ferie {
            font-size: 10px;
          }
        }

        @media (max-width: 767.98px) {
          .calendar-grid {
            display: block;
            border: none;
            background: transparent;
          }

          .calendar-header {
            display: none;
          }

          .calendar-day {
            min-height: auto;
            margin-bottom: 10px;
            border: 1px solid #d0d7de;
            border-radius: 14px;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
          }

          .calendar-day-other-month {
            opacity: 0.88;
          }

          .calendar-day-number::after {
            content: ' · ' attr(data-weekday);
            font-weight: 400;
            color: #6b7280;
          }

          .calendar-events {
            gap: 6px;
          }

          .calendar-event,
          .calendar-event-more {
            white-space: normal;
          }
        }

        .timeline-item {
          position: relative;
          padding-left: 30px;
        }

        .timeline-marker {
          position: absolute;
          left: 0;
          top: 5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .timeline-content {
          padding-bottom: 10px;
        }
      `}</style>
    </Container>
  );
};

export default CalendrierPage;