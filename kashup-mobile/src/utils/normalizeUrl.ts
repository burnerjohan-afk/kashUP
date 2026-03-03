/**
 * Normalise les URLs d'images
 * - Si image commence par http => OK
 * - Si commence par "/uploads/" => return apiOrigin + imagePath
 * - Si null => placeholder
 */

import { apiOrigin } from '../config/runtime';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/F5F5F5/CCCCCC?text=Image+non+disponible';

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

  // Si déjà une URL complète (http/https), retourner tel quel
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
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

