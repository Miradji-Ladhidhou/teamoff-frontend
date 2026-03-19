import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaSignInAlt, FaCalendarCheck, FaUsersCog, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRoute } from '../../utils/navigation';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import AppFooter from '../../components/Layout/AppFooter';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const submitAction = useAsyncAction();
  const alert = useAlert();
  const [popupError, setPopupError] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [canCloseErrorPopup, setCanCloseErrorPopup] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!showErrorPopup) return undefined;

    setCanCloseErrorPopup(false);
    const timer = setTimeout(() => {
      setCanCloseErrorPopup(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showErrorPopup]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitAction.run(async () => {
      try {
        const result = await login(formData);
        if (result.success) {
          const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
          navigate(getDefaultRoute(savedUser?.role));
        } else {
          const message = result.error || 'Identifiant ou mot de passe incorrect';
          setPopupError(message);
          alert.error(message);
          setShowErrorPopup(true);
        }
      } catch (err) {
        const message = 'Une erreur inattendue s\'est produite';
        setPopupError(message);
        alert.error(message);
        setShowErrorPopup(true);
      }
    });
  };

  const loading = submitAction.isRunning;

  return (
    <div className="min-vh-100" style={{ background: 'radial-gradient(circle at top left, rgba(193, 124, 65, 0.22), transparent 28%), linear-gradient(180deg, #f5ede2 0%, #fffaf4 48%, #ffffff 100%)' }}>
      <Modal
        show={showErrorPopup}
        onHide={() => {
          if (canCloseErrorPopup) setShowErrorPopup(false);
        }}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header className="bg-danger text-white">
          <Modal.Title>Connexion refusee</Modal.Title>
        </Modal.Header>
        <Modal.Body className="fs-5">
          {popupError || 'Identifiant ou mot de passe incorrect'}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="danger"
            onClick={() => setShowErrorPopup(false)}
            disabled={!canCloseErrorPopup}
          >
            {canCloseErrorPopup ? 'Reessayer' : 'Veuillez lire le message...'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="py-4 py-lg-5">
        <Row className="align-items-center justify-content-between g-4 g-xl-5 py-lg-4">
          <Col lg={7}>
            <Badge bg="dark" className="rounded-pill px-3 py-2 mb-3">Plateforme RH pour équipes structurées</Badge>
            <h1 className="display-4 fw-bold mb-3" style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }}>
              La connexion devient votre page d'accueil utile.
            </h1>
            <p className="lead text-muted mb-4" style={{ maxWidth: '44rem' }}>
              Centralisez les demandes de conges, les validations par service, les quotas et le calendrier d'equipe dans une interface claire des la premiere visite.
            </p>

            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button as={Link} to="/register" variant="dark" size="lg">
                Creer un espace
                <FaArrowRight className="ms-2" />
              </Button>
              <Button as={Link} to="/contact" variant="outline-dark" size="lg">
                Parler a l'equipe
              </Button>
            </div>

            <Row className="g-3 mb-4">
              <Col sm={4}>
                <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.78)' }}>
                  <Card.Body>
                    <div className="text-muted small mb-1">Demandes suivies</div>
                    <div className="fs-2 fw-bold">24/7</div>
                    <div className="small text-muted">Vue centralisee des validations et historiques</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={4}>
                <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.78)' }}>
                  <Card.Body>
                    <div className="text-muted small mb-1">Workflow</div>
                    <div className="fs-2 fw-bold">Par service</div>
                    <div className="small text-muted">Manager, admin ou parcours multi-etapes</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col sm={4}>
                <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: 'rgba(255, 255, 255, 0.78)' }}>
                  <Card.Body>
                    <div className="text-muted small mb-1">Confiance</div>
                    <div className="fs-2 fw-bold">Audit</div>
                    <div className="small text-muted">Traçabilite des actions et controle d'acces</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={4}>
                <Card className="h-100 border-0 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)' }}>
                  <Card.Body>
                    <FaCalendarCheck className="mb-3" size={22} style={{ color: '#9a4f17' }} />
                    <h2 className="h5">Calendrier lisible</h2>
                    <p className="text-muted mb-0">Vision equipe, jours bloques, feries et calcul detaille des jours pris.</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="h-100 border-0 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)' }}>
                  <Card.Body>
                    <FaUsersCog className="mb-3" size={22} style={{ color: '#9a4f17' }} />
                    <h2 className="h5">Services gouvernes</h2>
                    <p className="text-muted mb-0">Regles de validation, quotas et parametres adaptes aux realites de chaque equipe.</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="h-100 border-0 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)' }}>
                  <Card.Body>
                    <FaShieldAlt className="mb-3" size={22} style={{ color: '#9a4f17' }} />
                    <h2 className="h5">Acces maitrises</h2>
                    <p className="text-muted mb-0">Permissions par role, journaux d'audit et exposition limitee des donnees sensibles.</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>

          <Col lg={5} xl={4}>
            <Card id="login-form" className="shadow-lg border-0 fade-in" style={{ borderRadius: '1.5rem', overflow: 'hidden' }}>
              <Card.Body className="p-3 p-sm-4 p-lg-4">
                <div className="mb-3 text-center text-lg-start">
                  <p className="text-uppercase small fw-semibold mb-2" style={{ color: '#9a4f17', letterSpacing: '0.08em' }}>Acces plateforme</p>
                  <h2 className="h3 fw-bold mb-1">Connexion</h2>
                  <p className="text-muted mb-0">Accedez a votre espace TeamOff.</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre.email@entreprise.com"
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Mot de passe</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Votre mot de passe"
                        required
                        disabled={loading}
                        className="pe-5"
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="position-absolute top-50 end-0 translate-middle-y text-muted border-0 bg-transparent p-2"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        style={{ zIndex: 5 }}
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
                    loadingText="Connexion en cours..."
                  >
                    {!loading && (
                      <>
                        <FaSignInAlt className="me-2" />
                        Se connecter
                      </>
                    )}
                  </AsyncButton>
                </Form>

                <div className="text-center mb-3">
                  <Link to="/forgot-password" className="text-decoration-none text-muted small">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <div className="rounded-4 p-3 mb-3" style={{ backgroundColor: '#f7efe5' }}>
                  <div className="small text-uppercase fw-semibold mb-2" style={{ color: '#9a4f17', letterSpacing: '0.08em' }}>Pourquoi TeamOff</div>
                  <div className="text-muted small">Validation adaptee a vos services, compteurs visibles, calendrier mobile et informations legales accessibles sans friction.</div>
                </div>

                <div className="text-center">
                  <p className="text-muted mb-1">Premiere connexion ?</p>
                  <Link to="/register" className="text-decoration-none fw-semibold" style={{ color: '#9a4f17' }}>
                    Creer un compte
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <AppFooter publicMode />
      </Container>
    </div>
  );
};

export default LoginPage;