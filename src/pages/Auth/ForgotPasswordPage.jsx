import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { FaEnvelope, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import AppFooter from '../../components/Layout/AppFooter';
import { authService } from '../../services/api';

import './forgot-password.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const submitAction = useAsyncAction();
  const [submitted, setSubmitted] = useState(false);
  const alert = useAlert();
  const navigate = useNavigate();

  const handleChange = (e) => setEmail(e.target.value);

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
    <div className="min-vh-100 forgot-bg d-flex flex-column justify-content-center">
      <Container>
        <Row className="align-items-center justify-content-between g-4">
          {/* Description / illustration */}
          <Col xs={12} lg={7} className="mb-4 mb-lg-0 text-white">
            <h1 className="fw-bold mb-3">Mot de passe oublié</h1>
            <p className="lead mb-4 text-light">
              Entrez votre adresse email pour recevoir un lien de réinitialisation.
            </p>
            <h5 className="fw-bold mb-3">Rapide</h5>
            <p className="lead mb-4 text-light">Lien de réinitialisation envoyé instantanément.</p>
            <h5 className="fw-bold mb-3">Sécurisé</h5>
            <p className="lead mb-4 text-light">Seul le titulaire du compte pourra réinitialiser le mot de passe.</p>
          </Col>

          {/* Formulaire */}
          <Col xs={12} lg={5}>
            <Card className="shadow-lg dark-card">
              <Card.Body className="p-4">
                {!submitted ? (
                  <>
                    <h4 className="fw-bold text-center mb-4 text-white">Réinitialiser votre mot de passe</h4>
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-4">
                        <Form.Label className="text-light mb-2">Adresse email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="vous@example.com"
                          value={email}
                          onChange={handleChange}
                          disabled={loading}
                          className="dark-input py-2"
                        />
                      </Form.Group>

                      <AsyncButton
                        variant="dark"
                        type="submit"
                        disabled={!email.trim()}
                        className="w-100 py-2 mb-3"
                        action={submitAction}
                        loadingText="Envoi..."
                      >
                        {!loading && <><FaEnvelope className="me-2" />Envoyer le lien</>}
                      </AsyncButton>
                    </Form>
                    <div className="text-center mt-2">
                      <Link to="/login" className="text-info d-inline-flex align-items-center gap-2">
                        <FaArrowLeft size={14} />
                        Retour à la connexion
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 icon-success">
                      <FaCheck size={40} className="text-success" />
                    </div>
                    <h5 className="fw-bold mb-2 text-white">Email envoyé avec succès</h5>
                    <p className="text-light mb-4 small">
                      Vérifiez votre boîte de réception. Le lien expire dans 1 heure.
                    </p>
                    <Button
                      variant="outline-light"
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
    </div>
  );
};

export default ForgotPasswordPage;