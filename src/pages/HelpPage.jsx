import React from 'react';
import { Accordion, Container, Card } from 'react-bootstrap';
import { InfoCardInfo } from '../components/InfoCard';

const HelpPage = () => {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Centre d'aide</h1>
        <p className="text-muted mb-0">Réponses rapides aux questions les plus fréquentes sur TeamOff.</p>
      </div>

      <InfoCardInfo title="Points d'entrée utiles">
        <p className="mb-0">Consultez d'abord cette page avant d'ouvrir un ticket, notamment pour les sujets de workflow, soldes et calendrier.</p>
      </InfoCardInfo>

      <Card>
        <Card.Body>
          <Accordion defaultActiveKey="0">
            <Accordion.Item eventKey="0">
              <Accordion.Header>Comment est calculé le nombre de jours pris ?</Accordion.Header>
              <Accordion.Body>
                Le calcul prend en compte la période demandée, les jours bloqués, les jours fériés exclus et les éventuelles demi-journées déduites.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
              <Accordion.Header>Qui valide une demande de congé ?</Accordion.Header>
              <Accordion.Body>
                Cela dépend du workflow configuré: validation manager, admin ou validation en plusieurs étapes selon la politique appliquée au service.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>Où voir le solde restant ?</Accordion.Header>
              <Accordion.Body>
                Le solde est visible dans les détails d'une demande, dans les compteurs utilisateur et dans les pages d'administration dédiées selon vos droits.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="3">
              <Accordion.Header>Que faire si une demande est refusée ?</Accordion.Header>
              <Accordion.Body>
                Consultez le commentaire de refus affiché dans le détail de la demande, puis contactez votre manager ou administrateur si une correction est nécessaire.
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HelpPage;