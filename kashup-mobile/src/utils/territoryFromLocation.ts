/**
 * Détermine le département (territoire) à partir des coordonnées GPS.
 * Périmètres approximatifs : Martinique, Guadeloupe, Guyane.
 */
export type TerritoryKey = 'Martinique' | 'Guadeloupe' | 'Guyane';

const MARTINIQUE_BOUNDS = { latMin: 14.35, latMax: 14.95, lngMin: -61.25, lngMax: -60.75 };
const GUADELOUPE_BOUNDS = { latMin: 15.75, latMax: 16.55, lngMin: -61.85, lngMax: -61.0 };
const GUYANE_BOUNDS = { latMin: 2.0, latMax: 6.0, lngMin: -54.5, lngMax: -51.5 };

function inBounds(
  lat: number,
  lng: number,
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number }
): boolean {
  return lat >= bounds.latMin && lat <= bounds.latMax && lng >= bounds.lngMin && lng <= bounds.lngMax;
}

/**
 * Retourne le territoire (département) correspondant aux coordonnées, ou null si hors DOM.
 */
export function getTerritoryFromCoords(latitude: number, longitude: number): TerritoryKey | null {
  if (inBounds(latitude, longitude, MARTINIQUE_BOUNDS)) return 'Martinique';
  if (inBounds(latitude, longitude, GUADELOUPE_BOUNDS)) return 'Guadeloupe';
  if (inBounds(latitude, longitude, GUYANE_BOUNDS)) return 'Guyane';
  return null;
}

/**
 * Liste des territoires pour le sélecteur.
 */
export const TERRITORY_OPTIONS: TerritoryKey[] = ['Martinique', 'Guadeloupe', 'Guyane'];
