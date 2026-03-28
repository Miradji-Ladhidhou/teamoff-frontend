import React, { useState } from 'react';
import '../../styles/absence-form.css';
import { useAlert } from '../../hooks/useAlert';
import { api } from '../../services/api';

const AbsenceForm = ({ onSuccess }) => {
  const alert = useAlert();
  const [typeAbsence, setTypeAbsence] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [justificatif, setJustificatif] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Réinitialise le justificatif si le type change
  const handleTypeChange = (e) => {
    setTypeAbsence(e.target.value);
    setJustificatif(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!typeAbsence || !dateDebut || !dateFin) {
      setError('Tous les champs obligatoires doivent être remplis.');
      return;
    }

    if (dateFin < dateDebut) {
      setError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }

    if (typeAbsence === 'maladie' && !justificatif) {
      setError('Un justificatif est obligatoire pour un arrêt maladie.');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('type_absence', typeAbsence);
      formData.append('date_debut', dateDebut);
      formData.append('date_fin', dateFin);
      formData.append('commentaire', commentaire);
      if (justificatif) formData.append('justificatif', justificatif);

      const res = await api.post('/absences', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset formulaire
      setTypeAbsence('');
      setDateDebut('');
      setDateFin('');
      setJustificatif(null);
      setCommentaire('');

      alert.success('Absence déclarée avec succès !');
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error(err);
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
          <label className="absence-form-label">Type d’absence *</label>
          <select
            className="absence-form-select"
            value={typeAbsence}
            onChange={handleTypeChange}
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
        <div className="absence-form-field">
          <label className="absence-form-label">Justificatif (PDF/image) *</label>
          <input
            className="absence-form-input"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setJustificatif(e.target.files[0])}
            required
          />
        </div>
      )}

      <div className="absence-form-field">
        <label className="absence-form-label">Commentaire</label>
        <textarea
          className="absence-form-textarea"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
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
        Déclarer l’absence
      </button>
    </form>
  );
};

export default AbsenceForm;