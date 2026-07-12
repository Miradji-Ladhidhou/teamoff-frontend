import React from 'react';
import { Form } from 'react-bootstrap';

const DAYS = [
  { id: 'lun', label: 'L', title: 'Lundi',     fixed: true },
  { id: 'mar', label: 'M', title: 'Mardi',      fixed: true },
  { id: 'mer', label: 'M', title: 'Mercredi',   fixed: true },
  { id: 'jeu', label: 'J', title: 'Jeudi',      fixed: true },
  { id: 'ven', label: 'V', title: 'Vendredi',   fixed: true },
  { id: 'sat', label: 'S', title: 'Samedi',     fixed: false },
  { id: 'sun', label: 'D', title: 'Dimanche',   fixed: false },
];

const BlockedDaysSection = ({ policy, setPolicy }) => {
  const bd = policy.blocked_days || {};

  const satOn = Boolean(bd.count_saturday) || !(bd.exclude_weekends ?? true);
  const sunOn = Boolean(bd.count_sunday)   || !(bd.exclude_weekends ?? true);

  const toggleDay = (id) => {
    const newSatOn = id === 'sat' ? !satOn : satOn;
    const newSunOn = id === 'sun' ? !sunOn : sunOn;
    setPolicy((prev) => ({
      ...prev,
      blocked_days: {
        ...(prev.blocked_days || {}),
        exclude_weekends: !newSatOn && !newSunOn,
        count_saturday: newSatOn,
        count_sunday: newSunOn,
      },
    }));
  };

  const isActive = (id) => {
    if (id === 'sat') return satOn;
    if (id === 'sun') return sunOn;
    return true;
  };

  return (
    <div id="section-jours-decomptes" className="mb-4">
      <div className="section-label-title mb-3">Jours de travail</div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Jours ouvrables</div>
          <div className="settings-row__desc">
            Jours comptabilisés dans la durée d'un congé — cliquez sur S ou D pour inclure le weekend
          </div>
        </div>
        <div className="settings-row__control">
          <div style={{ display: 'flex', gap: 5 }}>
            {DAYS.map((day) => {
              const active = isActive(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  title={day.title}
                  onClick={() => !day.fixed && toggleDay(day.id)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: active
                      ? '2px solid var(--dk-accent)'
                      : '2px solid var(--dk-border)',
                    background: active ? 'var(--dk-accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--dk-text-muted)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: day.fixed ? 'default' : 'pointer',
                    opacity: day.fixed ? 0.45 : 1,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-row__info">
          <div className="settings-row__label">Jours fériés non décomptés</div>
          <div className="settings-row__desc">Les jours fériés nationaux ne sont pas pris sur le solde</div>
        </div>
        <div className="settings-row__control">
          <Form.Check
            type="switch"
            checked={Boolean(bd.exclude_holidays ?? true)}
            onChange={(e) =>
              setPolicy((prev) => ({
                ...prev,
                blocked_days: {
                  ...(prev.blocked_days || {}),
                  exclude_holidays: e.target.checked,
                },
              }))
            }
            label=""
          />
        </div>
      </div>
    </div>
  );
};

export default BlockedDaysSection;
