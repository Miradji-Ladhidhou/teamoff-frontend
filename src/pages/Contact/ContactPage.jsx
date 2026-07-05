import './contact.css';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { FaEnvelope, FaHeadset, FaShieldAlt } from 'react-icons/fa';

const ContactPage = () => {
  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Contact</span>
      </div>

      <Row className="mb-4">
        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaEnvelope className="mb-3" size={24} style={{ color: 'var(--dk-accent)' }} />
              <h5>Support général</h5>
              <p className="text-muted">Questions sur l'utilisation, demandes d'information, accès à la plateforme.</p>
              <p className="mb-1"><strong>Email :</strong> <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></p>
              <p className="mb-0 small text-muted">Réponse sous 1 à 3 jours ouvrés</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaHeadset className="mb-3" size={24} style={{ color: 'var(--dk-success)' }} />
              <h5>Support technique</h5>
              <p className="text-muted">Incidents techniques, bugs, interruptions de service, problèmes de connexion.</p>
              <p className="mb-1"><strong>Email :</strong> <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></p>
              <p className="mb-0 small text-muted">Précisez "INCIDENT" dans l'objet de votre email pour un traitement prioritaire</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <FaShieldAlt className="mb-3" size={24} style={{ color: 'var(--dk-warning)' }} />
              <h5>Données personnelles & RGPD</h5>
              <p className="text-muted">Exercice de vos droits RGPD : accès, rectification, effacement, portabilité.</p>
              <p className="mb-1"><strong>Email :</strong> <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></p>
              <p className="mb-0 small text-muted">Précisez "RGPD" dans l'objet — réponse sous 30 jours conformément au règlement</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header><h5 className="mb-0">Questions RH et politiques de congés</h5></Card.Header>
        <Card.Body>
          <p className="mb-0">
            Pour toute question relative aux règles internes de congés (quotas, workflows de validation, jours fériés, politiques par service),
            veuillez vous rapprocher directement de l'<strong>administrateur de votre organisation</strong> sur la plateforme.
            Celui-ci dispose des droits nécessaires pour configurer et répondre à ces questions.
          </p>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header><h5 className="mb-0">Horaires et délais</h5></Card.Header>
        <Card.Body>
          <Row>
            <Col xs={12} md={6}>
              <p><strong>Jours ouvrés :</strong> lundi au vendredi</p>
              <p className="mb-0"><strong>Fuseau horaire :</strong> La Réunion (UTC+4)</p>
            </Col>
            <Col xs={12} md={6}>
              <p><strong>Support général :</strong> réponse sous 1 à 3 jours ouvrés</p>
              <p className="mb-0"><strong>Incident technique :</strong> accusé de réception rapide, résolution selon gravité</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ContactPage;
