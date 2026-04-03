import './privacy.css';
import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';

const PrivacyPage = () => {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Confidentialité</h1>
        <p className="text-muted mb-0">Principes de protection des données et bonnes pratiques de traitement.</p>
      </div>

      <InfoCardInfo title="Données concernées">
        <p className="mb-0">La plateforme manipule des données d'identité, d'organisation, de présence, de congés et d'historique d'actions.</p>
      </InfoCardInfo>

      <TipCard title="À faire avant publication">
        Vérifiez la base légale, la durée de conservation, les sous-traitants et la procédure d'exercice des droits RGPD.
      </TipCard>

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