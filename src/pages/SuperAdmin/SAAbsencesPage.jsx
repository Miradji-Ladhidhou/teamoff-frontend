'use strict';
import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Spinner } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import { entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

const CalendrierPage = React.lazy(() => import('../Calendrier/CalendrierPage'));

const SAAbsencesPage = () => {
  const alert = useAlert();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [calKey, setCalKey] = useState(0);
  const prevCompanyId = useRef('');

  useEffect(() => {
    entreprisesService.getAll()
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : [];
        setCompanies(items);
        if (items.length > 0) setSelectedCompanyId(items[0].id);
      })
      .catch(() => alert.error('Erreur chargement entreprises'));
  }, []);

  // Remont le calendrier quand l'entreprise change
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== prevCompanyId.current) {
      prevCompanyId.current = selectedCompanyId;
      setCalKey(k => k + 1);
    }
  }, [selectedCompanyId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Absences</span>
      </div>

      {/* Selector entreprise */}
      <div className="sa-company-bar mb-4">
        <FaBuilding className="sa-company-bar__icon" />
        <Form.Select
          className="sa-company-bar__select"
          value={selectedCompanyId}
          onChange={e => setSelectedCompanyId(e.target.value)}
        >
          {companies.length === 0 && <option value="">Chargement…</option>}
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </Form.Select>
        {selectedCompany && (
          <span className={`badge ${selectedCompany.statut === 'active' ? 'approved' : 'info'} sa-company-bar__badge`}>
            {selectedCompany.statut === 'active' ? 'Active' : selectedCompany.statut}
          </span>
        )}
      </div>

      {selectedCompanyId ? (
        <Card>
          <Card.Body className="p-0">
            <React.Suspense fallback={
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" variant="primary" />
              </div>
            }>
              <CalendrierPage key={calKey} embedded entrepriseIdOverride={selectedCompanyId} />
            </React.Suspense>
          </Card.Body>
        </Card>
      ) : (
        <div className="text-center py-5 text-muted">Sélectionnez une entreprise pour voir son calendrier.</div>
      )}
    </Container>
  );
};

export default SAAbsencesPage;
