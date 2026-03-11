import { z } from 'zod';
import { getStandardJson, postStandardJson, patchStandardJson, deleteStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { Association, Projet } from '@/types/entities';

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

export const associationFormSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire'),
  type: z.enum(['solidaire', 'humanitaire', 'ecologie', 'sante', 'education', 'culture', 'sport', 'autre'], {
    required_error: 'Le type d\'association est obligatoire',
  }),
  but: z.string().min(1, 'Le but de l\'association est obligatoire'),
  tonImpact: z.string().min(1, 'Le texte "Ton impact" est obligatoire'),
  image: z.instanceof(File).optional(),
  status: z.enum(['draft', 'active']),
});

export type AssociationFormInput = z.infer<typeof associationFormSchema>;

export const projetFormSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire'),
  descriptif: z.string().min(1, 'Le descriptif est obligatoire'),
  tonImpact: z.string().min(1, 'Le texte "Ton impact" est obligatoire'),
  status: z.enum(['draft', 'active']),
});

export type ProjetFormInput = z.infer<typeof projetFormSchema>;

// ============================================================================
// API - ASSOCIATIONS
// ============================================================================

export const fetchAssociations = async (): Promise<Association[]> => {
  const response = await getStandardJson<Association[]>('donations/associations');
  return unwrapStandardResponse(response);
};

export const fetchAssociationById = async (id: string): Promise<Association> => {
  const response = await getStandardJson<Association>(`donations/associations/${id}`);
  return unwrapStandardResponse(response);
};

export const createAssociation = async (payload: AssociationFormInput): Promise<Association> => {
  // Toujours utiliser FormData pour être cohérent avec le backend
  const formData = new FormData();
  formData.append('nom', payload.nom);
  formData.append('type', payload.type);
  formData.append('but', payload.but);
  formData.append('tonImpact', payload.tonImpact);
  formData.append('status', payload.status);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  const response = await postStandardJson<Association>('donations/associations', formData);
  return unwrapStandardResponse(response);
};

export const updateAssociation = async (
  id: string,
  payload: Partial<AssociationFormInput>
): Promise<Association> => {
  // Toujours utiliser FormData pour être cohérent avec le backend
  const formData = new FormData();
  if (payload.nom) formData.append('nom', payload.nom);
  if (payload.type) formData.append('type', payload.type);
  if (payload.but) formData.append('but', payload.but);
  if (payload.tonImpact) formData.append('tonImpact', payload.tonImpact);
  if (payload.status) formData.append('status', payload.status);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  const response = await patchStandardJson<Association>(`donations/associations/${id}`, formData);
  return unwrapStandardResponse(response);
};

export const deleteAssociation = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`donations/associations/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};

// ============================================================================
// API - PROJETS
// ============================================================================

export const fetchProjets = async (): Promise<Projet[]> => {
  const response = await getStandardJson<Projet[]>('donations/projets');
  return unwrapStandardResponse(response);
};

export const fetchProjetById = async (id: string): Promise<Projet> => {
  const response = await getStandardJson<Projet>(`donations/projets/${id}`);
  return unwrapStandardResponse(response);
};

export const createProjet = async (payload: ProjetFormInput): Promise<Projet> => {
  const response = await postStandardJson<Projet>('donations/projets', payload);
  return unwrapStandardResponse(response);
};

export const updateProjet = async (id: string, payload: Partial<ProjetFormInput>): Promise<Projet> => {
  const response = await patchStandardJson<Projet>(`donations/projets/${id}`, payload);
  return unwrapStandardResponse(response);
};

export const deleteProjet = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`donations/projets/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};
