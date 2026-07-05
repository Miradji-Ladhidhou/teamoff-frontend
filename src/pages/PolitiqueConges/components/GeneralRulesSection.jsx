import React from 'react';
import { Form } from 'react-bootstrap';

const GeneralRulesSection = ({ policy, setField, setPolicy }) => {
  return (
    <div id="section-regles-generales">

      {/* ── Bloc 1 : Chevauchements & Workflow ── */}
      <div className="settings-fields-grid mb-4">
        <div className="settings-field">
          <label className="settings-field__label">Si deux employés sont absents en même temps</label>
          <Form.Select
            value={policy.overlap_policy}
            onChange={(e) => setField('overlap_policy', e.target.value)}
          >
            <option value="block">Bloquer la 2ème demande</option>
            <option value="warning">Autoriser avec alerte</option>
            <option value="allow">Toujours autoriser</option>
          </Form.Select>
        </div>

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
      </div>

      {/* ── Bloc 2 : Durées & délais ── */}
      <div className="settings-fields-grid settings-fields-grid--3 mb-4">
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

        <div className="settings-field">
          <label className="settings-field__label">Absences simultanées max (global)</label>
          <Form.Control
            type="number"
            min="0"
            value={policy.max_employees_on_leave?.global ?? ''}
            onChange={(e) => setPolicy((prev) => ({
              ...prev,
              max_employees_on_leave: {
                ...(prev.max_employees_on_leave || {}),
                global: e.target.value,
              },
            }))}
          />
          <span className="settings-field__hint">0 = illimité</span>
        </div>
      </div>

      {/* ── Bloc 3 : Quotas & report ── */}
      <div className="settings-fields-grid settings-fields-grid--3 mb-4">
        <div className="settings-field">
          <label className="settings-field__label">Congés payés annuels (jours)</label>
          <Form.Control
            type="number"
            min="0"
            value={policy.conges_payes_annuels}
            onChange={(e) => setField('conges_payes_annuels', e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label">RTT annuels (jours)</label>
          <Form.Control
            type="number"
            min="0"
            value={policy.rtt_annuels}
            onChange={(e) => setField('rtt_annuels', e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label">Report annuel max (jours)</label>
          <Form.Control
            type="number"
            min="0"
            value={policy.report_max_jours}
            onChange={(e) => setField('report_max_jours', e.target.value)}
            disabled={!policy.report_autorise}
          />
          <span className="settings-field__hint">Jours reportables sur l'année suivante</span>
        </div>
      </div>

      {/* ── Toggle report ── */}
      <div className="settings-row" style={{ paddingTop: 0 }}>
        <div className="settings-row__info">
          <div className="settings-row__label">Autoriser le report annuel</div>
          <div className="settings-row__desc">Les jours non utilisés peuvent être reportés l'année suivante</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(policy.report_autorise)}
            onChange={(e) => setField('report_autorise', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
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

    </div>
  );
};

export default GeneralRulesSection;
