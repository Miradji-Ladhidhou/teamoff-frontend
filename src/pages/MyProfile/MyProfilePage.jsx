import './my-profile.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import { FaUser, FaSave, FaLock, FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';
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
  const { user, updateUser } = useAuth();
  const profileAction = useAsyncAction();
  const passwordAction = useAsyncAction();
  const twoFAAction = useAsyncAction();
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState('');
  const alert = useAlert();

  const [profileData, setProfileData] = useState({ prenom: '', nom: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState(null); // { qrCode, secret }
  const [twoFACode, setTwoFACode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

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
        updateUser({ nom: profileData.nom, prenom: profileData.prenom, email: profileData.email });
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
        <Col xs={12} md={3} className="mb-4 profile-sidebar-col">
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
                {user?.role === 'admin_entreprise' && (
                  <button
                    className={`btn btn-sm text-start d-flex align-items-center gap-2${activeTab === '2fa' ? ' btn-primary' : ' btn-outline-secondary'}`}
                    onClick={() => setActiveTab('2fa')}
                  >
                    <FaShieldAlt size={12} /> Double authentification
                  </button>
                )}
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
        <Col xs={12} md={9}>
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

          {activeTab === '2fa' && user?.role === 'admin_entreprise' && (
            <Card>
              <Card.Header className="d-flex align-items-center justify-content-between">
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}><FaShieldAlt className="me-2" />Double authentification (2FA)</span>
                {twoFAEnabled
                  ? <Badge bg="success">Activé</Badge>
                  : <Badge bg="secondary">Désactivé</Badge>}
              </Card.Header>
              <Card.Body>
                {!twoFAEnabled && !twoFASetup && (
                  <div>
                    <p className="text-muted small mb-3">
                      Renforcez la sécurité de votre compte en activant l'authentification à deux facteurs via une application comme Google Authenticator ou Authy.
                    </p>
                    <AsyncButton
                      variant="outline-primary"
                      action={twoFAAction}
                      loadingText="Chargement..."
                      onClick={async () => {
                        await twoFAAction.run(async () => {
                          try {
                            const res = await authService.setup2FA();
                            setTwoFASetup(res.data);
                          } catch (err) {
                            alert.error(err.response?.data?.message || 'Erreur lors de la configuration du 2FA');
                          }
                        });
                      }}
                    >
                      Configurer le 2FA
                    </AsyncButton>
                  </div>
                )}
                {!twoFAEnabled && twoFASetup && (
                  <div>
                    <p className="text-muted small mb-2">Scannez ce QR code avec votre application d'authentification :</p>
                    <div className="text-center mb-3">
                      <img src={twoFASetup.qrCode} alt="QR Code 2FA" style={{ maxWidth: 200, border: '1px solid var(--border)', borderRadius: 8 }} />
                    </div>
                    <p className="text-muted small mb-1">Ou entrez manuellement la clé secrète :</p>
                    <code className="d-block text-center mb-3" style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{twoFASetup.secret}</code>
                    <Form.Group className="mb-3">
                      <Form.Label>Code de vérification</Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value)}
                        style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
                      />
                    </Form.Group>
                    <div className="d-flex gap-2">
                      <AsyncButton
                        variant="success"
                        action={twoFAAction}
                        loadingText="Activation..."
                        onClick={async () => {
                          await twoFAAction.run(async () => {
                            try {
                              await authService.enable2FA({ code: twoFACode });
                              setTwoFAEnabled(true);
                              setTwoFASetup(null);
                              setTwoFACode('');
                              alert.success && alert.success('2FA activé avec succès');
                              setSuccess('2FA activé avec succès.');
                            } catch (err) {
                              alert.error(err.response?.data?.message || 'Code invalide');
                            }
                          });
                        }}
                      >
                        Activer le 2FA
                      </AsyncButton>
                      <Button variant="outline-secondary" size="sm" onClick={() => { setTwoFASetup(null); setTwoFACode(''); }}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
                {twoFAEnabled && (
                  <div>
                    <p className="text-muted small mb-3">Le 2FA est actuellement actif sur votre compte. Pour le désactiver, entrez votre mot de passe.</p>
                    <Form.Group className="mb-3">
                      <Form.Label>Mot de passe actuel</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Confirmer avec votre mot de passe"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                      />
                    </Form.Group>
                    <AsyncButton
                      variant="danger"
                      action={twoFAAction}
                      loadingText="Désactivation..."
                      onClick={async () => {
                        await twoFAAction.run(async () => {
                          try {
                            await authService.disable2FA({ password: disablePassword });
                            setTwoFAEnabled(false);
                            setDisablePassword('');
                            setSuccess('2FA désactivé.');
                          } catch (err) {
                            alert.error(err.response?.data?.message || 'Erreur lors de la désactivation');
                          }
                        });
                      }}
                    >
                      Désactiver le 2FA
                    </AsyncButton>
                  </div>
                )}
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
