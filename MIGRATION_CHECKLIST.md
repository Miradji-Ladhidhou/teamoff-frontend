# CHECKLIST - MIGRATION DU SYSTÈME D'ALERTES

## Vue d'ensemble
- **Ancien système** : NotificationContext (top-banner) + react-toastify (top-right)
- **Nouveau système** : AlertService centralisé + AlertContext + Toasts centrés + Modales bloquantes
- **État actuel** : Système cohabite (backward compatible)
- **Objectif** : Migrer toutes les pages progressivement

## Pages à Migrer (Priorité)

### 🔴 CRITIQUE (auth & core)
- [ ] LoginPage.jsx
- [ ] RegisterPage.jsx
- [ ] ForgotPasswordPage.jsx
- [ ] ResetPasswordPage.jsx

### 🟠 HAUTE (principales workflows)
- [ ] NouveauCongePage.jsx - (créer/éditer congés)
- [ ] CongesPage.jsx - (liste congés)
- [ ] CongeDetailsPage.jsx
- [ ] CalendrierPage.jsx
- [ ] PolitiqueCongesPage.jsx - (gestion politique)
- [ ] UsersPage.jsx - (gestion users)
- [ ] JoursFeriesPage.jsx
- [ ] JoursBloquesPage.jsx
- [ ] ServicesPage.jsx

### 🟡 MOYENNE
- [ ] DashboardPage.jsx
- [ ] ExportsPage.jsx
- [ ] MyProfilePage.jsx
- [ ] NotificationsPage.jsx

### 🟢 SUPERADMIN
- [ ] SuperAdmin/DashboardPage.jsx
- [ ] SuperAdmin/CompaniesPage.jsx
- [ ] SuperAdmin/ServicesPage.jsx
- [ ] SuperAdmin/SettingsPage.jsx
- [ ] SuperAdmin/MetricsPage.jsx
- [ ] SuperAdmin/AuditLogsPage.jsx

## Pattern de Migration

### Avant (❌ À éliminer)
```jsx
import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { useInlineConfirmation } from '../hooks/useInlineConfirmation';

function Component() {
  const { showNotification } = useContext(NotificationContext);
  const { requestConfirmation } = useInlineConfirmation();
  
  showNotification('Message', 'success'); // Top-banner
  showNotification('Warning', 'warning'); // Horreur!
  
  if (requestConfirmation('delete', 'Supprimer ?')) {
    // Suppression...
  }
}
```

### Après (✅ Recommandé)
```jsx
import { useAlert, useConfirmation } from '../hooks/useAlert';

function Component() {
  const alert = useAlert();
  const { confirm } = useConfirmation();
  
  // Toast simple
  alert.success('Message');
  alert.error('Erreur');
  
  // Modale de confirmation
  confirm({
    title: 'Supprimer ?',
    onConfirm: () => { /* ... */ },
    onCancel: () => { /* ... */ },
    danger: true
  });
}
```

## Steps pour chaque fichier

### 1. Remplacer les imports
```jsx
// Retirer
import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { useInlineConfirmation } from '../hooks/useInlineConfirmation';
import FloatingNotification from '../components/NotificationModal/FloatingNotification';

// Ajouter
import { useAlert, useConfirmation } from '../hooks/useAlert';
```

### 2. Remplacer les hooks
```jsx
// Avant
const { showNotification } = useContext(NotificationContext);
const { requestConfirmation } = useInlineConfirmation();

// Après
const alert = useAlert();
const { confirm } = useConfirmation();
```

### 3. Remplacer les appels - Toasts
```jsx
// Avant
showNotification('Succès', 'success');
showNotification('Erreur', 'error');
showNotification('Attention', 'warning'); // ❌ Mauvais dans ancien système

// Après
alert.success('Succès');
alert.error('Erreur');
alert.info('Information'); // Pour les infos neutres
// Jamais de toast warning - utiliser modale!
```

### 4. Remplacer les confirmations
```jsx
// Avant (inline confirmation - mauvais UX)
const [pendingKey, setPendingKey] = useState(null);

const handleDelete = () => {
  if (requestConfirmation('user-delete', 'Êtes-vous sûr ?')) {
    // Suppression
  }
};

// Après (modale - bon UX)
const handleDelete = (userId) => {
  confirm({
    title: 'Supprimer cet utilisateur ?',
    description: 'Cette action est irréversible.',
    confirmLabel: 'Supprimer',
    danger: true,
    onConfirm: async () => {
      try {
        await deleteUser(userId);
        alert.success('Utilisateur supprimé');
      } catch (error) {
        alert.error(error.message);
      }
    }
  });
};
```

### 5. Remplacer les JSX - FloatingNotification
```jsx
// Avant (à retirer du JSX)
<FloatingNotification />

// Après (automatique via App.jsx)
// Rien à faire - ToastContainer + ConfirmationModal fournis par App.jsx
```

### 6. Nettoyage - État local
```jsx
// Avant
const [confirmation, setConfirmation] = useState(null);
const [notificationKey, setNotificationKey] = useState(null);

// Après
// Rien! L'état est géré par AlertService/AlertContext
```

## Patterns Spécifiques

### API Error Handling
```jsx
try {
  const response = await api.post('/endpoint', data);
  alert.success('Opération réussie');
  return response.data;
} catch (error) {
  const message = error.response?.data?.message || error.message || 'Erreur inconnue';
  alert.error(message);
  throw error;
}
```

### Form Submission
```jsx
const handleSubmit = async (formData) => {
  try {
    alert.info('Envoi en cours...');
    const result = await submitForm(formData);
    alert.success('Formulaire envoyé avec succès');
    // Reset, redirect, etc.
  } catch (error) {
    alert.error(error.message);
  }
};
```

### Multi-step Process
```jsx
const handleMultiStepProcess = async () => {
  try {
    alert.info('Étape 1 en cours...');
    await step1();
    
    alert.info('Étape 2 en cours...');
    await step2();
    
    alert.success('Processus terminé !');
  } catch (error) {
    alert.error('Erreur: ' + error.message);
  }
};
```

### Delete with Confirmation
```jsx
const handleDelete = (itemId) => {
  confirm({
    title: 'Supprimer cet élément ?',
    description: 'Vous ne pourrez pas restaurer cet élément',
    confirmLabel: 'Supprimer',
    cancelLabel: 'Annuler',
    danger: true,
    onConfirm: async () => {
      try {
        await api.delete(`/items/${itemId}`);
        alert.success('Élément supprimé');
        // Refresh list, etc.
      } catch (error) {
        alert.error('Erreur de suppression: ' + error.message);
      }
    },
    onCancel: () => {
      console.log('Suppression annulée');
    }
  });
};
```

## Vérification Post-Migration

Pour chaque fichier migré, vérifier:

- [ ] Plus d'import de NotificationContext
- [ ] Plus d'import de useInlineConfirmation
- [ ] Plus d'import de FloatingNotification
- [ ] Tous les showNotification() remplacés par alert.xxx()
- [ ] Tous les requestConfirmation() remplacés par confirm({ ... })
- [ ] Pas de toast avec type='warning' (utiliser modale)
- [ ] Tous les onConfirm/onCancel spécifiés dans les modales
- [ ] build sans erreur: `npm run build`
- [ ] Pas de console warnings liés aux alertes

## Commandes Utils

```bash
# Trouver les fichiers utilisant l'ancien système
grep -r "NotificationContext" src/ --include="*.jsx"
grep -r "useInlineConfirmation" src/ --include="*.jsx"
grep -r "FloatingNotification" src/ --include="*.jsx"
grep -r "showNotification" src/ --include="*.jsx"
grep -r "requestConfirmation" src/ --include="*.jsx"

# Build de vérification
npm run build

# Pages à vérifier
git diff --name-only
```

## Notes Importantes

1. **Thread Safety**: Le service alertService est global et singleton
2. **Context Required**: Tous les composants doivent être dans AlertProvider
3. **No Double Providers**: Ne pas wrapper AlertProvider deux fois
4. **Toast Auto-Dismiss**: 4s par défaut, configurable par composant
5. **Modal Focus**: Auto-focus sur "Annuler" pour UX sûre
6. **Déduplication**: Automatique, pas à gérer manuellement
7. **Stack Limit**: Max 5 toasts à la fois (les plus vieux sont push out)
8. **Accessibility**: WCAG 2.1 AA compliant (role, aria-live, etc.)

## Support

Pour des questions ou problèmes:
- Voir ALERT_SYSTEM_GUIDE.md pour la documentation complète
- Voir ExampleAlertUsage.jsx pour des exemples
- Test: npm test
- Build: npm run build

---

**Status**: 🔄 En cours de migration
**Last Updated**: 2026-03-19
