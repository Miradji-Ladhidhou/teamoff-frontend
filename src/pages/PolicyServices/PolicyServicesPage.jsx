import './policy-services.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Container, ButtonGroup, Button, Card } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import PolitiqueCongesPage from '../PolitiqueConges/PolitiqueCongesPage';
import ServicesPage from '../Services/ServicesPage';

const PolicyServicesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialTab = useMemo(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    return tab === 'services' ? 'services' : 'policy';
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSwitch = (nextTab) => {
    setActiveTab(nextTab);
    navigate(`/politique-conges?tab=${nextTab}`);
  };

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h4 mb-1">Configuration des congés</h1>
          <p className="text-muted mb-0">
            Définissez les règles de gestion des congés : types, annulation, organisation par service et fuseau horaire.
          </p>
        </div>
      </div>
      <style>{`
        .policy-services-merged.policy-tab .page-header:first-of-type,
        .policy-services-merged .alert[role="note"] {
          display: none;
        }
      `}</style>

      <div className={`policy-services-merged ${activeTab === 'policy' ? 'policy-tab' : 'services-tab'}`}>
        {activeTab === 'policy' ? <PolitiqueCongesPage /> : <ServicesPage />}
      </div>
    </Container>
  );
};

export default PolicyServicesPage;
