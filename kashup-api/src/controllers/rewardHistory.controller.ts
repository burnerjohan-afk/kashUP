import { Request, Response } from 'express';
import { joinLottery, listChallenges, listLotteries, listRewardHistory } from '../services/rewardHistory.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const getRewardHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const history = await listRewardHistory(req.user.sub);
  sendSuccess(res, history);
});

export const getLotteries = asyncHandler(async (_req: Request, res: Response) => {
  const lotteries = await listLotteries();
  sendSuccess(res, lotteries);
});

export const joinLotteryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const entry = await joinLottery(req.user.sub, req.params.id, Number(req.body.tickets ?? 1));
  sendSuccess(res, entry, null, 201);
});

export const getChallenges = asyncHandler(async (_req: Request, res: Response) => {
  const challenges = await listChallenges();
  sendSuccess(res, challenges);
});


