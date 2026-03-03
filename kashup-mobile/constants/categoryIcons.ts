/**
 * Icônes par typologie – par id (cat-xxx) ou par nom de catégorie (API).
 * Chaque catégorie a une icône adaptée (restaurant, cart, etc.).
 */
export const CATEGORY_ICONS: Record<string, string> = {
  'cat-supermarkets': 'cart-outline',
  'cat-restaurants': 'restaurant-outline',
  'cat-leisure': 'game-controller-outline',
  'cat-services': 'construct-outline',
  'cat-wellness': 'fitness-outline',
  'cat-mobility': 'car-outline',
  'cat-fashion': 'shirt-outline',
  'cat-sport': 'bicycle-outline',
  'cat-hospitality': 'bed-outline',
  'cat-education': 'school-outline',
  'cat-health': 'medkit-outline',
};

/** Mapping par nom de catégorie (normalisé minuscule) – pour les catégories venant de l’API (id = CUID). */
const CATEGORY_ICONS_BY_NAME: Record<string, string> = {
  'supermarchés': 'cart-outline',
  'supermarkets': 'cart-outline',
  'supermarché': 'cart-outline',
  'epicerie': 'cart-outline',
  'épicerie': 'cart-outline',
  'restaurants': 'restaurant-outline',
  'restaurant': 'restaurant-outline',
  'restauration': 'restaurant-outline',
  'loisirs': 'game-controller-outline',
  'leisure': 'game-controller-outline',
  'services': 'construct-outline',
  'service': 'construct-outline',
  'bien-être': 'fitness-outline',
  'bien-etre': 'fitness-outline',
  'wellness': 'fitness-outline',
  'fitness': 'fitness-outline',
  'mobilité': 'car-outline',
  'mobility': 'car-outline',
  'mode': 'shirt-outline',
  'fashion': 'shirt-outline',
  'sport': 'bicycle-outline',
  'hôtellerie': 'bed-outline',
  'hotel': 'bed-outline',
  'hotelier': 'bed-outline',
  'hospitality': 'bed-outline',
  'hébergement': 'bed-outline',
  'education': 'school-outline',
  'éducation': 'school-outline',
  'formation': 'school-outline',
  'santé': 'medkit-outline',
  'health': 'medkit-outline',
  'sante': 'medkit-outline',
  'culture': 'book-outline',
  'électronique': 'laptop-outline',
  'electronique': 'laptop-outline',
  'electronics': 'laptop-outline',
  'détails': 'bag-outline',
  'détail': 'bag-outline',
  'retail': 'bag-outline',
  'commerce de détail': 'bag-outline',
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

/**
 * Retourne l’icône Ionicons pour une catégorie.
 * Utilise d’abord l’id (ex. cat-restaurants), puis le nom (ex. "Restaurants") pour les catégories API.
 */
export function getCategoryIcon(categoryId: string, categoryName?: string): string {
  if (CATEGORY_ICONS[categoryId]) {
    return CATEGORY_ICONS[categoryId];
  }
  if (categoryName) {
    const key = normalizeName(categoryName);
    if (CATEGORY_ICONS_BY_NAME[key]) {
      return CATEGORY_ICONS_BY_NAME[key];
    }
    // Correspondance partielle : si le nom contient un mot-clé
    const partial: Record<string, string> = {
      super: 'cart-outline',
      restau: 'restaurant-outline',
      loisir: 'game-controller-outline',
      serv: 'construct-outline',
      bien: 'fitness-outline',
      mobi: 'car-outline',
      sport: 'bicycle-outline',
      hotel: 'bed-outline',
      educ: 'school-outline',
      sant: 'medkit-outline',
      mode: 'shirt-outline',
      culture: 'book-outline',
      electronique: 'laptop-outline',
      électronique: 'laptop-outline',
      detail: 'bag-outline',
      retail: 'bag-outline',
    };
    for (const [sub, icon] of Object.entries(partial)) {
      if (key.includes(sub)) return icon;
    }
  }
  return 'storefront-outline';
}
