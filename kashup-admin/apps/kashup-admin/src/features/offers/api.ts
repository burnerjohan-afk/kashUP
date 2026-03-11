import { z } from 'zod';
import { apiGet, apiPost, apiPatch } from '@/lib/api/kashup-client';
import type { Offer } from '@/types/entities';
import type { ApiResponseFormat } from '@/types/api';

export const offerFormSchema = z.object({
  partnerId: z.string().min(1, 'Un partenaire doit être sélectionné'),
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  price: z.number().min(0).optional(),
  cashbackRate: z.number().min(0).max(100, 'Le taux de cashback doit être entre 0 et 100%'),
  startAt: z.string().min(1, 'La date de début est requise'),
  endAt: z.string().min(1, 'La date de fin est requise'),
  stock: z.number().positive('Le stock doit être supérieur à 0'),
  image: z.instanceof(File).optional(),
  conditions: z.string().optional(),
}).refine((data) => {
  // Vérifier que la date de fin est après la date de début
  if (data.startAt && data.endAt) {
    return new Date(data.endAt) > new Date(data.startAt);
  }
  return true;
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['endAt'],
});

export type OfferFormInput = z.infer<typeof offerFormSchema>;

/**
 * Récupère les offres actuelles (uniquement en cours – pour app / public).
 * ENDPOINT: GET /api/v1/offers/current
 */
export const fetchCurrentOffers = async (): Promise<Offer[]> => {
  const response = await apiGet<Offer[]>('/offers/current');

  if (response.error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la récupération des offres:', response.error);
    }
    throw new Error(response.error.message || 'Impossible de récupérer les offres');
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }
  return [];
};

/** Normalise un objet offre renvoyé par l’API (startsAt/endsAt, partner) vers le type Offer. */
function normalizeOffer(raw: Record<string, unknown>): Offer {
  const partner = raw.partner as { name?: string; logoUrl?: string } | undefined;
  return {
    id: raw.id as string,
    partnerId: (raw.partnerId as string) ?? '',
    partnerName: partner?.name,
    partnerLogoUrl: partner?.logoUrl,
    title: raw.title as string,
    price: raw.price != null ? Number(raw.price) : undefined,
    cashbackRate: Number(raw.cashbackRate) ?? 0,
    startAt: (raw.startsAt ?? raw.startAt) as string,
    endAt: (raw.endsAt ?? raw.endAt) as string,
    stock: Number(raw.stock) ?? 0,
    stockUsed: Number(raw.stockUsed) ?? 0,
    imageUrl: raw.imageUrl as string | undefined,
    status: (raw.status as Offer['status']) ?? 'scheduled',
    conditions: raw.conditions as string | undefined,
  };
}

/**
 * Récupère toutes les offres pour le back office (tous statuts ou filtré).
 * ENDPOINT: GET /api/v1/offers?status=all|active|scheduled|expired
 */
export const fetchOffers = async (status: 'all' | 'active' | 'scheduled' | 'expired' = 'all'): Promise<Offer[]> => {
  const response = await apiGet<Offer[]>('/offers', { status });

  if (response.error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la récupération des offres:', response.error);
    }
    throw new Error(response.error.message || 'Impossible de récupérer les offres');
  }

  if (Array.isArray(response.data)) {
    return response.data.map((o) => normalizeOffer(o as Record<string, unknown>));
  }
  return [];
};

/**
 * Crée une nouvelle offre
 * ENDPOINT: POST /api/v1/offers
 * 
 * Format: multipart/form-data si image présente, sinon application/json
 */
export const createOffer = async (payload: OfferFormInput): Promise<Offer> => {
  if (import.meta.env.DEV) {
    console.log('📤 Création d\'une offre:', {
      partnerId: payload.partnerId,
      title: payload.title,
      hasImage: !!payload.image,
      startAt: payload.startAt,
      endAt: payload.endAt,
      stock: payload.stock,
    });
  }

  let body: FormData | object;

  if (payload.image) {
    // Si une image est fournie, utiliser FormData
    const formData = new FormData();
    formData.append('partnerId', payload.partnerId);
    formData.append('title', payload.title);
    formData.append('cashbackRate', payload.cashbackRate.toString());
    formData.append('startAt', payload.startAt);
    formData.append('endAt', payload.endAt);
    formData.append('stock', payload.stock.toString());
    
    if (payload.price !== undefined && payload.price !== null) {
      formData.append('price', payload.price.toString());
    }
    
    if (payload.conditions) {
      formData.append('conditions', payload.conditions);
    }
    
    formData.append('image', payload.image);

    if (import.meta.env.DEV) {
      console.log('📤 Envoi avec FormData (image présente)');
    }

    body = formData;
  } else {
    // Sinon, utiliser JSON
    const jsonPayload: Record<string, unknown> = {
      partnerId: payload.partnerId,
      title: payload.title,
      cashbackRate: payload.cashbackRate,
      startAt: payload.startAt,
      endAt: payload.endAt,
      stock: payload.stock,
    };

    if (payload.price !== undefined && payload.price !== null) {
      jsonPayload.price = payload.price;
    }

    if (payload.conditions) {
      jsonPayload.conditions = payload.conditions;
    }

    if (import.meta.env.DEV) {
      console.log('📤 Envoi avec JSON (pas d\'image)');
    }

    body = jsonPayload;
  }

  const response = await apiPost<Offer>('/offers', body);

  if (response.error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la création de l\'offre:', {
        error: response.error,
        code: response.error.code,
        message: response.error.message,
        details: response.error.details,
      });
    }

    // Améliorer le message d'erreur selon le code
    let errorMessage = response.error.message || 'Impossible de créer l\'offre';
    
    if (response.error.code === 'VALIDATION_ERROR' && response.error.details) {
      // Si c'est une erreur de validation, afficher les détails
      const details = response.error.details;
      if (typeof details === 'object' && 'fieldErrors' in details) {
        const fieldErrors = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
        if (fieldErrors) {
          const errors = Object.entries(fieldErrors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage = `Erreur de validation: ${errors}`;
        }
      }
    }

    throw new Error(errorMessage);
  }

  if (!response.data) {
    throw new Error('Aucune donnée retournée par l\'API');
  }

  if (import.meta.env.DEV) {
    console.log('✅ Offre créée avec succès:', response.data);
  }

  return response.data;
};

/**
 * Met à jour une offre existante
 * ENDPOINT: PATCH /api/v1/offers/:id
 * 
 * Format: multipart/form-data si image présente, sinon application/json
 * 
 * IMPORTANT: Lors d'une mise à jour avec image, tous les champs requis doivent être envoyés
 */
export const updateOffer = async (offerId: string, payload: Partial<OfferFormInput>): Promise<Offer> => {
  if (import.meta.env.DEV) {
    console.log('📤 Mise à jour de l\'offre:', {
      offerId,
      hasImage: !!payload.image,
      imageType: payload.image instanceof File ? payload.image.type : typeof payload.image,
      imageName: payload.image instanceof File ? payload.image.name : 'N/A',
      imageSize: payload.image instanceof File ? payload.image.size : 'N/A',
      payloadKeys: Object.keys(payload),
      partnerId: payload.partnerId,
      title: payload.title,
      cashbackRate: payload.cashbackRate,
      startAt: payload.startAt,
      endAt: payload.endAt,
      stock: payload.stock,
      price: payload.price,
      hasConditions: !!payload.conditions,
    });
  }

  let body: FormData | object;

  if (payload.image instanceof File) {
    // Si une image est fournie, utiliser FormData
    // IMPORTANT: Envoyer TOUS les champs requis, même s'ils ne sont pas modifiés
    const formData = new FormData();
    
    // Champs obligatoires - toujours les envoyer
    if (payload.partnerId) {
      formData.append('partnerId', payload.partnerId);
    }
    if (payload.title) {
      formData.append('title', payload.title);
    }
    if (payload.cashbackRate !== undefined) {
      formData.append('cashbackRate', payload.cashbackRate.toString());
    }
    if (payload.startAt) {
      formData.append('startAt', payload.startAt);
    }
    if (payload.endAt) {
      formData.append('endAt', payload.endAt);
    }
    if (payload.stock !== undefined) {
      formData.append('stock', payload.stock.toString());
    }
    
    // Champs optionnels
    if (payload.price !== undefined && payload.price !== null) {
      formData.append('price', payload.price.toString());
    }
    
    if (payload.conditions !== undefined) {
      formData.append('conditions', payload.conditions);
    }
    
    // IMPORTANT: Vérifier que l'image est bien un File avant de l'ajouter
    if (payload.image instanceof File) {
      formData.append('image', payload.image);
      
      if (import.meta.env.DEV) {
        console.log('✅ Image ajoutée au FormData:', {
          name: payload.image.name,
          type: payload.image.type,
          size: payload.image.size,
          lastModified: new Date(payload.image.lastModified).toISOString(),
        });
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('❌ payload.image n\'est pas un File:', {
          type: typeof payload.image,
          value: payload.image,
        });
      }
      throw new Error('Le fichier image n\'est pas valide');
    }

    if (import.meta.env.DEV) {
      // Log le contenu du FormData (sans les fichiers pour éviter le spam)
      const formDataEntries: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          formDataEntries[key] = `[File: ${value.name}, ${value.size} bytes, ${value.type}]`;
        } else {
          formDataEntries[key] = String(value);
        }
      }
      console.log('📤 FormData à envoyer:', formDataEntries);
      console.log('📋 Ordre des champs FormData:', Array.from(formData.keys()));
    }

    body = formData;
  } else {
    // Sinon, utiliser JSON
    const jsonPayload: Record<string, unknown> = {};

    if (payload.partnerId) {
      jsonPayload.partnerId = payload.partnerId;
    }
    if (payload.title) {
      jsonPayload.title = payload.title;
    }
    if (payload.cashbackRate !== undefined) {
      jsonPayload.cashbackRate = payload.cashbackRate;
    }
    if (payload.startAt) {
      jsonPayload.startAt = payload.startAt;
    }
    if (payload.endAt) {
      jsonPayload.endAt = payload.endAt;
    }
    if (payload.stock !== undefined) {
      jsonPayload.stock = payload.stock;
    }

    if (payload.price !== undefined && payload.price !== null) {
      jsonPayload.price = payload.price;
    }

    if (payload.conditions !== undefined) {
      jsonPayload.conditions = payload.conditions;
    }

    if (import.meta.env.DEV) {
      console.log('📤 Envoi avec JSON (pas d\'image):', jsonPayload);
    }

    body = jsonPayload;
  }

  const response = await apiPatch<Offer>(`/offers/${offerId}`, body);

  if (response.error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la mise à jour de l\'offre:', {
        error: response.error,
        code: response.error.code,
        message: response.error.message,
        details: response.error.details,
        fullError: JSON.stringify(response.error, null, 2),
      });
    }

    // Améliorer le message d'erreur selon le code
    let errorMessage = response.error.message || 'Impossible de mettre à jour l\'offre';
    
    if (response.error.code === 'VALIDATION_ERROR' && response.error.details) {
      // Si c'est une erreur de validation, afficher les détails
      const details = response.error.details;
      if (typeof details === 'object' && 'fieldErrors' in details) {
        const fieldErrors = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
        if (fieldErrors) {
          const errors = Object.entries(fieldErrors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage = `Erreur de validation: ${errors}`;
        }
      } else if (typeof details === 'string') {
        errorMessage = `Erreur de validation: ${details}`;
      }
    }

    throw new Error(errorMessage);
  }

  if (!response.data) {
    throw new Error('Aucune donnée retournée par l\'API');
  }

  if (import.meta.env.DEV) {
    console.log('✅ Offre mise à jour avec succès:', response.data);
  }

  return response.data;
};

