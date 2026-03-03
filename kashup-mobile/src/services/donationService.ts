import apiClient from './apiClient';

export type DonationDepartment = 'Martinique' | 'Guadeloupe' | 'Guyane';

export type DonationAssociation = {
  id: string;
  name: string;
  description: string;
  needs: string;
  location: string;
  department: DonationDepartment;
  impact: string;
  imageUrl?: string | null;
};

export type DonationCategory = {
  id: string;
  title: string;
  icon: string;
  accent: string;
  tint: string;
  associations: DonationAssociation[];
};

export type DonationImpact = {
  donatedThisMonth: number;
  donatedThisYear: number;
  associationsSupported: number;
  beneficiariesHelped: number;
};

export const getDonationCategories = async (): Promise<DonationCategory[]> => {
  const { data } = await apiClient.get<DonationCategory[]>('/donations/categories-with-associations');
  return Array.isArray(data) ? data : [];
};

export const getDonationImpact = async (): Promise<DonationImpact> => {
  const { data } = await apiClient.get<DonationImpact>('/me/donations/impact');
  return data;
};


