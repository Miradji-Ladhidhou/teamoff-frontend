import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

const CancellationSection = ({ policy, setField, leavePolicy, setLeavePolicy }) => (
  <div id="section-annulation-conge">
    <div className="section-label-title mb-2">Annulation — Demandes en attente</div>
    <div className="filters-panel mb-4">
      <Row className="g-3">
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="cancel-employe"
            label="Salarié peut annuler sa demande en attente"
            checked={Boolean(policy.allow_employee_cancel_own_pending)}
            onChange={(e) => setField('allow_employee_cancel_own_pending', e.target.checked)}
          />
        </Col>
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="cancel-manager"
            label="Manager peut annuler sa demande en attente"
            checked={Boolean(policy.allow_manager_cancel_own_pending)}
            onChange={(e) => setField('allow_manager_cancel_own_pending', e.target.checked)}
          />
        </Col>
      </Row>
    </div>

    <div className="section-label-title mb-2">Modification / Annulation après validation</div>
    <div className="filters-panel mb-4">
      <Row className="g-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="modify-validated"
            label="Autoriser la modification d'un congé validé"
            checked={Boolean(leavePolicy.allow_modify_validated)}
            onChange={(e) => setLeavePolicy((prev) => ({ ...prev, allow_modify_validated: e.target.checked }))}
          />
        </Col>
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="cancel-validated"
            label="Autoriser l'annulation d'un congé validé"
            checked={Boolean(leavePolicy.allow_cancel_validated)}
            onChange={(e) => setLeavePolicy((prev) => ({ ...prev, allow_cancel_validated: e.target.checked }))}
          />
        </Col>
      </Row>
      <Row className="g-3 mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label>Préavis minimum (jours)</Form.Label>
            <Form.Control
              type="number" min="0"
              value={leavePolicy.min_notice_days}
              onChange={(e) => setLeavePolicy((prev) => ({ ...prev, min_notice_days: e.target.value }))}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="g-3">
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="req-manager"
            label="Validation manager requise"
            checked={Boolean(leavePolicy.require_manager_approval)}
            onChange={(e) => setLeavePolicy((prev) => ({ ...prev, require_manager_approval: e.target.checked }))}
          />
        </Col>
        <Col xs={12} md={6}>
          <Form.Check
            type="switch"
            id="req-admin"
            label="Validation admin requise"
            checked={Boolean(leavePolicy.require_admin_approval)}
            onChange={(e) => setLeavePolicy((prev) => ({ ...prev, require_admin_approval: e.target.checked }))}
          />
        </Col>
      </Row>
    </div>
  </div>
);

export default CancellationSection;
