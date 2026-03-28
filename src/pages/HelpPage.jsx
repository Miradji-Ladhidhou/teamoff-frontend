
import React from 'react';
import { Accordion, Container, Card, Button } from 'react-bootstrap';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HelpPage = () => {
  const { user, isAdmin, isManager, isSuperAdmin, isEmploye } = useAuth();
  const role = user?.role || 'employe';
  const navigate = useNavigate();

  // FAQ dynamiques selon le rôle
  const faqItems = [
    {
      header: "Comment se connecter à la plateforme ?",
      body: "Rendez-vous sur l’URL de votre entreprise, saisissez votre email professionnel et votre mot de passe. Utilisez 'Mot de passe oublié' si besoin.",
      roles: ['employe', 'manager', 'admin_entreprise', 'super_admin']
    },
    {
      header: "Comment demander un congé ou une absence ?",
      body: "Allez dans l’onglet 'Congés' ou 'Absences', cliquez sur 'Nouvelle demande', remplissez le formulaire et validez. Suivez le statut dans la liste.",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Comment valider une demande ?",
      body: "Si vous êtes manager ou admin, accédez à la liste des demandes de votre équipe, ouvrez la demande et cliquez sur 'Valider' ou 'Refuser' avec un commentaire.",
      roles: ['manager', 'admin_entreprise', 'super_admin']
    },
    {
      header: "Où voir mon solde de congés ?",
      body: "Le solde est visible dans la page 'Mes congés', dans le détail d’une demande ou dans la section Statistiques.",
      roles: ['employe', 'manager', 'admin_entreprise']
    },
    {
      header: "Comment exporter les données ?",
      body: "Allez dans l’onglet 'Exports', choisissez le type (congés, absences, utilisateurs, logs, statistiques), appliquez les filtres et cliquez sur 'Exporter'.",
      roles: ['admin_entreprise', 'super_admin', 'manager']
    },
    {
      header: "Comment gérer les utilisateurs/services ?",
      body: "En tant qu’admin, utilisez les onglets 'Utilisateurs' et 'Services' pour ajouter, modifier ou désactiver des comptes et services.",
      roles: ['admin_entreprise', 'super_admin']
    },
    {
      header: "Comment contacter le support ?",
      body: "Contactez votre administrateur ou l’équipe TeamOff à saas.teamoff@gmail.com.",
      roles: ['employe', 'manager', 'admin_entreprise', 'super_admin']
    },
    {
      header: "Comment accéder aux statistiques et à l’audit ?",
      body: "Les administrateurs et superadmins disposent d’onglets dédiés pour visualiser les statistiques d’utilisation et les logs d’audit.",
      roles: ['admin_entreprise', 'super_admin']
    }
  ];

  // Filtrer les FAQ selon le rôle
  const filteredFaq = faqItems.filter(item => item.roles.includes(role));

  // Astuces selon le rôle
  const tips = {
    employe: [
      "Utilisez le bouton 'Mot de passe oublié' si besoin.",
      "Consultez régulièrement vos soldes et notifications.",
      "Contactez votre manager pour toute question sur la validation."
    ],
    manager: [
      "Filtrez les demandes par statut pour gagner du temps.",
      "Ajoutez un commentaire lors de la validation/refus.",
      "Utilisez l’export pour suivre l’activité de votre équipe."
    ],
    admin_entreprise: [
      "Configurez les politiques de congés dès l’onboarding.",
      "Utilisez les exports pour vos reportings RH.",
      "Consultez l’audit pour la traçabilité des actions."
    ],
    super_admin: [
      "Surveillez les métriques d’utilisation.",
      "Gérez les entreprises et services depuis le menu dédié.",
      "Utilisez l’audit pour la conformité et la sécurité."
    ]
  };

  return (
    <Container>
      {user && (
        <div className="mb-3 d-flex justify-content-end">
          <Button variant="outline-primary" size="sm" onClick={() => navigate(role === 'super_admin' ? '/superadmin/dashboard' : '/dashboard')}>
            Retour au dashboard
          </Button>
        </div>
      )}
      <div className="mb-4">
        <h1 className="h3 mb-1">Centre d'aide</h1>
        <p className="text-muted mb-0">Retrouvez ici les réponses et astuces adaptées à votre profil TeamOff.</p>
      </div>

      <InfoCardInfo title="Astuces pour votre profil">
        <ul className="mb-0">
          {(tips[role] || tips['employe']).map((tip, idx) => (
            <li key={idx}>{tip}</li>
          ))}
        </ul>
      </InfoCardInfo>

      <Card className="mb-4">
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

      {user && (
        <TipCard title="Besoin d'aide supplémentaire ?">
          Consultez le <a href="/USER_GUIDE.md" target="_blank" rel="noopener noreferrer">guide utilisateur complet</a> ou contactez le support TeamOff à <a href="mailto:saas.teamoff@gmail.com">saas.teamoff@gmail.com</a>.
        </TipCard>
      )}
    </Container>
  );
};

export default HelpPage;