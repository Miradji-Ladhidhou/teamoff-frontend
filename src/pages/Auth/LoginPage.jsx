import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Alert } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaSignInAlt, FaCalendarCheck, FaUsersCog, FaShieldAlt, FaChartBar } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRoute } from '../../utils/navigation';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';
import AppFooter from '../../components/Layout/AppFooter';
import { authService } from '../../services/api';

import './login.css';

const FEATURES = [
  { icon: FaCalendarCheck, label: 'Congés & absences', desc: 'Demandes, validations et notifications en temps réel.' },
  { icon: FaUsersCog,      label: 'Workflow d\'approbation', desc: 'Validation par le manager puis l\'administrateur.' },
  { icon: FaChartBar,      label: 'Tableaux de bord', desc: 'Quotas, historique, statistiques et exports CSV.' },
  { icon: FaShieldAlt,     label: 'Sécurité & accès', desc: 'Logs d\'activité et gestion des rôles par profil.' },
];

const STATS = [
  { value: '100%', label: 'Cloud & mobile' },
  { value: '4 rôles', label: 'Gestion des accès' },
  { value: '< 1min', label: 'Prise en main' },
];

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
    <div className="landing-root">

      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <span className="landing-nav__brand">TeamOff</span>
        <div className="landing-nav__links">
          <Link to="/contact" className="landing-nav__link">Contact</Link>
          <Link to="/register" className="landing-nav__cta">Créer un compte</Link>
        </div>
      </nav>

      <div className="landing-container">
        <div className="landing-hero-row">

          {/* ── FORMULAIRE (priorité mobile) ── */}
          <div className="landing-col-form">
            <div className="landing-form-card">
              <div className="landing-form-card__header">
                <h2 className="landing-form-card__title">Connexion</h2>
                <p className="landing-form-card__sub">Accédez à votre espace TeamOff</p>
              </div>

              {successMessage && (
                <Alert variant="success" className="py-2 small mb-3">{successMessage}</Alert>
              )}

              {twoFAState.required ? (
                <div>
                  <p className="text-light small mb-3">Entrez le code de votre application d'authentification.</p>
                  <Form.Group className="mb-3">
                    <Form.Label className="landing-label">Code 2FA</Form.Label>
                    <Form.Control
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFAState.code}
                      onChange={(e) => setTwoFAState(s => ({ ...s, code: e.target.value }))}
                      className="landing-input"
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
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="landing-label">Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@entreprise.com"
                      required
                      disabled={loading}
                      className="landing-input"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="landing-label mb-0">Mot de passe</Form.Label>
                      <Link to="/forgot-password" className="landing-link-small">Mot de passe oublié ?</Link>
                    </div>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="landing-input pe-5"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="password-toggle"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </Form.Group>

                  <AsyncButton
                    type="submit"
                    className="landing-btn-primary w-100 mb-4"
                    action={submitAction}
                    loadingText="Connexion..."
                  >
                    {!loading && <><FaSignInAlt className="me-2" />Se connecter</>}
                  </AsyncButton>

                  <p className="landing-form-card__footer-text">
                    Pas encore de compte ?{' '}
                    <Link to="/register" className="landing-link">Créer un compte</Link>
                  </p>
                </Form>
              )}
            </div>
          </div>

          {/* ── HERO ── */}
          <div className="landing-col-hero">
            <div className="landing-badge">Gestion des congés simplifiée</div>

            <h1 className="landing-hero__title">
              Gérez vos congés<br />
              <span className="landing-hero__accent">sans friction.</span>
            </h1>

            <p className="landing-hero__desc">
              TeamOff centralise les demandes de congés, les absences et les validations
              pour toute votre équipe — depuis une interface claire et moderne.
            </p>

            {/* Stats */}
            <div className="landing-stats">
              {STATS.map((s) => (
                <div key={s.label} className="landing-stats__item">
                  <span className="landing-stats__value">{s.value}</span>
                  <span className="landing-stats__label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="landing-features">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="landing-feature">
                  <div className="landing-feature__icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="landing-feature__label">{label}</div>
                    <div className="landing-feature__desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <AppFooter publicMode />
    </div>
  );
};

export default LoginPage;
