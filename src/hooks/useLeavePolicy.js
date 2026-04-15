/**
 * Hook personnalisé pour la gestion des politiques de congés
 * Centralise la logique de validation et récupération de la policy
 */

import { useState, useEffect, useCallback } from 'react';
import leavePoliciesAPI from '../services/leavePoliciesAPI';
import { useAuth } from '../contexts/AuthContext';

export const useLeavePolicy = () => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger la politique au montage
  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await leavePoliciesAPI.getPolicy();
        setPolicy(data);
      } catch (err) {
        console.error('Erreur lors du chargement de la politique:', err);
        setError(err.message || 'Erreur lors du chargement de la politique');
        setPolicy(null);
      } finally {
        setLoading(false);
      }
    };

    if (user?.entreprise_id) {
      loadPolicy();
    }
  }, [user?.entreprise_id]);

  /**
   * Valider si une modification est autorisée
   * @param {Object} params
   * @param {string} params.congeId - ID du congé
   * @param {string} params.congeStatus - Statut actuel (en_attente_manager, valide_manager, valide_final, etc.)
   * @param {Date|string} params.congeStartDate - Date de début
   * @returns {Promise<{allowed: boolean, reason?: string, code?: string}>}
   */
  const validateModification = useCallback(async (params) => {
    try {
      const result = await leavePoliciesAPI.validateModification({
        congeId: params.congeId,
        congeStatus: params.congeStatus,
        congeStartDate: params.congeStartDate,
      });
      return result;
    } catch (err) {
      console.error('Erreur lors de la validation de modification:', err);
      return {
        allowed: false,
        reason: 'Erreur lors de la validation',
        code: 'VALIDATION_ERROR',
      };
    }
  }, []);

  /**
   * Valider si une annulation est autorisée
   * @param {Object} params
   * @param {string} params.congeId - ID du congé
   * @param {string} params.congeStatus - Statut actuel
   * @param {Date|string} params.congeStartDate - Date de début
   * @returns {Promise<{allowed: boolean, reason?: string, code?: string}>}
   */
  const validateCancellation = useCallback(async (params) => {
    try {
      const result = await leavePoliciesAPI.validateCancellation({
        congeId: params.congeId,
        congeStatus: params.congeStatus,
        congeStartDate: params.congeStartDate,
      });
      return result;
    } catch (err) {
      console.error('Erreur lors de la validation d\'annulation:', err);
      return {
        allowed: false,
        reason: 'Erreur lors de la validation',
        code: 'VALIDATION_ERROR',
      };
    }
  }, []);

  /**
   * Vérifier si les modifications/annulations sur congé validé sont autorisées
   */
  const canModifyValidated = useCallback(() => {
    return policy?.allow_modify_validated === true;
  }, [policy]);

  const canCancelValidated = useCallback(() => {
    return policy?.allow_cancel_validated === true;
  }, [policy]);

  /**
   * Obtenir les délais/limites textuels
   */
  const getPolicyDescription = useCallback(() => {
    if (!policy) return null;

    return {
      minNoticeText: `${policy.min_notice_days} jour(s) minimum de préavis`,
      maxBackdateText:
        policy.max_backdate_days > 0
          ? `Modifications rétroactives de jusqu'à ${policy.max_backdate_days} jour(s) autorisées`
          : 'Aucune modification rétroactive autorisée',
      requiresManagerApproval: policy.require_manager_approval,
      requiresAdminApproval: policy.require_admin_approval,
      allowsModifyValidated: policy.allow_modify_validated,
      allowsCancelValidated: policy.allow_cancel_validated,
    };
  }, [policy]);

  return {
    policy,
    loading,
    error,
    validateModification,
    validateCancellation,
    canModifyValidated,
    canCancelValidated,
    getPolicyDescription,
  };
};

export default useLeavePolicy;
