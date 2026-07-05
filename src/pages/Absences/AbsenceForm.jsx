import React, { useState } from 'react';
import './absence-form.css';
import { useAlert } from '../../hooks/useAlert';
import { api } from '../../services/api';

const AbsenceForm = ({ onSuccess }) => {
  const alert = useAlert();
  const [typeAbsence, setTypeAbsence] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!typeAbsence || !dateDebut || !dateFin || !commentaire.trim()) {
      setError('Tous les champs obligatoires doivent être remplis, y compris le commentaire.');
      return;
    }

    if (dateFin < dateDebut) {
      setError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('type_absence', typeAbsence);
      formData.append('date_debut', dateDebut);
      formData.append('date_fin', dateFin);
      formData.append('commentaire', commentaire);

      await api.post('/absences', formData);

      setTypeAbsence('');
      setDateDebut('');
      setDateFin('');
      setCommentaire('');

      alert.success('Absence déclarée avec succès !');
      if (onSuccess) onSuccess();

    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la déclaration';
      setError(msg);
      alert.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="absence-form">
      <div className="absence-form-fields">
        <div className="absence-form-field">
          <label className="absence-form-label">Type d'absence *</label>
          <select
            className="absence-form-select"
            value={typeAbsence}
            onChange={(e) => setTypeAbsence(e.target.value)}
            required
          >
            <option value="">Sélectionner</option>
            <option value="maladie">Arrêt maladie</option>
            <option value="absence_exceptionnelle">Absence exceptionnelle</option>
          </select>
        </div>

        <div className="absence-form-field">
          <label className="absence-form-label">Date de début *</label>
          <input
            className="absence-form-input"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
          />
        </div>

        <div className="absence-form-field">
          <label className="absence-form-label">Date de fin *</label>
          <input
            className="absence-form-input"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            required
          />
        </div>
      </div>

      {typeAbsence === 'maladie' && (
        <div className="absence-form-notice">
          <span className="absence-form-notice__icon">📋</span>
          <span>
            N'oubliez pas de déposer votre justificatif d'arrêt maladie (avis d'arrêt de travail)
            directement auprès de votre entreprise dans les plus brefs délais.
          </span>
        </div>
      )}

      <div className="absence-form-field">
        <label className="absence-form-label">Commentaire *</label>
        <textarea
          className="absence-form-textarea"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="absence-form-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="absence-form-submit"
        disabled={sending}
        style={sending ? { opacity: 0.7 } : {}}
      >
        Déclarer l'absence
      </button>
    </form>
  );
};

export default AbsenceForm;
