import { useEffect } from 'react';

/**
 * Affiche une confirmation navigateur si l'utilisateur tente de quitter la page
 * alors que `isDirty` est true (formulaire modifié non sauvegardé).
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
