import React from 'react';
import { Form } from 'react-bootstrap';

const GeneralRulesSection = ({ policy, setField, setPolicy }) => {
  return (
    <div id="section-regles-generales">

      {/* ── Bloc 1 : Workflow & chevauchement ── */}
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
          <span className="settings-field__hint">S'applique uniquement si un max d'absences simultanées est défini par service</span>
        </div>
      </div>

      {/* ── Bloc 2 : Durées & délais ── */}
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

      <div className="settings-row" style={{ paddingTop: 0 }}>
        <div className="settings-row__info">
          <div className="settings-row__label">Managers — accès à l'historique des employés</div>
          <div className="settings-row__desc">Les managers peuvent consulter l'historique de congés de tous les employés. Désactiver pour qu'ils ne voient que le leur.</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(policy.manager_can_view_employee_history ?? true)}
            onChange={(e) => setField('manager_can_view_employee_history', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Managers — export CSV des congés de l'équipe</div>
          <div className="settings-row__desc">Les managers peuvent exporter les congés de tous les employés en CSV. Désactiver pour limiter l'export à leurs propres données.</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(policy.manager_can_export_team_leaves ?? true)}
            onChange={(e) => setField('manager_can_export_team_leaves', e.target.checked)}
            label=""
          />
        </div>
      </div>

    </div>
  );
};

export default GeneralRulesSection;
