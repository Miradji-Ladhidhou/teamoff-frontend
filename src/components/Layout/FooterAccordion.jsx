import React from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { Link } from 'react-router-dom';

const FooterAccordion = ({ darkMode = false }) => {
  const linkClass = darkMode ? 'footer-accordion__link' : '';

  return (
    <Accordion className="mb-3 footer-accordion">
      <Accordion.Item eventKey="0">
        <Accordion.Header>Informations utiles</Accordion.Header>
        <Accordion.Body>
          <ul className="mb-0">
            <li><Link to="/legal" className={linkClass}>Informations légales</Link></li>
            <li><Link to="/privacy" className={linkClass}>Confidentialité</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
            <li><Link to="/help" className={linkClass}>Centre d'aide</Link></li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="1">
        <Accordion.Header>Moyens de contact</Accordion.Header>
        <Accordion.Body>
          <ul className="mb-0">
            <li><strong>Email support :</strong> saas.teamoff@gmail.com</li>
            <li><strong>Support technique :</strong> 24h/24, 7j/7</li>
            <li><strong>Référent :</strong> TeamOff SaaS</li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="2">
        <Accordion.Header>Les plus consultées</Accordion.Header>
        <Accordion.Body>
          <ul className="mb-0">
            <li><Link to="/" className={linkClass}>Connexion</Link></li>
            <li><Link to="/register" className={linkClass}>Créer un compte</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact</Link></li>
            <li><Link to="/help" className={linkClass}>Centre d'aide</Link></li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="3">
        <Accordion.Header>Gages de confiance</Accordion.Header>
        <Accordion.Body>
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