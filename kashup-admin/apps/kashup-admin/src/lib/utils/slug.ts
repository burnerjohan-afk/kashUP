/**
 * Utilitaires pour la conversion en slugs
 * Utilisé pour normaliser les catégories avant envoi à l'API
 */

/**
 * Mapping des labels de catégories UI vers les slugs attendus par l'API
 */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  // Labels UI → Slugs API
  'Restauration': 'restauration',
  'Loisir': 'loisir',
  'Beauté et Bien-être': 'beaute-et-bien-etre',
  'Beauté et bien-être': 'beaute-et-bien-etre',
  'Beaute et Bien-etre': 'beaute-et-bien-etre',
  'Mobilité': 'mobilite',
  'Mobilite': 'mobilite',
  'Culture': 'culture',
  'Sport': 'sport',
  'Mode': 'mode',
  'Services': 'services',
  'Électronique': 'electronique',
  'Electronique': 'electronique',
  'Retail': 'retails',
  'Retails': 'retails',
  // Slugs déjà valides (pas de transformation nécessaire)
  'restauration': 'restauration',
  'loisir': 'loisir',
  'beaute-et-bien-etre': 'beaute-et-bien-etre',
  'mobilite': 'mobilite',
  'culture': 'culture',
  'sport': 'sport',
  'mode': 'mode',
  'services': 'services',
  'electronique': 'electronique',
  'retails': 'retails',
};

/**
 * Liste des slugs valides pour validation
 */
export const VALID_CATEGORY_SLUGS = [
  'restauration',
  'loisir',
  'beaute-et-bien-etre',
  'mobilite',
  'culture',
  'sport',
  'mode',
  'services',
  'electronique',
  'retails',
] as const;

/**
 * Convertit un label de catégorie en slug valide pour l'API
 * 
 * @param label - Label de catégorie (ex: "Loisir", "Beauté et Bien-être")
 * @returns Slug normalisé (ex: "loisir", "beaute-et-bien-etre")
 */
export const toSlug = (label: string): string => {
  if (!label || typeof label !== 'string') {
    return '';
  }

  const trimmed = label.trim();
  
  // Vérifier d'abord dans le mapping
  if (CATEGORY_SLUG_MAP[trimmed]) {
    return CATEGORY_SLUG_MAP[trimmed];
  }

  // Si pas dans le mapping, générer un slug automatique
  return trimmed
    .toLowerCase()
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères non alphanumériques par des tirets
    .replace(/^-+|-+$/g, ''); // Supprimer les tirets en début et fin
};

/**
 * Normalise un tableau de catégories (labels ou slugs) en slugs valides
 * 
 * @param categories - Tableau de catégories (labels ou slugs)
 * @returns Tableau de slugs normalisés
 */
export const normalizeCategories = (categories: string[]): string[] => {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((cat) => toSlug(cat))
    .filter((slug) => slug.length > 0) // Filtrer les slugs vides
    .filter((slug) => VALID_CATEGORY_SLUGS.includes(slug as typeof VALID_CATEGORY_SLUGS[number])); // Filtrer les slugs invalides
};

