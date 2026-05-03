import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRoute } from '../../utils/navigation';

const NotFoundPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(user?.role));
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f3f4f6' }}>
      <Container className="text-center" style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>404</div>
        <h1 className="h4 fw-bold mt-3 mb-2">Page introuvable</h1>
        <p className="text-muted mb-4">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Button variant="primary" onClick={handleBack}>
          Retour à l'accueil
        </Button>
        {!isAuthenticated && (
          <div className="mt-3">
            <Link to="/" className="text-muted small">Se connecter</Link>
          </div>
        )}
      </Container>
    </div>
  );
};

export default NotFoundPage;
