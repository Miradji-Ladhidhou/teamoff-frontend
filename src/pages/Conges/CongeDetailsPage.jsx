import './conge-details.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaClock, FaCheck, FaTimes, FaUser, FaCalendarAlt, FaComment, FaList } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import useLeavePolicy from '../../hooks/useLeavePolicy';
import { LeaveActionRestriction } from '../../components/LeaveActionRestriction';
import AsyncButton from '../../components/AsyncButton';

const DEFAULT_SELF_CANCELLATION_POLICY = {
  allow_employee_cancel_own_pending: true,
  allow_manager_cancel_own_pending: true,
};

const accentToBadgeClass = (accent) => {
  const map = { pending: 'pending', info: 'info', success: 'approved', danger: 'refused' };
  return map[accent] || 'pending';
};

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
  const [policyValidation, setPolicyValidation] = useState({
    loading: false,
    canModify: true,
    canCancel: true,
    reason: null,
    code: null,
  });
  const [selfCancellationPolicy, setSelfCancellationPolicy] = useState(DEFAULT_SELF_CANCELLATION_POLICY);
  const [history, setHistory] = useState([]);
  const { validateModification, validateCancellation } = useLeavePolicy();
  const action = useAsyncAction();

  useEffect(() => {
    loadCongeDetails();
    congesService.getHistory(id)
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
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
      } catch (err) {
        console.error('Erreur vérification chevauchement:', err);
        if (!cancelled) {
          setValidationOverlapInfo({
            has_overlap: null,
            check_failed: true,
            message: 'Impossible de vérifier le chevauchement — vérifiez manuellement avant de valider.',
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
  }, [conge?.id, conge?.statut, id, user?.role]);

  useEffect(() => {
    let cancelled = false;

    const runPolicyValidation = async () => {
      const isAdminLevel = isSuperAdmin || user?.role === 'admin_entreprise';

      if (!conge || !['valide_final', 'valide_manager'].includes(conge.statut)) {
        setPolicyValidation({ loading: false, canModify: true, canCancel: true, reason: null, code: null });
        return;
      }

      if (!isAdminLevel) {
        setPolicyValidation({ loading: false, canModify: false, canCancel: false, reason: null, code: null });
        return;
      }

      setPolicyValidation((prev) => ({ ...prev, loading: true }));
      const [modifyResult, cancelResult] = await Promise.all([
        validateModification({ congeId: conge.id, congeStatus: conge.statut, congeStartDate: conge.date_debut }),
        validateCancellation({ congeId: conge.id, congeStatus: conge.statut, congeStartDate: conge.date_debut }),
      ]);

      if (cancelled) return;

      setPolicyValidation({
        loading: false,
        canModify: Boolean(modifyResult?.allowed),
        canCancel: Boolean(cancelResult?.allowed),
        reason: modifyResult?.allowed ? cancelResult?.reason : modifyResult?.reason,
        code: modifyResult?.allowed ? cancelResult?.code : modifyResult?.code,
      });
    };

    runPolicyValidation();

    return () => { cancelled = true; };
  }, [conge?.id, conge?.statut, user?.role]);

  useEffect(() => {
    let cancelled = false;

    const loadSelfCancellationPolicy = async () => {
      if (!conge?.entreprise_id) return;

      try {
        const response = await entreprisesService.getPublicPolicy(conge.entreprise_id);
        const pub = response?.data || {};

        if (cancelled) return;
        setSelfCancellationPolicy({
          allow_employee_cancel_own_pending: pub.allow_employee_cancel_own_pending !== undefined
            ? Boolean(pub.allow_employee_cancel_own_pending) : true,
          allow_manager_cancel_own_pending: pub.allow_manager_cancel_own_pending !== undefined
            ? Boolean(pub.allow_manager_cancel_own_pending) : true,
        });
      } catch (_err) {
        if (!cancelled) setSelfCancellationPolicy(DEFAULT_SELF_CANCELLATION_POLICY);
      }
    };

    loadSelfCancellationPolicy();

    return () => { cancelled = true; };
  }, [conge?.entreprise_id]);

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
        const isFinalValidated = ['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager');
        await congesService.delete(id, isFinalValidated ? { commentaire: cancelComment.trim() } : {});
        navigate('/conges', { state: { message: 'Demande de congé supprimée avec succès', type: 'success' } });
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
        await loadCongeDetails();
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

  const getStatusAccent = (statut) => {
    const map = {
      en_attente_manager: 'pending',
      valide_manager: 'info',
      valide_final: 'success',
      refuse_manager: 'danger',
      refuse_final: 'danger',
    };
    return map[statut] || 'pending';
  };

  const getStatusText = (statut) => {
    const map = {
      en_attente_manager: 'En attente manager',
      valide_manager: 'Validé manager',
      valide_final: 'Validé final',
      refuse_manager: 'Refusé manager',
      refuse_final: 'Refusé final',
    };
    return map[statut] || statut;
  };

  const getStatusBadge = (statut) => {
    const accent = getStatusAccent(statut);
    const text = getStatusText(statut);
    const IconMap = {
      en_attente_manager: FaClock,
      valide_manager: FaCheck,
      valide_final: FaCheck,
      refuse_manager: FaTimes,
      refuse_final: FaTimes,
    };
    const Icon = IconMap[statut] || FaClock;
    return (
      <span className={`badge ${accentToBadgeClass(accent)}`} style={{ padding: '5px 14px', fontSize: '10px' }}>
        <Icon size={10} className="me-1" />
        {text}
      </span>
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
    if (isSuperAdmin && conge.statut === 'valide_final') return policyValidation.canModify;
    if (user?.role === 'admin_entreprise' && conge.statut === 'valide_final') return policyValidation.canModify;
    return conge.utilisateur_id === user?.id && conge.statut === 'en_attente_manager';
  };

  const canDelete = () => {
    if (!conge) return false;
    const isOwnLeave = conge.utilisateur_id === user?.id;

    if (isOwnLeave && conge.statut === 'en_attente_manager') {
      if (user?.role === 'employe') return selfCancellationPolicy.allow_employee_cancel_own_pending;
      if (user?.role === 'manager') return selfCancellationPolicy.allow_manager_cancel_own_pending;
      return true;
    }

    if ((isSuperAdmin || user?.role === 'admin_entreprise') &&
        (conge.statut === 'valide_final' || conge.statut === 'valide_manager')) {
      return policyValidation.canCancel;
    }

    return false;
  };

  const canApprove = () => {
    if (!conge) return false;
    if (user?.role === 'manager') return conge.statut === 'en_attente_manager';
    if (isSuperAdmin || user?.role === 'admin_entreprise') {
      return conge.statut === 'en_attente_manager' || conge.statut === 'valide_manager';
    }
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

  const getRefusalLabel = () => {
    if (conge?.statut === 'refuse_manager') return 'Refusé par le manager';
    if (conge?.statut === 'refuse_final') return 'Refusé par l\'administration';
    return 'Commentaire du refus';
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
        <div className="alert alert-warning text-center" role="status">Congé non trouvé</div>
        <div className="text-center mt-3">
          <Button as={Link} to="/conges" variant="outline-primary">Retour à la liste</Button>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      {/* Bouton retour */}
      <div style={{ padding: '10px 4px 6px' }}>
        <Link to="/conges" style={{ fontSize: '12px', color: 'var(--accent-blue, var(--dk-accent))', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <FaArrowLeft size={10} /> Retour
        </Link>
      </div>

      {/* Header centré : badge statut + titre type */}
      <div className="conge-detail-hero">
        {getStatusBadge(conge.statut)}
        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text, var(--dk-text))', marginTop: 8, letterSpacing: '-0.02em' }}>
          {getCongeTypeLabel()}
        </div>
        {(isSuperAdmin || user?.role === 'admin_entreprise') && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted, var(--dk-text-muted))', marginTop: 4 }}>
            Demande #{conge.id}
          </div>
        )}
      </div>

      {/* Actions header (modifier / annuler) */}
      <div className="d-flex justify-content-end gap-2 mb-3">
        {conge.statut === 'valide_final' && !policyValidation.loading && (
          <LeaveActionRestriction
            isValidated
            canModify={policyValidation.canModify}
            canCancel={policyValidation.canCancel}
            reason={policyValidation.reason}
            code={policyValidation.code}
          />
        )}
        {canEdit() && (
          <Button as={Link} to={`/conges/${id}/edit`} variant="outline-primary" size="sm">
            <FaEdit className="me-1" /> Modifier
          </Button>
        )}
      </div>

      <Row>
        <Col lg={8}>
          {/* Card dates */}
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(91,141,238,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaCalendarAlt size={14} style={{ color: 'var(--accent-blue, var(--dk-accent))' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text, var(--dk-text))' }}>
                    {formatDateShort(conge.date_debut)} → {formatDateShort(conge.date_fin)}
                    {conge.debut_demi_journee && <span style={{ fontWeight: 400, marginLeft: 4 }}>({conge.debut_demi_journee === 'matin' ? 'Matin' : 'Après-midi'})</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, var(--dk-text-muted))' }}>
                    {conge.jours_pris ?? conge.nombre_jours ?? conge.jours_calcules ?? '-'} jour(s)
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Info rows principales */}
          <div className="info-rows mb-3">
            <div className="info-row">
              <span className="info-label">Demandeur</span>
              <span className="info-value">{getEmployeLabel()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Entreprise</span>
              <span className="info-value">{getEntrepriseLabel()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date de début</span>
              <span className="info-value">{formatDate(conge.date_debut)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date de fin</span>
              <span className="info-value">{formatDate(conge.date_fin)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Durée</span>
              <span className="info-value">{formatDays(conge.jours_pris ?? conge.nombre_jours ?? conge.jours_calcules)} jour(s)</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                Solde restant {conge.date_debut ? new Date(conge.date_debut).getFullYear() : ''}
              </span>
              <span className={`info-value ${(conge.jours_restants ?? 0) < 0 ? 'text-danger' : 'text-success'}`}>
                {conge.jours_restants ?? '-'} jour(s)
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Date demande</span>
              <span className="info-value">{formatDateShort(conge.date_demande || conge.created_at || conge.createdAt)}</span>
            </div>
            {conge?.conge_type_id && (
              <div className="info-row">
                <span className="info-label">Filtrer ce type</span>
                <Button
                  as={Link}
                  to={`/conges?conge_type_id=${encodeURIComponent(conge.conge_type_id)}`}
                  variant="link"
                  className="p-0 info-value"
                  style={{ fontSize: '10px' }}
                >
                  <FaList className="me-1" /> Voir tous les {getCongeTypeLabel()}
                </Button>
              </div>
            )}
          </div>

          {/* Commentaire employé */}
          {conge.commentaire_employe && (
            <div className="comment-block mb-3">
              <div style={{ fontSize: '10px', color: 'var(--text-muted, var(--dk-text-muted))', marginBottom: 4 }}>Commentaire du demandeur</div>
              <div style={{ fontSize: '12px', color: 'var(--text, var(--dk-text))' }}>
                <FaComment size={10} className="me-2" style={{ opacity: 0.5 }} />
                {conge.commentaire_employe}
              </div>
            </div>
          )}

          {/* Commentaire de refus */}
          {getRefusalComment() && (
            <div className="comment-block comment-block--danger mb-3">
              <div style={{ fontSize: '10px', color: 'var(--accent-red, var(--dk-error))', marginBottom: 4 }}>{getRefusalLabel()}</div>
              <div style={{ fontSize: '12px' }}>
                <FaComment size={10} className="me-2" />
                {getRefusalComment()}
              </div>
            </div>
          )}

          {/* Détail du calcul */}
          {conge.calcul_details && (
            <Card className="mb-3">
              <Card.Body className="p-0">
                <div className="calcul-details-box">
                  <div><span>Jours sur la période</span><span>{formatDays(conge.calcul_details.jours_dans_periode)}</span></div>
                  <div><span>Jours bloqués</span><span>{formatDays(conge.calcul_details.jours_bloques)}</span></div>
                  <div><span>Jours fériés exclus</span><span>{formatDays(conge.calcul_details.jours_feries_exclus)}</span></div>
                  <div><span>Demi-journées déduites</span><span>{formatDays(conge.calcul_details.jours_demi_journees_deduites)}</span></div>
                  <div><span>Jours déduits du calcul</span><span>{formatDays(conge.calcul_details.jours_deduits_calcul)}</span></div>
                  <div><span>Jours pris calculés</span><span>{formatDays(conge.calcul_details.jours_pris_calcules)}</span></div>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Dates non prises */}
          {Array.isArray(conge?.calcul_details?.dates_non_prises) && conge.calcul_details.dates_non_prises.length > 0 && (
            <Card className="mb-3">
              <Card.Header>
                <h6 className="mb-0" style={{ fontSize: '12px' }}>Dates non prises dans le calcul</h6>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="dates-non-prises">
                  {conge.calcul_details.dates_non_prises.map((item, index) => (
                    <div key={`${item.date}-${index}`}>
                      <span><strong>{formatDateShort(item.date)}</strong> — {item.cause}</span>
                      <span style={{ color: 'var(--text-muted, var(--dk-text-muted))' }}>{formatDays(item.quantite)} j</span>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Historique des statuts — timeline Phase 2 */}
          {conge.historique && conge.historique.length > 0 && (
            <div className="mb-4">
              <div className="section-header mb-2">
                <span className="section-title">Historique</span>
              </div>
              <div className="timeline-history">
                {conge.historique.map((item, index) => {
                  const accent = getStatusAccent(item.statut);
                  const isDone = accent !== 'pending';
                  return (
                    <div key={index} className="history-item">
                      <div className={`history-dot ${isDone ? 'done' : 'pending'}`} />
                      <div>
                        <div className="history-title">
                          <span className={`badge ${accentToBadgeClass(accent)}`}>{getStatusText(item.statut)}</span>
                        </div>
                        <div className="history-date">
                          Par {item.modifie_par_nom} · {formatDateShort(item.date_modification)}
                        </div>
                        {item.commentaire && (
                          <div style={{ fontSize: '10px', color: 'var(--text-soft, var(--dk-text-soft))', marginTop: 4, padding: '4px 8px', background: 'var(--surface, var(--dk-elevated))', borderRadius: 6 }}>
                            {item.commentaire}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Col>

        <Col lg={4}>
          {/* Actions disponibles (approbation) */}
          {canApprove() && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Actions</h6>
              </Card.Header>
              <Card.Body>
                {validationOverlapInfo && (
                  <Alert
                    variant={validationOverlapInfo.check_failed ? 'secondary' : validationOverlapInfo.has_overlap ? 'warning' : 'success'}
                    className={`mb-3 overlap-alert ${validationOverlapInfo.has_overlap ? 'overlap-alert-warning' : 'overlap-alert-ok'}`}
                  >
                    <strong>
                      {validationOverlapInfo.check_failed
                        ? 'Vérification indisponible.'
                        : validationOverlapInfo.has_overlap
                          ? 'Chevauchement détecté.'
                          : 'Pas de chevauchement.'}
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
                <div className="d-flex gap-2">
                  <button
                    className="btn-approve"
                    onClick={() => setShowValidateModal(true)}
                    disabled={actionLoading || validationOverlapLoading}
                  >
                    <FaCheck size={10} /> Approuver
                  </button>
                  <button
                    className="btn-refuse"
                    onClick={() => setShowCommentModal(true)}
                    disabled={actionLoading || validationOverlapLoading}
                  >
                    <FaTimes size={10} /> Refuser
                  </button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Informations système */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Informations système</h6>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-label">Créé le</span>
                  <span className="info-value">{formatDateShort(conge.created_at)}</span>
                </div>
                {conge.updated_at !== conge.created_at && (
                  <div className="info-row">
                    <span className="info-label">Modifié le</span>
                    <span className="info-value">{formatDateShort(conge.updated_at)}</span>
                  </div>
                )}
                {(isSuperAdmin || user?.role === 'admin_entreprise') && (
                  <div className="info-row">
                    <span className="info-label">ID demande</span>
                    <span className="info-value">#{conge.id}</span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Rappels */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Rappels</h6>
            </Card.Header>
            <Card.Body className="small">
              <ul className="mb-0">
                <li>Les congés approuvés sont déduits du solde</li>
                <li>Un email est envoyé au demandeur</li>
                <li>Les refus doivent être justifiés</li>
                <li>Les demandes en attente peuvent être modifiées</li>
                <li>Les congés validés suivent la politique d'entreprise</li>
              </ul>
            </Card.Body>
          </Card>

          {/* Bouton annuler/supprimer en bas */}
          {canDelete() && (
            <button
              className="btn-ghost-danger"
              onClick={() => { setCancelComment(''); setShowDeleteModal(true); }}
            >
              {['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? (
                <><FaTimes size={11} className="me-2" />Annuler le congé</>
              ) : (
                <><FaTrash size={11} className="me-2" />Supprimer la demande</>
              )}
            </button>
          )}
        </Col>
      </Row>

      {/* Timeline historique */}
      {history.length > 0 && (
        <Row className="mt-3">
          <Col>
            <div className="card">
              <div className="card-header"><strong>Historique</strong></div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {history.map((entry) => {
                    const actor = entry.utilisateur
                      ? `${entry.utilisateur.prenom || ''} ${entry.utilisateur.nom || ''}`.trim()
                      : 'Système';
                    const date = new Date(entry.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
                    return (
                      <li key={entry.id} className="list-group-item d-flex justify-content-between align-items-start gap-2 py-2">
                        <div>
                          <span className="badge info me-2">{entry.action}</span>
                          <small className="text-muted">{actor}</small>
                          {entry.metadata?.commentaire && (
                            <div className="small text-muted mt-1">« {entry.metadata.commentaire} »</div>
                          )}
                        </div>
                        <small className="text-muted text-nowrap">{date}</small>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Modal suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>
            {['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager')
              ? "Confirmer l'annulation"
              : 'Confirmer la suppression'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager')
            ? "Êtes-vous sûr de vouloir annuler ce congé validé ? Le solde de l'employé sera recalculé automatiquement et il sera notifié."
            : 'Êtes-vous sûr de vouloir supprimer cette demande de congé ? Cette action est irréversible.'}

          {['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') && (
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
            onClick={() => { setShowDeleteModal(false); setCancelComment(''); }}
            disabled={actionLoading}
          >
            Fermer
          </Button>
          <AsyncButton
            variant="danger"
            onClick={handleDelete}
            disabled={actionLoading || (['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') && !cancelComment.trim())}
            action={action}
            loadingText={['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? 'Annulation...' : 'Suppression...'}
          >
            {['admin_entreprise', 'super_admin'].includes(user?.role) && (conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? 'Annuler le congé' : 'Supprimer'}
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* Modal commentaire refus */}
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
          <Button variant="secondary" onClick={() => setShowCommentModal(false)} disabled={actionLoading}>Annuler</Button>
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

      {/* Modal confirmation validation */}
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
          <Button variant="secondary" onClick={() => setShowValidateModal(false)} disabled={actionLoading}>Annuler</Button>
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
