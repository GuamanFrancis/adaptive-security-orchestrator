import { useEffect, useState } from 'react';

export type Route = '/' | '/login' | '/register' | '/app/create' | '/app/library';
const known = new Set<string>(['/', '/login', '/register', '/app/create', '/app/library']);

export function navigate(route: Route) {
  window.history.pushState({}, '', route);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => known.has(location.pathname) ? location.pathname as Route : '/');
  useEffect(() => {
    const update = () => setRoute(known.has(location.pathname) ? location.pathname as Route : '/');
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return route;
}
