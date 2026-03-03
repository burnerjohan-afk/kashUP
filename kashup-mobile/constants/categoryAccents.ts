import { colors } from './theme';

export const CATEGORY_ACCENTS: Record<string, string> = {
  'cat-supermarkets': colors.primary,
  'cat-restaurants': colors.primary,
  'cat-leisure': colors.accentYellow,
  'cat-services': colors.primary,
  'cat-wellness': '#FF8FAB',
  'cat-mobility': '#FF9F1C',
  'cat-fashion': '#E91E63',
  'cat-sport': '#00B894',
  'cat-hospitality': '#FF6F61',
  'cat-education': '#6C63FF',
  'cat-health': '#2EC4B6',
};

export const getCategoryAccent = (categoryId: string) =>
  CATEGORY_ACCENTS[categoryId] ?? colors.primary;

