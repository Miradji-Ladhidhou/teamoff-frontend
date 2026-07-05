import React from 'react';
import { Form } from 'react-bootstrap';

const AccrualSection = ({ policy, setPolicy, congeTypes }) => {
  const accrual = policy.accrual_by_type || {};

  const setTypeAccrual = (code, value) => {
    setPolicy((prev) => ({
      ...prev,
      accrual_by_type: {
        ...(prev.accrual_by_type || {}),
        [code]: value === '' ? undefined : Number(value),
      },
    }));
  };

  if (congeTypes.length === 0) {
    return (
      <div id="section-acquisition" className="mb-4">
        <div className="section-label-title mb-3">Acquisition mensuelle</div>
        <div className="text-muted small">
          Aucun type de congé configuré — ajoutez des types dans l'onglet <strong>Types de congés</strong> pour définir leur acquisition mensuelle.
        </div>
      </div>
    );
  }

  return (
    <div id="section-acquisition" className="mb-4">
      <div className="section-label-title mb-3">Acquisition mensuelle</div>
      <p className="text-muted small mb-3">
        Nombre de jours acquis par mois pour chaque type de congé. Laisser vide pour utiliser le quota annuel global.
      </p>

      <div className="settings-fields-grid settings-fields-grid--3">
        {congeTypes.map((type) => (
          <div key={type.code} className="settings-field">
            <label className="settings-field__label">
              <span className="badge info me-1">{type.code}</span>
              {type.libelle}
            </label>
            <div className="input-group">
              <Form.Control
                type="number"
                min="0"
                step="0.5"
                value={accrual[type.code] ?? ''}
                placeholder="–"
                onChange={(e) => setTypeAccrual(type.code, e.target.value)}
              />
              <span className="input-group-text">j/mois</span>
            </div>
            <span className="settings-field__hint">
              Quota annuel : {type.quota_annuel} j
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccrualSection;
