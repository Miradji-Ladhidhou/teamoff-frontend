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
  const canDeclareAbsence = user && ['employe', 'manager', 'admin_entreprise'].includes(user.role);

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
          <p className="mb-0 text-muted small">Les absences sont enregistrées immédiatement et visibles dans le planning. Pour toute correction, contactez votre manager ou l'administration.</p>
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