import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import { FaEnvelope, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import AppFooter from '../../components/Layout/AppFooter';
import { authService } from '../../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const submitAction = useAsyncAction();
  const [submitted, setSubmitted] = useState(false);
  const alert = useAlert();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitAction.run(async () => {
      try {
        if (!email.trim()) {
          alert.error('Veuillez entrer une adresse email');
          return;
        }

        await authService.forgotPassword({ email: email.trim() });
        setSubmitted(true);
        alert.success('Un email de réinitialisation a été envoyé');
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de l\'envoi';
        alert.error(errorMsg);
      }
    });
  };

  const loading = submitAction.isRunning;

  return (
    <div
      className="min-vh-100 auth-bg"
    >
      <Container className="py-4 py-lg-5">
        <Row className="align-items-center justify-content-between g-4 g-xl-5 py-lg-4">
          <Col lg={7}>
            <Badge bg="dark" className="rounded-pill px-3 py-2 mb-3">
              Récupérez l'accès à votre compte
            </Badge>
            <h1 className="fw-bold mb-3 auth-hero-title">
              Mot de passe oublié ?
            </h1>
            <p className="lead mb-4 text-muted">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
            <div className="d-flex flex-column gap-2">
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0 auth-icon-sm"
                >
                  <FaEnvelope className="text-primary" size={20} />
                </div>
                <div>
                  <h5 className="mb-2">Accès rapide</h5>
                  <p className="text-muted mb-0">Un email de réinitialisation vous sera envoyé instantanément.</p>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0 auth-icon-sm"
                >
                  <FaCheck className="text-primary" size={20} />
                </div>
                <div>
                  <h5 className="mb-2">Sécurisé</h5>
                  <p className="text-muted mb-0">Seul le titulaire de ce compte pourra réinitialiser le mot de passe.</p>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={5}>
            <Card
              className="shadow-sm auth-step-card"
            >
              <Card.Body className="p-4">
                {!submitted ? (
                  <>
                    <h4 className="fw-bold text-center mb-4">Réinitialiser votre mot de passe</h4>

                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-500 mb-2">Adresse email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="vous@example.com"
                          value={email}
                          onChange={handleChange}
                          disabled={loading}
                          className="py-2"
                        />
                      </Form.Group>

                      <AsyncButton
                        variant="primary"
                        type="submit"
                        disabled={!email.trim()}
                        className="w-100 py-2 fw-500 mb-3"
                        action={submitAction}
                        loadingText="Envoi..."
                      >
                        {!loading && (
                          <>
                            <FaEnvelope className="me-2" />
                            Envoyer le lien de réinitialisation
                          </>
                        )}
                      </AsyncButton>
                    </Form>

                    <div className="text-center">
                      <Link to="/login" className="text-decoration-none d-inline-flex align-items-center gap-2">
                        <FaArrowLeft size={14} />
                        Retour à la connexion
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div
                      className="mx-auto mb-4 bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center auth-icon-lg"
                    >
                      <FaCheck size={40} className="text-success" />
                    </div>
                    <h5 className="fw-bold mb-2">Email envoyé avec succès</h5>
                    <p className="text-muted mb-4">
                      Vérifiez votre boîte de réception. Vous recevrez bientôt un email avec un lien pour réinitialiser votre mot de passe.
                    </p>
                    <p className="text-muted small mb-4">
                      (Le lien expire dans 1 heure)
                    </p>
                    <Button
                      variant="outline-primary"
                      onClick={() => navigate('/login')}
                      className="w-100"
                    >
                      Retour à la connexion
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <AppFooter />
    </div>
  );
};

export default ForgotPasswordPage;
