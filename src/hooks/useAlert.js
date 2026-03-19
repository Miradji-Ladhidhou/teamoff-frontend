import { useContext, useCallback } from 'react';
import { AlertContext } from '../contexts/AlertContext';

/**
 * useAlert - Hook pour accéder au système d'alertes
 * 
 * Usage:
 * const alert = useAlert();
 * alert.success('Message');
 * alert.error('Erreur');
 * alert.info('Info');
 * alert.confirm({ ... });
 */
export const useAlert = () => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('useAlert doit être utilisé dans un AlertProvider');
  }

  return {
    success: context.showSuccess,
    error: context.showError,
    info: context.showInfo,
    confirm: context.openConfirmation,
    closeConfirmation: context.closeConfirmation,
  };
};

/**
 * useConfirmation - Hook pour les confirmations modales
 * 
 * Usage:
 * const { confirm } = useConfirmation();
 * 
 * const handleDelete = async () => {
 *   confirm({
 *     title: 'Supprimer ?',
 *     description: 'Cette action est irréversible',
 *     confirmLabel: 'Supprimer',
 *     cancelLabel: 'Annuler',
 *     danger: true,
 *     onConfirm: async () => {
 *       // ...
 *     },
 *     onCancel: () => {
 *       // ...
 *     }
 *   });
 * };
 */
export const useConfirmation = () => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('useConfirmation doit être utilisé dans un AlertProvider');
  }

  const confirm = useCallback((config) => {
    context.openConfirmation(config);
  }, [context]);

  return { confirm };
};

/**
 * Hooks individuels pour chaque type
 */

export const useSuccessAlert = () => {
  const { showSuccess } = useContext(AlertContext);
  return showSuccess;
};

export const useErrorAlert = () => {
  const { showError } = useContext(AlertContext);
  return showError;
};

export const useInfoAlert = () => {
  const { showInfo } = useContext(AlertContext);
  return showInfo;
};
