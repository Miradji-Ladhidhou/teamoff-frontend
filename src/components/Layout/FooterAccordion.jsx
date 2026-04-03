import React from 'react';
import Accordion from 'react-bootstrap/Accordion';

const FooterAccordion = ({ darkMode = false }) => {
  const headerClass = darkMode ? 'bg-secondary text-light' : '';
  const bodyClass = darkMode ? 'bg-dark text-light' : '';

  const linkClass = darkMode ? 'text-light text-decoration-none' : '';

  return (
    <Accordion className="mb-3">
      <Accordion.Item eventKey="0">
        <Accordion.Header className={headerClass}>Informations utiles</Accordion.Header>
        <Accordion.Body className={bodyClass}>
          <ul className="mb-0">
            <li><a href="/legal" className={linkClass}>Informations légales</a></li>
            <li><a href="/privacy" className={linkClass}>Confidentialité</a></li>
            <li><a href="/contact" className={linkClass}>Contact</a></li>
            <li><a href="/help" className={linkClass}>Centre d'aide</a></li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="1">
        <Accordion.Header className={headerClass}>Moyens de contact</Accordion.Header>
        <Accordion.Body className={bodyClass}>
          <ul className="mb-0">
            <li><strong>Email support :</strong> saas.teamoff@gmail.com</li>
            <li><strong>Support technique :</strong> 24h/24, 7j/7</li>
            <li><strong>Référent :</strong> TeamOff SaaS</li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="2">
        <Accordion.Header className={headerClass}>Les plus consultées</Accordion.Header>
        <Accordion.Body className={bodyClass}>
          <ul className="mb-0">
            <li><a href="/" className={linkClass}>Connexion</a></li>
            <li><a href="/register" className={linkClass}>Créer un compte</a></li>
            <li><a href="/contact" className={linkClass}>Contact</a></li>
            <li><a href="/help" className={linkClass}>Centre d'aide</a></li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="3">
        <Accordion.Header className={headerClass}>Gages de confiance</Accordion.Header>
        <Accordion.Body className={bodyClass}>
          <ul className="mb-0">
            <li>Contrôle des accès par rôle</li>
            <li>Journal d'audit des actions</li>
            <li>Sauvegardes et export des données</li>
            <li>Confidentialité des informations collaborateurs</li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default FooterAccordion;