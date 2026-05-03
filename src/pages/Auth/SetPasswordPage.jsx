import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import { authService } from '../../services/api';

const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

const SetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const submitAction = useAsyncAction();

  const validate = () => {
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (!SPECIAL_CHAR_RE.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.';
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');

    submitAction.execute(async () => {
      await authService.setPassword({ token, password, confirmPassword });
      navigate('/login', {
        state: { successMessage: 'Mot de passe défini avec succès. Vous pouvez vous connecter.' },
      });
    });
  };

  if (!token) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          Lien invalide. Contactez votre administrateur pour obtenir un nouveau lien d'invitation.
        </Alert>
      </Container>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center auth-bg-simple">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={6} lg={5}>
            <div className="text-center mb-4">
              <h1 className="fw-bold fs-3">TeamOff</h1>
              <p className="text-muted small">Gestion des congés et absences</p>
            </div>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                       style={{ width: 56, height: 56 }}>
                    <FaLock className="text-primary fs-5" />
                  </div>
                  <h2 className="h5 fw-bold mb-1">Définir votre mot de passe</h2>
                  <p className="text-muted small">Choisissez un mot de passe pour activer votre compte.</p>
                </div>

                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                {submitAction.error && (
                  <Alert variant="danger" className="py-2 small">
                    {submitAction.error?.response?.data?.message || 'Lien invalide ou expiré.'}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Nouveau mot de passe</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        required
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <Form.Text className="text-muted">Minimum 8 caractères avec au moins un caractère spécial.</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-semibold">Confirmer le mot de passe</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez votre mot de passe"
                      required
                    />
                  </Form.Group>

                  <AsyncButton
                    type="submit"
                    variant="primary"
                    className="w-100"
                    loading={submitAction.loading}
                  >
                    Activer mon compte
                  </AsyncButton>
                </Form>

                <div className="text-center mt-3">
                  <Link to="/login" className="text-muted small">Retour à la connexion</Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SetPasswordPage;
