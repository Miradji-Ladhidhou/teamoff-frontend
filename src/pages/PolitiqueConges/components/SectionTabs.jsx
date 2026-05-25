import React from 'react';
import { Card, Button } from 'react-bootstrap';

const SectionTabs = ({ activeSection, setActiveSection }) => {

  return (
    <Card className="mb-3">
      <Card.Body className="py-3 d-flex flex-column flex-lg-row gap-2 align-items-stretch align-items-lg-center justify-content-between">
        <div className="d-flex flex-wrap gap-2">
          <Button size="sm" variant={activeSection === 'general' ? 'primary' : 'outline-secondary'} onClick={() => setActiveSection('general')}>
            General
          </Button>
          <Button size="sm" variant={activeSection === 'cancellation' ? 'primary' : 'outline-secondary'} onClick={() => setActiveSection('cancellation')}>
            Annulation
          </Button>
          <Button size="sm" variant={activeSection === 'services' ? 'primary' : 'outline-secondary'} onClick={() => setActiveSection('services')}>
            Services
          </Button>
          <Button size="sm" variant={activeSection === 'timezone' ? 'primary' : 'outline-secondary'} onClick={() => setActiveSection('timezone')}>
            Fuseau
          </Button>
          <Button size="sm" variant={activeSection === 'types' ? 'primary' : 'outline-secondary'} onClick={() => setActiveSection('types')}>
            Types
          </Button>
        </div>
        <small className="text-muted">Vue filtree pour une edition plus agreable.</small>
      </Card.Body>
    </Card>
  );
};

export default SectionTabs;
