import { z } from 'zod';

export const purchaseGiftCardSchema = z.object({
  giftCardId: z.string().cuid(),
  beneficiaryEmail: z.string().email(),
  message: z.string().max(500).optional(),
  amount: z.number().positive().optional()
});

export type PurchaseGiftCardInput = z.infer<typeof purchaseGiftCardSchema>;

export const giftCardConfigSchema = z.object({
  giftCardDescription: z.string().optional(),
  giftCardImage: z.any().optional(), // File upload (si FormData)
  giftCardImageUrl: z.string().url().optional().or(z.literal('')), // URL directe (si JSON)
  giftCardVirtualCardImage: z.any().optional(), // File upload (si FormData)
  giftCardVirtualCardImageUrl: z.string().url().optional().or(z.literal('')), // URL directe (si JSON)
  giftCardHowItWorks: z.string().optional(),
  giftCardConditions: z.string().optional()
});

export type GiftCardConfigInput = z.infer<typeof giftCardConfigSchema>;

export const boxUpConfigSchema = z.object({
  boxUpName: z.string().min(1),
  boxUpPartners: z.array(z.string()).min(1),
  boxUpImage: z.any().optional(), // File upload (si FormData)
  boxUpImageUrl: z.string().url().optional().or(z.literal('')), // URL directe (si JSON)
  boxUpHowItWorks: z.string().optional(),
  boxUpConditions: z.string().optional()
});

export type BoxUpConfigInput = z.infer<typeof boxUpConfigSchema>;

export const giftCardAmountSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
});
export type GiftCardAmountInput = z.infer<typeof giftCardAmountSchema>;

// Carte Sélection UP (config)
export const carteUpLibreBodySchema = z.object({
  nom: z.string().min(1),
  description: z.string().min(1),
  montantsDisponibles: z.string(), // JSON array
  partenairesEligibles: z.string(), // JSON array
  conditions: z.string().optional(),
  commentCaMarche: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});
export type CarteUpLibreBody = z.infer<typeof carteUpLibreBodySchema>;

// Carte UP (pré-définie)
export const carteUpPredefinieBodySchema = z.object({
  nom: z.string().min(1),
  partenaireId: z.string().min(1),
  offre: z.string().optional(),
  montant: z.coerce.number().positive(),
  description: z.string().min(1),
  dureeValiditeJours: z.coerce.number().int().min(1).optional(),
  conditions: z.string().optional(),
  commentCaMarche: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});
export type CarteUpPredefinieBody = z.infer<typeof carteUpPredefinieBodySchema>;

