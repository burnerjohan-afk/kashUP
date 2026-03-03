/**
 * Thème style Uber Eats : fond blanc/noir, accent vert, typo sobre.
 */
export const colors = {
  // Primaire (accent principal type Uber Eats)
  primary: '#05A357',
  primaryDark: '#048A48',
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
  // Rétrocompatibilité
  primaryBlue: '#05A357',
  primaryPurple: '#05A357',
  primaryGreen: '#05A357',
  lightBlue: '#E8F5E9',
  lightPurple: '#E8F5E9',
  lightGreen: '#E8F5E9',
  textInverse: '#FFFFFF',
  // Fond ardoise (tech / premium) – utilisé sur tout le site
  slateBackground: '#E4E8EF',
  slateBackgroundLight: '#F2F4F8',
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

export const theme = {
  colors,
  typography,
  spacing,
  radius,
};
