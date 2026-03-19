import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaUser, FaSave, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

const MyProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState({
    prenom: '',
    nom: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const isPasswordConfirmationFilled = passwordData.confirmPassword.trim().length > 0;
  const doPasswordsMatch = passwordData.newPassword === passwordData.confirmPassword;
  const isPasswordFormValid =
    passwordData.currentPassword.trim().length > 0
    && passwordData.newPassword.trim().length > 0
    && passwordData.confirmPassword.trim().length > 0
    && doPasswordsMatch;

  useEffect(() => {
    if (user && user.id) {
      setProfileData({
        prenom: user.prenom || '',
        nom: user.nom || '',
        email: user.email || ''
      });
    }
  }, [user]);

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
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.updateProfile({
        nom: profileData.nom,
        prenom: profileData.prenom,
        email: profileData.email
      });
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
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Tous les champs du mot de passe sont requis.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Mot de passe modifié avec succès.');
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col md={8}>
          <div className="d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
              <FaUser className="text-primary" size={32} />
            </div>
            <div>
              <h1 className="mb-0">Mes Informations</h1>
              <p className="text-muted mb-0">Gérez votre profil et vos paramètres de sécurité</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={3} className="mb-4">
          <Card className="mb-3">
            <Card.Body>
              <Badge bg="primary" className="mb-3">Navigation</Badge>
              <div className="d-flex flex-column gap-2">
                <Button variant={activeTab === 'profile' ? 'primary' : 'light'} className="text-start" onClick={() => setActiveTab('profile')}>
                  <FaUser className="me-2" /> Informations Générales
                </Button>
                <Button variant={activeTab === 'password' ? 'primary' : 'light'} className="text-start" onClick={() => setActiveTab('password')}>
                  <FaLock className="me-2" /> Sécurité
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Badge bg="info" className="mb-3">Infos</Badge>
              {user ? (
                <>
                  <small className="text-muted d-block mb-2"><strong>Nom:</strong> {user.nom} {user.prenom}</small>
                  <small className="text-muted d-block mb-2"><strong>Email:</strong> {user.email}</small>
                  <small className="text-muted d-block mb-2"><strong>Rôle:</strong> {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</small>
                </>
              ) : (
                <small className="text-muted">Chargement...</small>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={9}>
          {error && <Alert variant="danger" className="floating-error-alert" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" className="floating-success-alert" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

          {activeTab === 'profile' && (
            <Card>
              <Card.Header className="bg-light">
                <Card.Title className="mb-0"><FaUser className="me-2" /> Informations Générales</Card.Title>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleProfileSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prénom</Form.Label>
                    <Form.Control type="text" name="prenom" value={profileData.prenom} onChange={handleProfileChange} placeholder="Votre prénom" disabled={loading} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom</Form.Label>
                    <Form.Control type="text" name="nom" value={profileData.nom} onChange={handleProfileChange} placeholder="Votre nom" disabled={loading} />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" name="email" value={profileData.email} onChange={handleProfileChange} placeholder="Votre email" disabled={loading} />
                  </Form.Group>
                  <Button variant="primary" type="submit" disabled={loading} className="w-100">
                    {loading ? <>Sauvegarde...</> : <><FaSave className="me-2" /> Enregistrer</>}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card>
              <Card.Header className="bg-light">
                <Card.Title className="mb-0"><FaLock className="me-2" /> Changer le Mot de Passe</Card.Title>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handlePasswordSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mot de passe actuel</Form.Label>
                    <div className="input-group">
                      <Form.Control type={showPasswords.current ? 'text' : 'password'} name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Mot de passe actuel" disabled={loading} />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))} disabled={loading}>
                        {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Nouveau mot de passe</Form.Label>
                    <div className="input-group">
                      <Form.Control type={showPasswords.new ? 'text' : 'password'} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Nouveau mot de passe" disabled={loading} />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} disabled={loading}>
                        {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Confirmer le mot de passe</Form.Label>
                    <div className="input-group">
                      <Form.Control type={showPasswords.confirm ? 'text' : 'password'} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirmer" disabled={loading} isInvalid={isPasswordConfirmationFilled && !doPasswordsMatch} isValid={isPasswordConfirmationFilled && doPasswordsMatch} />
                      <Button variant="outline-secondary" onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} disabled={loading}>
                        {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                    </div>
                    {isPasswordConfirmationFilled && !doPasswordsMatch && (
                      <Form.Text className="text-danger fw-semibold">
                        Les nouveaux mots de passe ne correspondent pas.
                      </Form.Text>
                    )}
                    {isPasswordConfirmationFilled && doPasswordsMatch && (
                      <Form.Text className="text-success fw-semibold">
                        Les nouveaux mots de passe correspondent.
                      </Form.Text>
                    )}
                  </Form.Group>
                  <Button variant="danger" type="submit" disabled={loading || !isPasswordFormValid} className="w-100">
                    {loading ? <>Changement...</> : <><FaLock className="me-2" /> Changer le mot de passe</>}
                  </Button>
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