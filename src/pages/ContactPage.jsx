import React from 'react';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import { FaEnvelope, FaHeadset, FaLifeRing } from 'react-icons/fa';
import { InfoCardInfo } from '../components/InfoCard';
import { Link } from 'react-router-dom';

const ContactPage = () => {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Contact</h1>
        <p className="text-muted mb-0">Canaux de support et d\'assistance définis par votre organisation.</p>
      </div>

      <InfoCardInfo title="Canaux recommandés">
        <p className="mb-0">Privilégiez les canaux tracés (ticket, email d\'entreprise, support prioritaire) pour le suivi opérationnel.</p>
      </InfoCardInfo>

      <Row>
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaEnvelope className="text-primary mb-3" size={24} />
              <h5>Canal support principal</h5>
              <p className="text-muted">Utilisez l\'adresse de support officielle définie dans votre organisation.</p>
              <Button as={Link} variant="outline-primary" to="/help">Voir le centre d'aide</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaHeadset className="text-success mb-3" size={24} />
              <h5>Support prioritaire</h5>
              <p className="text-muted">Réservé aux interruptions de service et incidents critiques.</p>
              <p className="mb-0"><strong>Disponibilité :</strong> Selon vos engagements de service internes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaLifeRing className="text-warning mb-3" size={24} />
              <h5>Référent interne</h5>
              <p className="text-muted">Pour les politiques de congés, workflows et règles RH propres à votre structure.</p>
              <p className="mb-0">Contactez votre administrateur entreprise ou responsable RH.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ContactPage;