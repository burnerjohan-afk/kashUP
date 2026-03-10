import apiClient from './apiClient';

export type FeaturedOffer = {
  id: string;
  title: string;
  partner: string;
  detail: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
};

export type SpotlightAssociation = {
  id: string;
  name: string;
  category: string;
  description: string;
  accentColor?: string | null;
  backgroundImageUrl?: string | null;
};

export const getFeaturedOffers = async (): Promise<FeaturedOffer[]> => {
  const { data } = await apiClient.get<FeaturedOffer[]>('/home/featured-offers');
  return data;
};

export const getSpotlightAssociations = async (): Promise<SpotlightAssociation[]> => {
  const { data } = await apiClient.get<SpotlightAssociation[]>('/home/spotlight-associations');
  return data;
};

export type NotificationItem = {
  id: string;
  title: string;
  /** Côté API le champ s’appelle body, le client peut l’exposer en description */
  description?: string;
  body?: string;
  category: 'boosts' | 'cashback' | 'points' | 'lotteries' | 'system';
  date: string;
  read?: boolean;
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const { data } = await apiClient.get<NotificationItem[]>('/me/notifications');
  return data;
};



