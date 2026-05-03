import React, { useState } from 'react';
import { Modal, Button, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaCalendarAlt, FaUmbrellaBeach } from 'react-icons/fa';

const STEPS = [
  {
    icon: <FaBuilding size={32} className="text-primary mb-3" />,
    title: 'Créez vos services',
    description: 'Définissez les services de votre entreprise (RH, Tech, Commercial...). Les congés et les workflows de validation sont configurés par service.',
    action: '/politique-conges?tab=services',
    actionLabel: 'Créer mes services',
  },
  {
    icon: <FaCalendarAlt size={32} className="text-primary mb-3" />,
    title: 'Configurez la politique de congés',
    description: 'Définissez les règles : workflow de validation, délai de prévenance, chevauchements autorisés, nombre maximum d\'employés absents simultanément.',
    action: '/politique-conges',
    actionLabel: 'Configurer la politique',
  },
  {
    icon: <FaUmbrellaBeach size={32} className="text-primary mb-3" />,
    title: 'Ajoutez les jours fériés',
    description: 'Importez ou saisissez les jours fériés de votre pays. Ils seront automatiquement exclus du décompte des congés.',
    action: '/jours-feries',
    actionLabel: 'Gérer les jours fériés',
  },
];

const OnboardingWizard = ({ userId, onDismiss }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleAction = () => {
    navigate(current.action);
    onDismiss();
  };

  const handleNext = () => {
    if (isLast) { onDismiss(); return; }
    setStep(s => s + 1);
  };

  return (
    <Modal show centered backdrop="static" size="md">
      <Modal.Header>
        <Modal.Title className="w-100 text-center">
          Bienvenue sur TeamOff 🎉
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center px-4 py-4">
        <ProgressBar
          now={((step + 1) / STEPS.length) * 100}
          className="mb-4"
          style={{ height: 4 }}
        />
        <p className="text-muted small mb-3">Étape {step + 1} sur {STEPS.length}</p>
        {current.icon}
        <h5 className="fw-bold mb-2">{current.title}</h5>
        <p className="text-muted" style={{ fontSize: 14 }}>{current.description}</p>
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <Button variant="link" className="text-muted" size="sm" onClick={onDismiss}>
          Passer l'onboarding
        </Button>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={handleAction}>
            {current.actionLabel}
          </Button>
          <Button variant="primary" size="sm" onClick={handleNext}>
            {isLast ? 'Terminer' : 'Suivant →'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default OnboardingWizard;
