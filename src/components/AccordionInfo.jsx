import React from 'react';
import Accordion from 'react-bootstrap/Accordion';
import { FaInfoCircle, FaLightbulb, FaCheckCircle } from 'react-icons/fa';

const iconMap = {
  info: FaInfoCircle,
  tip: FaLightbulb,
  success: FaCheckCircle,
};

/**
 * AccordionInfo - Affiche un texte ou une astuce dans un accordéon Bootstrap
 * @param {string} type - info | tip | success
 * @param {string} title - Titre de l'accordéon
 * @param {ReactNode} children - Contenu détaillé
 */
const AccordionInfo = ({ type = 'info', title, children }) => {
  const Icon = iconMap[type] || FaInfoCircle;
  return (
    <Accordion className="mb-3">
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          <Icon className="me-2" />
          {title}
        </Accordion.Header>
        <Accordion.Body>
          {children}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default AccordionInfo;
