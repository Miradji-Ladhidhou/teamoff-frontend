import React from 'react';

const TABS = [
  { id: 'general',       label: 'Règles générales',   emoji: '⚙️' },
  { id: 'cancellation',  label: 'Annulations',         emoji: '↩️' },
  { id: 'jours',         label: 'Jours décomptés',    emoji: '📅' },
  { id: 'notifications', label: 'Notifications',       emoji: '🔔' },
  { id: 'acquisition',   label: 'Acquisition',         emoji: '📈' },
  { id: 'services',      label: 'Par service',         emoji: '🏢' },
  { id: 'timezone',      label: 'Fuseau horaire',      emoji: '🕐' },
  { id: 'types',         label: 'Types de congés',     emoji: '📋' },
];

const SectionTabs = ({ activeSection, setActiveSection }) => {
  return (
    <div className="settings-card mb-3">
      <div className="settings-card__body" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
        <nav className="settings-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeSection === tab.id}
              className={`settings-tab${activeSection === tab.id ? ' active' : ''}`}
              onClick={() => setActiveSection(tab.id)}
            >
              <span aria-hidden="true">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default SectionTabs;
