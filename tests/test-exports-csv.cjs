const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5500/api/exports'; // backend sur le port 5500, préfixe /api

const EXPORTS = [
  { type: 'conges', params: { dateDebut: '2024-01-01', dateFin: '2024-12-31', statut: 'valide_manager' } },
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
      if (err.response) {
        let errorMsg = err.response.data;
        // Si c'est un buffer JSON, essaye de parser
        if (Buffer.isBuffer(errorMsg)) {
          try {
            errorMsg = JSON.parse(errorMsg.toString('utf-8'));
          } catch {}
        }
        console.error(`❌ Erreur export ${exp.type}:`, err.response.status, err.response.statusText, errorMsg);
      } else {
        console.error(`❌ Erreur export ${exp.type}:`, err.message);
      }
    }
  }
})();
