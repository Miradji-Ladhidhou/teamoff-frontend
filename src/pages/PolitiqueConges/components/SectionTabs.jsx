import React from 'react';
import { Form } from 'react-bootstrap';

const TABS = [
  { id: 'types',         label: 'Types de congé',           emoji: '📋' },
  { id: 'acquisition',   label: 'Soldes & Acquisition',     emoji: '📊' },
  { id: 'regles',        label: 'Règles & Préavis',         emoji: '⏱️' },
  { id: 'services',      label: 'Règles par service',       emoji: '🏢' },
  { id: 'report',        label: 'Report & Réservations',    emoji: '🗓️' },
  { id: 'annulation',    label: 'Annulation & Modification', emoji: '🔄' },
  { id: 'notifications', label: 'Notifications email',      emoji: '📧' },
  { id: 'timezone',      label: 'Fuseau horaire',           emoji: '🌐' },
  { id: 'logo',          label: 'Logo',                     emoji: '🖼️' },
];

const SectionTabs = ({ activeSection, setActiveSection }) => {
  const activeTab = TABS.find((t) => t.id === activeSection);

  return (
    <div className="settings-card mb-3">
      <div className="settings-card__body" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>

        {/* ── Mobile : select ── */}
        <div className="d-md-none">
          <Form.Select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            style={{ fontWeight: 600 }}
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.emoji}  {tab.label}
              </option>
            ))}
          </Form.Select>
          {activeTab && (
            <p className="mb-0 mt-2" style={{ fontSize: '0.72rem', color: 'var(--dk-text-muted)' }}>
              Onglet {TABS.findIndex((t) => t.id === activeSection) + 1} / {TABS.length}
            </p>
          )}
        </div>

        {/* ── Desktop : tabs scrollables ── */}
        <nav className="settings-tabs d-none d-md-flex" role="tablist">
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
