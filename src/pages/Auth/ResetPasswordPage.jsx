import React, { useState, useContext } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { FaLock, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { NotificationContext } from '../../contexts/NotificationContext';
import { useAlert } from '../../hooks/useAlert';
import AppFooter from '../../components/Layout/AppFooter';
import { authService } from '../../services/api';

const ResetPasswordPage = () => {
  const { token: tokenFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const token = tokenFromQuery || tokenFromPath || '';
  const navigate = useNavigate();
  const { showNotification } = useContext(NotificationContext);

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const alert = useAlert();

  if (!token) {
    return (
      <div
        className="min-vh-100"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(193, 124, 65, 0.22), transparent 28%), linear-gradient(180deg, #f5ede2 0%, #fffaf4 48%, #ffffff 100%)',
        }}
      >
        <Container className="py-5">
          <Row>
            <Col lg={6} className="mx-auto">
              <Card className="shadow-sm">
                <Card.Body className="p-5 text-center">
                  <Alert variant="danger" className="floating-error-alert">
                    <strong>Lien invalide</strong>
                    <br />
                    Le lien de réinitialisation est introuvable ou a expiré.
                  </Alert>
                  <Link to="/login" className="btn btn-primary">
                    <FaArrowLeft className="me-2" />
                    Retour à la connexion
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
        <AppFooter />
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const doPasswordsMatch = formData.newPassword && formData.confirmPassword === formData.newPassword;
  const isPasswordFormValid =
    formData.newPassword.trim().length >= 8 &&
    formData.confirmPassword.trim().length > 0 &&
    doPasswordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isPasswordFormValid) {
        alert.error('Les mots de passe ne correspondent pas ou ne respectent pas les exigences');
        setLoading(false);
        return;
      }

      await authService.resetPassword({
        token,
        newPassword: formData.newPassword,
      });

      setSubmitted(true);
      showNotification('Mot de passe réinitialisé avec succès', 'success');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de la réinitialisation';
      alert.error(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(193, 124, 65, 0.22), transparent 28%), linear-gradient(180deg, #f5ede2 0%, #fffaf4 48%, #ffffff 100%)',
      }}
    >
      <Container className="py-4 py-lg-5">
        <Row className="align-items-center justify-content-between g-4 g-xl-5 py-lg-4">
          <Col lg={7}>
            <Badge bg="dark" className="rounded-pill px-3 py-2 mb-3">
              Réinitialisez votre accès
            </Badge>
            <h1 className="display-4 fw-bold mb-3" style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }}>
              Créez un nouveau mot de passe
            </h1>
            <p className="lead mb-4 text-muted">
              Choisissez un mot de passe fort et sécurisé pour protéger votre compte.
            </p>
            <div className="d-flex flex-column gap-2">
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', minWidth: '48px' }}
                >
                  <FaLock className="text-primary" size={20} />
                </div>
                <div>
                  <h5 className="mb-2">Sécurité renforcée</h5>
                  <p className="text-muted mb-0">Minimum 8 caractères avec lettres, chiffres et caractères spéciaux.</p>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px', minWidth: '48px' }}
                >
                  <FaCheck className="text-primary" size={20} />
                </div>
                <div>
                  <h5 className="mb-2">Accès immédiat</h5>
                  <p className="text-muted mb-0">Une fois confirmé, vous pourrez vous connecter immédiatement.</p>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={5}>
            <Card
              className="shadow-sm"
              style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}
            >
              <Card.Body className="p-4">
                {!submitted ? (
                  <>
                    <h4 className="fw-bold text-center mb-4">Réinitialiser le mot de passe</h4>

                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-500 mb-2">Nouveau mot de passe</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Minimum 8 caractères"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            disabled={loading}
                            isInvalid={formData.newPassword && formData.newPassword.length < 8}
                            className="py-2"
                          />
                          <Button
                            variant="link"
                            onClick={() => setShowPassword(!showPassword)}
                            className="position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted"
                            style={{ border: 'none' }}
                          >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                          </Button>
                        </div>
                        {formData.newPassword && formData.newPassword.length < 8 && (
                          <Form.Text className="text-danger">Minimum 8 caractères requis</Form.Text>
                        )}
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label className="fw-500 mb-2">Confirmer le mot de passe</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirmez votre mot de passe"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            isValid={formData.confirmPassword && doPasswordsMatch}
                            isInvalid={formData.confirmPassword && !doPasswordsMatch}
                            className="py-2"
                          />
                          <Button
                            variant="link"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="position-absolute end-0 top-50 translate-middle-y text-decoration-none text-muted"
                            style={{ border: 'none' }}
                          >
                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                          </Button>
                        </div>
                        {formData.confirmPassword && !doPasswordsMatch && (
                          <Form.Text className="text-danger">Les mots de passe ne correspondent pas</Form.Text>
                        )}
                        {formData.confirmPassword && doPasswordsMatch && (
                          <Form.Text className="text-success">Les mots de passe correspondent</Form.Text>
                        )}
                      </Form.Group>

                      <Button
                        variant="primary"
                        type="submit"
                        disabled={loading || !isPasswordFormValid}
                        className="w-100 py-2 fw-500 mb-3"
                      >
                        {loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Réinitialisation...
                          </>
                        ) : (
                          <>
                            <FaLock className="me-2" />
                            Réinitialiser le mot de passe
                          </>
                        )}
                      </Button>
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
                      className="mx-auto mb-4 bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <FaCheck size={40} className="text-success" />
                    </div>
                    <h5 className="fw-bold mb-2">Mot de passe réinitialisé</h5>
                    <p className="text-muted mb-4">
                      Votre mot de passe a été modifié avec succès. Vous serez redirigé vers la page de connexion.
                    </p>
                    <Spinner animation="border" size="sm" className="text-primary" />
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

export default ResetPasswordPage;
