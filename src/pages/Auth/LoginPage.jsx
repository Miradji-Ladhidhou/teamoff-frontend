import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaSignInAlt, FaCalendarCheck, FaUsersCog, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRoute } from '../../utils/navigation';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import AppFooter from '../../components/Layout/AppFooter';
import { authService } from '../../services/api';

import './login.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [twoFAState, setTwoFAState] = useState({ required: false, pendingToken: '', code: '' });
  const submitAction = useAsyncAction();
  const alert = useAlert();
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage || null;

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitAction.run(async () => {
      try {
        const result = await login(formData);
        if (result.requires2fa === true) {
          setTwoFAState({ required: true, pendingToken: result.pending_token, code: '' });
          return;
        }
        if (result.success) {
          const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
          navigate(getDefaultRoute(savedUser?.role));
        } else {
          alert.showErrorModal(result.error || 'Identifiant ou mot de passe incorrect', {
            title: 'Connexion refusée', confirmLabel: 'Réessayer', autoCloseMs: 0
          });
        }
      } catch {
        alert.showErrorModal('Une erreur inattendue s\'est produite', {
          title: 'Erreur de connexion', confirmLabel: 'Fermer', autoCloseMs: 0
        });
      }
    });
  };

  const handle2FASubmit = async () => {
    await submitAction.run(async () => {
      try {
        const res = await authService.verify2FA({ pending_token: twoFAState.pendingToken, code: twoFAState.code });
        const { token, utilisateur: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = getDefaultRoute(userData.role);
      } catch (err) {
        alert.showErrorModal(err.response?.data?.message || 'Code invalide ou expiré', {
          title: 'Vérification 2FA échouée', confirmLabel: 'Réessayer', autoCloseMs: 0
        });
      }
    });
  };

  if (isAuthenticated && user) {
    navigate(getDefaultRoute(user.role));
    return null;
  }

  const loading = submitAction.isRunning;

  return (
    <div className="min-vh-100 login-landing-bg d-flex flex-column justify-content-center">
      <Container>
        <Row className="align-items-center justify-content-between g-4">

          {/* Hero + Features */}
          <Col xs={12} lg={7} className="mb-4 mb-lg-0">
            <h1 className="text-white fw-bold mb-3">TeamOff</h1>
            <p className="text-light lead mb-4">Gérez vos congés, quotas et équipes depuis une interface claire et moderne.</p>

            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button as={Link} to="/register" className="btn-dark btn-lg">Créer un compte</Button>
              <Button as={Link} to="/contact" className="btn-outline-light btn-lg">Contact</Button>
            </div>

            <Row className="g-3 mt-2">
              <Col xs={12} md={4}>
                <Card className="feature-card dark-card">
                  <FaCalendarCheck size={28} className="mb-2 text-info" />
                  <h5 className="text-white">Calendrier</h5>
                  <p className="text-light small">Suivi équipe et jours bloqués.</p>
                </Card>
              </Col>
              <Col xs={12} md={4}>
                <Card className="feature-card dark-card">
                  <FaUsersCog size={28} className="mb-2 text-info" />
                  <h5 className="text-white">Workflow</h5>
                  <p className="text-light small">Validations par service et quotas.</p>
                </Card>
              </Col>
              <Col xs={12} md={4}>
                <Card className="feature-card dark-card">
                  <FaShieldAlt size={28} className="mb-2 text-info" />
                  <h5 className="text-white">Sécurité</h5>
                  <p className="text-light small">Permissions et audit accessibles.</p>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Formulaire Login */}
          <Col xs={12} lg={5} xl={4}>
            <Card className="shadow-lg border-0 dark-card">
              <Card.Body className="p-4">
                <h3 className="text-white mb-4 text-center">Connexion</h3>
                {successMessage && (
                  <Alert variant="success" className="py-2 small">{successMessage}</Alert>
                )}
                {twoFAState.required ? (
                  <div>
                    <p className="text-light small mb-3">Entrez le code de votre application d'authentification.</p>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light">Code 2FA</Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={twoFAState.code}
                        onChange={(e) => setTwoFAState(s => ({ ...s, code: e.target.value }))}
                        style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.4rem' }}
                      />
                    </Form.Group>
                    <AsyncButton variant="primary" className="w-100" onClick={handle2FASubmit} action={submitAction} loadingText="Vérification...">
                      Vérifier
                    </AsyncButton>
                    <Button variant="link" className="text-muted w-100 mt-2" size="sm" onClick={() => setTwoFAState({ required: false, pendingToken: '', code: '' })}>
                      Retour
                    </Button>
                  </div>
                ) : (
                  <>
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label className="text-light">Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@entreprise.com"
                          required
                          disabled={loading}
                          className="dark-input"
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="text-light">Mot de passe</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Mot de passe"
                            required
                            disabled={loading}
                            className="dark-input pe-5"
                          />
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                            className="position-absolute top-50 end-0 translate-middle-y text-muted border-0 bg-transparent p-2"
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </div>
                      </Form.Group>

                      <AsyncButton
                        type="submit"
                        variant="dark"
                        className="w-100 mb-3 d-flex align-items-center justify-content-center"
                        action={submitAction}
                        loadingText="Connexion..."
                      >
                        {!loading && <><FaSignInAlt className="me-2" />Se connecter</>}
                      </AsyncButton>
                    </Form>

                    <div className="text-center mt-2">
                      <Link to="/forgot-password" className="text-secondary small text-decoration-none">Mot de passe oublié ?</Link>
                    </div>

                    <div className="text-center mt-3">
                      <p className="text-light mb-1">Première connexion ?</p>
                      <Link to="/register" className="text-info fw-semibold text-decoration-none">Créer un compte</Link>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

        </Row>
      </Container>
      <AppFooter publicMode />
    </div>
  );
};

export default LoginPage;