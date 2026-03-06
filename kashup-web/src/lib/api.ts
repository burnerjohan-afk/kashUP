/**
 * Client pour l'API KashUP (données publiques : partenaires, cartes, box)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type StandardResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: { pagination?: { page: number; pageSize: number; total: number } };
};

export type Partner = {
  id: string;
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  tauxCashbackBase?: number;
  discoveryCashbackRate?: number | null;
  permanentCashbackRate?: number | null;
  pointsPerTransaction?: number | null;
  category?: { id: string; name: string } | null;
  address?: string | null;
  openingHours?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  marketingPrograms?: string[] | null;
  territories?: string[] | null;
  categoryId?: string;
  /** Adresses et réseaux par département */
  territoryDetails?: Record<string, { address?: string; websiteUrl?: string; facebookUrl?: string; instagramUrl?: string }> | null;
};

export type PartnerCategory = {
  id: string;
  name: string;
};

export type DonationAssociation = {
  id: string;
  name: string;
  description?: string;
  impact?: string;
  imageUrl?: string;
  department?: string;
};

export type DonationCategoryWithAssociations = {
  id: string;
  title: string;
  icon?: string;
  accent?: string;
  tint?: string;
  associations: DonationAssociation[];
};

export type PartnersResponse = {
  partners: Partner[];
};

export type GiftOffer = {
  id: string;
  title: string;
  description?: string;
  partner?: { id: string; name: string; logoUrl?: string | null } | null;
  price: number;
  accentColor?: string | null;
  imageUrl?: string | null;
};

export type GiftBox = {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  priceFrom?: number;
  value?: number;
  imageUrl?: string | null;
  heroImageUrl?: string | null;
  partners?: { partenaireId: string; partenaireName?: string; logoUrl?: string | null }[];
};

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 60 },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const json: StandardResponse<T> = await res.json();
  if (!json.success || json.data === null) throw new Error(json.message || 'API error');
  return json.data;
}

export async function getPartners(params?: {
  category?: string;
  categoryId?: string;
  territory?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PartnersResponse> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.categoryId) search.set('categoryId', params.categoryId);
  if (params?.territory) search.set('territory', params.territory);
  if (params?.search) search.set('search', params.search);
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize));
  const q = search.toString();
  return fetchApi<PartnersResponse>(`/partners${q ? `?${q}` : ''}`);
}

export async function getPartnerCategories(): Promise<PartnerCategory[]> {
  try {
    const data = await fetchApi<PartnerCategory[]>('/partners/categories');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getPartner(id: string): Promise<Partner | null> {
  try {
    return await fetchApi<Partner>(`/partners/${id}`);
  } catch {
    return null;
  }
}

export async function getGiftCardOffers(): Promise<GiftOffer[]> {
  const data = await fetchApi<{ data?: GiftOffer[] } | GiftOffer[]>('/gift-cards/offers');
  return Array.isArray(data) ? data : (data as { data: GiftOffer[] }).data ?? [];
}

export async function getGiftCardBoxes(): Promise<GiftBox[]> {
  const data = await fetchApi<{ data?: GiftBox[] } | GiftBox[]>('/gift-cards/boxes');
  return Array.isArray(data) ? data : (data as { data: GiftBox[] }).data ?? [];
}

export async function getDonationCategoriesWithAssociations(): Promise<DonationCategoryWithAssociations[]> {
  try {
    const data = await fetchApi<DonationCategoryWithAssociations[]>('/donations/categories-with-associations');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
