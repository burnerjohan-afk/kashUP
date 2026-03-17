import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { processUploadedFile } from '../services/upload.service';
import { videoConfig } from '../config/video';
import { addDays } from 'date-fns';
import { AppError } from '../utils/errors';
import { getBlobProxy } from './blob.controller';

type VideoDurationOption = 'default' | 'extended';

export const attachGiftVideoHandler = asyncHandler(async (req: Request, res: Response) => {
  const purchaseId = req.params.id;
  const file = (req as any).file as Express.Multer.File | undefined;

  const {
    requestedVideoDuration,
    videoDurationOption,
    videoConsentAccepted,
  } = req.body as {
    requestedVideoDuration?: string;
    videoDurationOption?: VideoDurationOption;
    videoConsentAccepted?: string;
  };

  if (!file) {
    throw new AppError('Aucun fichier vidéo fourni', 400);
  }

  const consentOk = videoConsentAccepted === 'true' || videoConsentAccepted === '1';
  if (!consentOk) {
    throw new AppError('Consentement vidéo obligatoire', 400);
  }

  const durationSec = Number(requestedVideoDuration ?? 0);
  const maxDefault = videoConfig.maxDurationDefault;
  const maxExtended = videoConfig.maxDurationExtended;
  const isExtended = videoDurationOption === 'extended';
  const allowedDuration = isExtended ? maxExtended : maxDefault;

  if (!durationSec || Number.isNaN(durationSec) || durationSec <= 0) {
    throw new AppError('Durée vidéo invalide', 400);
  }

  if (durationSec > allowedDuration) {
    throw new AppError(`Durée vidéo trop longue (max ${allowedDuration}s)`, 400);
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > videoConfig.maxSizeMb) {
    throw new AppError(`Vidéo trop lourde (max ${videoConfig.maxSizeMb} Mo)`, 400);
  }

  if (!file.mimetype.startsWith('video/')) {
    throw new AppError('Format vidéo invalide (MP4/MOV requis)', 400);
  }

  const purchase = await prisma.giftCardPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) {
    throw new AppError('Cadeau introuvable', 404);
  }

  const videoUrl = await processUploadedFile(file, 'gift-videos', purchaseId);
  const retentionUntil = addDays(new Date(), videoConfig.retentionDays);

  const updated = await prisma.giftCardPurchase.update({
    where: { id: purchaseId },
    data: {
      videoUrl,
      videoDurationSeconds: durationSec,
      videoStatus: 'ready',
      videoSentAt: new Date(),
      videoRetentionUntil: retentionUntil,
    },
  });

  res.json({
    success: true,
    data: {
      id: updated.id,
      videoUrl: updated.videoUrl,
      videoDurationSeconds: updated.videoDurationSeconds,
      videoStatus: updated.videoStatus,
    },
  });
});

export const streamGiftVideoHandler = asyncHandler(async (req: Request, res: Response) => {
  const purchaseId = req.params.id;

  const purchase = await prisma.giftCardPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || !purchase.videoUrl || purchase.videoStatus !== 'ready') {
    throw new AppError('Vidéo introuvable', 404);
  }

  // TODO: sécuriser via token / auth destinataire

  if (!purchase.videoOpenedAt) {
    await prisma.giftCardPurchase.update({
      where: { id: purchaseId },
      data: {
        videoOpenedAt: new Date(),
        videoViewCount: { increment: 1 },
      },
    });
  }

  (req as any).query.url = purchase.videoUrl;
  return getBlobProxy(req, res);
});

export const markGiftVideoViewedHandler = asyncHandler(async (req: Request, res: Response) => {
  const purchaseId = req.params.id;

  const purchase = await prisma.giftCardPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || !purchase.videoUrl) {
    throw new AppError('Vidéo introuvable', 404);
  }

  await prisma.giftCardPurchase.update({
    where: { id: purchaseId },
    data: {
      videoViewedAt: purchase.videoViewedAt ?? new Date(),
      videoViewCount: { increment: 1 },
    },
  });

  res.json({ success: true, data: null });
});

