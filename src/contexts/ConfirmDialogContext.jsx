import React, { createContext, useCallback, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

const DEFAULT_DIALOG = {
  show: false,
  title: 'Confirmation',
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  variant: 'danger',
};

export const ConfirmDialogContext = createContext(null);

export const ConfirmDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(DEFAULT_DIALOG);
  const [resolver, setResolver] = useState(null);

  const closeDialog = useCallback((result) => {
    if (resolver) {
      resolver(result);
    }
    setResolver(null);
    setDialog(DEFAULT_DIALOG);
  }, [resolver]);

  const confirm = useCallback((options = {}) => {
    const normalized = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      setResolver(() => resolve);
      setDialog({
        ...DEFAULT_DIALOG,
        ...normalized,
        show: true,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        show={dialog.show}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        variant={dialog.variant}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </ConfirmDialogContext.Provider>
  );
};
