/**
 * Service API pour les politiques de congés
 */

import { api } from './api';

export const leavePoliciesAPI = {
  /**
   * Récupérer la politique de l'entreprise
   */
  getPolicy: async (entrepriseId = null) => {
    const response = await api.get('/leave-policies', {
      params: entrepriseId ? { entreprise_id: entrepriseId } : {},
    });
    return response.data.data;
  },

  /**
   * Mettre à jour la politique de l'entreprise
   */
  updatePolicy: async (policyData, entrepriseId = null) => {
    const payload = { ...policyData };
    if (entrepriseId) {
      payload.entreprise_id = entrepriseId;
    }
    const response = await api.put('/leave-policies', payload);
    return response.data.data;
  },

  /**
   * Valider si une modification de congé est autorisée
   */
  validateModification: async (params) => {
    const response = await api.post('/leave-policies/validate-modification', {
      conge_id: params.congeId,
      conge_status: params.congeStatus,
      conge_start_date: params.congeStartDate,
    });
    return response.data.data;
  },

  /**
   * Valider si une annulation de congé est autorisée
   */
  validateCancellation: async (params) => {
    const response = await api.post('/leave-policies/validate-cancellation', {
      conge_id: params.congeId,
      conge_status: params.congeStatus,
      conge_start_date: params.congeStartDate,
    });
    return response.data.data;
  },
};

export default leavePoliciesAPI;
