import React, { useRef } from 'react';
import { Button } from 'react-bootstrap';

const MAX_SIZE = 300 * 1024; // 300 Ko

const LogoSection = ({ logo, setLogo }) => {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Fichier invalide. Formats acceptés : PNG, JPG, SVG, WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      alert('Fichier trop volumineux. Maximum : 300 Ko.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="settings-card">
      <div className="settings-card__header">
        <h6 className="settings-card__title mb-0">Logo de l'entreprise</h6>
      </div>
      <div className="settings-card__body">
        <p className="text-muted" style={{ fontSize: '0.83rem', marginBottom: '1.25rem' }}>
          Ce logo sera affiché sur les attestations de congé et les documents officiels générés par TeamOff.
          Formats acceptés : PNG, JPG, SVG, WebP — max 300 Ko.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>

          {/* Preview */}
          <div style={{
            width: 140, height: 80,
            border: '1px solid var(--dk-border)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--dk-bg-secondary)',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--dk-text-muted)' }}>Aucun logo</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => inputRef.current.click()}
            >
              {logo ? 'Changer le logo' : 'Ajouter un logo'}
            </Button>
            {logo && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setLogo('')}
              >
                Supprimer
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default LogoSection;
