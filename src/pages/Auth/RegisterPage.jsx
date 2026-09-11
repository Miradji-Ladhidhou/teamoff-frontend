import React from 'react';
import { Link } from 'react-router-dom';
import TeamOffLogo from '../../components/TeamOffLogo';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaEnvelope, FaBuilding, FaUser, FaPhone, FaBriefcase } from 'react-icons/fa';

const CONTACT_EMAIL = 'saas.teamoff@gmail.com';

const RegisterPage = () => (
  <div className="min-vh-100 register-bg d-flex align-items-center justify-content-center py-4">
    <Container>
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="shadow-lg dark-card">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <TeamOffLogo size="md" variant="light" style={{ justifyContent: 'center', marginBottom: '0.5rem' }} />
                <small className="text-muted">Demande de création de compte</small>
              </div>

              <p className="mb-3" style={{ color: 'var(--dk-text)', fontSize: '0.95rem' }}>
                La création de compte se fait sur demande. Envoyez un email à l'adresse suivante en incluant les informations ci-dessous :
              </p>

              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Demande de création de compte TeamOff&body=Bonjour,%0A%0AJe souhaite créer un compte entreprise sur TeamOff.%0A%0ANom de l'entreprise : %0AEmail de l'entreprise : %0ATéléphone : %0ANombre de salariés : %0A%0AResponsable du compte :%0APrénom : %0ANom : %0AEmail : %0A%0ACordialement`}
                className="btn btn-primary w-100 mb-4 d-flex align-items-center justify-content-center gap-2"
                style={{ fontSize: '0.95rem' }}
              >
                <FaEnvelope />
                Envoyer un email à {CONTACT_EMAIL}
              </a>

              <div className="mb-3" style={{ color: 'var(--dk-text-muted)', fontSize: '0.85rem' }}>
                <div className="mb-2 fw-semibold" style={{ color: 'var(--dk-text)' }}>Informations à inclure dans votre email :</div>
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  <li className="d-flex align-items-start gap-2">
                    <FaBuilding className="mt-1 flex-shrink-0" style={{ color: 'var(--dk-accent)' }} />
                    <span><strong>Entreprise :</strong> nom, email, téléphone</span>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <FaBriefcase className="mt-1 flex-shrink-0" style={{ color: 'var(--dk-accent)' }} />
                    <span><strong>Effectif :</strong> nombre de salariés approximatif</span>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <FaUser className="mt-1 flex-shrink-0" style={{ color: 'var(--dk-accent)' }} />
                    <span><strong>Responsable du compte :</strong> prénom, nom, email</span>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <FaPhone className="mt-1 flex-shrink-0" style={{ color: 'var(--dk-accent)' }} />
                    <span><strong>Numéro de téléphone</strong> pour vous contacter si besoin</span>
                  </li>
                </ul>
              </div>

              <div className="text-center mt-4">
                <Link to="/login" className="text-info" style={{ fontSize: '0.88rem' }}>
                  Déjà un compte ? Se connecter
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </div>
);

export default RegisterPage;
