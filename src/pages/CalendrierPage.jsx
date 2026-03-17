import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaPlus, FaFilter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { calendrierService, congesService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';

const CalendrierPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [conges, setConges] = useState([]);
  const [joursFeries, setJoursFeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
      setError('Erreur lors du chargement du calendrier');
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
    const startingDayOfWeek = firstDay.getDay();

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
      const startDate = new Date(conge.date_debut);
      const endDate = new Date(conge.date_fin);

      // Vérifier si la date est dans la période du congé
      return date >= startDate && date <= endDate;
    });
  };

  const isJourFerie = (date) => {
    return joursFeries.some(jf => {
      const jfDate = new Date(jf.date);
      return jfDate.toDateString() === date.toDateString();
    });
  };

  const getJourFerieForDay = (date) => {
    return joursFeries.find(jf => {
      const jfDate = new Date(jf.date);
      return jfDate.toDateString() === date.toDateString();
    });
  };

  const getStatusColor = (statut) => {
    const colors = {
      en_attente: 'warning',
      approuve: 'success',
      refuse: 'danger',
      annule: 'secondary'
    };
    return colors[statut] || 'secondary';
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement du calendrier...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
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
          <li><Badge bg="success">Vert</Badge> = Congé validé</li>
          <li><Badge bg="warning">Orange</Badge> = Jour férié</li>
          <li><Badge bg="danger">Rouge</Badge> = Congé refusé</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Lecture efficace du planning">
        Activez les filtres pour isoler un statut ou un utilisateur, puis naviguez mois par mois pour préparer les périodes sensibles.
      </TipCard>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
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
                    <option value="en_attente">En attente</option>
                    <option value="approuve">Approuvé</option>
                    <option value="refuse">Refusé</option>
                    <option value="annule">Annulé</option>
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
              const isToday = dayInfo.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`calendar-day ${!dayInfo.isCurrentMonth ? 'calendar-day-other-month' : ''} ${isToday ? 'calendar-day-today' : ''} ${jourFerie ? 'calendar-day-ferie' : ''}`}
                >
                  <div className="calendar-day-number">
                    {dayInfo.dayNumber}
                  </div>

                  {/* Jour férié */}
                  {jourFerie && (
                    <div className="calendar-ferie">
                      <small className="text-danger fw-bold">{jourFerie.nom}</small>
                    </div>
                  )}

                  {/* Congés */}
                  <div className="calendar-events">
                    {dayConges.slice(0, 3).map((conge, idx) => (
                      <div
                        key={idx}
                        className={`calendar-event bg-${getStatusColor(conge.statut)}`}
                        title={`${conge.utilisateur_nom} - ${conge.conge_type}`}
                      >
                        <small className="text-white">
                          {(['admin_entreprise', 'super_admin'].includes(user.role) || user.role === 'manager' || conge.utilisateur_id === user.id)
                            ? conge.utilisateur_nom
                            : 'Congé'
                          }
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
                <small>Congé approuvé</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-warning me-2"></div>
                <small>Congé en attente</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-danger me-2"></div>
                <small>Congé refusé</small>
              </div>
            </Col>
            <Col md={6}>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-secondary me-2"></div>
                <small>Congé annulé</small>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="legend-color bg-light border me-2"></div>
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

      <style jsx>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #dee2e6;
        }

        .calendar-header {
          background-color: #f8f9fa;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          color: #495057;
        }

        .calendar-day {
          background-color: white;
          min-height: 120px;
          padding: 5px;
          position: relative;
        }

        .calendar-day-other-month {
          background-color: #f8f9fa;
          color: #6c757d;
        }

        .calendar-day-today {
          background-color: #e3f2fd;
        }

        .calendar-day-ferie {
          background-color: #fff3cd;
        }

        .calendar-day-number {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .calendar-ferie {
          margin-bottom: 5px;
        }

        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .calendar-event {
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 11px;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .calendar-event-more {
          padding: 2px 4px;
          background-color: #6c757d;
          border-radius: 3px;
          font-size: 10px;
          color: white;
          text-align: center;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 3px;
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