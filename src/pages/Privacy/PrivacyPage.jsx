import './privacy.css';
import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';

const PrivacyPage = () => {
  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Politique de confidentialité</span>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <p className="text-muted small mb-0">
            Dernière mise à jour : juillet 2026 — Cette politique s'applique à l'ensemble des utilisateurs de la plateforme TeamOff.
          </p>
        </Card.Body>
      </Card>

      <Row>
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">1. Responsable du traitement</h5></Card.Header>
            <Card.Body>
              <p>Le responsable du traitement des données personnelles collectées via la plateforme TeamOff est :</p>
              <p>
                <strong>TeamOff SAS</strong><br />
                Allée Galabert, ZAC Moulin Joli, 97419 La Possession, La Réunion — France<br />
                Email : <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a>
              </p>
              <p className="mb-0">Pour toute question relative à la protection de vos données, vous pouvez nous contacter à l'adresse ci-dessus.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">2. Données collectées</h5></Card.Header>
            <Card.Body>
              <p>Dans le cadre de l'utilisation de TeamOff, les données suivantes sont collectées et traitées :</p>
              <ul>
                <li><strong>Données d'identification :</strong> nom, prénom, adresse email professionnelle</li>
                <li><strong>Données organisationnelles :</strong> service d'appartenance, rôle au sein de l'entreprise (employé, manager, administrateur)</li>
                <li><strong>Données RH :</strong> demandes de congés et absences, dates, types, statuts, commentaires, soldes de congés</li>
                <li><strong>Données de traçabilité :</strong> journaux d'audit des actions réalisées sur la plateforme, date et heure des connexions</li>
                <li><strong>Données techniques :</strong> adresse IP, identifiant de session, logs applicatifs</li>
              </ul>
              <p className="mb-0">Aucune donnée sensible au sens du RGPD (données de santé au sens clinique, données biométriques, opinions politiques, etc.) n'est collectée directement, à l'exception des justificatifs d'absence maladie transmis le cas échéant par l'organisation cliente.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">3. Finalités et bases légales</h5></Card.Header>
            <Card.Body>
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Finalité</th>
                    <th>Base légale (RGPD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gestion des congés et absences</td>
                    <td>Exécution du contrat / obligation légale (Code du travail)</td>
                  </tr>
                  <tr>
                    <td>Contrôle d'accès par rôle</td>
                    <td>Intérêt légitime (sécurité et confidentialité)</td>
                  </tr>
                  <tr>
                    <td>Journal d'audit et traçabilité</td>
                    <td>Intérêt légitime (sécurité, conformité)</td>
                  </tr>
                  <tr>
                    <td>Notifications et emails de validation</td>
                    <td>Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td>Statistiques d'utilisation agrégées</td>
                    <td>Intérêt légitime (amélioration du service)</td>
                  </tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">4. Durée de conservation</h5></Card.Header>
            <Card.Body>
              <ul>
                <li><strong>Données de compte actif :</strong> pendant toute la durée de la relation contractuelle avec l'organisation cliente</li>
                <li><strong>Données de congés et absences :</strong> 5 ans à compter de la clôture de l'exercice concerné (obligations légales RH)</li>
                <li><strong>Journaux d'audit :</strong> 1 an glissant par défaut, configurable selon la politique interne de l'organisation</li>
                <li><strong>Données de compte clôturé :</strong> archivées et supprimées dans un délai maximum de 3 ans après la fin du contrat</li>
              </ul>
              <p className="mb-0">Ces durées s'entendent sans préjudice des obligations légales de conservation plus longues applicables à certaines catégories de données RH.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">5. Destinataires et sous-traitants</h5></Card.Header>
            <Card.Body>
              <p>Les données sont hébergées auprès des prestataires suivants, agissant en qualité de sous-traitants :</p>
              <ul>
                <li><strong>Vercel Inc.</strong> (USA) — hébergement du frontend ; données transférées sur la base des clauses contractuelles types (SCCs) de la Commission européenne</li>
                <li><strong>Render Services Inc.</strong> (USA) — hébergement de l'API backend ; transfert encadré par SCCs</li>
                <li><strong>Supabase Inc.</strong> (USA) — base de données PostgreSQL ; transfert encadré par SCCs</li>
              </ul>
              <p>Aucune donnée personnelle n'est vendue ou cédée à des tiers à des fins commerciales.</p>
              <p className="mb-0">Au sein de chaque organisation cliente, seuls les utilisateurs disposant des droits appropriés (manager, administrateur) peuvent accéder aux données de leurs collaborateurs, dans les limites définies par les règles de la plateforme.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">6. Vos droits</h5></Card.Header>
            <Card.Body>
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
              <ul>
                <li><strong>Droit d'accès</strong> (art. 15) : obtenir la confirmation que vos données sont traitées et en recevoir une copie</li>
                <li><strong>Droit de rectification</strong> (art. 16) : corriger des données inexactes ou incomplètes</li>
                <li><strong>Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données sous réserve des obligations légales de conservation</li>
                <li><strong>Droit à la limitation</strong> (art. 18) : restreindre temporairement le traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré et lisible par machine</li>
                <li><strong>Droit d'opposition</strong> (art. 21) : vous opposer à un traitement fondé sur l'intérêt légitime</li>
              </ul>
              <p>Pour exercer vos droits, contactez : <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a></p>
              <p className="mb-0">Vous disposez également du droit d'introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header><h5 className="mb-0">7. Sécurité</h5></Card.Header>
            <Card.Body>
              <p>TeamOff met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre l'accès non autorisé, la perte ou la divulgation :</p>
              <ul>
                <li>Chiffrement des communications (HTTPS/TLS)</li>
                <li>Authentification par token JWT avec rotation (access + refresh token)</li>
                <li>Contrôle d'accès strict par rôle (RBAC)</li>
                <li>Journalisation des actions sensibles (audit log)</li>
                <li>Chiffrement des mots de passe (bcrypt)</li>
                <li>Connexion à la base de données chiffrée (SSL requis)</li>
              </ul>
              <p className="mb-0">En cas de violation de données susceptible d'engendrer un risque pour vos droits et libertés, nous nous engageons à notifier les autorités compétentes dans les délais prévus par le RGPD.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PrivacyPage;
