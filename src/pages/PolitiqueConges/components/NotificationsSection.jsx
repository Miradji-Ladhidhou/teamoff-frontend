import React from 'react';
import { Form } from 'react-bootstrap';

const NotificationsSection = ({ policy, setPolicy }) => {
  const ns = policy.notification_settings || {};

  const setField = (field, value) => {
    setPolicy((prev) => ({
      ...prev,
      notification_settings: {
        on_create: true,
        on_validate: true,
        on_reject: true,
        ...(prev.notification_settings || {}),
        [field]: value,
      },
    }));
  };

  return (
    <div id="section-notifications" className="mb-4">
      <div className="section-label-title mb-3">Notifications</div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">À la création d'une demande</div>
          <div className="settings-row__desc">Le responsable reçoit un email quand un employé dépose une demande de congé</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(ns.on_create ?? true)}
            onChange={(e) => setField('on_create', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">À la validation d'une demande</div>
          <div className="settings-row__desc">L'employé reçoit un email quand son congé est approuvé</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(ns.on_validate ?? true)}
            onChange={(e) => setField('on_validate', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Au refus d'une demande</div>
          <div className="settings-row__desc">L'employé reçoit un email quand son congé est refusé</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(ns.on_reject ?? true)}
            onChange={(e) => setField('on_reject', e.target.checked)}
            label=""
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationsSection;
