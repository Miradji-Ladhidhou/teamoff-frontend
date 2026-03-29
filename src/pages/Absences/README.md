# Module Absences TeamOff

- `AbsenceForm.jsx` : formulaire de déclaration d'absence (validation, upload justificatif)
- `AbsenceCalendar.jsx` : calendrier/planning des absences (couleurs, légende, API)
- `index.jsx` : page principale combinant formulaire et calendrier

Pour intégrer dans l'app :
- Ajouter la route `/absences` dans le routeur principal
- Installer les dépendances : `react-big-calendar`, `moment`, `axios`
- Adapter l'API d'upload si besoin
