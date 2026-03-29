/**
 * GUIDE - Nouvelle Architecture du Système d'Alertes
 * 
 * ============================================
 * ARCHITECTURE GLOBALE
 * ============================================
 * 
 * Le système d'alertes est maintenant centralisé et harmonisé :
 * 
 * 1. AlertService (services/alertService.js) - Logique métier
 * 2. AlertContext (contexts/AlertContext.jsx) - Provider React
 * 3. ToastContainer (components/AlertSystem/ToastContainer.jsx) - Affichage toasts
 * 4. ConfirmationModal (components/AlertSystem/ConfirmationModal.jsx) - Affichage modale
 * 5. useAlert hook (hooks/useAlert.js) - API consommatrice
 * 
 * ============================================
 * USAGE - TOASTS (Success, Error, Info)
 * ============================================
 * 
 * Les toasts sont des notifications flottantes non-bloquantes.
 * Ils s'affichent au centre de l'écran avec auto-dismiss (4s).
 * 
 * EXEMPLES :
 * 
 * ```jsx
 * import { useAlert } from '../hooks/useAlert';
 * 
 * function MyComponent() {
 *   const alert = useAlert();
 *   
 *   // Succès
 *   const handleCreate = async () => {
 *     try {
 *       await createItem(...);
 *       alert.success('Élément créé avec succès');
 *     } catch (error) {
 *       alert.error(error.message);
 *     }
 *   };
 *   
 *   // Erreur
 *   const handleDelete = async () => {
 *     try {
 *       await deleteItem(...);
 *       alert.success('Élément supprimé');
 *     } catch (error) {
 *       alert.error('Erreur lors de la suppression');
 *     }
 *   };
 *   
 *   // Info
 *   const handleUpdate = async () => {
 *     alert.info('Mise à jour en progression...');
 *     await updateItem(...);
 *     alert.success('Mis à jour');
 *   };
 *   
 *   return (
 *     <>
 *       <button onClick={handleCreate}>Créer</button>
 *       <button onClick={handleDelete}>Supprimer</button>
 *       <button onClick={handleUpdate}>Mettre à jour</button>
 *     </>
 *   );
 * }
 * ```
 * 
 * ============================================
 * USAGE - CONFIRMATIONS MODALES (Warnings Critiques)
 * ============================================
 * 
 * Les modales sont bloquantes et nécessitent une confirmation utilisateur.
 * À UTILISER OBLIGATOIREMENT pour les actions critiques (suppression, changement de rôle, etc).
 * 
 * ⚠️ RÈGLE STRICTE: Les warnings CRITIQUES ne doivent JAMAIS être des toasts !
 * 
 * EXEMPLES :
 * 
 * ```jsx
 * import { useConfirmation } from '../hooks/useAlert';
 * 
 * function UsersPage() {
 *   const { confirm } = useConfirmation();
 *   const alert = useAlert();
 *   
 *   // Suppression avec modale
 *   const handleDeleteUser = (userId) => {
 *     confirm({
 *       title: 'Supprimer cet utilisateur ?',
 *       description: 'Cette action est irréversible. L\'utilisateur perdra accès à tous les documents.',
 *       confirmLabel: 'Supprimer définitivement',
 *       cancelLabel: 'Annuler',
 *       danger: true, // Bouton rouge
 *       onConfirm: async () => {
 *         try {
 *           await deleteUser(userId);
 *           alert.success('Utilisateur supprimé');
 *         } catch (error) {
 *           alert.error('Erreur de suppression');
 *         }
 *       },
 *       onCancel: () => {
 *         console.log('Suppression annulée');
 *       }
 *     });
 *   };
 *   
 *   return <button onClick={() => handleDeleteUser(123)}>Supprimer</button>;
 * }
 * ```
 * 
 * ============================================
 * API COMPLÈTE - useAlert hook
 * ============================================
 * 
 * const alert = useAlert();
 * 
 * // Toasts
 * alert.success(message, duration?)     // Toast succès (défaut: 4000ms)
 * alert.error(message, duration?)       // Toast erreur
 * alert.info(message, duration?)        // Toast info
 * 
 * // Modales
 * alert.confirm({
 *   title: string,                      // Titre de la modale
 *   description: string,                // Description/message
 *   confirmLabel: string,               // Libellé du bouton confirmer
 *   cancelLabel: string,                // Libellé du bouton annuler
 *   danger: boolean,                    // true = bouton rouge (défaut: false)
 *   onConfirm: () => void,              // Callback confirmation
 *   onCancel: () => void                // Callback annulation
 * })
 * alert.closeConfirmation()             // Fermer la modale
 * 
 * ============================================
 * API COMPLÈTE - AlertService (low-level)
 * ============================================
 * 
 * import { alertService } from '../services/alertService';
 * 
 * // Toasts
 * alertService.success(message, duration?)
 * alertService.error(message, duration?)
 * alertService.info(message, duration?)
 * alertService.addToast(message, type, duration?)
 * alertService.removeToast(id)
 * alertService.pauseToast(id)           // Pause au hover
 * alertService.resumeToast(id, duration?)
 * alertService.clearAllToasts()
 * alertService.getToasts()              // Array de toasts actuels
 * 
 * // Modales
 * alertService.openConfirmation(config)
 * alertService.closeModal()
 * alertService.getModal()
 * alertService.isModalOpen()
 * 
 * // Events (Observer pattern)
 * alertService.on('toastAdded', callback)
 * alertService.on('toastRemoved', callback)
 * alertService.on('toastCleared', callback)
 * alertService.on('modalOpened', callback)
 * alertService.on('modalClosed', callback)
 * alertService.off(event, callback)
 * 
 * ============================================
 * PATTERNS DE MIGRATION
 * ============================================
 * 
 * // ❌ ANCIEN (À NE PLUS UTILISER)
 * const { showNotification } = useContext(NotificationContext);
 * showNotification('Message', 'success');
 * 
 * // ✅ NOUVEAU (À UTILISER)
 * const alert = useAlert();
 * alert.success('Message');
 * 
 * // ❌ ANCIEN (À NE PLUS UTILISER)
 * const { openConfirmation } = useInlineConfirmation();
 * const [confirmed, setConfirmed] = useState(false);
 * if (openConfirmation(...)) {
 *   // Handle confirmation
 * }
 * 
 * // ✅ NOUVEAU (À UTILISER)
 * const { confirm } = useConfirmation();
 * confirm({
 *   title: '...',
 *   onConfirm: () => { ... },
 *   onCancel: () => { ... }
 * });
 * 
 * ============================================
 * DÉDUPLICATION DES MESSAGES
 * ============================================
 * 
 * Le système empêche automatiquement les doublons :
 * - Même message + même type = toast non affiché
 * - Hash généré automatiquement
 * - Aucune configuration requise
 * 
 * ============================================
 * ANIMATIONS ET COMPORTEMENT
 * ============================================
 * 
 * TOASTS :
 * - Position: center (vertical center-up)
 * - Animation d'entrée: fade + slide (300ms)
 * - Animation de sortie: fade + slide (300ms)
 * - Auto-dismiss: 4 secondes (configurable)
 * - Pause au hover: oui
 * - Stack: vertical, jusqu'à 5 max
 * - Click bouton X: ferme le toast
 * 
 * MODALES :
 * - Position: center
 * - Animation: scale + fade (300ms)
 * - Overlay: blur + semi-transparent
 * - Échap: ferme et appelle onCancel
 * - Focus trap: 1er focus sur bouton "Annuler"
 * - Bloquante: oui (overlay absorbe les clics)
 * 
 * ============================================
 * ACCESSIBILITÉ
 * ============================================
 * 
 * TOASTS :
 * - role="alert"
 * - aria-live="polite"
 * - Buttons accessibles (aria-label)
 * 
 * MODALES :
 * - role="dialog"
 * - aria-modal="true"
 * - aria-labelledby / aria-describedby
 * - Focus management automatique
 * - Fermeture à l'Échap
 * - Respects prefers-reduced-motion
 * 
 * ============================================
 * ERREURS COURANTES À ÉVITER
 * ============================================
 * 
 * ❌ Afficher un warning critique en toast
 *    alert.success('Attention: XXX');  // Mauvais !
 * 
 * ✅ Utiliser une modale pour les warnings critiques
 *    alert.confirm({ title: 'Attention', ... })
 * 
 * ❌ Ne pas fournir d'onConfirm/onCancel
 *    alert.confirm({...})  // Les callbacks sont vides
 * 
 * ✅ Toujours spécifier les callbacks
 *    alert.confirm({
 *      onConfirm: async () => { ... },
 *      onCancel: () => { ... }
 *    })
 * 
 * ❌ Afficher trop de toasts à la fois
 *    for (let i = 0; i < 100; i++) 
 *      alert.success('Item ' + i);  // Spam !
 * 
 * ✅ Regrouper les messages
 *    alert.success('100 items créés avec succès');
 * 
 * ============================================
 * TESTING
 * ============================================
 * 
 * ```jsx
 * import { render, screen } from '@testing-library/react';
 * import { AlertProvider } from '../contexts/AlertContext';
 * import { useAlert } from '../hooks/useAlert';
 * 
 * function TestComponent() {
 *   const alert = useAlert();
 *   return (
 *     <button onClick={() => alert.success('Test')}>Show Alert</button>
 *   );
 * }
 * 
 * test('shows success toast', async () => {
 *   render(
 *     <AlertProvider>
 *       <TestComponent />
 *     </AlertProvider>
 *   );
 *   
 *   const btn = screen.getByText('Show Alert');
 *   fireEvent.click(btn);
 *   
 *   expect(screen.getByText('Test')).toBeInTheDocument();
 * });
 * ```
 * 
 * ============================================
 * Q&A - QUESTIONS FRÉQUENTES
 * ============================================
 * 
 * Q: Oi vais-je afficher les erreurs d'API ?
 * R: Dans les catch blocks, utilisez alert.error() avec le message d'erreur
 *    try { ... } catch (err) { alert.error(err.message); }
 * 
 * Q: Quand utiliser info() au lieu de success() ?
 * R: success() = action positif complétée
 *    info() = informations neutres, mises à jour en cours, etc.
 * 
 * Q: Puis-je personnaliser les couleurs des toasts ?
 * R: Non, les couleurs sont standardisées. Éditer AlertSystem.css si besoin.
 * 
 * Q: Comment désactiver l'auto-dismiss ?
 * R: alert.success(msg, 0)  // 0 = pas de dismiss automatique
 * 
 * Q: Puis-je avoir 2 modales en même temps ?
 * R: Non, 1 seule modale à la fois. La 2ème remplace la 1ère.
 * 
 * Q: Quel'est la différence entre warning() et confirm() ?
 * R: warning() n'existe pas. Utilisez confirm() pour les actions critiques.
 *    Les warnings critiques = modales obligatoires.
 * 
 * ============================================
 */
