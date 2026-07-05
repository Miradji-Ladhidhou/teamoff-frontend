import './help.css';

import React from 'react';
import { Accordion, Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const HelpPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'employe';
  const navigate = useNavigate();

  const faqItems = [
    {
      header: "Comment se connecter à la plateforme ?",
      body: "Rendez-vous sur l'URL de votre organisation, saisissez votre adresse email professionnelle et votre mot de passe. Si vous avez oublié votre mot de passe, utilisez le lien « Mot de passe oublié » sur la page de connexion.",
      roles: ['employe', 'manager', 'admin_entreprise', 'super_admin']
    },
    {
      header: "Comment poser une demande de congé ?",
      body: "Cliquez sur « Mes congés » dans le menu, puis sur « + Nouvelle demande ». Sélectionnez le type de congé, les dates de début et de fin, ajoutez un commentaire si nécessaire, et soumettez. Vous pouvez suivre l'état de votre demande (en attente, validé, refusé) en temps réel.",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Comment consulter mon historique de congés ?",
      body: "Accédez à la page « Historique » dans le menu. Vous pouvez filtrer par année et par statut (approuvé, refusé, en attente). Chaque ligne affiche le type de congé, la période, le nombre de jours et le statut. Vos soldes annuels (acquis, pris, réservés, disponibles) sont affichés en haut de la page.",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Où voir mon solde de congés ?",
      body: "Votre solde est visible sur la page « Historique » (cartes de soldes par type en haut de page) ou directement dans le détail d'une demande de congé. Les administrateurs peuvent consulter les soldes de tous les employés depuis la page « Soldes ».",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Comment déclarer une absence maladie ?",
      body: "Allez dans « Absences » et cliquez sur « + Nouvelle absence ». Sélectionnez « Arrêt maladie », renseignez les dates et un commentaire. N'oubliez pas de remettre votre avis d'arrêt de travail directement à votre entreprise dans les meilleurs délais — la transmission en ligne n'est pas disponible.",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Comment valider ou refuser une demande de congé ?",
      body: "Accédez à « Congés équipe » (managers) ou « Congés » (admins), repérez les demandes en statut « En attente », ouvrez le détail et cliquez sur « Valider » ou « Refuser ». Un commentaire est recommandé en cas de refus afin que l'employé comprenne la raison.",
      roles: ['manager', 'admin_entreprise', 'super_admin']
    },
    {
      header: "Comment configurer les règles de congés de mon organisation ?",
      body: "Dans « Règles & services » (menu secondaire), vous pouvez paramétrer : le workflow de validation, les délais de préavis, les quotas, les jours décomptés (weekends, jours fériés), les notifications, l'acquisition mensuelle par type de congé, et les règles par service.",
      roles: ['admin_entreprise']
    },
    {
      header: "Comment ajouter ou désactiver un utilisateur ?",
      body: "Depuis la page « Utilisateurs », cliquez sur « + Ajouter » pour créer un nouveau compte, ou utilisez le menu d'actions d'un utilisateur existant pour modifier son rôle, son service ou désactiver son compte. Un email de bienvenue avec lien de définition de mot de passe peut être envoyé automatiquement.",
      roles: ['admin_entreprise', 'super_admin']
    },
    {
      header: "Comment exporter les données ?",
      body: "Accédez à la page « Exports », choisissez le type de données (congés, absences, utilisateurs, journaux d'audit), appliquez les filtres souhaités (période, statut, service) et cliquez sur « Exporter ». Les fichiers sont générés en CSV ou Excel selon le type.",
      roles: ['admin_entreprise', 'super_admin', 'manager']
    },
    {
      header: "Pourquoi un manager peut-il (ou ne peut-il pas) voir l'historique des autres employés ?",
      body: "Un administrateur peut contrôler cet accès depuis « Règles & services » → « Règles générales » → le toggle « Managers — accès à l'historique des employés ». Si désactivé, les managers ne voient que leur propre historique.",
      roles: ['admin_entreprise']
    },
    {
      header: "Comment contacter le support TeamOff ?",
      body: "Envoyez un email à saas.teamoff@gmail.com. Pour un incident technique, précisez « INCIDENT » dans l'objet pour un traitement prioritaire. Pour une question RGPD, précisez « RGPD ». Les réponses sont assurées sous 1 à 3 jours ouvrés.",
      roles: ['employe', 'manager', 'admin_entreprise', 'super_admin']
    },
  ];

  const filteredFaq = faqItems.filter(item => item.roles.includes(role));

  const tips = {
    employe: [
      "Posez vos congés en avance — le délai de préavis est configuré par votre organisation.",
      "Consultez la page Historique pour suivre vos soldes en temps réel.",
      "En cas d'arrêt maladie, pensez à déposer votre avis d'arrêt de travail à votre employeur.",
    ],
    manager: [
      "Filtrez les demandes par statut « En attente » pour traiter les validations rapidement.",
      "Ajoutez toujours un commentaire lors d'un refus — cela aide l'employé à comprendre.",
      "Utilisez l'export pour produire vos reportings d'équipe.",
    ],
    admin_entreprise: [
      "Configurez les règles de congés dès l'onboarding pour éviter les incohérences.",
      "Le toggle « Managers — accès à l'historique » vous permet de contrôler la visibilité.",
      "Consultez le journal d'audit pour la traçabilité complète des actions sensibles.",
    ],
    super_admin: [
      "Surveillez les métriques d'utilisation depuis le dashboard super admin.",
      "Gérez les entreprises et leurs paramètres depuis le menu dédié.",
      "Le journal d'audit global permet d'assurer la conformité de la plateforme.",
    ]
  };

  const roleTips = tips[role] || tips.employe;

  return (
    <Container>
      <div className="page-title-bar">
        <span className="section-title-bar__text">Centre d'aide</span>
        {user && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate(role === 'super_admin' ? '/superadmin/dashboard' : '/dashboard')}
          >
            Retour au tableau de bord
          </Button>
        )}
      </div>

      {/* Astuces selon le rôle */}
      <Card className="mb-4">
        <Card.Header><h5 className="mb-0">Conseils pratiques</h5></Card.Header>
        <Card.Body>
          <ul className="mb-0">
            {roleTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </Card.Body>
      </Card>

      {/* FAQ */}
      <Card className="mb-4">
        <Card.Header><h5 className="mb-0">Questions fréquentes</h5></Card.Header>
        <Card.Body>
          <Accordion defaultActiveKey="0">
            {filteredFaq.map((item, idx) => (
              <Accordion.Item eventKey={String(idx)} key={item.header}>
                <Accordion.Header>{item.header}</Accordion.Header>
                <Accordion.Body>{item.body}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Body>
      </Card>

      {/* Contact */}
      <Card>
        <Card.Body className="text-center py-4">
          <p className="mb-2 text-muted">Vous n'avez pas trouvé la réponse à votre question ?</p>
          <a href="mailto:saas.teamoff@gmail.com" className="btn btn-outline-primary btn-sm">
            Contacter le support — saas.teamoff@gmail.com
          </a>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HelpPage;
