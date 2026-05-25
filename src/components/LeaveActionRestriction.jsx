/**
 * Composant pour afficher les restrictions de modification selon la politique
 */

import React from 'react';
import { Alert, Badge } from 'react-bootstrap';

export const LeaveActionRestriction = ({ 
  isValidated, 
  canModify, 
  canCancel, 
  reason,
  code,
  className = '',
}) => {
  // Si déjà validé et actions non autorisées
  if (isValidated && !canModify && !canCancel) {
    return (
      <Alert variant="warning" className={`mb-2 small ${className}`}>
        <strong>Restrictions:</strong>
        <div className="mt-1">
          {!canModify && <div>❌ Modification non autorisée après validation</div>}
          {!canCancel && <div>❌ Annulation non autorisée après validation</div>}
        </div>
      </Alert>
    );
  }

  // Si raison spécifique (vient de validateModification/validateCancellation)
  if (reason && !code?.includes('VALIDATION_ERROR')) {
    return (
      <Alert variant="danger" className={`mb-2 small ${className}`}>
        <strong>⚠️ Action non autorisée:</strong>
        <div className="mt-1">{reason}</div>
      </Alert>
    );
  }

  return null;
};

/**
 * Badge pour le statut de la politique d'un congé
 */
export const LeavePolicyBadge = ({ isValidated, canModify, canCancel }) => {
  if (!isValidated) {
    return null;
  }

  if (!canModify && !canCancel) {
    return (
      <Badge bg="danger" className="ms-2">
        Bloqué
      </Badge>
    );
  }

  if (!canModify) {
    return (
      <Badge bg="warning" className="ms-2" text="dark">
        Modif. bloquée
      </Badge>
    );
  }

  if (!canCancel) {
    return (
      <Badge bg="warning" className="ms-2" text="dark">
        Annul. bloquée
      </Badge>
    );
  }

  return null;
};

export default LeaveActionRestriction;
