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

      {/* ── Règles par défaut ── */}
      <div className="svc-defaults-card mb-4">
        <div className="svc-defaults-card__title">Règles générales</div>
        <p className="svc-defaults-card__desc">
          Ces règles s'appliquent aux employés non affectés à un service. Les règles définies par service ci-dessous priment sur celles-ci.
        </p>

        <div className="settings-fields-grid mb-3">
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
            <span className="settings-field__hint">S'applique si un max d'absences simultanées est défini par service</span>
          </div>
        </div>

        <div className="settings-fields-grid mb-3">
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

        <div className="settings-row" style={{ borderTop: '1px solid var(--dk-border)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
          <div className="settings-row__info">
            <div className="settings-row__label">Managers — accès à l'historique des employés</div>
            <div className="settings-row__desc">Les managers peuvent consulter l'historique de congés de tous les employés de leur service.</div>
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

      {/* ── Séparateur ── */}
      <div className="svc-section-label mb-3">Règles par service</div>

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

      {/* ── Recherche (si > 5 services) ── */}
      {serviceEntries.length > 5 && (
        <div className="users-filter-bar mb-3">
          <Form.Control
            type="text"
            value={serviceSearch}
            onChange={(e) => { setServiceSearch(e.target.value); setVisibleServicesCount(8); }}
            placeholder="Rechercher un service…"
            className="users-filter-bar__search"
          />
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
                </div>
              </div>

              <div className="svc-card__row svc-card__row--3">
                <div className="svc-card__field">
                  <label className="svc-card__label">Préavis min (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="0"
                    value={servicePolicy.minimum_notice_days ?? 0}
                    onChange={(e) => setServiceField(serviceName, 'minimum_notice_days', e.target.value)}
                  />
                </div>

                <div className="svc-card__field">
                  <label className="svc-card__label">Max consécutifs (jours)</label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min="1"
                    value={servicePolicy.max_consecutive_days ?? 365}
                    onChange={(e) => setServiceField(serviceName, 'max_consecutive_days', e.target.value)}
                  />
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
