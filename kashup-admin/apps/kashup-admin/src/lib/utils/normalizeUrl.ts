/**
 * Helper pour normaliser les URLs d'images et de fichiers
 * 
 * Règles:
 * - Si imagePath commence par "/uploads/" => baseOrigin + imagePath
 * - Si imagePath commence par "http" => utiliser tel quel
 * - Si imagePath est relatif sans "/" => baseOrigin + "/" + imagePath
 * - Corriger les doublons "/uploads/uploads" => "/uploads"
 */

import { API_CONFIG } from '@/config/api';

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

  // Si c'est déjà une URL absolue (http/https) ou data URL, utiliser tel quel
  if (cleanedPath.startsWith('http://') || cleanedPath.startsWith('https://') || cleanedPath.startsWith('data:')) {
    return cleanedPath;
  }

  // Si le chemin commence par "/", utiliser baseOrigin + path
  if (cleanedPath.startsWith('/')) {
    return `${API_CONFIG.baseOrigin}${cleanedPath}`;
  }

  // Sinon, chemin relatif sans "/", ajouter "/"
  return `${API_CONFIG.baseOrigin}/${cleanedPath}`;
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

