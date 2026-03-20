import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_MESSAGE = 'Application en maintenance. Veuillez reessayer plus tard.';

function useMaintenanceMessage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const message = params.get('message');

  if (!message || !message.trim()) {
    return DEFAULT_MESSAGE;
  }

  return message;
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const message = useMaintenanceMessage();
  const { logout } = useAuth();

  const handleRetour = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100dvh' }}>
      <Card className="shadow border-0" style={{ maxWidth: 680, width: '100%' }}>
        <Card.Body className="p-4 p-md-5 text-center">
          <div className="mb-3" style={{ fontSize: '2.25rem' }}>Maintenance</div>
          <h1 className="h4 mb-3">Service temporairement indisponible</h1>
          <p className="text-muted mb-4">{message}</p>
          <Button variant="outline-primary" onClick={handleRetour}>
            Retour a la connexion
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
