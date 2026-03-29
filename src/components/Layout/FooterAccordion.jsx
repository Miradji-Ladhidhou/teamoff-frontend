import React from 'react';
import Accordion from 'react-bootstrap/Accordion';

const FooterAccordion = () => (
  <Accordion className="mb-3">
    <Accordion.Item eventKey="0">
      <Accordion.Header>Informations utiles</Accordion.Header>
      <Accordion.Body>
        <ul className="mb-0">
          <li><a href="/legal">Informations légales</a></li>
          <li><a href="/privacy">Confidentialité</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/help">Centre d'aide</a></li>
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
          <li><a href="/">Connexion</a></li>
          <li><a href="/register">Créer un compte</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/help">Centre d'aide</a></li>
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

export default FooterAccordion;
