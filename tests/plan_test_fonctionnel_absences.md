# Plan de test fonctionnel – Page Absences

## 1. Création d’une absence
- Aller sur la page Absences
- Cliquer sur « Déclarer une absence »
- Remplir tous les champs obligatoires (type, dates)
- Pour maladie, joindre un justificatif (PDF/image)
- Cliquer sur « Déclarer l’absence »
- Vérifier l’apparition d’une alerte de succès
- Vérifier l’ajout de l’absence dans le calendrier

## 2. Gestion des erreurs
- Tenter de valider sans remplir tous les champs
- Vérifier l’affichage d’une alerte d’erreur
- Pour maladie, essayer sans justificatif → erreur attendue

## 3. Édition d’une absence
- Cliquer sur « Éditer » sur une absence du calendrier
- Modifier le commentaire
- Enregistrer
- Vérifier l’alerte de succès et la mise à jour

## 4. Export des absences
- Cliquer sur « Export CSV »
- Vérifier le téléchargement du fichier CSV
- Cliquer sur « Export PDF »
- Vérifier l’ouverture de l’aperçu PDF

## 5. Affichage et design
- Vérifier la présence du titre, de la légende, des boutons
- Vérifier la cohérence des couleurs et textes

## 6. Notifications email (si testable)
- Créer une absence et vérifier la réception de l’email (en boîte de réception ou logs serveur)

---

**Remarque :**
- Refaire les tests pour chaque rôle utilisateur (employé, manager, admin)
- Tester sur desktop et mobile si possible
- Noter tout bug ou incohérence rencontrée
