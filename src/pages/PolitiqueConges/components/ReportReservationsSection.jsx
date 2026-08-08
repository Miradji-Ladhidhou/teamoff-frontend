import React from 'react';
import { Form } from 'react-bootstrap';

const ReportReservationsSection = ({ policy, setField }) => {
  return (
    <div id="section-report-reservations">

      {/* ── Report annuel ── */}
      <div className="settings-fields-grid mb-4">
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

      {/* ── Réservations N+1 ── */}
      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Réservations anticipées (année N+1)</div>
          <div className="settings-row__desc">
            Quand le solde est insuffisant, l'employé peut réserver un congé pour l'année suivante uniquement (N+1).
            Impossible pour l'année en cours ou N+2 et au-delà.
            Le congé bascule automatiquement en "en attente" dès que le solde est crédité.
          </div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(policy.autoriser_reservation_sans_solde ?? true)}
            onChange={(e) => setField('autoriser_reservation_sans_solde', e.target.checked)}
            label=""
          />
        </div>
      </div>

      {/* ── Accès historique managers ── */}
      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Managers — accès à l'historique des employés</div>
          <div className="settings-row__desc">
            Les managers peuvent consulter l'historique de congés de tous les employés.
            Désactiver pour qu'ils ne voient que le leur.
          </div>
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

export default ReportReservationsSection;
