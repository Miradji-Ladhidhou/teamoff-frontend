const DEFAULT_DISABLED_ROUTES = ['/login', '/maintenance'];

let disabledRoutes = [...DEFAULT_DISABLED_ROUTES];

const normalizeRoute = (route) => {
  if (!route || typeof route !== 'string') return '';
  const trimmed = route.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const setNotificationDisabledRoutes = (routes = []) => {
  if (!Array.isArray(routes)) return;

  disabledRoutes = routes
    .map(normalizeRoute)
    .filter(Boolean);
};

export const getNotificationDisabledRoutes = () => [...disabledRoutes];

export const isNotificationDisabledForPath = (pathname = '') => {
  const path = normalizeRoute(pathname || '/');

  return disabledRoutes.some((rule) => {
    if (rule.endsWith('*')) {
      const prefix = rule.slice(0, -1);
      return path.startsWith(prefix);
    }

    return path === rule;
  });
};

export const isNotificationDisabledForCurrentRoute = () => {
  if (typeof window === 'undefined') return false;
  return isNotificationDisabledForPath(window.location.pathname || '/');
};
