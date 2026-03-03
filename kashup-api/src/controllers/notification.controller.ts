import { Request, Response } from 'express';
import { markNotificationAsRead, listNotificationsForUser } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const notifications = await listNotificationsForUser(req.user.sub);
  sendSuccess(res, notifications);
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  await markNotificationAsRead(req.user.sub, req.params.id);
  sendSuccess(res, { read: true });
});


