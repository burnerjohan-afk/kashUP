import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseListParams } from '../utils/listing';
import prisma from '../config/prisma';

/**
 * GET /api/v1/sync/changes
 * Endpoint global de synchronisation pour récupérer tous les changements depuis une date
 * 
 * Query params:
 * - updatedSince: ISO 8601 date (requis)
 * 
 * Returns: Liste de tous les changements (créations, modifications, suppressions) depuis updatedSince
 */
export const getSyncChanges = asyncHandler(async (req: Request, res: Response) => {
  const { updatedSince } = parseListParams(req.query);
  
  if (!updatedSince) {
    return sendSuccess(res, { 
      changes: [], 
      since: null, 
      count: 0 
    }, null, 200, 'Aucune date de synchronisation fournie');
  }

  // Récupérer les changements de toutes les ressources synchronisées
  const [partners, offers, rewards, giftCards, donations, transactions] = await Promise.all([
    prisma.partner.findMany({
      where: { 
        updatedAt: { gt: updatedSince }
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.partnerOffer.findMany({
      where: { 
        updatedAt: { gt: updatedSince }, 
        deletedAt: null 
      },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.boost.findMany({
      where: { 
        updatedAt: { gt: updatedSince }, 
        deletedAt: null 
      },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.giftCard.findMany({
      where: { 
        updatedAt: { gt: updatedSince }, 
        deletedAt: null 
      },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.donationCategory.findMany({
      where: { 
        updatedAt: { gt: updatedSince }, 
        deletedAt: null 
      },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.transaction.findMany({
      where: { 
        transactionDate: { gt: updatedSince }, 
        status: 'confirmed' 
      },
      select: { id: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' }
    })
  ]);

  // Récupérer les suppressions (deletedAt > updatedSince)
  // Note: Partner n'a pas de deletedAt, donc on ne récupère pas les suppressions de partners
  const [deletedOffers, deletedRewards, deletedGiftCards, deletedDonations] = await Promise.all([
    prisma.partnerOffer.findMany({
      where: { 
        deletedAt: { 
          gt: updatedSince, 
          not: null 
        } 
      },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.boost.findMany({
      where: { 
        deletedAt: { 
          gt: updatedSince, 
          not: null 
        } 
      },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.giftCard.findMany({
      where: { 
        deletedAt: { 
          gt: updatedSince, 
          not: null 
        } 
      },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.donationCategory.findMany({
      where: { 
        deletedAt: { 
          gt: updatedSince, 
          not: null 
        } 
      },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    })
  ]);

  const changes = [
    ...partners.map(p => ({ 
      type: 'partner' as const, 
      id: p.id, 
      action: 'updated' as const, 
      updatedAt: p.updatedAt.toISOString() 
    })),
    ...offers.map(o => ({ 
      type: 'offer' as const, 
      id: o.id, 
      action: 'updated' as const, 
      updatedAt: o.updatedAt.toISOString() 
    })),
    ...rewards.map(r => ({ 
      type: 'reward' as const, 
      id: r.id, 
      action: 'updated' as const, 
      updatedAt: r.updatedAt.toISOString() 
    })),
    ...giftCards.map(g => ({ 
      type: 'giftCard' as const, 
      id: g.id, 
      action: 'updated' as const, 
      updatedAt: g.updatedAt.toISOString() 
    })),
    ...donations.map(d => ({ 
      type: 'donation' as const, 
      id: d.id, 
      action: 'updated' as const, 
      updatedAt: d.updatedAt.toISOString() 
    })),
    ...transactions.map(t => ({ 
      type: 'transaction' as const, 
      id: t.id, 
      action: 'updated' as const, 
      updatedAt: t.transactionDate.toISOString() 
    })),
    ...deletedOffers.map(o => ({ 
      type: 'offer' as const, 
      id: o.id, 
      action: 'deleted' as const, 
      updatedAt: o.deletedAt!.toISOString(), 
      deletedAt: o.deletedAt!.toISOString() 
    })),
    ...deletedRewards.map(r => ({ 
      type: 'reward' as const, 
      id: r.id, 
      action: 'deleted' as const, 
      updatedAt: r.deletedAt!.toISOString(), 
      deletedAt: r.deletedAt!.toISOString() 
    })),
    ...deletedGiftCards.map(g => ({ 
      type: 'giftCard' as const, 
      id: g.id, 
      action: 'deleted' as const, 
      updatedAt: g.deletedAt!.toISOString(), 
      deletedAt: g.deletedAt!.toISOString() 
    })),
    ...deletedDonations.map(d => ({ 
      type: 'donation' as const, 
      id: d.id, 
      action: 'deleted' as const, 
      updatedAt: d.deletedAt!.toISOString(), 
      deletedAt: d.deletedAt!.toISOString() 
    }))
  ].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  sendSuccess(res, {
    changes,
    since: updatedSince.toISOString(),
    count: changes.length
  }, null, 200, `${changes.length} changement(s) trouvé(s)`);
});

