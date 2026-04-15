import React from 'react';
import { Card, Row, Col, Form } from 'react-bootstrap';

const CancellationSection = ({ policy, setField, leavePolicy, setLeavePolicy }) => {
  return (
    <>
      <Card id="section-annulation-conge" className="mb-4">
        <Card.Body>
          <div className="fw-semibold mb-1">Annulation de conge - Demandes en attente</div>
          <div className="small text-muted mb-3">
            Definissez si un salarie ou un manager peut annuler sa propre demande tant qu'elle est en attente de validation.
          </div>

          <Row className="g-3">
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Autoriser le salarie a annuler sa demande en attente"
                checked={Boolean(policy.allow_employee_cancel_own_pending)}
                onChange={(e) => setField('allow_employee_cancel_own_pending', e.target.checked)}
              />
            </Col>
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Autoriser le manager a annuler sa demande en attente"
                checked={Boolean(policy.allow_manager_cancel_own_pending)}
                onChange={(e) => setField('allow_manager_cancel_own_pending', e.target.checked)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <div className="fw-semibold mb-1">Annulation de conge apres validation (et modification)</div>
          <div className="small text-muted mb-3">Definissez ce que les utilisateurs peuvent encore faire une fois un conge valide.</div>

          <Row className="g-3 mb-2">
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Autoriser la modification d'un conge valide"
                checked={Boolean(leavePolicy.allow_modify_validated)}
                onChange={(e) => setLeavePolicy((prev) => ({ ...prev, allow_modify_validated: e.target.checked }))}
              />
            </Col>
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Autoriser l'annulation d'un conge valide"
                checked={Boolean(leavePolicy.allow_cancel_validated)}
                onChange={(e) => setLeavePolicy((prev) => ({ ...prev, allow_cancel_validated: e.target.checked }))}
              />
            </Col>
          </Row>

          <Row className="g-3 mb-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Preavis minimum (jours)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={leavePolicy.min_notice_days}
                  onChange={(e) => setLeavePolicy((prev) => ({ ...prev, min_notice_days: e.target.value }))}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Retroactivite max (jours)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={leavePolicy.max_backdate_days}
                  onChange={(e) => setLeavePolicy((prev) => ({ ...prev, max_backdate_days: e.target.value }))}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Validation manager requise"
                checked={Boolean(leavePolicy.require_manager_approval)}
                onChange={(e) => setLeavePolicy((prev) => ({ ...prev, require_manager_approval: e.target.checked }))}
              />
            </Col>
            <Col md={6}>
              <Form.Check
                type="switch"
                label="Validation admin requise"
                checked={Boolean(leavePolicy.require_admin_approval)}
                onChange={(e) => setLeavePolicy((prev) => ({ ...prev, require_admin_approval: e.target.checked }))}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
};

export default CancellationSection;
