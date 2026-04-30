import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

const GeneralRulesSection = ({ policy, setField, setPolicy }) => {
  return (
    <div id="section-regles-generales">
      <Row>
        <Col xs={12} md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Politique de chevauchement</Form.Label>
            <Form.Select
              value={policy.overlap_policy}
              onChange={(e) => setField('overlap_policy', e.target.value)}
            >
              <option value="block">Bloquer</option>
              <option value="warning">Autoriser et alerter</option>
              <option value="allow">Autoriser</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Workflow d'approbation</Form.Label>
            <Form.Select
              value={policy.approval_workflow}
              onChange={(e) => setField('approval_workflow', e.target.value)}
            >
              <option value="manager_admin">Manager puis Admin</option>
              <option value="admin_only">Admin uniquement</option>
              <option value="manager_only">Manager uniquement</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Preavis minimum (jours)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={policy.minimum_notice_days}
              onChange={(e) => setField('minimum_notice_days', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Max jours consecutifs</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={policy.max_consecutive_days}
              onChange={(e) => setField('max_consecutive_days', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Max absences simultanees (global)</Form.Label>
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
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Conges payes annuels</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={policy.conges_payes_annuels}
              onChange={(e) => setField('conges_payes_annuels', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>RTT annuels</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={policy.rtt_annuels}
              onChange={(e) => setField('rtt_annuels', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Report max (jours)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={policy.report_max_jours}
              onChange={(e) => setField('report_max_jours', e.target.value)}
              disabled={!policy.report_autorise}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Check
          type="switch"
          label="Autoriser le report annuel"
          checked={Boolean(policy.report_autorise)}
          onChange={(e) => setField('report_autorise', e.target.checked)}
        />
      </Form.Group>
    </div>
  );
};

export default GeneralRulesSection;
