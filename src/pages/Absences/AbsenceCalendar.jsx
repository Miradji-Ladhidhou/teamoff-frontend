import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaFileCsv, FaFilePdf, FaEdit, FaCalendarAlt } from 'react-icons/fa';
import { useAlert } from '../../hooks/useAlert';
import { saveAs } from 'file-saver';
// Fonction utilitaire pour exporter en CSV
function exportAbsencesToCSV(absences) {
  if (!absences || absences.length === 0) return;
  const header = ['Type', 'Prénom', 'Nom', 'Date début', 'Date fin', 'Commentaire'];
  const rows = absences.map(abs => [
    abs.type_absence,
    abs.utilisateur?.prenom || '',
    abs.utilisateur?.nom || '',
    abs.date_debut,
    abs.date_fin,
    abs.commentaire || ''
  ]);
  const csvContent = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'absences.csv');
}

// Fonction utilitaire pour exporter en PDF (simple, via window.print)
function exportAbsencesToPDF(absences) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write('<html><head><title>Absences PDF</title></head><body>');
  win.document.write('<h2>Liste des absences</h2>');
  win.document.write('<table border="1" style="border-collapse:collapse;width:100%"><tr><th>Type</th><th>Prénom</th><th>Nom</th><th>Date début</th><th>Date fin</th><th>Commentaire</th></tr>');
  absences.forEach(abs => {
    win.document.write(`<tr><td>${abs.type_absence}</td><td>${abs.utilisateur?.prenom || ''}</td><td>${abs.utilisateur?.nom || ''}</td><td>${abs.date_debut}</td><td>${abs.date_fin}</td><td>${abs.commentaire || ''}</td></tr>`);
  });
  win.document.write('</table></body></html>');
  win.document.close();
  win.print();
}
import { api } from '../../services/api';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './absence-calendar.css';

const localizer = momentLocalizer(moment);

// Couleurs par type d'absence (statut supprimé)
const defaultColors = {
  maladie: '#4caf50', // vert maladie
  absence_exceptionnelle: '#2196f3', // bleu absence exceptionnelle
};

const AbsenceCalendar = ({ canEdit, refresh }) => {
    // Colore les événements selon le type d'absence
    const eventPropGetter = event => {
      let backgroundColor = '#2196f3'; // défaut : absence exceptionnelle
      if (event.absence?.type_absence === 'maladie') backgroundColor = '#4caf50';
      return {
        style: {
          backgroundColor,
          color: '#fff',
          borderRadius: '6px',
          border: 'none',
          fontWeight: 500,
          fontSize: '1em',
          opacity: 0.95,
        }
      };
    };
  const { user } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editAbsence, setEditAbsence] = useState(null);
  const [editComment, setEditComment] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const alert = useAlert();

  useEffect(() => {
    const fetchAbsences = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/absences');
        setAbsences(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur lors du chargement des absences');
      } finally {
        setLoading(false);
      }
    };
    fetchAbsences();
  }, [refresh]); // <-- Ajout de refresh dans les dépendances

  // Mapping absences -> events calendrier (plus de statut)
  // Affichage du justificatif uniquement pour admin, manager, super_admin
  const canSeeJustificatif = user && ['admin_entreprise', 'super_admin', 'manager'].includes(user.role);

  const events = absences.map(abs => ({
    id: abs.id,
    title: `${abs.type_absence === 'maladie' ? 'Maladie' : 'Absence'} - ${abs.utilisateur?.prenom || ''} ${abs.utilisateur?.nom || ''}`,
    start: abs.date_debut ? new Date(abs.date_debut) : null,
    end: abs.date_fin ? new Date(abs.date_fin) : null,
    commentaire: abs.commentaire,
    justificatif: abs.justificatif,
    absence: abs,
  }));

  const EventComponent = ({ event }) => (
    <span>
      {event.title}
      {/* Affiche le lien justificatif seulement pour les rôles autorisés et si justificatif présent */}
      {canSeeJustificatif && event.justificatif && (
        <a
          href={event.justificatif}
          target="_blank"
          rel="noopener noreferrer"
          className="absence-calendar-link"
        >
          Justificatif
        </a>
      )}
    </span>
  );

  // Modale d'édition d'absence
  const handleEditSave = async () => {
    if (!editAbsence) return;
    setEditLoading(true);
    try {
      await api.patch(`/absences/${editAbsence.id}`, { commentaire: editComment });
      alert.success('Absence modifiée avec succès !');
      setEditAbsence(null);
      setEditComment('');
      // Refresh absences
      setLoading(true);
      const res = await api.get('/absences');
      setAbsences(res.data);
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="absence-calendar-shell" {...(editAbsence ? { inert: true } : {})}>
      {/* Modale d'édition accessible */}
      {editAbsence && (
        <div className="absence-calendar-modal-bg">
          <div className="absence-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="edit-absence-title">
            <h3 id="edit-absence-title" className="absence-calendar-modal-title">Éditer l'absence</h3>
            <div className="absence-calendar-modal-dates">
              <b>{editAbsence.type_absence === 'maladie' ? 'Maladie' : 'Absence'} - {editAbsence.utilisateur?.prenom} {editAbsence.utilisateur?.nom}</b><br/>
              <span>{editAbsence.date_debut} au {editAbsence.date_fin}</span>
            </div>
            <label>Commentaire :</label>
            <textarea
              value={editComment}
              onChange={e => setEditComment(e.target.value)}
              className="absence-calendar-textarea"
            />
            <div className="absence-calendar-modal-actions">
              <button type="button" className="ui-btn-secondary" onClick={() => setEditAbsence(null)} disabled={editLoading}>Annuler</button>
              <button type="button" className="ui-btn-primary" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absence-calendar-header">
        <h2 className="ui-page-title absence-calendar-title">Planning des absences</h2>
        <div className="absence-calendar-header-actions">
          <button type="button" className="ui-btn-secondary" onClick={() => exportAbsencesToCSV(absences)}>
            Export CSV
          </button>
          <button type="button" className="ui-btn-secondary" onClick={() => exportAbsencesToPDF(absences)}>
            Export PDF
          </button>
        </div>
      </div>
      {loading && <div className="ui-text-soft absence-calendar-loading">Chargement…</div>}
      {error && <div className="error absence-calendar-error">{error}</div>}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventPropGetter}
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        className="absence-calendar-grid"
        style={{ height: 500 }}
        tooltipAccessor={event => event.title}
        components={{ event: EventComponent }}
      />
      <div className="absence-calendar-legend">
        <b className="absence-calendar-legend-label">Légende :</b>
        <span className="absence-calendar-legend-maladie">Maladie</span>
        <span className="absence-calendar-legend-exceptionnelle">Absence exceptionnelle</span>
      </div>
    </div>
  );
};

export default AbsenceCalendar;