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
          style={{ marginLeft: 8, color: '#4caf50', fontWeight: 500, textDecoration: 'underline' }}
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
    <div style={{ minHeight: 600 }} {...(editAbsence ? { inert: true } : {})}>
      {/* Modale d'édition accessible */}
      {editAbsence && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',padding:32,borderRadius:12,minWidth:320,maxWidth:400,boxShadow:'0 2px 16px rgba(0,0,0,0.15)'}} role="dialog" aria-modal="true" aria-labelledby="edit-absence-title">
            <h3 id="edit-absence-title">Éditer l'absence</h3>
            <div style={{marginBottom:16}}>
              <b>{editAbsence.type_absence === 'maladie' ? 'Maladie' : 'Absence'} - {editAbsence.utilisateur?.prenom} {editAbsence.utilisateur?.nom}</b><br/>
              <span style={{fontSize:13}}>{editAbsence.date_debut} au {editAbsence.date_fin}</span>
            </div>
            <label>Commentaire :</label>
            <textarea
              value={editComment}
              onChange={e => setEditComment(e.target.value)}
              style={{width:'100%',minHeight:60,marginBottom:16,padding:8,borderRadius:6,border:'1px solid #ccc'}}
            />
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
              <button type="button" className="ui-btn-secondary" onClick={() => setEditAbsence(null)} disabled={editLoading}>Annuler</button>
              <button type="button" className="ui-btn-primary" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2 className="ui-page-title" style={{fontSize:'1.4rem'}}>Planning des absences</h2>
        <div style={{display:'flex',gap:8}}>
          <button type="button" className="ui-btn-secondary" onClick={() => exportAbsencesToCSV(absences)}>
            Export CSV
          </button>
          <button type="button" className="ui-btn-secondary" onClick={() => exportAbsencesToPDF(absences)}>
            Export PDF
          </button>
        </div>
      </div>
      {loading && <div className="ui-text-soft" style={{marginBottom:12}}>Chargement…</div>}
      {error && <div className="error" style={{color:'var(--danger-color)',marginBottom:12}}>{error}</div>}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventPropGetter}
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        style={{ height: 500, margin: '20px 0', background:'#fff',borderRadius:10,boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}
        tooltipAccessor={event => event.title}
        components={{ event: EventComponent }}
      />
      <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
        <b style={{marginRight:8}}>Légende :</b>
        <span style={{background:'#4caf50',padding:'2px 10px',borderRadius:6,margin:'0 4px',color:'#fff'}}>Maladie</span>
        <span style={{background:'#2196f3',padding:'2px 10px',borderRadius:6,margin:'0 4px',color:'#fff'}}>Absence exceptionnelle</span>
      </div>
    </div>
  );
};

export default AbsenceCalendar;