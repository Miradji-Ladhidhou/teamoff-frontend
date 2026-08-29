import './conge-details.css';
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaClock, FaCheck, FaTimes, FaCalendarAlt, FaComment, FaList, FaFilePdf } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const DEFAULT_SELF_CANCELLATION_POLICY = {
  allow_employee_cancel_own_pending: true,
  allow_manager_cancel_own_pending: true,
  allow_modify_validated: false,
  allow_cancel_validated: false,
  min_notice_days: 0,
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
  const isAdminLevel = isSuperAdmin || user?.role === 'admin_entreprise';
  const canSeeAllComments = ['admin_entreprise', 'super_admin', 'manager'].includes(user?.role);

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
  const [selfCancellationPolicy, setSelfCancellationPolicy] = useState(DEFAULT_SELF_CANCELLATION_POLICY);
  const [history, setHistory] = useState([]);
  const [jourDetail, setJourDetail] = useState(null);
  const action = useAsyncAction();

  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showModifyRequestModal, setShowModifyRequestModal] = useState(false);
  const [cancelRequestComment, setCancelRequestComment] = useState('');
  const [modifyRequestComment, setModifyRequestComment] = useState('');
  const [modifyRequestDateDebut, setModifyRequestDateDebut] = useState('');
  const [modifyRequestDateFin, setModifyRequestDateFin] = useState('');
  const [modifyPreviewDays, setModifyPreviewDays] = useState(null);
  const [modifyPreviewLoading, setModifyPreviewLoading] = useState(false);
  const modifyDebounceRef = useRef(null);

  useEffect(() => {
    loadCongeDetails();
    congesService.getHistory(id)
      .then((res) => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    congesService.getAttestationData(id)
      .then((res) => setJourDetail(res.data?.jours || null))
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
          allow_modify_validated: Boolean(pub.allow_modify_validated),
          allow_cancel_validated: Boolean(pub.allow_cancel_validated),
          min_notice_days: Number(pub.min_notice_days || 0),
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
      const status = err.response?.status;
      if (status === 403 || status === 404) {
        const backRoute = isSuperAdmin ? '/superadmin/leaves' : '/mes-conges';
        navigate(backRoute, { replace: true });
        return;
      }
      alert.error('Erreur lors du chargement des détails du congé');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    await action.run(async () => {
      try {
        const isValidatedLeaveCancel = conge?.statut === 'valide_final' || conge?.statut === 'valide_manager';
        await congesService.delete(id, isValidatedLeaveCancel ? { commentaire: cancelComment.trim() } : {});
        alert.success('Demande de congé supprimée.');
        navigate('/conges', { replace: true });
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
          alert.success('Congé validé avec succès.');
        } else if (newStatus === 'refuse') {
          await congesService.reject(id, { commentaire: comment });
          alert.info('Congé refusé.');
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

  // Calcul temps réel des jours ouvrés pour la demande de modification
  useEffect(() => {
    if (!modifyRequestDateDebut || !modifyRequestDateFin || modifyRequestDateFin < modifyRequestDateDebut) {
      setModifyPreviewDays(null);
      return;
    }
    clearTimeout(modifyDebounceRef.current);
    setModifyPreviewLoading(true);
    modifyDebounceRef.current = setTimeout(async () => {
      try {
        const res = await congesService.calculateDays({
          date_debut: modifyRequestDateDebut,
          date_fin: modifyRequestDateFin,
          debut_demi_journee: 'matin',
          fin_demi_journee: 'apres_midi',
        });
        setModifyPreviewDays(res.data.jours ?? null);
      } catch {
        setModifyPreviewDays(null);
      } finally {
        setModifyPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(modifyDebounceRef.current);
  }, [modifyRequestDateDebut, modifyRequestDateFin]);

  const handleSubmitCancelRequest = async () => {
    await action.run(async () => {
      try {
        await congesService.submitActionRequest(id, {
          type: 'cancel',
          commentaire: cancelRequestComment.trim(),
        });
        alert.success('Demande d\'annulation envoyée à l\'administrateur.');
        setShowCancelRequestModal(false);
        setCancelRequestComment('');
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors de l\'envoi de la demande');
      }
    });
  };

  const handleSubmitModifyRequest = async () => {
    await action.run(async () => {
      try {
        await congesService.submitActionRequest(id, {
          type: 'modify',
          commentaire: modifyRequestComment.trim(),
          date_debut_demandee: modifyRequestDateDebut,
          date_fin_demandee: modifyRequestDateFin,
        });
        alert.success('Demande de modification envoyée à l\'administrateur.');
        setShowModifyRequestModal(false);
        setModifyRequestComment('');
        setModifyRequestDateDebut('');
        setModifyRequestDateFin('');
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors de l\'envoi de la demande');
      }
    });
  };

  const actionLoading = action.isRunning;

  const getStatusAccent = (statut) => {
    const map = {
      reserve: 'reserve',
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
      reserve: 'Réservé',
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
    if (isSuperAdmin || user?.role === 'admin_entreprise') {
      return conge.statut === 'valide_final' || conge.statut === 'en_attente_manager';
    }
    if (conge.utilisateur_id !== user?.id) return false;
    if (conge.statut === 'en_attente_manager') return true;
    // Validated leaves: employees use the request flow (canRequestModify), not direct edit
    return false;
  };

  const canRequestModify = () => {
    if (!conge || isAdminLevel) return false;
    if (conge.utilisateur_id !== user?.id) return false;
    const isValidated = conge.statut === 'valide_final' || conge.statut === 'valide_manager';
    return isValidated && selfCancellationPolicy.allow_modify_validated;
  };

  const canRequestCancel = () => {
    if (!conge || isAdminLevel) return false;
    if (conge.utilisateur_id !== user?.id) return false;
    const isValidated = conge.statut === 'valide_final' || conge.statut === 'valide_manager';
    return isValidated && selfCancellationPolicy.allow_cancel_validated;
  };

  const canDelete = () => {
    if (!conge) return false;
    const isOwnLeave = conge.utilisateur_id === user?.id;
    const isValidatedLeave = conge.statut === 'valide_final' || conge.statut === 'valide_manager';

    if (isOwnLeave && conge.statut === 'reserve') return true;

    if (isOwnLeave && conge.statut === 'en_attente_manager') {
      if (['employe', 'apprenti'].includes(user?.role)) return selfCancellationPolicy.allow_employee_cancel_own_pending;
      if (user?.role === 'manager') return selfCancellationPolicy.allow_manager_cancel_own_pending;
      return true;
    }

    // Employees/managers use the request flow (canRequestCancel) for validated leaves
    if ((isSuperAdmin || user?.role === 'admin_entreprise') && isValidatedLeave) {
      return true;
    }

    return false;
  };

  const canApprove = () => {
    if (!conge) return false;
    const workflow = conge.effective_approval_workflow;
    if (workflow === 'auto') return false;
    if (user?.role === 'manager') {
      if (conge.utilisateur_id === user?.id) return false;
      if (workflow === 'admin_only') return false;
      return conge.statut === 'en_attente_manager';
    }
    if (isSuperAdmin || user?.role === 'admin_entreprise') {
      if (workflow === 'manager' || workflow === 'manager_only') return false;
      if (workflow === 'admin_only') return ['en_attente_manager', 'valide_manager'].includes(conge.statut);
      if (workflow === 'manager_admin') return conge.statut === 'valide_manager';
      return conge.statut === 'en_attente_manager' || conge.statut === 'valide_manager';
    }
    return false;
  };

  const canActivate = () => {
    if (!conge) return false;
    return conge.statut === 'reserve' && ['manager', 'admin_entreprise', 'super_admin'].includes(user?.role);
  };

  // Pour les champs DATEONLY (YYYY-MM-DD), new Date('YYYY-MM-DD') produit UTC minuit
  // ce qui décale d'un jour en fuseaux UTC-. On parse comme minuit local si pas de 'T'.
  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString === 'string' && dateString.length === 10 && !dateString.includes('T')) {
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateString);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parsedDate = parseLocalDate(dateString);
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const parsedDate = parseLocalDate(dateString);
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) return '-';
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

      {/* Actions header (modifier / attestation / annuler) */}
      <div className="d-flex flex-wrap justify-content-end gap-2 mb-3">
        {conge?.statut === 'valide_final' && (
          <Button
            size="sm"
            onClick={() => window.open(`/conges/${id}/attestation`, '_blank')}
            style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontWeight: 700 }}
          >
            <FaFilePdf className="me-1" /> Attestation PDF
          </Button>
        )}
        {canEdit() && (
          <Button as={Link} to={`/conges/${id}/edit`} variant="outline-primary" size="sm">
            <FaEdit className="me-1" /> Modifier
          </Button>
        )}
        {canRequestModify() && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => {
              const toInputDate = (s) => s ? s.split('T')[0] : '';
              setModifyRequestDateDebut(toInputDate(conge?.date_debut));
              setModifyRequestDateFin(toInputDate(conge?.date_fin));
              setModifyRequestComment('');
              setShowModifyRequestModal(true);
            }}
          >
            <FaEdit className="me-1" /> Demander la modification
          </Button>
        )}
      </div>

      <Row>
        <Col md={8} className="order-last order-md-first">
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
            {['manager', 'admin_entreprise', 'super_admin'].includes(user?.role) && conge?.effective_approval_workflow && (
              <div className="info-row">
                <span className="info-label">Workflow (figé)</span>
                <span className="info-value">
                  {{
                    auto: 'Automatique',
                    manager_only: 'Manager seul',
                    manager: 'Manager seul',
                    admin_only: 'Admin seul',
                    manager_admin: 'Manager → Admin',
                  }[conge.effective_approval_workflow] || conge.effective_approval_workflow}
                </span>
              </div>
            )}
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

          {/* Commentaires */}
          {(canSeeAllComments || conge.utilisateur_id === user?.id) && (conge.commentaire_employe || conge.commentaire_manager || conge.commentaire_admin) && (
            <div className="mb-3">
              {conge.commentaire_employe && (
                <div className="comment-block mb-2">
                  <div style={{ fontSize: '10px', color: 'var(--text-muted, var(--dk-text-muted))', marginBottom: 4 }}>Employé</div>
                  <div style={{ fontSize: '12px', color: 'var(--text, var(--dk-text))' }}>
                    <FaComment size={10} className="me-2" style={{ opacity: 0.5 }} />
                    {conge.commentaire_employe}
                  </div>
                </div>
              )}
              {conge.commentaire_manager && (
                <div className={`comment-block mb-2${['refuse_manager', 'refuse_final'].includes(conge.statut) ? ' comment-block--danger' : ''}`}>
                  <div style={{ fontSize: '10px', color: ['refuse_manager', 'refuse_final'].includes(conge.statut) ? 'var(--accent-red, var(--dk-error))' : 'var(--text-muted, var(--dk-text-muted))', marginBottom: 4 }}>Manager</div>
                  <div style={{ fontSize: '12px', color: 'var(--text, var(--dk-text))' }}>
                    <FaComment size={10} className="me-2" style={{ opacity: 0.5 }} />
                    {conge.commentaire_manager}
                  </div>
                </div>
              )}
              {conge.commentaire_admin && (
                <div className={`comment-block mb-2${conge.statut === 'refuse_final' ? ' comment-block--danger' : ''}`}>
                  <div style={{ fontSize: '10px', color: conge.statut === 'refuse_final' ? 'var(--accent-red, var(--dk-error))' : 'var(--text-muted, var(--dk-text-muted))', marginBottom: 4 }}>Administration</div>
                  <div style={{ fontSize: '12px', color: 'var(--text, var(--dk-text))' }}>
                    <FaComment size={10} className="me-2" style={{ opacity: 0.5 }} />
                    {conge.commentaire_admin}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Décompte des jours */}
          {jourDetail && (
            <Card className="mb-3">
              <Card.Body>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--dk-accent, #5b8dee)', marginBottom: '0.6rem' }}>
                  Décompte des jours
                </div>
                <div className="decompte-box">

                  {/* Période */}
                  <div className="decompte-row">
                    <span className="decompte-lbl">Période</span>
                    <span className="decompte-val" style={{ fontSize: '0.78rem' }}>
                      {formatDateShort(jourDetail.date_debut || conge.date_debut)} → {formatDateShort(jourDetail.date_fin || conge.date_fin)}
                    </span>
                  </div>

                  {/* Samedis — politique entreprise */}
                  {jourDetail.politique !== undefined && (
                    <div className="decompte-row">
                      <span className="decompte-lbl">
                        Samedis
                        <span className={`decompte-tag ${jourDetail.politique.count_saturday ? 'decompte-tag--inclus' : 'decompte-tag--exclu'}`}>
                          {jourDetail.politique.count_saturday ? 'comptés' : 'non comptés'}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Dimanches — politique entreprise */}
                  {jourDetail.politique !== undefined && (
                    <div className="decompte-row">
                      <span className="decompte-lbl">
                        Dimanches
                        <span className={`decompte-tag ${jourDetail.politique.count_sunday ? 'decompte-tag--inclus' : 'decompte-tag--exclu'}`}>
                          {jourDetail.politique.count_sunday ? 'comptés' : 'non comptés'}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Jours fériés */}
                  {(() => {
                    const feries = jourDetail.detail.filter(d => d.type === 'ferie');
                    return (
                      <>
                        <div className="decompte-row">
                          <span className="decompte-lbl">
                            dont {feries.length} jour{feries.length !== 1 ? 's' : ''} férié{feries.length !== 1 ? 's' : ''}
                            {feries.length > 0 && <span className="decompte-tag decompte-tag--exclu">non compté</span>}
                          </span>
                          {feries.length > 0
                            ? <span className="decompte-val decompte-val--minus">−{feries.length} j</span>
                            : <span className="decompte-val decompte-val--muted">—</span>
                          }
                        </div>
                        {feries.map((d, i) => (
                          <div key={i} className="decompte-row decompte-row--sub">
                            <span className="decompte-lbl">{d.label} — {formatDateShort(d.date + 'T00:00:00')}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  {/* Demi-journée si présente */}
                  {parseFloat(conge.calcul_details?.jours_demi_journees_deduites) > 0 && (
                    <div className="decompte-row">
                      <span className="decompte-lbl">Demi-journée</span>
                      <span className="decompte-val decompte-val--minus">−{formatDays(conge.calcul_details.jours_demi_journees_deduites)} j</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="decompte-row decompte-row--total">
                    <span className="decompte-lbl" style={{ color: 'var(--dk-text)' }}>= Jours comptabilisés</span>
                    <span className="decompte-val decompte-val--total">{jourDetail.ouvres} j</span>
                  </div>

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

        </Col>

        <Col md={4} className="order-first order-md-last">
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

          {/* Activer la réservation */}
          {canActivate() && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Actions</h6>
              </Card.Header>
              <Card.Body>
                <p className="small text-muted mb-3">
                  Cette demande est actuellement en statut <strong>Réservé</strong>. Activez-la pour lancer le circuit de validation normal (manager → admin).
                </p>
                <button
                  className="btn-approve"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed', color: '#fff', width: '100%' }}
                  disabled={actionLoading}
                  onClick={() => action.run(async () => {
                    try {
                      await congesService.activate(conge.id);
                      alert.success('Demande activée avec succès.');
                      const updated = await congesService.getById(conge.id);
                      setConge(updated.data);
                    } catch (err) {
                      alert.error(err.response?.data?.message || 'Erreur lors de l\'activation');
                    }
                  })}
                >
                  {actionLoading ? <Spinner size="sm" /> : <><FaCheck size={10} className="me-1" /> Activer la demande</>}
                </button>
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
              {(conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? (
                <><FaTimes size={11} className="me-2" />Annuler le congé</>
              ) : (
                <><FaTimes size={11} className="me-2" />Annuler la demande</>
              )}
            </button>
          )}
          {canRequestCancel() && (
            <button
              className="btn-ghost-danger"
              onClick={() => { setCancelRequestComment(''); setShowCancelRequestModal(true); }}
            >
              <FaTimes size={11} className="me-2" />Demander l&apos;annulation
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
          <Modal.Title>Confirmer l&apos;annulation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(conge?.statut === 'valide_final' || conge?.statut === 'valide_manager')
            ? "Êtes-vous sûr de vouloir annuler ce congé validé ? Le solde sera recalculé automatiquement."
            : "Êtes-vous sûr de vouloir annuler cette demande de congé ? Le manager sera notifié par email."}

          {(conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') && (
            <Form.Group className="mt-3">
              <Form.Label>Commentaire d&apos;annulation (requis)</Form.Label>
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
            disabled={actionLoading || ((conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') && !cancelComment.trim())}
            action={action}
            loadingText={(conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? 'Annulation...' : 'Suppression...'}
          >
            {(conge?.statut === 'valide_final' || conge?.statut === 'valide_manager') ? 'Annuler le congé' : 'Supprimer'}
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
      {/* Modal demande d'annulation (employé → congé validé) */}
      <Modal show={showCancelRequestModal} onHide={() => setShowCancelRequestModal(false)} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Demander l&apos;annulation du congé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">
            Votre demande d&apos;annulation sera transmise à l&apos;administrateur pour validation. Votre congé reste inchangé jusqu&apos;à la décision.
          </p>
          <Form.Group>
            <Form.Label>Motif de la demande (requis)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelRequestComment}
              onChange={(e) => setCancelRequestComment(e.target.value)}
              placeholder="Expliquez la raison de votre demande d'annulation..."
              disabled={actionLoading}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelRequestModal(false)} disabled={actionLoading}>Fermer</Button>
          <AsyncButton
            variant="danger"
            onClick={handleSubmitCancelRequest}
            disabled={actionLoading || !cancelRequestComment.trim()}
            action={action}
            loadingText="Envoi..."
          >
            Envoyer la demande
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* Modal demande de modification (employé → congé validé) */}
      <Modal show={showModifyRequestModal} onHide={() => { setShowModifyRequestModal(false); setModifyPreviewDays(null); }} backdrop="static" keyboard={!actionLoading} centered>
        <Modal.Header closeButton={!actionLoading}>
          <Modal.Title>Demander la modification du congé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">
            Votre demande sera transmise pour validation. Votre congé actuel reste inchangé jusqu&apos;à la décision.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <Form.Group>
              <Form.Label style={{ fontSize: '13px', fontWeight: 600 }}>Nouvelle date de début</Form.Label>
              <Form.Control
                type="date"
                value={modifyRequestDateDebut}
                onChange={(e) => setModifyRequestDateDebut(e.target.value)}
                disabled={actionLoading}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label style={{ fontSize: '13px', fontWeight: 600 }}>Nouvelle date de fin</Form.Label>
              <Form.Control
                type="date"
                value={modifyRequestDateFin}
                min={modifyRequestDateDebut || undefined}
                onChange={(e) => setModifyRequestDateFin(e.target.value)}
                disabled={actionLoading}
                required
              />
            </Form.Group>
          </div>

          {/* Preview jours ouvrés */}
          {(modifyRequestDateDebut && modifyRequestDateFin) && (
            <div style={{
              border: '1px solid',
              borderColor: modifyPreviewDays === 0 ? '#dc3545' : modifyPreviewDays > 0 ? '#198754' : '#dee2e6',
              borderRadius: 8,
              padding: '0.6rem 0.9rem',
              marginBottom: '1rem',
              background: modifyPreviewDays === 0 ? '#fff5f5' : modifyPreviewDays > 0 ? '#f0faf4' : 'var(--dk-card, #f8f9fa)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '13px',
            }}>
              {modifyPreviewLoading ? (
                <><Spinner animation="border" size="sm" /><span className="text-muted">Calcul en cours…</span></>
              ) : modifyPreviewDays === null ? (
                <span className="text-muted">Sélectionnez les deux dates pour voir le décompte</span>
              ) : modifyPreviewDays <= 0 ? (
                <span style={{ color: '#dc3545', fontWeight: 600 }}>
                  ⚠ 0 jour ouvré — ces dates tombent uniquement sur des week-ends, jours fériés ou jours bloqués. Choisissez d&apos;autres dates.
                </span>
              ) : (
                <span style={{ color: '#198754' }}>
                  <strong>{modifyPreviewDays}</strong> jour{modifyPreviewDays > 1 ? 's' : ''} ouvré{modifyPreviewDays > 1 ? 's' : ''} décompté{modifyPreviewDays > 1 ? 's' : ''}
                  {conge && conge.jours_decomptes > 0 && (
                    <span style={{ color: '#6c757d', fontWeight: 400 }}>
                      {' '}(congé actuel : {conge.jours_decomptes} j — différence :{' '}
                      <span style={{ color: modifyPreviewDays > conge.jours_decomptes ? '#dc3545' : '#198754', fontWeight: 600 }}>
                        {modifyPreviewDays > conge.jours_decomptes ? '+' : ''}{(modifyPreviewDays - conge.jours_decomptes).toFixed(1).replace('.0', '')} j
                      </span>)
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          <Form.Group>
            <Form.Label style={{ fontSize: '13px', fontWeight: 600 }}>Motif de la demande (requis)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={modifyRequestComment}
              onChange={(e) => setModifyRequestComment(e.target.value)}
              placeholder="Expliquez la raison de votre demande de modification…"
              disabled={actionLoading}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModifyRequestModal(false); setModifyPreviewDays(null); }} disabled={actionLoading}>Fermer</Button>
          <AsyncButton
            variant="primary"
            onClick={handleSubmitModifyRequest}
            disabled={actionLoading || !modifyRequestComment.trim() || !modifyRequestDateDebut || !modifyRequestDateFin || modifyPreviewDays === 0 || modifyPreviewLoading}
            action={action}
            loadingText="Envoi…"
          >
            Envoyer la demande
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CongeDetailsPage;
