import './contact.css';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import { FaEnvelope, FaHeadset, FaLifeRing } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ContactPage = () => {
  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Contact</span>
      </div>
      <Row>
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaEnvelope className="text-primary mb-3" size={24} />
              <h5>Support général</h5>
              <p className="text-muted">Pour toute question ou demande d'assistance sur la plateforme.</p>
              <p className="mb-2"><strong>Email :</strong> saas.teamoff@gmail.com</p>
              <Button as={Link} variant="outline-primary" to="/help">Voir le centre d'aide</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaHeadset className="text-success mb-3" size={24} />
              <h5>Support technique</h5>
              <p className="text-muted">Pour les incidents techniques ou interruptions de service.</p>
              <p className="mb-2"><strong>Disponibilité :</strong> 24h/24, 7j/7 (sous réserve de la disponibilité des prestataires)</p>
              <p className="mb-0"><strong>Email technique :</strong> saas.teamoff@gmail.com</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaLifeRing className="text-warning mb-3" size={24} />
              <h5>Référent RH / Administratif</h5>
              <p className="text-muted">Pour les questions sur les politiques de congés, workflows et règles RH.</p>
              <p className="mb-0">Contact : TeamOff SaaS<br/>Email : saas.teamoff@gmail.com</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ContactPage;