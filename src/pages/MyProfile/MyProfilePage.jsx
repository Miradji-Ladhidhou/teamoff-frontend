import './my-profile.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { FaUser, FaSave, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const getRoleLabel = (role) => {
  const map = { super_admin: 'Super administrateur', admin_entreprise: 'Admin entreprise', manager: 'Manager', employe: 'Employé' };
  return map[role] || role;
};

const roleToAvatarColor = (role) => {
  const map = { super_admin: 'red', admin_entreprise: 'purple', manager: 'amber', employe: 'blue' };
  return map[role] || 'blue';
};

const MyProfilePage = () => {
  const { user } = useAuth();
  const profileAction = useAsyncAction();
  const passwordAction = useAsyncAction();
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState('');
  const alert = useAlert();

  const [profileData, setProfileData] = useState({ prenom: '', nom: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const isPasswordConfirmationFilled = passwordData.confirmPassword.trim().length > 0;
  const doPasswordsMatch = passwordData.newPassword === passwordData.confirmPassword;
  const isPasswordFormValid =
    passwordData.currentPassword.trim().length > 0
    && passwordData.newPassword.trim().length > 0
    && passwordData.confirmPassword.trim().length > 0
    && doPasswordsMatch;

  useEffect(() => {
    if (user?.id) {
      setProfileData({ prenom: user.prenom || '', nom: user.nom || '', email: user.email || '' });
    }
  }, [user]);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    await profileAction.run(async () => {
      setSuccess('');
      try {
        await authService.updateProfile({ nom: profileData.nom, prenom: profileData.prenom, email: profileData.email });
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const updatedUser = JSON.parse(savedUser);
          updatedUser.nom = profileData.nom;
          updatedUser.prenom = profileData.prenom;
          updatedUser.email = profileData.email;
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setSuccess('Profil mis à jour avec succès.');
      } catch (err) {
        console.error('Erreur lors de la mise à jour du profil:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de la mise à jour du profil.');
      }
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert.error('Tous les champs du mot de passe sont requis.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    await passwordAction.run(async () => {
      try {
        await authService.changePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess('Mot de passe modifié avec succès.');
      } catch (err) {
        console.error('Erreur lors du changement de mot de passe:', err);
        alert.error(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
      }
    });
  };

  const profileLoading = profileAction.isRunning;
  const passwordLoading = passwordAction.isRunning;

  const initials = `${(user?.prenom || '').charAt(0)}${(user?.nom || '').charAt(0)}`.toUpperCase() || '?';
  const avatarColor = roleToAvatarColor(user?.role);

  return (
    <Container className="py-3 profile-page">
      {/* Hero header centré */}
      <div style={{ background: 'var(--card, var(--dk-card))', borderRadius: 16, margin: '0 0 16px', padding: '24px 16px 20px', textAlign: 'center', border: '1px solid var(--border, var(--dk-border))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
        <div
          className={`avatar avatar-lg ${avatarColor}`}
          style={{ width: 64, height: 64, fontSize: 22, margin: '0 auto 10px' }}
        >
          {initials}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text, var(--dk-text))', letterSpacing: '-0.02em' }}>
          {user?.prenom} {user?.nom}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, var(--dk-text-muted))', marginTop: 4 }}>
          {getRoleLabel(user?.role)}
        </div>
      </div>

      <Row>
        {/* Sidebar */}
        <Col md={3} className="mb-4 profile-sidebar-col">
          <Card className="mb-3">
            <Card.Body className="p-2">
              <div className="d-flex flex-column gap-1">
                <button
                  className={`btn btn-sm text-start d-flex align-items-center gap-2${activeTab === 'profile' ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FaUser size={12} /> Informations
                </button>
                <button
                  className={`btn btn-sm text-start d-flex align-items-center gap-2${activeTab === 'password' ? ' btn-primary' : ' btn-outline-secondary'}`}
                  onClick={() => setActiveTab('password')}
                >
                  <FaLock size={12} /> Sécurité
                </button>
              </div>
            </Card.Body>
          </Card>

          {/* Compte info — info-rows */}
          {user && (
            <Card>
              <Card.Body className="p-0">
                <div className="info-rows">
                  <div className="info-row">
                    <span className="info-label">Nom complet</span>
                    <span className="info-value">{user.prenom} {user.nom}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value" style={{ fontSize: 9, wordBreak: 'break-all' }}>{user.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Rôle</span>
                    <span className="badge info">{user.role}</span>
                  </div>
                  {user.entreprise_nom && (
                    <div className="info-row">
                      <span className="info-label">Entreprise</span>
                      <span className="info-value">{user.entreprise_nom}</span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Contenu principal */}
        <Col md={9}>
          {activeTab === 'profile' && (
            <Card>
              <Card.Header>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}><FaUser className="me-2" />Informations générales</span>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleProfileSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prénom</Form.Label>
                    <Form.Control type="text" name="prenom" value={profileData.prenom} onChange={handleProfileChange} placeholder="Votre prénom" disabled={profileLoading} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom</Form.Label>
                    <Form.Control type="text" name="nom" value={profileData.nom} onChange={handleProfileChange} placeholder="Votre nom" disabled={profileLoading} />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" name="email" value={profileData.email} onChange={handleProfileChange} placeholder="Votre email" disabled={profileLoading} />
                  </Form.Group>
                  <AsyncButton variant="primary" type="submit" className="w-100" action={profileAction} loadingText="Sauvegarde...">
                    <FaSave className="me-2" /> Enregistrer
                  </AsyncButton>
                </Form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card>
              <Card.Header>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}><FaLock className="me-2" />Changer le mot de passe</span>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handlePasswordSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mot de passe actuel</Form.Label>
                    <div className="input-group">
                      <Form.Control type={showPasswords.current ? 'text' : 'password'} name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Mot de passe actuel" disabled={passwordLoading} />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))} disabled={passwordLoading}>
                        {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Nouveau mot de passe</Form.Label>
                    <div className="input-group">
                      <Form.Control type={showPasswords.new ? 'text' : 'password'} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Nouveau mot de passe" disabled={passwordLoading} />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} disabled={passwordLoading}>
                        {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Confirmer le mot de passe</Form.Label>
                    <div className="input-group">
                      <Form.Control
                        type={showPasswords.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirmer"
                        disabled={passwordLoading}
                        isInvalid={isPasswordConfirmationFilled && !doPasswordsMatch}
                        isValid={isPasswordConfirmationFilled && doPasswordsMatch}
                      />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} disabled={passwordLoading}>
                        {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                    {isPasswordConfirmationFilled && !doPasswordsMatch && (
                      <Form.Text className="text-danger fw-semibold">Les nouveaux mots de passe ne correspondent pas.</Form.Text>
                    )}
                    {isPasswordConfirmationFilled && doPasswordsMatch && (
                      <Form.Text className="text-success fw-semibold">Les nouveaux mots de passe correspondent.</Form.Text>
                    )}
                  </Form.Group>
                  <AsyncButton
                    variant="danger"
                    type="submit"
                    disabled={!isPasswordFormValid}
                    className="w-100"
                    action={passwordAction}
                    loadingText="Changement..."
                  >
                    <FaLock className="me-2" /> Changer le mot de passe
                  </AsyncButton>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MyProfilePage;
