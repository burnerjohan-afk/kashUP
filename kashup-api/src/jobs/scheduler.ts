import cron from 'node-cron';
import { syncPowensConnections, reconcileDrimifyEvents } from './tasks';
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
};

