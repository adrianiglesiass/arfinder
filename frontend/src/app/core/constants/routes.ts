export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/registro',
  VERIFY_EMAIL: '/verificar-email',
  AUTH_CALLBACK: '/auth/callback',
  WELCOME: '/bienvenida',
  EXPLORE: '/explorar',
  PROFILE: '/perfil',
  PROFILE_DETAIL: '/perfil',
  MESSAGES: '/mensajes',
  FAVORITES: '/favoritos',
  BLOCKED: '/bloqueados',
  PRIVACY: '/privacidad',
  TERMS: '/terminos',
  COOKIES: '/cookies',
  LEGAL_NOTICE: '/aviso-legal',
} as const;

/**
 * Routes that live outside the authenticated app.
 * They are excluded from the navigation history so "back" never leads into the auth flow.
 */
export const AUTH_PATHS: readonly string[] = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.VERIFY_EMAIL,
  ROUTES.AUTH_CALLBACK,
];

/** Tells whether a URL belongs to the public auth flow, query string and fragment ignored. */
export function isAuthPath(url: string): boolean {
  const [path] = url.split(/[?#]/);
  return AUTH_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`));
}
