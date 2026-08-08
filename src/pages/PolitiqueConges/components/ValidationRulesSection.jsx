import React from 'react';
import { Form } from 'react-bootstrap';

const ValidationRulesSection = ({ policy, setField }) => {
  return (
    <div id="section-regles-validation">
      <div className="settings-fields-grid mb-4">
        <div className="settings-field">
          <label className="settings-field__label">Qui valide les congés ?</label>
          <Form.Select
            value={policy.approval_workflow}
            onChange={(e) => setField('approval_workflow', e.target.value)}
          >
            <option value="manager_admin">Manager, puis Admin</option>
            <option value="admin_only">Admin uniquement</option>
            <option value="manager_only">Manager uniquement</option>
          </Form.Select>
        </div>

        <div className="settings-field">
          <label className="settings-field__label">Si la capacité service est atteinte</label>
          <Form.Select
            value={policy.overlap_behavior || 'block'}
            onChange={(e) => setField('overlap_behavior', e.target.value)}
          >
            <option value="block">Bloquer la demande</option>
            <option value="warning">Autoriser avec alerte</option>
          </Form.Select>
          <span className="settings-field__hint">
            S'applique uniquement si un max d'absences simultanées est défini par service
          </span>
        </div>
      </div>

      <div className="settings-fields-grid mb-4">
        <div className="settings-field">
          <label className="settings-field__label">Délai minimum avant départ (jours)</label>
          <Form.Control
            type="number"
            min="0"
            value={policy.minimum_notice_days}
            onChange={(e) => setField('minimum_notice_days', e.target.value)}
          />
          <span className="settings-field__hint">Nombre de jours à l'avance requis pour poser un congé</span>
        </div>

        <div className="settings-field">
          <label className="settings-field__label">Durée maximale d'un congé (jours)</label>
          <Form.Control
            type="number"
            min="1"
            value={policy.max_consecutive_days}
            onChange={(e) => setField('max_consecutive_days', e.target.value)}
          />
          <span className="settings-field__hint">Un congé ne peut pas dépasser cette durée</span>
        </div>
      </div>
    </div>
  );
};

export default ValidationRulesSection;
