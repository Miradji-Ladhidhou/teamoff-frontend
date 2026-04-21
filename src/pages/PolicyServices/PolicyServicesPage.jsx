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
      <div className="page-title-bar">
        <span className="section-title-bar__text">Configuration des congés</span>
      </div>
      <style>{`
        .policy-services-merged.policy-tab .section-title-bar:first-of-type,
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
