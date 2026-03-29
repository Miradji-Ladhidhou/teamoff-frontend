import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { InfoCardInfo, TipCard } from '../components/InfoCard';

const LegalPage = () => {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Informations légales</h1>
        <p className="text-muted mb-0">Références légales applicables à l'éditeur, l'hébergeur et à l'utilisation de la plateforme.</p>
      </div>

      <InfoCardInfo title="Version de production">
        <p className="mb-0">Les informations affichées ci-dessous doivent refléter exactement les données juridiques publiées par votre organisation.</p>
      </InfoCardInfo>

      <TipCard title="Minimum recommandé">
        Renseignez l'éditeur, l'adresse du siège, le contact juridique, l'hébergeur, la politique de confidentialité et les modalités d'exercice des droits.
      </TipCard>

      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Éditeur</h5></Card.Header>
            <Card.Body>
              <p><strong>Raison sociale :</strong> TeamOff SAS</p>
              <p><strong>Responsable de publication :</strong> TeamOff SaaS</p>
              <p><strong>Adresse :</strong> Allée Galabert Zac Moulin Joli 97419 La Possession</p>
              <p className="mb-0"><strong>Contact juridique :</strong> saas.teamoff@gmail.com</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Hébergement</h5></Card.Header>
            <Card.Body>
              <p><strong>Hébergeur frontend :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA</p>
              <p><strong>Hébergeur backend :</strong> Render, 1001 Page St, San Francisco, CA 94117, USA</p>
              <p><strong>Base de données :</strong> Neon, 228 Park Ave S, PMB 77235, New York, NY 10003-1502, USA</p>
              <p><strong>Contact Vercel :</strong> privacy@vercel.com</p>
              <p><strong>Contact Render :</strong> support@render.com</p>
              <p className="mb-0"><strong>Contact Neon :</strong> support@neon.tech</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Conditions d'usage</h5></Card.Header>
            <Card.Body>
              <p>La plateforme est destinée à la gestion des congés, des validations et des référentiels RH associés.</p>
              <p>Les utilisateurs s'engagent à préserver la confidentialité de leurs accès et à n'utiliser l'application qu'à des fins professionnelles autorisées.</p>
              <p>L'application est conçue pour fonctionner 24h/24, 7j/7, sous réserve de la disponibilité des prestataires d'hébergement.</p>
              <p className="mb-0">Les journaux d'audit, notifications et exports peuvent être conservés selon les politiques internes de l'organisation.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LegalPage;