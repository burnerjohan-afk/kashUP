/**
 * Thème style Uber Eats : fond blanc/noir, accent vert, typo sobre.
 */
export const colors = {
  // Primaire = vert carte KashUP (même vert que la carte bancaire)
  primary: '#047857',
  primaryDark: '#034d35',
  // Secondaires
  accentYellow: '#FFC043',
  accentRed: '#E11900',
  // Neutres
  white: '#FFFFFF',
  black: '#000000',
  greyLight: '#F5F5F5',
  greyBorder: '#E5E5E5',
  greyInactive: '#AFAFAF',
  textMain: '#000000',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  // Même vert que la carte (nuance unique)
  primaryBlue: '#047857',
  primaryPurple: '#047857',
  primaryGreen: '#047857',
  lightBlue: '#d1fae5',
  lightPurple: '#d1fae5',
  lightGreen: '#d1fae5',
  textInverse: '#FFFFFF',
  // Fond ardoise très clair – utilisé sur tout l'app
  slateBackground: '#F4F5F8',
  slateBackgroundLight: '#F9FAFB',
};

export const typography = {
  primary: 'System',
  bold: 'System',
  // Pour expo-font plus tard : 'Inter_400Regular', 'Inter_600SemiBold', 'Inter_700Bold'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

/** Dégradé vert des cartes (accueil, cagnotte, rewards) — à réutiliser pour boutons/onglets actifs */
export const CARD_GRADIENT_COLORS = ['#034d35', '#047857', '#059669', '#047857', '#065f46'] as const;
export const CARD_GRADIENT_LOCATIONS = [0, 0.25, 0.5, 0.75, 1] as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
};
