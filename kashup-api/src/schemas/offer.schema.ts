import { z } from 'zod';

export const offerFormSchema = z.object({
  partnerId: z.string().min(1),
  title: z.string().min(3),
  price: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  cashbackRate: z.coerce.number().min(0).max(100),
  startAt: z.string(), // ISO 8601 date string
  endAt: z.string(), // ISO 8601 date string
  stock: z.coerce.number().positive(),
  image: z.any().optional(), // File upload
  // URL complète ou chemin relatif renvoyé par l'upload (ex. /uploads/offers/xxx.jpg)
  imageUrl: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  conditions: z.string().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['scheduled', 'active', 'expired']).optional()
});

export type OfferFormInput = z.infer<typeof offerFormSchema>;

