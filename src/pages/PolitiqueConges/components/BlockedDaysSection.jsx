import React from 'react';
import { Form } from 'react-bootstrap';

const BlockedDaysSection = ({ policy, setPolicy }) => {
  const bd = policy.blocked_days || {};

  const setField = (field, value) => {
    setPolicy((prev) => ({
      ...prev,
      blocked_days: {
        exclude_weekends: true,
        exclude_holidays: true,
        count_saturday: false,
        count_sunday: false,
        specific_dates: [],
        ...(prev.blocked_days || {}),
        [field]: value,
      },
    }));
  };

  return (
    <div id="section-jours-decomptes" className="mb-4">
      <div className="section-label-title mb-3">Jours décomptés</div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Exclure les weekends</div>
          <div className="settings-row__desc">Les samedis et dimanches ne comptent pas dans la durée d'un congé</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(bd.exclude_weekends ?? true)}
            onChange={(e) => setField('exclude_weekends', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Exclure les jours fériés</div>
          <div className="settings-row__desc">Les jours fériés nationaux ne sont pas décomptés du solde</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(bd.exclude_holidays ?? true)}
            onChange={(e) => setField('exclude_holidays', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Compter le samedi</div>
          <div className="settings-row__desc">Le samedi est un jour ouvrable dans votre entreprise</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(bd.count_saturday)}
            onChange={(e) => setField('count_saturday', e.target.checked)}
            label=""
          />
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Compter le dimanche</div>
          <div className="settings-row__desc">Le dimanche est un jour ouvrable dans votre entreprise</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(bd.count_sunday)}
            onChange={(e) => setField('count_sunday', e.target.checked)}
            label=""
          />
        </div>
      </div>
    </div>
  );
};

export default BlockedDaysSection;
