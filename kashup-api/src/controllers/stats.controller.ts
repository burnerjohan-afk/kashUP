import { Request, Response } from 'express';
import { getImpactStats } from '../services/stats.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getImpactLocal = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getImpactStats();
  res.json(stats);
});


