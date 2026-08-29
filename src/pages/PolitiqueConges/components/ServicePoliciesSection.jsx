import React from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';

const ServicePoliciesSection = ({
  policy,
  setField,
  newServiceName,
  setNewServiceName,
  addServicePolicy,
  removeServicePolicy,
  setServiceField,
  serviceSearch,
  setServiceSearch,
  visibleServicesCount,
  setVisibleServicesCount,
  serviceEntries,
  filteredServiceEntries,
  visibleServiceEntries,
}) => {
  return (
    <div id="section-politiques-services" className="mb-4">

      {/* ── Permissions managers ── */}
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

      <div className="settings-row mb-4">
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

      {/* ── Ajout d'un service ── */}
      <Row className="g-2 mb-3">
        <Col xs={9} md={6}>
          <Form.Control
            type="text"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            placeholder="Nom du service (ex : RH, Support…)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addServicePolicy(); }
            }}
          />
        </Col>
        <Col xs={3} md="auto">
          <Button type="button" variant="outline-primary" onClick={addServicePolicy} className="w-100">
            + Ajouter
          </Button>
        </Col>
      </Row>

      {/* ── Filtre service (si > 5 services) ── */}
      {serviceEntries.length > 5 && (
        <div className="users-filter-bar mb-3">
          <Form.Select
            value={serviceSearch}
            onChange={(e) => { setServiceSearch(e.target.value); setVisibleServicesCount(8); }}
            className="users-filter-bar__select"
          >
            <option value="">Tous les services</option>
            {serviceEntries.map(([name]) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Form.Select>
          <span className="badge info users-filter-bar__count">
            {filteredServiceEntries.length}/{serviceEntries.length}
          </span>
        </div>
      )}

      {/* ── État vide ── */}
      {serviceEntries.length === 0 && (
        <p className="text-muted small mb-0">
          Aucun service — ajoutez-en un ci-dessus pour définir des règles spécifiques par département.
        </p>
      )}

      {serviceEntries.length > 0 && filteredServiceEntries.length === 0 && (
        <p className="text-muted small mb-0">Aucun service ne correspond à la recherche.</p>
      )}

      {/* ── Liste des services ── */}
      <div className="svc-cards">
        {visibleServiceEntries.map(([serviceName, servicePolicy]) => (
          <div key={serviceName} className="svc-card">

            <div className="svc-card__header">
              <span className="svc-card__name">{serviceName}</span>
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                onClick={() => removeServicePolicy(serviceName)}
                title="Supprimer ce service"
              >
                ✕
              </Button>
            </div>

            <div className="svc-card__body">

              <div className="svc-card__row">
                <div className="svc-card__field">
                  <label className="svc-card__label">Workflow de validation</label>
                  <Form.Select
                    size="sm"
                    value={servicePolicy.approval_workflow || 'manager_admin'}
                    onChange={(e) => setServiceField(serviceName, 'approval_workflow', e.target.value)}
                  >
                    <option value="manager_admin">Manager, puis Admin</option>
                    <option value="manager_only">Manager uniquement</option>
                    <option value="admin_only">Admin uniquement</option>
                  </Form.Select>
                  <span className="svc-card__hint">Qui doit approuver les demandes de ce service</span>
                </div>

                <div className="svc-card__field">
                  <label className="svc-card__label">Si capacité atteinte</label>
                  <Form.Select
                    size="sm"
                    value={servicePolicy.overlap_behavior || 'block'}
                    onChange={(e) => setServiceField(serviceName, 'overlap_behavior', e.target.value)}
                  >
                    <option value="block">Bloquer la demande</option>
                    <option value="warning">Autoriser avec alerte</option>
                  </Form.Select>
                  <span className="svc-card__hint">Comportement quand le max d'absences simultanées est atteint</span>
                </div>
              </div>

              <div className="svc-card__row svc-card__row--3">
                <div className="svc-card__field">
                  <label className="svc-card__label">Seuil d'urgence (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="0"
                    value={servicePolicy.notice_urgency_threshold ?? 0}
                    onChange={(e) => setServiceField(serviceName, 'notice_urgency_threshold', e.target.value)}
                  />
                  <span className="svc-card__hint">Congé &lt; X jours = urgent · 0 = pas de distinction</span>
                </div>

                <div className="svc-card__field">
                  <label className="svc-card__label">Préavis urgent (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="0"
                    disabled={!(Number(servicePolicy.notice_urgency_threshold) > 0)}
                    value={servicePolicy.notice_urgent_days ?? 0}
                    onChange={(e) => setServiceField(serviceName, 'notice_urgent_days', e.target.value)}
                  />
                  <span className="svc-card__hint">Requis si congé &lt; seuil</span>
                </div>

                <div className="svc-card__field">
                  <label className="svc-card__label">Préavis normal (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="0"
                    disabled={!(Number(servicePolicy.notice_urgency_threshold) > 0)}
                    value={servicePolicy.notice_normal_days ?? 0}
                    onChange={(e) => setServiceField(serviceName, 'notice_normal_days', e.target.value)}
                  />
                  <span className="svc-card__hint">Requis si congé ≥ seuil</span>
                </div>
              </div>

              <div className="svc-card__row">
                <div className="svc-card__field">
                  <label className="svc-card__label">Max consécutifs (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="1"
                    value={servicePolicy.max_consecutive_days ?? 365}
                    onChange={(e) => setServiceField(serviceName, 'max_consecutive_days', e.target.value)}
                  />
                  <span className="svc-card__hint">Durée maximale autorisée pour un seul congé</span>
                </div>

                <div className="svc-card__field">
                  <label className="svc-card__label">Max absences simultanées</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="0"
                    value={servicePolicy.max_employees_on_leave ?? 0}
                    onChange={(e) => setServiceField(serviceName, 'max_employees_on_leave', e.target.value)}
                  />
                  <span className="svc-card__hint">Nb max d'employés absents en même temps (0 = illimité)</span>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {filteredServiceEntries.length > visibleServicesCount && (
        <Button
          type="button"
          size="sm"
          variant="outline-secondary"
          className="mt-2"
          onClick={() => setVisibleServicesCount((p) => p + 8)}
        >
          Afficher 8 de plus…
        </Button>
      )}

    </div>
  );
};

export default ServicePoliciesSection;
