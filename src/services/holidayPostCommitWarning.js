import { alertService } from './alertService';

export function notifyHolidayPostCommitWarning(response) {
  if (!/^\/jours-feries(?:\/|$)/.test(response.config?.url || '')) return false;
  if (response.headers?.['x-teamoff-warning'] !== 'HOLIDAY_POST_COMMIT_FAILED') return false;
  alertService.info(
    'Opération sur les jours fériés enregistrée, mais un traitement après validation ou le nettoyage de la connexion a échoué. Ne relancez pas l’opération.'
  );
  return true;
}
