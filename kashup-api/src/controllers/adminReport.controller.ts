import { Request, Response } from 'express';
import { getAdminDashboardStats } from '../services/stats.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getAdminDashboardStats();
  sendSuccess(res, stats);
});

/**
 * GET /admin/dashboard/metrics
 * Garantit un format stable pour le front admin :
 * {
 *   data: {
 *     impact: [],
 *     transactions: [],
 *     stats: [],
 *     metrics: []
 *   }
 * }
 * Aucune clé n'est jamais undefined/null ; tableaux vides par défaut.
 */
export const getAdminDashboardMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getAdminDashboardStats();

  const safeArray = (value: unknown) => (Array.isArray(value) ? value : []);

  const payload = {
    impact: safeArray((stats as any)?.impact),
    transactions: safeArray((stats as any)?.transactions),
    stats: safeArray((stats as any)?.stats),
    metrics: safeArray((stats as any)?.metrics)
  };

  // Ajout d'une garde : si stats contient déjà des métriques structurées différemment,
  // on ne jette rien mais on renvoie au moins les clés attendues en tableaux vides.
  sendSuccess(res, payload, null, 200, 'Dashboard metrics ready');
});


