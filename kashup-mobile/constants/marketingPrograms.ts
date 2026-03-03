/**
 * Constantes et types pour les programmes marketing des partenaires
 */

export type MarketingProgram = 'pepites' | 'boosted' | 'most-searched';

export const MARKETING_PROGRAM_LABELS: Record<MarketingProgram, string> = {
  pepites: 'Pépites KashUP',
  boosted: 'Boosté',
  'most-searched': 'Plus recherchés',
};

export const MARKETING_PROGRAM_DESCRIPTIONS: Record<MarketingProgram, string> = {
  pepites: 'Nos coups de cœur sélectionnés pour vous',
  boosted: 'Offres spéciales avec cashback augmenté',
  'most-searched': 'Les partenaires les plus recherchés',
};

/**
 * Récupère le label d'affichage pour un programme marketing
 */
export function getMarketingProgramLabel(program: MarketingProgram): string {
  return MARKETING_PROGRAM_LABELS[program];
}

/**
 * Récupère la description pour un programme marketing
 */
export function getMarketingProgramDescription(program: MarketingProgram): string {
  return MARKETING_PROGRAM_DESCRIPTIONS[program];
}

