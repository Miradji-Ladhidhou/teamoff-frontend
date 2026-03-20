export const getDefaultRoute = (role) => {
  if (role === 'super_admin') {
    return '/superadmin/dashboard';
  }

  return '/dashboard';
};

export const roleNavigation = {
  employe: [
    { path: '/dashboard', label: 'Dashboard', icon: 'home', section: 'primary' },
    { path: '/mes-conges', label: 'Mes congés', icon: 'leave', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  manager: [
    { path: '/dashboard', label: 'Dashboard', icon: 'home', section: 'primary' },
    { path: '/conges-equipe', label: 'Congés équipe', icon: 'leave', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  admin_entreprise: [
    { path: '/dashboard', label: 'Dashboard', icon: 'home', section: 'primary' },
    { path: '/users', label: 'Utilisateurs', icon: 'users', section: 'primary' },
    { path: '/conges', label: 'Congés', icon: 'leave', section: 'primary' },
    { path: '/calendrier', label: 'Calendrier', icon: 'calendar', section: 'primary' },
    { path: '/services', label: 'Services', icon: 'business', section: 'secondary' },
    { path: '/politique-conges', label: 'Politique congés', icon: 'settings', section: 'secondary' },
    { path: '/parametres-jours-bloques', label: 'Jours bloqués & soldes', icon: 'calendar', section: 'secondary' },
    { path: '/jours-feries', label: 'Jours fériés', icon: 'holiday', section: 'secondary' },
    { path: '/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' }
  ],
  super_admin: [
    { path: '/superadmin/dashboard', label: 'Dashboard', icon: 'shield', section: 'primary' },
    { path: '/superadmin/companies', label: 'Entreprises', icon: 'business', section: 'primary' },
    { path: '/superadmin/services', label: 'Services', icon: 'business', section: 'primary' },
    { path: '/superadmin/users', label: 'Utilisateurs', icon: 'users', section: 'primary' },
    { path: '/superadmin/leaves', label: 'Congés', icon: 'leave', section: 'primary' },
    { path: '/superadmin/metrics', label: 'Métriques', icon: 'chart', section: 'secondary' },
    { path: '/superadmin/exports', label: 'Exports', icon: 'download', section: 'secondary' },
    { path: '/superadmin/holidays', label: 'Jours fériés', icon: 'holiday', section: 'secondary' },
    { path: '/superadmin/notifications', label: 'Notifications', icon: 'bell', section: 'secondary', badgeKey: 'notifications' },
    { path: '/superadmin/audit', label: 'Audit', icon: 'audit', section: 'secondary' },
    { path: '/superadmin/settings', label: 'Paramètres', icon: 'settings', section: 'secondary' }
  ]
};

export const getNavigationForRole = (role) => roleNavigation[role] || [];