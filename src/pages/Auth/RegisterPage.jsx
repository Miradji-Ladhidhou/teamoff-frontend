import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { FaBuilding, FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { InfoCardInfo, TipCard, SuccessCardInfo } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Étape 1: Informations entreprise
    entreprise_nom: '',
    entreprise_adresse: '',
    entreprise_telephone: '',
    entreprise_email: '',
    // Étape 2: Informations administrateur
    admin_prenom: '',
    admin_nom: '',
    admin_email: '',
    admin_password: '',
    admin_confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const submitAction = useAsyncAction();
  const alert = useAlert();
  const [validationErrors, setValidationErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer les erreurs de validation pour ce champ
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.entreprise_nom.trim()) errors.entreprise_nom = 'Le nom de l\'entreprise est requis';
    if (!formData.entreprise_email.trim()) errors.entreprise_email = 'L\'email de l\'entreprise est requis';
    else if (!/\S+@\S+\.\S+/.test(formData.entreprise_email)) errors.entreprise_email = 'Format d\'email invalide';
    if (!formData.entreprise_telephone.trim()) errors.entreprise_telephone = 'Le téléphone est requis';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.admin_prenom.trim()) errors.admin_prenom = 'Le prénom est requis';
    if (!formData.admin_nom.trim()) errors.admin_nom = 'Le nom est requis';
    if (!formData.admin_email.trim()) errors.admin_email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(formData.admin_email)) errors.admin_email = 'Format d\'email invalide';
    if (!formData.admin_password) errors.admin_password = 'Le mot de passe est requis';
    else if (formData.admin_password.length < 8) errors.admin_password = 'Le mot de passe doit contenir au moins 8 caractères';
    if (formData.admin_password !== formData.admin_confirm_password) {
      errors.admin_confirm_password = 'Les mots de passe ne correspondent pas';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handlePrev = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    await submitAction.run(async () => {
      try {
        const result = await register(formData);
        if (result.success) {
          alert.success('Inscription réussie. Un email de confirmation a été envoyé à l\'administrateur.');
          navigate('/login');
        } else {
          alert.error(result.error);
        }
      } catch (err) {
        // Affiche le message d'erreur du backend s'il existe
        const message = err.response?.data?.message || err.message || 'Une erreur inattendue s\'est produite';
        alert.error('Erreur d\'inscription : ' + message);
      }
    });
  };

  const progress = (step / 2) * 100;
  const loading = submitAction.isRunning;

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0 fade-in">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <h1 className="h3 fw-bold text-primary mb-2">TeamOff</h1>
                  <p className="text-muted">Créer un compte entreprise</p>
                  <ProgressBar now={progress} className="mb-3 progress-xs" />
                  <small className="text-muted">Étape {step} sur 2</small>
                </div>

                <InfoCardInfo title="Comment se déroule l'inscription">
                  <ol className="mb-0">
                    <li>Renseignez les informations de l'entreprise</li>
                    <li>Créez le compte administrateur principal</li>
                    <li>Connectez-vous puis ajoutez vos équipes</li>
                  </ol>
                </InfoCardInfo>

                <TipCard title="Préparez ces éléments avant de commencer">
                  Nom légal de l'entreprise, email de contact officiel et coordonnées de l'administrateur qui gérera les accès.
                </TipCard>

                <SuccessCardInfo title="Résultat attendu">
                  Une fois l'inscription validée, votre espace est prêt pour configurer les types de congés, les jours fériés et les utilisateurs.
                </SuccessCardInfo>

                <Form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}>
                  {step === 1 && (
                    <>
                      <h5 className="mb-4 text-center">
                        <FaBuilding className="me-2 text-primary" />
                        Informations de l'entreprise
                      </h5>

                      <Form.Group className="mb-3">
                        <Form.Label>Nom de l'entreprise *</Form.Label>
                        <Form.Control
                          type="text"
                          name="entreprise_nom"
                          value={formData.entreprise_nom}
                          onChange={handleChange}
                          placeholder="Ex: Mon Entreprise SARL"
                          isInvalid={!!validationErrors.entreprise_nom}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.entreprise_nom}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Adresse</Form.Label>
                        <Form.Control
                          type="text"
                          name="entreprise_adresse"
                          value={formData.entreprise_adresse}
                          onChange={handleChange}
                          placeholder="123 Rue de l'Entreprise, 75001 Paris"
                          disabled={loading}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Email de l'entreprise *</Form.Label>
                        <Form.Control
                          type="email"
                          name="entreprise_email"
                          value={formData.entreprise_email}
                          onChange={handleChange}
                          placeholder="contact@monentreprise.com"
                          isInvalid={!!validationErrors.entreprise_email}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.entreprise_email}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label>Téléphone *</Form.Label>
                        <Form.Control
                          type="tel"
                          name="entreprise_telephone"
                          value={formData.entreprise_telephone}
                          onChange={handleChange}
                          placeholder="01 23 45 67 89"
                          isInvalid={!!validationErrors.entreprise_telephone}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.entreprise_telephone}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-100"
                        onClick={handleNext}
                        disabled={loading}
                      >
                        Suivant
                      </Button>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h5 className="mb-4 text-center">
                        <FaUser className="me-2 text-primary" />
                        Informations de l'administrateur
                      </h5>

                      <Row>
                        <Col sm={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Prénom *</Form.Label>
                            <Form.Control
                              type="text"
                              name="admin_prenom"
                              value={formData.admin_prenom}
                              onChange={handleChange}
                              placeholder="Jean"
                              isInvalid={!!validationErrors.admin_prenom}
                              disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">
                              {validationErrors.admin_prenom}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col sm={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Nom *</Form.Label>
                            <Form.Control
                              type="text"
                              name="admin_nom"
                              value={formData.admin_nom}
                              onChange={handleChange}
                              placeholder="Dupont"
                              isInvalid={!!validationErrors.admin_nom}
                              disabled={loading}
                            />
                            <Form.Control.Feedback type="invalid">
                              {validationErrors.admin_nom}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="admin_email"
                          value={formData.admin_email}
                          onChange={handleChange}
                          placeholder="jean.dupont@monentreprise.com"
                          isInvalid={!!validationErrors.admin_email}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          {validationErrors.admin_email}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Mot de passe *</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="admin_password"
                            value={formData.admin_password}
                            onChange={handleChange}
                            placeholder="Minimum 8 caractères"
                            isInvalid={!!validationErrors.admin_password}
                            disabled={loading}
                          />
                          <Button
                            variant="link"
                            className="position-absolute top-50 end-0 translate-middle-y text-muted border-0 bg-transparent p-2"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {validationErrors.admin_password}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label>Confirmer le mot de passe *</Form.Label>
                        <div className="position-relative">
                          <Form.Control
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="admin_confirm_password"
                            value={formData.admin_confirm_password}
                            onChange={handleChange}
                            placeholder="Répétez le mot de passe"
                            isInvalid={!!validationErrors.admin_confirm_password}
                            disabled={loading}
                          />
                          <Button
                            variant="link"
                            className="position-absolute top-50 end-0 translate-middle-y text-muted border-0 bg-transparent p-2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            {validationErrors.admin_confirm_password}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>

                      <div className="d-flex gap-2 mb-3">
                        <Button
                          type="button"
                          variant="outline-secondary"
                          className="flex-fill"
                          onClick={handlePrev}
                          disabled={loading}
                        >
                          Précédent
                        </Button>
                        <AsyncButton
                          type="submit"
                          variant="primary"
                          className="flex-fill d-flex align-items-center justify-content-center"
                          action={submitAction}
                          loadingText="Création..."
                        >
                          Créer le compte
                        </AsyncButton>
                      </div>
                    </>
                  )}
                </Form>

                <div className="text-center mt-4">
                  <Link
                    to="/login"
                    className="text-primary text-decoration-none fw-semibold"
                  >
                    Déjà un compte ? Se connecter
                  </Link>
                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <small className="text-muted">
                © 2024 TeamOff - Gestion des congés d'entreprise
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;