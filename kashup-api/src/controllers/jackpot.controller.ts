import { Request, Response } from 'express';
import {
  getCurrentJackpot,
  getUserJackpotStats,
  registerFreeParticipation,
} from '../services/communityJackpotEngine';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';

/** GET /community-jackpot — Jackpot actuel (public, pour Home et page Jackpot). */
export const getCurrentJackpotHandler = asyncHandler(async (_req: Request, res: Response) => {
  const jackpot = await getCurrentJackpot();
  sendSuccess(res, jackpot);
});

/** GET /community-jackpot/stats — Stats utilisateur (tickets, éligibilité, etc.). Auth requis. */
export const getJackpotStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }
  const stats = await getUserJackpotStats(userId);
  sendSuccess(res, stats);
});

/** POST /community-jackpot/participate — Participation gratuite (1 ticket par défaut). Auth requis. */
export const participateHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Authentification requise', 401);
  }
  await registerFreeParticipation(userId);
  const stats = await getUserJackpotStats(userId);
  sendSuccess(res, stats, null, 200, 'Participation enregistrée');
});
