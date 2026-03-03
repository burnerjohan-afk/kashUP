import { Request } from 'express';
import { buildLanUrl } from './network';
import logger from './logger';

/**
 * Champs sensibles à exclure des réponses publiques
 */
const SENSITIVE_FIELDS = {
  partner: [
    'siret',
    // phone et openingHours exposés pour la fiche partenaire (contact public)
    'documents', // Documents privés (KBIS, etc.)
    'additionalInfo', // Peut contenir des infos sensibles
    'affiliations', // Peut contenir des infos sensibles
  ],
  user: [
    'hashedPassword',
    'email',
    'phone',
    'bankAccessLogs',
    'bankConsents',
    'powensConnections',
  ],
  transaction: [
    'metadata', // Peut contenir des infos sensibles
  ],
  // Ajouter d'autres ressources si nécessaire
} as const;

/**
 * Filtre les champs sensibles d'un objet selon le type de ressource
 * @param data - Données à filtrer
 * @param resourceType - Type de ressource (partner, user, transaction, etc.)
 * @returns Données filtrées
 */
export function filterSensitiveFields<T extends Record<string, any>>(
  data: T,
  resourceType: keyof typeof SENSITIVE_FIELDS
): Partial<T> {
  const sensitiveFields = SENSITIVE_FIELDS[resourceType] || [];
  
  if (!sensitiveFields.length) {
    return data;
  }
  
  const filtered = { ...data };
  
  for (const field of sensitiveFields) {
    delete filtered[field];
  }
  
  return filtered;
}

/**
 * Détermine si la requête est une requête admin
 * @param req - Request Express
 * @returns true si admin, false sinon
 */
export function isAdminRequest(req: Request): boolean {
  const user = (req as any).user;
  return user?.role === 'admin' || user?.role === 'partner';
}

/**
 * Sérialise une ressource selon le contexte (public ou admin)
 * @param req - Request Express
 * @param data - Données à sérialiser
 * @param resourceType - Type de ressource
 * @returns Données sérialisées
 */
export function serializeResource<T extends Record<string, any>>(
  req: Request,
  data: T,
  resourceType: keyof typeof SENSITIVE_FIELDS
): Partial<T> {
  const isAdmin = isAdminRequest(req);
  
  if (isAdmin) {
    // Admin : retourner toutes les données
    return data;
  }
  
  // Public : filtrer les champs sensibles
  return filterSensitiveFields(data, resourceType);
}

/**
 * Transforme une URL relative en URL absolue avec IP LAN si nécessaire
 * @param req - Request Express
 * @param relativePath - Chemin relatif (ex: /uploads/...)
 * @returns URL absolue
 */
export function buildImageUrl(req: Request, relativePath: string | null | undefined): string | null {
  if (!relativePath) {
    return null;
  }
  
  // Si c'est déjà une URL absolue, la retourner telle quelle
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Construire l'URL absolue avec IP LAN
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  return buildLanUrl(relativePath, port);
}

/**
 * Cache pour l'IP LAN (évite de la recalculer à chaque requête)
 */
let cachedLanIp: string | null = null;
let cachedLanIpTime: number = 0;
const LAN_IP_CACHE_TTL = 60000; // 1 minute

/**
 * Sérialise un partenaire avec transformation des URLs d'images
 * Optimisé pour éviter les opérations coûteuses
 * @param req - Request Express
 * @param partner - Données du partenaire
 * @returns Partenaire sérialisé
 */
export function serializePartner(req: Request, partner: any): any {
  // Vérifier que partner est valide
  if (!partner || typeof partner !== 'object') {
    logger.warn({ partner }, '⚠️ serializePartner: partner invalide');
    return null;
  }
  
  const isAdmin = isAdminRequest(req);
  const serialized = serializeResource(req, partner, 'partner');
  
  // Vérifier que serialized est valide
  if (!serialized || typeof serialized !== 'object') {
    logger.warn({ partner, serialized }, '⚠️ serializePartner: serialized invalide');
    return null;
  }
  
  // Conserver le logoUrl original pour référence
  const originalLogoUrl = partner.logoUrl || null;
  
  // Utiliser le cache pour l'IP LAN (évite de la recalculer à chaque fois)
  const now = Date.now();
  if (!cachedLanIp || (now - cachedLanIpTime) > LAN_IP_CACHE_TTL) {
    const { getLocalIPv4 } = require('./network');
    cachedLanIp = getLocalIPv4();
    cachedLanIpTime = now;
  }
  
  // Transformer les URLs d'images en URLs absolues avec IP LAN (optimisé)
  if (originalLogoUrl && !originalLogoUrl.startsWith('http')) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    const absoluteUrl = cachedLanIp 
      ? `http://${cachedLanIp}:${port}${originalLogoUrl}`
      : `http://localhost:${port}${originalLogoUrl}`;
    serialized.logoUrl = absoluteUrl;
    serialized.imageUrl = absoluteUrl;
    serialized.imagePath = originalLogoUrl;
  } else if (originalLogoUrl) {
    // Déjà une URL absolue
    serialized.logoUrl = originalLogoUrl;
    serialized.imageUrl = originalLogoUrl;
    serialized.imagePath = originalLogoUrl;
  } else {
    serialized.logoUrl = null;
    serialized.imageUrl = null;
    serialized.imagePath = null;
  }
  
  // S'assurer que category est toujours un objet (optimisé)
  // formatPartnerResponse peut retourner category: null, on doit le convertir en objet
  if (serialized.category && typeof serialized.category === 'object' && serialized.category !== null) {
    const categoryName = serialized.category.name || '';
    serialized.categoryName = categoryName;
    serialized.category.name = categoryName || ''; // Toujours une string, jamais undefined
    serialized.category.id = serialized.category.id || null;
  } else {
    // Si category est null, undefined, ou autre chose, créer un objet par défaut
    serialized.category = {
      id: null,
      name: ''
    };
    serialized.categoryName = '';
  }
  
  // Double vérification : s'assurer que category.name existe toujours
  if (!serialized.category || typeof serialized.category !== 'object') {
    serialized.category = { id: null, name: '' };
    serialized.categoryName = '';
  }
  if (typeof serialized.category.name !== 'string') {
    serialized.category.name = '';
    serialized.categoryName = '';
  }
  
  // S'assurer que territories est toujours un array (optimisé)
  if (!Array.isArray(serialized.territories)) {
    serialized.territories = serialized.territories ? [serialized.territories] : [];
  }

  // Garantir que les taux de cashback sont toujours présents pour l'app mobile (ne jamais les perdre)
  const num = (v: any) => (v !== undefined && v !== null && v !== '' ? Number(v) : null);
  serialized.tauxCashbackBase = num(serialized.tauxCashbackBase ?? partner.tauxCashbackBase) ?? 0;
  serialized.discoveryCashbackRate = num(serialized.discoveryCashbackRate ?? partner.discoveryCashbackRate);
  serialized.permanentCashbackRate = num(serialized.permanentCashbackRate ?? partner.permanentCashbackRate);
  serialized.pointsPerTransaction = num(serialized.pointsPerTransaction ?? partner.pointsPerTransaction);
  
  // Transformer les autres URLs d'images si présentes (seulement si nécessaire)
  if (Array.isArray(serialized.menuImages) && serialized.menuImages.length > 0) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    serialized.menuImages = serialized.menuImages
      .filter((img: any) => img && typeof img === 'string')
      .map((img: string) => {
        if (img.startsWith('http')) return img;
        return cachedLanIp 
          ? `http://${cachedLanIp}:${port}${img}`
          : `http://localhost:${port}${img}`;
      });
  } else {
    serialized.menuImages = [];
  }
  
  if (Array.isArray(serialized.photos) && serialized.photos.length > 0) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    serialized.photos = serialized.photos
      .filter((img: any) => img && typeof img === 'string')
      .map((img: string) => {
        if (img.startsWith('http')) return img;
        return cachedLanIp 
          ? `http://${cachedLanIp}:${port}${img}`
          : `http://localhost:${port}${img}`;
      });
  } else {
    serialized.photos = [];
  }
  
  // S'assurer que affiliations est toujours un array (optimisé - éviter JSON.parse si possible)
  if (!Array.isArray(serialized.affiliations)) {
    if (serialized.affiliations) {
      if (typeof serialized.affiliations === 'string') {
        try {
          serialized.affiliations = JSON.parse(serialized.affiliations);
        } catch {
          serialized.affiliations = [];
        }
      } else {
        serialized.affiliations = [serialized.affiliations];
      }
    } else {
      serialized.affiliations = [];
    }
  }
  
  // S'assurer que marketingPrograms est toujours un array (optimisé)
  if (!Array.isArray(serialized.marketingPrograms)) {
    if (serialized.marketingPrograms) {
      if (typeof serialized.marketingPrograms === 'string') {
        try {
          serialized.marketingPrograms = JSON.parse(serialized.marketingPrograms);
        } catch {
          serialized.marketingPrograms = [];
        }
      } else {
        serialized.marketingPrograms = [serialized.marketingPrograms];
      }
    } else {
      serialized.marketingPrograms = [];
    }
  }
  
  return serialized;
}

/**
 * Sérialise une liste de ressources
 * @param req - Request Express
 * @param items - Liste de données
 * @param resourceType - Type de ressource
 * @returns Liste sérialisée
 */
export function serializeList<T extends Record<string, any>>(
  req: Request,
  items: T[],
  resourceType: keyof typeof SENSITIVE_FIELDS
): Partial<T>[] {
  if (!Array.isArray(items)) {
    logger.warn({ items, resourceType }, '⚠️ serializeList: items n\'est pas un array');
    return [];
  }
  
  if (resourceType === 'partner') {
    // Pour les partenaires, utiliser serializePartner pour la transformation des URLs
    const serialized = items
      .map(item => serializePartner(req, item))
      .filter(item => item !== null); // Filtrer les nulls
    return serialized;
  }
  return items.map(item => serializeResource(req, item, resourceType));
}

