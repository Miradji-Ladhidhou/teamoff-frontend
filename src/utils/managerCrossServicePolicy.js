export const MANAGER_CATEGORIES = [
  { key: 'conges', label: 'Congés' },
  { key: 'absence_exceptionnelle', label: 'Absences exceptionnelles' },
  { key: 'maladie', label: 'Arrêts maladie' },
];

export function normalizeManagerCrossServicePolicy(policy = {}) {
  const leaveAction = policy.manager_can_validate_all_services === true;
  const leaveView = leaveAction || policy.manager_can_view_all_services === true;
  const absenceView = policy.manager_can_view_all_absences === true;
  return Object.fromEntries(MANAGER_CATEGORIES.map(({ key }) => {
    const legacy = key === 'conges'
      ? { view: leaveView, email: leaveView, in_app: leaveView, participation: leaveAction ? 'action' : 'information' }
      : { view: absenceView, email: absenceView, in_app: false, participation: 'information' };
    const explicit = policy.manager_cross_service?.[key];
    return [key, explicit && typeof explicit === 'object' && !Array.isArray(explicit)
      ? {
        view: explicit.view === true || explicit.participation === 'action',
        email: explicit.email === true,
        in_app: explicit.in_app === true,
        participation: explicit.participation === 'action' ? 'action' : 'information',
      }
      : legacy];
  }));
}
