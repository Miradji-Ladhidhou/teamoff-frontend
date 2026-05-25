import React from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';
import AsyncButton from '../../../components/AsyncButton';

const TimezoneSection = ({ timezone, setTimezone, tzPreview, savingTz, handleSaveTimezone, timezoneOptions }) => {
  return (
    <Card className="mt-4">
      <Card.Header>
        <h5 id="section-fuseau-horaire" className="mb-0">Fuseau horaire de l'entreprise</h5>
      </Card.Header>
      <Card.Body>
        <p className="text-muted small mb-3">
          Ce fuseau horaire est utilise pour l'affichage des dates et heures dans les notifications et les exports.
        </p>

        <Form onSubmit={handleSaveTimezone}>
          <Row className="align-items-end g-3">
            <Col md={6}>
              <Form.Group controlId="timezoneSelect">
                <Form.Label className="fw-semibold">Fuseau horaire</Form.Label>
                {(() => {
                  const groups = [...new Set(timezoneOptions.map((o) => o.group))];
                  return (
                    <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      {groups.map((group) => (
                        <optgroup key={group} label={group}>
                          {timezoneOptions.filter((o) => o.group === group).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Form.Select>
                  );
                })()}
              </Form.Group>
            </Col>

            {tzPreview && (
              <Col md={6}>
                <div className="border rounded p-3 bg-light font-monospace small">
                  <div className="fw-bold">{tzPreview.timeLine}</div>
                  <div className="text-muted">{tzPreview.dateLine}</div>
                  <div className="text-muted">{tzPreview.tzLine}</div>
                </div>
              </Col>
            )}
          </Row>

          <div className="d-flex justify-content-end mt-3">
            <AsyncButton
              type="submit"
              isLoading={savingTz}
              showSpinner={savingTz}
              loadingText="Enregistrement..."
              className="w-100 w-sm-auto"
            >
              Enregistrer le fuseau horaire
            </AsyncButton>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default TimezoneSection;
