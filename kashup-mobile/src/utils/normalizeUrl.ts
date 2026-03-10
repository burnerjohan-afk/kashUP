/**
 * Normalise les URLs d'images
 * - Si image commence par http => OK (sauf Blob Vercel privé → proxy API)
 * - Si commence par "/uploads/" => return apiOrigin + imagePath
 * - Si null => placeholder
 */

import { apiOrigin, getBlobProxyBaseUrl } from '../config/runtime';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/F5F5F5/CCCCCC?text=Image+non+disponible';
const BLOB_HOST = 'blob.vercel-storage.com';
const REWARDS_PATH_PREFIX = 'uploads/rewards/';

/**
 * Si l'URL pointe vers un Blob Vercel (store privé), retourne l'URL du proxy API.
 * En dev local, utilise le proxy de prod pour que les images s'affichent sans token local.
 */
function proxyBlobUrlIfNeeded(url: string): string {
  if (url.includes(BLOB_HOST)) {
    const base = getBlobProxyBaseUrl();
    return `${base}/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Corrige /upload/ en /uploads/ (chemin servi par l'API). */
function fixUploadPath(url: string): string {
  return url.replace(/\/upload\//g, '/uploads/').replace(/^\/upload(\/|$)/, '/uploads$1');
}

/**
 * Normalise une URL d'image (même logique que pour les offres).
 * - URL Blob → proxy API /blob?url=...
 * - Chemin uploads/rewards/... → proxy API /rewards/file?path=... (loteries, comme offres côté serveur)
 * - Autre chemin /uploads/... → apiOrigin + path
 */
export function normalizeImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath || imagePath.trim() === '') {
    return PLACEHOLDER_IMAGE;
  }

  let trimmed = imagePath.trim();
  trimmed = fixUploadPath(trimmed);

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return proxyBlobUrlIfNeeded(trimmed);
  }

  const pathNoLeadingSlash = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
  if (pathNoLeadingSlash.startsWith(REWARDS_PATH_PREFIX)) {
    const base = getBlobProxyBaseUrl();
    return `${base}/rewards/file?path=${encodeURIComponent(pathNoLeadingSlash)}`;
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${apiOrigin}${cleanPath}`;
  }

  return `${apiOrigin}/${trimmed}`;
}

/**
 * Normalise une URL de logo (même logique)
 */
export function normalizeLogoUrl(logoPath: string | null | undefined): string {
  return normalizeImageUrl(logoPath);
}

