import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, ProgressBar } from 'react-bootstrap';
import { FaBuilding, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import './register.css';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    entreprise_nom: '',
    entreprise_email: '',
    entreprise_telephone: '',
    admin_prenom: '',
    admin_nom: '',
    admin_email: '',
    admin_password: '',
    admin_confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const submitAction = useAsyncAction();
  const alert = useAlert();
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.entreprise_nom.trim()) errors.entreprise_nom = 'Nom requis';
    if (!formData.entreprise_email.trim()) errors.entreprise_email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(formData.entreprise_email)) errors.entreprise_email = 'Email invalide';
    if (!formData.entreprise_telephone.trim()) errors.entreprise_telephone = 'Téléphone requis';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.admin_prenom.trim()) errors.admin_prenom = 'Prénom requis';
    if (!formData.admin_nom.trim()) errors.admin_nom = 'Nom requis';
    if (!formData.admin_email.trim()) errors.admin_email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(formData.admin_email)) errors.admin_email = 'Email invalide';
    if (!formData.admin_password) errors.admin_password = 'Mot de passe requis';
    else if (formData.admin_password.length < 8) errors.admin_password = 'Min 8 caractères';
    if (formData.admin_password !== formData.admin_confirm_password)
      errors.admin_confirm_password = 'Les mots de passe ne correspondent pas';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };
  const handlePrev = () => setStep(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    await submitAction.run(async () => {
      try {
        const result = await register(formData);
        if (result.success) {
          alert.success('Inscription réussie ! Email envoyé.');
          navigate('/login');
        } else alert.error(result.error);
      } catch (err) {
        alert.error(err.message || 'Erreur inattendue');
      }
    });
  };

  const progress = (step / 2) * 100;
  const loading = submitAction.isRunning;

  return (
    <div className="min-vh-100 register-bg d-flex align-items-center justify-content-center py-4">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="shadow-lg dark-card">
              <Card.Body className="p-4">
                <div className="text-center mb-3">
                  <h1 className="h3 text-white mb-2">TeamOff</h1>
                  <small className="text-muted">Créer un compte entreprise</small>
                  <ProgressBar now={progress} className="mt-2 mb-2 progress-xs" />
                  <small className="text-muted">Étape {step} sur 2</small>
                </div>

                <Form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}>
                  {step === 1 && (
                    <>
                      <h5 className="text-white mb-3"><FaBuilding className="me-2" />Entreprise</h5>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Nom de l'entreprise"
                          name="entreprise_nom"
                          value={formData.entreprise_nom}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.entreprise_nom}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.entreprise_nom}</Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="email"
                          placeholder="Email"
                          name="entreprise_email"
                          value={formData.entreprise_email}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.entreprise_email}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.entreprise_email}</Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="tel"
                          placeholder="Téléphone"
                          name="entreprise_telephone"
                          value={formData.entreprise_telephone}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.entreprise_telephone}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.entreprise_telephone}</Form.Control.Feedback>
                      </Form.Group>
                      <Button type="button" variant="primary" className="w-100" onClick={handleNext} disabled={loading}>Suivant</Button>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h5 className="text-white mb-3"><FaUser className="me-2" />Administrateur</h5>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Prénom"
                          name="admin_prenom"
                          value={formData.admin_prenom}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.admin_prenom}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.admin_prenom}</Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Nom"
                          name="admin_nom"
                          value={formData.admin_nom}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.admin_nom}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.admin_nom}</Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Control
                          type="email"
                          placeholder="Email"
                          name="admin_email"
                          value={formData.admin_email}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.admin_email}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Form.Control.Feedback type="invalid">{validationErrors.admin_email}</Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3 position-relative">
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mot de passe"
                          name="admin_password"
                          value={formData.admin_password}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.admin_password}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Button variant="link" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                        <Form.Control.Feedback type="invalid">{validationErrors.admin_password}</Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3 position-relative">
                        <Form.Control
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirmer mot de passe"
                          name="admin_confirm_password"
                          value={formData.admin_confirm_password}
                          onChange={handleChange}
                          isInvalid={!!validationErrors.admin_confirm_password}
                          disabled={loading}
                          className="dark-input"
                        />
                        <Button variant="link" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                        <Form.Control.Feedback type="invalid">{validationErrors.admin_confirm_password}</Form.Control.Feedback>
                      </Form.Group>

                      <div className="d-flex gap-2 mb-3">
                        <Button variant="outline-secondary" className="flex-fill" onClick={handlePrev} disabled={loading}>Précédent</Button>
                        <AsyncButton type="submit" variant="primary" className="flex-fill" action={submitAction} loadingText="Création...">
                          Créer le compte
                        </AsyncButton>
                      </div>
                    </>
                  )}
                </Form>

                <div className="text-center mt-3">
                  <Link to="/login" className="text-info">Déjà un compte ? Se connecter</Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;