import { z } from 'zod';

export const createHomeBannerSchema = z.object({
  title: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  mediaType: z.enum(['image', 'video']).default('image'),
  imageUrl: z.string().optional().or(z.literal('').transform(() => undefined)),
  videoUrl: z.string().optional().or(z.literal('').transform(() => undefined)),
  linkUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  position: z.coerce.number().int().min(0).optional().default(0),
  active: z.coerce.boolean().optional().default(true),
});

export const updateHomeBannerSchema = createHomeBannerSchema.partial();

export type CreateHomeBannerInput = z.infer<typeof createHomeBannerSchema>;
export type UpdateHomeBannerInput = z.infer<typeof updateHomeBannerSchema>;
