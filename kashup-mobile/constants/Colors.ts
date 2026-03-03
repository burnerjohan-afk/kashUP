export const palette = {
  primaryBlue: '#12C2E9',
  primaryPurple: '#A445FF',
  primaryGreen: '#2DD881',
  lightBlue: '#E3F7FC',
  lightPurple: '#F3E6FF',
  lightGreen: '#D9F9EA',
  black: '#1E1E1E',
  white: '#FFFFFF',
  greyLight: '#F5F5F5',
  textMain: '#1A1A1A',
  textSecondary: '#7A7A7A',
  textInverse: '#FFFFFF',
};

const shared = {
  tabIconDefault: '#9CA3AF',
};

export default {
  light: {
    text: palette.textMain,
    background: palette.greyLight,
    tint: palette.primaryBlue,
    tabIconSelected: palette.primaryPurple,
    ...shared,
  },
  dark: {
    text: palette.textInverse,
    background: palette.black,
    tint: palette.primaryPurple,
    tabIconSelected: palette.primaryGreen,
    ...shared,
  },
  palette,
};
