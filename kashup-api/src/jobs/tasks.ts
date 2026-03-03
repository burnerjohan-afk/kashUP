import logger from '../utils/logger';
import { listBankConnections } from '../services/powens/powens.service';
import prisma from '../config/prisma';
import { listDrimifyExperiences } from '../services/drimify/drimify.service';

export const syncPowensConnections = async () => {
  const users = await prisma.user.findMany({
    select: { id: true },
    where: { powensLinkTokens: { some: {} } }
  });

  for (const user of users) {
    try {
      const connections = await listBankConnections(user.id);
      await prisma.adminReportLog.create({
        data: {
          type: 'powens_sync',
          payload: JSON.stringify({ userId: user.id, connections })
        }
      });
    } catch (error) {
      logger.error(error, `Erreur sync Powens user=${user.id}`);
    }
  }
};

export const reconcileDrimifyEvents = async () => {
  try {
    const experiences = await listDrimifyExperiences();

    await prisma.adminReportLog.create({
      data: {
        type: 'drimify_reconcile',
        payload: JSON.stringify(experiences)
      }
    });
  } catch (error) {
    logger.error(error, 'Erreur reconcile Drimify');
  }
};

