/**
 * HTTP Security Headers & Cache Route Normalization
 * photo.emre.xyz
 */

/**
 * Standard Security Headers for photo.emre.xyz
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Content-Security-Policy':
    "default-src 'self' https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https: wss:; " +
    "font-src 'self' data: https:; " +
    "frame-ancestors 'none';",
};

export function normalizePath(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') {
    return '/';
  }
  if (pathname.startsWith('/en/')) {
    return pathname.slice(3);
  }
  return pathname;
}

/**
 * Determines if a given path is eligible for edge caching.
 */
export function isCacheableRoute(pathname: string, method: string): boolean {
  if (method !== 'GET') {
    return false;
  }

  const path = normalizePath(pathname);

  // Never cache admin routes, login flows, creation forms, or cache manipulation endpoints
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/cache') ||
    path === '/events/create' ||
    path.startsWith('/events/create')
  ) {
    return false;
  }

  // Cacheable public SSR routes and media download endpoints
  return (
    path === '/' ||
    path === '/events' ||
    path === '/about' ||
    path === '/contact' ||
    path.startsWith('/album') ||
    path.startsWith('/org') ||
    path.startsWith('/api/download')
  );
}
