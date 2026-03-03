import apiClient from './apiClient';

export type HomeBanner = {
  id: string;
  title?: string | null;
  mediaType: 'image' | 'video';
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
  position: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Liste des bannières publicitaires pour la page d'accueil (actives, tri par position)
 * GET /home-banners
 */
export const getHomeBanners = async (): Promise<HomeBanner[]> => {
  const { data } = await apiClient.get<HomeBanner[] | { data: HomeBanner[] }>('/home-banners');
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) return (data as { data: HomeBanner[] }).data;
  return [];
};
