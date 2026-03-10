import { z } from 'zod';

export const joinLotterySchema = z.object({
  tickets: z.number().int().min(1).default(1),
});

export type JoinLotteryInput = z.infer<typeof joinLotterySchema>;
