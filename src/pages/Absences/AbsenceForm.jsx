import React, { useState, useRef } from 'react';
import './absence-form.css';
import { useAlert } from '../../hooks/useAlert';
import { api } from '../../services/api';
import { FaPaperclip, FaCamera, FaImage, FaFilePdf, FaTimes, FaShieldAlt } from 'react-icons/fa';

function formatBytes(bytes) {
  if (!bytes) return '0 Ko';
  const ko = bytes / 1024;
  if (ko < 1024) return `${ko.toFixed(1)} Ko`;
  return `${(ko / 1024).toFixed(1)} Mo`;
}

const AbsenceForm = ({ onSuccess }) => {
  const alert = useAlert();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [typeAbsence, setTypeAbsence] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSelectFile = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Format non supporté. Veuillez sélectionner une photo (JPG, PNG, WEBP) ou un fichier PDF.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (maximum 10 Mo).');
      return;
    }

    setError('');
    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) handleSelectFile(selected);
  };

  const removeFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
      formData.append('commentaire', commentaire.trim());
      if (file) {
        formData.append('justificatif', file);
      }

      await api.post('/absences', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTypeAbsence('');
      setDateDebut('');
      setDateFin('');
      setCommentaire('');
      removeFile();

      alert.success('Absence déclarée avec succès ! L\'alerte email a été envoyée.');
      if (onSuccess) onSuccess();

    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors de la déclaration');
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
            disabled={sending}
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
            disabled={sending}
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
            disabled={sending}
            required
          />
        </div>
      </div>

      <div className="absence-form-field">
        <label className="absence-form-label">Commentaire *</label>
        <textarea
          className="absence-form-textarea"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          disabled={sending}
          placeholder="Précisez le motif ou les détails utiles pour votre équipe..."
          required
        />
      </div>

      {/* Zone Justificatif (Pièce jointe photo ou document) */}
      <div className="absence-form-field absence-attachment-section">
        <label className="absence-form-label d-flex justify-content-between align-items-center">
          <span>Pièce jointe / Justificatif <small className="text-muted">(optionnel)</small></span>
          <span className="absence-privacy-tag" title="Le fichier est envoyé par email puis immédiatement supprimé. Seule l'attestation reste enregistrée.">
            <FaShieldAlt className="me-1" /> Zéro stockage BDD
          </span>
        </label>

        {/* Inputs cachés pour sélecteur de fichier et appareil photo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={sending}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={sending}
        />

        {!file ? (
          <div className="absence-upload-box">
            <div className="absence-upload-actions">
              <button
                type="button"
                className="absence-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <FaImage className="me-2 text-primary" />
                Galerie / Fichier
              </button>

              <button
                type="button"
                className="absence-upload-btn absence-upload-btn--camera"
                onClick={() => cameraInputRef.current?.click()}
                disabled={sending}
              >
                <FaCamera className="me-2 text-success" />
                Prendre une photo
              </button>
            </div>
            <p className="absence-upload-hint">
              Formats acceptés : Photos (JPG, PNG, WEBP) ou PDF • Max 10 Mo
            </p>
          </div>
        ) : (
          <div className="absence-file-preview-card">
            <div className="absence-file-info">
              {filePreview ? (
                <img src={filePreview} alt="Aperçu justificatif" className="absence-file-thumb" />
              ) : (
                <div className="absence-file-icon">
                  {file.type === 'application/pdf' ? <FaFilePdf size={24} color="#dc2626" /> : <FaPaperclip size={24} />}
                </div>
              )}
              <div className="absence-file-meta">
                <span className="absence-file-name" title={file.name}>{file.name}</span>
                <span className="absence-file-size">{formatBytes(file.size)}</span>
              </div>
            </div>
            <button
              type="button"
              className="absence-file-remove-btn"
              onClick={removeFile}
              disabled={sending}
              title="Supprimer la pièce jointe"
              aria-label="Supprimer le fichier"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="absence-form-privacy-note">
          <FaShieldAlt className="absence-form-privacy-icon" />
          <span>
            <strong>Protection des données :</strong> Le document est joint directement à l'email d'alerte destiné aux RH/managers, puis <em>immédiatement supprimé de la mémoire</em>. Seules les métadonnées (nom, taille, date, empreinte SHA-256) restent enregistrées comme preuve.
          </span>
        </div>
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
        {sending ? 'Enregistrement et envoi...' : "Déclarer l'absence"}
      </button>
    </form>
  );
};

export default AbsenceForm;
