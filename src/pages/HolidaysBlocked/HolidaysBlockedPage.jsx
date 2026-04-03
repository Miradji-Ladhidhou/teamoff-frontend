import './holidays-blocked.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, ButtonGroup, Button } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import JoursFeriesPage from '../JoursFeries/JoursFeriesPage';
import JoursBloquesPage from '../JoursBloques/JoursBloquesPage';

const HolidaysBlockedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    return tab === 'bloques' ? 'bloques' : 'feries';
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    navigate(`/jours-feries?tab=${tab}`);
  };

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h4 mb-1">Jours spéciaux</h1>
          <p className="text-muted mb-0">Fériés et bloqués au même endroit.</p>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <ButtonGroup aria-label="Navigation jours spéciaux">
            <Button
              variant={activeTab === 'feries' ? 'primary' : 'outline-secondary'}
              onClick={() => switchTab('feries')}
            >
              Jours fériés
            </Button>
            <Button
              variant={activeTab === 'bloques' ? 'primary' : 'outline-secondary'}
              onClick={() => switchTab('bloques')}
            >
              Jours bloqués
            </Button>
          </ButtonGroup>
        </Card.Body>
      </Card>

      <style>{`
        .days-merged .page-header:first-of-type,
        .days-merged .alert[role="note"] {
          display: none;
        }
      `}</style>

      <div className="days-merged">
        {activeTab === 'feries' ? <JoursFeriesPage /> : <JoursBloquesPage />}
      </div>
    </Container>
  );
};

export default HolidaysBlockedPage;
