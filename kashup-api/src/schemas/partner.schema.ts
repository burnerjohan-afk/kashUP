import { z } from 'zod';
import { TERRITORIES } from '../types/domain';

// Accepte une URL valide (absolue ou relative), une chaîne vide/null (transformée en undefined), ou undefined
// Utilise preprocess pour nettoyer les valeurs avant validation
const optionalUrl = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    if (str === '' || str === 'null' || str === 'undefined') return undefined;
    return str;
  },
  z.union([
    // URL absolue (http:// ou https://)
    z.string().url(),
    // URL relative (commence par /)
    z.string().startsWith('/'),
    z.undefined()
  ]).optional()
);

// Enum pour les programmes marketing
export const MARKETING_PROGRAMS = ['pepites', 'boosted', 'most-searched'] as const;
export type MarketingProgram = typeof MARKETING_PROGRAMS[number];

export const partnerFiltersSchema = z.object({
  // Recherche textuelle (optionnel, ignore si vide, null, undefined)
  search: z.string().optional().transform((val) => {
    if (!val || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
    return val.trim();
  }),
  // Catégorie par ID (optionnel, ignore si vide, 'all', null, undefined)
  categoryId: z.string().optional().transform((val) => {
    if (!val || val === 'all' || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
    return val.trim();
  }),
  // Catégorie par nom (optionnel, ignore si vide, 'all', null, undefined)
  category: z.string().optional().transform((val) => {
    if (!val || val === 'all' || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
    return val.trim();
  }),
  // Territoire (compatibilité avec ancien format)
  territoire: z.enum(TERRITORIES).optional(),
  // Territoire (nouveau format, supporte 'all' pour tous les territoires)
  // Accepte aussi les valeurs normalisées (Martinique, Guadeloupe, Guyane)
  territory: z.string().optional().transform((val) => {
    if (!val || val === 'all' || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
    const normalized = val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    // Vérifier que c'est un territoire valide
    if (TERRITORIES.includes(normalized as any)) {
      return normalized;
    }
    return undefined; // Ignorer si ce n'est pas un territoire valide
  }),
  // Plusieurs territoires (array)
  territories: z.union([
    z.array(z.enum(TERRITORIES)),
    z.string().transform((val) => {
      if (!val || val === 'all' || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((t: string) => t && t !== 'all' && typeof t === 'string')
            .map((t: string) => {
              const normalized = t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
              return TERRITORIES.includes(normalized as any) ? normalized : null;
            })
            .filter((t: string | null) => t !== null);
        }
        return undefined;
      } catch {
        return undefined;
      }
    })
  ]).optional(),
  autourDeMoi: z.string().optional().transform((val) => {
    if (!val || val === 'null' || val === 'undefined' || val.trim() === '') return undefined;
    return val.trim();
  }),
  marketingProgram: z.enum(MARKETING_PROGRAMS).optional(),
  // Pagination (valeurs par défaut, coerce depuis string)
  page: z.coerce.number().min(1).default(1).optional(),
  pageSize: z.coerce.number().min(1).max(200).default(50).optional(),
  // Sync delta: récupérer ce qui a changé depuis une date ISO
  updatedSince: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }),
  // Tri (valeurs par défaut)
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'tauxCashbackBase']).default('updatedAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional() // Par défaut desc comme demandé
});

export const basePartnerSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  slug: z.string().optional(),
  logoUrl: optionalUrl,
  shortDescription: z.string().max(280, 'La description courte ne doit pas dépasser 280 caractères').optional(),
  description: z.string().optional().or(z.literal('').transform(() => undefined)), // Description complète (texte long)
  siret: z.string().optional().or(z.literal('').transform(() => undefined)), // Numéro SIRET
  phone: z.string().optional().or(z.literal('').transform(() => undefined)), // Numéro de téléphone
  openingHours: z.string().max(500).optional().or(z.literal('').transform(() => undefined)), // Horaires (ex: "Lun-Ven 9h-18h")
  address: z.string().max(500).optional().or(z.literal('').transform(() => undefined)), // Adresse complète
  openingDays: z.union([
    z.string(), // JSON array stringifié en base
    z.array(z.string()).transform((arr) => JSON.stringify(arr)),
  ]).optional().or(z.literal('').transform(() => undefined)),
  websiteUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  // Adresses et réseaux par département : { "Martinique": { address, websiteUrl, facebookUrl, instagramUrl }, ... }
  territoryDetails: z.union([
    z.record(z.string(), z.object({
      address: z.string().optional(),
      websiteUrl: optionalUrl,
      facebookUrl: optionalUrl,
      instagramUrl: optionalUrl,
    }).passthrough()),
    z.string().transform((val) => {
      if (!val || val.trim() === '') return undefined;
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
      } catch {
        return undefined;
      }
    }),
  ]).optional().or(z.literal('').transform(() => undefined)),
  tauxCashbackBase: z.coerce.number().min(0).max(100).default(0), // z.coerce pour convertir depuis string, défaut à 0
  discoveryCashbackRate: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Taux de cashback de bienvenue
  permanentCashbackRate: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Taux de cashback permanent
  discoveryCashbackKashupShare: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Part du taux de cashback de bienvenue pour KashUP (en %)
  discoveryCashbackUserShare: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Part du taux de cashback de bienvenue pour l'utilisateur (en %)
  permanentCashbackKashupShare: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Part du taux de cashback permanent pour KashUP (en %)
  permanentCashbackUserShare: z.coerce.number().min(0).max(100).optional().or(z.literal('').transform(() => undefined)), // Part du taux de cashback permanent pour l'utilisateur (en %)
  pointsPerTransaction: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)), // Nombre de points par transaction
  territories: z.union([
    z.array(z.enum(TERRITORIES)).min(1, 'Au moins un territoire est requis'),
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.filter((t: string) => TERRITORIES.includes(t as any)) : [];
      } catch {
        return [];
      }
    })
  ]).optional(), // JSON array de territoires
  latitude: z.coerce.number().optional().or(z.literal('').transform(() => undefined)), // z.coerce pour convertir depuis string
  longitude: z.coerce.number().optional().or(z.literal('').transform(() => undefined)), // z.coerce pour convertir depuis string
  boostable: z.coerce.boolean().optional().default(true), // z.coerce pour convertir depuis string
  giftCardEnabled: z.coerce.boolean().optional().default(false), // Activer cartes cadeaux / bons d'achat
  categoryId: z.string().cuid('categoryId invalide'),
  status: z.string().optional().or(z.literal('').transform(() => undefined)), // Statut du partenaire (active, inactive, pending, etc.)
  additionalInfo: z.union([
    z.string(),
    z.object({}).passthrough(), // Accepter un objet JSON
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === 'object' ? JSON.stringify(parsed) : val;
      } catch {
        return val;
      }
    })
  ]).optional().or(z.literal('').transform(() => undefined)), // Informations complémentaires (JSON ou texte)
  affiliations: z.union([
    z.array(z.string()),
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })
  ]).optional(), // Affiliations (JSON array ou array)
  menuImages: z.array(z.string().url()).optional(), // URLs des images de menu (restaurants)
  photos: z.array(z.string().url()).optional(), // URLs des photos (tous secteurs)
  marketingPrograms: z.union([
    z.array(z.enum(MARKETING_PROGRAMS)),
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })
  ]).optional() // Accepter array ou string JSON
});

export const createPartnerSchema = basePartnerSchema;
export const updatePartnerSchema = basePartnerSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(3, 'Le nom de la catégorie doit contenir au moins 3 caractères')
});

/** Schéma pour créer un alias partenaire (reconnaissance cashback Powens) */
export const createPartnerAliasSchema = z.object({
  aliasText: z.string().min(1, 'L’alias ne peut pas être vide').max(500),
  priority: z.coerce.number().int().min(0).max(100).optional().default(1),
});
export type CreatePartnerAliasInput = z.infer<typeof createPartnerAliasSchema>;

export type PartnerFilterInput = z.infer<typeof partnerFiltersSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;

