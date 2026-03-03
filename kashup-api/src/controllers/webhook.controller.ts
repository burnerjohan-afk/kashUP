import { NextFunction, Request, Response } from 'express';
import { drimifyWebhookHandler } from './drimify.controller';
import { powensWebhook } from './powens.controller';
import { sendSuccess } from '../utils/response';
import logger from '../utils/logger';

export const unifiedWebhook = (req: Request, res: Response, next: NextFunction) => {
  const source = (req.headers['x-webhook-source'] as string | undefined) ?? 'unknown';

  switch (source) {
    case 'drimify':
      logger.info({ source, event: req.body }, 'Webhook Drimify reçu');
      return drimifyWebhookHandler(req, res, next);
    case 'powens':
      logger.info({ source, event: req.body }, 'Webhook Powens reçu');
      return powensWebhook(req, res, next);
    default:
      logger.warn({ source }, 'Webhook inconnu');
      return sendSuccess(res, { received: true, source });
  }
};


