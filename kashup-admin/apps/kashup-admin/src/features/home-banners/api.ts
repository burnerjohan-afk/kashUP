import { getStandardJson, postFormData, patchFormData, deleteStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';

export type HomeBanner = {
  id: string;
  title: string | null;
  mediaType: 'image' | 'video';
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HomeBannerFormInput = {
  title?: string;
  mediaType?: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  position?: number;
  active?: boolean;
};

/** Liste des bannières (admin) — GET /home-banners/admin */
export const fetchHomeBanners = async (): Promise<HomeBanner[]> => {
  const response = await getStandardJson<HomeBanner[]>('home-banners/admin');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
};

/** Créer une bannière — POST /home-banners (FormData avec image optionnel) */
export const createHomeBanner = async (formData: FormData): Promise<HomeBanner> => {
  const response = await postFormData<HomeBanner>('home-banners', formData);
  return unwrapStandardResponse(response);
};

/** Mettre à jour une bannière — PATCH /home-banners/:id */
export const updateHomeBanner = async (id: string, formData: FormData): Promise<HomeBanner> => {
  const response = await patchFormData<HomeBanner>(`home-banners/${id}`, formData);
  return unwrapStandardResponse(response);
};

/** Supprimer une bannière — DELETE /home-banners/:id */
export const deleteHomeBanner = async (id: string): Promise<void> => {
  await deleteStandardJson(`home-banners/${id}`);
};
