const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/exports'; // adapte le port si besoin

const EXPORTS = [
  { type: 'conges', params: { dateDebut: '2024-01-01', dateFin: '2024-12-31', statut: 'valide' } },
  { type: 'absences', params: { dateDebut: '2024-01-01', dateFin: '2024-12-31' } },
  { type: 'arrets-maladie', params: {} },
  { type: 'utilisateurs', params: {} },
  { type: 'audit', params: {} },
  { type: 'statistiques', params: {} }
];

(async () => {
  for (const exp of EXPORTS) {
    try {
      const url = `${API_URL}/${exp.type}/csv`;
      const res = await axios.get(url, {
        params: exp.params,
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${process.env.TOKEN || ''}` }
      });
      const file = `export_${exp.type}.csv`;
      fs.writeFileSync(file, res.data);
      console.log(`✅ Export ${exp.type} OK (${file})`);
    } catch (err) {
      console.error(`❌ Erreur export ${exp.type}:`, err.response?.data || err.message);
    }
  }
})();
