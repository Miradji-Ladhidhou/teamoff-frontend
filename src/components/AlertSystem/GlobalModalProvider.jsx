import React from 'react';
import ConfirmationModal from './ConfirmationModal';

/**
 * Composant global unique monte a la racine.
 * Gere l'affichage des modales de notification et confirmation.
 */
const GlobalModalProvider = () => {
  return <ConfirmationModal />;
};

export default GlobalModalProvider;
