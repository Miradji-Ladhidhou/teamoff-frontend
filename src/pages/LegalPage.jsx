import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { InfoCardInfo, TipCard } from '../components/InfoCard';

const LegalPage = () => {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Informations légales</h1>
        <p className="text-muted mb-0">Références légales applicables à l\'éditeur, l\'hébergeur et à l\'utilisation de la plateforme.</p>
      </div>

      <InfoCardInfo title="Version de production">
        <p className="mb-0">Les informations affichées ci-dessous doivent refléter exactement les données juridiques publiées par votre organisation.</p>
      </InfoCardInfo>

      <TipCard title="Minimum recommandé">
        Renseignez l\'éditeur, l\'adresse du siège, le contact juridique, l\'hébergeur, la politique de confidentialité et les modalités d\'exercice des droits.
      </TipCard>

      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Éditeur</h5></Card.Header>
            <Card.Body>
              <p><strong>Raison sociale :</strong> Informations disponibles dans la documentation légale de votre organisation</p>
              <p><strong>Responsable de publication :</strong> Voir la politique de gouvernance interne</p>
              <p><strong>Adresse :</strong> Siège déclaré par l\'entité éditrice</p>
              <p className="mb-0"><strong>Contact juridique :</strong> Canal officiel communiqué par votre organisation</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Hébergement</h5></Card.Header>
            <Card.Body>
              <p><strong>Hébergeur :</strong> Prestataire déclaré dans votre contrat d\'hébergement</p>
              <p><strong>Adresse :</strong> Coordonnées officielles de l\'hébergeur</p>
              <p className="mb-0"><strong>Contact :</strong> Support contractuel de l\'hébergeur</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Conditions d\'usage</h5></Card.Header>
            <Card.Body>
              <p>La plateforme est destinée à la gestion des congés, des validations et des référentiels RH associés.</p>
              <p>Les utilisateurs s\'engagent à préserver la confidentialité de leurs accès et à n\'utiliser l\'application qu\'à des fins professionnelles autorisées.</p>
              <p className="mb-0">Les journaux d\'audit, notifications et exports peuvent être conservés selon les politiques internes de l\'organisation.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LegalPage;