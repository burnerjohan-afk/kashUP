import { Request, Response } from 'express';
import { listGiftBoxes, listPredefinedGifts, listSpotlightAssociations } from '../services/content.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseListParams } from '../utils/listing';

export const getPredefinedGifts = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const result = await listPredefinedGifts(params);
  sendSuccess(res, result.data, { pagination: result.meta });
});

export const getBoxUpContent = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const result = await listGiftBoxes(params);
  sendSuccess(res, result.data, { pagination: result.meta });
});

export const getSpotlightAssociations = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const result = await listSpotlightAssociations(params);
  sendSuccess(res, result.data, { pagination: result.meta });
});


