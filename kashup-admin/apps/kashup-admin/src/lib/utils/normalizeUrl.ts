/**
 * Helper pour normaliser les URLs d'images et de fichiers
 * Utilise l'origine API au runtime (getApiBaseOrigin) pour que les images
 * s'affichent correctement en prod quand l'admin et l'API sont sur des domaines différents.
 *
 * Règles:
 * - Si imagePath est une URL Vercel Blob (privée) => passer par le proxy API /api/v1/blob?url=...
 * - Si imagePath commence par "http" ou "data:" (hors Blob) => utiliser tel quel
 * - Si imagePath est relatif (/ ou sans /) => baseOrigin + path
 * - Corriger les doublons "/uploads/uploads" => "/uploads"
 */

import { getApiBaseOrigin, getApiBaseUrl } from '@/lib/api/kashup-client';

const BLOB_HOST = 'blob.vercel-storage.com';

/**
 * Normalise une URL d'image pour qu'elle soit absolue
 * 
 * @param imagePath - Chemin de l'image (relatif ou absolu)
 * @returns URL absolue normalisée
 * 
 * @example
 * normalizeImageUrl('/uploads/logo.png') => 'http://localhost:4000/uploads/logo.png'
 * normalizeImageUrl('uploads/uploads/logo.png') => 'http://localhost:4000/uploads/logo.png'
 * normalizeImageUrl('http://example.com/image.jpg') => 'http://example.com/image.jpg'
 */
export const normalizeImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
    return null;
  }

  let cleanedPath = imagePath.trim();

  // Corriger les doublons dans le chemin (ex: /uploads/uploads/ -> /uploads/)
  cleanedPath = cleanedPath.replace(/\/uploads\/uploads+/g, '/uploads/');
  cleanedPath = cleanedPath.replace(/\/uploadsuploads/g, '/uploads');
  cleanedPath = cleanedPath.replace(/^uploads\/uploads+/g, 'uploads/');
  cleanedPath = cleanedPath.replace(/^uploadsuploads/g, 'uploads');

  // Les URLs Blob Vercel sont privées : les faire passer par le proxy de l'API pour qu'elles s'affichent en prod
  if (cleanedPath.includes(BLOB_HOST)) {
    const base = getApiBaseUrl().replace(/\/+$/, '');
    return base ? `${base}/blob?url=${encodeURIComponent(cleanedPath)}` : cleanedPath;
  }

  // Si c'est déjà une URL absolue (http/https) ou data URL, utiliser tel quel
  if (cleanedPath.startsWith('http://') || cleanedPath.startsWith('https://') || cleanedPath.startsWith('data:')) {
    return cleanedPath;
  }

  const base = getApiBaseOrigin().replace(/\/+$/, '');
  if (cleanedPath.startsWith('/')) {
    return base ? `${base}${cleanedPath}` : cleanedPath;
  }
  return base ? `${base}/${cleanedPath}` : `/${cleanedPath}`;
};

/**
 * Normalise plusieurs champs d'image possibles dans un objet
 * Recherche dans: logo, logoUrl, logoPath, image, imageUrl
 * 
 * @param obj - Objet contenant potentiellement des champs d'image
 * @param targetField - Champ cible où stocker l'URL normalisée (défaut: 'logoUrl')
 * @returns Objet avec le champ targetField mis à jour
 */
export const normalizeImageFields = <T extends Record<string, unknown>>(
  obj: T,
  targetField: string = 'logoUrl'
): T => {
  // Chercher dans tous les champs possibles
  const imageFields = ['logo', 'logoUrl', 'logoPath', 'image', 'imageUrl'];
  
  for (const field of imageFields) {
    const value = obj[field];
    if (value && typeof value === 'string' && value.trim() !== '') {
      const normalized = normalizeImageUrl(value);
      if (normalized) {
        return {
          ...obj,
          [targetField]: normalized,
        };
      }
    }
  }

  return obj;
};

