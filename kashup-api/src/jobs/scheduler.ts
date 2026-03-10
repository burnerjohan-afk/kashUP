import cron from 'node-cron';
import { syncPowensConnections, reconcileDrimifyEvents } from './tasks';
import { processLotteriesDueForDraw } from '../services/lotteryEngine';
import { processJackpotDueForDraw } from '../services/communityJackpotEngine';
import logger from '../utils/logger';

export const registerJobs = () => {
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Job Powens sync démarré');
    await syncPowensConnections();
  });

  cron.schedule('0 * * * *', async () => {
    logger.info('Job Drimify reconcile démarré');
    await reconcileDrimifyEvents();
  });

  // Loteries : tirage automatique toutes les 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Job loteries (tirage) démarré');
    try {
      const results = await processLotteriesDueForDraw();
      if (results.length > 0) {
        logger.info({ count: results.length, results }, '[scheduler] Tirages loteries effectués');
      }
    } catch (err) {
      logger.error({ err }, '[scheduler] Erreur job loteries');
    }
  });

  // Jackpot communautaire : vérification des conditions de tirage toutes les 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const result = await processJackpotDueForDraw();
      if (result) {
        logger.info({ result }, '[scheduler] Jackpot communautaire traité');
      }
    } catch (err) {
      logger.error({ err }, '[scheduler] Erreur job jackpot communautaire');
    }
  });
};

