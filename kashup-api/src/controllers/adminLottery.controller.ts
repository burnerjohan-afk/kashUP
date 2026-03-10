import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { drawWinner, processLotteriesDueForDraw } from '../services/lotteryEngine';

/** POST /admin/lotteries/:id/draw — Lancer manuellement le tirage d'une loterie */
export const drawLotteryHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const winner = await drawWinner(id);
  sendSuccess(res, {
    lotteryId: id,
    drawn: !!winner,
    winner: winner
      ? {
          userId: (winner as { userId: string }).userId,
          drawDate: (winner as { drawDate: Date }).drawDate,
        }
      : null,
  });
});

/** POST /admin/lotteries/process-due — Traiter toutes les loteries dont le tirage est dû */
export const processDueLotteriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const results = await processLotteriesDueForDraw();
  sendSuccess(res, { processed: results.length, results });
});
