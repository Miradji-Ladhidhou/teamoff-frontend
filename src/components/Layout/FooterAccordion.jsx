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
            <li><Link to="/legal" className={linkClass}>Mentions légales</Link></li>
            <li><Link to="/privacy" className={linkClass}>Politique de confidentialité & RGPD</Link></li>
            <li><Link to="/contact" className={linkClass}>Contact & support</Link></li>
            <li><Link to="/help" className={linkClass}>Centre d'aide / FAQ</Link></li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="1">
        <Accordion.Header>Nous contacter</Accordion.Header>
        <Accordion.Body>
          <ul className="mb-0">
            <li><strong>Support :</strong> <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></li>
            <li><strong>Incident technique :</strong> objet "INCIDENT" dans votre email</li>
            <li><strong>RGPD / données personnelles :</strong> objet "RGPD"</li>
            <li><strong>Délai de réponse :</strong> 1 à 3 jours ouvrés</li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>

      <Accordion.Item eventKey="2">
        <Accordion.Header>Accès rapide</Accordion.Header>
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
            <li>Contrôle d'accès strict par rôle (RBAC) — employé, manager, admin</li>
            <li>Communications chiffrées HTTPS / TLS sur l'ensemble des échanges</li>
            <li>Mots de passe hachés (bcrypt) — jamais stockés en clair</li>
            <li>Authentification sécurisée par tokens JWT avec rotation automatique</li>
            <li>Journal d'audit complet des actions sensibles</li>
            <li>Base de données chiffrée en transit (SSL requis)</li>
            <li>Données hébergées chez des prestataires certifiés (Vercel, Render, Supabase)</li>
            <li>Politique RGPD conforme — droits d'accès, rectification et suppression</li>
          </ul>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default FooterAccordion;
