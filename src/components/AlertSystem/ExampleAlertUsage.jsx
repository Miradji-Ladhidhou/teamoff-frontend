/**
 * ExampleAlertUsage - Alert System Usage Examples
 * 
 * Demonstrates all usage patterns of the unified alert system.
 * This file is for reference. Remove after migration is complete.
 */

import React, { useState } from 'react';
import { Button, Container, Row, Col, Card } from 'react-bootstrap';
import { alertService } from '../../services/alertService';
import { useAlert } from '../../hooks/useAlert';

export default function ExampleAlertUsage() {
  const { openConfirmation } = useAlert();
  const [loading, setLoading] = useState(false);

  // ==================== TOAST EXAMPLES ====================

  const handleShowSuccess = () => {
    alertService.success('Operation completed successfully!');
  };

  const handleShowError = () => {
    alertService.error('An error occurred. Please try again.');
  };

  const handleShowInfo = () => {
    alertService.info('This is important information.');
  };

  const handleShowWarning = () => {
    alertService.addToast('This is a warning', 'warning');
  };

  const handleShowMultiple = async () => {
    alertService.success('First notification');
    await new Promise(r => setTimeout(r, 100));
    alertService.info('Second notification');
    await new Promise(r => setTimeout(r, 100));
    alertService.error('Third notification');
  };

  // Simulate an API call
  const handleSimulateAPICall = async () => {
    setLoading(true);
    try {
      alertService.info('Processing...');
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1500));
      
      alertService.success('Data saved successfully.');
    } catch (error) {
      alertService.error('Error saving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CONFIRMATION MODAL EXAMPLES ====================

  const handleConfirmDelete = () => {
    openConfirmation({
      title: 'Delete Item?',
      description: 'This action cannot be undone. The item will be permanently deleted.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
      onConfirm: () => {
        alertService.success('Item deleted successfully');
      },
      onCancel: () => {
        alertService.info('Deletion cancelled');
      },
    });
  };

  const handleConfirmAction = () => {
    openConfirmation({
      title: 'Confirm Action?',
      description: 'Are you sure you want to proceed with this action?',
      confirmLabel: 'Yes, proceed',
      cancelLabel: 'No, cancel',
      danger: false,
      onConfirm: () => {
        alertService.success('Action completed');
      },
    });
  };

  // ==================== COMPONENT RENDER ====================
    } finally {
      setLoading(false);
    }
  };

  // Déduplication - Le 2ème toast n'apparaîtra pas (même message + type)
  const handleTestDeduplication = () => {
    alert.success('Ceci va s\'afficher');
    alert.success('Ceci va s\'afficher'); // Semblable = pas d'affichage
    alert.error('Ceci va s\'afficher'); // Type différent = affichage OK
  };

  // ==================== EXEMPLES DE MODALES ====================

  const handleSimpleConfirmation = () => {
    confirm({
      title: 'Êtes-vous sûr ?',
      description: 'Voulez-vous continuer cette action ?',
      confirmLabel: 'Oui, continuer',
      cancelLabel: 'Annuler',
      onConfirm: () => {
        alert.success('Vous avez confirmé !');
      },
      onCancel: () => {
        alert.info('Action annulée');
      }
    });
  };

  const handleDangerousAction = () => {
    confirm({
      title: 'Supprimer cet élément ?',
      description: 'Cette action est irréversible. Vous ne pourrez pas restaurer cet élément après la suppression.',
      confirmLabel: 'Supprimer définitivement',
      cancelLabel: 'Annuler',
      danger: true, // Bouton rouge
      onConfirm: async () => {
        try {
          // Simuler l'appel API
          await new Promise(r => setTimeout(r, 1000));
          alert.success('Élément supprimé avec succès.');
        } catch (error) {
          alert.error('Erreur lors de la suppression: ' + error.message);
        }
      },
      onCancel: () => {
        console.log('Suppression annulée, personne n\'a rien perdu.');
      }
    });
  };

  const handleCustomConfirmation = () => {
    confirm({
      title: 'Modifier les permissions',
      description: 'Vous allez modifier les permissions de cet utilisateur. Cette action affectera tous ses accès.',
      confirmLabel: 'Appliquer les modifications',
      cancelLabel: 'Faire autre chose',
      danger: false,
      onConfirm: () => {
        alert.success('Permissions modifiées.');
      },
      onCancel: () => {
        alert.info('Les modifications n\'ont pas été appliquées.');
      }
    });
  };

  const handleComplexWorkflow = async () => {
    confirm({
      title: 'Commencer le processus ?',
      description: 'Cela fait quelque chose d\'important. Êtes-vous prêt ?',
      confirmLabel: 'Démarrer',
      cancelLabel: 'Plus tard',
      onConfirm: async () => {
        alert.info('Étape 1 en cours...');
        await new Promise(r => setTimeout(r, 800));
        
        alert.info('Étape 2 en cours...');
        await new Promise(r => setTimeout(r, 800));
        
        alert.success('Processus complété avec succès !');
      }
    });
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Nouvelles Alertes - Guide d'Utilisation</h1>

      {/* Section Toasts */}
      <Row className="mb-5">
        <Col>
          <Card>
            <Card.Header>
              <Card.Title className="m-0">Toasts (Notifications Flottantes)</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button onClick={handleShowSuccess} variant="success">
                  Afficher Success Toast
                </Button>
                <Button onClick={handleShowError} variant="danger">
                  Afficher Error Toast
                </Button>
                <Button onClick={handleShowInfo} variant="info">
                  Afficher Info Toast
                </Button>
                <Button onClick={handleShowMultiple} variant="secondary">
                  Afficher Plusieurs Toasts
                </Button>
                <Button onClick={handleTestDeduplication} variant="warning">
                  Tester Déduplication (voir console)
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section Simulations API */}
      <Row className="mb-5">
        <Col>
          <Card>
            <Card.Header>
              <Card.Title className="m-0">Simulation d'Opérations</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  onClick={handleSimulateAPICall} 
                  disabled={loading}
                  variant="primary"
                >
                  {loading ? 'En cours...' : 'Simuler Appel API'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section Modales */}
      <Row className="mb-5">
        <Col>
          <Card>
            <Card.Header>
              <Card.Title className="m-0">Modales de Confirmation</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button onClick={handleSimpleConfirmation} variant="primary">
                  Simple Confirmation
                </Button>
                <Button onClick={handleDangerousAction} variant="danger">
                  Action Dangereuse (Suppression)
                </Button>
                <Button onClick={handleCustomConfirmation} variant="warning">
                  Modification de Permissions
                </Button>
                <Button onClick={handleComplexWorkflow} variant="secondary">
                  Workflow Complexe
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Documentation */}
      <Row>
        <Col>
          <Card className="bg-light">
            <Card.Header>
              <Card.Title className="m-0">Points Clés à Retenir</Card.Title>
            </Card.Header>
            <Card.Body>
              <ul>
                <li><strong>Toasts</strong>: Success, Error, Info - Non bloquant (auto-dismiss 4s)</li>
                <li><strong>Modales</strong>: Pour actions critiques uniquement - Bloquant (nécessite confirmation)</li>
                <li><strong>Pas de bannières</strong>: Supprimées de l'application</li>
                <li><strong>Déduplication</strong>: Automatique (même message + type = pas d'affichage)</li>
                <li><strong>Position</strong>: Centre de l'écran (toasts) ou overlay centré (modales)</li>
                <li><strong>Warnings critiques</strong>: OBLIGATOIREMENT en modale, jamais en toast</li>
                <li><strong>Animations</strong>: Fluides avec fade + slide/scale</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
