/**
 * Système de persistance pour MSW
 * Sauvegarde les données dans localStorage pour qu'elles persistent après rechargement
 */

const STORAGE_KEY = 'kashup-admin-mock-db';

/**
 * Charge les données depuis localStorage
 */
export const loadFromStorage = <T>(key: keyof T, defaultValue: T[keyof T]): T[keyof T] => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultValue;
    }
    
    const data = JSON.parse(stored) as Partial<T>;
    return (data[key] as T[keyof T]) ?? defaultValue;
  } catch (error) {
    console.error(`[Persistence] Erreur lors du chargement de ${String(key)}:`, error);
    return defaultValue;
  }
};

/**
 * Sauvegarde les données dans localStorage
 */
export const saveToStorage = <T>(key: keyof T, value: T[keyof T]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? (JSON.parse(stored) as Partial<T>) : {};
    data[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error(`[Persistence] Erreur lors de la sauvegarde de ${String(key)}:`, error);
  }
};

/**
 * Fonction utilitaire pour créer une copie profonde sans les images
 * Cette fonction ne modifie PAS l'objet original
 */
const createDeepCopyWithoutImages = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => createDeepCopyWithoutImages(item));
  }
  
  const copy = { ...obj };
  
  // Si c'est un partenaire, supprimer les images
  if (copy.id && (copy.name || copy.category)) {
    delete copy.logoUrl;
    delete copy.kbisUrl;
    delete copy.giftCardImageUrl;
    delete copy.giftCardVirtualCardImageUrl;
    delete copy.menuImages;
    delete copy.photos;
  }
  
  // Si c'est une association, supprimer l'image
  if (copy.id && copy.but) {
    delete copy.imageUrl;
  }
  
  // Si c'est une récompense, supprimer l'image
  if (copy.id && (copy.type || copy.title)) {
    delete copy.imageUrl;
  }
  
  // Si c'est une carte Up ou Box Up, supprimer l'image
  if (copy.id && (copy.nom || copy.partenaires)) {
    delete copy.imageUrl;
  }
  
  // Si c'est un document, supprimer l'URL
  if (copy.id && copy.type && copy.partnerId) {
    delete copy.url;
  }
  
  // Récursivement traiter les propriétés imbriquées
  for (const key in copy) {
    if (copy[key] && typeof copy[key] === 'object' && !Array.isArray(copy[key])) {
      copy[key] = createDeepCopyWithoutImages(copy[key]);
    }
  }
  
  return copy;
};

/**
 * Sauvegarde toutes les données de la base de données
 * Les images (data URLs) sont maintenant incluses dans la persistance
 * ATTENTION: Cela peut causer des problèmes de quota localStorage si trop d'images
 * Si le quota est dépassé, le système basculera automatiquement sur le mode sans images
 */
export const saveAllToStorage = <T extends Record<string, unknown>>(db: T): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Essayer d'abord de sauvegarder TOUTES les données, y compris les images
    const serialized = JSON.stringify(db);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    if (import.meta.env.DEV) {
      const sizeInMB = (serialized.length / (1024 * 1024)).toFixed(2);
      console.log(`[Persistence] Données sauvegardées (${sizeInMB} MB) - Images incluses`);
    }
  } catch (error) {
    // Si l'erreur est due à un quota dépassé, essayer de sauvegarder sans les images
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[Persistence] Quota localStorage dépassé, tentative de sauvegarde sans les images...');
      try {
        // Créer une copie sans les images pour la persistance
        const dbWithoutImages = createDeepCopyWithoutImages(db);
        const serialized = JSON.stringify(dbWithoutImages);
        localStorage.setItem(STORAGE_KEY, serialized);
        console.warn('[Persistence] Données sauvegardées sans les images (quota dépassé)');
      } catch (fallbackError) {
        console.error('[Persistence] Impossible de sauvegarder même sans les images:', fallbackError);
      }
    } else {
      console.error('[Persistence] Erreur lors de la sauvegarde complète:', error);
    }
  }
};

/**
 * Charge toutes les données depuis localStorage
 * Les images sont maintenant chargées depuis localStorage si disponibles
 */
export const loadAllFromStorage = <T extends Record<string, unknown>>(defaultDb: T): T => {
  if (typeof window === 'undefined') {
    return defaultDb;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultDb;
    }
    
    const storedData = JSON.parse(stored) as Partial<T>;
    
    // Fusionner les données stockées avec les données par défaut
    // pour s'assurer que toutes les clés existent
    const merged = { ...defaultDb };
    for (const key in storedData) {
      if (key in merged && storedData[key] !== undefined) {
        merged[key] = storedData[key] as T[Extract<keyof T, string>];
      }
    }
    
    // Les images sont maintenant incluses dans merged (si elles étaient dans storedData)
    
    if (import.meta.env.DEV) {
      const sizeInMB = (stored.length / (1024 * 1024)).toFixed(2);
      console.log(`[Persistence] Données chargées (${sizeInMB} MB) - Images incluses`);
    }
    
    return merged;
  } catch (error) {
    console.error('[Persistence] Erreur lors du chargement complet:', error);
    return defaultDb;
  }
};

/**
 * Réinitialise toutes les données (supprime localStorage)
 */
export const clearStorage = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Persistence] Données réinitialisées');
  } catch (error) {
    console.error('[Persistence] Erreur lors de la réinitialisation:', error);
  }
};

