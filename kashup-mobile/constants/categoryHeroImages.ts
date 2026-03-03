/**
 * Image de fond (hero) par catégorie pour la fiche partenaire.
 * Une image par catégorie, liée à l'activité. Utilisée quand le partenaire
 * n'a pas d'image spécifique (hero/cover ou première photo).
 * Résolution par categoryId (cat-xxx) ou par nom de catégorie (API renvoie des CUID).
 */
const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80';

export const CATEGORY_HERO_IMAGES: Record<string, string> = {
  'cat-supermarkets':
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
  'cat-restaurants':
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'cat-leisure':
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
  'cat-services':
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
  'cat-wellness':
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
  'cat-mobility':
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
  'cat-fashion':
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  'cat-sport':
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  'cat-hospitality':
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'cat-education':
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  'cat-health':
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  'cat-culture':
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  'cat-retails':
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
};

/** Noms de catégories (normalisés) → image hero (pour API qui renvoie category.name en CUID) */
const CATEGORY_HERO_BY_NAME: Record<string, string> = {
  supermarche: CATEGORY_HERO_IMAGES['cat-supermarkets'],
  supermarches: CATEGORY_HERO_IMAGES['cat-supermarkets'],
  supermarkets: CATEGORY_HERO_IMAGES['cat-supermarkets'],
  epicerie: CATEGORY_HERO_IMAGES['cat-supermarkets'],
  restaurant: CATEGORY_HERO_IMAGES['cat-restaurants'],
  restaurants: CATEGORY_HERO_IMAGES['cat-restaurants'],
  restauration: CATEGORY_HERO_IMAGES['cat-restaurants'],
  loisirs: CATEGORY_HERO_IMAGES['cat-leisure'],
  leisure: CATEGORY_HERO_IMAGES['cat-leisure'],
  services: CATEGORY_HERO_IMAGES['cat-services'],
  service: CATEGORY_HERO_IMAGES['cat-services'],
  'bien-etre': CATEGORY_HERO_IMAGES['cat-wellness'],
  wellness: CATEGORY_HERO_IMAGES['cat-wellness'],
  fitness: CATEGORY_HERO_IMAGES['cat-wellness'],
  mobilite: CATEGORY_HERO_IMAGES['cat-mobility'],
  mobility: CATEGORY_HERO_IMAGES['cat-mobility'],
  mode: CATEGORY_HERO_IMAGES['cat-fashion'],
  fashion: CATEGORY_HERO_IMAGES['cat-fashion'],
  sport: CATEGORY_HERO_IMAGES['cat-sport'],
  hotel: CATEGORY_HERO_IMAGES['cat-hospitality'],
  hotellerie: CATEGORY_HERO_IMAGES['cat-hospitality'],
  hospitality: CATEGORY_HERO_IMAGES['cat-hospitality'],
  hebergement: CATEGORY_HERO_IMAGES['cat-hospitality'],
  education: CATEGORY_HERO_IMAGES['cat-education'],
  formation: CATEGORY_HERO_IMAGES['cat-education'],
  sante: CATEGORY_HERO_IMAGES['cat-health'],
  health: CATEGORY_HERO_IMAGES['cat-health'],
  shopping: CATEGORY_HERO_IMAGES['cat-fashion'],
  culture: CATEGORY_HERO_IMAGES['cat-culture'],
  retails: CATEGORY_HERO_IMAGES['cat-retails'],
  retail: CATEGORY_HERO_IMAGES['cat-retails'],
  'commerce de detail': CATEGORY_HERO_IMAGES['cat-retails'],
  detail: CATEGORY_HERO_IMAGES['cat-retails'],
};

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCategoryHeroImage(
  categoryId: string,
  categoryName?: string
): string {
  if (categoryId && CATEGORY_HERO_IMAGES[categoryId])
    return CATEGORY_HERO_IMAGES[categoryId];
  if (categoryName) {
    const key = normalizeCategoryName(categoryName);
    if (CATEGORY_HERO_BY_NAME[key]) return CATEGORY_HERO_BY_NAME[key];
    for (const [k, url] of Object.entries(CATEGORY_HERO_BY_NAME)) {
      if (key.includes(k) || k.includes(key)) return url;
    }
  }
  return DEFAULT_HERO;
}
