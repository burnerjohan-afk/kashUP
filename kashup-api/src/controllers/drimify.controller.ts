import { Request, Response } from 'express';
import { listDrimifyExperiences, startDrimifyExperience, handleDrimifyWebhook } from '../services/drimify/drimify.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { notificationBus } from '../events/event-bus';

export const getDrimifyExperiences = asyncHandler(async (_req: Request, res: Response) => {
  const experiences = await listDrimifyExperiences();
  sendSuccess(res, experiences);
});

export const playDrimifyExperience = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const result = await startDrimifyExperience(req.params.id, req.user.sub, req.body);
  notificationBus.emitEvent({
    type: 'drimify_experience_result',
    payload: { userId: req.user.sub, experienceId: req.params.id, message: 'Participation enregistrée' }
  });
  sendSuccess(res, result, null, 201);
});

export const drimifyWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const response = handleDrimifyWebhook(req.body);
  if (req.body?.user_reference) {
    notificationBus.emitEvent({
      type: 'drimify_experience_result',
      payload: {
        userId: req.body.user_reference,
        experienceId: req.body.experience_id,
        message: req.body.message ?? 'Résultat Drimify'
      }
    });
  }
  sendSuccess(res, response);
});


