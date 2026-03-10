import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import {
  createChallengeSchema,
  updateChallengeSchema,
  createChallengeRewardSchema,
  type CreateChallengeInput,
  type UpdateChallengeInput,
} from '../schemas/challenge.schema';

export const listChallengeRewards = asyncHandler(async (_req: Request, res: Response) => {
  const rewards = await prisma.challengeReward.findMany({
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, rewards);
});

export const createChallengeReward = asyncHandler(async (req: Request, res: Response) => {
  const body = createChallengeRewardSchema.parse(req.body);
  const reward = await prisma.challengeReward.create({
    data: {
      rewardType: body.rewardType,
      rewardValue: body.rewardValue,
      rewardCurrency: body.rewardCurrency,
      expirationDays: body.expirationDays,
    },
  });
  sendSuccess(res, reward, null, 201);
});

export const listChallengesAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const challenges = await prisma.challenge.findMany({
    where: { deletedAt: null },
    include: {
      reward: true,
      partner: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { progressions: true } },
    },
    orderBy: { startAt: 'desc' },
  });
  sendSuccess(res, challenges);
});

export const createChallenge = asyncHandler(async (req: Request, res: Response) => {
  const body = createChallengeSchema.parse(req.body) as CreateChallengeInput;
  if (body.startAt >= body.endAt) {
    throw new AppError('startAt doit être avant endAt', 400);
  }
  const challenge = await prisma.challenge.create({
    data: {
      title: body.title,
      description: body.description,
      category: body.category ?? undefined,
      type: body.type,
      goalType: body.goalType,
      goalValue: body.goalValue,
      rewardPoints: body.rewardPoints,
      rewardId: body.rewardId,
      difficulty: body.difficulty,
      startAt: body.startAt,
      endAt: body.endAt,
      status: body.status,
      partnerId: body.partnerId,
    },
    include: { reward: true, partner: { select: { id: true, name: true } } },
  });
  sendSuccess(res, challenge, null, 201);
});

export const updateChallenge = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const body = updateChallengeSchema.parse(req.body) as UpdateChallengeInput;
  if (body.startAt != null && body.endAt != null && body.startAt >= body.endAt) {
    throw new AppError('startAt doit être avant endAt', 400);
  }
  const challenge = await prisma.challenge.update({
    where: { id },
    data: {
      ...(body.title != null && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.type != null && { type: body.type }),
      ...(body.goalType != null && { goalType: body.goalType }),
      ...(body.goalValue != null && { goalValue: body.goalValue }),
      ...(body.rewardPoints !== undefined && { rewardPoints: body.rewardPoints }),
      ...(body.rewardId !== undefined && { rewardId: body.rewardId }),
      ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
      ...(body.startAt != null && { startAt: body.startAt }),
      ...(body.endAt != null && { endAt: body.endAt }),
      ...(body.status != null && { status: body.status }),
      ...(body.partnerId !== undefined && { partnerId: body.partnerId }),
    },
    include: { reward: true, partner: { select: { id: true, name: true } } },
  });
  sendSuccess(res, challenge);
});

export const getChallengeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const challenge = await prisma.challenge.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      reward: true,
      partner: true,
      _count: { select: { progressions: true } },
    },
  });
  if (!challenge) throw new AppError('Challenge introuvable', 404);
  sendSuccess(res, challenge);
});

export const deleteChallenge = asyncHandler(async (req: Request, res: Response) => {
  await prisma.challenge.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  sendSuccess(res, { deleted: true });
});
