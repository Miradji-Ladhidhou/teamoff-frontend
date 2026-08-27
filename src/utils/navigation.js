export const getDefaultRoute = (role) => {
  if (role === 'super_admin') {
    return '/superadmin/dashboard';
  }

  return '/dashboard';
};

export const roleNavigation = {
  apprenti: [
    { path: '/dashboard', label: 'Accueil', icon: 'home', section: 'primary' },
    { path: '/mes-conges', label: 'Mes congés', icon: 'leave', section: 'primary' },
    { path: '/absences', label: 'Absences', icon: 'absence', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/historique-solde', label: 'Historique solde', icon: 'history', section: 'secondary' },
    { path: '/help', label: 'Prise en main', icon: 'info', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  employe: [
    { path: '/dashboard', label: 'Accueil', icon: 'home', section: 'primary' },
    { path: '/mes-conges', label: 'Mes congés', icon: 'leave', section: 'primary' },
    { path: '/absences', label: 'Absences', icon: 'absence', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/historique-solde', label: 'Historique solde', icon: 'history', section: 'secondary' },
    { path: '/help', label: 'Prise en main', icon: 'info', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  manager: [
    { path: '/dashboard', label: 'Accueil', icon: 'home', section: 'primary' },
    { path: '/conges-equipe', label: 'Congés équipe', icon: 'leave', section: 'primary' },
    { path: '/absences/equipe', label: 'Absences équipe', icon: 'absence', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/historique-solde', label: 'Historique solde', icon: 'history', section: 'secondary' },
    { path: '/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/help', label: 'Prise en main', icon: 'info', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  admin_entreprise: [
    { path: '/dashboard', label: 'Accueil', icon: 'home', section: 'primary' },
    { path: '/users', label: 'Utilisateurs', icon: 'users', section: 'primary' },
    { path: '/conges', label: 'Congés', icon: 'leave', section: 'primary' },
    { path: '/conges/demandes', label: 'Demandes modif/annul', icon: 'inbox', section: 'primary' },
    { path: '/absences/equipe', label: 'Absences équipe', icon: 'absence', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/politique-conges', label: 'Règles & services', icon: 'settings', section: 'secondary' },
    { path: '/soldes', label: 'Soldes', icon: 'balance', section: 'secondary' },
    { path: '/historique-solde', label: 'Historique solde', icon: 'history', section: 'secondary' },
    { path: '/jours-feries', label: 'Jours fériés & bloqués', icon: 'holiday', section: 'secondary' },
    { path: '/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/help', label: 'Prise en main', icon: 'info', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  super_admin: [
    { path: '/superadmin/dashboard', label: 'Accueil', icon: 'shield', section: 'primary' },
    { path: '/superadmin/companies', label: 'Entreprises', icon: 'business', section: 'primary' },
    { path: '/superadmin/services', label: 'Services', icon: 'business', section: 'primary' },
    { path: '/superadmin/users', label: 'Utilisateurs', icon: 'users', section: 'primary' },
    { path: '/superadmin/leaves', label: 'Congés', icon: 'leave', section: 'primary' },
    { path: '/superadmin/absences', label: 'Absences', icon: 'calendar', section: 'primary' },
    { path: '/superadmin/metrics', label: 'Stats', icon: 'chart', section: 'secondary' },
    { path: '/superadmin/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/superadmin/holidays', label: 'Jours fériés & bloqués', icon: 'holiday', section: 'secondary' },
    { path: '/superadmin/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' },
    { path: '/superadmin/audit', label: 'Audit', icon: 'audit', section: 'secondary' },
    { path: '/superadmin/settings', label: 'Réglages', icon: 'settings', section: 'secondary' },
    { path: '/help', label: 'Prise en main', icon: 'info', section: 'secondary' }
  ]
};

export const getNavigationForRole = (role) => roleNavigation[role] || [];