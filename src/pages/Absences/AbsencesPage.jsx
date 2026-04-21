import './absences.css';
import React from 'react';
import AbsenceForm from './AbsenceForm';
import { useAuth } from '../../contexts/AuthContext';
import { Container, Card, Spinner } from 'react-bootstrap';

const CalendrierPage = React.lazy(() => import('../Calendrier/CalendrierPage'));

const AbsencesPage = () => {
  const [refresh, setRefresh] = React.useState(false);
  const handleSuccess = () => setRefresh(r => !r);
  const { user } = useAuth();

  const canEdit = user && ['manager', 'admin_entreprise', 'super_admin'].includes(user.role);
  const canDeclareAbsence = user && (user.role === 'employe' || user.role === 'manager');

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Gestion des absences</span>
        <div className="d-flex gap-2">
        </div>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <h2 className="h5 mb-2">Déclarer une absence</h2>
          <ul className="mb-2">
            <li>Un justificatif est obligatoire pour un arrêt maladie.</li>
            <li><b>Les absences et arrêts maladie sont enregistrés immédiatement, sans validation ni refus.</b></li>
            <li>Vous pouvez consulter l'historique et le planning ci-dessous.</li>
          </ul>
          <div className="alert alert-info mt-2 absence-calendar-alert">
            <b>Note :</b> Les absences ne sont pas soumises à un workflow de validation. Elles sont ajoutées au planning dès la déclaration.<br/>
            Pour toute correction, contactez votre manager ou l'administration.
          </div>
        </Card.Body>
      </Card>

      {canDeclareAbsence && (
        <Card className="mb-4">
          <Card.Body>
            <AbsenceForm onSuccess={handleSuccess} />
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="p-0">
          <React.Suspense
            fallback={(
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" variant="primary" />
              </div>
            )}
          >
            <CalendrierPage />
          </React.Suspense>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AbsencesPage;