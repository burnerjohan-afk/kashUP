/**
 * Helpers pour appeler les endpoints admin/public avec fallback automatique
 * 
 * CONVENTION:
 * - Admin endpoints: /api/v1/admin/<resource> (données complètes)
 * - Public endpoints: /api/v1/<resource> (données filtrées)
 * 
 * L'admin essaie toujours /admin/<resource> en premier, puis fallback sur /<resource>
 */

import { getStandardJson, postStandardJson, patchStandardJson, deleteStandardJson } from './client';
import type { StandardResponse } from '@/types/api';

/**
 * Appelle un endpoint admin avec fallback automatique sur l'endpoint public
 * 
 * @param resource - Nom de la ressource (ex: 'partners', 'users')
 * @param searchParams - Paramètres de query (optionnel)
 * @returns StandardResponse<T>
 * 
 * @example
 * // Essaie GET /api/v1/admin/partners, puis GET /api/v1/partners si 404
 * const response = await getResource<Partner[]>('partners', { page: 1 });
 */
export const getResource = async <T>(
  resource: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>
): Promise<StandardResponse<T>> => {
  // Essayer d'abord l'endpoint admin
  let response = await getStandardJson<T>(`admin/${resource}`, searchParams);

  // Si 404 ou erreur de connexion, fallback sur l'endpoint public
  if (!response.success && (response.statusCode === 404 || response.statusCode === 0)) {
    if (import.meta.env.DEV) {
      if (response.statusCode === 0) {
        console.warn(`⚠️ Erreur de connexion pour /admin/${resource}, tentative avec /${resource}`);
      } else {
        console.log(`⚠️ Endpoint /admin/${resource} non trouvé (404), fallback sur /${resource}`);
      }
    }
    response = await getStandardJson<T>(resource, searchParams);
    
    if (import.meta.env.DEV && response.success) {
      console.log(`✅ Utilisation de l'endpoint /${resource} (fallback)`);
    }
  } else if (import.meta.env.DEV && response.success) {
    console.log(`✅ Utilisation de l'endpoint /admin/${resource}`);
  }

  return response;
};

/**
 * Récupère une ressource par ID avec fallback admin/public
 * 
 * @param resource - Nom de la ressource (ex: 'partners', 'users')
 * @param id - ID de la ressource
 * @returns StandardResponse<T>
 * 
 * @example
 * const partner = await getResourceById<Partner>('partners', 'abc123');
 */
export const getResourceById = async <T>(
  resource: string,
  id: string
): Promise<StandardResponse<T>> => {
  // Essayer d'abord l'endpoint admin
  let response = await getStandardJson<T>(`admin/${resource}/${id}`);

  // Si 404, fallback sur l'endpoint public
  if (!response.success && (response.statusCode === 404 || response.statusCode === 0)) {
    if (import.meta.env.DEV) {
      console.log(`⚠️ Endpoint /admin/${resource}/${id} non trouvé, fallback sur /${resource}/${id}`);
    }
    response = await getStandardJson<T>(`${resource}/${id}`);
  }

  return response;
};

/**
 * Crée une ressource via l'endpoint admin avec fallback
 * 
 * @param resource - Nom de la ressource
 * @param body - Données à envoyer (FormData ou object)
 * @returns StandardResponse<T>
 * 
 * @example
 * const newPartner = await createResource<Partner>('partners', formData);
 */
export const createResource = async <T>(
  resource: string,
  body: FormData | object
): Promise<StandardResponse<T>> => {
  // Essayer d'abord l'endpoint admin
  try {
    const response = await postStandardJson<T>(`admin/${resource}`, body);
    if (response.success) {
      if (import.meta.env.DEV) {
        console.log(`✅ Ressource créée via /admin/${resource}`);
      }
      return response;
    }
    // Si erreur 404, essayer l'endpoint public
    if (response.statusCode === 404) {
      if (import.meta.env.DEV) {
        console.log(`⚠️ Endpoint /admin/${resource} non trouvé, fallback sur /${resource}`);
      }
      return await postStandardJson<T>(resource, body);
    }
    return response;
  } catch (error) {
    // Si erreur de connexion ou autre, essayer l'endpoint public
    if (import.meta.env.DEV) {
      console.warn(`⚠️ Erreur lors de la création via /admin/${resource}, tentative avec /${resource}`);
    }
    return await postStandardJson<T>(resource, body);
  }
};

/**
 * Met à jour une ressource via l'endpoint admin/public
 * 
 * @param resource - Nom de la ressource
 * @param id - ID de la ressource
 * @param body - Données à envoyer (FormData ou object)
 * @returns StandardResponse<T>
 * 
 * @example
 * const updated = await updateResource<Partner>('partners', 'abc123', formData);
 */
export const updateResource = async <T>(
  resource: string,
  id: string,
  body: FormData | object
): Promise<StandardResponse<T>> => {
  // Pour les updates, on utilise généralement l'endpoint public avec l'ID
  // Mais on peut essayer admin d'abord si nécessaire
  try {
    const response = await patchStandardJson<T>(`admin/${resource}/${id}`, body);
    if (response.success) {
      return response;
    }
    // Si 404, fallback sur l'endpoint public
    if (response.statusCode === 404) {
      return await patchStandardJson<T>(`${resource}/${id}`, body);
    }
    return response;
  } catch (error) {
    // Fallback sur l'endpoint public
    return await patchStandardJson<T>(`${resource}/${id}`, body);
  }
};

/**
 * Supprime une ressource via l'endpoint admin/public
 * 
 * @param resource - Nom de la ressource
 * @param id - ID de la ressource
 * @returns StandardResponse<null>
 * 
 * @example
 * await deleteResource('partners', 'abc123');
 */
export const deleteResource = async (
  resource: string,
  id: string
): Promise<StandardResponse<null>> => {
  // Essayer d'abord l'endpoint admin
  let response = await deleteStandardJson(`admin/${resource}/${id}`);

  // Si 404, fallback sur l'endpoint public
  if (!response.success && (response.statusCode === 404 || response.statusCode === 0)) {
    if (import.meta.env.DEV) {
      console.log(`⚠️ Endpoint /admin/${resource}/${id} non trouvé, fallback sur /${resource}/${id}`);
    }
    response = await deleteStandardJson(`${resource}/${id}`);
  }

  return response;
};

