import './privacy.css';
import React from 'react';
import { Container, Card } from 'react-bootstrap';

const PrivacyPage = () => {
  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Confidentialité</span>
      </div>

      <Card>
        <Card.Header><h5 className="mb-0">Principes</h5></Card.Header>
        <Card.Body>
          <p><strong>Finalité :</strong> gestion administrative des congés, validations et suivi des opérations.</p>
          <p><strong>Accès :</strong> limité selon les rôles et les périmètres d'entreprise.</p>
          <p><strong>Traçabilité :</strong> certaines actions sensibles sont journalisées dans l'audit.</p>
          <p><strong>Conservation :</strong> à aligner sur votre politique interne et vos obligations légales.</p>
          <p className="mb-0"><strong>Droits :</strong> accès, rectification, opposition, limitation et suppression selon le cadre applicable.</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PrivacyPage;
