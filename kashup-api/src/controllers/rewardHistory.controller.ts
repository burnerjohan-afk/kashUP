import { Request, Response } from 'express';
import { getChallengeCategory, listChallengeCategories, listChallenges, listRewardHistory } from '../services/rewardHistory.service';
import { getActiveLotteries, getLotteryById, enterLottery, getActiveLotteriesForHome, getActiveLotteriesForRewards } from '../services/lotteryEngine';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { buildAbsoluteUrl } from '../utils/network';

/** Corrige /upload/ en /uploads/ et renvoie une URL absolue pour que l'app (APK/prod) charge les images correctement. */
function normalizeLotteryImagePath<T extends { imageUrl?: string | null }>(req: Request, lottery: T): T {
  const raw = lottery.imageUrl;
  if (!raw || typeof raw !== 'string' || (raw as string).trim() === '') {
    return lottery;
  }
  let url = (raw as string).trim();
  url = url.replace(/\/upload\//g, '/uploads/').replace(/^\/upload(\/|$)/, '/uploads$1');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { ...lottery, imageUrl: url };
  }
  const absolute = buildAbsoluteUrl(req, url.startsWith('/') ? url : `/${url}`);
  return { ...lottery, imageUrl: absolute };
}

type ChallengeRaw = Awaited<ReturnType<typeof listChallenges>>[number];

export const getRewardHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const history = await listRewardHistory(req.user.sub);
  sendSuccess(res, history);
});

export const getLotteries = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const lotteries = await getActiveLotteriesForRewards(userId);
  const data = lotteries.map((l) => normalizeLotteryImagePath(req, l));
  sendSuccess(res, data);
});

export const getLotteriesForHome = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const lotteries = await getActiveLotteriesForHome(userId);
  const data = lotteries.map((l) => normalizeLotteryImagePath(req, l));
  sendSuccess(res, data);
});

export const getLotteryByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const lottery = await getLotteryById(req.params.id, userId);
  sendSuccess(res, normalizeLotteryImagePath(req, lottery));
});

export const joinLotteryHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const ticketCount = Number(req.body.tickets ?? req.body.ticketCount ?? 1);
  const lottery = await enterLottery(req.user.sub, req.params.id, ticketCount);
  sendSuccess(res, lottery, null, 200);
});

function formatChallengeForApp(raw: ChallengeRaw) {
  const progression = raw.progressions?.[0];
  const progress = progression?.progress ?? 0;
  const completedAt = progression?.completedAt ?? null;
  const goalValue = raw.goalValue;
  const percentage = goalValue > 0 ? Math.min(100, Math.round((progress / goalValue) * 100)) : 0;
  const rewardSummary = raw.reward
    ? `${raw.reward.rewardValue} ${raw.reward.rewardType === 'cashback' ? '€' : raw.reward.rewardType === 'points' ? 'pts' : raw.reward.rewardType}`
    : raw.rewardPoints > 0
      ? `${raw.rewardPoints} pts`
      : 'Récompense';
  const category = getChallengeCategory(raw);

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    category,
    type: raw.type,
    goalType: raw.goalType,
    goalValue: raw.goalValue,
    goal: goalValue,
    current: progress,
    progress,
    percentage,
    reward: raw.reward
      ? { rewardId: raw.reward.id, rewardType: raw.reward.rewardType, rewardValue: raw.reward.rewardValue, rewardCurrency: raw.reward.rewardCurrency }
      : null,
    rewardSummary,
    rewardPoints: raw.rewardPoints,
    difficulty: raw.difficulty,
    startAt: raw.startAt,
    endAt: raw.endAt,
    status: raw.status,
    userStatus: completedAt ? ('done' as const) : ('active' as const),
    completedAt,
    partnerId: raw.partnerId,
    partner: raw.partner,
    steps: [], // optionnel pour affichage étapes
  };
}

export const getChallenges = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const challenges = await listChallenges(userId, category);
  const formatted = challenges.map(formatChallengeForApp);
  sendSuccess(res, formatted);
});

export const getChallengeCategories = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.sub) {
    throw new AppError('Authentification requise', 401);
  }
  const categories = await listChallengeCategories(req.user.sub);
  sendSuccess(res, categories);
});


