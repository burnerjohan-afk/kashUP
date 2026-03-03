import { Request, Response } from 'express';
import { getCoffreFortConfig, updateCoffreFortConfig } from '../services/coffreFort.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getAdminCoffreFortConfig = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getCoffreFortConfig();
  sendSuccess(res, config);
});

export const patchAdminCoffreFortConfig = asyncHandler(async (req: Request, res: Response) => {
  const { lockPeriodMonths, pointsPerEuroPerMonth } = req.body || {};
  const config = await updateCoffreFortConfig({
    ...(lockPeriodMonths != null && { lockPeriodMonths: Number(lockPeriodMonths) }),
    ...(pointsPerEuroPerMonth != null && { pointsPerEuroPerMonth: Number(pointsPerEuroPerMonth) })
  });
  sendSuccess(res, config, null, 200, 'Config coffre-fort mise à jour');
});
