import './legal.css';
import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';

const LegalPage = () => {
  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Informations légales</span>
      </div>

      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Éditeur</h5></Card.Header>
            <Card.Body>
              <p><strong>Nom du projet :</strong> TeamOff</p>
              <p><strong>Nature :</strong> Projet indépendant en cours de développement — structure juridique en cours de constitution</p>
              <p><strong>Localisation :</strong> La Réunion, France</p>
              <p><strong>Email de contact :</strong> <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></p>
              <p className="mb-0"><strong>Activité :</strong> Développement d'un logiciel SaaS de gestion des congés et absences à destination des entreprises</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Hébergement</h5></Card.Header>
            <Card.Body>
              <p>
                <strong>Frontend :</strong> Vercel Inc.<br />
                440 N Barranca Ave #4133, Covina, CA 91723, USA<br />
                <a href="mailto:privacy@vercel.com">privacy@vercel.com</a>
              </p>
              <p>
                <strong>Backend (API) :</strong> Render Services Inc.<br />
                1001 Page St, San Francisco, CA 94117, USA<br />
                <a href="mailto:support@render.com">support@render.com</a>
              </p>
              <p className="mb-0">
                <strong>Base de données :</strong> Supabase Inc.<br />
                595 Pacific Ave., Floor 4, San Francisco, CA 94133, USA<br />
                <a href="mailto:privacy@supabase.com">privacy@supabase.com</a>
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Conditions d'utilisation</h5></Card.Header>
            <Card.Body>
              <p>La plateforme TeamOff est destinée exclusivement à la gestion des congés, des absences, des validations et des référentiels RH dans un cadre professionnel.</p>
              <p>Les utilisateurs s'engagent à maintenir la confidentialité de leurs identifiants et à n'utiliser l'application qu'à des fins professionnelles autorisées par leur organisation.</p>
              <p>L'accès à la plateforme est soumis à l'attribution d'un compte par un administrateur de l'entreprise. TeamOff se réserve le droit de suspendre tout accès en cas d'utilisation non conforme.</p>
              <p>La disponibilité du service dépend des prestataires d'hébergement tiers (Vercel, Render, Supabase). TeamOff ne peut garantir une disponibilité de 100 % et décline toute responsabilité en cas d'interruption imputable à ces prestataires.</p>
              <p className="mb-0">Les journaux d'audit, données d'export et historiques de congés sont conservés selon les paramètres définis par chaque organisation cliente, dans les limites prévues par la réglementation applicable.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">Propriété intellectuelle</h5></Card.Header>
            <Card.Body>
              <p>L'ensemble des éléments composant la plateforme TeamOff (code source, interfaces, marque, logo) est la propriété exclusive de son auteur et est protégé par les lois relatives à la propriété intellectuelle en vigueur.</p>
              <p className="mb-0">Toute reproduction, représentation ou exploitation non autorisée de ces éléments est strictement interdite sans accord écrit préalable.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LegalPage;
