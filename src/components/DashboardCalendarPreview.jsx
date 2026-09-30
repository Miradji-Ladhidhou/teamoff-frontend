import React, { useEffect, useState } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { calendrierService } from '../services/api';
import './DashboardCalendarPreview.css';

const WEEKDAYS = [
  ['L', 'Lundi'], ['M', 'Mardi'], ['M', 'Mercredi'], ['J', 'Jeudi'],
  ['V', 'Vendredi'], ['S', 'Samedi'], ['D', 'Dimanche'],
];

const dateKey = (value) => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
};

const dateFromKey = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value) => {
  if (!value) return '';
  return dateFromKey(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const formatRange = (start, end) => {
  if (!start) return '';
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
};

const getEventName = (event) => {
  const person = `${event.utilisateur?.prenom || event.utilisateur_prenom || ''} ${event.utilisateur?.nom || event.utilisateur_nom || ''}`.trim();
  if (event.record_type === 'absence') {
    const labels = {
      maladie: 'Arrêt maladie',
      absence_exceptionnelle: 'Absence exceptionnelle',
      confidentiel: 'Absence',
    };
    return [labels[event.type_absence] || 'Absence', person].filter(Boolean).join(' · ');
  }

  const leaveType = event.conge_type?.libelle || event.conge_type_libelle || 'Congé';
  return [leaveType, person].filter(Boolean).join(' · ');
};

const getStatusLabel = (status) => ({
  reserve: 'Réservé',
  en_attente_manager: 'En attente',
  valide_manager: 'Validé manager',
  valide_final: 'Approuvé',
})[status] || '';

const DashboardCalendarPreview = ({ selectedCompanyId = '' }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const companyId = isSuperAdmin ? selectedCompanyId : user?.entreprise_id;
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = dateKey(new Date(year, month + 1, 0));
  const today = dateKey(new Date());

  useEffect(() => {
    if (!user?.id || (isSuperAdmin && !companyId)) {
      setEvents([]);
      setLoadError(false);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    calendrierService.getCongesByMonth(year, month + 1, companyId ? { entrepriseId: companyId } : {})
      .then((response) => {
        if (!cancelled) setEvents(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [companyId, isSuperAdmin, month, user?.id, year]);

  const monthEvents = events.filter((event) => {
    const start = dateKey(event.date_debut);
    const end = dateKey(event.date_fin);
    const inactive = ['annule', 'refuse_manager', 'refuse_final'].includes(event.statut);
    return start && end && !inactive && start <= monthEnd && end >= monthStart;
  });

  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDayOffset }, (_, index) => ({ key: `empty-start-${index}` }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(new Date(year, month, day));
    cells.push({
      key,
      day,
      events: monthEvents.filter((event) => dateKey(event.date_debut) <= key && dateKey(event.date_fin) >= key),
    });
  }

  while (cells.length % 7 !== 0) cells.push({ key: `empty-end-${cells.length}` });

  const upcomingEvents = monthEvents
    .filter((event) => dateKey(event.date_fin) >= today)
    .sort((a, b) => dateKey(a.date_debut).localeCompare(dateKey(b.date_debut)))
    .slice(0, 4);

  const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <Card className="dashboard-calendar-preview mb-4">
      <Card.Header className="dashboard-calendar-preview__header">
        <div className="dashboard-calendar-preview__title-group">
          <FaCalendarAlt aria-hidden="true" />
          <div>
            <h2 className="dashboard-calendar-preview__title">Calendrier</h2>
            <div className="dashboard-calendar-preview__month-label">{monthLabel}</div>
          </div>
        </div>
        <div className="dashboard-calendar-preview__actions">
          <div className="dashboard-calendar-preview__month-controls" aria-label="Navigation du mois">
            <Button
              variant="outline-secondary"
              size="sm"
              aria-label="Mois précédent"
              title="Mois précédent"
              onClick={() => setMonthDate(new Date(year, month - 1, 1))}
            >
              <FaChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              aria-label="Mois suivant"
              title="Mois suivant"
              onClick={() => setMonthDate(new Date(year, month + 1, 1))}
            >
              <FaChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button as={Link} to="/calendrier" variant="link" size="sm" className="dashboard-calendar-preview__full-link">
            Voir tout
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {isSuperAdmin && !companyId ? (
          <p className="dashboard-calendar-preview__message">Sélectionnez une entreprise pour afficher son calendrier.</p>
        ) : loading ? (
          <div className="dashboard-calendar-preview__message" role="status">
            <Spinner animation="border" size="sm" aria-hidden="true" />
            <span>Chargement du calendrier…</span>
          </div>
        ) : loadError ? (
          <p className="dashboard-calendar-preview__message" role="status">Calendrier temporairement indisponible.</p>
        ) : (
          <div className="dashboard-calendar-preview__content">
            <div className="dashboard-calendar-preview__grid" aria-label={`Calendrier du mois de ${monthLabel}`}>
              {WEEKDAYS.map(([shortName, fullName]) => (
                <div key={fullName} className="dashboard-calendar-preview__weekday" aria-label={fullName}>
                  {shortName}
                  <span className="visually-hidden">{fullName}</span>
                </div>
              ))}
              {cells.map((cell) => {
                if (!cell.day) {
                  return <div key={cell.key} className="dashboard-calendar-preview__day dashboard-calendar-preview__day--empty" aria-hidden="true" />;
                }

                const isToday = cell.key === today;
                return (
                  <div
                    key={cell.key}
                    className={`dashboard-calendar-preview__day${isToday ? ' dashboard-calendar-preview__day--today' : ''}`}
                    aria-label={`${cell.day}${cell.events.length ? `, ${cell.events.length} événement(s)` : ''}`}
                    title={cell.events.map(getEventName).join(', ')}
                  >
                    <span className="dashboard-calendar-preview__day-number">{cell.day}</span>
                    {cell.events.length > 0 && (
                      <span className="dashboard-calendar-preview__day-indicator" aria-hidden="true">
                        {cell.events.slice(0, 3).map((event, index) => (
                          <span
                            key={`${event.id || event.date_debut}-${index}`}
                            className={`dashboard-calendar-preview__dot${event.record_type === 'absence' ? ' dashboard-calendar-preview__dot--absence' : ''}`}
                          />
                        ))}
                        {cell.events.length > 3 && <small>+{cell.events.length - 3}</small>}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <section className="dashboard-calendar-preview__agenda" aria-labelledby="dashboard-calendar-preview-agenda">
              <h3 id="dashboard-calendar-preview-agenda" className="dashboard-calendar-preview__agenda-title">À venir ce mois-ci</h3>
              {upcomingEvents.length === 0 ? (
                <p className="dashboard-calendar-preview__message">Aucun événement à venir ce mois-ci.</p>
              ) : (
                <ul className="dashboard-calendar-preview__event-list">
                  {upcomingEvents.map((event) => {
                    const statusLabel = event.record_type === 'conge' ? getStatusLabel(event.statut) : '';
                    return (
                      <li key={`${event.record_type}-${event.id}`} className="dashboard-calendar-preview__event">
                        <span className={`dashboard-calendar-preview__event-mark${event.record_type === 'absence' ? ' dashboard-calendar-preview__event-mark--absence' : ''}`} />
                        <div className="dashboard-calendar-preview__event-main">
                          <span className="dashboard-calendar-preview__event-name">{getEventName(event)}</span>
                          <span className="dashboard-calendar-preview__event-dates">
                            {formatRange(dateKey(event.date_debut), dateKey(event.date_fin))}
                          </span>
                        </div>
                        {statusLabel && <span className="dashboard-calendar-preview__event-status">{statusLabel}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {monthEvents.length > upcomingEvents.length && (
                <Link to="/calendrier" className="dashboard-calendar-preview__more-link">
                  Voir les {monthEvents.length - upcomingEvents.length} autres événements
                </Link>
              )}
            </section>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DashboardCalendarPreview;