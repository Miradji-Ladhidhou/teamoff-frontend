import './conge-details.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaClock, FaCheck, FaTimes, FaUser, FaCalendarAlt, FaComment, FaList } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService } from '../../services/api';
import { InfoCardInfo } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const CongeDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';

  const [conge, setConge] = useState(null);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [cancelComment, setCancelComment] = useState('');
  const [validationComment, setValidationComment] = useState('');
  const [validationOverlapInfo, setValidationOverlapInfo] = useState(null);
  const [validationOverlapLoading, setValidationOverlapLoading] = useState(false);
  const action = useAsyncAction();

  useEffect(() => {
    loadCongeDetails();
  }, [id]);

  useEffect(() => {
    if (!conge || !canApprove()) {
      setValidationOverlapInfo(null);
      return;
    }

    let cancelled = false;

    const loadValidationOverlap = async () => {
      setValidationOverlapLoading(true);
      try {
        const response = await congesService.getValidationOverlap(id);
        if (!cancelled) setValidationOverlapInfo(response.data);
      } catch (_) {
        if (!cancelled) {
          setValidationOverlapInfo({
            has_overlap: null,
            message: 'Impossible de vérifier le chevauchement pour le moment.',
          });
        }
      } finally {
        if (!cancelled) setValidationOverlapLoading(false);
      }
    };

    loadValidationOverlap();

    return () => {
      cancelled = true;
    };
  }, [conge, id, user?.role]);

  const loadCongeDetails = async () => {
    try {
      setLoading(true);
      const response = await congesService.getById(id);
      setConge(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement du congé:', err);
      alert.error('Erreur lors du chargement des détails du congé');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    await action.run(async () => {
      try {
        const isFinalValidated = user?.role === 'admin_entreprise' && conge?.statut === 'valide_final';
        await congesService.delete(id, isFinalValidated ? { commentaire: cancelComment.trim() } : {});
        navigate('/conges', {
          state: {
            message: 'Demande de congé supprimée avec succès',
            type: 'success'
          }
        });
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de la suppression de la demande');
      } finally {
        setShowDeleteModal(false);
        setCancelComment('');
      }
    });
  };

  const handleStatusChange = async (newStatus, comment = '') => {
    return action.run(async () => {
      try {
        if (newStatus === 'valide') {
          await congesService.validate(id, { commentaire: comment });
        } else if (newStatus === 'refuse') {
          await congesService.reject(id, { commentaire: comment });
        }
        await loadCongeDetails(); // Recharger les données
        setShowCommentModal(false);
        setCommentaire('');
        setValidationComment('');
        return true;
      } catch (err) {
        console.error('Erreur lors de la mise à jour du statut:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de la mise à jour du statut');
        return false;
      }
    });
  };

  const actionLoading = action.isRunning;

  const getStatusBadge = (statut) => {
    const statusConfig = {
      en_attente_manager: { variant: 'warning', text: 'En attente manager', icon: FaClock },
      valide_manager: { variant: 'info', text: 'Validé manager', icon: FaCheck },
      valide_final: { variant: 'success', text: 'Validé final', icon: FaCheck },
      refuse_manager: { variant: 'danger', text: 'Refusé manager', icon: FaTimes },
      refuse_final: { variant: 'danger', text: 'Refusé final', icon: FaTimes }
    };

    const config = statusConfig[statut] || statusConfig.en_attente_manager;
    const Icon = config.icon;

    return (
      <Badge bg={config.variant} className="d-flex align-items-center gap-1">
        <Icon size={10} />
        {config.text}
      </Badge>
    );
  };

  const getCongeTypeLabel = () => {
    if (typeof conge?.conge_type === 'string') return conge.conge_type;
    if (conge?.conge_type?.libelle) return conge.conge_type.libelle;
    return conge?.conge_type_libelle || 'Type inconnu';
  };

  const getEmployeLabel = () => {
    if (conge?.utilisateur_nom) return conge.utilisateur_nom;
    if (conge?.utilisateur) return `${conge.utilisateur.prenom || ''} ${conge.utilisateur.nom || ''}`.trim();
    return 'Utilisateur inconnu';
  };

  const getEntrepriseLabel = () => {
    if (conge?.entreprise_nom) return conge.entreprise_nom;
    if (conge?.entreprise?.nom) return conge.entreprise.nom;
    return 'Entreprise inconnue';
  };

  const canEdit = () => {
    if (!conge) return false;

    if (user?.role === 'admin_entreprise' && conge.statut === 'valide_final') {
      return true;
    }

    return conge.utilisateur_id === user?.id && conge.statut === 'en_attente_manager';
  };

  const canDelete = () => {
    if (!conge) return false;

    if (user?.role === 'admin_entreprise' && conge.statut === 'valide_final') {
      return true;
    }

    return conge.utilisateur_id === user?.id && conge.statut === 'en_attente_manager';
  };

  const canApprove = () => {
    if (!conge) return false;
    if (user.role === 'manager') return conge.statut === 'en_attente_manager';
    if (user.role === 'admin_entreprise' || user.role === 'super_admin') {
      return conge.statut === 'en_attente_manager' || conge.statut === 'valide_manager';
    }
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('fr-FR');
  };

  const formatDays = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  };

  const getRefusalComment = () => {
    if (!conge) return '';
    if (conge.statut === 'refuse_manager') return conge.commentaire_manager || '';
    if (conge.statut === 'refuse_final') return conge.commentaire_admin || conge.commentaire_manager || '';
    return '';
  };

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des détails...</p>
        </div>
      </Container>
    );
  }

  if (!conge) {
    return (
      <Container fluid="sm">
        <div className="alert alert-warning text-center" role="status">
          Congé non trouvé
        </div>
        <div className="text-center mt-3">
          <Button as={Link} to="/conges" variant="outline-primary">
            Retour à la liste
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <Button as={Link} to="/conges" variant="outline-secondary" className="me-3">
            <FaArrowLeft />
          </Button>
          <div>
            <h1 className="h3 mb-1">Détails de la demande</h1>
            {isSuperAdmin && <p className="text-muted mb-0">Demande #{conge.id}</p>}
          </div>
        </div>
        <div className="d-flex gap-2">
          {canEdit() && (
            <Button as={Link} to={`/conges/${id}/edit`} variant="outline-primary" size="sm">
              <FaEdit className="me-1" />
              Modifier
            </Button>
          )}
          {canDelete() && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => {
                setCancelComment('');
                setShowDeleteModal(true);
              }}
            >
              {user?.role === 'admin_entreprise' && conge?.statut === 'valide_final' ? (
                <><FaTimes className="me-1" />Annuler le congé</>
              ) : (
                <><FaTrash className="me-1" />Supprimer</>
              )}
            </Button>
          )}
        </div>
      </div>

      <InfoCardInfo title="Comprendre le cycle de validation">
        <p className="mb-1">
          Suivez ici l'état de votre demande et son historique. Chaque changement de statut
          peut être accompagné d'un commentaire de validation.
        </p>
        <p className="mb-0">
          Tant que la demande est en attente, vous pouvez encore la modifier ou la supprimer.
        </p>
      </InfoCardInfo>

      <Row>
        <Col lg={8}>
          {/* Informations principales */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Informations de la demande</h5>
              {getStatusBadge(conge.statut)}
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Type de congé</strong>
                    <div>{getCongeTypeLabel()}</div>
                    {conge?.conge_type_id && (
                      <Button
                        as={Link}
                        to={`/conges?conge_type_id=${encodeURIComponent(conge.conge_type_id)}`}
                        variant="link"
                        className="p-0 mt-1"
                      >
                        <FaList className="me-1" />
                        Voir les congés du même type
                      </Button>
                    )}
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Demandeur</strong>
                    <div className="d-flex align-items-center">
                      <FaUser className="me-2 text-muted" />
                      {getEmployeLabel()}
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Entreprise</strong>
                    {getEntrepriseLabel()}
                  </div>
                  {Array.isArray(conge?.calcul_details?.dates_non_prises) && conge.calcul_details.dates_non_prises.length > 0 && (
                    <div className="mb-3">
                      <strong className="text-muted d-block">Dates non prises dans le calcul</strong>
                      <div className="small bg-light rounded p-2">
                        {conge.calcul_details.dates_non_prises.map((item, index) => (
                          <div key={`${item.date}-${index}`} className="d-flex justify-content-between gap-2 border-bottom py-1">
                            <span>
                              <strong>{formatDateShort(item.date)}</strong> - {item.cause}
                            </span>
                            <span className="text-muted">{formatDays(item.quantite)} j</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Date de début</strong>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2 text-muted" />
                      {formatDate(conge.date_debut)}
                    </div>
                    {conge.debut_demi_journee && (
                      <small className="text-muted ms-3">
                        ({conge.debut_demi_journee === 'matin' ? 'Matin' : 'Après-midi'})
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Date de fin</strong>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="me-2 text-muted" />
                      {formatDate(conge.date_fin)}
                    </div>
                    {conge.fin_demi_journee && (
                      <small className="text-muted ms-3">
                        ({conge.fin_demi_journee === 'matin' ? 'Matin' : 'Après-midi'})
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted d-block">Nombre de jours</strong>
                    {conge.jours_pris ?? conge.nombre_jours ?? conge.jours_calcules ?? '-'} jour(s)
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted d-block">
                      Solde restant {getCongeTypeLabel()} {conge.date_debut ? new Date(conge.date_debut).getFullYear() : ''}
                    </strong>
                    <span className={(conge.jours_restants ?? 0) < 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>
                      {conge.jours_restants ?? '-'} jour(s)
                    </span>
                    {typeof conge.jours_restants === 'number' && (
                      <div className="text-muted small mt-1">
                        Cumul de tous les {getCongeTypeLabel()} approuvés sur l'année (ce congé : {conge.jours_pris ?? conge.nombre_jours ?? '-'} j).
                      </div>
                    )}
                  </div>
                  {conge.calcul_details && (
                    <div className="mb-3">
                      <strong className="text-muted d-block">Détail du calcul</strong>
                      <div className="small bg-light rounded p-2">
                        <div>Jours sur la période : {formatDays(conge.calcul_details.jours_dans_periode)}</div>
                        <div>Jours bloqués : {formatDays(conge.calcul_details.jours_bloques)}</div>
                        <div>Jours fériés exclus : {formatDays(conge.calcul_details.jours_feries_exclus)}</div>
                        <div>Demi-journées déduites : {formatDays(conge.calcul_details.jours_demi_journees_deduites)}</div>
                        <div>Jours déduits du calcul : {formatDays(conge.calcul_details.jours_deduits_calcul)}</div>
                        <div>Jours pris calculés : {formatDays(conge.calcul_details.jours_pris_calcules)}</div>
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <strong className="text-muted d-block">Date demande</strong>
                    {formatDate(conge.date_demande || conge.created_at || conge.createdAt)}
                  </div>
                </Col>
              </Row>

              {conge.commentaire_employe && (
                <div className="mt-3">
                  <strong className="text-muted d-block">Commentaire du demandeur</strong>
                  <div className="bg-light p-3 rounded">
                    <FaComment className="me-2 text-muted" />
                    {conge.commentaire_employe}
                  </div>
                </div>
              )}

              {getRefusalComment() && (
                <div className="mt-3">
                  <strong className="text-danger d-block">Commentaire du refus</strong>
                  <div className="bg-danger-subtle p-3 rounded border border-danger-subtle">
                    <FaComment className="me-2 text-danger" />
                    {getRefusalComment()}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Historique des statuts */}
          {conge.historique && conge.historique.length > 0 && (
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Historique des modifications</h5>
              </Card.Header>
              <Card.Body>
                <div className="timeline">
                  {conge.historique.map((item, index) => (
                    <div key={index} className="timeline-item mb-3">
                      <div className="timeline-marker bg-primary"></div>
                      <div className="timeline-content">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{getStatusBadge(item.statut)}</strong>
                            <div className="text-muted small">
                              Par {item.modifie_par_nom} le {formatDateShort(item.date_modification)}
                            </div>
                          </div>
                        </div>
                        {item.commentaire && (
                          <div className="mt-2 p-2 bg-light rounded small">
                            {item.commentaire}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col lg={4}>
          {/* Actions disponibles */}
          {canApprove() && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Actions</h6>
              </Card.Header>
              <Card.Body>
                {validationOverlapInfo && (
                  <Alert
                    variant={validationOverlapInfo.has_overlap ? 'warning' : 'success'}
                    className={`mb-3 overlap-alert ${validationOverlapInfo.has_overlap ? 'overlap-alert-warning' : 'overlap-alert-ok'}`}
                  >
                    <strong>
                      {validationOverlapInfo.has_overlap
                        ? 'Alerte chevauchement détectée.'
                        : 'Pas de chevauchement détecté.'}
                    </strong>
                    <div className="small mt-1">{validationOverlapInfo.message}</div>
                  </Alert>
                )}
                {validationOverlapLoading && (
                  <div className="small text-muted mb-3">Vérification du chevauchement en cours...</div>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Commentaire de validation</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    placeholder="Ajoutez un commentaire (obligatoire en cas de chevauchement)"
                    disabled={actionLoading}
                  />
                  <Form.Text className="text-muted">
                    Le manager doit saisir un commentaire quand la demande est en chevauchement.
                  </Form.Text>
                </Form.Group>
                <div className="d-grid gap-2">
                  <AsyncButton
                    variant="success"
                    onClick={() => setShowValidateModal(true)}
                    action={action}
                    loadingText="Traitement..."
                  >
                    {!actionLoading && (
                      <FaCheck className="me-2" />
                    )}
                    Approuver
                  </AsyncButton>
                  <Button
                    variant="danger"
                    onClick={() => setShowCommentModal(true)}
                    disabled={actionLoading}
                  >
                    <FaTimes className="me-2" />
                    Refuser
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Informations système */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Informations système</h6>
            </Card.Header>
            <Card.Body className="small">
              <div className="mb-2">
                <strong>Créé le:</strong><br />
                {formatDateShort(conge.created_at)}
              </div>
              {conge.updated_at !== conge.created_at && (
                <div className="mb-2">
                  <strong>Dernière modification:</strong><br />
                  {formatDateShort(conge.updated_at)}
                </div>
              )}
              {isSuperAdmin && (
                <div>
                  <strong>ID de la demande:</strong><br />
                  #{conge.id}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Rappels */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Rappels</h6>
            </Card.Header>
            <Card.Body className="small">
              <ul className="mb-0">
                <li>Les congés approuvés sont automatiquement déduits du solde</li>
                <li>Un email de notification est envoyé au demandeur</li>
                <li>Les refus doivent être justifiés</li>
                <li>Les demandes en attente peuvent être modifiées par le demandeur</li>
                <li>Un congé validé ne peut être modifié ou annulé que par un admin entreprise</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>
            {user?.role === 'admin_entreprise' && conge?.statut === 'valide_final'
              ? "Confirmer l'annulation"
              : 'Confirmer la suppression'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {user?.role === 'admin_entreprise' && conge?.statut === 'valide_final'
            ? 'Êtes-vous sûr de vouloir annuler ce congé validé ? Le solde de l\'employé sera recalculé automatiquement et il sera notifié.'
            : 'Êtes-vous sûr de vouloir supprimer cette demande de congé ? Cette action est irréversible.'}

          {user?.role === 'admin_entreprise' && conge?.statut === 'valide_final' && (
            <Form.Group className="mt-3">
              <Form.Label>Commentaire d'annulation (requis)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
                placeholder="Expliquez la raison de l'annulation..."
                disabled={actionLoading}
                required
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false);
              setCancelComment('');
            }}
            disabled={actionLoading}
          >
            Fermer
          </Button>
          <AsyncButton
            variant="danger"
            onClick={handleDelete}
            disabled={
              actionLoading
              || (user?.role === 'admin_entreprise' && conge?.statut === 'valide_final' && !cancelComment.trim())
            }
            action={action}
            loadingText={user?.role === 'admin_entreprise' && conge?.statut === 'valide_final' ? 'Annulation...' : 'Suppression...'}
          >
            {user?.role === 'admin_entreprise' && conge?.statut === 'valide_final' ? 'Annuler le congé' : 'Supprimer'}
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* Modal pour commentaire de refus */}
      <Modal show={showCommentModal} onHide={() => setShowCommentModal(false)} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Refuser la demande</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Commentaire de refus (requis)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Veuillez justifier le refus de cette demande..."
              disabled={actionLoading}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCommentModal(false)} disabled={actionLoading}>
            Annuler
          </Button>
          <AsyncButton
            variant="danger"
            onClick={() => handleStatusChange('refuse', commentaire)}
            disabled={actionLoading || !commentaire.trim()}
            action={action}
            loadingText="Refus..."
          >
            Refuser
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmation validation */}
      <Modal show={showValidateModal} onHide={() => setShowValidateModal(false)} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Confirmer la validation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {validationOverlapInfo && (
            <Alert
              variant={validationOverlapInfo.has_overlap ? 'warning' : 'success'}
              className={`mb-3 overlap-alert ${validationOverlapInfo.has_overlap ? 'overlap-alert-warning' : 'overlap-alert-ok'}`}
            >
              <strong>
                {validationOverlapInfo.has_overlap
                  ? 'Alerte chevauchement détectée.'
                  : 'Pas de chevauchement détecté.'}
              </strong>
              <div className="small mt-1">{validationOverlapInfo.message}</div>
            </Alert>
          )}
          {validationOverlapLoading && (
            <div className="small text-muted mb-3">Vérification du chevauchement en cours...</div>
          )}

          <Form.Group>
            <Form.Label>Commentaire de validation</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={validationComment}
              onChange={(e) => setValidationComment(e.target.value)}
              placeholder="Ajoutez un commentaire (obligatoire en cas de chevauchement)"
              disabled={actionLoading}
            />
            <Form.Text className="text-muted">
              Ce commentaire est obligatoire pour le manager si un chevauchement est détecté.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidateModal(false)} disabled={actionLoading}>
            Annuler
          </Button>
          <AsyncButton
            variant="success"
            onClick={async () => {
              const success = await handleStatusChange('valide', validationComment);
              if (success) setShowValidateModal(false);
            }}
            action={action}
            loadingText="Validation..."
          >
            Valider
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CongeDetailsPage;