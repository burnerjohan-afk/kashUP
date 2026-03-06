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
  cashbackRate: z.coerce.number().min(0).max(100).optional().nullable(),
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
  cashbackRate: z.coerce.number().min(0).max(100).optional().nullable(),
  status: z.enum(['active', 'inactive']),
});
export type CarteUpPredefinieBody = z.infer<typeof carteUpPredefinieBodySchema>;

// Envoi d'une offre prédefinie à un utilisateur (notification in-app)
export const sendPredefinedGiftSchema = z.object({
  offerId: z.string().min(1, 'Offre requise'),
  beneficiaryEmail: z.string().email('E-mail du destinataire invalide'),
  message: z.string().max(500).optional(),
});
export type SendPredefinedGiftInput = z.infer<typeof sendPredefinedGiftSchema>;

// Envoi d'une Box UP à un utilisateur (notification in-app)
export const sendBoxUpSchema = z.object({
  boxId: z.string().min(1, 'Box requise'),
  beneficiaryEmail: z.string().email('E-mail du destinataire invalide'),
  message: z.string().max(500).optional(),
});
export type SendBoxUpInput = z.infer<typeof sendBoxUpSchema>;

// Carte Sélection UP : montant libre, pas de catalogue (envoi par email PDF ou notification app)
export const sendSelectionUpSchema = z.object({
  amount: z.coerce.number().positive('Le montant doit être positif'),
  beneficiaryEmail: z.string().email('E-mail du destinataire invalide'),
  message: z.string().max(500).optional(),
  partnerId: z.string().optional(),
  partnerName: z.string().optional(),
});
export type SendSelectionUpInput = z.infer<typeof sendSelectionUpSchema>;

// ——— Paiement par carte (Stripe Apple Pay / Google Pay) ———

export const giftTypeSchema = z.enum(['carte_up', 'selection_up', 'box_up']);
export type GiftType = z.infer<typeof giftTypeSchema>;

/** Créer une intention de paiement Stripe pour un cadeau (montant en centimes déduit du payload). */
export const createPaymentIntentForGiftSchema = z.discriminatedUnion('giftType', [
  z.object({
    giftType: z.literal('carte_up'),
    offerId: z.string().min(1),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
  }),
  z.object({
    giftType: z.literal('selection_up'),
    amount: z.coerce.number().positive(),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
    partnerId: z.string().optional(),
    partnerName: z.string().optional(),
  }),
  z.object({
    giftType: z.literal('box_up'),
    boxId: z.string().min(1),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
  }),
]);
export type CreatePaymentIntentForGiftInput = z.infer<typeof createPaymentIntentForGiftSchema>;

/** Confirmer un paiement carte et créer l'envoi (après succès côté client Stripe). */
export const confirmCardPaymentForGiftSchema = z.discriminatedUnion('giftType', [
  z.object({
    paymentIntentId: z.string().min(1),
    giftType: z.literal('carte_up'),
    offerId: z.string().min(1),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
  }),
  z.object({
    paymentIntentId: z.string().min(1),
    giftType: z.literal('selection_up'),
    amount: z.coerce.number().positive(),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
    partnerId: z.string().optional(),
    partnerName: z.string().optional(),
  }),
  z.object({
    paymentIntentId: z.string().min(1),
    giftType: z.literal('box_up'),
    boxId: z.string().min(1),
    beneficiaryEmail: z.string().email(),
    message: z.string().max(500).optional(),
  }),
]);
export type ConfirmCardPaymentForGiftInput = z.infer<typeof confirmCardPaymentForGiftSchema>;
