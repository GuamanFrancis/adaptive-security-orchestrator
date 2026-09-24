import { useEffect, useState } from 'react';

export type Route = '/' | '/catalog' | '/login' | '/register' | '/app/create' | '/app/library' | '/app/editor';
const known = new Set<string>(['/', '/catalog', '/login', '/register', '/app/create', '/app/library', '/app/editor']);

export function normalizeRoute(pathname: string): Route {
  if (pathname === '/create') return '/app/create';
  if (pathname === '/editor') return '/app/editor';
  if (pathname === '/library') return '/app/library';
  if (pathname === '/explore') return '/catalog';
  return known.has(pathname) ? (pathname as Route) : '/';
}

export function navigate(route: Route | string) {
  window.history.pushState({}, '', route);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => normalizeRoute(location.pathname));
  useEffect(() => {
    const update = () => setRoute(normalizeRoute(location.pathname));
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return route;
}
