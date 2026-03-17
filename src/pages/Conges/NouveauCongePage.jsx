import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, congeTypesService, quotasService } from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';

const NouveauCongePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const returnPath = user?.role === 'super_admin' ? '/superadmin/leaves' : '/conges';

  const [formData, setFormData] = useState({
    conge_type_id: '',
    date_debut: '',
    date_fin: '',
    debut_demi_journee: '',
    fin_demi_journee: '',
    commentaire_employe: ''
  });

  const [congeTypes, setCongeTypes] = useState([]);
  const [soldes, setSoldes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [joursCalcules, setJoursCalcules] = useState(0);

  useEffect(() => {
    if (isEditMode) return;
    const params = new URLSearchParams(location.search);
    const dateDebut = params.get('date_debut') || '';
    const dateFin = params.get('date_fin') || '';

    if (dateDebut || dateFin) {
      setFormData((prev) => ({
        ...prev,
        date_debut: dateDebut || prev.date_debut,
        date_fin: dateFin || prev.date_fin,
      }));
    }
  }, [location.search, isEditMode]);

  useEffect(() => {
    loadInitialData();
  }, [id, user?.id]);

  useEffect(() => {
    // Calculer les jours automatiquement quand les dates changent
    if (formData.date_debut && formData.date_fin && formData.conge_type_id) {
      calculateJours();
    }
  }, [formData.date_debut, formData.date_fin, formData.debut_demi_journee, formData.fin_demi_journee]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);

      const [typesResponse, soldesResponse, congeResponse] = await Promise.all([
        congeTypesService.getAll(),
        quotasService.getSoldes(user.id),
        isEditMode ? congesService.getById(id) : Promise.resolve(null)
      ]);

      setCongeTypes(Array.isArray(typesResponse.data) ? typesResponse.data : []);
      setSoldes(Array.isArray(soldesResponse.data?.soldes) ? soldesResponse.data.soldes : []);

      if (congeResponse?.data) {
        const conge = congeResponse.data;
        setFormData({
          conge_type_id: conge.conge_type_id || '',
          date_debut: conge.date_debut ? conge.date_debut.split('T')[0] : '',
          date_fin: conge.date_fin ? conge.date_fin.split('T')[0] : '',
          debut_demi_journee: conge.debut_demi_journee || '',
          fin_demi_journee: conge.fin_demi_journee || '',
          commentaire_employe: conge.commentaire_employe || ''
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const calculateJours = async () => {
    try {
      // Simulation du calcul côté frontend (idéalement faire un appel API)
      const start = new Date(formData.date_debut);
      const end = new Date(formData.date_fin);
      let jours = 0;

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        // Compter seulement les jours ouvrés (lundi à vendredi)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          jours++;
        }
      }

      // Ajuster pour les demi-journées
      if (formData.debut_demi_journee === 'apres_midi') jours -= 0.5;
      if (formData.fin_demi_journee === 'matin') jours -= 0.5;

      setJoursCalcules(jours);
    } catch (err) {
      console.error('Erreur lors du calcul des jours:', err);
    }
  };

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

  const validateForm = () => {
    const errors = {};

    if (!formData.conge_type_id) errors.conge_type_id = 'Le type de congé est requis';
    if (!formData.date_debut) errors.date_debut = 'La date de début est requise';
    if (!formData.date_fin) errors.date_fin = 'La date de fin est requise';

    if (formData.date_debut && formData.date_fin) {
      const startDate = new Date(formData.date_debut);
      const endDate = new Date(formData.date_fin);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.date_debut = 'La date de début ne peut pas être dans le passé';
      }

      if (endDate < startDate) {
        errors.date_fin = 'La date de fin doit être après la date de début';
      }

      if (
        formData.date_debut === formData.date_fin
        && formData.debut_demi_journee === 'apres_midi'
        && formData.fin_demi_journee === 'matin'
      ) {
        errors.fin_demi_journee = 'Combinaison de demi-journées incohérente sur une seule journée';
      }
    }

    const selectedType = congeTypes.find(type => type.id === formData.conge_type_id);
    if (
      selectedType
      && selectedType.demi_journee_autorisee === false
      && (formData.debut_demi_journee === 'apres_midi' || formData.fin_demi_journee === 'matin')
    ) {
      errors.conge_type_id = 'Ce type de congé n\'autorise pas les demi-journées';
    }

    // Vérifier le solde disponible
    if (formData.conge_type_id && joursCalcules > 0) {
      const selectedType = congeTypes.find(type => type.id === formData.conge_type_id);
      const soldeType = soldes.find(s => s.conge_type_id === formData.conge_type_id);

      if (soldeType && joursCalcules > soldeType.solde_disponible) {
        errors.conge_type_id = `Solde insuffisant (${soldeType.solde_disponible} jours disponibles)`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isEditMode) {
        await congesService.update(id, formData);
      } else {
        await congesService.create(formData);
      }

      navigate(returnPath);
    } catch (err) {
      console.error(`Erreur lors de ${isEditMode ? 'la modification' : 'la création'} du congé:`, err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedType = () => {
    return congeTypes.find(type => type.id === formData.conge_type_id);
  };

  const getSoldeForType = (typeId) => {
    return soldes.find(s => s.conge_type_id === typeId);
  };

  if (loadingData) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des données...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex align-items-center mb-4">
        <Button as={Link} to={returnPath} variant="outline-secondary" className="me-3">
          <FaArrowLeft />
        </Button>
        <div>
          <h1 className="h3 mb-1">{isEditMode ? 'Modifier la demande de congé' : 'Nouvelle demande de congé'}</h1>
          <p className="text-muted">{isEditMode ? 'Mettez à jour les informations de votre demande' : 'Remplissez le formulaire ci-dessous'}</p>
        </div>
      </div>

      <InfoCardInfo title={isEditMode ? 'Conseils pour modifier votre demande' : 'Avant de soumettre votre demande'}>
        <ul className="mb-0">
          <li>Choisissez un type de congé compatible avec votre solde</li>
          <li>Vérifiez les dates et les demi-journées pour un calcul exact</li>
          <li>Ajoutez un commentaire clair pour faciliter la validation</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Exemple de commentaire utile">
        Absence familiale du 12 au 14 avril, relais opérationnel préparé avec l'équipe support.
      </TipCard>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Type de congé */}
                <Form.Group className="mb-3">
                  <Form.Label>Type de congé *</Form.Label>
                  <Form.Select
                    name="conge_type_id"
                    value={formData.conge_type_id}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.conge_type_id}
                  >
                    <option value="">Sélectionnez un type de congé</option>
                    {congeTypes.map(type => {
                      const solde = getSoldeForType(type.id);
                      return (
                        <option key={type.id} value={type.id}>
                          {type.libelle} {solde ? `(${solde.solde_disponible} jours restants)` : ''}
                        </option>
                      );
                    })}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.conge_type_id}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Période */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de début *</Form.Label>
                      <Form.Control
                        type="date"
                        name="date_debut"
                        value={formData.date_debut}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.date_debut}
                        min={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.date_debut}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de fin *</Form.Label>
                      <Form.Control
                        type="date"
                        name="date_fin"
                        value={formData.date_fin}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.date_fin}
                        min={formData.date_debut || (isEditMode ? undefined : new Date().toISOString().split('T')[0])}
                      />
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.date_fin}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Demi-journées */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Début de journée</Form.Label>
                      <Form.Select
                        name="debut_demi_journee"
                        value={formData.debut_demi_journee}
                        onChange={handleChange}
                        disabled={getSelectedType()?.demi_journee_autorisee === false}
                      >
                        <option value="">Journée complète</option>
                        <option value="matin">Matin seulement</option>
                        <option value="apres_midi">Après-midi seulement</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fin de journée</Form.Label>
                      <Form.Select
                        name="fin_demi_journee"
                        value={formData.fin_demi_journee}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.fin_demi_journee}
                        disabled={getSelectedType()?.demi_journee_autorisee === false}
                      >
                        <option value="">Journée complète</option>
                        <option value="matin">Matin seulement</option>
                        <option value="apres_midi">Après-midi seulement</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {validationErrors.fin_demi_journee}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {getSelectedType()?.demi_journee_autorisee === false && (
                  <Alert variant="info" className="mb-3 py-2">
                    Le type de congé sélectionné n'autorise pas les demi-journées.
                  </Alert>
                )}

                {/* Commentaire */}
                <Form.Group className="mb-4">
                  <Form.Label>Commentaire (optionnel)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="commentaire_employe"
                    value={formData.commentaire_employe}
                    onChange={handleChange}
                    placeholder="Ajoutez un commentaire pour justifier votre demande..."
                    maxLength={1000}
                  />
                  <Form.Text className="text-muted">
                    {formData.commentaire_employe.length}/1000 caractères
                  </Form.Text>
                </Form.Group>

                <div className="d-flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="flex-fill"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
                      </>
                    ) : (
                      isEditMode ? 'Enregistrer les modifications' : 'Soumettre la demande'
                    )}
                  </Button>
                  <Button
                    as={Link}
                    to={returnPath}
                    variant="outline-secondary"
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Résumé de la demande */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Résumé de la demande</h5>
            </Card.Header>
            <Card.Body>
              {getSelectedType() && (
                <div className="mb-3">
                  <strong>Type:</strong> {getSelectedType().libelle}
                </div>
              )}

              {formData.date_debut && formData.date_fin && (
                <div className="mb-3">
                  <strong>Période:</strong><br />
                  Du {new Date(formData.date_debut).toLocaleDateString('fr-FR')}<br />
                  Au {new Date(formData.date_fin).toLocaleDateString('fr-FR')}
                </div>
              )}

              {joursCalcules > 0 && (
                <div className="mb-3">
                  <strong>Jours calculés:</strong> {joursCalcules} jour(s)
                </div>
              )}

              {(formData.debut_demi_journee || formData.fin_demi_journee) && (
                <div className="mb-3">
                  <strong>Demi-journées:</strong>
                  {formData.debut_demi_journee === 'apres_midi' && ' Début après-midi'}
                  {formData.fin_demi_journee === 'matin' && ' Fin matin'}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Informations importantes */}
          <Card>
            <Card.Header>
              <h6 className="mb-0 d-flex align-items-center">
                <FaInfoCircle className="me-2" />
                Informations importantes
              </h6>
            </Card.Header>
            <Card.Body className="small">
              <ul className="mb-0">
                <li>La demande sera soumise à validation</li>
                <li>Vous recevrez une notification par email</li>
                <li>Le délai de traitement est généralement de 48h</li>
                <li>Vous pouvez annuler votre demande tant qu'elle n'est pas validée</li>
              </ul>
            </Card.Body>
          </Card>

          {/* Soldes disponibles */}
          {soldes.length > 0 && (
            <Card className="mt-4">
              <Card.Header>
                <h6 className="mb-0">Vos soldes disponibles</h6>
              </Card.Header>
              <Card.Body>
                {soldes.map((solde, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small">{solde.conge_type}</span>
                    <Badge bg="info">{solde.solde_disponible} jours</Badge>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default NouveauCongePage;