/**
 * Normalise les URLs d'images
 * - Si image commence par http => OK (sauf Blob Vercel privé → proxy API)
 * - Si commence par "/uploads/" => return apiOrigin + imagePath
 * - Si null => placeholder
 */

import { apiOrigin, apiBaseUrl } from '../config/runtime';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/F5F5F5/CCCCCC?text=Image+non+disponible';
const BLOB_HOST = 'blob.vercel-storage.com';

/**
 * Si l'URL pointe vers un Blob Vercel (store privé), retourne l'URL du proxy API.
 */
function proxyBlobUrlIfNeeded(url: string): string {
  if (url.includes(BLOB_HOST)) {
    return `${apiBaseUrl}/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Normalise une URL d'image
 * @param imagePath - Chemin de l'image (peut être null, undefined, URL complète, ou chemin relatif)
 * @returns URL complète normalisée ou placeholder
 */
export function normalizeImageUrl(imagePath: string | null | undefined): string {
  // Si null ou undefined, retourner placeholder
  if (!imagePath || imagePath.trim() === '') {
    return PLACEHOLDER_IMAGE;
  }

  const trimmed = imagePath.trim();

  // Si déjà une URL complète (http/https) : utiliser le proxy pour les Blob privés
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return proxyBlobUrlIfNeeded(trimmed);
  }

  // Si commence par "/uploads/" ou "/", construire l'URL complète
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/')) {
    // Enlever le slash initial si présent pour éviter les doubles slashes
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${apiOrigin}${cleanPath}`;
  }

  // Sinon, traiter comme un chemin relatif
  return `${apiOrigin}/${trimmed}`;
}

/**
 * Normalise une URL de logo (même logique)
 */
export function normalizeLogoUrl(logoPath: string | null | undefined): string {
  return normalizeImageUrl(logoPath);
}

