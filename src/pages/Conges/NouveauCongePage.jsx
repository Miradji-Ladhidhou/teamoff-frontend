import './nouveau-conge.css';
import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, congeTypesService, quotasService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import useLeavePolicy from '../../hooks/useLeavePolicy';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import AsyncButton from '../../components/AsyncButton';

const NouveauCongePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const canCreateLeave = ['employe', 'manager', 'super_admin'].includes(user?.role);
  const canAccessPage = isEditMode
    ? ['employe', 'manager', 'admin_entreprise', 'super_admin'].includes(user?.role)
    : canCreateLeave;
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
  const submitCongeAction = useAsyncAction();
  const [loadingData, setLoadingData] = useState(true);
  const alert = useAlert();
  const [validationErrors, setValidationErrors] = useState({});
  const [joursCalcules, setJoursCalcules] = useState(null);
  const [joursPolitique, setJoursPolitique] = useState(null);
  const [calculLoading, setCalculLoading] = useState(false);
  const calcDebounceRef = useRef(null);
  const [initialCongeStatut, setInitialCongeStatut] = useState(null);
  const [initialCongeSnapshot, setInitialCongeSnapshot] = useState(null);
  const [formDirty, setFormDirty] = useState(false);
  const submittedRef = useRef(false);
  useUnsavedChanges(formDirty && !submittedRef.current);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const { validateModification } = useLeavePolicy();
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
  }, [id, user?.id, user?.role]);

  useEffect(() => {
    if (!formData.date_debut || !formData.date_fin || !formData.conge_type_id) {
      setJoursCalcules(null);
      setJoursPolitique(null);
      return;
    }
    clearTimeout(calcDebounceRef.current);
    calcDebounceRef.current = setTimeout(async () => {
      try {
        setCalculLoading(true);
        const res = await congesService.calculateDays({
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
          debut_demi_journee: formData.debut_demi_journee || 'matin',
          fin_demi_journee: formData.fin_demi_journee || 'apres_midi',
        });
        setJoursCalcules(res.data.jours);
        setJoursPolitique(res.data.politique);
      } catch {
        setJoursCalcules(null);
        setJoursPolitique(null);
      } finally {
        setCalculLoading(false);
      }
    }, 400);
    return () => clearTimeout(calcDebounceRef.current);
  }, [formData.date_debut, formData.date_fin, formData.debut_demi_journee, formData.fin_demi_journee, formData.conge_type_id]);

  const loadInitialData = async () => {
    if (!canAccessPage) {
      navigate(returnPath, { replace: true });
      return;
    }

    try {
      setLoadingData(true);

      if (isEditMode) {
        const [typesResponse, congeResponse] = await Promise.all([
          congeTypesService.getAll(),
          congesService.getById(id)
        ]);

        setCongeTypes(Array.isArray(typesResponse.data) ? typesResponse.data : []);

        if (congeResponse?.data) {
          const conge = congeResponse.data;
          setInitialCongeStatut(conge.statut || null);
          setInitialCongeSnapshot({
            conge_type_id: conge.conge_type_id || '',
            date_debut: conge.date_debut ? conge.date_debut.split('T')[0] : '',
            jours_calcules: Number(conge.jours_calcules || conge.nombre_jours || conge.jours_pris || 0),
          });
          const targetUserId = conge.utilisateur_id || user.id;
          const soldesResponse = await quotasService.getSoldes(targetUserId);
          setSoldes(Array.isArray(soldesResponse.data?.soldes) ? soldesResponse.data.soldes : []);

          setFormData({
            conge_type_id: conge.conge_type_id || '',
            date_debut: conge.date_debut ? conge.date_debut.split('T')[0] : '',
            date_fin: conge.date_fin ? conge.date_fin.split('T')[0] : '',
            debut_demi_journee: conge.debut_demi_journee || '',
            fin_demi_journee: conge.fin_demi_journee || '',
            commentaire_employe: conge.commentaire_employe || ''
          });
        }
      } else {
        const [typesResponse, soldesResponse] = await Promise.all([
          congeTypesService.getAll(),
          quotasService.getSoldes(user.id),
        ]);

        setCongeTypes(Array.isArray(typesResponse.data) ? typesResponse.data : []);
        setSoldes(Array.isArray(soldesResponse.data?.soldes) ? soldesResponse.data.soldes : []);
      }

    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 404) {
        navigate(returnPath, { replace: true });
        return;
      }
      alert.error('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormDirty(true);
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
    const isAdminEditingValidatedConge =
      isEditMode
      && user?.role === 'admin_entreprise'
      && initialCongeStatut === 'valide_final';
    const isEditingPendingConge = isEditMode && initialCongeStatut === 'en_attente_manager';

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
    const demiJourneeBloquee = selectedType && selectedType.demi_journee_autorisee === false;
    if (
      demiJourneeBloquee
      && (formData.debut_demi_journee || formData.fin_demi_journee)
    ) {
      errors.conge_type_id = 'Ce type de congé n\'autorise pas les demi-journées';
    }

    // Vérifier le solde disponible
    if (!isAdminEditingValidatedConge && formData.conge_type_id && joursCalcules > 0) {
      const soldeType = soldes.find(s => s.conge_type_id === formData.conge_type_id);
      const currentRequestDays = Number(initialCongeSnapshot?.jours_calcules || 0);
      const initialTypeId = initialCongeSnapshot?.conge_type_id || '';
      const initialYear = initialCongeSnapshot?.date_debut
        ? new Date(initialCongeSnapshot.date_debut).getFullYear()
        : null;
      const nextYear = formData.date_debut ? new Date(formData.date_debut).getFullYear() : null;
      const sameCounterAsInitial = isEditingPendingConge
        && initialTypeId === formData.conge_type_id
        && initialYear !== null
        && initialYear === nextYear;
      const effectiveAvailable = Number(soldeType?.solde_disponible || 0) + (sameCounterAsInitial ? currentRequestDays : 0);

      if (soldeType && joursCalcules > effectiveAvailable) {
        errors.conge_type_id = `Solde insuffisant (${effectiveAvailable} jours disponibles)`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractApiErrorMessage = (err, fallbackMessage) => {
    const data = err?.response?.data;

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (typeof firstError === 'string' && firstError.trim()) {
        return firstError.trim();
      }
      if (typeof firstError?.msg === 'string' && firstError.msg.trim()) {
        return firstError.msg.trim();
      }
      if (typeof firstError?.message === 'string' && firstError.message.trim()) {
        return firstError.message.trim();
      }
    }

    if (err?.code === 'ECONNABORTED') {
      return 'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.';
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message.trim();
    }

    return fallbackMessage;
  };

  const buildPayload = (data) => {
    const payload = {
      conge_type_id: data.conge_type_id,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      commentaire_employe: data.commentaire_employe || null,
    };
    if (data.debut_demi_journee) payload.debut_demi_journee = data.debut_demi_journee;
    if (data.fin_demi_journee) payload.fin_demi_journee = data.fin_demi_journee;
    return payload;
  };

  const submitCreateLeave = async (precheckWarning = null) => {
    try {
      const response = await congesService.create(buildPayload(formData));
      const warningMessage = response?.data?.overlap_warning?.message;
      if (warningMessage && warningMessage !== precheckWarning) {
        alert.showErrorModal(warningMessage, {
          title: 'Chevauchement détecté',
          autoCloseMs: 0,
        });
      }
      submittedRef.current = true;
      navigate(returnPath);
    } catch (err) {
      console.error('Erreur lors de la création du congé:', err);
      const finalMessage = extractApiErrorMessage(err, 'Impossible de créer la demande de congé.');
      alert.error(finalMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditMode && !canCreateLeave) {
      alert.error('Vous n\'êtes pas autorisé à créer une demande de congé.');
      return;
    }

    if (!validateForm()) return;

    await submitCongeAction.run(async () => {
      try {
        let response;
        let precheckWarningMessage = null;

        if (isEditMode) {
          const policyValidation = await validateModification({
            congeId: id,
            congeStatus: initialCongeStatut,
            congeStartDate: formData.date_debut,
          });

          if (!policyValidation?.allowed) {
            alert.error(policyValidation?.reason || 'Modification non autorisée par la politique de congés.');
            return;
          }

          response = await congesService.update(id, buildPayload(formData));
        } else {
          const overlapCheck = await congesService.checkOverlap(formData);
          const overlapAction = overlapCheck?.data?.action;
          const overlapMessage = overlapCheck?.data?.message;

          if (overlapAction === 'block') {
            const blockMessage = overlapMessage || 'Cette demande est bloquée par la politique de chevauchement.';
            alert.error(blockMessage);
            return;
          }

          if (overlapAction === 'warning') {
            const warningMessage = overlapMessage || 'Attention: un chevauchement a été détecté.';
            precheckWarningMessage = warningMessage;
            alert.confirm({
              title: 'Chevauchement détecté',
              description: `${warningMessage}\n\nVous pouvez poursuivre l'envoi, mais cette demande nécessitera une vigilance particulière côté validation.`,
              confirmLabel: 'Confirmer et envoyer',
              cancelLabel: 'Modifier ma demande',
              danger: true,
              onConfirm: async () => {
                await submitCreateLeave(precheckWarningMessage);
              },
              onCancel: () => {
                alert.error('Demande non envoyée.');
              },
            });
            return;
          }

          await submitCreateLeave(precheckWarningMessage);
          return;
        }

        const warningMessage = response?.data?.overlap_warning?.message;
        if (warningMessage && warningMessage !== precheckWarningMessage) {
          alert.showErrorModal(warningMessage, {
            title: 'Chevauchement détecté',
            autoCloseMs: 0,
          });
        }

        submittedRef.current = true;
        navigate(returnPath);
      } catch (err) {
        console.error(`Erreur lors de ${isEditMode ? 'la modification' : 'la création'} du congé:`, err);
        const fallbackMessage = isEditMode
          ? 'Impossible de modifier la demande de congé.'
          : 'Impossible de créer la demande de congé.';
        const finalMessage = extractApiErrorMessage(err, fallbackMessage);
        alert.error(finalMessage);
      }
    });
  };

  const loading = submitCongeAction.isRunning;

  const getSelectedType = () => {
    return congeTypes.find(type => type.id === formData.conge_type_id);
  };

  const getSoldeForType = (typeId) => {
    return soldes.find(s => s.conge_type_id === typeId);
  };

  if (loadingData) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des données...</p>
        </div>
      </Container>
    );
  }

  if (!canAccessPage) {
    return (
      <Container fluid="sm">
        <div className="alert alert-warning">Vous n'êtes pas autorisé à accéder à cette page.</div>
        <Button as={Link} to={returnPath} variant="outline-secondary">Retour</Button>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <div className="d-flex align-items-center gap-3">
          <Button as={Link} to={returnPath} variant="outline-secondary" size="sm">
            <FaArrowLeft />
          </Button>
          <span className="section-title-bar__text">{isEditMode ? 'Modifier la demande' : 'Nouvelle demande'}</span>
        </div>
      </div>

      <div className="nc-form-card">
        <Form onSubmit={handleSubmit}>

          {/* ── Étape 1 : Type ── */}
          <div className="nc-step">
            <div className="nc-step__label">Type de congé</div>
            <Form.Select
              name="conge_type_id"
              value={formData.conge_type_id}
              onChange={handleChange}
              isInvalid={!!validationErrors.conge_type_id}
              className="nc-select"
            >
              <option value="">Choisir un type…</option>
              {congeTypes.map(type => {
                const solde = getSoldeForType(type.id);
                return (
                  <option key={type.id} value={type.id}>
                    {type.libelle}{solde ? ` — ${solde.solde_disponible} j restants` : ''}
                  </option>
                );
              })}
            </Form.Select>
            {validationErrors.conge_type_id && (
              <div className="nc-field-error">{validationErrors.conge_type_id}</div>
            )}

            {/* Indicateur solde inline */}
            {formData.conge_type_id && (() => {
              const solde = getSoldeForType(formData.conge_type_id);
              if (!solde) return null;
              const disponible = Number(solde.solde_disponible ?? 0);
              const apres = disponible - joursCalcules;
              const enDanger = joursCalcules > 0 && apres < 0;
              const avertissement = joursCalcules > 0 && apres >= 0 && apres < 2;
              return (
                <div className={`nc-solde-hint ${enDanger ? 'nc-solde-hint--danger' : avertissement ? 'nc-solde-hint--warn' : 'nc-solde-hint--ok'}`}>
                  <span>{disponible.toFixed(1)} j disponibles</span>
                  {joursCalcules > 0 && (
                    <span>→ <strong>{apres.toFixed(1)} j</strong> après</span>
                  )}
                  {enDanger && <span className="nc-solde-badge">⚠ Solde insuffisant</span>}
                </div>
              );
            })()}

            {getSelectedType()?.demi_journee_autorisee === false && (
              <div className="nc-info-banner">Demi-journées non autorisées pour ce type.</div>
            )}
          </div>

          {/* ── Étape 2 : Dates ── */}
          <div className="nc-step">
            <div className="nc-step__label">Période</div>
            <div className="nc-dates-row">
              <div className="nc-field">
                <label className="nc-field__label">Du</label>
                <Form.Control
                  type="date"
                  name="date_debut"
                  value={formData.date_debut}
                  onChange={handleChange}
                  isInvalid={!!validationErrors.date_debut}
                  min={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
                  className="nc-input"
                />
                {validationErrors.date_debut && (
                  <div className="nc-field-error">{validationErrors.date_debut}</div>
                )}
              </div>
              <div className="nc-dates-arrow">→</div>
              <div className="nc-field">
                <label className="nc-field__label">Au</label>
                <Form.Control
                  type="date"
                  name="date_fin"
                  value={formData.date_fin}
                  onChange={handleChange}
                  isInvalid={!!validationErrors.date_fin}
                  min={formData.date_debut || (isEditMode ? undefined : new Date().toISOString().split('T')[0])}
                  className="nc-input"
                />
                {validationErrors.date_fin && (
                  <div className="nc-field-error">{validationErrors.date_fin}</div>
                )}
              </div>
            </div>

            {/* Demi-journées — masquées si non autorisées */}
            {getSelectedType()?.demi_journee_autorisee !== false && (
              <div className="nc-demijournee-row">
                <div className="nc-field">
                  <label className="nc-field__label">Premier jour</label>
                  <Form.Select
                    name="debut_demi_journee"
                    value={formData.debut_demi_journee}
                    onChange={handleChange}
                    className="nc-select nc-select--sm"
                  >
                    <option value="">Journée entière</option>
                    <option value="apres_midi">À partir de l'après-midi</option>
                  </Form.Select>
                </div>
                <div className="nc-field">
                  <label className="nc-field__label">Dernier jour</label>
                  <Form.Select
                    name="fin_demi_journee"
                    value={formData.fin_demi_journee}
                    onChange={handleChange}
                    isInvalid={!!validationErrors.fin_demi_journee}
                    className="nc-select nc-select--sm"
                  >
                    <option value="">Journée entière</option>
                    <option value="matin">Jusqu'au matin</option>
                  </Form.Select>
                  {validationErrors.fin_demi_journee && (
                    <div className="nc-field-error">{validationErrors.fin_demi_journee}</div>
                  )}
                </div>
              </div>
            )}

            {/* Récap jours calculés */}
            {(formData.date_debut && formData.date_fin && formData.conge_type_id) && (
              <div className="nc-days-preview">
                {calculLoading ? (
                  <><Spinner animation="border" size="sm" className="me-2" /><span className="nc-days-preview__note">Calcul en cours…</span></>
                ) : joursCalcules !== null ? (
                  <>
                    <span className="nc-days-preview__count">{joursCalcules}</span>
                    <span className="nc-days-preview__label">jour{joursCalcules !== 1 ? 's' : ''} décomptés</span>
                    {joursPolitique && (
                      <div className="nc-politique-tags">
                        <span className={`nc-policy-tag nc-policy-tag--${joursPolitique.count_saturday ? 'on' : 'off'}`}>
                          Sam. {joursPolitique.count_saturday ? 'compté' : 'exclu'}
                        </span>
                        <span className={`nc-policy-tag nc-policy-tag--${joursPolitique.count_sunday ? 'on' : 'off'}`}>
                          Dim. {joursPolitique.count_sunday ? 'compté' : 'exclu'}
                        </span>
                        <span className={`nc-policy-tag nc-policy-tag--${joursPolitique.exclude_holidays ? 'off' : 'on'}`}>
                          J. fériés {joursPolitique.exclude_holidays ? 'exclus' : 'comptés'}
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Étape 3 : Commentaire + Envoi ── */}
          <div className="nc-step nc-step--last">
            <div className="nc-step__label">Commentaire <span className="nc-optional">optionnel</span></div>
            <Form.Control
              as="textarea"
              rows={2}
              name="commentaire_employe"
              value={formData.commentaire_employe}
              onChange={handleChange}
              placeholder="Ajouter un commentaire…"
              maxLength={1000}
              className="nc-input"
            />
          </div>

          {/* ── Actions ── */}
          <div className="nc-actions">
            <AsyncButton
              type="submit"
              variant="primary"
              className="nc-btn-submit"
              action={submitCongeAction}
              loadingText={isEditMode ? 'Enregistrement…' : 'Envoi en cours…'}
            >
              {isEditMode ? 'Enregistrer' : 'Envoyer la demande'}
            </AsyncButton>
            <Button as={Link} to={returnPath} variant="outline-secondary" disabled={loading} className="nc-btn-cancel">
              Annuler
            </Button>
          </div>

        </Form>
      </div>

    </Container>
  );
};

export default NouveauCongePage;