import { Request, Response } from 'express';
import { register } from '../metrics/prom';
import { sendSuccess } from '../utils/response';

export const getMetrics = async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};

export const getHealthDetailed = (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', uptime: process.uptime() });
};

